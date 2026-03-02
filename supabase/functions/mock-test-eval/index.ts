// mock-test-eval — Stage B Edge Function
// GPT-4.1 체크박스 평가 (~100초)
// mock-test-process에서 fire-and-forget으로 호출됨
// question_type에 맞는 프롬프트로 체크박스 통과 여부 판정
// eval_only 모드 (교정 스크립트 없음 — F-12)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// question_type → 프롬프트 키 매핑 (F-15)
// experience_specific, experience_habitual, experience_past → eval_past_experience 공유
function getPromptKey(questionType: string): string {
  if (questionType.startsWith("experience_")) return "eval_past_experience";
  return `eval_${questionType}`;
}

// question_type → checkbox_type 매핑 (F-12)
function getCheckboxType(questionType: string): "INT" | "ADV" | "AL" {
  switch (questionType) {
    case "description":
    case "routine":
    case "asking_questions":
      return "INT";
    case "comparison":
    case "experience_specific":
    case "experience_habitual":
    case "experience_past":
    case "suggest_alternatives":
      return "ADV";
    case "comparison_change":
    case "social_issue":
      return "AL";
    default:
      return "ADV"; // 폴백
  }
}

// question_type → eval_settings 활성화 필드 매핑
function getEnabledField(questionType: string): string {
  if (questionType.startsWith("experience_")) return "enabled_past_experience";
  return `enabled_${questionType}`;
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

// GPT-4.1 체크박스 평가 호출
async function evaluateWithGPT(
  systemPrompt: string,
  userPrompt: string,
  model: string,
  temperature: number,
  maxTokens: number,
): Promise<{ result: Record<string, unknown>; tokensUsed: number }> {
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
    throw new Error(`GPT 평가 실패 (${resp.status}): ${err}`);
  }

  const json = await resp.json();
  const content = json.choices?.[0]?.message?.content || "{}";
  const tokensUsed = json.usage?.total_tokens || 0;

  return { result: JSON.parse(content), tokensUsed };
}

// 재시도 로직
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
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
  throw new Error(
    `${label} ${maxRetries}회 재시도 후 실패: ${lastError?.message}`,
  );
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

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const {
      session_id,
      question_number,
      question_id,
      transcript,
      word_count,
      wpm,
      filler_word_count,
      long_pause_count,
      audio_duration,
      pronunciation_assessment,
    } = await req.json();

    // 필수 파라미터 검증
    if (!session_id || !question_number || !transcript) {
      return new Response(
        JSON.stringify({ error: "필수 파라미터 누락" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // eval_status → evaluating
    await updateAnswerStatus(
      supabase,
      session_id,
      question_number,
      "evaluating",
    );

    // ── 세션 + 질문 정보 조회 ──
    const { data: session } = await supabase
      .from("mock_test_sessions")
      .select("user_id, question_ids")
      .eq("session_id", session_id)
      .single();

    if (!session) {
      throw new Error("세션을 찾을 수 없습니다");
    }

    // question_id로 질문 정보 조회 (question_type + topic 필요)
    const { data: question } = await supabase
      .from("questions")
      .select("question_type_eng, question_english, topic, category")
      .eq("id", question_id)
      .single();

    if (!question) {
      throw new Error(`질문을 찾을 수 없습니다: ${question_id}`);
    }

    const questionType = question.question_type_eng;
    const questionEnglish = question.question_english;

    // 사용자 프로필 조회 (nickname, target_level)
    const { data: userProfile } = await supabase.auth.admin.getUserById(
      session.user_id,
    );
    const nickname =
      userProfile?.user?.user_metadata?.nickname ||
      userProfile?.user?.user_metadata?.display_name ||
      "학습자";
    const targetLevel =
      userProfile?.user?.user_metadata?.target_grade || "IM2";

    // ── eval_settings 조회 ──
    const { data: evalSettings } = await supabase
      .from("mock_test_eval_settings")
      .select("*")
      .eq("id", 1)
      .single();

    const model = evalSettings?.model_name || "gpt-4.1";
    const temperature = Number(evalSettings?.temperature) || 0.3;
    const maxTokens = evalSettings?.max_tokens || 10000;

    // 해당 question_type 평가 비활성화 체크
    const enabledField = getEnabledField(questionType);
    if (evalSettings && evalSettings[enabledField] === false) {
      // 비활성화된 유형: skipped 처리
      await updateAnswerStatus(
        supabase,
        session_id,
        question_number,
        "completed",
      );

      await supabase.from("mock_test_evaluations").insert({
        session_id,
        user_id: session.user_id,
        question_number,
        question_id,
        question_type: questionType,
        model: "disabled",
        skipped: true,
      });

      return new Response(
        JSON.stringify({ status: "disabled", question_type: questionType }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 프롬프트 조회 ──
    const promptKey = getPromptKey(questionType);
    const { data: promptRow } = await supabase
      .from("evaluation_prompts")
      .select("content")
      .eq("key", promptKey)
      .eq("is_active", true)
      .single();

    if (!promptRow || promptRow.content === "{{PLACEHOLDER}}") {
      // 프롬프트 미설정: 평가 불가 → completed 처리 (Phase C에서 프롬프트 업데이트)
      await updateAnswerStatus(
        supabase,
        session_id,
        question_number,
        "completed",
      );

      await supabase.from("mock_test_evaluations").insert({
        session_id,
        user_id: session.user_id,
        question_number,
        question_id,
        question_type: questionType,
        model: "no_prompt",
        skipped: true,
      });

      return new Response(
        JSON.stringify({
          status: "no_prompt",
          message: `프롬프트 미설정: ${promptKey}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 변수 치환 ──
    const checkboxType = getCheckboxType(questionType);
    const pronScore =
      pronunciation_assessment?.accuracy_score?.toFixed(1) || "N/A";
    const prosodyScore =
      pronunciation_assessment?.prosody_score?.toFixed(1) || "N/A";
    const fluencyScore =
      pronunciation_assessment?.fluency_score?.toFixed(1) || "N/A";
    const mispronunciations = pronunciation_assessment?.mispronunciations
      ?.map(
        (m: { word: string; accuracyScore: number }) =>
          `${m.word}(${m.accuracyScore})`,
      )
      .join(", ") || "없음";

    const variables: Record<string, string | number> = {
      transcript,
      question_english: questionEnglish,
      question_id: question_id,
      question_number: question_number,
      topic_category: question.topic || "",
      category: question.category || "",
      nickname,
      target_level: targetLevel,
      word_count: word_count || 0,
      wpm: wpm || 0,
      filler_word_count: filler_word_count || 0,
      filler_words: `${filler_word_count || 0}개`,
      long_pause_count: long_pause_count || 0,
      audio_duration: audio_duration || 0,
      accuracy_score: pronScore,
      prosody_score: prosodyScore,
      fluency_score: fluencyScore,
      mispronunciations,
      checkbox_type: checkboxType,
      question_type: questionType,
    };

    // 시스템 프롬프트 + 유저 프롬프트 분리
    // evaluation_prompts.content에 전체 프롬프트가 들어있고, 변수를 치환
    const fullPrompt = substituteVariables(promptRow.content, variables);

    // 시스템/유저 분리 (소리담 패턴: --- 구분자 또는 전체를 시스템으로 사용)
    let systemPrompt: string;
    let userPrompt: string;

    const separatorIdx = fullPrompt.indexOf("\n---USER---\n");
    if (separatorIdx !== -1) {
      systemPrompt = fullPrompt.substring(0, separatorIdx).trim();
      userPrompt = fullPrompt.substring(separatorIdx + 12).trim();
    } else {
      // 구분자 없으면: 전체를 시스템, transcript를 유저로
      systemPrompt = fullPrompt;
      userPrompt = `Student's response:\n${transcript}`;
    }

    // ── GPT-4.1 평가 호출 ──
    const { result: gptResult, tokensUsed } = await withRetry(
      () => evaluateWithGPT(systemPrompt, userPrompt, model, temperature, maxTokens),
      evalSettings?.retry_count || 2,
      "GPT 체크박스 평가",
    );

    // ── 결과 파싱 ──
    // GPT 응답 구조: { checkboxes: { ID: { pass: bool, evidence: string } }, ... }
    const checkboxes = gptResult.checkboxes || {};
    const checkboxEntries = Object.entries(checkboxes);
    const checkboxCount = checkboxEntries.length;
    const passCount = checkboxEntries.filter(
      ([, v]) => (v as Record<string, unknown>)?.pass === true,
    ).length;
    const failCount = checkboxCount - passCount;
    const passRate = checkboxCount > 0 ? passCount / checkboxCount : 0;

    // 문장별 분석 (있으면)
    const sentences = gptResult.sentences || null;
    const corrections = gptResult.corrections || null;
    const deepAnalysis = gptResult.deep_analysis || null;

    const processingTime = Date.now() - startTime;

    // ── evaluations INSERT ──
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
      sentences,
      corrections,
      deep_analysis: deepAnalysis,
      transcript,
      wpm: wpm || 0,
      audio_duration: audio_duration || 0,
      filler_count: filler_word_count || 0,
      long_pause_count: long_pause_count || 0,
      pronunciation_assessment,
      model,
      prompt_version: "v1.0",
      tokens_used: tokensUsed,
      processing_time_ms: processingTime,
      skipped: false,
    });

    // ── answers 업데이트: completed ──
    await updateAnswerStatus(
      supabase,
      session_id,
      question_number,
      "completed",
    );

    // ── Q15 완료 시 Stage C 트리거 확인 ──
    // 모든 문항 평가 완료 여부 체크
    const { data: pendingAnswers } = await supabase
      .from("mock_test_answers")
      .select("question_number, eval_status")
      .eq("session_id", session_id)
      .not("eval_status", "in", '("completed","skipped","failed")');

    if (!pendingAnswers || pendingAnswers.length === 0) {
      // 전체 평가 완료 → Stage C (mock-test-report) fire-and-forget
      const reportUrl = `${SUPABASE_URL}/functions/v1/mock-test-report`;
      fetch(reportUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ session_id }),
      }).catch(() => {
        // fire-and-forget: 실패 시 폴링에서 stuck 감지
      });
    }

    return new Response(
      JSON.stringify({
        status: "completed",
        question_number,
        checkbox_type: checkboxType,
        pass_count: passCount,
        fail_count: failCount,
        pass_rate: passRate,
        tokens_used: tokensUsed,
        processing_time_ms: processingTime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("mock-test-eval 에러:", errorMessage);

    // 실패 시 상태 업데이트
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
          await updateAnswerStatus(
            supabase,
            body.session_id,
            body.question_number,
            "failed",
            { eval_retry_count: retryCount, eval_error: errorMessage },
          );
        } else {
          // evaluating → pending 복귀 (재시도 가능)
          await updateAnswerStatus(
            supabase,
            body.session_id,
            body.question_number,
            "pending",
            { eval_retry_count: retryCount, eval_error: errorMessage },
          );
        }
      }
    } catch {
      // 상태 업데이트 실패 무시
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
