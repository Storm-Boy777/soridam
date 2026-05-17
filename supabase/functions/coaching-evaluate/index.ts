/**
 * coaching-evaluate — 스피킹 코치 메인 평가 + 코칭 EF
 *
 * 역할:
 *   1. attempt 행 조회 (raw_transcript or audio_url)
 *   2. (voice 모드) Whisper STT → raw_transcript
 *   3. coaching-preprocess 호출 → cleaned_transcript + stt_fix_log
 *   4. 이전 회차 진척 비교 데이터 로드
 *   5. 프롬프트 조립 (페르소나 + 공통 + 유형 모듈) — DB의 ai_prompt_templates 4개 row 조합
 *   6. GPT-4.1 호출 (response_format: json_object) → evaluation + coaching_json
 *   7. coaching_attempts UPDATE
 *   8. session.last_grade / last_issue_count 갱신
 *   9. 비용 로그
 *
 * 호출: submitAttempt SA → fire-and-forget
 * 입력: { attempt_id }
 *
 * 출력 형식 (학생에게 노출되는 것):
 *   - coaching_json (구조화 코칭, 강사 톤, 점수/등급/강의번호/약점코드 노출 X)
 *
 * 내부 데이터 (DB 저장, UI 노출 안 함):
 *   - evaluation jsonb (점수, 흠 코드 등)
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logApiUsage, extractChatUsage, extractWhisperDuration } from "../_shared/api-usage-logger.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "https://soridamhub.com,http://localhost:3001").split(",");

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

// ── 타입 ──

interface SttFix {
  original: string;
  fixed: string;
  reason: string;
  confidence: "high" | "medium" | "low";
}

interface PreprocessOutput {
  cleaned_transcript: string;
  stt_fix_log: SttFix[];
  preserved_errors: string[];
}

// 구조화 코칭 출력 (coaching_json) — 학습 룸 전용 카드 UI로 렌더링
interface CoachingIssue {
  title: string;
  severity: "high" | "medium" | "low";
  quote?: string;
  explanation: string;
  fix_example?: string;
  note?: string;
}

interface CoachingProgressRow {
  label: string;
  prev: string;
  current: string;
  signal?: "improved" | "big" | "new";
}

interface CoachingGraduation {
  ready: boolean;
  reason: string;
}

interface CoachingOutput {
  intro: string;
  progress_table?: CoachingProgressRow[];
  issues: CoachingIssue[];
  model_answer: {
    text: string;
    changes: string[];
  };
  action_items: string[];
  closing?: string;
  graduation?: CoachingGraduation;
}

interface EvalOutput {
  evaluation: {
    estimated_grade: string;
    흠_총_개수: number;
    흠_상세: Array<{ 영역: string; 상태: string; 학생_본문_인용?: string }>;
    강점: string[];
    skeleton_완성도?: {
      topic_sentence: boolean;
      transition: boolean;
      supporting_1: boolean;
      supporting_2: boolean;
      supporting_3: boolean;
      concluding: boolean;
      ending: boolean;
      score_percent: number;
    };
    전회차_대비_진척?: {
      prev_attempt_number: number;
      흠_count_delta: number;
      skeleton_delta?: string;
      filler_delta?: string;
    };
  };
  coaching: CoachingOutput;
  word_count: number;
  filler_count: number;
  filler_ratio: number;
}

// ============================================================
// 헬퍼: 단어/필러 카운팅 (정규식 기반 사전 측정 — GPT가 잘못 세는 것 보정)
// ============================================================

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const FILLER_PATTERNS = [
  /\byeah\b/gi,
  /\bokay\b/gi,
  /\bum+\b/gi,
  /\buh+\b/gi,
  /\beh+\b/gi,
  /\bhmm+\b/gi,
  /\byou know\b/gi,
  /\bi mean\b/gi,
  /\blike\b/gi,
  /\bactually\b/gi,
];

function countFillers(text: string): number {
  let count = 0;
  for (const pat of FILLER_PATTERNS) {
    const matches = text.match(pat);
    if (matches) count += matches.length;
  }
  return count;
}

// ============================================================
// 헬퍼: Whisper STT 호출
// ============================================================

async function whisperTranscribe(audioBlob: Blob): Promise<{ text: string; duration: number; rawJson: Record<string, unknown> }> {
  const formData = new FormData();
  formData.append("file", audioBlob, "audio.webm");
  formData.append("model", "whisper-1");
  formData.append("response_format", "verbose_json");
  formData.append("language", "en");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Whisper STT 실패: ${err}`);
  }

  const json = (await response.json()) as Record<string, unknown>;
  return {
    text: (json.text as string) ?? "",
    duration: extractWhisperDuration(json),
    rawJson: json,
  };
}

// ============================================================
// 헬퍼: Storage에서 audio 다운로드
// ============================================================

async function downloadAudio(supabase: SupabaseClient, audio_url: string): Promise<Blob> {
  // audio_url이 storage path 또는 full URL인지 확인
  // coaching-recordings 버킷의 path 형식: {user_id}/{session_id}/{timestamp}.webm
  let bucket = "coaching-recordings";
  let path = audio_url;

  if (audio_url.startsWith("http")) {
    // full URL인 경우 path 추출
    const match = audio_url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(\?|$)/);
    if (match) {
      bucket = match[1];
      path = match[2];
    }
  }

  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) throw new Error(`audio 다운로드 실패: ${error?.message ?? "no data"}`);
  return data;
}

// ============================================================
// 헬퍼: 이전 회차 진척 비교 데이터
// ============================================================

async function getPreviousAttempt(supabase: SupabaseClient, session_id: string, current_attempt_number: number) {
  if (current_attempt_number <= 1) return null;
  const { data } = await supabase
    .from("coaching_attempts")
    .select("attempt_number, evaluation, filler_count")
    .eq("session_id", session_id)
    .eq("attempt_number", current_attempt_number - 1)
    .maybeSingle();
  return data;
}

// ============================================================
// 메인 핸들러
// ============================================================

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startedAt = Date.now();
  let attemptId: string | null = null;

  try {
    const body = (await req.json()) as { attempt_id: string };
    if (!body.attempt_id) {
      return new Response(
        JSON.stringify({ error: "attempt_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    attemptId = body.attempt_id;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. attempt + session + question 조회 (v5 — 4축 매칭용 컬럼 추가)
    const { data: attempt, error: aErr } = await supabase
      .from("coaching_attempts")
      .select("*, coaching_sessions!inner(*, questions(id, question_korean, question_english, survey_type, category, topic, question_type_eng))")
      .eq("id", body.attempt_id)
      .single();

    if (aErr || !attempt) {
      console.error("[coaching-evaluate] attempt 조회 실패:", aErr);
      return new Response(
        JSON.stringify({ error: "attempt not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const session = attempt.coaching_sessions;
    const question = session?.questions;
    if (!session || !question) {
      throw new Error("세션 또는 질문 조인 실패");
    }

    // 진행 상태 업데이트
    await supabase
      .from("coaching_attempts")
      .update({ status: "preprocessing" })
      .eq("id", body.attempt_id);

    // 2. raw_transcript 확보 (voice면 Whisper, text면 그대로)
    let rawTranscript = attempt.raw_transcript as string | null;
    let audioDuration = attempt.audio_duration as number | null;

    if (!rawTranscript && attempt.audio_url) {
      // Whisper STT
      const audioBlob = await downloadAudio(supabase, attempt.audio_url);
      const stt = await whisperTranscribe(audioBlob);
      rawTranscript = stt.text;
      audioDuration = stt.duration;

      // 비용 로그 (Whisper)
      try {
        await logApiUsage(supabase, {
          user_id: session.user_id,
          session_type: "coaching",
          session_id: session.id,
          feature: "whisper_stt",
          service: "openai_whisper",
          model: "whisper-1",
          ef_name: "coaching-evaluate",
          audio_duration_sec: audioDuration,
          processing_time_ms: Date.now() - startedAt,
        });
      } catch (e) {
        console.error("[coaching-evaluate] Whisper 비용 로그 실패:", e);
      }
    }

    if (!rawTranscript || rawTranscript.trim().length === 0) {
      await supabase
        .from("coaching_attempts")
        .update({ status: "failed", error_message: "transcript 없음" })
        .eq("id", body.attempt_id);
      return new Response(
        JSON.stringify({ error: "transcript 없음" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. coaching-preprocess 호출 (내부)
    let preprocessed: PreprocessOutput;
    try {
      const preResp = await fetch(`${SUPABASE_URL}/functions/v1/coaching-preprocess`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          raw_transcript: rawTranscript,
          context: {
            question_type: session.question_type,
            topic: session.topic,
            user_id: session.user_id,
            session_id: session.id,
          },
        }),
      });
      preprocessed = await preResp.json();
      if (!preprocessed.cleaned_transcript) throw new Error("preprocess 결과 비어있음");
    } catch (e) {
      console.error("[coaching-evaluate] preprocess 실패, raw 사용:", e);
      preprocessed = {
        cleaned_transcript: rawTranscript,
        stt_fix_log: [],
        preserved_errors: [],
      };
    }

    await supabase
      .from("coaching_attempts")
      .update({ status: "evaluating" })
      .eq("id", body.attempt_id);

    // 4. 단어/필러 카운팅 (정규식)
    const word_count = countWords(preprocessed.cleaned_transcript);
    const filler_count = countFillers(preprocessed.cleaned_transcript);
    const filler_ratio = word_count > 0 ? filler_count / word_count : 0;

    // 5. 이전 회차 정보 (진척 비교용)
    const prevAttempt = await getPreviousAttempt(supabase, session.id, attempt.attempt_number);

    // 6. target_level 결정 (v5 — session.target_level → profile.target_grade → 'IH')
    let targetLevel: string = session.target_level ?? "";
    if (!targetLevel) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("target_grade")
        .eq("id", session.user_id)
        .maybeSingle();
      targetLevel = profile?.target_grade ?? "IH";
    }

    // 7. 4축 매칭 → spec_id 결정 (v5 — §5.0.2)
    const specId = resolveSpecId({
      survey_type: question.survey_type ?? null,
      category: question.category ?? null,
      topic: question.topic ?? session.topic ?? "",
      question_type_eng: question.question_type_eng ?? session.question_type,
    });

    // 8. coaching_specs 두 row 조회 (등급별 공통 base + 유형별 차별 — v5 §5.0.3)
    const specPair = await fetchSpecPair(supabase, specId, targetLevel);
    if (!specPair) {
      throw new Error(`spec 조회 실패: common × ${targetLevel} 시드 누락 (마이그레이션 078 미적용?)`);
    }
    // 유형 spec이 있으면 그것을 기준 spec, 없으면 common을 단독으로
    const spec = specPair.type ?? specPair.common;
    const commonSpec = specPair.common;

    // 9. coaching_system_v1 프롬프트 fetch (v5 — 단일 row, §5.3)
    const { data: systemRow, error: sysErr } = await supabase
      .from("ai_prompt_templates")
      .select("system_prompt, model, temperature, max_tokens")
      .eq("template_id", "coaching_system_v1")
      .eq("is_active", true)
      .single();

    if (sysErr || !systemRow) {
      throw new Error(`coaching_system_v1 로드 실패: ${sysErr?.message ?? "no row"}`);
    }

    // 10. System prompt = coaching_system_v1 본문 + spec.tone_adjustment 미세조정
    const systemPrompt = `${systemRow.system_prompt}\n\n---\n\n## TONE ADJUSTMENT (이번 세션 한정 — spec.${spec.guide_id})\n${spec.tone_adjustment}`;

    // 11. User prompt 조립 (v5 — §5.4, common base + 유형별 spec 두 데이터 주입)
    const userPrompt = assembleUserPrompt({
      spec,
      commonSpec,
      targetLevel,
      questionKorean: question.question_korean ?? "",
      questionEnglish: question.question_english ?? "",
      cleanedTranscript: preprocessed.cleaned_transcript,
      sttFixLog: preprocessed.stt_fix_log,
      attemptNumber: attempt.attempt_number,
      questionType: session.question_type,
      topic: session.topic,
      surveyType: session.survey_type,
      wordCount: word_count,
      fillerCount: filler_count,
      audioDurationSec: audioDuration ?? 0,
      prevAttempt: prevAttempt,
    });

    // 12. GPT 호출 (Pass 1 단일 — model_answer 포함, Pass 2 분리는 MVP 이후)
    const gptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: systemRow.model ?? "gpt-4.1",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: systemRow.temperature ?? 0.7,
        max_tokens: systemRow.max_tokens ?? 4000,
        response_format: { type: "json_object" },
      }),
    });

    if (!gptResponse.ok) {
      const errText = await gptResponse.text();
      await supabase
        .from("coaching_attempts")
        .update({ status: "failed", error_message: `GPT 호출 실패: ${errText.slice(0, 500)}` })
        .eq("id", body.attempt_id);
      throw new Error(`GPT 호출 실패: ${errText}`);
    }

    const gptJson = await gptResponse.json();
    const content = gptJson.choices?.[0]?.message?.content ?? "";

    let result: EvalOutput;
    try {
      result = JSON.parse(content);
    } catch (e) {
      console.error("[coaching-evaluate] JSON 파싱 실패:", e, "raw:", content.slice(0, 500));
      throw new Error("GPT 응답 파싱 실패");
    }

    if (
      !result.coaching ||
      !Array.isArray(result.coaching.issues) ||
      !result.coaching.model_answer ||
      !result.coaching.graduation ||
      typeof result.coaching.graduation.ready !== "boolean"
    ) {
      console.error("[coaching-evaluate] coaching 구조 누락:", JSON.stringify(result.coaching)?.slice(0, 500));
      throw new Error("GPT 응답에 coaching 구조가 없음");
    }

    // 10. attempt 갱신
    const updatePayload = {
      raw_transcript: rawTranscript,
      cleaned_transcript: preprocessed.cleaned_transcript,
      stt_fix_log: preprocessed.stt_fix_log,
      audio_duration: audioDuration,
      word_count: result.word_count ?? word_count,
      filler_count: result.filler_count ?? filler_count,
      filler_ratio: result.filler_ratio ?? filler_ratio,
      evaluation: result.evaluation,
      coaching_json: result.coaching,
      status: "done",
      model: systemRow.model ?? "gpt-4.1",
      tokens_used: gptJson.usage?.total_tokens ?? null,
      completed_at: new Date().toISOString(),
    };

    await supabase
      .from("coaching_attempts")
      .update(updatePayload)
      .eq("id", body.attempt_id);

    // 11. session 갱신 (last_grade / last_issue_count)
    await supabase
      .from("coaching_sessions")
      .update({
        last_grade: result.evaluation?.estimated_grade ?? null,
        last_issue_count: result.evaluation?.흠_총_개수 ?? null,
      })
      .eq("id", session.id);

    // 12. 비용 로그 (GPT)
    try {
      const usage = extractChatUsage(gptJson);
      await logApiUsage(supabase, {
        user_id: session.user_id,
        session_type: "coaching",
        session_id: session.id,
        feature: "evaluate_coaching",
        service: "openai_chat",
        model: systemRow.model ?? "gpt-4.1",
        ef_name: "coaching-evaluate",
        tokens_in: usage.prompt_tokens,
        tokens_out: usage.completion_tokens,
        text_length: preprocessed.cleaned_transcript.length,
        processing_time_ms: Date.now() - startedAt,
      });
    } catch (e) {
      console.error("[coaching-evaluate] GPT 비용 로그 실패:", e);
    }

    return new Response(JSON.stringify({ ok: true, attempt_id: body.attempt_id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[coaching-evaluate] 예외:", err);
    // 처리 중(pending/preprocessing/evaluating) 상태로 멈춘 attempt를 failed로 마킹
    // → 학습 룸의 무한 폴링 방지 (이미 done인 경우는 .in 필터로 보호)
    if (attemptId) {
      try {
        const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await sb
          .from("coaching_attempts")
          .update({
            status: "failed",
            error_message: (err instanceof Error ? err.message : "평가 실패").slice(0, 500),
          })
          .eq("id", attemptId)
          .in("status", ["pending", "preprocessing", "evaluating"]);
      } catch (e) {
        console.error("[coaching-evaluate] failed 마킹 실패:", e);
      }
    }
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "평가 실패" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============================================================
// v5 — 4축 매칭 + spec 조회 + User Prompt 조립
// 설계: docs/설계/스피킹코치_재설계.md §5.0 ~ §5.4
// ============================================================

// 돌발 4 그룹 13 토픽 (description × 공통형 × 일반)
const RANDOM_TOPICS_13 = [
  "은행", "호텔", "음식점", "교통",        // 시사
  "재활용", "지형", "날씨",                 // 환경
  "산업", "기술",                            // 산업·기술
  "모임", "휴일", "자유시간",               // 개인
];
const CURRENT_AFFAIRS = ["은행", "호텔", "음식점", "교통"];
const ENVIRONMENT     = ["재활용", "지형", "날씨"];
const INDUSTRY_TECH   = ["산업", "기술"];
const PERSONAL        = ["모임", "휴일", "자유시간"];

// §5.0.2 — 4축 매칭 → spec_id
function resolveSpecId(q: {
  survey_type: string | null;
  category: string | null;
  topic: string;
  question_type_eng: string;
}): string {
  if (q.question_type_eng === "self_intro") {
    throw new Error("self_intro is not a coaching target (v5 사용자 확정)");
  }

  const isRandomDescription =
    q.survey_type === "공통형" &&
    q.category === "일반" &&
    q.question_type_eng === "description" &&
    RANDOM_TOPICS_13.includes(q.topic);

  if (isRandomDescription) {
    if (CURRENT_AFFAIRS.includes(q.topic)) return "description_random_current_affairs";
    if (ENVIRONMENT.includes(q.topic))     return "description_random_environment";
    if (INDUSTRY_TECH.includes(q.topic))   return "description_random_industry_tech";
    if (PERSONAL.includes(q.topic))        return "description_random_personal";
  }

  return q.question_type_eng;
}

// §5.0.3 — coaching_specs 조회 (등급별 공통 base + 유형별 차별 — 두 row 합성)
interface CoachingSpec {
  guide_id: string;
  question_type: string;
  target_grade: string;
  evaluation_criteria: string;
  coaching_focus: string;
  model_answer_spec: string;
  model_answer_min_words: number;
  graduation_thresholds: Record<string, unknown>;
  issue_count_per_attempt: Record<string, unknown>;
  example_model_answer: string | null;
  tone_adjustment: string;
}

interface SpecPair {
  common: CoachingSpec;  // 등급별 공통 base (SSOT)
  type: CoachingSpec | null;  // 유형별 차별 (없으면 common만 단독 사용)
}

async function fetchSpecPair(
  supabase: SupabaseClient,
  specId: string,
  targetLevel: string,
): Promise<SpecPair | null> {
  // 항상 common 같은 등급 fetch (등급별 공통 코칭 헌법 SSOT)
  const { data: common } = await supabase
    .from("coaching_specs")
    .select("*")
    .eq("question_type", "common")
    .eq("target_grade", targetLevel)
    .maybeSingle();

  if (!common) {
    // common 시드가 없으면 작동 불가 — 마이그레이션 078 미적용 상황
    return null;
  }

  // 유형별 spec (있으면 common 위에 차별 요소로 합성)
  // specId가 "common"이면 (폴백 모드) type 조회 skip
  let typeSpec: CoachingSpec | null = null;
  if (specId !== "common") {
    const { data: t } = await supabase
      .from("coaching_specs")
      .select("*")
      .eq("question_type", specId)
      .eq("target_grade", targetLevel)
      .maybeSingle();
    typeSpec = t as CoachingSpec | null;
  }

  return { common: common as CoachingSpec, type: typeSpec };
}

// §5.4 — User Prompt 6 섹션 조립 (common base + 유형 spec 두 데이터 주입)
function assembleUserPrompt(params: {
  spec: CoachingSpec;
  commonSpec: CoachingSpec;
  targetLevel: string;
  questionKorean: string;
  questionEnglish: string;
  cleanedTranscript: string;
  sttFixLog: SttFix[];
  attemptNumber: number;
  questionType: string;
  topic: string;
  surveyType: string | null;
  wordCount: number;
  fillerCount: number;
  audioDurationSec: number;
  prevAttempt: { attempt_number: number; evaluation: EvalOutput["evaluation"] | null; filler_count: number | null } | null;
}): string {
  const { spec, commonSpec, targetLevel, attemptNumber, prevAttempt, sttFixLog } = params;
  const lines: string[] = [];
  const hasTypeSpec = spec.guide_id !== commonSpec.guide_id;

  // ⓪ LEVEL GATE — 학생 목표 등급 + 2-Layer spec 주입 (common base + 유형 차별)
  lines.push(`## ⓪ LEVEL GATE — 학생 목표 등급: ${targetLevel}`);
  lines.push("");
  lines.push(`⛔ 학생 목표는 **${targetLevel}**. 코칭·model_answer·졸업 판정 모두 이 등급 기준.`);
  lines.push(`⛔ 적용 spec: **${commonSpec.guide_id}** (등급별 공통 base) ${hasTypeSpec ? `+ **${spec.guide_id}** (유형별 차별)` : "(유형 spec 없음 — common 단독)"}`);
  lines.push("");

  // ━━━ Layer A — 등급별 공통 코칭 헌법 (common spec) ━━━
  lines.push(`### A. 등급별 공통 코칭 헌법 — \`${commonSpec.guide_id}\` (SSOT)`);
  lines.push("");
  lines.push("**A.1 공통 평가 기준 (common.evaluation_criteria)**");
  lines.push(commonSpec.evaluation_criteria);
  lines.push("");
  lines.push("**A.2 공통 코칭 우선순위 (common.coaching_focus)**");
  lines.push(commonSpec.coaching_focus);
  lines.push("");
  lines.push("**A.3 공통 model_answer 톤 (common.model_answer_spec)**");
  lines.push(commonSpec.model_answer_spec);
  lines.push(`- 공통 최소 단어수: ${commonSpec.model_answer_min_words}`);
  lines.push("");
  lines.push("**A.4 공통 톤 (common.tone_adjustment)**");
  lines.push(commonSpec.tone_adjustment);
  lines.push("");

  // ━━━ Layer B — 유형별 차별 (type spec, 있을 때만) ━━━
  if (hasTypeSpec) {
    lines.push(`### B. 유형별 차별 — \`${spec.guide_id}\` (위 A를 base로 + 아래 차별)`);
    lines.push("");
    lines.push("**B.1 유형별 평가 기준 (type.evaluation_criteria)**");
    lines.push(spec.evaluation_criteria);
    lines.push("");
    lines.push("**B.2 유형별 코칭 우선순위 (type.coaching_focus)**");
    lines.push(spec.coaching_focus);
    lines.push("");
    lines.push("**B.3 유형별 model_answer 톤 (type.model_answer_spec)**");
    lines.push(spec.model_answer_spec);
    lines.push(`- 유형별 최소 단어수: ${spec.model_answer_min_words} (이 값을 따를 것)`);
    lines.push("");
    lines.push("**B.4 유형별 톤 조정 (type.tone_adjustment)**");
    lines.push(spec.tone_adjustment);
    lines.push("");
    if (spec.example_model_answer) {
      lines.push(`**B.5 유형별 완성 모범 (참조 — ${spec.target_grade} × ${spec.question_type})**`);
      lines.push("```");
      lines.push(spec.example_model_answer);
      lines.push("```");
      lines.push("");
    }
  }

  // ━━━ 공통 임계치 (둘 다 같은 등급이므로 type 우선, fallback common) ━━━
  lines.push("### C. 졸업 임계치 (graduation_thresholds)");
  lines.push("```json");
  lines.push(JSON.stringify(spec.graduation_thresholds, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("### D. 회차별 짚는 개수 가이드 (issue_count_per_attempt)");
  lines.push("```json");
  lines.push(JSON.stringify(spec.issue_count_per_attempt, null, 2));
  lines.push("```");
  lines.push(`현재 회차: ${attemptNumber}. 위 표에서 해당 구간 범위 내로 짚을 것.`);
  lines.push("");

  lines.push("---");
  lines.push("");
  lines.push("**SPEC 적용 원칙**:");
  lines.push("1. Layer A(common)는 모든 유형 코칭의 SSOT. 짚는 순서·강도·톤의 기본.");
  if (hasTypeSpec) {
    lines.push(`2. Layer B(${spec.question_type})는 A 위에 얹는 유형 차별 요소. 두 spec이 충돌하면 B 우선.`);
  } else {
    lines.push("2. 유형 spec 없음 — A의 공통 코칭 그대로 적용.");
  }
  lines.push("3. issues 개수·짚는 우선순위·model_answer 톤은 위 spec 데이터 준수.");
  lines.push("");
  lines.push("---");
  lines.push("");

  // ① 학습 컨텍스트
  lines.push("## ① 학습 컨텍스트");
  lines.push("");
  lines.push(`- 유형: ${params.questionType} (${params.surveyType ?? "—"})`);
  lines.push(`- 토픽: ${params.topic}`);
  lines.push(`- 회차: ${attemptNumber}회차`);
  lines.push("");

  // ② 질문
  lines.push("## ② 질문");
  lines.push("");
  lines.push(`**🇰🇷** ${params.questionKorean}`);
  lines.push(`**🇺🇸** ${params.questionEnglish}`);
  lines.push("");

  // ③ 학생 답변 (cleaned_transcript)
  lines.push("## ③ 학생 답변 (cleaned_transcript)");
  lines.push("");
  lines.push("```");
  lines.push(params.cleanedTranscript);
  lines.push("```");
  lines.push("");

  // ④ STT 정정 사항 (학생 흠으로 잡지 말 것)
  if (sttFixLog.length > 0) {
    lines.push("## ④ STT 정정 사항 (학생 흠으로 잡지 말 것)");
    lines.push("");
    sttFixLog.forEach((fix) => {
      lines.push(`- \`${fix.original}\` → \`${fix.fixed}\` (${fix.reason}, ${fix.confidence})`);
    });
    lines.push("");
  }

  // ⑤ 사전 측정 통계
  lines.push("## ⑤ 사전 측정 통계");
  lines.push("");
  lines.push(`- 단어 수: ${params.wordCount}`);
  lines.push(`- Filler 수: ${params.fillerCount} (${(params.wordCount > 0 ? (params.fillerCount / params.wordCount) * 100 : 0).toFixed(1)}%)`);
  if (params.audioDurationSec > 0) {
    lines.push(`- 음성 길이: ${params.audioDurationSec.toFixed(1)}초`);
  }
  lines.push("");

  // ⑥ 이전 회차 데이터 (회차 ≥ 2)
  if (prevAttempt) {
    lines.push(`## ⑥ 이전 회차 (${prevAttempt.attempt_number}회차) 진척 데이터`);
    lines.push("");
    if (prevAttempt.evaluation) {
      lines.push(`- 이전 흠 개수: ${prevAttempt.evaluation.흠_총_개수}`);
      lines.push(`- 이전 추정 등급: ${prevAttempt.evaluation.estimated_grade}`);
    }
    if (prevAttempt.filler_count !== null) {
      lines.push(`- 이전 filler 횟수: ${prevAttempt.filler_count}`);
    }
    lines.push("");
    lines.push("→ 이번 회차 평가 시 `coaching.progress_table`에 비교 행 포함 의무.");
    lines.push("");
  }

  lines.push("---");
  lines.push("");

  // ⑦ EVALUATE & COACH — 출력 JSON 형식
  lines.push("## ⑦ EVALUATE & COACH");
  lines.push("");
  lines.push("위 spec과 컨텍스트로 평가·코칭을 수행하고, **아래 JSON 형식만** 반환할 것.");
  lines.push("");
  lines.push("```json");
  lines.push(`{
  "evaluation": {
    "estimated_grade": "자연어 (예: IH 진입 후보 / IM3 상단). 점수 숫자 X.",
    "흠_총_개수": 0,
    "흠_상세": [
      { "영역": "Skeleton 구조 / 어휘 폭 / Cohesive devices / 분사구문 등", "상태": "구체 설명", "학생_본문_인용": "..." }
    ],
    "강점": ["...", "..."],
    "skeleton_완성도": {
      "topic_sentence": true, "transition": false,
      "supporting_1": true, "supporting_2": false, "supporting_3": false,
      "concluding": true, "ending": true, "score_percent": 57
    }
  },
  "coaching": {
    "intro": "짧은 인사 + 회차 격려 (한국어, 2~3문장, 점수·등급 숫자 X)",
    "progress_table": [
      { "label": "Skeleton 슬롯", "prev": "3/6", "current": "6/6", "signal": "big" }
    ],
    "issues": [
      {
        "title": "한국어 짧은 제목",
        "severity": "high|medium|low",
        "quote": "학생 본문에서 그대로 인용한 영어 표현",
        "explanation": "원리 설명 (한국어, 2~4문장). 왜 흠인지 + 어떻게 고치는지.",
        "fix_example": "정정·시범 영어 표현 (따라하기용, 없으면 생략)",
        "note": "일반화 — '다음에도 또 …' 같은 미래 대비 한 문장 (없으면 생략)"
      }
    ],
    "model_answer": {
      "text": "학생 소재 살린 ${targetLevel} 수준 영어 통합 답변 (전체).",
      "changes": ["원답변 대비 어떤 점을 어떻게 바꿨는지 한국어 짧은 문장 (최소 1개)"]
    },
    "action_items": ["다음 회차에 의식할 항목 (한국어, 짧게, 체크박스 기호 X)"],
    "closing": "마무리 격려 (한국어, 1~2문장. intro와 일관된 톤)",
    "graduation": {
      "ready": false,
      "reason": "판단 근거 1~2문장 (한국어, 학생 안내 톤). intro/closing의 졸업 언급과 일치시킬 것."
    }
  },
  "word_count": 0,
  "filler_count": 0,
  "filler_ratio": 0.0
}`);
  lines.push("```");
  lines.push("");
  lines.push("### 필드 작성 규칙");
  lines.push(`- \`issues\` 개수: ⓪ LEVEL GATE의 \`issue_count_per_attempt\`에서 회차 ${attemptNumber}에 해당하는 구간 범위 내.`);
  lines.push("- `issues` 우선순위: ⓪ LEVEL GATE의 `coaching_focus` 1번부터.");
  lines.push("- `progress_table`: 회차 ≥ 2일 때만 포함. 1회차면 빈 배열 또는 생략.");
  lines.push("- `quote`/`fix_example`/`model_answer.text`: 영어.");
  lines.push("- `intro`/`explanation`/`note`/`closing`/`action_items`/`graduation.reason`: 한국어.");
  lines.push(`- \`model_answer.text\`: 학생 소재(가족·직장·취미 등) 그대로 살림. ${targetLevel} 수준에 맞는 길이·어휘. 최소 ${spec.model_answer_min_words} 단어.`);
  lines.push("- `graduation.ready`: ⓪ LEVEL GATE의 `graduation_thresholds` 기준으로 판정. `reason`은 intro/closing 졸업 언급과 모순 X.");
  lines.push("");
  lines.push("### 절대 금지");
  lines.push("- 강의 번호 / 점수 숫자 / 약점 코드 / 강사 본명·예명 / 외부 교재명 노출 X.");
  lines.push("- 필드 값에 markdown 헤딩(#)·표·리스트 기호 X (UI가 디자인).");
  lines.push(`- LEVEL GATE 위반 X (${targetLevel} 등급 천장 초과 model_answer 생성 X).`);

  return lines.join("\n");
}
