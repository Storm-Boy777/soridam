// 체크박스 정의 — OPIc V7 규칙엔진
// INT(20), ADV(42), AL(12) 전체 74개
// question_type → 체크박스 세트 매핑
// FACT 점수 매핑 테이블
// 누적 로직 정의

// ============================================================
// 1. 체크박스 ID 목록
// ============================================================

// INT-1: 어휘 및 청해 (3개)
// INT-2: 담화 수준 (3개) — 누적 로직 적용
// INT-3: 질문 구성 (2개) — asking_questions 전용
// INT-4: 유창성/발음/문법/어순 (12개)

const INT_ALL_IDS = [
  // INT-1 (3)
  "INT-1-1", "INT-1-2", "INT-1-3",
  // INT-2 (3) — 누적
  "INT-2-1", "INT-2-2", "INT-2-3",
  // INT-3 (2) — asking_questions 전용
  "INT-3-1", "INT-3-2",
  // INT-4 (12)
  "INT-4-F1", "INT-4-F2", "INT-4-F3", "INT-4-F4", "INT-4-F5",
  "INT-4-P1", "INT-4-P2", "INT-4-P3", "INT-4-P4",
  "INT-4-G1", "INT-4-G2",
  "INT-4-S1",
];

// INT-3 제외 (18개) — description, routine용
export const INT_18_IDS = INT_ALL_IDS.filter(
  (id) => !id.startsWith("INT-3"),
);

// INT-3 포함 (20개) — asking_questions용
export const INT_20_IDS = [...INT_ALL_IDS];

// ADV-1: 시제별 묘사/서사 (11개)
// ADV-2: 문단 수준 담화 (11개) — SP 누적 로직 적용
// ADV-3: 다양한 주제 (3개)
// ADV-4: 돌발 상황 대처 (4개) — suggest_alternatives 전용
// ADV-5: 이해 용이성 (13개)

const ADV_ALL_IDS = [
  // ADV-1 (11)
  "ADV-1-D1", "ADV-1-D2", "ADV-1-D3",
  "ADV-1-N1", "ADV-1-N2", "ADV-1-N3",
  "ADV-1-PR1", "ADV-1-PR2", "ADV-1-PR3",
  "ADV-1-L1", "ADV-1-L2",
  // ADV-2 (11) — SP 누적
  "ADV-2-SP1", "ADV-2-SP2", "ADV-2-SP3", "ADV-2-SP4", "ADV-2-SP5",
  "ADV-2-WO1", "ADV-2-WO2", "ADV-2-WO3",
  "ADV-2-CD1", "ADV-2-CD2", "ADV-2-CD3",
  // ADV-3 (3)
  "ADV-3-V1", "ADV-3-V2", "ADV-3-V3",
  // ADV-4 (4) — suggest_alternatives 전용
  "ADV-4-CR1", "ADV-4-CR2", "ADV-4-CR3", "ADV-4-CD1",
  // ADV-5 (13)
  "ADV-5-F1", "ADV-5-F2", "ADV-5-F3",
  "ADV-5-G1", "ADV-5-G2", "ADV-5-G3", "ADV-5-G4", "ADV-5-G5",
  "ADV-5-PC1",
  "ADV-5-P1", "ADV-5-P2", "ADV-5-P3", "ADV-5-P4",
];

// ADV-4 제외 (38개) — comparison, experience_*, 기본 ADV
export const ADV_38_IDS = ADV_ALL_IDS.filter(
  (id) => !id.startsWith("ADV-4"),
);

// ADV-4 포함 (42개) — suggest_alternatives용
export const ADV_42_IDS = [...ADV_ALL_IDS];

// AL-14: 비교변화 (6개)
export const AL_14_IDS = [
  "AL-14-PS", "AL-14-LS", "AL-14-CS",
  "AL-14-CD", "AL-14-VB", "AL-14-GA",
];

// AL-15: 사회적이슈 (6개)
export const AL_15_IDS = [
  "AL-15-AS", "AL-15-MA", "AL-15-SI",
  "AL-15-CD", "AL-15-VB", "AL-15-GA",
];

// ============================================================
// 2. question_type → 체크박스 세트 매핑
// ============================================================

export function getCheckboxIdsForQuestionType(questionType: string): {
  ids: string[];
  type: "INT" | "ADV" | "AL";
} {
  switch (questionType) {
    case "description":
    case "routine":
      return { ids: INT_18_IDS, type: "INT" };
    case "asking_questions":
      return { ids: INT_20_IDS, type: "INT" };
    case "comparison":
    case "experience_specific":
    case "experience_habitual":
    case "experience_past":
      return { ids: ADV_38_IDS, type: "ADV" };
    case "suggest_alternatives":
      return { ids: ADV_42_IDS, type: "ADV" };
    case "comparison_change":
      return { ids: AL_14_IDS, type: "AL" };
    case "social_issue":
      return { ids: AL_15_IDS, type: "AL" };
    default:
      return { ids: ADV_38_IDS, type: "ADV" };
  }
}

// ============================================================
// 3. 누적 로직 (상위 pass → 하위 자동 pass)
// ============================================================

// INT-2: 담화 수준 누적
export const INT_2_CUMULATIVE: Record<string, string[]> = {
  "INT-2-3": ["INT-2-1", "INT-2-2"],
  "INT-2-2": ["INT-2-1"],
};

// ADV-2-SP: 발화 길이 수준 누적
export const ADV_2_SP_CUMULATIVE: Record<string, string[]> = {
  "ADV-2-SP5": ["ADV-2-SP1", "ADV-2-SP2", "ADV-2-SP3", "ADV-2-SP4"],
  "ADV-2-SP4": ["ADV-2-SP1", "ADV-2-SP2", "ADV-2-SP3"],
  "ADV-2-SP3": ["ADV-2-SP1", "ADV-2-SP2"],
  "ADV-2-SP2": ["ADV-2-SP1"],
};

// ============================================================
// 4. FACT 점수 매핑 테이블
// ============================================================

export const FACT_CHECKBOX_MAP = {
  // F — Functions & Tasks (16개)
  F: [
    "INT-1-1", "INT-1-2", "INT-1-3",
    "INT-3-1", "INT-3-2",
    "ADV-1-D1", "ADV-1-D2", "ADV-1-D3",
    "ADV-1-N1", "ADV-1-N2", "ADV-1-N3",
    "ADV-4-CR1", "ADV-4-CR2", "ADV-4-CR3", "ADV-4-CD1",
  ],

  // A — Accuracy (31개)
  A: [
    "INT-4-F1", "INT-4-F2", "INT-4-F3", "INT-4-F4", "INT-4-F5",
    "INT-4-P1", "INT-4-P2", "INT-4-P3", "INT-4-P4",
    "INT-4-G1", "INT-4-G2",
    "INT-4-S1",
    "ADV-1-PR1", "ADV-1-PR2", "ADV-1-PR3",
    "ADV-2-WO1", "ADV-2-WO2", "ADV-2-WO3",
    "ADV-5-F1", "ADV-5-F2", "ADV-5-F3",
    "ADV-5-G1", "ADV-5-G2", "ADV-5-G3", "ADV-5-G4", "ADV-5-G5",
    "ADV-5-PC1",
    "ADV-5-P1", "ADV-5-P2", "ADV-5-P3", "ADV-5-P4",
  ],

  // C — Context & Content (5개)
  C: [
    "ADV-3-V1", "ADV-3-V2", "ADV-3-V3",
    "ADV-1-L1", "ADV-1-L2",
  ],

  // T — Text Type (3그룹, 별도 계산)
  T_INT2: ["INT-2-1", "INT-2-2", "INT-2-3"],
  T_SP: ["ADV-2-SP1", "ADV-2-SP2", "ADV-2-SP3", "ADV-2-SP4", "ADV-2-SP5"],
  T_CD: ["ADV-2-CD1", "ADV-2-CD2", "ADV-2-CD3"],
};

// ADV-5 체크박스 (Sympathetic Listener 판정용)
export const ADV_5_IDS = [
  "ADV-5-F1", "ADV-5-F2", "ADV-5-F3",
  "ADV-5-G1", "ADV-5-G2", "ADV-5-G3", "ADV-5-G4", "ADV-5-G5",
  "ADV-5-PC1",
  "ADV-5-P1", "ADV-5-P2", "ADV-5-P3", "ADV-5-P4",
];

// ADV-4 체크박스 (Q12 게이트키퍼용)
export const ADV_4_IDS = [
  "ADV-4-CR1", "ADV-4-CR2", "ADV-4-CR3", "ADV-4-CD1",
];

// AL 게이트키퍼 필수 체크박스 (모두 pass 필요)
export const AL_GATEKEEPER_IDS = [
  "AL-14-PS", "AL-14-CD", "AL-15-AS", "AL-15-CD",
];

// ============================================================
// 5. 체크박스 검증 (GPT 출력 → 정리)
// ============================================================

export interface CheckboxResult {
  pass: boolean;
  evidence?: string;
}

// GPT 출력 체크박스를 검증: 예상 ID만 유지, 누락은 fail 처리
export function validateCheckboxes(
  checkboxes: Record<string, CheckboxResult>,
  questionType: string,
): {
  validated: Record<string, CheckboxResult>;
  passCount: number;
  failCount: number;
  passRate: number;
} {
  const { ids: expectedIds } = getCheckboxIdsForQuestionType(questionType);
  const validated: Record<string, CheckboxResult> = {};

  for (const id of expectedIds) {
    if (checkboxes[id]) {
      validated[id] = checkboxes[id];
    } else {
      // 누락 → fail 처리
      validated[id] = { pass: false, evidence: "Not evaluated by model" };
    }
  }

  const passCount = Object.values(validated).filter((v) => v.pass).length;
  const failCount = expectedIds.length - passCount;
  const passRate = expectedIds.length > 0 ? passCount / expectedIds.length : 0;

  return { validated, passCount, failCount, passRate };
}
