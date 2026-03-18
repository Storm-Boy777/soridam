// mock-test-eval-coach — Stage B-2 Edge Function
// GPT-4.1: 코칭 6-Layer + priority_prescription
// mock-test-eval-judge에서 fire-and-forget으로 호출됨
// 완료 후 mock-test-report로 fire-and-forget 체인 (세션 완료 조건 충족 시)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getCoachPromptKey,
  buildRescueMessage,
  TYPE_CHECKLISTS,
} from "../_shared/question-type-map.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// GPT-4.1 코칭 호출
async function callGptCoach(
  systemPrompt: string,
  userPrompt: string,
  model: string,
  temperature: number,
  maxTokens: number,
): Promise<{ result: Record<string, unknown>; tokensUsed: number; finishReason: string }> {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`GPT coach 실패 (${resp.status}): ${err}`);
  }

  const json = await resp.json();
  const content = json.choices?.[0]?.message?.content || "{}";
  const tokensUsed = json.usage?.total_tokens || 0;
  const finishReason = json.choices?.[0]?.finish_reason || "unknown";

  return { result: JSON.parse(content), tokensUsed, finishReason };
}

// 재시도 로직
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  label: string = "",
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw new Error(`${label} ${maxRetries}회 재시도 후 실패: ${lastError?.message}`);
}

// eval_status 업데이트
async function updateAnswerStatus(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  questionNumber: number,
  status: string,
  extra: Record<string, unknown> = {},
) {
  await supabase
    .from("mock_test_answers")
    .update({ eval_status: status, ...extra })
    .eq("session_id", sessionId)
    .eq("question_number", questionNumber);
}

// 프롬프트 변수 치환
function substituteVariables(
  template: string,
  variables: Record<string, string | number>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
  }
  return result;
}

// 사용자 입력 새니타이징 (프롬프트 인젝션 방어)
function sanitizeUserInput(text: string): string {
  return text
    .replace(/---USER---|---SYSTEM---|---ASSISTANT---/gi, "[FILTERED]")
    .replace(/ignore\s+(all\s+)?previous\s+instructions/gi, "[FILTERED]")
    .replace(/you\s+are\s+now\s+a/gi, "[FILTERED]")
    .replace(/forget\s+(all\s+)?your\s+(previous\s+)?instructions/gi, "[FILTERED]")
    .slice(0, 10000);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // 인증: --no-verify-jwt 배포 — judge EF에서 service_role_key로 호출
  const startTime = Date.now();

  try {
    const {
      session_id,
      question_number,
      question_id,
      question_type,
      transcript,
      word_count,
      wpm,
      filler_word_count,
      long_pause_count,
      audio_duration,
      pronunciation_assessment,
      target_level,
      question_english,
      // B-1 판정 결과
      checkboxes_summary,
      task_fulfillment,
      feedback_branch,
    } = await req.json();

    if (!session_id || !question_number) {
      return new Response(
        JSON.stringify({ error: "필수 파라미터 누락" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── 평가 설정 DB 조회 ──
    const { data: evalConfig } = await supabase
      .from("mock_test_eval_settings")
      .select("coach_model, coach_temperature, coach_max_tokens")
      .eq("id", 1)
      .single();

    // ── feedback_branch에 따른 분기 ──

    let coachingFeedback: Record<string, unknown>;
    let priorityPrescription: Array<Record<string, string>>;
    let coachModel = evalConfig?.coach_model || "gpt-4.1";
    let coachTokensUsed = 0;

    if (feedback_branch === "failed") {
      // ── 무응답: GPT 호출 스킵, 구제 메시지 룰 기반 ──
      const rescue = buildRescueMessage(question_type);
      coachingFeedback = rescue.coaching_feedback;
      priorityPrescription = rescue.priority_prescription;
      coachModel = "rule_based";
    } else {
      // ── fulfilled / partial: GPT-4.1 코칭 호출 ──
      const promptKey = getCoachPromptKey(feedback_branch);
      const { data: promptRow } = await supabase
        .from("evaluation_prompts")
        .select("content")
        .eq("key", promptKey)
        .eq("is_active", true)
        .single();

      if (!promptRow || promptRow.content === "{{PLACEHOLDER}}") {
        // 프롬프트 미설정: 기본 코칭
        coachingFeedback = { one_line_insight: "상세 코칭 프롬프트가 준비 중입니다." };
        priorityPrescription = [];
        coachModel = "no_prompt";
      } else {
        // 변수 치환
        const pronScore = pronunciation_assessment?.accuracy_score?.toFixed(1) || "N/A";
        const prosodyScore = pronunciation_assessment?.prosody_score?.toFixed(1) || "N/A";
        const fluencyScore = pronunciation_assessment?.fluency_score?.toFixed(1) || "N/A";
        const mispronunciations = pronunciation_assessment?.mispronunciations
          ?.map((m: { word: string; accuracyScore: number }) => `${m.word}(${m.accuracyScore})`)
          .join(", ") || "없음";

        const typeConfig = TYPE_CHECKLISTS[question_type];

        const safeTranscript = sanitizeUserInput(transcript || "");
        const variables: Record<string, string | number> = {
          transcript: safeTranscript,
          question_english: question_english || "",
          question_number,
          question_type: question_type || "",
          target_level: target_level || "IM2",
          word_count: word_count || 0,
          wpm: wpm || 0,
          filler_word_count: filler_word_count || 0,
          long_pause_count: long_pause_count || 0,
          audio_duration: audio_duration || 0,
          accuracy_score: pronScore,
          prosody_score: prosodyScore,
          fluency_score: fluencyScore,
          mispronunciations,
          // B-1 판정 결과 주입
          feedback_branch: feedback_branch || "fulfilled",
          task_fulfillment_status: (task_fulfillment?.status as string) || "unknown",
          task_fulfillment_reason: (task_fulfillment?.reason as string) || "",
          checkbox_pass_rate: checkboxes_summary?.pass_rate?.toFixed(2) || "0",
          checkbox_pass_count: checkboxes_summary?.pass_count || 0,
          checkbox_fail_count: checkboxes_summary?.fail_count || 0,
          // 타입 정보
          type_label: typeConfig?.label || "",
          ideal_flow: typeConfig?.idealFlow || "",
          core_prescription: typeConfig?.corePrescription || "",
          feedback_tone: typeConfig?.feedbackTone || "",
          start_template: typeConfig?.startTemplate || "",
        };

        const fullPrompt = substituteVariables(promptRow.content, variables);

        let systemPrompt: string;
        let userPrompt: string;
        const separatorIdx = fullPrompt.indexOf("\n---USER---\n");
        if (separatorIdx !== -1) {
          systemPrompt = fullPrompt.substring(0, separatorIdx).trim();
          userPrompt = fullPrompt.substring(separatorIdx + 12).trim();
        } else {
          systemPrompt = fullPrompt;
          userPrompt = `Student's response:\n${safeTranscript}`;
        }

        // GPT 코칭 호출 (DB 설정 오버라이드)
        const coachTemp = evalConfig?.coach_temperature != null ? Number(evalConfig.coach_temperature) : 0.4;
        const coachTokensMax = evalConfig?.coach_max_tokens || 8000;
        const { result: gptResult, tokensUsed, finishReason } = await withRetry(
          () => callGptCoach(systemPrompt, userPrompt, coachModel, coachTemp, coachTokensMax),
          2,
          "GPT coach 평가",
        );

        coachTokensUsed = tokensUsed;

        // truncation 감지 → 재시도
        if (finishReason === "length") {
          console.warn(`[eval-coach] truncation: session=${session_id}, q=${question_number}`);
          const retry = await callGptCoach(systemPrompt, userPrompt, coachModel, 0.5, 10000);
          if (retry.finishReason !== "length") {
            Object.assign(gptResult, retry.result);
            coachTokensUsed += retry.tokensUsed;
          }
        }

        const coaching = (gptResult.coaching || gptResult) as Record<string, unknown>;
        coachingFeedback = coaching;
        priorityPrescription = (gptResult.priority_prescription ||
          coaching.priority_prescription || []) as Array<Record<string, string>>;
      }
    }

    const processingTime = Date.now() - startTime;

    // ── evaluations UPDATE (B-2 코칭 결과 추가) ──
    await supabase
      .from("mock_test_evaluations")
      .update({
        coaching_feedback: coachingFeedback,
        priority_prescription: priorityPrescription,
        model: coachModel,
        tokens_used: coachTokensUsed,
        processing_time_ms: processingTime,
        prompt_version: "1.0-coach",
      })
      .eq("session_id", session_id)
      .eq("question_number", question_number);

    // ── answers 업데이트: completed ──
    await updateAnswerStatus(supabase, session_id, question_number, "completed");

    // ── Stage C 트리거 조건: 세션 completed + 모든 답변 평가 완료 ──
    const { data: sessionData } = await supabase
      .from("mock_test_sessions")
      .select("status")
      .eq("session_id", session_id)
      .single();

    if (sessionData?.status === "completed") {
      const { data: pendingAnswers } = await supabase
        .from("mock_test_answers")
        .select("question_number, eval_status")
        .eq("session_id", session_id)
        .not("eval_status", "in", '("completed","skipped","failed")');

      if (!pendingAnswers || pendingAnswers.length === 0) {
        // 세션 completed + 모든 답변 평가 완료 → Stage C fire-and-forget
        fetch(`${SUPABASE_URL}/functions/v1/mock-test-report`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ session_id }),
        }).catch((err) => {
          console.error("fire-and-forget mock-test-report 호출 실패:", err?.message || err);
        });
      }
    }

    return new Response(
      JSON.stringify({
        status: "completed",
        question_number,
        feedback_branch,
        coach_model: coachModel,
        tokens_used: coachTokensUsed,
        processing_time_ms: processingTime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("mock-test-eval-coach 에러:", errorMessage);

    try {
      const body = await req.clone().json().catch(() => null);
      if (body?.session_id && body?.question_number) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const { data: answer } = await supabase
          .from("mock_test_answers")
          .select("eval_retry_count")
          .eq("session_id", body.session_id)
          .eq("question_number", body.question_number)
          .single();

        const retryCount = (answer?.eval_retry_count || 0) + 1;

        if (retryCount >= 3) {
          await updateAnswerStatus(supabase, body.session_id, body.question_number, "failed", {
            eval_retry_count: retryCount,
            eval_error: errorMessage,
          });
        } else {
          await updateAnswerStatus(supabase, body.session_id, body.question_number, "pending", {
            eval_retry_count: retryCount,
            eval_error: errorMessage,
          });
        }
      }
    } catch {
      // 상태 업데이트 실패 무시
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
