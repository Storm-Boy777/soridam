/**
 * 모의고사 체크박스 UI 상수
 * - 소리담 EvaluationPanelV7에서 이식
 * - 74개 체크박스 한글 매핑 + 그룹 정의 + answer_type 한글
 */

// ── 체크박스 항목 타입 ──

export interface CheckboxItem {
  pass: boolean;
  evidence: string;
}

// ── 문장 분석 / 교정 타입 ──

export interface SentenceItem {
  index: number;
  text: string;
  group?: number;
}

export interface CorrectionItem {
  sentence_index: number;
  error_parts: string[];
  tip_korean: string;
  corrected_segment: string;
}

// ── 심층 분석 타입 ──

export interface DeepAnalysis {
  overall_assessment: string;
  linguistic_analysis: string;
  communicative_effectiveness: string;
  proficiency_gap: string;
  recommendation: string;
}

// ── 발음 평가 타입 ──

export interface PronunciationAssessment {
  accuracy_score: number;
  prosody_score: number;
  fluency_score: number;
  pronunciation_score: number;
  words?: Array<{
    word: string;
    accuracyScore: number;
    errorType: string;
  }>;
}

// ── 통합 평가 데이터 (SA 반환 타입) ──

export interface TrainingEvalData {
  // evaluations
  checkboxes: Record<string, CheckboxItem>;
  checkbox_type: "INT" | "ADV" | "AL";
  checkbox_count: number;
  pass_count: number;
  fail_count: number;
  pass_rate: number;
  sentences: SentenceItem[];
  corrections: CorrectionItem[];
  deep_analysis: DeepAnalysis | null;
  wpm: number;
  audio_duration: number;
  filler_count: number;
  long_pause_count: number;
  answer_type: string;
  skipped: boolean;
  // consults
  fulfillment: string | null;
  observation: string | null;
  directions: string[];
  weak_points: string[];
  // answers
  audio_url: string | null;
  transcript: string | null;
  pronunciation_assessment: PronunciationAssessment | null;
}

// ── answer_type 한글 매핑 (하루오픽 question_type_eng 기준) ──

export const ANSWER_TYPE_KO: Record<string, string> = {
  description: "묘사",
  routine: "일상",
  comparison: "비교",
  past_childhood: "어린 시절 경험",
  past_recent: "최근 경험",
  past_special: "기억에 남는 경험",
  rp_11: "롤플레이 (질문하기)",
  rp_12: "롤플레이 (대안 제시)",
  adv_14: "비교·변화",
  adv_15: "이슈·의견",
};

// ── 체크박스 그룹 정의 (74개 → INT 20 + ADV 42 + AL 12) ──

export const V7_CHECKBOX_GROUPS: Array<{
  key: string;
  label: string;
  type: "INT" | "ADV" | "AL";
  ids: string[];
}> = [
  // INT 그룹
  {
    key: "INT-1",
    label: "문장 생성력",
    type: "INT",
    ids: ["INT-1-1", "INT-1-2", "INT-1-3"],
  },
  {
    key: "INT-2",
    label: "발화 단위 수준",
    type: "INT",
    ids: ["INT-2-1", "INT-2-2", "INT-2-3"],
  },
  {
    key: "INT-3",
    label: "질문과 응답 처리",
    type: "INT",
    ids: ["INT-3-1", "INT-3-2"],
  },
  {
    key: "INT-4-F",
    label: "유창성",
    type: "INT",
    ids: ["INT-4-F1", "INT-4-F2", "INT-4-F3", "INT-4-F4", "INT-4-F5"],
  },
  {
    key: "INT-4-P",
    label: "발음",
    type: "INT",
    ids: ["INT-4-P1", "INT-4-P2", "INT-4-P3", "INT-4-P4"],
  },
  {
    key: "INT-4-G",
    label: "문법",
    type: "INT",
    ids: ["INT-4-G1", "INT-4-G2"],
  },
  { key: "INT-4-S", label: "어순", type: "INT", ids: ["INT-4-S1"] },
  // ADV 그룹
  {
    key: "ADV-1",
    label: "시제별 묘사 · 서사",
    type: "ADV",
    ids: [
      "ADV-1-D1",
      "ADV-1-D2",
      "ADV-1-D3",
      "ADV-1-N1",
      "ADV-1-N2",
      "ADV-1-N3",
      "ADV-1-PR1",
      "ADV-1-PR2",
      "ADV-1-PR3",
      "ADV-1-L1",
      "ADV-1-L2",
    ],
  },
  {
    key: "ADV-2-SP",
    label: "발화 길이 수준",
    type: "ADV",
    ids: ["ADV-2-SP1", "ADV-2-SP2", "ADV-2-SP3", "ADV-2-SP4", "ADV-2-SP5"],
  },
  {
    key: "ADV-2-WO",
    label: "어순",
    type: "ADV",
    ids: ["ADV-2-WO1", "ADV-2-WO2", "ADV-2-WO3"],
  },
  {
    key: "ADV-2-CD",
    label: "연결어 사용",
    type: "ADV",
    ids: ["ADV-2-CD1", "ADV-2-CD2", "ADV-2-CD3"],
  },
  {
    key: "ADV-3",
    label: "주제 범위와 어휘",
    type: "ADV",
    ids: ["ADV-3-V1", "ADV-3-V2", "ADV-3-V3"],
  },
  {
    key: "ADV-4",
    label: "돌발 상황 대처",
    type: "ADV",
    ids: ["ADV-4-CR1", "ADV-4-CR2", "ADV-4-CR3", "ADV-4-CD1"],
  },
  {
    key: "ADV-5-F",
    label: "유창성 (고급)",
    type: "ADV",
    ids: ["ADV-5-F1", "ADV-5-F2", "ADV-5-F3"],
  },
  {
    key: "ADV-5-G",
    label: "문법 (고급)",
    type: "ADV",
    ids: ["ADV-5-G1", "ADV-5-G2", "ADV-5-G3", "ADV-5-G4", "ADV-5-G5"],
  },
  { key: "ADV-5-PC", label: "보완 전략", type: "ADV", ids: ["ADV-5-PC1"] },
  {
    key: "ADV-5-P",
    label: "발음 (고급)",
    type: "ADV",
    ids: ["ADV-5-P1", "ADV-5-P2", "ADV-5-P3", "ADV-5-P4"],
  },
  // AL 그룹
  {
    key: "AL-14",
    label: "문단 구조 심화 (14번)",
    type: "AL",
    ids: ["AL-14-PS", "AL-14-LS", "AL-14-CS", "AL-14-CD", "AL-14-VB", "AL-14-GA"],
  },
  {
    key: "AL-15",
    label: "이슈 분석 심화 (15번)",
    type: "AL",
    ids: ["AL-15-AS", "AL-15-MA", "AL-15-SI", "AL-15-CD", "AL-15-VB", "AL-15-GA"],
  },
];

// ── 체크박스 ID → 한글 설명 매핑 (74개) ──

export const V7_CHECKBOX_KO: Record<string, string> = {
  // INT (20개)
  "INT-1-1": "개인 정보를 제공할 수 있는 어휘력",
  "INT-1-2": "정보 요청에 응답하기 위한 청해력",
  "INT-1-3": "단어/구 나열이 아닌 문장 수준 담화 생성",
  "INT-2-1": "단어, 단어 목록, 암기된 구 수준",
  "INT-2-2": "일부 문장, 암기된 구와 단어",
  "INT-2-3": "대부분 문장, 때때로 암기된 구/단어 목록",
  "INT-3-1": "질문을 올바르게 구성",
  "INT-3-2": "거래 완료를 위한 충분한 질문과 응답",
  "INT-4-F1": "말하기 속도",
  "INT-4-F2": "유창성 (쉼 줄이기)",
  "INT-4-F3": "미완성 문장 줄이기",
  "INT-4-F4": "잘못된 시작 줄이기",
  "INT-4-F5": "반복 줄이기",
  "INT-4-P1": "조음 (발음 명확성)",
  "INT-4-P2": "음높이",
  "INT-4-P3": "강세",
  "INT-4-P4": "억양",
  "INT-4-G1": "단순 문장 수준 문법 통제",
  "INT-4-G2": "완전한 문장 생성",
  "INT-4-S1": "문장 수준 어순",
  // ADV (42개)
  "ADV-1-D1": "현재 시제 묘사",
  "ADV-1-D2": "과거 시제 묘사",
  "ADV-1-D3": "미래 시제 묘사",
  "ADV-1-N1": "현재 시제 서사",
  "ADV-1-N2": "과거 시제 서사",
  "ADV-1-N3": "미래 시제 서사",
  "ADV-1-PR1": "논리적 순서",
  "ADV-1-PR2": "동사 형태",
  "ADV-1-PR3": "인칭 표지",
  "ADV-1-L1": "명확성",
  "ADV-1-L2": "세부사항",
  "ADV-2-SP1": "단어와 구 수준",
  "ADV-2-SP2": "문장 수준",
  "ADV-2-SP3": "문장열 수준",
  "ADV-2-SP4": "연결된 문장 수준",
  "ADV-2-SP5": "기본 문단 수준",
  "ADV-2-WO1": "구 수준 어순",
  "ADV-2-WO2": "문장 수준 어순",
  "ADV-2-WO3": "문단 수준 어순",
  "ADV-2-CD1": "연결어 사용 여부",
  "ADV-2-CD2": "연결어 정확성",
  "ADV-2-CD3": "연결어 다양성",
  "ADV-3-V1": "어휘 폭",
  "ADV-3-V2": "다른 언어 단어 사용 억제",
  "ADV-3-V3": "거짓 동족어 사용 억제",
  "ADV-4-CR1": "어려움 있지만 상황 해결 성공",
  "ADV-4-CR2": "시도하지만 성공적 해결 불가",
  "ADV-4-CR3": "상황 해결 언어 능력 부재",
  "ADV-4-CD1": "의사소통 장치 활용",
  "ADV-5-F1": "말하기 속도",
  "ADV-5-F2": "유창성 (끊김 없음)",
  "ADV-5-F3": "연결성",
  "ADV-5-G1": "단어 구조 (형태론)",
  "ADV-5-G2": "통사 (문장 구조)",
  "ADV-5-G3": "격 사용",
  "ADV-5-G4": "전치사 사용",
  "ADV-5-G5": "일치 (수/시제)",
  "ADV-5-PC1": "약점 보완 전략",
  "ADV-5-P1": "조음 (명확한 소리)",
  "ADV-5-P2": "음높이",
  "ADV-5-P3": "강세",
  "ADV-5-P4": "억양",
  // AL (12개)
  "AL-14-PS": "문단 구조 (Skeleton Paragraph)",
  "AL-14-LS": "논리적 순서 (Logical Sequencing)",
  "AL-14-CS": "비교·대조 구문 (Compare/Contrast)",
  "AL-14-CD": "연결어 다양성",
  "AL-14-VB": "어휘 수준",
  "AL-14-GA": "문법 정확성",
  "AL-15-AS": "이슈 분석 구조",
  "AL-15-MA": "다각적 분석",
  "AL-15-SI": "사회적 깊이",
  "AL-15-CD": "연결어 다양성",
  "AL-15-VB": "어휘 수준",
  "AL-15-GA": "문법 정확성",
};
