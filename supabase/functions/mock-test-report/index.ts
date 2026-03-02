// mock-test-report — Stage C Edge Function
// 규칙엔진 7-Step 실행 + FACT 점수 + GPT 종합 리포트 (~45초)
// mock-test-eval에서 전체 평가 완료 시 fire-and-forget으로 호출

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  runRuleEngine,
  DEFAULT_PARAMS,
  type RuleEngineParams,
  type EvaluationInput,
  type AggregatedCheckboxes,
} from "../_shared/rule-engine.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

// 체크박스 집계를 프롬프트용 문자열로 포맷
function formatCheckboxesForPrompt(
  checkboxes: AggregatedCheckboxes,
  label: string,
): string {
  const entries = Object.entries(checkboxes);
  if (entries.length === 0) return `${label}: 평가 데이터 없음`;

  const lines = entries.map(([id, data]) => {
    const status = data.final_pass ? "PASS" : "FAIL";
    const rate = (data.pass_rate * 100).toFixed(0);
    return `  ${id}: ${status} (${rate}%, ${data.pass_count}/${data.total})`;
  });

  return `${label} (${entries.length}개):\n${lines.join("\n")}`;
}

// 문항별 요약 생성
function generateQuestionSummaries(
  evaluations: Array<{
    question_number: number;
    question_type: string;
    checkbox_type: string;
    pass_count: number;
    fail_count: number;
    pass_rate: number;
    transcript: string;
    wpm: number;
    filler_count: number;
    skipped: boolean;
  }>,
): string {
  return evaluations
    .map((e) => {
      if (e.skipped) return `Q${e.question_number}: SKIPPED`;
      const rate = ((e.pass_rate || 0) * 100).toFixed(0);
      return `Q${e.question_number} (${e.question_type}, ${e.checkbox_type}): ${rate}% pass (${e.pass_count}/${e.pass_count + e.fail_count}), WPM=${e.wpm || 0}, filler=${e.filler_count || 0}`;
    })
    .join("\n");
}

// GPT 종합 리포트 생성
async function generateGPTReport(
  systemPrompt: string,
  userPrompt: string,
): Promise<{ result: Record<string, unknown>; tokensUsed: number }> {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1",
      temperature: 0.5,
      max_tokens: 12000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`GPT 리포트 생성 실패 (${resp.status}): ${err}`);
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

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { session_id } = await req.json();

    if (!session_id) {
      return new Response(
        JSON.stringify({ error: "session_id 필수" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── 세션 조회 ──
    const { data: session, error: sessionError } = await supabase
      .from("mock_test_sessions")
      .select("user_id, mode, question_ids, status")
      .eq("session_id", session_id)
      .single();

    if (sessionError || !session) {
      throw new Error(`세션 조회 실패: ${sessionError?.message || "not found"}`);
    }

    // holistic_status → processing
    await supabase
      .from("mock_test_sessions")
      .update({ holistic_status: "processing" })
      .eq("session_id", session_id);

    // ── 개별 평가 결과 전체 조회 (Q2~Q15) ──
    const { data: evaluations, error: evalError } = await supabase
      .from("mock_test_evaluations")
      .select(
        "question_number, question_type, checkbox_type, checkboxes, " +
        "pass_count, fail_count, pass_rate, transcript, wpm, " +
        "filler_count, long_pause_count, pronunciation_assessment, skipped",
      )
      .eq("session_id", session_id)
      .order("question_number");

    if (evalError) {
      throw new Error(`평가 결과 조회 실패: ${evalError.message}`);
    }

    if (!evaluations || evaluations.length === 0) {
      throw new Error("평가 결과가 없습니다");
    }

    // ── 규칙엔진 파라미터 로드 (DB → 기본값 폴백) ──
    let ruleParams: RuleEngineParams = DEFAULT_PARAMS;
    try {
      const { data: configRow } = await supabase
        .from("mock_test_eval_settings")
        .select("*")
        .eq("id", 1)
        .single();

      if (configRow) {
        // DB에서 규칙엔진 파라미터 오버라이드 (향후 확장용)
        // 현재는 기본값 사용, eval_settings에 규칙엔진 파라미터 추가 시 여기서 매핑
        ruleParams = DEFAULT_PARAMS;
      }
    } catch {
      // 기본값 사용
    }

    // ── 규칙엔진 입력 변환 ──
    const ruleInputs: EvaluationInput[] = evaluations.map((e) => ({
      question_number: e.question_number,
      question_type: e.question_type || "",
      checkbox_type: (e.checkbox_type || "ADV") as "INT" | "ADV" | "AL",
      checkboxes: (e.checkboxes as Record<string, { pass: boolean; evidence?: string }>) || {},
      skipped: e.skipped || false,
      pronunciation_assessment: e.pronunciation_assessment as EvaluationInput["pronunciation_assessment"],
    }));

    // ── Step 0-7: 규칙엔진 실행 ──
    const ruleResult = runRuleEngine(ruleInputs, ruleParams);

    // ── 발음 평균 계산 ──
    let totalAccuracy = 0;
    let totalProsody = 0;
    let totalFluency = 0;
    let pronCount = 0;
    for (const e of evaluations) {
      if (e.skipped || !e.pronunciation_assessment) continue;
      const pa = e.pronunciation_assessment as Record<string, number>;
      if (pa.accuracy_score != null) {
        totalAccuracy += pa.accuracy_score;
        totalProsody += pa.prosody_score || 0;
        totalFluency += pa.fluency_score || 0;
        pronCount++;
      }
    }
    const avgAccuracy = pronCount > 0 ? Math.round(totalAccuracy / pronCount * 10) / 10 : 0;
    const avgProsody = pronCount > 0 ? Math.round(totalProsody / pronCount * 10) / 10 : 0;
    const avgFluency = pronCount > 0 ? Math.round(totalFluency / pronCount * 10) / 10 : 0;

    // ── 사용자 프로필 조회 (nickname, target_level) ──
    const { data: userProfile } = await supabase.auth.admin.getUserById(
      session.user_id,
    );
    const nickname =
      userProfile?.user?.user_metadata?.nickname ||
      userProfile?.user?.user_metadata?.display_name ||
      "학습자";
    const targetLevel =
      userProfile?.user?.user_metadata?.target_grade || "IM2";

    // ── reports INSERT (규칙엔진 결과 + FACT 점수) ──
    const { error: reportInsertError } = await supabase
      .from("mock_test_reports")
      .upsert(
        {
          session_id,
          user_id: session.user_id,
          final_level: ruleResult.final_level,
          floor_status: ruleResult.floor_status,
          floor_level: ruleResult.floor_level,
          ceiling_status: ruleResult.ceiling_status,
          sympathetic_listener: ruleResult.sympathetic_listener,
          int_pass_rate: ruleResult.int_pass_rate,
          adv_pass_rate: ruleResult.adv_pass_rate,
          al_pass_rate: ruleResult.al_pass_rate,
          valid_question_count: ruleResult.valid_question_count,
          aggregated_int_checkboxes: ruleResult.aggregated_int_checkboxes,
          aggregated_adv_checkboxes: ruleResult.aggregated_adv_checkboxes,
          aggregated_al_checkboxes: ruleResult.aggregated_al_checkboxes,
          al_judgment: ruleResult.al_judgment,
          q12_gatekeeper: ruleResult.q12_gatekeeper,
          skipped_questions: ruleResult.skipped_questions,
          // FACT 점수
          score_f: ruleResult.fact_scores.score_f,
          score_a: ruleResult.fact_scores.score_a,
          score_c: ruleResult.fact_scores.score_c,
          score_t: ruleResult.fact_scores.score_t,
          total_score: ruleResult.fact_scores.total_score,
          // 발음 평균
          avg_accuracy_score: avgAccuracy,
          avg_prosody_score: avgProsody,
          avg_fluency_score: avgFluency,
          // 메타
          target_level: targetLevel,
          test_date: new Date().toISOString().split("T")[0],
          rule_engine_status: "completed",
          report_status: "processing",
        },
        { onConflict: "session_id" },
      );

    if (reportInsertError) {
      throw new Error(`리포트 저장 실패: ${reportInsertError.message}`);
    }

    // ── GPT 종합 리포트 생성 ──
    let reportResult: Record<string, unknown> = {};
    let reportTokens = 0;

    try {
      // 프롬프트 조회
      const { data: promptRow } = await supabase
        .from("evaluation_prompts")
        .select("content")
        .eq("key", "eval_comprehensive")
        .eq("is_active", true)
        .single();

      if (promptRow && promptRow.content !== "{{PLACEHOLDER}}") {
        // 변수 치환
        const questionSummaries = generateQuestionSummaries(
          evaluations.map((e) => ({
            question_number: e.question_number,
            question_type: e.question_type || "",
            checkbox_type: e.checkbox_type || "",
            pass_count: e.pass_count || 0,
            fail_count: e.fail_count || 0,
            pass_rate: Number(e.pass_rate) || 0,
            transcript: e.transcript || "",
            wpm: Number(e.wpm) || 0,
            filler_count: e.filler_count || 0,
            skipped: e.skipped || false,
          })),
        );

        const intCheckboxStr = formatCheckboxesForPrompt(
          ruleResult.aggregated_int_checkboxes,
          "INT Checkboxes",
        );
        const advCheckboxStr = formatCheckboxesForPrompt(
          ruleResult.aggregated_adv_checkboxes,
          "ADV Checkboxes",
        );

        const variables: Record<string, string | number> = {
          final_level: ruleResult.final_level,
          floor_status: ruleResult.floor_status,
          floor_level: ruleResult.floor_level,
          ceiling_status: ruleResult.ceiling_status,
          sympathetic_listener: ruleResult.sympathetic_listener,
          int_pass_rate: (ruleResult.int_pass_rate * 100).toFixed(1),
          adv_pass_rate: (ruleResult.adv_pass_rate * 100).toFixed(1),
          valid_question_count: ruleResult.valid_question_count,
          aggregated_int_checkboxes: intCheckboxStr,
          aggregated_adv_checkboxes: advCheckboxStr,
          avg_fluency_score: avgFluency,
          avg_prosody_score: avgProsody,
          avg_accuracy_score: avgAccuracy,
          question_summaries: questionSummaries,
          nickname,
          target_level: targetLevel,
          score_f: ruleResult.fact_scores.score_f,
          score_a: ruleResult.fact_scores.score_a,
          score_c: ruleResult.fact_scores.score_c,
          score_t: ruleResult.fact_scores.score_t,
          total_score: ruleResult.fact_scores.total_score,
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
          userPrompt = `Generate a comprehensive OPIc evaluation report for level ${ruleResult.final_level}.`;
        }

        // GPT 호출
        const gptResponse = await withRetry(
          () => generateGPTReport(systemPrompt, userPrompt),
          2,
          "GPT 종합 리포트",
        );
        reportResult = gptResponse.result;
        reportTokens = gptResponse.tokensUsed;
      }
    } catch (gptErr) {
      console.error("GPT 리포트 생성 실패 (규칙엔진 결과는 저장됨):", gptErr);
    }

    // ── reports UPDATE (GPT 리포트 결과) ──
    const updateData: Record<string, unknown> = {
      report_status: "completed",
    };

    if (reportResult.overall_comments_ko) {
      updateData.overall_comments_ko = reportResult.overall_comments_ko;
    }
    if (reportResult.overall_comments_en) {
      updateData.overall_comments_en = reportResult.overall_comments_en;
    }
    if (reportResult.comprehensive_feedback) {
      updateData.comprehensive_feedback =
        typeof reportResult.comprehensive_feedback === "string"
          ? reportResult.comprehensive_feedback
          : JSON.stringify(reportResult.comprehensive_feedback);
    }
    if (reportResult.training_recommendations) {
      updateData.training_recommendations =
        reportResult.training_recommendations;
    }
    if (reportResult.int_performance) {
      updateData.int_performance = reportResult.int_performance;
    }
    if (reportResult.adv_performance) {
      updateData.adv_performance = reportResult.adv_performance;
    }

    await supabase
      .from("mock_test_reports")
      .update(updateData)
      .eq("session_id", session_id);

    // ── 세션 상태 업데이트 ──
    await supabase
      .from("mock_test_sessions")
      .update({
        holistic_status: "completed",
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("session_id", session_id);

    const processingTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        status: "completed",
        final_level: ruleResult.final_level,
        fact_scores: ruleResult.fact_scores,
        report_tokens: reportTokens,
        processing_time_ms: processingTime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("mock-test-report 에러:", errorMessage);

    // 실패 시 상태 업데이트
    try {
      const body = await req.clone().json().catch(() => null);
      if (body?.session_id) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // retry_count 조회
        const { data: sessionData } = await supabase
          .from("mock_test_sessions")
          .select("report_retry_count")
          .eq("session_id", body.session_id)
          .single();

        const retryCount = (sessionData?.report_retry_count || 0) + 1;

        if (retryCount >= 3) {
          // 3회 실패: failed
          await supabase
            .from("mock_test_sessions")
            .update({
              holistic_status: "failed",
              report_retry_count: retryCount,
              report_error: errorMessage,
            })
            .eq("session_id", body.session_id);

          // 리포트도 failed
          await supabase
            .from("mock_test_reports")
            .update({ report_status: "failed" })
            .eq("session_id", body.session_id);
        } else {
          // 재시도 가능
          await supabase
            .from("mock_test_sessions")
            .update({
              holistic_status: "pending",
              report_retry_count: retryCount,
              report_error: errorMessage,
            })
            .eq("session_id", body.session_id);
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
