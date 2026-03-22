/**
 * mock-test-report — Stage C: 종합 리포트 Edge Function
 *
 * 역할: 14개 문항 결과를 집계하여 등급 판정 + 종합 소견 + 성장 분석 생성
 *
 * 데이터 소스:
 * - evaluations: 체크박스 (eval가 저장)
 * - consults: 소견/방향/약점 (consult가 저장)
 * - answers: 발화 메타 (V1 process가 저장)
 *
 * 프롬프트: evaluation_prompts (CO-STAR, DB 로드)
 * API: OpenAI Chat Completions API
 *
 * 출력: overview + growth + final_level → mock_test_reports에 저장
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  runRuleEngine,
  DEFAULT_PARAMS,
  type EvaluationInput,
  type RuleEngineResult,
} from "../_shared/rule-engine.ts";
import type { CheckboxResult } from "../_shared/checkbox-definitions.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "https://opictalkdoc.com,http://localhost:3001").split(",");

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0],
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── question_type 한글 매핑 ──

const QUESTION_TYPE_KO: Record<string, string> = {
  description: "묘사",
  routine: "루틴",
  comparison: "비교",
  past_childhood: "경험 (어린 시절)",
  past_special: "경험 (특별한)",
  past_recent: "경험 (최근)",
  rp_11: "롤플레이 (질문하기)",
  rp_12: "롤플레이 (대안 제시)",
  adv_14: "비교·변화",
  adv_15: "사회적 이슈",
};

// ── 유틸리티 ──

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

// ── Chat Completions API 호출 ──

async function callGpt<T>(
  systemPrompt: string,
  userPrompt: string,
  responseFormat: Record<string, unknown>,
  model: string,
): Promise<{ result: T; tokensUsed: number }> {
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

  return { result: JSON.parse(content) as T, tokensUsed };
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
      model = "gpt-4.1",
    } = body as {
      session_id: string;
      model?: string;
    };

    if (!session_id) {
      return new Response(
        JSON.stringify({ error: "session_id 필수" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`[report] 시작: session=${session_id}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── 1. 병렬 DB 로드 ──

    const [sessionRes, evalsRes, consultsRes, answersRes, promptsRes] =
      await Promise.all([
        // 세션 정보
        supabase
          .from("mock_test_sessions")
          .select("user_id, mode, started_at")
          .eq("session_id", session_id)
          .single(),
        // 체크박스 (evaluations)
        supabase
          .from("mock_test_evaluations")
          .select(
            "question_number, question_type, checkboxes, checkbox_type, pass_count, fail_count, pass_rate, skipped_by_preprocess",
          )
          .eq("session_id", session_id)
          .order("question_number"),
        // 소견 (consults)
        supabase
          .from("mock_test_consults")
          .select(
            "question_number, question_type, target_grade, fulfillment, task_checklist, observation, directions, weak_points, skipped_by_preprocess",
          )
          .eq("session_id", session_id)
          .order("question_number"),
        // 발화 메타 (answers)
        supabase
          .from("mock_test_answers")
          .select(
            "question_number, audio_duration, word_count, wpm, filler_word_count, filler_ratio, pronunciation_assessment",
          )
          .eq("session_id", session_id)
          .gte("question_number", 2)
          .order("question_number"),
        // 프롬프트 6행
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

    if (sessionRes.error || !sessionRes.data)
      throw new Error(`세션 조회 실패: ${sessionRes.error?.message}`);
    if (evalsRes.error || !evalsRes.data || evalsRes.data.length === 0)
      throw new Error(`체크박스 조회 실패: ${evalsRes.error?.message || "데이터 없음"}`);
    if (consultsRes.error || !consultsRes.data || consultsRes.data.length === 0)
      throw new Error(`소견 조회 실패: ${consultsRes.error?.message || "데이터 없음"}`);
    if (promptsRes.error || !promptsRes.data || promptsRes.data.length < 6)
      throw new Error(`프롬프트 로드 실패: ${promptsRes.error?.message || "6행 미만"}`);

    const userId = sessionRes.data.user_id;
    const evals = evalsRes.data;
    const consults = consultsRes.data;
    const answers = answersRes.data || [];
    const pm: Record<string, string> = {};
    for (const row of promptsRes.data) pm[row.key] = row.prompt_text;

    // ── 2. Rule Engine 등급 판정 ──

    const answerMap = new Map(answers.map((a) => [a.question_number, a]));

    // inputs 검증: 빈 체크박스, 알 수 없는 question_type 필터링
    const validQuestionTypes = new Set([
      "description", "routine", "comparison",
      "past_childhood", "past_special", "past_recent",
      "rp_11", "rp_12", "adv_14", "adv_15",
    ]);

    const ruleEngineInputs: EvaluationInput[] = evals
      .filter((e) => {
        if (!e.checkboxes || Object.keys(e.checkboxes).length === 0) {
          console.warn(`[report] Q${e.question_number}: 체크박스 데이터 없음 — Rule Engine 입력에서 제외`);
          return false;
        }
        if (!validQuestionTypes.has(e.question_type)) {
          console.warn(`[report] Q${e.question_number}: 알 수 없는 question_type "${e.question_type}" — 제외`);
          return false;
        }
        return true;
      })
      .map((e) => {
        const a = answerMap.get(e.question_number);
        const pron = (a?.pronunciation_assessment || {}) as Record<string, number>;
        return {
          question_number: e.question_number,
          question_type: e.question_type,
          checkbox_type: (e.checkbox_type || "INT") as "INT" | "ADV" | "AL",
          checkboxes: (e.checkboxes || {}) as Record<string, CheckboxResult>,
          skipped: e.skipped_by_preprocess || false,
          pronunciation_assessment: pron.accuracy_score
            ? {
                accuracy_score: pron.accuracy_score,
                prosody_score: pron.prosody_score || 0,
                fluency_score: pron.fluency_score || 0,
              }
            : null,
        };
      });

    if (ruleEngineInputs.length === 0) {
      console.error("[report] Rule Engine 입력이 0개 — 평가 데이터 비정상");
      await supabase
        .from("mock_test_reports")
        .upsert(
          {
            session_id,
            user_id: userId,
            status: "failed",
            error_message: "Rule Engine 입력 데이터 없음 (체크박스 미완료)",
          },
          { onConflict: "session_id" },
        );
      return new Response(
        JSON.stringify({ error: "평가 데이터 비정상 — 체크박스 미완료" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let ruleEngineResult: RuleEngineResult;
    let finalLevel: string;

    try {
      ruleEngineResult = runRuleEngine(ruleEngineInputs, DEFAULT_PARAMS);
      finalLevel = ruleEngineResult.final_level;
      console.log(
        `[report] Rule Engine: ${finalLevel} ` +
          `(INT=${(ruleEngineResult.int_pass_rate * 100).toFixed(0)}%, ` +
          `ADV=${(ruleEngineResult.adv_pass_rate * 100).toFixed(0)}%)`,
      );
    } catch (reErr) {
      const errMsg = reErr instanceof Error ? reErr.message : String(reErr);
      console.error("[report] Rule Engine 실패:", errMsg);
      await supabase
        .from("mock_test_reports")
        .upsert(
          {
            session_id,
            user_id: userId,
            status: "failed",
            error_message: `Rule Engine 실패: ${errMsg}`,
          },
          { onConflict: "session_id" },
        );
      return new Response(
        JSON.stringify({ error: `Rule Engine 실패: ${errMsg}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 3. 상태: processing ──

    await supabase
      .from("mock_test_reports")
      .upsert(
        { session_id, user_id: userId, status: "processing" },
        { onConflict: "session_id" },
      );

    // ── 4. GPT 입력 데이터 구성 ──

    const targetGrade = consults[0]?.target_grade || "IH";

    // 발화 통계 집계
    let totalDuration = 0, totalWords = 0, totalFillers = 0;
    let pronSum = 0, fluencySum = 0, pronCount = 0;
    for (const a of answers) {
      totalDuration += Number(a.audio_duration || 0);
      totalWords += a.word_count || 0;
      totalFillers += a.filler_word_count || 0;
      const pron = (a.pronunciation_assessment || {}) as Record<string, number>;
      if (pron.accuracy_score) {
        pronSum += pron.accuracy_score;
        fluencySum += pron.fluency_score || 0;
        pronCount++;
      }
    }

    const speechStats = [
      `평균 WPM: ${totalDuration > 0 ? Math.round(totalWords / (totalDuration / 60)) : 0}`,
      `총 발화 시간: ${Math.round(totalDuration)}초`,
      `총 단어 수: ${totalWords}`,
      `발음 평균: ${pronCount > 0 ? (pronSum / pronCount).toFixed(1) : "N/A"}`,
      `유창성 평균: ${pronCount > 0 ? (fluencySum / pronCount).toFixed(1) : "N/A"}`,
    ].join("\n");

    // 유형별 충족 집계 (consults 기반)
    const typeStats: Record<string, { total: number; fulfilled: number; partial: number; unfulfilled: number; skipped: number }> = {};
    for (const c of consults) {
      if (!typeStats[c.question_type])
        typeStats[c.question_type] = { total: 0, fulfilled: 0, partial: 0, unfulfilled: 0, skipped: 0 };
      typeStats[c.question_type].total++;
      const f = c.fulfillment as "fulfilled" | "partial" | "unfulfilled" | "skipped";
      if (typeStats[c.question_type][f] !== undefined) typeStats[c.question_type][f]++;
    }

    const typeFulfillment = Object.entries(typeStats)
      .map(([type, s]) => {
        const ko = QUESTION_TYPE_KO[type] || type;
        const rate = s.total > 0 ? Math.round((s.fulfilled / s.total) * 100) : 0;
        return `${ko}(${type}): 총${s.total}문항, fulfilled=${s.fulfilled}, partial=${s.partial}, unfulfilled=${s.unfulfilled}, skipped=${s.skipped}, 충족률=${rate}%`;
      })
      .join("\n");

    // WP 빈도 집계 (consults 기반)
    const wpFreq: Record<string, number> = {};
    for (const c of consults) {
      for (const wp of (c.weak_points as Array<{ code: string }>)) {
        wpFreq[wp.code] = (wpFreq[wp.code] || 0) + 1;
      }
    }
    const wpFrequency = Object.entries(wpFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([code, freq]) => `${code}: ${freq}회`)
      .join("\n");

    // 문항별 평가 요약 (consults 기반)
    const questionEvaluations = consults
      .map((c) => {
        const ko = QUESTION_TYPE_KO[c.question_type] || c.question_type;
        const wpCodes = (c.weak_points as Array<{ code: string; severity: string }>)
          .map((wp) => `${wp.code}(${wp.severity})`)
          .join(", ");
        const checklistPassed = (c.task_checklist as Array<{ pass: boolean }>).filter((t) => t.pass).length;
        const checklistTotal = (c.task_checklist as Array<{ pass: boolean }>).length;
        const a = answerMap.get(c.question_number);
        return [
          `Q${c.question_number} [${ko}/${c.question_type}]`,
          `  fulfillment: ${c.fulfillment}`,
          `  checklist: ${checklistPassed}/${checklistTotal} 충족`,
          `  observation: ${(c.observation as string).slice(0, 200)}`,
          wpCodes ? `  weak_points: ${wpCodes}` : "",
          a ? `  wpm: ${a.wpm}, duration: ${a.audio_duration}s` : "",
          c.skipped_by_preprocess ? "  (무응답)" : "",
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n\n");

    // 충족 현황 집계
    const totalEvals = consults.length;
    const fulfilledCount = consults.filter((c) => c.fulfillment === "fulfilled").length;
    const partialCount = consults.filter((c) => c.fulfillment === "partial").length;
    const unfulfilledCount = consults.filter((c) => c.fulfillment === "unfulfilled").length;
    const skippedCount = consults.filter((c) => c.fulfillment === "skipped").length;
    const fulfillmentSummary = `fulfilled=${fulfilledCount}, partial=${partialCount}, unfulfilled=${unfulfilledCount}, skipped=${skippedCount} (충족률 ${Math.round((fulfilledCount / totalEvals) * 100)}%)`;

    // ── 5. Overview GPT 호출 ──

    const overviewUser = substituteVariables(pm["report_overview_user"], {
      target_level: targetGrade,
      final_level: finalLevel,
      total_questions: String(totalEvals),
      fulfillment_summary: fulfillmentSummary,
      type_fulfillment: typeFulfillment,
      wp_frequency: wpFrequency,
      speech_stats: speechStats,
      question_evaluations: questionEvaluations,
    });

    const overviewSchema = JSON.parse(pm["report_overview_schema"]);

    console.log(`[report] overview GPT 호출 (${overviewUser.length}자)`);

    const overviewPromise = withRetry(
      () => callGpt(pm["report_overview"], overviewUser, overviewSchema, model),
      2,
      "overview",
    );

    // ── 6. Growth GPT 호출 (병렬) ──

    const growthUser = substituteVariables(pm["report_growth_user"], {
      target_level: targetGrade,
      final_level: finalLevel,
      total_questions: String(totalEvals),
      fulfillment_summary: fulfillmentSummary,
      type_fulfillment: typeFulfillment,
      wp_frequency: wpFrequency,
      question_evaluations: questionEvaluations,
    });

    const growthSchema = JSON.parse(pm["report_growth_schema"]);

    console.log(`[report] growth GPT 호출 (${growthUser.length}자)`);

    const growthPromise = withRetry(
      () => callGpt(pm["report_growth"], growthUser, growthSchema, model),
      2,
      "growth",
    );

    // ── 7. 병렬 완료 대기 ──

    const [overviewResult, growthResult] = await Promise.all([
      overviewPromise,
      growthPromise,
    ]);

    const totalTokens = overviewResult.tokensUsed + growthResult.tokensUsed;

    console.log(
      `[report] 완료: overview=${overviewResult.tokensUsed}t, growth=${growthResult.tokensUsed}t, 합계=${totalTokens}t`,
    );

    // ── 8. DB 저장 ──

    const { error: updateErr } = await supabase
      .from("mock_test_reports")
      .upsert(
        {
          session_id,
          user_id: userId,
          overview: overviewResult.result,
          growth: growthResult.result,
          final_level: finalLevel,
          target_level: targetGrade,
          rule_engine_result: ruleEngineResult || {},
          aggregated_checkboxes: ruleEngineResult
            ? {
                int: ruleEngineResult.aggregated_int_checkboxes,
                adv: ruleEngineResult.aggregated_adv_checkboxes,
                al: ruleEngineResult.aggregated_al_checkboxes,
              }
            : {},
          model,
          tokens_used: totalTokens,
          processing_time_ms: Date.now() - startTime,
          status: "completed",
          completed_at: new Date().toISOString(),
        },
        { onConflict: "session_id" },
      );

    if (updateErr) {
      console.error("[report] DB 저장 실패:", updateErr.message);
    }

    // ── 9. 응답 ──

    return new Response(
      JSON.stringify({
        status: "completed",
        session_id,
        model,
        final_level: finalLevel,
        target_level: targetGrade,
        total_tokens: totalTokens,
        total_time_ms: Date.now() - startTime,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[report] 오류:", message);

    try {
      const b = await req.clone().json().catch(() => ({}));
      if (b.session_id) {
        const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await sb
          .from("mock_test_reports")
          .update({ status: "failed" })
          .eq("session_id", b.session_id);
      }
    } catch {
      /* 무시 */
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
