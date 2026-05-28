// 스피킹 코치 모듈 타입 정의
// PRD v2: C:/Users/js777/Desktop/소리담_AI코치_PRD.md
// 마이그레이션: 068_coaching_module.sql

// ── ENUM 리터럴 타입 ──

// 시험 유형 (자기소개 + 10유형)
export const QUESTION_TYPES = [
  'self_intro',
  'description',
  'routine',
  'comparison',
  'past_childhood',
  'past_recent',
  'past_special',
  'adv_14',
  'adv_15',
  'rp_11',
  'rp_12',
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

// 백그라운드 서베이 타입
export const SURVEY_TYPES = ['선택형', '공통형'] as const;
export type SurveyType = (typeof SURVEY_TYPES)[number];

// 코칭 세션 상태
export const COACHING_SESSION_STATUSES = ['active', 'mastered', 'abandoned'] as const;
export type CoachingSessionStatus = (typeof COACHING_SESSION_STATUSES)[number];

// 회차 시도 상태
export const COACHING_ATTEMPT_STATUSES = [
  'pending',
  'preprocessing',
  'evaluating',
  'done',
  'failed',
] as const;
export type CoachingAttemptStatus = (typeof COACHING_ATTEMPT_STATUSES)[number];

// 입력 모드
export const INPUT_MODES = ['voice', 'text'] as const;
export type InputMode = (typeof INPUT_MODES)[number];

// 페르소나 코드
export const PERSONA_CODES = ['stoic_coach', 'star_instructor', 'kind_mentor'] as const;
export type PersonaCode = (typeof PERSONA_CODES)[number];

// ── 한국어 라벨 매핑 ──

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  self_intro: '자기소개',
  description: '묘사',
  routine: '루틴',
  comparison: '비교',
  past_childhood: '경험_어릴적/처음',
  past_recent: '경험_최근',
  past_special: '경험_특별한',
  adv_14: '비교/변화',
  adv_15: '사회적이슈',
  rp_11: '질문하기',
  rp_12: '대안제시',
};

export const QUESTION_TYPE_DESCRIPTIONS: Record<QuestionType, string> = {
  self_intro: '시험 도입 — 사전 작성 + 암기',
  description: '장소/사물/사람 묘사',
  routine: '평소 행동 패턴',
  comparison: '두 대상의 일반 비교',
  past_childhood: '어릴 적 또는 처음 경험',
  past_recent: '최근 경험',
  past_special: '인상 깊은 경험 (빈도 1위)',
  adv_14: '시간축 변화 (옛날 vs 지금)',
  adv_15: '사회 이슈/뉴스',
  rp_11: '롤플레이 — 능동적 질문',
  rp_12: '롤플레이 — 문제 해결 (AL 가중치)',
};

export const SESSION_STATUS_LABELS: Record<CoachingSessionStatus, string> = {
  active: '진행 중',
  mastered: '졸업',
  abandoned: '중단',
};

export const PERSONA_LABELS: Record<PersonaCode, string> = {
  stoic_coach: '무덤덤 코치',
  star_instructor: '일타 강사',
  kind_mentor: '친절한 멘토',
};

// 자기소개 제외, 본문 10유형
export const BODY_QUESTION_TYPES: QuestionType[] = [
  'description',
  'routine',
  'comparison',
  'past_childhood',
  'past_recent',
  'past_special',
  'adv_14',
  'adv_15',
  'rp_11',
  'rp_12',
];

// 학습 가능한 유형 — 본문 10유형 전체 개방 (질문 확인용)
// ⚠️ 코칭 프롬프트/spec은 묘사(description) 위주로만 완성된 상태.
//    다른 유형도 질문 탐색·세션 진입은 가능하나, 코칭 품질은 spec 보강 전까지 미완성.
//    spec 완성 전 묘사만 다시 잠그려면 ['description']로 되돌리면 됨.
export const ACTIVE_QUESTION_TYPES: QuestionType[] = [...BODY_QUESTION_TYPES];

// ── DB Row 인터페이스 ──

export interface CoachingSession {
  id: string;
  user_id: string;
  question_type: QuestionType;
  topic: string;
  question_id: string | null;
  survey_type: SurveyType | null;
  status: CoachingSessionStatus;
  attempt_count: number;
  last_grade: string | null;
  last_issue_count: number | null;
  target_level: string | null;  // v5 — 'IL'|'IM1'|'IM2'|'IM3'|'IH'|'AL' (마이그레이션 074)
  started_at: string;
  last_attempt_at: string | null;
  mastered_at: string | null;
  abandoned_at: string | null;
}

export interface CoachingAttempt {
  id: string;
  session_id: string;
  attempt_number: number;
  input_mode: InputMode;
  audio_url: string | null;
  audio_duration: number | null;
  raw_transcript: string | null;
  cleaned_transcript: string | null;
  stt_fix_log: SttFixLog[] | null;
  word_count: number | null;
  filler_count: number | null;
  filler_ratio: number | null;
  long_pause_count: number | null;
  evaluation: AttemptEvaluation | null;
  coaching_json: CoachingOutput | null;
  status: CoachingAttemptStatus;
  error_message: string | null;
  model: string | null;
  tokens_used: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface CoachingTopicMastery {
  id: string;
  user_id: string;
  question_type: QuestionType;
  topic: string;
  session_id: string | null;
  final_issue_count: number | null;
  total_attempts: number | null;
  final_grade: string | null;
  mastered_at: string;
}

export interface CoachingTypeMastery {
  id: string;
  user_id: string;
  question_type: QuestionType;
  topics_mastered: string[];
  total_attempts: number | null;
  mastered_at: string;
}

export interface CoachingPersonaSettings {
  user_id: string;
  persona_code: PersonaCode;
  updated_at: string;
}

// ── jsonb 페이로드 ──

// stt_fix_log: 전처리에서 STT 오타 정정한 로그
export interface SttFixLog {
  original: string;
  fixed: string;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

// evaluation: 내부 평가 결과 (학생 노출 X)
export interface AttemptEvaluation {
  estimated_grade: string; // 'IM2' | 'IM3' | 'IH-IM3 경계' | 'IH' | 'AL' 등 자연어
  흠_총_개수: number;
  흠_상세: 흠Detail[];
  강점: string[];
  skeleton_완성도?: {
    topic_sentence: boolean;
    transition: boolean;
    supporting_1: boolean;
    supporting_2: boolean;
    supporting_3: boolean;
    concluding: boolean;
    ending: boolean;
    score_percent: number;
  };
  전회차_대비_진척?: ProgressDelta;
}

export interface 흠Detail {
  영역: string;
  상태: string;
  학생_본문_인용?: string;
}

export interface ProgressDelta {
  prev_attempt_number: number;
  흠_count_delta: number; // 음수: 개선, 양수: 악화
  skeleton_delta?: string; // "3/7 → 6/7" 같은 표기
  filler_delta?: string; // "9 → 0" 같은 표기
}

// ── 구조화 코칭 출력 (coaching_json) ──
// 자유 markdown 대신 섹션 단위 구조화 — 학습 룸에서 전용 카드 UI로 렌더링

// 개선점 1건 (강사가 짚는 한 영역)
export interface CoachingIssue {
  title: string; // "Supporting 표지 — Skeleton 구조 미흡"
  severity: 'high' | 'medium' | 'low'; // 중요도 (정렬/뱃지용)
  quote?: string; // 학생 본문 인용 (영어 원문)
  explanation: string; // 원리 설명 (한국어)
  fix_example?: string; // 시범 표현 (영어 — 따라하기용)
  note?: string; // 일반화 / "다음에도 또…" (한국어)
}

// 진척 비교 표 1행 (회차 ≥ 2)
export interface CoachingProgressRow {
  label: string; // "Supporting 표지" / "Filler 횟수" 등
  prev: string; // "2/7"
  current: string; // "6/7"
  signal?: 'improved' | 'big' | 'new'; // ⭐ / ⭐⭐ / NEW
}

// 졸업 판정 — AI가 졸업 신호(흠 개수·구조·분사구문·어휘·filler)를 종합 판단
// 화면(ProgressStrip)은 이 값만 보고 졸업 안내를 표시한다 (단일 판정 소스)
export interface CoachingGraduation {
  ready: boolean; // 졸업 가능 여부
  reason: string; // 판단 근거 — 사용자 안내 문구 (한국어)
}

// 한 회차 코칭 출력 전체
export interface CoachingOutput {
  intro: string; // 인사 + 회차에 맞는 짧은 격려 (한국어)
  progress_table?: CoachingProgressRow[]; // 회차 ≥ 2 진척 비교
  issues: CoachingIssue[]; // 짚는 개선점 (우선순위 순)
  model_answer: {
    text: string; // 통합 답변 — 본인 소재 살린 모범 답변 (영어)
    changes: string[]; // 원답변 대비 변경점 (한국어)
  };
  action_items: string[]; // 다음 회차 체크리스트 (한국어)
  closing?: string; // "외우지 마세요…" 등 마무리 (한국어)
  graduation: CoachingGraduation; // 졸업 판정 (v4)
}

// ── UI 카드 / 응답 인터페이스 ──

// Step 1: 유형 카드
export interface TypeCard {
  question_type: QuestionType;
  label: string;
  description: string;
  is_active: boolean; // MVP에서 구현된 유형만 true
  user_progress?: {
    topics_mastered_count: number;
    type_mastered: boolean;
    last_session_at: string | null;
  };
}

// Step 2: 토픽 카드
export interface TopicCard {
  topic: string;
  survey_type: SurveyType;
  question_id: string; // 대표 질문 (questions.id)
  question_korean: string | null;
  question_english: string | null;
  user_progress?: {
    mastered: boolean;
    in_progress_session_id?: string;
    attempt_count?: number;
  };
}

export interface TopicsByType {
  selective: TopicCard[];
  common: TopicCard[];
}

// 한 토픽 안의 질문 리스트 아이템 (Step 2.5: 질문 선택 화면)
export interface QuestionListItem {
  question_id: string;
  question_type: QuestionType;
  question_korean: string | null;
  question_english: string;
  question_short: string | null;
  audio_url: string | null;
  user_progress?: {
    has_session: boolean;
    session_id?: string;
    attempt_count?: number;
    last_grade?: string | null;
    last_attempt_at?: string | null;
    mastered?: boolean;
  };
}

export interface QuestionListByTopic {
  type: QuestionType;
  topic: string;
  survey_type: SurveyType;
  questions: QuestionListItem[];
}

// 주제별 탭 — 카테고리/토픽 기준 질문 (유형 섞임)
export interface CoachingCategoryQuestion extends QuestionListItem {
  is_active_type: boolean; // 현재 학습 가능한 유형인지 (MVP: 묘사만)
}

// 세션 시작/재진입 응답
export interface StartSessionResult {
  session_id: string;
  attempt_count: number;
  is_resumed: boolean;
  question: {
    id: string;
    korean: string;
    english: string;
  };
}

// 답변 제출 응답
export interface SubmitAttemptResult {
  attempt_id: string;
  attempt_number: number;
  is_processing: boolean;
}

// 토픽 졸업 마킹 응답
export interface MarkMasteredResult {
  topic_mastered: boolean;
  type_mastered: boolean;
  total_topics_mastered: number;
  required_for_type_mastery: number;
}

// ── 평가 결과 표시용 (학생 화면) ──

// 학생에게 보여주는 시도 결과 (evaluation 일부 + coaching_json)
export interface AttemptDisplay {
  id: string;
  attempt_number: number;
  status: CoachingAttemptStatus;
  input_mode: InputMode;
  cleaned_transcript: string | null;
  stt_fix_log: SttFixLog[] | null;
  coaching_json: CoachingOutput | null; // 구조화 코칭 출력
  word_count: number | null;
  audio_duration: number | null;
  audio_url: string | null;
  // 학생 노출용 요약 (점수/등급은 표기 X, 흠 개수만)
  display_summary?: {
    skeleton_filled: string; // "6/7" 같은 표기 (점수 X)
    filler_count: number;
    흠_count: number;
    progress_from_prev?: string; // "흠 8 → 3" 같은 자연어
  };
  created_at: string;
  completed_at: string | null;
}

// 세션 상세 (학습 룸용)
export interface SessionDetail {
  session: CoachingSession;
  question: {
    id: string;
    korean: string;
    english: string;
    audio_url: string | null;
  };
  attempts: AttemptDisplay[];
}

// 이어하기 배너용 — 진행 중(active) 세션 요약
export interface ResumableSession {
  session_id: string;
  question_type: QuestionType;
  topic: string;
  attempt_count: number;
  last_attempt_at: string | null;
}

// ── ActionResult 표준 ──

export type ActionResult<T = null> = {
  error?: string;
  data?: T;
};
