import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  runRuleEngine,
  DEFAULT_PARAMS,
  type RuleEngineParams,
  type EvaluationInput,
  type RuleEngineResult,
} from "../_shared/rule-engine.ts";
import type { CheckboxResult } from "../_shared/checkbox-definitions.ts";
import { logApiUsage } from "../_shared/api-usage-logger.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const ALLOWED_ORIGINS = (
  Deno.env.get("ALLOWED_ORIGINS") || "https://soridamhub.com,http://localhost:3001"
).split(",");

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0],
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const QUESTION_TYPE_KO: Record<string, string> = {
  description: "묘사",
  routine: "루틴",
  comparison: "비교",
  past_childhood: "경험(어린 시절)",
  past_special: "경험(특별한 경험)",
  past_recent: "경험(최근 경험)",
  rp_11: "롤플레이(질문하기)",
  rp_12: "롤플레이(대안 제시)",
  adv_14: "비교·변화",
  adv_15: "사회 이슈",
};

type PromptRow = {
  key: string;
  prompt_text: string;
};

type EvalRow = {
  question_number: number;
  question_type: string;
  checkboxes: Record<string, CheckboxResult> | null;
  checkbox_type: "INT" | "ADV" | "AL" | null;
  skipped_by_preprocess: boolean | null;
};

type ConsultWeakPoint = {
  code: string;
  severity: string;
};

type ConsultChecklistItem = {
  pass: boolean;
};

type ConsultRow = {
  question_number: number;
  question_type: string;
  fulfillment: "fulfilled" | "partial" | "unfulfilled" | "skipped";
  task_checklist: ConsultChecklistItem[] | null;
  observation: string | null;
  weak_points: ConsultWeakPoint[] | null;
  skipped_by_preprocess: boolean | null;
};

type AnswerRow = {
  question_number: number;
  audio_duration: number | null;
  word_count: number | null;
  wpm: number | null;
  filler_word_count: number | null;
  pronunciation_assessment: Record<string, number> | null;
};

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  label = "",
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt) * 1000;
        console.error(`[${label}] retry ${attempt + 1}/${maxRetries} after ${delayMs}ms`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw new Error(`${label} failed after ${maxRetries + 1} attempts: ${lastError?.message}`);
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

async function callGpt<T>(
  systemPrompt: string,
  userPrompt: string,
  responseFormat: Record<string, unknown>,
  model: string,
): Promise<{ result: T; tokensUsed: number; promptTokens: number; completionTokens: number }> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
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

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Chat Completions API failed (${response.status}): ${errorText}`);
  }

  const json = await response.json();
  const content = json.choices?.[0]?.message?.content || "{}";
  const tokensUsed = json.usage?.total_tokens || 0;
  const promptTokens = json.usage?.prompt_tokens || 0;
  const completionTokens = json.usage?.completion_tokens || 0;

  return {
    result: JSON.parse(content) as T,
    tokensUsed,
    promptTokens,
    completionTokens,
  };
}

async function markReportFailed(
  sessionId: string,
  userId: string | null,
  message: string,
) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  await Promise.all([
    supabase
      .from("mock_test_reports")
      .upsert(
        {
          session_id: sessionId,
          ...(userId ? { user_id: userId } : {}),
          status: "failed",
        },
        { onConflict: "session_id" },
      ),
    supabase
      .from("mock_test_sessions")
      .update({
        holistic_status: "failed",
        report_error: message,
      })
      .eq("session_id", sessionId),
  ]);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  let sessionIdForFailure: string | null = null;
  let userIdForFailure: string | null = null;

  try {
    const body = await req.json();
    const { session_id, model = "gpt-4.1" } = body as {
      session_id: string;
      model?: string;
    };

    sessionIdForFailure = session_id ?? null;

    if (!session_id) {
      return new Response(
        JSON.stringify({ error: "session_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`[report] 시작: session=${session_id}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const [sessionRes, evalsRes, consultsRes, answersRes, promptsRes] =
      await Promise.all([
        supabase
          .from("mock_test_sessions")
          .select("user_id, mode, started_at")
          .eq("session_id", session_id)
          .single(),
        supabase
          .from("mock_test_evaluations")
          .select(
            "question_number, question_type, checkboxes, checkbox_type, skipped_by_preprocess",
          )
          .eq("session_id", session_id)
          .order("question_number"),
        supabase
          .from("mock_test_consults")
          .select(
            "question_number, question_type, fulfillment, task_checklist, observation, weak_points, skipped_by_preprocess",
          )
          .eq("session_id", session_id)
          .order("question_number"),
        supabase
          .from("mock_test_answers")
          .select(
            "question_number, audio_duration, word_count, wpm, filler_word_count, pronunciation_assessment",
          )
          .eq("session_id", session_id)
          .gte("question_number", 2)
          .order("question_number"),
        supabase
          .from("evaluation_prompts")
          .select("key, prompt_text")
          .in("key", [
            "report_overview",
            "report_overview_user",
            "report_overview_schema",
            "report_growth",
            "report_growth_user",
            "report_growth_schema",
          ]),
      ]);

    if (sessionRes.error || !sessionRes.data) {
      throw new Error(`세션 조회 실패: ${sessionRes.error?.message}`);
    }
    if (evalsRes.error || !evalsRes.data || evalsRes.data.length === 0) {
      throw new Error(`체크박스 조회 실패: ${evalsRes.error?.message || "데이터 없음"}`);
    }
    if (consultsRes.error || !consultsRes.data || consultsRes.data.length === 0) {
      throw new Error(`코칭 조회 실패: ${consultsRes.error?.message || "데이터 없음"}`);
    }
    if (promptsRes.error || !promptsRes.data || promptsRes.data.length < 6) {
      throw new Error(`프롬프트 로드 실패: ${promptsRes.error?.message || "6개 미만"}`);
    }

    const session = sessionRes.data;
    const userId = session.user_id;
    userIdForFailure = userId;
    const evals = (evalsRes.data || []) as EvalRow[];
    const consults = (consultsRes.data || []) as ConsultRow[];
    const answers = ((answersRes.data || []) as AnswerRow[]);
    const promptMap = Object.fromEntries(
      ((promptsRes.data || []) as PromptRow[]).map((row) => [row.key, row.prompt_text]),
    );

    const answerMap = new Map(answers.map((answer) => [answer.question_number, answer]));
    const validQuestionTypes = new Set([
      "description",
      "routine",
      "comparison",
      "past_childhood",
      "past_special",
      "past_recent",
      "rp_11",
      "rp_12",
      "adv_14",
      "adv_15",
    ]);

    const ruleEngineInputs: EvaluationInput[] = evals
      .filter((evaluation) => {
        if (!evaluation.checkboxes || Object.keys(evaluation.checkboxes).length === 0) {
          console.warn(
            `[report] Q${evaluation.question_number}: checkboxes missing, skip from rule engine`,
          );
          return false;
        }
        if (!validQuestionTypes.has(evaluation.question_type)) {
          console.warn(
            `[report] Q${evaluation.question_number}: unknown question_type "${evaluation.question_type}"`,
          );
          return false;
        }
        return true;
      })
      .map((evaluation) => {
        const answer = answerMap.get(evaluation.question_number);
        const pronunciation = answer?.pronunciation_assessment || {};
        return {
          question_number: evaluation.question_number,
          question_type: evaluation.question_type,
          checkbox_type: (evaluation.checkbox_type || "INT") as "INT" | "ADV" | "AL",
          checkboxes: evaluation.checkboxes || {},
          skipped: evaluation.skipped_by_preprocess || false,
          pronunciation_assessment: pronunciation.accuracy_score
            ? {
                accuracy_score: pronunciation.accuracy_score,
                prosody_score: pronunciation.prosody_score || 0,
                fluency_score: pronunciation.fluency_score || 0,
              }
            : null,
        };
      });

    if (ruleEngineInputs.length === 0) {
      const message = "Rule Engine 입력 데이터가 없습니다.";
      console.error(`[report] ${message}`);
      await markReportFailed(session_id, userId, message);
      return new Response(
        JSON.stringify({ error: message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let ruleEngineResult: RuleEngineResult;
    let finalLevel: string;

    try {
      // DB에서 평가엔진 설정 조회 (없으면 DEFAULT_PARAMS 사용)
      const { data: settingsRow } = await supabase
        .from("mock_test_eval_settings")
        .select("*")
        .limit(1)
        .single();

      const params: RuleEngineParams = settingsRow
        ? {
            checkbox_pass_threshold: Number(settingsRow.re_checkbox_pass_threshold) || DEFAULT_PARAMS.checkbox_pass_threshold,
            floor_nh: Number(settingsRow.re_floor_nh) || DEFAULT_PARAMS.floor_nh,
            floor_il: Number(settingsRow.re_floor_il) || DEFAULT_PARAMS.floor_il,
            floor_im1: Number(settingsRow.re_floor_im1) || DEFAULT_PARAMS.floor_im1,
            floor_im2: Number(settingsRow.re_floor_im2) || DEFAULT_PARAMS.floor_im2,
            ceiling_broke_down: Number(settingsRow.re_ceiling_broke_down) || DEFAULT_PARAMS.ceiling_broke_down,
            ceiling_respond: Number(settingsRow.re_ceiling_respond) || DEFAULT_PARAMS.ceiling_respond,
            sympathetic_low: Number(settingsRow.re_sympathetic_low) || DEFAULT_PARAMS.sympathetic_low,
            sympathetic_mid: Number(settingsRow.re_sympathetic_mid) || DEFAULT_PARAMS.sympathetic_mid,
            sympathetic_at_times: Number(settingsRow.re_sympathetic_at_times) || DEFAULT_PARAMS.sympathetic_at_times,
            al_pass_threshold: Number(settingsRow.re_al_pass_threshold) || DEFAULT_PARAMS.al_pass_threshold,
            q12_gatekeeper_threshold: Number(settingsRow.re_q12_gatekeeper_threshold) || DEFAULT_PARAMS.q12_gatekeeper_threshold,
            sympathetic_pron_weight: Number(settingsRow.re_sympathetic_pron_weight) || DEFAULT_PARAMS.sympathetic_pron_weight,
          }
        : DEFAULT_PARAMS;

      ruleEngineResult = runRuleEngine(ruleEngineInputs, params);
      finalLevel = ruleEngineResult.final_level;
      console.log(
        `[report] Rule Engine: ${finalLevel} ` +
          `(INT=${(ruleEngineResult.int_pass_rate * 100).toFixed(0)}%, ` +
          `ADV=${(ruleEngineResult.adv_pass_rate * 100).toFixed(0)}%)`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[report] Rule Engine 실패:", message);
      await markReportFailed(session_id, userId, `Rule Engine 실패: ${message}`);
      return new Response(
        JSON.stringify({ error: `Rule Engine 실패: ${message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { error: processingError } = await supabase
      .from("mock_test_reports")
      .upsert(
        {
          session_id,
          user_id: userId,
          status: "processing",
        },
        { onConflict: "session_id" },
      );

    if (processingError) {
      throw new Error(`report processing 상태 저장 실패: ${processingError.message}`);
    }

    await supabase
      .from("mock_test_sessions")
      .update({
        holistic_status: "processing",
        report_error: null,
      })
      .eq("session_id", session_id);

    const { data: authUser } = await supabase.auth.admin.getUserById(session.user_id);
    const targetGrade = (authUser?.user?.user_metadata?.target_grade as string) || "IH";

    let totalDuration = 0;
    let totalWords = 0;
    let totalFillers = 0;
    let accuracySum = 0;
    let fluencySum = 0;
    let pronunciationCount = 0;

    for (const answer of answers) {
      totalDuration += Number(answer.audio_duration || 0);
      totalWords += answer.word_count || 0;
      totalFillers += answer.filler_word_count || 0;
      const pronunciation = answer.pronunciation_assessment || {};
      if (pronunciation.accuracy_score) {
        accuracySum += pronunciation.accuracy_score;
        fluencySum += pronunciation.fluency_score || 0;
        pronunciationCount += 1;
      }
    }

    const speechStats = [
      `평균 WPM: ${totalDuration > 0 ? Math.round(totalWords / (totalDuration / 60)) : 0}`,
      `총 발화 시간: ${Math.round(totalDuration)}초`,
      `총 단어 수: ${totalWords}`,
      `총 필러 수: ${totalFillers}`,
      `발음 평균: ${pronunciationCount > 0 ? (accuracySum / pronunciationCount).toFixed(1) : "N/A"}`,
      `유창성 평균: ${pronunciationCount > 0 ? (fluencySum / pronunciationCount).toFixed(1) : "N/A"}`,
    ].join("\n");

    const typeStats: Record<
      string,
      { total: number; fulfilled: number; partial: number; unfulfilled: number; skipped: number }
    > = {};

    for (const consult of consults) {
      if (!typeStats[consult.question_type]) {
        typeStats[consult.question_type] = {
          total: 0,
          fulfilled: 0,
          partial: 0,
          unfulfilled: 0,
          skipped: 0,
        };
      }

      const stats = typeStats[consult.question_type];
      stats.total += 1;
      stats[consult.fulfillment] += 1;
    }

    const typeFulfillment = Object.entries(typeStats)
      .map(([questionType, stats]) => {
        const label = QUESTION_TYPE_KO[questionType] || questionType;
        const rate = stats.total > 0 ? Math.round((stats.fulfilled / stats.total) * 100) : 0;
        return `${label}(${questionType}): 총 ${stats.total}문항, fulfilled=${stats.fulfilled}, partial=${stats.partial}, unfulfilled=${stats.unfulfilled}, skipped=${stats.skipped}, 충족률=${rate}%`;
      })
      .join("\n");

    const weakPointFrequency: Record<string, number> = {};
    for (const consult of consults) {
      for (const weakPoint of consult.weak_points || []) {
        weakPointFrequency[weakPoint.code] = (weakPointFrequency[weakPoint.code] || 0) + 1;
      }
    }

    const wpFrequency = Object.entries(weakPointFrequency)
      .sort(([, left], [, right]) => right - left)
      .slice(0, 10)
      .map(([code, count]) => `${code}: ${count}회`)
      .join("\n");

    const questionEvaluations = consults
      .map((consult) => {
        const label = QUESTION_TYPE_KO[consult.question_type] || consult.question_type;
        const weakPoints = (consult.weak_points || [])
          .map((weakPoint) => `${weakPoint.code}(${weakPoint.severity})`)
          .join(", ");
        const checklistPassed = (consult.task_checklist || []).filter((item) => item.pass).length;
        const checklistTotal = (consult.task_checklist || []).length;
        const answer = answerMap.get(consult.question_number);

        return [
          `Q${consult.question_number} [${label}/${consult.question_type}]`,
          `  fulfillment: ${consult.fulfillment}`,
          `  checklist: ${checklistPassed}/${checklistTotal} 충족`,
          `  observation: ${(consult.observation || "").slice(0, 200)}`,
          weakPoints ? `  weak_points: ${weakPoints}` : "",
          answer ? `  wpm: ${answer.wpm}, duration: ${answer.audio_duration}s` : "",
          consult.skipped_by_preprocess ? "  (무응답/스킵 처리)" : "",
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n\n");

    const totalEvaluations = consults.length;
    const fulfilledCount = consults.filter((consult) => consult.fulfillment === "fulfilled").length;
    const partialCount = consults.filter((consult) => consult.fulfillment === "partial").length;
    const unfulfilledCount = consults.filter((consult) => consult.fulfillment === "unfulfilled").length;
    const skippedCount = consults.filter((consult) => consult.fulfillment === "skipped").length;

    const fulfillmentSummary =
      `fulfilled=${fulfilledCount}, partial=${partialCount}, ` +
      `unfulfilled=${unfulfilledCount}, skipped=${skippedCount} ` +
      `(충족률=${Math.round((fulfilledCount / totalEvaluations) * 100)}%)`;

    const overviewUser = substituteVariables(promptMap["report_overview_user"], {
      target_grade: targetGrade,
      final_level: finalLevel,
      total_questions: String(totalEvaluations),
      fulfillment_summary: fulfillmentSummary,
      type_fulfillment: typeFulfillment,
      wp_frequency: wpFrequency,
      speech_stats: speechStats,
      question_evaluations: questionEvaluations,
    });

    // ── 이전 세션 데이터 조회 (성장 비교용) ──
    let previousComparison = "이전 시험 데이터 없음 (첫 번째 시험)";

    const { data: prevReport } = await supabase
      .from("mock_test_reports")
      .select("session_id, final_level, rule_engine_result, growth")
      .eq("user_id", userId)
      .eq("status", "completed")
      .neq("session_id", session_id)
      .order("completed_at", { ascending: false })
      .limit(1)
      .single();

    if (prevReport) {
      // 이전 세션의 consults 조회
      const { data: prevConsults } = await supabase
        .from("mock_test_consults")
        .select("question_type, fulfillment, weak_points")
        .eq("session_id", prevReport.session_id);

      // 이전 유형별 충족 통계
      const prevTypeStats: Record<string, { total: number; fulfilled: number; partial: number; unfulfilled: number; skipped: number }> = {};
      for (const c of prevConsults || []) {
        if (!prevTypeStats[c.question_type]) {
          prevTypeStats[c.question_type] = { total: 0, fulfilled: 0, partial: 0, unfulfilled: 0, skipped: 0 };
        }
        prevTypeStats[c.question_type].total += 1;
        prevTypeStats[c.question_type][c.fulfillment as "fulfilled" | "partial" | "unfulfilled" | "skipped"] += 1;
      }

      const prevTypeFulfillment = Object.entries(prevTypeStats)
        .map(([qt, s]) => {
          const label = QUESTION_TYPE_KO[qt] || qt;
          const rate = s.total > 0 ? Math.round((s.fulfilled / s.total) * 100) : 0;
          return `${label}(${qt}): 총 ${s.total}문항, fulfilled=${s.fulfilled}, partial=${s.partial}, unfulfilled=${s.unfulfilled}, skipped=${s.skipped}, 충족률=${rate}%`;
        })
        .join("\n");

      // 이전 WP 빈도
      const prevWpFreq: Record<string, number> = {};
      for (const c of prevConsults || []) {
        for (const wp of (c.weak_points as ConsultWeakPoint[]) || []) {
          prevWpFreq[wp.code] = (prevWpFreq[wp.code] || 0) + 1;
        }
      }
      const prevWpStr = Object.entries(prevWpFreq)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([code, count]) => `${code}: ${count}회`)
        .join("\n");

      const prevTotal = (prevConsults || []).length;
      const prevFulfilled = (prevConsults || []).filter((c) => c.fulfillment === "fulfilled").length;

      previousComparison = [
        `## 이전 시험 결과 (비교 기준)`,
        `- 판정 등급: ${prevReport.final_level}`,
        `- 평가 문항 수: ${prevTotal}개`,
        `- 충족률: ${prevTotal > 0 ? Math.round((prevFulfilled / prevTotal) * 100) : 0}%`,
        ``,
        `### 이전 유형별 충족 집계`,
        prevTypeFulfillment,
        ``,
        `### 이전 상위 빈도 약점`,
        prevWpStr || "없음",
      ].join("\n");

      console.log(`[report] 이전 세션 비교: ${prevReport.session_id} (${prevReport.final_level})`);
    } else {
      console.log("[report] 이전 세션 없음 (첫 번째 시험)");
    }

    const growthUser = substituteVariables(promptMap["report_growth_user"], {
      target_grade: targetGrade,
      final_level: finalLevel,
      total_questions: String(totalEvaluations),
      fulfillment_summary: fulfillmentSummary,
      type_fulfillment: typeFulfillment,
      wp_frequency: wpFrequency,
      question_evaluations: questionEvaluations,
      previous_comparison: previousComparison,
    });

    const overviewSchema = JSON.parse(promptMap["report_overview_schema"]);
    const growthSchema = JSON.parse(promptMap["report_growth_schema"]);

    console.log(`[report] overview GPT 호출 (${overviewUser.length} chars)`);
    console.log(`[report] growth GPT 호출 (${growthUser.length} chars)`);

    const [overviewResult, growthResult] = await Promise.all([
      withRetry(
        () => callGpt(promptMap["report_overview"], overviewUser, overviewSchema, model),
        2,
        "overview",
      ),
      withRetry(
        () => callGpt(promptMap["report_growth"], growthUser, growthSchema, model),
        2,
        "growth",
      ),
    ]);

    const totalTokens = overviewResult.tokensUsed + growthResult.tokensUsed;

    console.log(
      `[report] 완료: overview=${overviewResult.tokensUsed}t, ` +
        `growth=${growthResult.tokensUsed}t, 합계=${totalTokens}t`,
    );

    // API 사용량 로깅 — overview + growth 각각 기록 (실패해도 메인 로직 중단 안 함)
    Promise.all([
      logApiUsage(supabase, {
        user_id: userId,
        session_type: "mock_exam",
        session_id: session_id,
        feature: "모의고사 종합진단",
        service: "openai_chat",
        model: model,
        ef_name: "mock-test-report",
        tokens_in: overviewResult.promptTokens,
        tokens_out: overviewResult.completionTokens,
      }),
      logApiUsage(supabase, {
        user_id: userId,
        session_type: "mock_exam",
        session_id: session_id,
        feature: "모의고사 성장분석",
        service: "openai_chat",
        model: model,
        ef_name: "mock-test-report",
        tokens_in: growthResult.promptTokens,
        tokens_out: growthResult.completionTokens,
      }),
    ]).catch((err) => console.error("[report] API 로깅 실패:", err?.message));

    // GPT 완료 후 새 클라이언트로 저장 (GPT 대기 중 기존 연결 끊김 방지)
    const freshClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    await withRetry(
      async () => {
        const { error: updateError } = await freshClient
          .from("mock_test_reports")
          .upsert(
            {
              session_id,
              user_id: userId,
              overview: overviewResult.result,
              growth: growthResult.result,
              final_level: finalLevel,
              target_grade: targetGrade,
              rule_engine_result: ruleEngineResult,
              aggregated_checkboxes: {
                int: ruleEngineResult.aggregated_int_checkboxes,
                adv: ruleEngineResult.aggregated_adv_checkboxes,
                al: ruleEngineResult.aggregated_al_checkboxes,
              },
              model,
              tokens_used: totalTokens,
              processing_time_ms: Date.now() - startTime,
              status: "completed",
              completed_at: new Date().toISOString(),
            },
            { onConflict: "session_id" },
          );
        if (updateError) throw new Error(updateError.message);
      },
      2,
      "report DB 저장",
    );

    await freshClient
      .from("mock_test_sessions")
      .update({
        holistic_status: "completed",
        report_error: null,
      })
      .eq("session_id", session_id);

    return new Response(
      JSON.stringify({
        status: "completed",
        session_id,
        model,
        final_level: finalLevel,
        target_grade: targetGrade,
        total_tokens: totalTokens,
        total_time_ms: Date.now() - startTime,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[report] 오류:", message);

    if (sessionIdForFailure) {
      await markReportFailed(sessionIdForFailure, userIdForFailure, message);
    }

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
