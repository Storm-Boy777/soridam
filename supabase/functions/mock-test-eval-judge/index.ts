// mock-test-eval-judge — Stage B-1 Edge Function (v3)
// GPT-4.1-mini: 체크박스 74개 + 과제충족 체크리스트(🔴/🟡) + feedback_branch
// mock-test-process에서 fire-and-forget으로 호출됨
// 완료 후 mock-test-eval-coach로 fire-and-forget 체인

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getCheckboxType,
  getJudgePromptKey,
  buildTaskChecklistText,
  buildTaskChecklistTextFromConfig,
  TYPE_CHECKLISTS,
} from "../_shared/question-type-map.ts";
import {
  getCheckboxIdsForQuestionType,
  buildCheckboxDefinitionsText,
  validateCheckboxes,
  type CheckboxResult,
} from "../_shared/checkbox-definitions.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// GPT-4.1-mini 호출 (JSON 모드)
async function callGptJudge(
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
    throw new Error(`GPT judge 실패 (${resp.status}): ${err}`);
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

// eval_status 업데이트 헬퍼
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
  // 프롬프트 인젝션 패턴 무력화: 시스템 지시 탈출 시도 차단
  return text
    .replace(/---USER---|---SYSTEM---|---ASSISTANT---/gi, "[FILTERED]")
    .replace(/ignore\s+(all\s+)?previous\s+instructions/gi, "[FILTERED]")
    .replace(/you\s+are\s+now\s+a/gi, "[FILTERED]")
    .replace(/forget\s+(all\s+)?your\s+(previous\s+)?instructions/gi, "[FILTERED]")
    .slice(0, 10000); // 최대 10K 문자
}

// B-1 → B-2 fire-and-forget
function fireAndForgetCoach(payload: Record<string, unknown>) {
  fetch(`${SUPABASE_URL}/functions/v1/mock-test-eval-coach`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify(payload),
  }).catch((err) => {
    console.error("fire-and-forget eval-coach 호출 실패:", err?.message || err);
  });
}

// feedback_branch 결정: GPT의 task_fulfillment.status를 그대로 사용
function determineFeedbackBranch(
  taskFulfillment: Record<string, unknown>,
): "fulfilled" | "partial" | "failed" {
  const status = taskFulfillment.status as string;
  if (status === "failed") return "failed";
  if (status === "partial") return "partial";
  return "fulfilled";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // 인증: --no-verify-jwt 배포 — process EF에서 service_role_key로 호출
  const startTime = Date.now();

  try {
    const {
      session_id,
      question_number,
      question_id,
      question_type: questionTypeFromProcess,
      transcript,
      word_count,
      wpm,
      filler_word_count,
      long_pause_count,
      audio_duration,
      pronunciation_assessment,
    } = await req.json();

    if (!session_id || !question_number || !transcript) {
      return new Response(
        JSON.stringify({ error: "필수 파라미터 누락" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── 평가 설정 + 체크리스트 DB 조회 (1회) ──
    const [{ data: evalConfig }, { data: dbChecklists }] = await Promise.all([
      supabase.from("mock_test_eval_settings").select("*").eq("id", 1).single(),
      supabase.from("task_fulfillment_checklists").select("*"),
    ]);

    // DB 체크리스트 → TYPE_CHECKLISTS 형태로 변환
    const checklistMap: Record<string, typeof TYPE_CHECKLISTS[string]> = {};
    if (dbChecklists?.length) {
      for (const row of dbChecklists) {
        checklistMap[row.question_type] = {
          questionType: row.question_type,
          label: row.label,
          required: row.required || [],
          advanced: row.advanced || [],
          idealFlow: row.ideal_flow || "",
          commonMistakes: row.common_mistakes || [],
          corePrescription: row.core_prescription || "",
          feedbackTone: row.feedback_tone || "",
          startTemplate: row.start_template || "",
        };
      }
    }
    // DB가 비어있으면 기존 하드코딩 사용
    const activeChecklists = Object.keys(checklistMap).length > 0 ? checklistMap : TYPE_CHECKLISTS;

    // eval_status → evaluating
    await updateAnswerStatus(supabase, session_id, question_number, "evaluating");

    // ── 세션 + 질문 정보 조회 ──
    const { data: session } = await supabase
      .from("mock_test_sessions")
      .select("user_id, question_ids")
      .eq("session_id", session_id)
      .single();

    if (!session) throw new Error("세션을 찾을 수 없습니다");

    // question_type 확인 (process에서 전달받거나 DB 조회)
    let questionType = questionTypeFromProcess || "";
    let questionEnglish = "";
    if (question_id) {
      const { data: question } = await supabase
        .from("questions")
        .select("question_type_eng, question_english, topic, category")
        .eq("id", question_id)
        .single();
      if (question) {
        questionType = question.question_type_eng || questionType;
        questionEnglish = question.question_english || "";
      }
    }

    // 사용자 프로필 (target_level)
    const { data: userProfile } = await supabase.auth.admin.getUserById(session.user_id);
    const targetLevel = userProfile?.user?.user_metadata?.target_grade || "IM2";

    const checkboxType = getCheckboxType(questionType);

    // ── 프롬프트 조회 ──
    const promptKey = getJudgePromptKey(questionType);
    const { data: promptRow } = await supabase
      .from("evaluation_prompts")
      .select("content")
      .eq("key", promptKey)
      .eq("is_active", true)
      .single();

    if (!promptRow || promptRow.content === "{{PLACEHOLDER}}") {
      // 프롬프트 미설정: v2 폴백 → 기존 eval EF로 처리하거나 스킵
      await updateAnswerStatus(supabase, session_id, question_number, "completed");

      await supabase.from("mock_test_evaluations").insert({
        session_id,
        user_id: session.user_id,
        question_number,
        question_id,
        question_type: questionType,
        checkbox_type: checkboxType,
        model: "no_prompt",
        prompt_version: "v3.0-judge",
        skipped: true,
        feedback_branch: "failed",
        task_fulfillment: { status: "failed", reason: `프롬프트 미설정: ${promptKey}` },
      });

      return new Response(
        JSON.stringify({ status: "no_prompt", message: `프롬프트 미설정: ${promptKey}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 변수 치환 ──
    const pronScore = pronunciation_assessment?.accuracy_score?.toFixed(1) || "N/A";
    const prosodyScore = pronunciation_assessment?.prosody_score?.toFixed(1) || "N/A";
    const fluencyScore = pronunciation_assessment?.fluency_score?.toFixed(1) || "N/A";

    // 체크박스 정의 + 과제충족 체크리스트 텍스트 생성 (프롬프트 동적 주입)
    const { ids: checkboxIds } = getCheckboxIdsForQuestionType(questionType);
    const checkboxDefinitionsText = buildCheckboxDefinitionsText(checkboxIds);
    // DB 체크리스트 우선, 없으면 하드코딩 폴백
    const typeConfig = activeChecklists[questionType] || TYPE_CHECKLISTS[questionType];
    // DB 데이터로 체크리스트 텍스트 빌드
    const taskChecklistText = typeConfig
      ? buildTaskChecklistTextFromConfig(typeConfig, targetLevel)
      : buildTaskChecklistText(questionType, targetLevel);

    const safeTranscript = sanitizeUserInput(transcript);
    const variables: Record<string, string | number> = {
      transcript: safeTranscript,
      question_english: questionEnglish,
      question_id: question_id || "",
      question_number,
      target_level: targetLevel,
      word_count: word_count || 0,
      wpm: wpm || 0,
      filler_word_count: filler_word_count || 0,
      long_pause_count: long_pause_count || 0,
      audio_duration: audio_duration || 0,
      accuracy_score: pronScore,
      prosody_score: prosodyScore,
      fluency_score: fluencyScore,
      checkbox_type: checkboxType,
      question_type: questionType,
      checkbox_count: checkboxIds.length,
      checkbox_definitions: checkboxDefinitionsText,
      task_checklist: taskChecklistText,
      type_label: typeConfig?.label || "",
      ideal_flow: typeConfig?.idealFlow || "",
    };

    const fullPrompt = substituteVariables(promptRow.content, variables);

    // 시스템/유저 분리
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

    // ── GPT 판정 호출 (DB 설정 오버라이드) ──
    const judgeModel = evalConfig?.judge_model || "gpt-4.1-mini";
    const judgeTemp = evalConfig?.judge_temperature != null ? Number(evalConfig.judge_temperature) : 0.2;
    const judgeTokens = evalConfig?.judge_max_tokens || 6000;
    const { result: gptResult, tokensUsed, finishReason } = await withRetry(
      () => callGptJudge(systemPrompt, userPrompt, judgeModel, judgeTemp, judgeTokens),
      2,
      "GPT judge 평가",
    );

    // truncation 감지
    if (finishReason === "length") {
      console.warn(`[eval-judge] truncation 감지: session=${session_id}, q=${question_number}`);
      // 재시도 (더 높은 max_tokens)
      const retry = await callGptJudge(systemPrompt, userPrompt, judgeModel, judgeTemp + 0.1, judgeTokens + 2000);
      if (retry.finishReason !== "length") {
        Object.assign(gptResult, retry.result);
      }
    }

    // ── 결과 파싱 ──
    const evaluation = (gptResult.evaluation || gptResult) as Record<string, unknown>;

    // GPT 체크박스 출력은 기대 ID 집합 기준으로 fail-closed 정규화한다.
    const rawCheckboxes = (evaluation.checkboxes || {}) as Record<string, unknown>;
    const normalizedCheckboxes = Object.fromEntries(
      Object.entries(rawCheckboxes).flatMap(([id, value]) => {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          return [];
        }

        const rawCheckbox = value as Record<string, unknown>;
        const checkbox: CheckboxResult = {
          pass: rawCheckbox.pass === true,
        };

        if (typeof rawCheckbox.evidence === "string" && rawCheckbox.evidence.trim()) {
          checkbox.evidence = rawCheckbox.evidence.trim();
        }

        return [[id, checkbox]];
      }),
    ) as Record<string, CheckboxResult>;

    const { validated: checkboxes, passCount, failCount, passRate } = validateCheckboxes(
      normalizedCheckboxes,
      questionType,
    );
    const checkboxCount = Object.keys(checkboxes).length;

    // 과제충족 (v3)
    const taskFulfillment = (evaluation.task_fulfillment || {
      status: "failed",
      checklist: { required: [], advanced: [] },
      completion_rate: 0,
      reason: "GPT 응답에 task_fulfillment 없음",
    }) as Record<string, unknown>;

    // feedback_branch 결정 (GPT task_fulfillment 기반)
    const feedbackBranch = determineFeedbackBranch(taskFulfillment);

    const processingTime = Date.now() - startTime;

    // ── evaluations INSERT (B-1 결과) ──
    await supabase.from("mock_test_evaluations").insert({
      session_id,
      user_id: session.user_id,
      question_number,
      question_id,
      question_type: questionType,
      checkbox_type: checkboxType,
      checkbox_count: checkboxCount,
      checkboxes,
      pass_count: passCount,
      fail_count: failCount,
      pass_rate: passRate,
      transcript,
      wpm: wpm || 0,
      audio_duration: audio_duration || 0,
      filler_count: filler_word_count || 0,
      long_pause_count: long_pause_count || 0,
      pronunciation_assessment,
      // v3 필드
      task_fulfillment: taskFulfillment,
      feedback_branch: feedbackBranch,
      judge_model: judgeModel,
      judge_tokens_used: tokensUsed,
      model: judgeModel,
      prompt_version: "v3.0-judge",
      tokens_used: tokensUsed,
      processing_time_ms: processingTime,
      skipped: false,
    });

    // eval_status → judge_completed
    await updateAnswerStatus(supabase, session_id, question_number, "judge_completed");

    // ── fire-and-forget → Stage B-2 (eval-coach) ──
    fireAndForgetCoach({
      session_id,
      question_number,
      question_id,
      question_type: questionType,
      transcript,
      word_count,
      wpm,
      filler_word_count,
      long_pause_count,
      audio_duration,
      pronunciation_assessment,
      target_level: targetLevel,
      question_english: questionEnglish,
      // B-1 판정 결과 전달
      checkboxes_summary: {
        checkbox_type: checkboxType,
        pass_count: passCount,
        fail_count: failCount,
        pass_rate: passRate,
      },
      task_fulfillment: taskFulfillment,
      feedback_branch: feedbackBranch,
    });

    return new Response(
      JSON.stringify({
        status: "judge_completed",
        question_number,
        checkbox_type: checkboxType,
        pass_count: passCount,
        fail_count: failCount,
        pass_rate: passRate,
        feedback_branch: feedbackBranch,
        task_fulfillment_status: taskFulfillment.status,
        tokens_used: tokensUsed,
        processing_time_ms: processingTime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("mock-test-eval-judge 에러:", errorMessage);

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
