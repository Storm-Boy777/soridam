// V7 규칙엔진 — OPIc 등급 판정 + FACT 점수 계산
// 소리담 v7RuleEngine.ts 이관 (~1,437줄 → 간결화)
// 7-Step: 체크박스 집계 → Floor → Ceiling → Sympathetic → Q12 → AL → 최종 등급

import {
  INT_18_IDS,
  INT_20_IDS,
  ADV_38_IDS,
  ADV_42_IDS,
  AL_14_IDS,
  AL_15_IDS,
  ADV_5_IDS,
  ADV_4_IDS,
  AL_GATEKEEPER_IDS,
  INT_2_CUMULATIVE,
  ADV_2_SP_CUMULATIVE,
  FACT_CHECKBOX_MAP,
  getCheckboxIdsForQuestionType,
  type CheckboxResult,
} from "./checkbox-definitions.ts";

// ============================================================
// 타입 정의
// ============================================================

export interface RuleEngineParams {
  checkbox_pass_threshold: number; // 0.80
  floor_nh: number;                // 0.45
  floor_il: number;                // 0.65
  floor_im1: number;               // 0.75
  floor_im2: number;               // 0.95
  ceiling_broke_down: number;       // 0.70
  ceiling_respond: number;          // 0.90
  sympathetic_low: number;          // 50
  sympathetic_mid: number;          // 70
  sympathetic_at_times: number;     // 85
  al_pass_threshold: number;        // 0.70
  q12_gatekeeper_threshold: number; // 0.50
  sympathetic_pron_weight: number;  // 0.60
}

export const DEFAULT_PARAMS: RuleEngineParams = {
  checkbox_pass_threshold: 0.80,
  floor_nh: 0.45,
  floor_il: 0.65,
  floor_im1: 0.75,
  floor_im2: 0.95,
  ceiling_broke_down: 0.70,
  ceiling_respond: 0.90,
  sympathetic_low: 50,
  sympathetic_mid: 70,
  sympathetic_at_times: 85,
  al_pass_threshold: 0.70,
  q12_gatekeeper_threshold: 0.50,
  sympathetic_pron_weight: 0.60,
};

export interface EvaluationInput {
  question_number: number;
  question_type: string;
  checkbox_type: "INT" | "ADV" | "AL";
  checkboxes: Record<string, CheckboxResult>;
  skipped: boolean;
  pronunciation_assessment?: {
    accuracy_score?: number;
    prosody_score?: number;
    fluency_score?: number;
  } | null;
}

interface AggregatedCheckbox {
  pass_count: number;
  total: number;
  pass_rate: number;
  final_pass: boolean;
}

export interface AggregatedCheckboxes {
  [checkboxId: string]: AggregatedCheckbox;
}

interface FloorResult {
  level: string;
  status: string;
}

interface CeilingResult {
  status: string;
  performance: string;
}

export interface FACTScores {
  score_f: number;
  score_a: number;
  score_c: number;
  score_t: number;
  total_score: number;
}

export interface RuleEngineResult {
  final_level: string;
  floor_status: string;
  floor_level: string;
  ceiling_status: string;
  sympathetic_listener: string;
  q12_gatekeeper: string;
  al_judgment: string;
  int_pass_rate: number;
  adv_pass_rate: number;
  al_pass_rate: number;
  valid_question_count: number;
  skipped_questions: number[];
  aggregated_int_checkboxes: AggregatedCheckboxes;
  aggregated_adv_checkboxes: AggregatedCheckboxes;
  aggregated_al_checkboxes: AggregatedCheckboxes;
  fact_scores: FACTScores;
}

// ============================================================
// Step 1: 체크박스 집계 (누적 로직 적용)
// ============================================================

function aggregateCheckboxes(
  evaluations: EvaluationInput[],
  params: RuleEngineParams,
): {
  intCheckboxes: AggregatedCheckboxes;
  advCheckboxes: AggregatedCheckboxes;
  alCheckboxes: AggregatedCheckboxes;
  intPassRate: number;
  advPassRate: number;
  alPassRate: number;
} {
  // 체크박스별 집계 (pass 횟수 / 평가 횟수)
  const intAccum: Record<string, { pass: number; total: number }> = {};
  const advAccum: Record<string, { pass: number; total: number }> = {};
  const alAccum: Record<string, { pass: number; total: number }> = {};

  for (const eval_ of evaluations) {
    if (eval_.skipped) continue;

    const accumMap =
      eval_.checkbox_type === "INT"
        ? intAccum
        : eval_.checkbox_type === "ADV"
          ? advAccum
          : alAccum;

    for (const [id, result] of Object.entries(eval_.checkboxes)) {
      if (!accumMap[id]) accumMap[id] = { pass: 0, total: 0 };
      accumMap[id].total++;
      if (result.pass) accumMap[id].pass++;
    }
  }

  // final_pass 결정 (pass_rate >= threshold)
  function toAggregated(
    accum: Record<string, { pass: number; total: number }>,
  ): AggregatedCheckboxes {
    const result: AggregatedCheckboxes = {};
    for (const [id, data] of Object.entries(accum)) {
      const passRate = data.total > 0 ? data.pass / data.total : 0;
      result[id] = {
        pass_count: data.pass,
        total: data.total,
        pass_rate: passRate,
        final_pass: passRate >= params.checkbox_pass_threshold,
      };
    }
    return result;
  }

  const intCheckboxes = toAggregated(intAccum);
  const advCheckboxes = toAggregated(advAccum);
  const alCheckboxes = toAggregated(alAccum);

  // 누적 로직 적용
  applyCumulative(intCheckboxes, INT_2_CUMULATIVE, params.checkbox_pass_threshold);
  applyCumulative(advCheckboxes, ADV_2_SP_CUMULATIVE, params.checkbox_pass_threshold);

  // 전체 통과율 계산
  const intPassRate = computeOverallPassRate(intCheckboxes);
  const advPassRate = computeOverallPassRate(advCheckboxes);
  const alPassRate = computeOverallPassRate(alCheckboxes);

  return { intCheckboxes, advCheckboxes, alCheckboxes, intPassRate, advPassRate, alPassRate };
}

// 누적 로직: 상위 pass → 하위 자동 pass
function applyCumulative(
  checkboxes: AggregatedCheckboxes,
  cumulativeMap: Record<string, string[]>,
  threshold: number,
) {
  // 높은 것부터 처리
  for (const [highId, lowerIds] of Object.entries(cumulativeMap)) {
    if (checkboxes[highId]?.final_pass) {
      for (const lowId of lowerIds) {
        if (checkboxes[lowId] && !checkboxes[lowId].final_pass) {
          checkboxes[lowId].final_pass = true;
          // pass_rate도 threshold 이상으로 보정
          if (checkboxes[lowId].pass_rate < threshold) {
            checkboxes[lowId].pass_rate = threshold;
          }
        }
      }
    }
  }
}

// 전체 통과율: final_pass 비율
function computeOverallPassRate(checkboxes: AggregatedCheckboxes): number {
  const entries = Object.values(checkboxes);
  if (entries.length === 0) return 0;
  const passed = entries.filter((c) => c.final_pass).length;
  return passed / entries.length;
}

// ============================================================
// Step 2: Floor 판정 (INT 통과율 기반)
// ============================================================

function determineFloor(
  intPassRate: number,
  params: RuleEngineParams,
): FloorResult {
  if (intPassRate < params.floor_nh)
    return { level: "NH", status: "BELOW_MINIMUM" };
  if (intPassRate < params.floor_il)
    return { level: "IL", status: "UNSTABLE" };
  if (intPassRate < params.floor_im1)
    return { level: "IM1", status: "LOWER_RANGE" };
  if (intPassRate < params.floor_im2)
    return { level: "IM2", status: "STABLE" };
  return { level: "IM3", status: "UPPER_RANGE" };
}

// ============================================================
// Step 3: Ceiling 판정 (ADV 통과율 기반)
// ============================================================

function determineCeiling(
  advPassRate: number,
  params: RuleEngineParams,
): CeilingResult {
  if (advPassRate < params.ceiling_broke_down) {
    const performance = advPassRate < 0.50 ? "Random" : "Emerging";
    return { status: "BROKE_DOWN", performance };
  }
  if (advPassRate < params.ceiling_respond) {
    return { status: "RESPOND_NOT_SUSTAIN", performance: "Developing" };
  }
  return { status: "SUSTAIN_ADVANCED", performance: "Meets" };
}

// ============================================================
// Step 4: Sympathetic Listener 판정
// ============================================================

function determineSympathetic(
  avgPronScore: number,
  advCheckboxes: AggregatedCheckboxes,
  params: RuleEngineParams,
): string {
  // ADV-5 통과율 계산
  let adv5Pass = 0;
  let adv5Total = 0;
  for (const id of ADV_5_IDS) {
    if (advCheckboxes[id]) {
      adv5Total++;
      if (advCheckboxes[id].final_pass) adv5Pass++;
    }
  }
  const adv5PassRate = adv5Total > 0 ? adv5Pass / adv5Total : 0;

  // 복합 점수 = 발음평균 × weight + ADV-5통과율(0~100) × (1-weight)
  const weight = params.sympathetic_pron_weight;
  const compositeScore =
    avgPronScore * weight + adv5PassRate * 100 * (1 - weight);

  if (compositeScore < params.sympathetic_low) return "Required";
  if (compositeScore < params.sympathetic_mid) return "Required";
  if (compositeScore < params.sympathetic_at_times) return "Required_at_times";
  return "Not_required";
}

// ============================================================
// Step 5: Q12 게이트키퍼
// ============================================================

function checkQ12Gatekeeper(
  evaluations: EvaluationInput[],
  skippedQuestions: number[],
  advCheckboxes: AggregatedCheckboxes,
  params: RuleEngineParams,
): string {
  // Q12(suggest_alternatives) 스킵 여부
  if (skippedQuestions.includes(12)) return "SKIPPED";

  // Q12 평가가 없으면 SKIPPED 처리
  const q12Eval = evaluations.find(
    (e) => e.question_number === 12 && !e.skipped,
  );
  if (!q12Eval) return "SKIPPED";

  // ADV-4 통과율 확인
  let adv4Pass = 0;
  let adv4Total = 0;
  for (const id of ADV_4_IDS) {
    if (advCheckboxes[id]) {
      adv4Total++;
      if (advCheckboxes[id].final_pass) adv4Pass++;
    }
  }

  if (adv4Total === 0) return "SKIPPED";

  const adv4PassRate = adv4Pass / adv4Total;
  return adv4PassRate >= params.q12_gatekeeper_threshold ? "PASSED" : "FAILED";
}

// ============================================================
// Step 6: AL 판정
// ============================================================

function judgeAL(
  ceiling: CeilingResult,
  q12Gatekeeper: string,
  skippedQuestions: number[],
  alCheckboxes: AggregatedCheckboxes,
  alPassRate: number,
  params: RuleEngineParams,
): string {
  if (ceiling.status === "BROKE_DOWN") return "NOT_ELIGIBLE";
  if (q12Gatekeeper === "SKIPPED" || q12Gatekeeper === "FAILED")
    return "NOT_ELIGIBLE";
  if (skippedQuestions.includes(14) || skippedQuestions.includes(15))
    return "AL_FAILED_SKIP";

  // AL 게이트키퍼: 필수 체크박스 모두 pass
  const gatekeeperPassed = AL_GATEKEEPER_IDS.every(
    (id) => alCheckboxes[id]?.final_pass === true,
  );
  if (!gatekeeperPassed) return "AL_FAILED_GATEKEEPER";

  if (alPassRate >= params.al_pass_threshold) return "AL_CONFIRMED";
  return "AL_FAILED_SCORE";
}

// ============================================================
// Step 7: 최종 등급 결합
// ============================================================

const LEVEL_ORDER: Record<string, number> = {
  NH: 1, IL: 2, IM1: 3, IM2: 4, IM3: 5, IH: 6, AL: 7,
};

// 하향 매핑: IM3→IM2, IM2→IM1, IM1→IM1
function downgradeLevel(level: string): string {
  switch (level) {
    case "IM3": return "IM2";
    case "IM2": return "IM1";
    default: return level;
  }
}

function determineFinalLevel(
  floor: FloorResult,
  ceiling: CeilingResult,
  sympathetic: string,
  q12Gatekeeper: string,
  alJudgment: string,
  intPassRate: number,
  advPassRate: number,
): string {
  const floorLevel = floor.level;

  // NH/IL은 Floor만으로 결정
  if (floorLevel === "NH" || floorLevel === "IL") return floorLevel;

  // Q12 게이트키퍼 실패 → 최대 IM3
  if (q12Gatekeeper === "SKIPPED" || q12Gatekeeper === "FAILED") {
    let level = floorLevel;
    // ADV < 40%이면 하향
    if (advPassRate < 0.40) {
      level = downgradeLevel(level);
    }
    // IM3 캡
    if ((LEVEL_ORDER[level] || 0) > (LEVEL_ORDER["IM3"] || 0)) {
      level = "IM3";
    }
    return level;
  }

  // SUSTAIN_ADVANCED (ADV ≥ 90%)
  if (ceiling.status === "SUSTAIN_ADVANCED") {
    if (
      alJudgment === "AL_CONFIRMED" &&
      sympathetic === "Not_required" &&
      intPassRate >= 0.90
    ) {
      return "AL";
    }
    if (
      intPassRate >= 0.90 &&
      (sympathetic === "Required_at_times" || sympathetic === "Not_required")
    ) {
      return "IH";
    }
    return floorLevel;
  }

  // RESPOND_NOT_SUSTAIN (ADV 70~90%)
  if (ceiling.status === "RESPOND_NOT_SUSTAIN") {
    if (
      alJudgment === "AL_CONFIRMED" &&
      sympathetic === "Not_required" &&
      intPassRate >= 0.90
    ) {
      return "AL";
    }
    if (
      intPassRate >= 0.90 &&
      (sympathetic === "Required_at_times" || sympathetic === "Not_required")
    ) {
      return "IH";
    }
    return floorLevel;
  }

  // BROKE_DOWN (ADV < 70%) — Floor 유지
  if (advPassRate < 0.40) {
    return downgradeLevel(floorLevel);
  }
  return floorLevel;
}

// ============================================================
// FACT 점수 계산
// ============================================================

function computeRatioScore(
  allCheckboxes: AggregatedCheckboxes,
  checkboxIds: string[],
): number {
  let passed = 0;
  let total = 0;
  for (const id of checkboxIds) {
    if (allCheckboxes[id]) {
      total++;
      if (allCheckboxes[id].final_pass) passed++;
    }
  }
  if (total === 0) return 0;
  return Math.round((passed / total) * 10);
}

function computeTextTypeScore(
  allCheckboxes: AggregatedCheckboxes,
): number {
  // INT-2 계단식: INT-2-3=3점, INT-2-2=2점, INT-2-1=1점
  let int2Score = 0;
  if (allCheckboxes["INT-2-3"]?.final_pass) int2Score = 3;
  else if (allCheckboxes["INT-2-2"]?.final_pass) int2Score = 2;
  else if (allCheckboxes["INT-2-1"]?.final_pass) int2Score = 1;

  // ADV-2-SP 계단식: SP5=9, SP4=7, SP3=6, SP2=4, SP1=2
  let spScore = 0;
  if (allCheckboxes["ADV-2-SP5"]?.final_pass) spScore = 9;
  else if (allCheckboxes["ADV-2-SP4"]?.final_pass) spScore = 7;
  else if (allCheckboxes["ADV-2-SP3"]?.final_pass) spScore = 6;
  else if (allCheckboxes["ADV-2-SP2"]?.final_pass) spScore = 4;
  else if (allCheckboxes["ADV-2-SP1"]?.final_pass) spScore = 2;

  // 기본 점수 = 둘 중 높은 값, 최소 1
  let baseScore = Math.max(int2Score, spScore, 1);

  // CD 보정
  let cdPass = 0;
  let cdTotal = 0;
  for (const id of FACT_CHECKBOX_MAP.T_CD) {
    if (allCheckboxes[id]) {
      cdTotal++;
      if (allCheckboxes[id].final_pass) cdPass++;
    }
  }
  const cdRate = cdTotal > 0 ? cdPass / cdTotal : 0;
  if (cdRate >= 0.60) baseScore += 1;
  else if (cdRate < 0.30) baseScore -= 1;

  // clamp 1~10
  return Math.max(1, Math.min(10, baseScore));
}

export function computeFACTScores(
  intCheckboxes: AggregatedCheckboxes,
  advCheckboxes: AggregatedCheckboxes,
  _alCheckboxes: AggregatedCheckboxes,
  avgAccuracyScore: number,
  validQuestionCount: number,
): FACTScores {
  // INT + ADV + AL 체크박스 통합 (FACT 매핑은 INT/ADV만 사용)
  const allCheckboxes: AggregatedCheckboxes = {
    ...intCheckboxes,
    ...advCheckboxes,
    ..._alCheckboxes,
  };

  // F — Functions
  const score_f = computeRatioScore(allCheckboxes, FACT_CHECKBOX_MAP.F);

  // A — Accuracy + 발음 보정
  let score_a = computeRatioScore(allCheckboxes, FACT_CHECKBOX_MAP.A);
  if (avgAccuracyScore >= 80) score_a = Math.min(10, score_a + 1);
  else if (avgAccuracyScore < 50) score_a = Math.max(1, score_a - 1);

  // C — Context + 유효 문항 수 보정
  let score_c = computeRatioScore(allCheckboxes, FACT_CHECKBOX_MAP.C);
  if (validQuestionCount < 10) score_c = Math.max(1, score_c - 2);
  else if (validQuestionCount < 14) score_c = Math.max(1, score_c - 1);

  // T — Text Type
  const score_t = computeTextTypeScore(allCheckboxes);

  // 총점: (F+A+C+T) × 2.5 = 100점 만점
  const total_score =
    Math.round((score_f + score_a + score_c + score_t) * 2.5 * 10) / 10;

  return { score_f, score_a, score_c, score_t, total_score };
}

// ============================================================
// 메인 함수: 규칙엔진 실행
// ============================================================

export function runRuleEngine(
  evaluations: EvaluationInput[],
  params: RuleEngineParams = DEFAULT_PARAMS,
): RuleEngineResult {
  // 스킵된 문항 수집
  const skippedQuestions = evaluations
    .filter((e) => e.skipped)
    .map((e) => e.question_number);

  // 유효 문항 수
  const validQuestionCount = evaluations.filter((e) => !e.skipped).length;

  // Step 1: 체크박스 집계
  const {
    intCheckboxes,
    advCheckboxes,
    alCheckboxes,
    intPassRate,
    advPassRate,
    alPassRate,
  } = aggregateCheckboxes(evaluations, params);

  // Step 2: Floor 판정
  const floor = determineFloor(intPassRate, params);

  // Step 3: Ceiling 판정
  const ceiling = determineCeiling(advPassRate, params);

  // 발음 평균 계산
  let totalAccuracy = 0;
  let totalProsody = 0;
  let totalFluency = 0;
  let pronCount = 0;
  for (const eval_ of evaluations) {
    if (eval_.skipped || !eval_.pronunciation_assessment) continue;
    const pa = eval_.pronunciation_assessment;
    if (pa.accuracy_score != null) {
      totalAccuracy += pa.accuracy_score;
      totalProsody += pa.prosody_score || 0;
      totalFluency += pa.fluency_score || 0;
      pronCount++;
    }
  }
  const avgAccuracy = pronCount > 0 ? totalAccuracy / pronCount : 50;
  const avgProsody = pronCount > 0 ? totalProsody / pronCount : 50;
  const avgFluency = pronCount > 0 ? totalFluency / pronCount : 50;
  const avgPronScore = (avgAccuracy + avgProsody + avgFluency) / 3;

  // Step 4: Sympathetic Listener
  const sympathetic = determineSympathetic(
    avgPronScore,
    advCheckboxes,
    params,
  );

  // Step 5: Q12 게이트키퍼
  const q12Gatekeeper = checkQ12Gatekeeper(
    evaluations,
    skippedQuestions,
    advCheckboxes,
    params,
  );

  // Step 6: AL 판정
  const alJudgment = judgeAL(
    ceiling,
    q12Gatekeeper,
    skippedQuestions,
    alCheckboxes,
    alPassRate,
    params,
  );

  // Step 7: 최종 등급
  const finalLevel = determineFinalLevel(
    floor,
    ceiling,
    sympathetic,
    q12Gatekeeper,
    alJudgment,
    intPassRate,
    advPassRate,
  );

  // FACT 점수 계산
  const factScores = computeFACTScores(
    intCheckboxes,
    advCheckboxes,
    alCheckboxes,
    avgAccuracy,
    validQuestionCount,
  );

  return {
    final_level: finalLevel,
    floor_status: floor.status,
    floor_level: floor.level,
    ceiling_status: ceiling.status,
    sympathetic_listener: sympathetic,
    q12_gatekeeper: q12Gatekeeper,
    al_judgment: alJudgment,
    int_pass_rate: Math.round(intPassRate * 10000) / 10000,
    adv_pass_rate: Math.round(advPassRate * 10000) / 10000,
    al_pass_rate: Math.round(alPassRate * 10000) / 10000,
    valid_question_count: validQuestionCount,
    skipped_questions: skippedQuestions,
    aggregated_int_checkboxes: intCheckboxes,
    aggregated_adv_checkboxes: advCheckboxes,
    aggregated_al_checkboxes: alCheckboxes,
    fact_scores: factScores,
  };
}
