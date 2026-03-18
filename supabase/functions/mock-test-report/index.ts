// mock-test-report — Stage C Edge Function
// 평가엔진 7-Step 실행 + FACT 점수 + GPT 종합 리포트 (~45초)
// mock-test-eval-coach에서 전체 평가 완료 시 fire-and-forget으로 호출
// 9섹션 JSON + task_fulfillment 집계 + tutoring_prescription 자동 변환

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  runRuleEngine,
  DEFAULT_PARAMS,
  type RuleEngineParams,
  type EvaluationInput,
  type AggregatedCheckboxes,
} from "../_shared/rule-engine.ts";
import { VALID_DRILL_TAGS } from "../_shared/question-type-map.ts";

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

// 문항별 요약 — 설계서 §3-5 question_summaries 포맷
interface QuestionSummaryInput {
  question_number: number;
  question_type: string;
  question_english: string;
  checkbox_type: string;
  pass_count: number;
  fail_count: number;
  pass_rate: number;
  transcript: string;
  wpm: number;
  filler_count: number;
  long_pause_count: number;
  audio_duration: number;
  word_count: number;
  skipped: boolean;
  coaching_feedback: Record<string, unknown> | null;
  task_fulfillment: Record<string, unknown> | null;
  feedback_branch: string | null;
  priority_prescription: Array<Record<string, string>> | null;
  pronunciation_assessment: Record<string, number> | null;
}

function generateQuestionSummaries(inputs: QuestionSummaryInput[]): string {
  return inputs
    .map((e) => {
      const qTitle = `## Q${e.question_number} (${e.question_type}) — ${(e.question_english || "").slice(0, 50)}`;

      if (e.skipped) {
        return `${qTitle}\n- SKIPPED (feedback_branch=${e.feedback_branch || "failed"})`;
      }

      const lines: string[] = [qTitle];

      // 과제충족
      if (e.task_fulfillment) {
        const tf = e.task_fulfillment;
        const rate = Math.round(((tf.completion_rate as number) || 0) * 100);
        lines.push(`- 과제충족: ${tf.status} (${rate}%)`);
        lines.push(`- 체크리스트: 🔴필수 ${tf.required_pass || 0}/${tf.required_total || 0}, 🟡심화 ${tf.advanced_pass || 0}/${tf.advanced_total || 0}`);
        if (tf.reason) lines.push(`- 판정근거: ${tf.reason}`);
      }
      lines.push(`- 피드백분기: ${e.feedback_branch || "fulfilled"}`);

      // 최우선처방
      if (e.priority_prescription && e.priority_prescription.length > 0) {
        lines.push(`- 최우선처방: ${e.priority_prescription[0].action}`);
      }

      // 핵심교정
      const cf = e.coaching_feedback as Record<string, unknown> | null;
      if (cf) {
        const corrections = cf.key_corrections as Array<Record<string, unknown>> | undefined;
        if (corrections && corrections.length > 0) {
          const c = corrections[0];
          lines.push(`- 핵심교정: ${c.original || ""} → ${c.corrected || ""}`);
        }
        // 구조진단
        const structure = cf.structure_evaluation as Record<string, unknown> | undefined;
        if (structure && structure.structure_label) {
          lines.push(`- 구조진단: ${structure.structure_label}`);
        }
      }

      // 답변 통계
      lines.push(`- 답변시간: ${e.audio_duration || 0}초 / 단어: ${e.word_count || 0} / WPM: ${e.wpm || 0}`);

      // 발음
      const pa = e.pronunciation_assessment;
      if (pa) {
        lines.push(`- 발음: 정확도${pa.accuracy_score || 0}/유창성${pa.fluency_score || 0}/운율${pa.prosody_score || 0}`);
      }

      // 필러/침묵
      lines.push(`- 필러: ${e.filler_count || 0}회 / 침묵3초+: ${e.long_pause_count || 0}회`);

      // 발화요약 (150단어 제한)
      if (e.transcript) {
        const words = e.transcript.split(/\s+/).slice(0, 150).join(" ");
        lines.push(`- 발화요약: ${words}`);
      }

      return lines.join("\n");
    })
    .join("\n\n");
}

// feedback_branch 집계 (종합 리포트용)
function aggregateFeedbackBranches(
  evaluations: Array<{
    feedback_branch: string | null;
    skipped: boolean;
    task_fulfillment: Record<string, unknown> | null;
  }>,
): { fulfilled: number; partial: number; failed: number; skipped: number; avgCompletionRate: number } {
  let fulfilled = 0, partial = 0, failed = 0, skipped = 0;
  let totalRate = 0, rateCount = 0;

  for (const e of evaluations) {
    if (e.skipped) { skipped++; continue; }
    const branch = e.feedback_branch || "fulfilled";
    if (branch === "fulfilled") fulfilled++;
    else if (branch === "partial") partial++;
    else failed++;

    if (e.task_fulfillment) {
      const rate = (e.task_fulfillment.completion_rate as number) || 0;
      totalRate += rate;
      rateCount++;
    }
  }

  return {
    fulfilled,
    partial,
    failed,
    skipped,
    avgCompletionRate: rateCount > 0 ? Math.round((totalRate / rateCount) * 100) : 0,
  };
}

// tutoring_prescription 자동 변환 — 설계서 §3-8a
// GPT 응답(top3_priorities, question_type_map, recurring_patterns)에서 추출
function buildTutoringPrescription(
  coachingReport: Record<string, unknown>,
): Record<string, unknown> {
  const top3 = (coachingReport.top3_priorities || []) as Array<Record<string, unknown>>;
  const typeMap = (coachingReport.question_type_map || []) as Array<Record<string, unknown>>;
  const patterns = (coachingReport.recurring_patterns || []) as Array<Record<string, unknown>>;

  // 1. priority_weaknesses: top3에서 직접 추출
  const priority_weaknesses = top3.map((p) => ({
    rank: p.rank,
    area: p.area,
    drill_tag: VALID_DRILL_TAGS.has(p.drill_tag as string) ? p.drill_tag : null,
  }));

  // 2. error_drill_tags: recurring_patterns에서 추출 (중복 제거)
  const error_drill_tags = [
    ...new Set(
      patterns
        .map((p) => p.drill_tag as string)
        .filter((t) => t && VALID_DRILL_TAGS.has(t)),
    ),
  ];

  // 3. weak_types: question_type_map에서 weak/very_weak 추출
  const weak_types = typeMap
    .filter((t) => t.status === "weak" || t.status === "very_weak")
    .sort((a, b) => (a.status === "very_weak" ? 0 : 1) - (b.status === "very_weak" ? 0 : 1))
    .map((t) => t.type as string);

  // 4. training_order: priority=true인 타입
  const training_order = typeMap
    .filter((t) => t.priority === true)
    .map((t) => t.type as string);

  // 5. must_fix_for_next_grade: top3의 drill_tag
  const must_fix_for_next_grade = top3
    .map((p) => p.drill_tag as string)
    .filter((t) => t && VALID_DRILL_TAGS.has(t));

  return {
    priority_weaknesses,
    error_drill_tags,
    weak_types,
    training_order,
    must_fix_for_next_grade,
  };
}

// ── 성장 리포트 생성 (2회차부터) ──
// deno-lint-ignore no-explicit-any
async function generateGrowthReport(
  supabase: any,
  sessionId: string,
  userId: string,
  finalLevel: string,
  factScores: { score_f: number; score_a: number; score_c: number; score_t: number; total_score: number },
  // deno-lint-ignore no-explicit-any
  evaluations: any[],
  gptConfig?: { model?: string; temperature?: number; max_tokens?: number },
): Promise<void> {
  // 이전 세션들의 리포트 조회 (현재 세션 제외, 최신순)
  const { data: prevReports } = await supabase
    .from("mock_test_reports")
    .select("session_id, final_level, total_score, score_f, score_a, score_c, score_t")
    .eq("user_id", userId)
    .neq("session_id", sessionId)
    .eq("report_status", "completed")
    .order("created_at", { ascending: false })
    .limit(10);

  if (!prevReports || prevReports.length === 0) {
    // 1회차: 성장 리포트 미생성 (비교 대상 없음)
    // 단, 1회차용 기본 비교 데이터는 저장 (question_type 분포)
    const typeComparison = buildTypeComparison(evaluations, null);
    await supabase
      .from("mock_test_reports")
      .update({
        growth_comparison: {
          previous_session_id: null,
          previous_level: null,
          previous_total_score: null,
          previous_score_f: null,
          previous_score_a: null,
          previous_score_c: null,
          previous_score_t: null,
          level_change: null,
          level_diff: 0,
          score_diff: 0,
          score_f_diff: 0,
          score_a_diff: 0,
          score_c_diff: 0,
          score_t_diff: 0,
          session_count: 1,
          type_comparison: typeComparison,
        },
      })
      .eq("session_id", sessionId);
    return;
  }

  const prev = prevReports[0];
  const sessionCount = prevReports.length + 1;

  // ② 규칙 기반 변화 데이터 계산
  const LEVEL_ORDER: Record<string, number> = {
    NH: 1, IL: 2, IM1: 3, IM2: 4, IM3: 5, IH: 6, AL: 7,
  };
  const currOrder = LEVEL_ORDER[finalLevel] || 0;
  const prevOrder = LEVEL_ORDER[prev.final_level] || 0;
  const levelChange = currOrder > prevOrder ? "up" : currOrder < prevOrder ? "down" : "same";

  // 이전 세션의 평가 데이터도 조회 (question_type 비교용)
  const { data: prevEvals } = await supabase
    .from("mock_test_evaluations")
    .select("question_type, pass_rate, skipped")
    .eq("session_id", prev.session_id);

  const typeComparison = buildTypeComparison(evaluations, prevEvals);

  const growthComparison = {
    previous_session_id: prev.session_id,
    previous_level: prev.final_level,
    previous_total_score: Number(prev.total_score) || 0,
    previous_score_f: Number(prev.score_f) || 0,
    previous_score_a: Number(prev.score_a) || 0,
    previous_score_c: Number(prev.score_c) || 0,
    previous_score_t: Number(prev.score_t) || 0,
    level_change: levelChange,
    level_diff: currOrder - prevOrder,
    score_diff: Math.round((factScores.total_score - (Number(prev.total_score) || 0)) * 10) / 10,
    score_f_diff: Math.round((factScores.score_f - (Number(prev.score_f) || 0)) * 10) / 10,
    score_a_diff: Math.round((factScores.score_a - (Number(prev.score_a) || 0)) * 10) / 10,
    score_c_diff: Math.round((factScores.score_c - (Number(prev.score_c) || 0)) * 10) / 10,
    score_t_diff: Math.round((factScores.score_t - (Number(prev.score_t) || 0)) * 10) / 10,
    session_count: sessionCount,
    type_comparison: typeComparison,
  };

  // ①③④⑥⑦ GPT 성장 리포트 생성 (gpt-4.1-mini — 비용 절감)
  const growthPrompt = buildGrowthPrompt(
    finalLevel,
    factScores,
    prev,
    growthComparison,
    sessionCount,
    typeComparison,
  );

  const gptResp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: gptConfig?.model || "gpt-4.1-mini",
      temperature: gptConfig?.temperature ?? 0.5,
      max_tokens: gptConfig?.max_tokens || 3000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `당신은 OPIc 시험 전문 분석가입니다. 학습자의 모의고사 성장 데이터를 분석하여 동기부여와 구체적인 처방을 제공합니다.
반드시 JSON으로 응답하세요. 한국어로 작성하되, FACT/INT/ADV/AL 같은 내부 용어는 사용하지 마세요.
학습자 눈높이의 친근하고 격려하는 톤으로 작성하세요.`,
        },
        { role: "user", content: growthPrompt },
      ],
    }),
  });

  if (!gptResp.ok) {
    throw new Error(`성장 리포트 GPT 실패: ${gptResp.status}`);
  }

  const gptJson = await gptResp.json();
  const content = gptJson.choices?.[0]?.message?.content || "{}";
  let growthAnalysis: Record<string, unknown>;
  try {
    growthAnalysis = JSON.parse(content);
  } catch {
    growthAnalysis = {};
  }

  // 성장 패턴 감지 (Phase D)
  if (sessionCount >= 3) {
    const pattern = detectGrowthPattern(factScores, finalLevel, prevReports);
    if (pattern) {
      growthAnalysis.growth_pattern = pattern.pattern;
      growthAnalysis.pattern_message = pattern.message;
    }
  }

  // DB 저장
  await supabase
    .from("mock_test_reports")
    .update({
      growth_summary: growthAnalysis.summary || null,
      growth_comparison: growthComparison,
      growth_analysis: growthAnalysis,
    })
    .eq("session_id", sessionId);
}

// question_type별 pass_rate 집계 (현재 vs 이전)
// deno-lint-ignore no-explicit-any
function buildTypeComparison(currentEvals: any[], prevEvals: any[] | null) {
  // 현재 세션 집계
  const currentMap = new Map<string, { total: number; sumRate: number }>();
  for (const e of currentEvals) {
    if (e.skipped) continue;
    const qt = e.question_type || "unknown";
    const entry = currentMap.get(qt) || { total: 0, sumRate: 0 };
    entry.total++;
    entry.sumRate += Number(e.pass_rate) || 0;
    currentMap.set(qt, entry);
  }

  // 이전 세션 집계
  const prevMap = new Map<string, { total: number; sumRate: number }>();
  if (prevEvals) {
    for (const e of prevEvals) {
      if (e.skipped) continue;
      const qt = e.question_type || "unknown";
      const entry = prevMap.get(qt) || { total: 0, sumRate: 0 };
      entry.total++;
      entry.sumRate += Number(e.pass_rate) || 0;
      prevMap.set(qt, entry);
    }
  }

  const result: Array<{
    type: string;
    current_pass_rate: number;
    previous_pass_rate: number | null;
    change: number | null;
    current_count: number;
  }> = [];

  for (const [type, data] of currentMap.entries()) {
    const avgCurr = Math.round((data.sumRate / data.total) * 100) / 100;
    const prevData = prevMap.get(type);
    const avgPrev = prevData ? Math.round((prevData.sumRate / prevData.total) * 100) / 100 : null;
    result.push({
      type,
      current_pass_rate: avgCurr,
      previous_pass_rate: avgPrev,
      change: avgPrev != null ? Math.round((avgCurr - avgPrev) * 100) / 100 : null,
      current_count: data.total,
    });
  }

  return result.sort((a, b) => a.type.localeCompare(b.type));
}

// GPT 성장 리포트 프롬프트 생성
function buildGrowthPrompt(
  finalLevel: string,
  factScores: { score_f: number; score_a: number; score_c: number; score_t: number; total_score: number },
  // deno-lint-ignore no-explicit-any
  prev: any,
  // deno-lint-ignore no-explicit-any
  comparison: any,
  sessionCount: number,
  // deno-lint-ignore no-explicit-any
  typeComparison: any[],
): string {
  const typeStr = typeComparison
    .map((t) => {
      const change = t.change != null ? ` (변화: ${t.change > 0 ? "+" : ""}${(t.change * 100).toFixed(0)}%p)` : " (첫 응시)";
      return `  ${t.type}: 달성률 ${(t.current_pass_rate * 100).toFixed(0)}%${change} [${t.current_count}문항]`;
    })
    .join("\n");

  // 병목 감지 (가장 낮은 FACT)
  const facts = [
    { key: "F", label: "말하기흐름", score: factScores.score_f, diff: comparison.score_f_diff },
    { key: "A", label: "문법정확성", score: factScores.score_a, diff: comparison.score_a_diff },
    { key: "C", label: "내용풍부도", score: factScores.score_c, diff: comparison.score_c_diff },
    { key: "T", label: "질문수행력", score: factScores.score_t, diff: comparison.score_t_diff },
  ];
  const bottleneck = facts.reduce((min, f) => f.score < min.score ? f : min);

  return `## 학습자 모의고사 성장 데이터 (${sessionCount}회차)

### 현재 결과
- 예상 등급: ${finalLevel}
- 총점: ${factScores.total_score.toFixed(1)}/100
- 말하기흐름(F): ${factScores.score_f.toFixed(1)} (${comparison.score_f_diff > 0 ? "+" : ""}${comparison.score_f_diff.toFixed(1)})
- 문법정확성(A): ${factScores.score_a.toFixed(1)} (${comparison.score_a_diff > 0 ? "+" : ""}${comparison.score_a_diff.toFixed(1)})
- 내용풍부도(C): ${factScores.score_c.toFixed(1)} (${comparison.score_c_diff > 0 ? "+" : ""}${comparison.score_c_diff.toFixed(1)})
- 질문수행력(T): ${factScores.score_t.toFixed(1)} (${comparison.score_t_diff > 0 ? "+" : ""}${comparison.score_t_diff.toFixed(1)})

### 이전 결과
- 예상 등급: ${prev.final_level}
- 총점: ${Number(prev.total_score).toFixed(1)}/100
- F: ${Number(prev.score_f).toFixed(1)} / A: ${Number(prev.score_a).toFixed(1)} / C: ${Number(prev.score_c).toFixed(1)} / T: ${Number(prev.score_t).toFixed(1)}

### 등급 변화
- ${comparison.level_change === "up" ? "상승" : comparison.level_change === "down" ? "하락" : "유지"} (${comparison.level_diff > 0 ? "+" : ""}${comparison.level_diff}단계)
- 점수 변화: ${comparison.score_diff > 0 ? "+" : ""}${comparison.score_diff.toFixed(1)}

### 병목 영역
- ${bottleneck.label} (${bottleneck.score.toFixed(1)}점, 4영역 중 최저)

### 유형별 달성률
${typeStr}

---

아래 JSON 형식으로 분석해주세요:

{
  "summary": "① 한 줄 요약 (30자 내외, 핵심 변화 + 의미)",
  "level_change_reason": "③ 등급이 왜 올랐는지/유지됐는지/내려갔는지 원인 분석 (2~3문장)",
  "fact_comments": {
    "F": "④ 말하기흐름 변화 해석 (숫자가 아닌 의미 설명)",
    "A": "④ 문법정확성 변화 해석",
    "C": "④ 내용풍부도 변화 해석",
    "T": "④ 질문수행력 변화 해석"
  },
  "bottleneck": {
    "primary": "${bottleneck.key}",
    "reason": "⑥ 왜 이 영역이 다음 등급을 막는 병목인지 설명"
  },
  "recommended_actions": [
    { "priority": 1, "action": "⑦ 이번 주 반드시 할 것 (가장 중요)", "training_type": "epp|forced_variation|timed_practice|self_repair 중 택1" },
    { "priority": 2, "action": "⑦ 다음 모의고사 전에 할 것", "training_type": "..." },
    { "priority": 3, "action": "⑦ 시험장에서 주의할 점", "training_type": "..." }
  ]
}`;
}

// Phase D: 성장 패턴 감지 (3회차+)
function detectGrowthPattern(
  currentFact: { score_f: number; score_a: number; score_c: number; score_t: number },
  currentLevel: string,
  // deno-lint-ignore no-explicit-any
  prevReports: any[],
): { pattern: string; message: string } | null {
  if (prevReports.length < 2) return null;

  const prev1 = prevReports[0]; // 직전
  const prev2 = prevReports[1]; // 2회 전

  const fTrend = currentFact.score_f - Number(prev2.score_f || 0);
  const aTrend = currentFact.score_a - Number(prev2.score_a || 0);
  const cTrend = currentFact.score_c - Number(prev2.score_c || 0);
  const tTrend = currentFact.score_t - Number(prev2.score_t || 0);

  // 패턴 1: F 빠른 상승 + C 느린 상승
  if (fTrend > 3 && cTrend < 1.5 && currentFact.score_c < currentFact.score_f) {
    return {
      pattern: "f_fast_c_slow",
      message: "자연스러운 초기 성장 패턴이에요. 이제부터는 '길게 말하기'보다 '구체적으로 말하기'가 중요합니다.",
    };
  }

  // 패턴 2: T 급상승 후 흔들림
  const tPrev = Number(prev1.score_t || 0);
  const tPrev2 = Number(prev2.score_t || 0);
  if (tPrev - tPrev2 > 5 && currentFact.score_t < tPrev) {
    return {
      pattern: "t_unstable",
      message: "질문수행력이 크게 올랐지만 아직 안정화가 필요해요. 압박 환경에서 연습하면 더 견고해집니다.",
    };
  }

  // 패턴 3: A plateau (화석화)
  if (Math.abs(aTrend) < 1 && currentFact.score_a < 7) {
    return {
      pattern: "a_plateau",
      message: "반복되는 문법 패턴이 굳어지고 있어요. 집중 교정 훈련으로 돌파할 수 있습니다.",
    };
  }

  // 패턴 4: 등급 정체 + FACT 상승
  const totalTrend = (fTrend + aTrend + cTrend + tTrend) / 4;
  if (
    totalTrend > 2 &&
    prev1.final_level === currentLevel &&
    prev2.final_level === prev1.final_level
  ) {
    return {
      pattern: "score_up_level_same",
      message: "등급은 유지됐지만 실력은 확실히 성장했어요. 다음 등급에 충분히 가까워졌습니다.",
    };
  }

  return null;
}

// GPT 종합 리포트 생성
async function generateGPTReport(
  systemPrompt: string,
  userPrompt: string,
  modelOverride?: string,
  temperatureOverride?: number,
  maxTokensOverride?: number,
): Promise<{ result: Record<string, unknown>; tokensUsed: number }> {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: modelOverride || "gpt-4.1",
      temperature: temperatureOverride ?? 0.4,
      max_tokens: maxTokensOverride || 12000,
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

  // 인증: --no-verify-jwt 배포 — eval-coach EF에서 service_role_key로 호출
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

    // ── 개별 평가 + 답변 + 질문 병렬 조회 ──
    const [evalResult, answersResult, questionsResult] = await Promise.all([
      supabase
        .from("mock_test_evaluations")
        .select(
          "question_number, question_type, checkbox_type, checkboxes, " +
          "pass_count, fail_count, pass_rate, transcript, wpm, " +
          "filler_count, long_pause_count, pronunciation_assessment, skipped, " +
          "coaching_feedback, task_fulfillment, feedback_branch, priority_prescription",
        )
        .eq("session_id", session_id)
        .order("question_number"),
      supabase
        .from("mock_test_answers")
        .select("question_number, audio_duration, word_count")
        .eq("session_id", session_id)
        .order("question_number"),
      supabase
        .from("questions")
        .select("id, question_english")
        .in("id", session.question_ids || []),
    ]);

    if (evalResult.error) {
      throw new Error(`평가 결과 조회 실패: ${evalResult.error.message}`);
    }
    const evaluations = evalResult.data || [];
    if (evaluations.length === 0) {
      throw new Error("평가 결과가 없습니다");
    }

    // answers → question_number별 인덱스
    const answersMap = new Map<number, { audio_duration: number; word_count: number }>();
    for (const a of answersResult.data || []) {
      answersMap.set(a.question_number, {
        audio_duration: Number(a.audio_duration) || 0,
        word_count: a.word_count || 0,
      });
    }

    // questions → question_id별 question_english
    const questionIds = session.question_ids || [];
    const questionsMap = new Map<string, string>();
    for (const q of questionsResult.data || []) {
      questionsMap.set(q.id, q.question_english || "");
    }
    // question_number → question_english (Q1=index 0, Q2=index 1, ...)
    const getQuestionEnglish = (qNum: number): string => {
      const qId = questionIds[qNum - 1]; // question_number는 1-based
      return qId ? (questionsMap.get(qId) || "") : "";
    };

    // ── 평가엔진 파라미터 로드 (DB → 기본값 폴백) ──
    let ruleParams: RuleEngineParams = DEFAULT_PARAMS;
    // deno-lint-ignore no-explicit-any
    let configRow: any = null;
    try {
      const { data } = await supabase
        .from("mock_test_eval_settings")
        .select("*")
        .eq("id", 1)
        .single();
      configRow = data;

      if (configRow) {
        // DB에서 평가엔진 파라미터 오버라이드
        ruleParams = {
          checkbox_pass_threshold: Number(configRow.re_checkbox_pass_threshold) || DEFAULT_PARAMS.checkbox_pass_threshold,
          floor_nh: Number(configRow.re_floor_nh) || DEFAULT_PARAMS.floor_nh,
          floor_il: Number(configRow.re_floor_il) || DEFAULT_PARAMS.floor_il,
          floor_im1: Number(configRow.re_floor_im1) || DEFAULT_PARAMS.floor_im1,
          floor_im2: Number(configRow.re_floor_im2) || DEFAULT_PARAMS.floor_im2,
          ceiling_broke_down: Number(configRow.re_ceiling_broke_down) || DEFAULT_PARAMS.ceiling_broke_down,
          ceiling_respond: Number(configRow.re_ceiling_respond) || DEFAULT_PARAMS.ceiling_respond,
          sympathetic_low: Number(configRow.re_sympathetic_low) || DEFAULT_PARAMS.sympathetic_low,
          sympathetic_mid: Number(configRow.re_sympathetic_mid) || DEFAULT_PARAMS.sympathetic_mid,
          sympathetic_at_times: Number(configRow.re_sympathetic_at_times) || DEFAULT_PARAMS.sympathetic_at_times,
          sympathetic_pron_weight: Number(configRow.re_sympathetic_pron_weight) || DEFAULT_PARAMS.sympathetic_pron_weight,
          al_pass_threshold: Number(configRow.re_al_pass_threshold) || DEFAULT_PARAMS.al_pass_threshold,
          q12_gatekeeper_threshold: Number(configRow.re_q12_gatekeeper_threshold) || DEFAULT_PARAMS.q12_gatekeeper_threshold,
        };
      }
    } catch {
      // 기본값 사용
    }

    // ── 평가엔진 입력 변환 ──
    const ruleInputs: EvaluationInput[] = evaluations.map((e) => ({
      question_number: e.question_number,
      question_type: e.question_type || "",
      checkbox_type: (e.checkbox_type || "ADV") as "INT" | "ADV" | "AL",
      checkboxes: (e.checkboxes as Record<string, { pass: boolean; evidence?: string }>) || {},
      skipped: e.skipped || false,
      pronunciation_assessment: e.pronunciation_assessment as EvaluationInput["pronunciation_assessment"],
    }));

    // ── Step 0-7: 평가엔진 실행 ──
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
        totalAccuracy += Number(pa.accuracy_score);
        totalProsody += Number(pa.prosody_score) || 0;
        totalFluency += Number(pa.fluency_score) || 0;
        pronCount++;
      }
    }
    const avgAccuracy = pronCount > 0 ? Math.round(totalAccuracy / pronCount * 10) / 10 : 0;
    const avgProsody = pronCount > 0 ? Math.round(totalProsody / pronCount * 10) / 10 : 0;
    const avgFluency = pronCount > 0 ? Math.round(totalFluency / pronCount * 10) / 10 : 0;

    // ── 추가 변수 계산 (§3-5) ──
    let totalDuration = 0, totalWordCount = 0, totalFiller = 0, totalLongPause = 0;
    let validAnswerCount = 0;
    for (const e of evaluations) {
      if (e.skipped) continue;
      const ans = answersMap.get(e.question_number);
      totalDuration += ans?.audio_duration || 0;
      totalWordCount += ans?.word_count || 0;
      totalFiller += e.filler_count || 0;
      totalLongPause += e.long_pause_count || 0;
      validAnswerCount++;
    }
    const avgDurationSec = validAnswerCount > 0 ? Math.round(totalDuration / validAnswerCount) : 0;
    const avgWordCount = validAnswerCount > 0 ? Math.round(totalWordCount / validAnswerCount) : 0;

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

    // ── reports INSERT (평가엔진 결과 + FACT 점수) ──
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
        // question_summaries 데이터 구성
        const evalData: QuestionSummaryInput[] = evaluations.map((e) => {
          const ans = answersMap.get(e.question_number);
          return {
            question_number: e.question_number,
            question_type: e.question_type || "",
            question_english: getQuestionEnglish(e.question_number),
            checkbox_type: e.checkbox_type || "",
            pass_count: e.pass_count || 0,
            fail_count: e.fail_count || 0,
            pass_rate: Number(e.pass_rate) || 0,
            transcript: e.transcript || "",
            wpm: Number(e.wpm) || 0,
            filler_count: e.filler_count || 0,
            long_pause_count: e.long_pause_count || 0,
            audio_duration: ans?.audio_duration || 0,
            word_count: ans?.word_count || 0,
            skipped: e.skipped || false,
            coaching_feedback: (e.coaching_feedback as Record<string, unknown>) || null,
            task_fulfillment: (e.task_fulfillment as Record<string, unknown>) || null,
            feedback_branch: (e.feedback_branch as string) || null,
            priority_prescription: (e.priority_prescription as Array<Record<string, string>>) || null,
            pronunciation_assessment: (e.pronunciation_assessment as Record<string, number>) || null,
          };
        });

        const questionSummaries = generateQuestionSummaries(evalData);
        const branchStats = aggregateFeedbackBranches(evalData);

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
          // 추가 변수 (§3-5)
          task_fulfillment_summary: `충족 ${branchStats.fulfilled}, 부분충족 ${branchStats.partial}, 실패 ${branchStats.failed}, 스킵 ${branchStats.skipped}`,
          skip_count: branchStats.skipped,
          avg_duration_sec: avgDurationSec,
          avg_word_count: avgWordCount,
          total_filler_count: totalFiller,
          total_long_pause_count: totalLongPause,
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

        // GPT 호출 (DB 설정 오버라이드)
        const gptResponse = await withRetry(
          () => generateGPTReport(
            systemPrompt,
            userPrompt,
            configRow?.report_model || undefined,
            configRow?.report_temperature != null ? Number(configRow.report_temperature) : undefined,
            configRow?.report_max_tokens || undefined,
          ),
          2,
          "GPT 종합 리포트",
        );
        reportResult = gptResponse.result;
        reportTokens = gptResponse.tokensUsed;
      }
    } catch (gptErr) {
      console.error("GPT 리포트 생성 실패 (평가엔진 결과는 저장됨):", gptErr);
    }

    // ── reports UPDATE (GPT 리포트 결과) ──
    const updateData: Record<string, unknown> = {
      report_status: "completed",
      coaching_report: reportResult,
    };

    // recurring_patterns → recurring_mistakes 컬럼 (하위 호환)
    if (reportResult.recurring_patterns) {
      updateData.recurring_mistakes = reportResult.recurring_patterns;
    }

    // snapshot.headline → overall_comments_ko
    const snapshot = reportResult.snapshot as Record<string, unknown> | undefined;
    if (snapshot?.headline) {
      updateData.overall_comments_ko = snapshot.headline;
    }

    // training_recommendation → training_recommendations
    if (reportResult.training_recommendation) {
      updateData.training_recommendations = reportResult.training_recommendation;
    }

    // tutoring_prescription 자동 변환 (§3-8a)
    if (reportResult.top3_priorities) {
      updateData.tutoring_prescription = buildTutoringPrescription(reportResult);
    }

    // avg_completion_rate 저장
    const branchStatsForSave = aggregateFeedbackBranches(
      evaluations.map((e) => ({
        feedback_branch: (e.feedback_branch as string) || null,
        skipped: e.skipped || false,
        task_fulfillment: (e.task_fulfillment as Record<string, unknown>) || null,
      })),
    );
    updateData.avg_completion_rate = branchStatsForSave.avgCompletionRate;

    await supabase
      .from("mock_test_reports")
      .update(updateData)
      .eq("session_id", session_id);

    // ── 성장 리포트 생성 (2회차부터) ──
    try {
      await generateGrowthReport(
        supabase,
        session_id,
        session.user_id,
        ruleResult.final_level,
        ruleResult.fact_scores,
        evaluations,
        configRow ? {
          model: configRow.growth_model || undefined,
          temperature: configRow.growth_temperature != null ? Number(configRow.growth_temperature) : undefined,
          max_tokens: configRow.growth_max_tokens || undefined,
        } : undefined,
      );
    } catch (growthErr) {
      // 성장 리포트 실패는 전체 프로세스를 중단하지 않음
      console.error("성장 리포트 생성 실패 (무시):", growthErr);
    }

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
