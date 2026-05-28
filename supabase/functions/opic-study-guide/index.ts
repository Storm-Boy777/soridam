/**
 * opic-study-guide — 통합 가이드 EF (v3, 콤보 캐시)
 *
 * 역할: 콤보 단위로 1회 풀 가이드 생성 + combo_guide_cache 영구 캐시.
 *       Step5 (스터디 룸) + 콤보 둘러보기 화면 공유.
 *
 * v2 → v3:
 *   - 캐시 단위: 세션 → 콤보(sig) — 같은 콤보면 어떤 그룹/세션이든 1회만 생성
 *   - 출력 구조: { intro_text, approaches[{...단순 텍스트...}] }
 *              → { intro_text, approaches[{approach, answer_flow, key_points, word_min/max}] }
 *   - 입력 모드: session (기존, 세션 row에도 복사) / explore (캐시만)
 *
 * 호출:
 *   - SA `generateGuide(sessionId)` → mode='session', session_id, triggered_by
 *   - SA `getOrGenerateComboCache(sig)` → mode='explore', sig, triggered_by
 *
 * 처리:
 *   1. 모드 확인
 *   2. session: session_id로 콤보 정보 조회 → sig 추출 / explore: sig 직접
 *   3. combo_guide_cache 조회 (HIT → 즉시 반환)
 *   4. MISS → 질문 정보 + question_type_guides 조회 → GPT-4.1-mini → cache INSERT
 *   5. session 모드 → 추가로 opic_study_sessions row에도 복사 (Realtime 동기화)
 *   6. api_usage_logs INSERT (cache hit 시 비용 0)
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "https://soridamhub.com,http://localhost:3001,http://localhost:3000,http://localhost:3100").split(",");

const PROMPT_VERSION = 3; // v3: 실제 출제 순서(대표 순서)로 가이드 생성 — 정렬 시그니처 대신

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

// ── 타입 ──

interface ApproachItem {
  question_index: number;
  type_label: string;
  approach: string;
  answer_flow: string[];
  key_points: string[];
  recommended_word_min: number;
  recommended_word_max: number;
}

interface GuideOutput {
  intro_text: string;
  approaches: ApproachItem[];
}

interface QuestionInfo {
  id: string;
  question_type_eng: string;
  question_english: string;
  question_korean: string | null;
  question_short: string | null;
  topic?: string;
  category?: string;
}

// 한글/영어 카테고리 → 정규화
function normalizeCategory(raw: string): "general" | "roleplay" | "advance" {
  const r = (raw || "").trim().toLowerCase();
  if (r === "일반" || r.startsWith("general")) return "general";
  if (r === "롤플레이" || r === "roleplay") return "roleplay";
  if (r === "어드밴스" || r === "advance") return "advance";
  return "general";
}

// 콤보 질문들의 다수결 토픽 (동률 시 첫 질문)
function majorityTopic(questions: QuestionInfo[]): string {
  const counts = new Map<string, number>();
  for (const q of questions) {
    const t = (q.topic as string) || "";
    if (!t) continue;
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  if (counts.size === 0) return "";
  let best = "";
  let bestCount = -1;
  for (const [t, c] of counts) {
    if (c > bestCount) {
      best = t;
      bestCount = c;
    }
  }
  return best;
}

interface TypeGuideRef {
  type_id: string;
  type_label_kor: string;
  type_short_kor: string;
  prompt_reference: string;
  recommended_word_min: number;
  recommended_word_max: number;
}

// ── 시그니처 헬퍼 ──

function buildSig(questionIds: string[]): string {
  return [...questionIds].sort().join("|");
}

/**
 * 콤보의 대표 "실제 출제 순서" 결정 (SA pickRepresentativeOrder와 동일 로직).
 * 같은 sig로 묶이는 승인 시험들의 question_ids 중 가장 자주 나온 순서를 채택
 * (동률: 최신 시험 → 사전순). 매칭 행 없으면 fallback(정렬 순서) 반환.
 */
function pickRepresentativeOrder(
  rows: Array<{ question_ids: string[] | null; exam_date?: string | null }>,
  targetSig: string,
  fallback: string[]
): string[] {
  const tally = new Map<string, { order: string[]; count: number; latest: string }>();
  for (const r of rows) {
    const qids = r.question_ids ?? [];
    if (qids.length === 0) continue;
    if (buildSig(qids) !== targetSig) continue;
    const key = qids.join("|");
    const ex = r.exam_date ?? "";
    const cur = tally.get(key);
    if (cur) {
      cur.count += 1;
      if (ex > cur.latest) cur.latest = ex;
    } else {
      tally.set(key, { order: qids, count: 1, latest: ex });
    }
  }
  let best: { order: string[]; count: number; latest: string } | null = null;
  for (const v of tally.values()) {
    if (
      !best ||
      v.count > best.count ||
      (v.count === best.count && v.latest > best.latest) ||
      (v.count === best.count && v.latest === best.latest && v.order.join("|") < best.order.join("|"))
    ) {
      best = v;
    }
  }
  return best ? best.order : fallback;
}

/** 정렬 sig에 해당하는 콤보의 대표 출제 순서를 submission_combos에서 복원 */
async function resolveOrderedQuestionIds(
  supabase: SupabaseClient,
  sig: string
): Promise<string[]> {
  const sorted = sig.split("|").filter(Boolean);
  if (sorted.length === 0) return sorted;
  // 이 질문 집합을 포함하는 승인+완료 콤보 행 조회 → 대표 순서 산출
  const { data: rows } = await supabase
    .from("submission_combos")
    .select("question_ids, submissions!inner(status, exam_approved, exam_date)")
    .contains("question_ids", sorted)
    .eq("submissions.status", "complete")
    .eq("submissions.exam_approved", "approved");
  const candidates = ((rows ?? []) as unknown as Array<{
    question_ids: string[];
    submissions: { exam_date: string | null };
  }>).map((r) => ({
    question_ids: r.question_ids,
    exam_date: r.submissions?.exam_date,
  }));
  return pickRepresentativeOrder(candidates, sig, sorted);
}

// ── 인라인 프롬프트 (v3 — 풀 가이드) ──

const SYSTEM_PROMPT = `당신은 오픽 스터디 그룹의 AI 학습 코치입니다.
오늘 멤버들이 함께 풀 콤보 질문에 대해, 각 질문 유형의 본질을 토픽 맥락에 맞춰 풀 가이드로 안내합니다.

# 역할 원칙
- **등급 비특정**: 모든 등급의 멤버가 함께 보는 화면이므로 IM/IH/AL 등 등급별 표현을 직접 언급하지 마세요. 보편적 답변 방향만 안내합니다.
- **한글 전용**: 영어 문장이나 표현(예: "I remember once...", "because I find it...")을 절대 인용하지 마세요. 멤버가 각자 본인 등급의 영어로 답하도록 유도합니다.
- **친근한 코치 톤**: "~예요", "~해보세요", "~면 좋아요" 같은 부드러운 어조를 사용합니다.
- **토픽 맥락 입히기**: 카페/음악/여행 등 주어진 토픽에 자연스럽게 어울리도록 가이드를 변형합니다. 추상적 표현(외관·위치 등)이 토픽에 안 맞으면 그 토픽에 맞는 표현으로 바꾸세요.
- **간결**: 학습자가 한눈에 읽을 수 있게 쓰세요.

# 절대 금지
- 영어 문장 인용 ("I'm into...", "It was memorable because..." 등)
- 등급별 분기 표현 ("IH 멤버는~", "AL이라면~")
- 문법 용어 나열 ("관계절, 분사구문" 등)
- 점수, 평가, 등급 추정

# 매칭 정확성 (중요)
- 토픽이 음악/영화/TV 같은 추상적 대상이면 "외관·위치·크기" 같은 표현 X → "장르의 감정·분위기·매력" 같은 토픽 맞춤 표현
- 토픽이 카페/공원/병원 같은 장소면 "외관·위치·분위기" OK
- 사람이 대상이면 "외모·성격·나와의 관계" 같은 표현
- 항상 실제 질문이 무엇을 묻는지 살펴서 가이드 슬롯을 그 토픽에 맞게 자연스럽게 변형

# 출력 형식
JSON 객체:
- intro_text: 오늘 콤보 한 줄 인사 (40~60자, 친근하게)
- approaches: 각 질문별 풀 가이드 배열
  - question_index: 1, 2, 3 (콤보 질문 수에 정확히 맞춤)
  - type_label: 제공된 type_short_kor 그대로 사용
  - approach: 본문 — "이 질문은 ~ 유형이에요. ..." 형식 한 단락 (100~180자, 토픽 맥락 입혀서)
  - answer_flow: 답변 단계별 흐름 (3~5개 짧은 라벨, 각 4~10자, 토픽 맥락 반영)
  - key_points: 놓치면 안 되는 포인트 (2~4개 짧은 문장, 각 12~25자, 토픽 맥락 반영)
  - recommended_word_min: 권장 최소 단어 (제공된 값 그대로)
  - recommended_word_max: 권장 최대 단어 (제공된 값 그대로)`;

function buildUserPrompt(
  category: string,
  topic: string,
  questions: QuestionInfo[],
  typeGuides: Map<string, TypeGuideRef>
): string {
  const questionsText = questions
    .map((q, i) => {
      const guide = typeGuides.get(q.question_type_eng);
      const label = guide?.type_label_kor || q.question_type_eng;
      return `Q${i + 1} [${label}]\n  영어 원문: ${q.question_english}\n  한글 요약: ${q.question_short || q.question_korean || "(없음)"}`;
    })
    .join("\n\n");

  // 콤보에 등장하는 unique type만 참조 가이드 주입
  const usedTypeIds = [...new Set(questions.map((q) => q.question_type_eng))];
  const typeReferences = usedTypeIds
    .map((tid) => {
      const g = typeGuides.get(tid);
      if (!g) return `### ${tid}\n  (가이드 없음 — 이 유형의 본질을 GPT 자체 지식으로 풀어주세요)`;
      return `### ${g.type_short_kor} (${g.type_id})
  유형 본질: ${g.prompt_reference}
  권장 길이: ${g.recommended_word_min}~${g.recommended_word_max} 단어 (그대로 출력에 사용)`;
    })
    .join("\n\n");

  return `## 오늘 콤보
- 카테고리: ${category}
- 토픽: ${topic}
- 질문 수: ${questions.length}개

## 질문 목록

${questionsText}

## 각 질문 유형별 본질 가이드 (참조)

${typeReferences}

## 작업

위 참조 가이드의 본질은 유지하되, 토픽("${topic}") 맥락에 자연스럽게 입혀 다음 형식의 JSON으로 응답하세요.
특히 "외관·위치·크기" 같은 표현이 토픽에 맞지 않으면 토픽에 맞게 변형하세요 (예: 음악 → "장르의 감정·분위기").

\`\`\`json
{
  "intro_text": "오늘은 ${topic} 콤보로 함께 연습해볼게요 (40~60자, 친근하게)",
  "approaches": [
    {
      "question_index": 1,
      "type_label": "(제공된 type_short_kor 그대로)",
      "approach": "이 질문은 ~ 유형이에요. (토픽 맥락 입힌 본문, 100~180자)",
      "answer_flow": ["단계1 (4~10자)", "단계2", "단계3", "(선택)단계4"],
      "key_points": ["포인트1 (12~25자)", "포인트2", "(선택)포인트3"],
      "recommended_word_min": 80,
      "recommended_word_max": 150
    }
    // 질문 수만큼 (정확히 ${questions.length}개)
  ]
}
\`\`\`

⛔ 영어 표현 금지. 한글 전용. 등급별 분기 금지. 점수·평가 금지.`;
}

// ── 사용량 로깅 ──

async function logSystemUsage(
  supabase: SupabaseClient,
  params: {
    user_id: string;
    session_id: string | null;
    tokens_in: number;
    tokens_out: number;
    cost_usd: number;
    processing_time_ms: number;
    cache_hit: boolean;
  }
) {
  const feature = params.cache_hit ? "opic_study_guide_cache_hit" : "opic_study_guide";
  const { error } = await supabase.from("api_usage_logs").insert({
    user_id: params.user_id,
    session_type: "opic_study",
    session_id: params.session_id,
    feature,
    service: "openai_chat",
    model: params.cache_hit ? "cache" : "gpt-4.1-mini",
    ef_name: "opic-study-guide",
    tokens_in: params.tokens_in,
    tokens_out: params.tokens_out,
    cost_usd: params.cost_usd,
    processing_time_ms: params.processing_time_ms,
  });
  if (error) console.error("[opic-study-guide] api_usage_logs insert 실패:", error.message);
}

// ── 핵심: 캐시 조회 + GPT 생성 + 캐시 저장 ──

async function getOrGenerateGuide(
  supabase: SupabaseClient,
  sig: string,
  questionIds: string[],
  hint?: { topic?: string; category?: "general" | "roleplay" | "advance" }
): Promise<{
  data: GuideOutput;
  cacheHit: boolean;
  topic: string;
  category: string;
  costUsd: number;
  tokensIn: number;
  tokensOut: number;
}> {
  // 1. 캐시 조회
  const { data: cached } = await supabase
    .from("combo_guide_cache")
    .select("intro_text, approaches, topic, category")
    .eq("sig", sig)
    .eq("prompt_version", PROMPT_VERSION)
    .maybeSingle();

  if (cached) {
    return {
      data: {
        intro_text: cached.intro_text as string,
        approaches: cached.approaches as ApproachItem[],
      },
      cacheHit: true,
      topic: cached.topic as string,
      category: cached.category as string,
      costUsd: 0,
      tokensIn: 0,
      tokensOut: 0,
    };
  }

  // 2. 미스 → 질문 정보 조회
  const { data: questions, error: qErr } = await supabase
    .from("questions")
    .select("id, question_type_eng, question_english, question_korean, question_short, topic, category")
    .in("id", questionIds);

  if (qErr || !questions || questions.length === 0) {
    throw new Error("questions not found");
  }

  // questionIds 순서대로 정렬
  const orderedQuestions = questionIds
    .map((qid) => questions.find((q) => q.id === qid))
    .filter((q): q is NonNullable<typeof q> => !!q);

  if (orderedQuestions.length !== questionIds.length) {
    throw new Error("questions count mismatch");
  }

  // 토픽/카테고리 결정 — 클라이언트 명시값 우선, 없으면 다수결/매핑 추론
  const topic = (hint?.topic && hint.topic.trim().length > 0)
    ? hint.topic
    : majorityTopic(orderedQuestions as unknown as QuestionInfo[]) ||
      ((orderedQuestions[0].topic as string) ?? "");
  const category = hint?.category
    ?? normalizeCategory((orderedQuestions[0].category as string) ?? "");

  // 3. question_type_guides 조회 (참조용)
  const usedTypeIds = [...new Set(orderedQuestions.map((q) => q.question_type_eng as string))];
  const { data: typeGuidesData } = await supabase
    .from("question_type_guides")
    .select("type_id, type_label_kor, type_short_kor, prompt_reference, recommended_word_min, recommended_word_max")
    .in("type_id", usedTypeIds)
    .eq("is_active", true);

  const typeGuides = new Map<string, TypeGuideRef>();
  for (const g of (typeGuidesData || []) as TypeGuideRef[]) {
    typeGuides.set(g.type_id, g);
  }

  // 4. GPT-4.1-mini 호출
  const userPrompt = buildUserPrompt(
    category,
    topic,
    orderedQuestions as unknown as QuestionInfo[],
    typeGuides
  );

  const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.6,
      max_tokens: 2400,
    }),
  });

  if (!openaiResponse.ok) {
    const errText = await openaiResponse.text();
    console.error("[opic-study-guide] OpenAI 에러:", errText);
    throw new Error("AI 가이드 생성 실패");
  }

  const openaiData = await openaiResponse.json();
  const content = openaiData.choices?.[0]?.message?.content;
  if (!content) throw new Error("empty AI response");

  let parsed: GuideOutput;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("invalid AI JSON");
  }

  // 5. 검증
  const expectedCount = orderedQuestions.length;
  if (
    !parsed.intro_text ||
    typeof parsed.intro_text !== "string" ||
    !Array.isArray(parsed.approaches) ||
    parsed.approaches.length !== expectedCount
  ) {
    console.error(
      "[opic-study-guide] AI 응답 검증 실패:",
      JSON.stringify(parsed).slice(0, 500),
      `expected ${expectedCount} approaches`
    );
    throw new Error("AI 응답 형식 오류");
  }

  // 각 approach 풀 가이드 검증
  for (const a of parsed.approaches) {
    if (
      typeof a.question_index !== "number" ||
      typeof a.type_label !== "string" ||
      typeof a.approach !== "string" ||
      !Array.isArray(a.answer_flow) ||
      !Array.isArray(a.key_points) ||
      typeof a.recommended_word_min !== "number" ||
      typeof a.recommended_word_max !== "number"
    ) {
      console.error("[opic-study-guide] approach 풀 가이드 형식 오류:", a);
      throw new Error("AI approach 풀 가이드 형식 오류");
    }
  }

  // approaches를 question_index 순으로 정렬
  parsed.approaches.sort((a, b) => a.question_index - b.question_index);

  // 6. 캐시 INSERT (멱등성 — ON CONFLICT)
  const { error: insertErr } = await supabase.from("combo_guide_cache").upsert(
    {
      sig,
      topic,
      category,
      intro_text: parsed.intro_text,
      approaches: parsed.approaches,
      generated_at: new Date().toISOString(),
      prompt_version: PROMPT_VERSION,
    },
    { onConflict: "sig" }
  );

  if (insertErr) {
    console.error("[opic-study-guide] cache INSERT 실패:", insertErr.message);
    // 저장 실패해도 응답은 정상 — 다음 호출에서 재생성됨
  }

  // 비용 계산 (gpt-4.1-mini: $0.40/1M in, $1.60/1M out)
  const usage = openaiData.usage || {};
  const tokensIn = usage.prompt_tokens || 0;
  const tokensOut = usage.completion_tokens || 0;
  const costUsd = (tokensIn * 0.4 + tokensOut * 1.6) / 1_000_000;

  return {
    data: parsed,
    cacheHit: false,
    topic,
    category,
    costUsd,
    tokensIn,
    tokensOut,
  };
}

// ── 메인 핸들러 ──

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    // status 200 + "ok" body — 일부 모바일 브라우저(특히 삼성 인터넷·구버전 모바일 Chrome)는
    // OPTIONS preflight에 204를 비정상으로 처리해서 본 POST를 발사하지 않음
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const startTime = Date.now();
  let mode: "session" | "explore" = "session";
  let sessionId: string | null = null;
  let triggeredBy = "";
  let inputSig: string | null = null;

  try {
    const body = await req.json();
    triggeredBy = body.triggered_by;
    if (!triggeredBy) {
      return new Response(JSON.stringify({ error: "triggered_by required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 모드 분기
    if (body.session_id) {
      mode = "session";
      sessionId = body.session_id;
    } else if (body.sig) {
      mode = "explore";
      inputSig = body.sig;
    } else {
      return new Response(JSON.stringify({ error: "session_id or sig required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 클라이언트 hint (explore 모드에서 컨텍스트 정확성 보장)
    const hintTopic: string | undefined =
      typeof body.topic === "string" && body.topic.trim().length > 0
        ? body.topic.trim()
        : undefined;
    const hintCategoryRaw =
      typeof body.category === "string" ? body.category : undefined;
    const hintCategory: "general" | "roleplay" | "advance" | undefined =
      hintCategoryRaw === "general" ||
      hintCategoryRaw === "roleplay" ||
      hintCategoryRaw === "advance"
        ? hintCategoryRaw
        : undefined;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── 모드별 sig 결정 + 세션 정보 ──
    let sig: string;
    let questionIds: string[];

    if (mode === "session") {
      const { data: sessionData, error: sErr } = await supabase
        .from("opic_study_sessions")
        .select("id, selected_question_ids, ai_guide_intro")
        .eq("id", sessionId!)
        .single();

      if (sErr || !sessionData) {
        return new Response(JSON.stringify({ error: "session not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 멱등성: 세션 row에 이미 가이드 있으면 skip (캐시 hit으로 이미 복사됨)
      if (sessionData.ai_guide_intro) {
        return new Response(JSON.stringify({ ok: true, skipped: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      questionIds = (sessionData.selected_question_ids as string[]) ?? [];
      if (questionIds.length === 0) {
        return new Response(JSON.stringify({ error: "session has no questions" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      sig = buildSig(questionIds);
    } else {
      // explore 모드 — 정렬 sig를 받아 실제 출제 순서(대표 순서)로 복원
      sig = inputSig!;
      if (!sig.split("|").filter(Boolean).length) {
        return new Response(JSON.stringify({ error: "invalid sig" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      questionIds = await resolveOrderedQuestionIds(supabase, sig);
      if (questionIds.length === 0) {
        return new Response(JSON.stringify({ error: "invalid sig" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── 캐시 조회 + 미스 시 생성 ──
    const { data, cacheHit, costUsd, tokensIn, tokensOut } =
      await getOrGenerateGuide(supabase, sig, questionIds, {
        topic: hintTopic,
        category: hintCategory,
      });

    // ── session 모드: 세션 row에도 복사 (Realtime 동기화 트리거) ──
    if (mode === "session" && sessionId) {
      const { error: uErr } = await supabase
        .from("opic_study_sessions")
        .update({
          ai_guide_intro: data.intro_text,
          ai_guide_approaches: data.approaches,
          ai_guide_generated_at: new Date().toISOString(),
        })
        .eq("id", sessionId)
        .is("ai_guide_intro", null); // 멱등성
      if (uErr) console.error("[opic-study-guide] 세션 복사 실패:", uErr.message);
    }

    // ── 사용량 로깅 ──
    await logSystemUsage(supabase, {
      user_id: triggeredBy,
      session_id: sessionId,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      cost_usd: costUsd,
      processing_time_ms: Date.now() - startTime,
      cache_hit: cacheHit,
    });

    return new Response(
      JSON.stringify({ ok: true, cache_hit: cacheHit, sig, data }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[opic-study-guide] 예외:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
