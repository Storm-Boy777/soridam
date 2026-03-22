/**
 * v2 병목 엔진 — WP 코드 기반 병목 분석
 *
 * 입력: 모의고사 v2 평가 결과 (문항별 weak_points[])
 * 출력: BottleneckResult[] (상위 3개, 점수 내림차순)
 *
 * 공식: bottleneck_score = Σ(severity_weight × tier_relevance)
 *   - severity_weight: severe=3.0, moderate=1.5, mild=0.5
 *   - tier_relevance: 현재 Tier의 코드별 가중치 (0~1.0)
 */

// ── 타입 정의 ──

export type Severity = "severe" | "moderate" | "mild";
export type TierLevel = 1 | 2 | 3 | 4;
export type TierRelevanceLabel = "essential" | "helpful" | "reference";

/** 모의고사 v2에서 넘어오는 약점 (문항 단위) */
export interface WeakPointInput {
  code: string;          // "WP_S03"
  severity: Severity;
  reason: string;
  evidence: string;
}

/** 문항별 평가 결과 (병목 엔진 입력용 최소 인터페이스) */
export interface QuestionEvalForBottleneck {
  question_number: number;
  weak_points: WeakPointInput[];
}

/** 병목 엔진 출력 */
export interface BottleneckResult {
  rank: 1 | 2 | 3;
  code: string;                // "WP_S03"
  drill_code: string;          // "connector_diversity"
  score: number;               // severity_weight × tier_relevance 합산
  frequency: number;           // 출현 문항 수
  evidence_questions: number[]; // 출현 문항 번호 목록
  severity_breakdown: {
    from_severe: number;
    from_moderate: number;
    from_mild: number;
  };
  sample_evidence: string;     // 대표 근거 (가장 심각한 인스턴스)
  tier_relevance: TierRelevanceLabel;
  current_tier: TierLevel;
}

// ── 상수 ──

/** 심각도별 가중치 */
const SEVERITY_WEIGHT: Record<Severity, number> = {
  severe: 3.0,
  moderate: 1.5,
  mild: 0.5,
};

/**
 * 36개 WP 코드 × 4 Tier 가중치 매트릭스
 * 값: 0(무관), 0.2(참고), 0.5(중요 보조), 1.0(핵심 병목)
 */
const TIER_RELEVANCE: Record<string, [number, number, number, number]> = {
  // Structure (구조) — S01~S09
  WP_S01: [1.0, 0.5, 0.2, 0  ],
  WP_S02: [1.0, 1.0, 0.5, 0  ],
  WP_S03: [0.2, 0.5, 1.0, 0.2],
  WP_S04: [0,   0.2, 1.0, 0.5],
  WP_S05: [0,   0.2, 0.5, 1.0],
  WP_S06: [0.2, 0.2, 0.5, 0.2],
  WP_S07: [0.5, 1.0, 0.5, 0.5],
  WP_S08: [0.2, 0.5, 1.0, 0.5],
  WP_S09: [0.2, 0.5, 1.0, 1.0],

  // Accuracy (정확성) — A01~A08
  WP_A01: [0,   0.2, 0.5, 1.0],
  WP_A02: [0,   0.2, 1.0, 1.0],
  WP_A03: [0.2, 0.2, 0.2, 0.2],
  WP_A04: [0,   0.2, 0.2, 0.2],
  WP_A05: [0.5, 0.5, 0.2, 0.5],
  WP_A06: [0.5, 0.2, 0.2, 0.5],
  WP_A07: [0.5, 0.5, 0.2, 0.5],
  WP_A08: [0,   0.2, 1.0, 1.0],

  // Content (내용) — C01~C07
  WP_C01: [0,   0.2, 1.0, 0.5],
  WP_C02: [0,   0.2, 0.5, 0.5],
  WP_C03: [0,   0.2, 0.5, 1.0],
  WP_C04: [0,   0,   0.2, 1.0],
  WP_C05: [0,   0.2, 0.5, 0.2],
  WP_C06: [0,   0.5, 0.5, 0.2],
  WP_C07: [0,   0.2, 0.5, 1.0],

  // Task (과제) — T01~T08
  WP_T01: [1.0, 1.0, 1.0, 1.0],
  WP_T02: [1.0, 1.0, 1.0, 1.0],
  WP_T03: [0,   0.2, 0.5, 1.0],
  WP_T04: [0,   0.2, 0.5, 1.0],
  WP_T05: [0,   0.2, 0.5, 1.0],
  WP_T06: [0,   0.2, 0.5, 0.2],
  WP_T07: [0,   0.2, 0.2, 0.5],
  WP_T08: [0,   0.2, 0.5, 1.0],

  // Delivery (전달) — D01~D04
  WP_D01: [1.0, 1.0, 0.5, 0.5],
  WP_D02: [0.2, 0.5, 0.2, 0.2],
  WP_D03: [0,   0.2, 0.2, 0.2],
  WP_D04: [0.5, 0.5, 0.2, 0  ],
};

/**
 * WP → drill 매핑 (Tier별 최적 드릴)
 * 키: "WP_XXX", 값: Record<TierLevel, drill_code>
 * 동일 Tier에 여러 후보가 있으면 가장 대표적인 1개만 지정
 */
const WP_TO_DRILL: Record<string, Record<TierLevel, string>> = {
  WP_S01: { 1: "sentence_formation",   2: "sentence_formation",   3: "sentence_formation",   4: "sentence_formation"   },
  WP_S02: { 1: "frame_4line",          2: "frame_4line",          3: "skeleton_paragraph",    4: "skeleton_paragraph"   },
  WP_S03: { 1: "basic_connectors",     2: "basic_connectors",     3: "connector_diversity",   4: "connector_diversity"  },
  WP_S04: { 1: "skeleton_paragraph",   2: "skeleton_paragraph",   3: "skeleton_paragraph",    4: "skeleton_paragraph"   },
  WP_S05: { 1: "paragraph_sustain",    2: "paragraph_sustain",    3: "paragraph_sustain",     4: "paragraph_sustain"    },
  WP_S06: { 1: "paragraph_closure",    2: "paragraph_closure",    3: "paragraph_closure",     4: "paragraph_closure"    },
  WP_S07: { 1: "topic_maintenance",    2: "topic_maintenance",    3: "topic_maintenance",     4: "topic_maintenance"    },
  WP_S08: { 1: "past_narrative",       2: "past_narrative",       3: "past_narrative",         4: "past_narrative"       },
  WP_S09: { 1: "skeleton_paragraph",   2: "skeleton_paragraph",   3: "thought_progression",   4: "paragraph_sustain"    },

  WP_A01: { 1: "tense_accuracy",       2: "tense_accuracy",       3: "tense_accuracy",        4: "tense_accuracy"       },
  WP_A02: { 1: "tense_attempt",        2: "tense_attempt",        3: "tense_attempt",          4: "tense_attempt"        },
  WP_A03: { 1: "agreement_accuracy",   2: "agreement_accuracy",   3: "agreement_accuracy",    4: "agreement_accuracy"   },
  WP_A04: { 1: "preposition_accuracy", 2: "preposition_accuracy", 3: "preposition_accuracy",  4: "preposition_accuracy" },
  WP_A05: { 1: "sentence_completion",  2: "sentence_completion",  3: "sentence_completion",   4: "sentence_completion"  },
  WP_A06: { 1: "pronunciation_clarity",2: "pronunciation_clarity",3: "pronunciation_clarity",  4: "pronunciation_clarity"},
  WP_A07: { 1: "hesitation_reduction", 2: "hesitation_reduction", 3: "hesitation_reduction",  4: "hesitation_reduction" },
  WP_A08: { 1: "tense_accuracy",       2: "tense_accuracy",       3: "timeframe_sustain",     4: "tense_accuracy"       },

  WP_C01: { 1: "description_depth",    2: "description_depth",    3: "description_depth",     4: "description_depth"    },
  WP_C02: { 1: "vocabulary_upgrade",   2: "vocabulary_upgrade",   3: "vocabulary_upgrade",     4: "vocabulary_upgrade"   },
  WP_C03: { 1: "vocabulary_upgrade",   2: "vocabulary_upgrade",   3: "vocabulary_upgrade",     4: "vocabulary_upgrade"   },
  WP_C04: { 1: "social_perspective",   2: "social_perspective",   3: "social_perspective",     4: "social_perspective"   },
  WP_C05: { 1: "description_depth",    2: "description_depth",    3: "description_depth",     4: "description_depth"    },
  WP_C06: { 1: "description_depth",    2: "description_depth",    3: "description_depth",     4: "description_depth"    },
  WP_C07: { 1: "reason_chain",         2: "reason_chain",         3: "reason_chain",           4: "social_perspective"   },

  WP_T01: { 1: "basic_transaction",    2: "question_response",    3: "question_response",     4: "question_response"    },
  WP_T02: { 1: "question_response",    2: "multi_part_checklist", 3: "question_response",     4: "question_response"    },
  WP_T03: { 1: "comparison_frame",     2: "comparison_frame",     3: "comparison_frame",      4: "comparison_frame"     },
  WP_T04: { 1: "complication_handling", 2: "complication_handling",3: "complication_handling",  4: "complication_handling" },
  WP_T05: { 1: "negotiation_expressions",2: "negotiation_expressions",3: "negotiation_expressions",4: "negotiation_expressions"},
  WP_T06: { 1: "question_response",    2: "question_response",    3: "question_response",     4: "question_response"    },
  WP_T07: { 1: "negotiation_expressions",2: "negotiation_expressions",3: "negotiation_expressions",4: "negotiation_expressions"},
  WP_T08: { 1: "complication_handling", 2: "complication_handling",3: "complication_handling",  4: "solution_proposal"    },

  WP_D01: { 1: "speech_volume",        2: "speech_volume",        3: "speech_volume",          4: "speech_volume"        },
  WP_D02: { 1: "hesitation_reduction", 2: "hesitation_reduction", 3: "hesitation_reduction",  4: "hesitation_reduction" },
  WP_D03: { 1: "filler_reduction",     2: "filler_reduction",     3: "filler_reduction",      4: "filler_reduction"     },
  WP_D04: { 1: "speech_volume",        2: "speech_volume",        3: "speech_volume",          4: "speech_volume"        },
};

/**
 * 등급 → Tier 매핑
 * Tier 1: NL~NM (→IL 목표)
 * Tier 2: NH~IM1 (→IM2 목표)
 * Tier 3: IM2~IM3 (→IH 목표)
 * Tier 4: IH~AL (→AL 목표)
 */
const GRADE_TO_TIER: Record<string, TierLevel> = {
  NL: 1, NM: 1, NH: 2,
  IL: 2, IM1: 2, IM2: 3, IM3: 3,
  IH: 4, AL: 4,
};

// ── 유틸리티 ──

/** 가중치 → 라벨 변환 */
function relevanceLabel(weight: number): TierRelevanceLabel {
  if (weight >= 1.0) return "essential";
  if (weight >= 0.5) return "helpful";
  return "reference";
}

/** 등급 문자열 → Tier 변환 (기본값 Tier 3) */
export function gradeToTier(grade: string): TierLevel {
  return GRADE_TO_TIER[grade.toUpperCase()] ?? 3;
}

// ── 핵심 엔진 ──

/**
 * v2 병목 분석 엔진
 *
 * @param evaluations 문항별 평가 결과 배열
 * @param currentGrade 현재 등급 (예: "IM3")
 * @returns 상위 3개 병목 결과 (점수 내림차순)
 */
export function analyzeBottlenecks(
  evaluations: QuestionEvalForBottleneck[],
  currentGrade: string,
): BottleneckResult[] {
  const tier = gradeToTier(currentGrade);
  const tierIdx = tier - 1; // 배열 인덱스 (0-based)

  // 1. 코드별 집계 맵
  const codeMap = new Map<
    string,
    {
      score: number;
      frequency: number;
      questions: number[];
      fromSevere: number;
      fromModerate: number;
      fromMild: number;
      // 가장 심각한 인스턴스의 evidence (sample용)
      bestEvidence: string;
      bestSeverityWeight: number;
    }
  >();

  for (const evalItem of evaluations) {
    for (const wp of evalItem.weak_points) {
      const relevanceArr = TIER_RELEVANCE[wp.code];
      if (!relevanceArr) continue; // 알 수 없는 코드 무시

      const relevance = relevanceArr[tierIdx];
      if (relevance === 0) continue; // 현재 Tier에서 무관한 코드 제외

      const sevWeight = SEVERITY_WEIGHT[wp.severity] ?? 0.5;
      const contribution = sevWeight * relevance;

      const existing = codeMap.get(wp.code);
      if (existing) {
        existing.score += contribution;
        existing.frequency += 1;
        existing.questions.push(evalItem.question_number);
        // 심각도별 누적
        if (wp.severity === "severe") existing.fromSevere += sevWeight;
        else if (wp.severity === "moderate") existing.fromModerate += sevWeight;
        else existing.fromMild += sevWeight;
        // 더 심각한 evidence로 교체
        if (sevWeight > existing.bestSeverityWeight) {
          existing.bestEvidence = wp.evidence;
          existing.bestSeverityWeight = sevWeight;
        }
      } else {
        codeMap.set(wp.code, {
          score: contribution,
          frequency: 1,
          questions: [evalItem.question_number],
          fromSevere: wp.severity === "severe" ? sevWeight : 0,
          fromModerate: wp.severity === "moderate" ? sevWeight : 0,
          fromMild: wp.severity === "mild" ? sevWeight : 0,
          bestEvidence: wp.evidence,
          bestSeverityWeight: sevWeight,
        });
      }
    }
  }

  // 2. 점수 내림차순 정렬 → 상위 3개 추출
  const sorted = [...codeMap.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 3);

  // 3. BottleneckResult[] 생성
  return sorted.map(([code, agg], idx) => {
    const relevance = TIER_RELEVANCE[code]?.[tierIdx] ?? 0;
    const drillMap = WP_TO_DRILL[code];
    const drillCode = drillMap?.[tier] ?? "question_response"; // 폴백

    return {
      rank: (idx + 1) as 1 | 2 | 3,
      code,
      drill_code: drillCode,
      score: Math.round(agg.score * 100) / 100, // 소수점 2자리
      frequency: agg.frequency,
      evidence_questions: [...new Set(agg.questions)].sort((a, b) => a - b),
      severity_breakdown: {
        from_severe: Math.round(agg.fromSevere * 100) / 100,
        from_moderate: Math.round(agg.fromModerate * 100) / 100,
        from_mild: Math.round(agg.fromMild * 100) / 100,
      },
      sample_evidence: agg.bestEvidence,
      tier_relevance: relevanceLabel(relevance),
      current_tier: tier,
    };
  });
}

// ── 편의 함수 ──

/** 코드 → 한글 카테고리명 */
export function wpCategoryLabel(code: string): string {
  const prefix = code.split("_")[1]?.[0];
  const labels: Record<string, string> = {
    S: "구조", A: "정확성", C: "내용", T: "과제", D: "전달",
  };
  return labels[prefix ?? ""] ?? "기타";
}

/** 코드의 현재 Tier relevance 가중치 조회 */
export function getTierRelevance(code: string, tier: TierLevel): number {
  return TIER_RELEVANCE[code]?.[tier - 1] ?? 0;
}

/** 코드 → Tier별 추천 드릴 조회 */
export function getDrillForCode(code: string, tier: TierLevel): string | null {
  return WP_TO_DRILL[code]?.[tier] ?? null;
}
