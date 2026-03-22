/**
 * mock-test-eval — Stage B-1: 체크박스 전용 Edge Function
 *
 * 역할: ACTFL 체크박스 74개 pass/fail 판정만 수행.
 *       과제충족/소견/방향/WP는 consult가 담당.
 *
 * 호출: 1문항 1호출
 * 입력: { session_id, question_number, model? }
 * 목표 등급: user_metadata.target_grade에서 직접 조회 (SSOT)
 * 처리: DB에서 프롬프트 로드 → 체크박스 정의 동적 주입 → GPT-4.1 호출 → DB 저장
 *       → consult fire-and-forget 체인
 *
 * 프롬프트: evaluation_prompts (CO-STAR, key: diagnose/diagnose_user)
 * API: OpenAI Chat Completions API + response_format (Structured Outputs)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getCheckboxIdsForQuestionType,
  buildCheckboxDefinitionsText,
  validateCheckboxes,
  type CheckboxResult,
} from "../_shared/checkbox-definitions.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "https://opictalkdoc.com,http://localhost:3001").split(",");

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

// 내부 호출용 (fire-and-forget 등 origin 없는 경우)
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── 타입 ──

interface DiagnoseResult {
  checkboxes: Record<string, { pass: boolean; evidence: string }>;
}

// ── 체크박스 전용 JSON Schema 동적 생성 ──

function buildCheckboxSchema(checkboxIds: string[]) {
  return {
    type: "json_schema" as const,
    json_schema: {
      name: "diagnose_output",
      strict: true,
      schema: {
        type: "object",
        required: ["checkboxes"],
        additionalProperties: false,
        properties: {
          checkboxes: {
            type: "object",
            properties: Object.fromEntries(
              checkboxIds.map((id) => [
                id,
                {
                  type: "object",
                  properties: {
                    pass: { type: "boolean" },
                    evidence: { type: "string" },
                  },
                  required: ["pass", "evidence"],
                  additionalProperties: false,
                },
              ]),
            ),
            required: checkboxIds,
            additionalProperties: false,
          },
        },
      },
    },
  };
}

// ── 유틸리티 ──

function sanitizeTranscript(text: string): string {
  return text
    .replace(/---USER---|---SYSTEM---|---ASSISTANT---/gi, "[FILTERED]")
    .replace(/ignore\s+(all\s+)?previous\s+instructions/gi, "[FILTERED]")
    .replace(/you\s+are\s+now\s+a/gi, "[FILTERED]")
    .replace(
      /forget\s+(all\s+)?your\s+(previous\s+)?instructions/gi,
      "[FILTERED]",
    )
    .slice(0, 10_000);
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  label: string = "",
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.error(
          `[${label}] 재시도 ${attempt + 1}/${maxRetries}, ${delay}ms 후...`,
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw new Error(
    `${label} ${maxRetries + 1}회 시도 후 실패: ${lastError?.message}`,
  );
}

function detectSkipped(
  transcript: string | null,
  durationSec: number | null,
): boolean {
  if (!durationSec || durationSec < 5) return true;
  if (!transcript || transcript.trim().length === 0) return true;
  const meaningfulWords = (transcript || "")
    .replace(
      /\b(um|uh|hmm|ah|oh|like|you know|I mean|well|so|okay)\b/gi,
      "",
    )
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1);
  if (meaningfulWords.length < 3) return true;
  return false;
}

function substituteVariables(
  template: string,
  variables: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

// ── GPT Chat Completions API 호출 ──

async function callGptDiagnose(
  systemPrompt: string,
  userPrompt: string,
  responseFormat: Record<string, unknown>,
  model: string,
): Promise<{ result: DiagnoseResult; tokensUsed: number }> {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 8000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: responseFormat,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Chat Completions API 실패 (${resp.status}): ${errText}`);
  }

  const json = await resp.json();
  const content = json.choices?.[0]?.message?.content || "{}";
  const tokensUsed = json.usage?.total_tokens || 0;

  return { result: JSON.parse(content) as DiagnoseResult, tokensUsed };
}

// ── consult fire-and-forget ──

function fireAndForgetConsult(
  sessionId: string,
  questionNumber: number,
): void {
  fetch(`${SUPABASE_URL}/functions/v1/mock-test-consult`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      session_id: sessionId,
      question_number: questionNumber,
    }),
  }).catch((err) => {
    console.error(
      `[eval] consult 호출 실패 (Q${questionNumber}):`,
      err?.message || err,
    );
  });
}

// ── 메인 핸들러 ──

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body = await req.json();
    const {
      session_id,
      question_number,
      model = "gpt-4.1",
    } = body as {
      session_id: string;
      question_number: number;
      model?: string;
    };

    if (!session_id || !question_number) {
      return new Response(
        JSON.stringify({ error: "session_id, question_number 필수" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      `[eval] 시작: session=${session_id}, Q${question_number}`,
    );

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── 1. DB 병렬 로드 ──

    const [sessionRes, answerRes, promptsRes] = await Promise.all([
      supabase
        .from("mock_test_sessions")
        .select("user_id, mode")
        .eq("session_id", session_id)
        .single(),
      supabase
        .from("mock_test_answers")
        .select(
          "question_id, transcript, audio_duration, word_count, wpm, filler_ratio, pronunciation_assessment",
        )
        .eq("session_id", session_id)
        .eq("question_number", question_number)
        .single(),
      supabase
        .from("evaluation_prompts")
        .select("key, prompt_text")
        .in("key", ["diagnose", "diagnose_user"]),
    ]);

    if (sessionRes.error || !sessionRes.data) {
      throw new Error(`세션 조회 실패: ${sessionRes.error?.message}`);
    }
    if (answerRes.error || !answerRes.data) {
      throw new Error(
        `답변 조회 실패 (Q${question_number}): ${answerRes.error?.message}`,
      );
    }
    if (promptsRes.error || !promptsRes.data || promptsRes.data.length < 2) {
      throw new Error(
        `프롬프트 로드 실패: ${promptsRes.error?.message || "2행 미만"}`,
      );
    }

    const session = sessionRes.data;
    const answer = answerRes.data;
    const promptMap: Record<string, string> = {};
    for (const row of promptsRes.data) {
      promptMap[row.key] = row.prompt_text;
    }

    // ── 2. 질문 메타 조회 ──

    const { data: qMeta } = await supabase
      .from("questions")
      .select("question_type_eng")
      .eq("id", answer.question_id)
      .single();

    const questionType = qMeta?.question_type_eng || "description";

    // 목표 등급: 사용자 프로필(user_metadata)에서 직접 조회 (SSOT)
    const { data: authUser } = await supabase.auth.admin.getUserById(session.user_id);
    const target_grade = (authUser?.user?.user_metadata?.target_grade as string) || "IH";

    // ── 3. 체크박스 세트 조회 ──

    const { ids: checkboxIds, type: checkboxType } =
      getCheckboxIdsForQuestionType(questionType);
    const checkboxDefinitionsText = buildCheckboxDefinitionsText(checkboxIds);

    // ── 4. 무응답 감지 ──

    const transcript = answer.transcript || "";

    if (detectSkipped(transcript, answer.audio_duration)) {
      console.log(`[eval] Q${question_number}: 무응답 감지 (스킵)`);

      const skippedCheckboxes: Record<
        string,
        { pass: boolean; evidence: string }
      > = {};
      for (const id of checkboxIds) {
        skippedCheckboxes[id] = {
          pass: false,
          evidence: "무응답 — 평가 불가",
        };
      }

      await supabase.from("mock_test_evaluations").upsert(
        {
          session_id,
          user_id: session.user_id,
          question_number,
          question_id: answer.question_id,
          question_type: questionType,
          target_grade: target_grade,
          checkboxes: skippedCheckboxes,
          checkbox_type: checkboxType,
          pass_count: 0,
          fail_count: checkboxIds.length,
          pass_rate: 0,
          model: "rule_based",
          tokens_used: 0,
          processing_time_ms: Date.now() - startTime,
          skipped_by_preprocess: true,
          evaluated_at: new Date().toISOString(),
        },
        { onConflict: "session_id,question_number" },
      );

      // 무응답이어도 consult 호출 (consult에서도 skipped 처리)
      fireAndForgetConsult(session_id, question_number);

      return new Response(
        JSON.stringify({
          status: "skipped",
          session_id,
          question_number,
          checkbox_type: checkboxType,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── 5. 변수 치환 ──

    const pron = (answer.pronunciation_assessment || {}) as Record<
      string,
      unknown
    >;
    const pronScore =
      (pron.PronScore as number) ||
      (pron.pronunciation_score as number) ||
      0;
    const fluencyScore =
      (pron.FluencyScore as number) ||
      (pron.fluency_score as number) ||
      0;
    const wordCount =
      answer.word_count ||
      transcript
        .split(/\s+/)
        .filter((w: string) => w.length > 0).length;

    const userPrompt = substituteVariables(promptMap["diagnose_user"], {
      checkbox_type: checkboxType,
      checkbox_definitions: checkboxDefinitionsText,
      transcript: sanitizeTranscript(transcript),
      duration: String(Math.round(answer.audio_duration || 0)),
      word_count: String(wordCount),
      wpm: String(answer.wpm || 0),
      pronunciation_score: String(pronScore),
      fluency_score: String(fluencyScore),
    });

    // ── 6. GPT-4.1 호출 ──

    const responseFormat = buildCheckboxSchema(checkboxIds);

    const { result, tokensUsed } = await withRetry(
      () =>
        callGptDiagnose(
          promptMap["diagnose"],
          userPrompt,
          responseFormat,
          model,
        ),
      2,
      `eval Q${question_number}`,
    );

    // 체크박스 검증
    const { validated, passCount, failCount, passRate } = validateCheckboxes(
      result.checkboxes as unknown as Record<string, CheckboxResult>,
      questionType,
    );

    const processingTimeMs = Date.now() - startTime;

    console.log(
      `[eval] Q${question_number} (${questionType}/${checkboxType}): ` +
        `CB=${passCount}/${checkboxIds.length} (${(passRate * 100).toFixed(0)}%), ` +
        `${tokensUsed} tokens, ${processingTimeMs}ms`,
    );

    // ── 7. DB 저장 ──

    const { error: upsertError } = await supabase
      .from("mock_test_evaluations")
      .upsert(
        {
          session_id,
          user_id: session.user_id,
          question_number,
          question_id: answer.question_id,
          question_type: questionType,
          target_grade: target_grade,
          checkboxes: validated,
          checkbox_type: checkboxType,
          pass_count: passCount,
          fail_count: failCount,
          pass_rate: passRate,
          model,
          tokens_used: tokensUsed,
          processing_time_ms: processingTimeMs,
          skipped_by_preprocess: false,
          evaluated_at: new Date().toISOString(),
        },
        { onConflict: "session_id,question_number" },
      );

    if (upsertError) {
      console.error(
        `[eval] Q${question_number} DB 저장 실패:`,
        upsertError.message,
      );
    }

    // ── 8. consult fire-and-forget 체인 ──

    fireAndForgetConsult(session_id, question_number);

    // ── 9. 응답 ──

    return new Response(
      JSON.stringify({
        status: "completed",
        session_id,
        question_number,
        question_type: questionType,
        checkbox_type: checkboxType,
        checkbox_pass_rate: passRate,
        checkbox_summary: `${passCount}/${checkboxIds.length}`,
        tokens_used: tokensUsed,
        processing_time_ms: processingTimeMs,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[eval] 오류:", message);
    return new Response(
      JSON.stringify({
        error: message,
        processing_time_ms: Date.now() - startTime,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
