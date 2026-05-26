/**
 * talklish-guide — Talklish 수요일 콤보 답변 가이드 EF
 *
 * 콤보(sig) 단위 1회 가이드 생성 + talklish_combo_guide_cache 영구 캐시.
 * 큰 모니터에 콤보 4문항 가이드를 한눈에 — 각 질문:
 *   유형 / 답변 흐름(2~3단계) / 추천 어휘·표현(en+ko 4~6개) / 예시 문장 1개
 *
 * 입력: { sig, question_ids?, topic, category, triggered_by }
 *   - sig 없이 question_ids만 와도 됨 (sig = 정렬·조인)
 * 출력: { ok, cache_hit, sig, data: { intro, questions[] } }
 *
 * 온라인 opic-study-guide 와 캐시·question_type_guides 참조 패턴은 같지만,
 * 출력 포맷(vocab/example)과 캐시 테이블(talklish_combo_guide_cache)이 다름 (Talklish 전용).
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "https://soridamhub.com,http://localhost:3001,http://localhost:3000,http://localhost:3100").split(",");

const PROMPT_VERSION = 1;

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

// ── 타입 ──
interface GuideQuestion {
  question_idx: number;            // 0-base (콤보 내 순서)
  type_label: string;
  answer_flow: string[];           // 2~3단계
  vocab: { en: string; ko: string }[]; // 추천 어휘·표현 4~6개
  example: string;                 // 예시 문장 1개 (영어)
}
interface TalklishGuide {
  intro: string;
  questions: GuideQuestion[];
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
interface TypeGuideRef {
  type_id: string;
  type_label_kor: string;
  type_short_kor: string;
  prompt_reference: string;
}

// ── 헬퍼 ──
function normalizeCategory(raw: string): "general" | "roleplay" | "advance" {
  const r = (raw || "").trim().toLowerCase();
  if (r === "일반" || r.startsWith("general")) return "general";
  if (r === "롤플레이" || r === "roleplay") return "roleplay";
  if (r === "어드밴스" || r === "advance") return "advance";
  return "general";
}

function majorityTopic(questions: QuestionInfo[]): string {
  const counts = new Map<string, number>();
  for (const q of questions) {
    const t = (q.topic as string) || "";
    if (!t) continue;
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  let best = "";
  let bestCount = -1;
  for (const [t, c] of counts) {
    if (c > bestCount) { best = t; bestCount = c; }
  }
  return best;
}

function buildSig(questionIds: string[]): string {
  return [...questionIds].sort().join("|");
}

// ── 프롬프트 ──
const SYSTEM_PROMPT = `당신은 오프라인 오픽 스터디(큰 모니터에 띄워 멤버 6명이 함께 보는)의 AI 학습 코치입니다.
멤버들이 콤보 질문에 답하기 전에 참고할 수 있도록, 각 질문의 답변 가이드를 만듭니다.

# 역할 원칙
- 친근한 코치 톤 ("~예요", "~해보세요").
- 설명은 한글로 하되, 추천 어휘·표현은 영어 + 한글 뜻을 함께 제시합니다 (멤버가 실제 답변에 바로 쓸 수 있게).
- 토픽 맥락 입히기: 음악/카페/여행 등 주어진 토픽에 자연스럽게 어울리도록 가이드를 변형합니다.
- 큰 화면에 함께 보지만, 멤버가 바로 따라 할 수 있도록 **충실하게** 씁니다 (군더더기 없이, 단 부실하지 않게).
- 등급 비특정: 특정 등급(IM/IH/AL)을 언급하지 말고 보편적 답변 방향만 안내합니다.

# 각 질문 가이드 구성
- type_label: 질문 유형 (제공된 type_short_kor 그대로)
- answer_flow: 답변 흐름 3~4단계 (각 6~16자). 질문이 묻는 **모든 파트를 빠짐없이** 커버하고(예: "어떤 음악 + 좋아하는 뮤지션"이면 둘 다), '구체적 예시·디테일' 단계와 '마무리 느낌' 단계까지 포함.
- vocab: 추천 표현 **5~7개** — 각 { "en": 영어, "ko": 한글 뜻 }. ⛔ 단순 단어(genre, melody, lyrics 같은 명사 하나)는 금지. ✅ 바로 문장에 넣어 쓰는 콜로케이션·구동사·관용 표현으로 준다 (예: "I'm really into ~", "my go-to genre", "the lyrics resonate with me", "it helps me unwind", "I can't get enough of ~").
- example: **모범 답변 2~3문장**. 도입 → 구체적 예시(뮤지션 이름·상황·이유) → 마무리 느낌의 흐름으로, 위 추천 표현(vocab)을 자연스럽게 2개 이상 녹여서 쓴다. 외운 듯한 단문 한 줄은 금지.

# 출력 형식
JSON 객체:
- intro: 오늘 콤보 한 줄 인사 (40~60자, 친근하게)
- questions: 각 질문별 가이드 배열 (question_index는 0부터, 콤보 질문 수에 정확히 맞춤)`;

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
      return `Q${i} [${label}]\n  영어 원문: ${q.question_english}\n  한글 요약: ${q.question_short || q.question_korean || "(없음)"}`;
    })
    .join("\n\n");

  const usedTypeIds = [...new Set(questions.map((q) => q.question_type_eng))];
  const typeReferences = usedTypeIds
    .map((tid) => {
      const g = typeGuides.get(tid);
      if (!g) return `### ${tid}\n  (가이드 없음 — 이 유형의 본질을 자체 지식으로 풀어주세요)`;
      return `### ${g.type_short_kor} (${g.type_id})\n  유형 본질: ${g.prompt_reference}`;
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

\`\`\`json
{
  "intro": "오늘은 ${topic} 콤보로 함께 연습해볼게요 (40~60자)",
  "questions": [
    {
      "question_idx": 0,
      "type_label": "(제공된 type_short_kor 그대로)",
      "answer_flow": ["단계1 (질문 첫 파트)", "단계2 (구체적 예시·디테일)", "단계3 (마무리 느낌)"],
      "vocab": [
        { "en": "콜로케이션·표현 (단어 하나 금지)", "ko": "한글 뜻" }
      ],
      "example": "모범 답변 2~3문장 (도입 → 구체 → 마무리, vocab 표현 2개 이상 녹여서)"
    }
    // 질문 수만큼 (정확히 ${questions.length}개, question_idx 0부터)
  ]
}
\`\`\`

- answer_flow는 질문의 모든 파트를 빠짐없이 커버 + 구체화 단계 + 마무리 단계 (3~4개).
- vocab은 질문마다 5~7개. ⛔ 단순 단어 금지 — 바로 문장에 넣어 쓰는 콜로케이션·구동사·관용 표현으로.
- example은 모범 답변 2~3문장. 질문의 모든 파트를 자연스럽게 커버하고 vocab 표현을 2개 이상 녹인다.`;
}

// ── 사용량 로깅 ──
async function logUsage(
  supabase: SupabaseClient,
  params: {
    user_id: string;
    tokens_in: number;
    tokens_out: number;
    cost_usd: number;
    processing_time_ms: number;
    cache_hit: boolean;
  }
) {
  const { error } = await supabase.from("api_usage_logs").insert({
    user_id: params.user_id,
    session_type: "talklish",
    feature: params.cache_hit ? "talklish_guide_cache_hit" : "talklish_guide",
    service: "openai_chat",
    model: params.cache_hit ? "cache" : "gpt-4.1-mini",
    ef_name: "talklish-guide",
    tokens_in: params.tokens_in,
    tokens_out: params.tokens_out,
    cost_usd: params.cost_usd,
    processing_time_ms: params.processing_time_ms,
  });
  if (error) console.error("[talklish-guide] api_usage_logs insert 실패:", error.message);
}

// ── 핵심: 캐시 조회 + GPT 생성 + 캐시 저장 ──
async function getOrGenerateGuide(
  supabase: SupabaseClient,
  sig: string,
  questionIds: string[],
  hint?: { topic?: string; category?: "general" | "roleplay" | "advance" }
): Promise<{
  data: TalklishGuide;
  cacheHit: boolean;
  costUsd: number;
  tokensIn: number;
  tokensOut: number;
}> {
  // 1. 캐시 조회
  const { data: cached } = await supabase
    .from("talklish_combo_guide_cache")
    .select("guide")
    .eq("sig", sig)
    .eq("prompt_version", PROMPT_VERSION)
    .maybeSingle();

  if (cached?.guide) {
    return { data: cached.guide as TalklishGuide, cacheHit: true, costUsd: 0, tokensIn: 0, tokensOut: 0 };
  }

  // 2. 미스 → 질문 정보 조회
  const { data: questions, error: qErr } = await supabase
    .from("questions")
    .select("id, question_type_eng, question_english, question_korean, question_short, topic, category")
    .in("id", questionIds);

  if (qErr || !questions || questions.length === 0) throw new Error("questions not found");

  const orderedQuestions = questionIds
    .map((qid) => questions.find((q) => q.id === qid))
    .filter((q): q is NonNullable<typeof q> => !!q);
  if (orderedQuestions.length !== questionIds.length) throw new Error("questions count mismatch");

  const topic = (hint?.topic && hint.topic.trim().length > 0)
    ? hint.topic
    : majorityTopic(orderedQuestions as unknown as QuestionInfo[]) || ((orderedQuestions[0].topic as string) ?? "");
  const category = hint?.category ?? normalizeCategory((orderedQuestions[0].category as string) ?? "");

  // 3. question_type_guides 참조
  const usedTypeIds = [...new Set(orderedQuestions.map((q) => q.question_type_eng as string))];
  const { data: typeGuidesData } = await supabase
    .from("question_type_guides")
    .select("type_id, type_label_kor, type_short_kor, prompt_reference")
    .in("type_id", usedTypeIds)
    .eq("is_active", true);

  const typeGuides = new Map<string, TypeGuideRef>();
  for (const g of (typeGuidesData || []) as TypeGuideRef[]) typeGuides.set(g.type_id, g);

  // 4. GPT-4.1-mini
  const userPrompt = buildUserPrompt(category, topic, orderedQuestions as unknown as QuestionInfo[], typeGuides);
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.6,
      max_tokens: 2600,
    }),
  });
  if (!resp.ok) {
    console.error("[talklish-guide] OpenAI 에러:", await resp.text());
    throw new Error("AI 가이드 생성 실패");
  }

  const openaiData = await resp.json();
  const content = openaiData.choices?.[0]?.message?.content;
  if (!content) throw new Error("empty AI response");

  let parsed: TalklishGuide;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("invalid AI JSON");
  }

  // 5. 검증 + 정규화
  const expected = orderedQuestions.length;
  if (!parsed.intro || typeof parsed.intro !== "string" || !Array.isArray(parsed.questions) || parsed.questions.length !== expected) {
    console.error("[talklish-guide] 검증 실패:", JSON.stringify(parsed).slice(0, 400), `expected ${expected}`);
    throw new Error("AI 응답 형식 오류");
  }
  parsed.questions = parsed.questions.map((q, i) => ({
    question_idx: typeof q.question_idx === "number" ? q.question_idx : i,
    type_label: typeof q.type_label === "string" ? q.type_label : "",
    answer_flow: Array.isArray(q.answer_flow) ? q.answer_flow.filter((s) => typeof s === "string") : [],
    vocab: Array.isArray(q.vocab)
      ? q.vocab
          .map((v) => ({ en: typeof v?.en === "string" ? v.en : "", ko: typeof v?.ko === "string" ? v.ko : "" }))
          .filter((v) => v.en)
      : [],
    example: typeof q.example === "string" ? q.example : "",
  }));
  parsed.questions.sort((a, b) => a.question_idx - b.question_idx);

  // 6. 캐시 UPSERT (멱등성)
  const { error: insErr } = await supabase.from("talklish_combo_guide_cache").upsert(
    {
      sig,
      topic,
      category,
      guide: parsed,
      prompt_version: PROMPT_VERSION,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "sig" }
  );
  if (insErr) console.error("[talklish-guide] cache upsert 실패:", insErr.message);

  const usage = openaiData.usage || {};
  const tokensIn = usage.prompt_tokens || 0;
  const tokensOut = usage.completion_tokens || 0;
  const costUsd = (tokensIn * 0.4 + tokensOut * 1.6) / 1_000_000;

  return { data: parsed, cacheHit: false, costUsd, tokensIn, tokensOut };
}

// ── 메인 핸들러 ──
Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const startTime = Date.now();
  try {
    const body = await req.json();
    const triggeredBy: string = body.triggered_by || "";
    if (!triggeredBy) {
      return new Response(JSON.stringify({ error: "triggered_by required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let questionIds: string[] = Array.isArray(body.question_ids) ? body.question_ids.filter((x: unknown) => typeof x === "string") : [];
    let sig: string = typeof body.sig === "string" ? body.sig : "";
    if (questionIds.length === 0 && sig) questionIds = sig.split("|").filter(Boolean);
    if (questionIds.length === 0) {
      return new Response(JSON.stringify({ error: "sig or question_ids required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!sig) sig = buildSig(questionIds);

    const hintTopic = typeof body.topic === "string" && body.topic.trim().length > 0 ? body.topic.trim() : undefined;
    const hintCategoryRaw = typeof body.category === "string" ? body.category : undefined;
    const hintCategory =
      hintCategoryRaw === "general" || hintCategoryRaw === "roleplay" || hintCategoryRaw === "advance"
        ? hintCategoryRaw
        : hintCategoryRaw
          ? normalizeCategory(hintCategoryRaw)
          : undefined;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data, cacheHit, costUsd, tokensIn, tokensOut } = await getOrGenerateGuide(
      supabase, sig, questionIds, { topic: hintTopic, category: hintCategory }
    );

    await logUsage(supabase, {
      user_id: triggeredBy,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      cost_usd: costUsd,
      processing_time_ms: Date.now() - startTime,
      cache_hit: cacheHit,
    });

    return new Response(JSON.stringify({ ok: true, cache_hit: cacheHit, sig, data }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[talklish-guide] 예외:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
