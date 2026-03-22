/**
 * mock-test-consult — Stage B-2 Edge Function
 *
 * 역할: 1문항 1호출. transcript + criteria(DB)만으로 소견/방향/약점 생성.
 *       체크박스는 사용하지 않음 (diagnose가 별도 처리).
 *
 * 입력: { session_id, question_number, target_grade?, model? }
 * 처리: DB에서 프롬프트+기준표 로드 → 변수 치환 → GPT-4.1 호출 → DB 저장
 * API: OpenAI Chat Completions API + response_format (Structured Outputs)
 *
 * 프롬프트: evaluation_prompts (CO-STAR 구조)
 * 기준표: evaluation_criteria (60행 = 6등급 × 10유형, WP 체크 지침 포함)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "https://opictalkdoc.com,http://localhost:3001").split(",");

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0],
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── 유틸리티 ──

/** 프롬프트 인젝션 방어 */
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

/** 재시도 래퍼 (2회 재시도 + 지수 백오프) */
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

/** 3축 무응답 감지 */
function detectSkipped(
  transcript: string | null,
  durationSec: number | null,
  wordCount: number | null,
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

/** 변수 치환 */
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

interface ConsultResult {
  fulfillment: string;
  fulfillment_summary: string;
  task_checklist: Array<{ item: string; pass: boolean; evidence: string }>;
  observation: string;
  directions: string[];
  weak_points: Array<{
    code: string;
    severity: string;
    reason: string;
    evidence: string;
  }>;
}

async function callGptConsult(
  systemPrompt: string,
  userPrompt: string,
  responseFormat: Record<string, unknown>,
  model: string,
): Promise<{ result: ConsultResult; tokensUsed: number }> {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 4000,
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

  return { result: JSON.parse(content) as ConsultResult, tokensUsed };
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
      target_grade,
      model = "gpt-4.1",
    } = body as {
      session_id: string;
      question_number: number;
      target_grade?: string;
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
      `[consult] 시작: session=${session_id}, Q${question_number}`,
    );

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── 1. DB 병렬 로드 ──

    const [sessionRes, answerRes, promptsRes] = await Promise.all([
      // 세션 정보
      supabase
        .from("mock_test_sessions")
        .select("user_id, mode")
        .eq("session_id", session_id)
        .single(),
      // 해당 문항 답변
      supabase
        .from("mock_test_answers")
        .select(
          "question_id, transcript, audio_duration, word_count, wpm, filler_ratio, pronunciation_assessment",
        )
        .eq("session_id", session_id)
        .eq("question_number", question_number)
        .single(),
      // 프롬프트 3행
      supabase
        .from("evaluation_prompts")
        .select("key, prompt_text")
        .in("key", ["consult", "consult_user", "consult_schema"]),
    ]);

    if (sessionRes.error || !sessionRes.data) {
      throw new Error(`세션 조회 실패: ${sessionRes.error?.message}`);
    }
    if (answerRes.error || !answerRes.data) {
      throw new Error(
        `답변 조회 실패 (Q${question_number}): ${answerRes.error?.message}`,
      );
    }
    if (promptsRes.error || !promptsRes.data || promptsRes.data.length < 3) {
      throw new Error(
        `프롬프트 로드 실패: ${promptsRes.error?.message || "3행 미만"}`,
      );
    }

    const session = sessionRes.data;
    const answer = answerRes.data;
    const promptMap: Record<string, string> = {};
    for (const row of promptsRes.data) {
      promptMap[row.key] = row.prompt_text;
    }

    // 질문 메타 + 기준표 (question_type 필요하므로 순차)
    const { data: qMeta } = await supabase
      .from("questions")
      .select("question_english, question_type_eng")
      .eq("id", answer.question_id)
      .single();

    const questionType = qMeta?.question_type_eng || "";

    // 빈 question_type 방어 (SLF, SPK 등 평가 대상 아닌 문항)
    if (!questionType) {
      console.log(`[consult] Q${question_number}: question_type 빈 문자열 — 평가 스킵`);
      return new Response(
        JSON.stringify({ status: "skipped", reason: "question_type 빈 문자열", session_id, question_number }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 목표 등급 결정
    const effectiveTargetGrade = target_grade || "IH";

    // 기준표 로드
    const { data: criteriaRow, error: criteriaErr } = await supabase
      .from("evaluation_criteria")
      .select("criteria_text")
      .eq("target_level", effectiveTargetGrade)
      .eq("question_type", questionType)
      .single();

    if (criteriaErr || !criteriaRow) {
      throw new Error(
        `기준표 로드 실패 (${effectiveTargetGrade}+${questionType}): ${criteriaErr?.message}`,
      );
    }

    // ── 2. 무응답 감지 ──

    const transcript = answer.transcript || "";
    const wordCount =
      answer.word_count ||
      transcript
        .split(/\s+/)
        .filter((w: string) => w.length > 0).length;

    if (detectSkipped(transcript, answer.audio_duration, wordCount)) {
      // 무응답: GPT 호출 없이 rule-based 결과
      console.log(`[consult] Q${question_number}: 무응답 감지 (스킵)`);

      const skippedResult = {
        fulfillment: "skipped",
        task_checklist: [] as Array<{
          item: string;
          pass: boolean;
          evidence: string;
        }>,
        observation:
          "응답이 감지되지 않았거나 의미 있는 발화가 충분하지 않았습니다.",
        directions: [] as string[],
        weak_points: [
          {
            code: "WP_T01",
            severity: "severe",
            reason: "질문 핵심 요구 미수행 — 발화 부족 또는 무응답",
            evidence: transcript
              ? `발화: "${transcript.slice(0, 100)}..."`
              : "transcript 없음",
          },
        ],
      };

      await supabase.from("mock_test_consults").upsert(
        {
          session_id,
          user_id: session.user_id,
          question_number,
          question_id: answer.question_id,
          question_type: questionType,
          target_grade: effectiveTargetGrade,
          fulfillment: skippedResult.fulfillment,
          task_checklist: skippedResult.task_checklist,
          observation: skippedResult.observation,
          directions: skippedResult.directions,
          weak_points: skippedResult.weak_points,
          model: "rule_based",
          tokens_used: 0,
          processing_time_ms: Date.now() - startTime,
          skipped_by_preprocess: true,
          evaluated_at: new Date().toISOString(),
        },
        { onConflict: "session_id,question_number" },
      );

      return new Response(
        JSON.stringify({
          status: "skipped",
          session_id,
          question_number,
          fulfillment: "skipped",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── 3. 변수 치환 ──

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
    const userPrompt = substituteVariables(promptMap["consult_user"], {
      target_level: effectiveTargetGrade,
      question_type: questionType,
      question_text: qMeta?.question_english || answer.question_id,
      criteria: criteriaRow.criteria_text,
      transcript: sanitizeTranscript(transcript),
      duration: String(Math.round(answer.audio_duration || 0)),
      word_count: String(wordCount),
      wpm: String(answer.wpm || 0),
      pronunciation_score: String(pronScore),
      fluency_score: String(fluencyScore),
    });

    // ── 4. GPT-4.1 호출 ──

    const responseFormat = JSON.parse(promptMap["consult_schema"]);

    const { result, tokensUsed } = await withRetry(
      () =>
        callGptConsult(
          promptMap["consult"],
          userPrompt,
          responseFormat,
          model,
        ),
      2,
      `consult Q${question_number}`,
    );

    const processingTimeMs = Date.now() - startTime;

    console.log(
      `[consult] Q${question_number} (${questionType}): ` +
        `${result.fulfillment}, WP=${result.weak_points.length}, ` +
        `${tokensUsed} tokens, ${processingTimeMs}ms`,
    );

    // ── 5. DB 저장 (consults 전용 테이블에 UPSERT) ──

    const { error: upsertError } = await supabase
      .from("mock_test_consults")
      .upsert(
        {
          session_id,
          user_id: session.user_id,
          question_number,
          question_id: answer.question_id,
          question_type: questionType,
          target_grade: effectiveTargetGrade,
          fulfillment: result.fulfillment,
          task_checklist: result.task_checklist,
          observation: result.observation,
          directions: result.directions,
          weak_points: result.weak_points,
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
        `[consult] Q${question_number} DB 저장 실패:`,
        upsertError.message,
      );
    }

    // ── 6. eval_status 업데이트 + 전체 완료 확인 → report 체인 ──
    // V1 패턴: 각 답변의 eval_status로 개별 추적 → 미완료 0개일 때만 report 호출

    // consult 완료 → 해당 답변의 eval_status를 "completed"로 업데이트
    await supabase
      .from("mock_test_answers")
      .update({ eval_status: "completed" })
      .eq("session_id", session_id)
      .eq("question_number", question_number);

    // 세션 상태 확인
    const { data: sessionData } = await supabase
      .from("mock_test_sessions")
      .select("status")
      .eq("session_id", session_id)
      .single();

    if (sessionData?.status === "completed") {
      // 미완료 답변이 있는지 확인 (completed/skipped/failed 제외)
      const { data: pendingAnswers } = await supabase
        .from("mock_test_answers")
        .select("question_number, eval_status")
        .eq("session_id", session_id)
        .gte("question_number", 2)
        .not("eval_status", "in", '("completed","skipped","failed")');

      if (!pendingAnswers || pendingAnswers.length === 0) {
        // 세션 completed + 모든 답변 평가 완료 → report fire-and-forget
        console.log(
          `[consult] 전체 완료 → report 체인`,
        );
        fetch(`${SUPABASE_URL}/functions/v1/mock-test-report`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ session_id }),
        }).catch((err) => {
          console.error("[consult] report 호출 실패:", err?.message || err);
        });
      } else {
        console.log(
          `[consult] 진행 중: ${pendingAnswers.length}개 미완료`,
        );
      }
    }

    // ── 7. 응답 ──

    return new Response(
      JSON.stringify({
        status: "completed",
        session_id,
        question_number,
        question_type: questionType,
        target_grade: effectiveTargetGrade,
        fulfillment: result.fulfillment,
        weak_point_count: result.weak_points.length,
        tokens_used: tokensUsed,
        processing_time_ms: processingTimeMs,
        all_consulted: allConsulted,
        progress: `${consultedCount}/${totalTargetCount}`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[consult] 오류:", message);
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
