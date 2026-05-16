/**
 * coaching-evaluate — AI 코치 메인 평가 + 코칭 EF
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

    // 1. attempt + session + question 조회
    const { data: attempt, error: aErr } = await supabase
      .from("coaching_attempts")
      .select("*, coaching_sessions!inner(*, questions(id, question_korean, question_english))")
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

    // 6. 페르소나 설정 조회
    const { data: personaSetting } = await supabase
      .from("coaching_persona_settings")
      .select("persona_code")
      .eq("user_id", session.user_id)
      .maybeSingle();
    const personaCode = personaSetting?.persona_code ?? "stoic_coach";

    // 7. 프롬프트 조립 (4개 row fetch)
    const moduleTemplateId = `coaching_module_${session.question_type}`;
    const { data: prompts, error: pErr } = await supabase
      .from("ai_prompt_templates")
      .select("template_id, system_prompt, model, temperature, max_tokens")
      .in("template_id", [
        `coaching_persona_${personaCode}`,
        "coaching_common_library",
        moduleTemplateId,
      ])
      .eq("is_active", true);

    if (pErr || !prompts || prompts.length === 0) {
      throw new Error(`프롬프트 로드 실패: ${pErr?.message ?? "no prompts"}`);
    }

    const promptMap = new Map(prompts.map((p: { template_id: string; system_prompt: string; model: string; temperature: number; max_tokens: number }) => [p.template_id, p]));
    const personaPrompt = promptMap.get(`coaching_persona_${personaCode}`);
    const commonPrompt = promptMap.get("coaching_common_library");
    const modulePrompt = promptMap.get(moduleTemplateId);

    if (!commonPrompt) throw new Error("coaching_common_library 프롬프트 없음");
    if (!modulePrompt) throw new Error(`${moduleTemplateId} 프롬프트 없음 (해당 유형 미구현)`);

    // 페르소나는 공통과 동일하면 한 번만 (중복 회피)
    const systemPromptParts: string[] = [];
    if (personaPrompt && personaPrompt.system_prompt !== commonPrompt.system_prompt) {
      systemPromptParts.push(personaPrompt.system_prompt);
    }
    systemPromptParts.push(commonPrompt.system_prompt);
    systemPromptParts.push(modulePrompt.system_prompt);

    const systemPrompt = systemPromptParts.join("\n\n---\n\n");

    // 8. User 프롬프트 (구체 답변 + 이전 진척)
    const userPrompt = buildUserPrompt({
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

    // 9. GPT 호출
    const gptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: modulePrompt.model ?? "gpt-4.1",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: modulePrompt.temperature ?? 0.4,
        max_tokens: modulePrompt.max_tokens ?? 6000,
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

    if (!result.coaching || !Array.isArray(result.coaching.issues) || !result.coaching.model_answer) {
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
      coaching_markdown: null,
      status: "done",
      model: modulePrompt.model ?? "gpt-4.1",
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
        model: modulePrompt.model ?? "gpt-4.1",
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
// User 프롬프트 빌더
// ============================================================

function buildUserPrompt(params: {
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
  const lines: string[] = [];

  lines.push("# 학습 컨텍스트");
  lines.push("");
  lines.push(`- 유형: ${params.questionType} (${params.surveyType ?? "—"})`);
  lines.push(`- 토픽: ${params.topic}`);
  lines.push(`- 회차: ${params.attemptNumber}회차`);
  lines.push("");

  lines.push("# 질문");
  lines.push("");
  lines.push(`**🇰🇷** ${params.questionKorean}`);
  lines.push(`**🇺🇸** ${params.questionEnglish}`);
  lines.push("");

  lines.push("# 학생 답변 (전처리 완료 — STT 오타 정정 및 구두점 복원)");
  lines.push("");
  lines.push("```");
  lines.push(params.cleanedTranscript);
  lines.push("```");
  lines.push("");

  if (params.sttFixLog.length > 0) {
    lines.push("## ⚠️ STT 정정 사항 (학생 흠으로 잡지 말 것)");
    lines.push("");
    params.sttFixLog.forEach((fix) => {
      lines.push(`- \`${fix.original}\` → \`${fix.fixed}\` (${fix.reason}, ${fix.confidence})`);
    });
    lines.push("");
  }

  lines.push("# 사전 측정 통계");
  lines.push("");
  lines.push(`- 단어 수: ${params.wordCount}`);
  lines.push(`- Filler 수: ${params.fillerCount} (${(params.wordCount > 0 ? (params.fillerCount / params.wordCount) * 100 : 0).toFixed(1)}%)`);
  if (params.audioDurationSec > 0) {
    lines.push(`- 음성 길이: ${params.audioDurationSec.toFixed(1)}초`);
  }
  lines.push("");

  if (params.prevAttempt) {
    lines.push(`# 이전 회차 (${params.prevAttempt.attempt_number}회차) 진척 비교 데이터`);
    lines.push("");
    if (params.prevAttempt.evaluation) {
      lines.push(`- 이전 흠 개수: ${params.prevAttempt.evaluation.흠_총_개수}`);
      lines.push(`- 이전 추정 등급: ${params.prevAttempt.evaluation.estimated_grade}`);
    }
    if (params.prevAttempt.filler_count !== null) {
      lines.push(`- 이전 filler 횟수: ${params.prevAttempt.filler_count}`);
    }
    lines.push("");
    lines.push("→ 이번 회차 평가 시 진척 비교 표 포함 (코칭 markdown 상단)");
    lines.push("");
  }

  lines.push("# 출력 형식 (JSON, 엄격히 준수)");
  lines.push("");
  lines.push("`coaching`은 자유 markdown이 아니라 **구조화 객체**다. 각 필드를 분리해서 채운다.");
  lines.push("");
  lines.push("```json");
  lines.push(`{
  "evaluation": {
    "estimated_grade": "IM3 또는 IH-IM3 경계 같은 자연어 (점수 X)",
    "흠_총_개수": 6,
    "흠_상세": [
      { "영역": "단락 구조", "상태": "Supporting 표지 3개 중 1개만 박힘", "학생_본문_인용": "..." }
    ],
    "강점": ["Overall 마무리 사용", "...."],
    "skeleton_완성도": {
      "topic_sentence": true, "transition": false,
      "supporting_1": true, "supporting_2": false, "supporting_3": false,
      "concluding": true, "ending": true, "score_percent": 57
    },
    "전회차_대비_진척": {
      "prev_attempt_number": 1, "흠_count_delta": -3,
      "skeleton_delta": "3/7 → 6/7", "filler_delta": "9 → 0"
    }
  },
  "coaching": {
    "intro": "네, 수고하셨습니다 Jay님. (회차에 맞는 짧은 인사 + 격려 1~2문장. 한국어)",
    "progress_table": [
      { "label": "Supporting 표지", "prev": "2/7", "current": "6/7", "signal": "big" }
    ],
    "issues": [
      {
        "title": "Supporting 표지 — Skeleton 구조 미흡",
        "severity": "high",
        "quote": "학생 본문에서 그대로 인용한 영어 표현",
        "explanation": "원리 설명 (한국어, 2~4문장). 왜 흠인지 + 어떻게 고치는지.",
        "fix_example": "정정·시범 영어 표현 (따라하기용, 없으면 생략)",
        "note": "일반화 — '다음에도 또 …' 같은 미래 대비 한 문장 (없으면 생략)"
      }
    ],
    "model_answer": {
      "text": "학생 소재를 살린 IH~AL 수준 통합 답변 (영어 전체).",
      "changes": ["Supporting 표지 3개 명확히 박음", "experience lost way → got lost 정정", "..."]
    },
    "action_items": ["Supporting 표지 3개 박기", "반복 어휘 줄이기", "분사구문 1개 넣기"],
    "closing": "외우지 마세요. 본인 말로 풀어내세요. 위 통합 답변은 참고용이에요."
  },
  "word_count": 132,
  "filler_count": 8,
  "filler_ratio": 0.061
}`);
  lines.push("```");
  lines.push("");
  lines.push("**필드 작성 규칙**:");
  lines.push("- `intro`: 인사 + 회차 맥락에 맞는 격려. 짧게. (점수/등급 숫자 X)");
  lines.push("- `progress_table`: **회차 ≥ 2일 때만** 포함. 1회차면 필드 생략 또는 빈 배열.");
  lines.push("- `issues`: 우선순위 순으로 정렬 (무너진 답변 → 구조 → 문법 → 어휘 → 분사구문 → filler).");
  lines.push("  - 1~2회차: 5~8개 / 3~4회차: 3~5개 / 5회차+: 1~3개");
  lines.push("  - `severity`: 단락 구조·답변 붕괴 = high, 문법·어색한 표현 = medium, 어휘 반복·filler·분사구문 도전 = low");
  lines.push("  - `quote`는 학생 본문 영어 표현 그대로. `explanation`/`note`는 한국어. `fix_example`은 영어.");
  lines.push("- `model_answer.text`: 학생 소재 그대로 살린 모범 답변. `changes`는 원답변 대비 바뀐 점.");
  lines.push("- `action_items`: 다음 회차에 의식할 항목. 체크박스 기호(✅) 붙이지 말 것 — UI가 붙임.");
  lines.push("");
  lines.push("**절대 금지** (모든 텍스트 필드 공통):");
  lines.push("- 강의 번호(04강/10강 등) 노출 금지");
  lines.push("- 점수/등급 숫자(IM3 55점, 60/100 등) 노출 금지 — 등급은 자연어로만, 가급적 언급 자제");
  lines.push("- 약점 코드(WP_*) 노출 금지");
  lines.push("- markdown 헤딩(#)·표·리스트 기호를 필드 값 안에 넣지 말 것 — 순수 텍스트만. UI가 디자인함.");

  return lines.join("\n");
}
