// 시험후기 모듈 타입 정의

// ── ENUM 리터럴 타입 ──

// 순수 OPIc 등급 (필터, 통계용)
export const ACHIEVED_LEVELS = ['NH', 'IL', 'IM1', 'IM2', 'IM3', 'IH', 'AL'] as const;
export type AchievedLevel = (typeof ACHIEVED_LEVELS)[number];

// 응시 전 등급 (첫 응시 = 'none')
export const PRE_EXAM_LEVELS = [...ACHIEVED_LEVELS, 'none'] as const;
export type PreExamLevel = (typeof PRE_EXAM_LEVELS)[number];

// 취득 등급 (미발표 = 'unknown')
export const ACHIEVED_LEVEL_OPTIONS = [...ACHIEVED_LEVELS, 'unknown'] as const;
export type AchievedLevelOption = (typeof ACHIEVED_LEVEL_OPTIONS)[number];

export const COMBO_TYPES = ['general_1', 'general_2', 'general_3', 'roleplay', 'advance'] as const;
export type ComboType = (typeof COMBO_TYPES)[number];

export const EXAM_PURPOSES = ['employment', 'promotion', 'job_change', 'graduation', 'self_development'] as const;
export type ExamPurpose = (typeof EXAM_PURPOSES)[number];

export const STUDY_METHODS = ['self_study', 'online_lecture', 'academy', 'study_group', 'app'] as const;
export type StudyMethod = (typeof STUDY_METHODS)[number];

export const PREP_DURATIONS = ['under_1w', '1_2w', '3_4w', '1_2m', '3m_plus'] as const;
export type PrepDuration = (typeof PREP_DURATIONS)[number];

export const ATTEMPT_COUNTS = ['first', '2nd', '3rd', '4th', '5th_plus'] as const;
export type AttemptCount = (typeof ATTEMPT_COUNTS)[number];

export const PERCEIVED_DIFFICULTIES = ['easy', 'normal', 'hard'] as const;
export type PerceivedDifficulty = (typeof PERCEIVED_DIFFICULTIES)[number];

export const TIME_SUFFICIENCIES = ['sufficient', 'adequate', 'insufficient'] as const;
export type TimeSufficiency = (typeof TIME_SUFFICIENCIES)[number];

export const ACTUAL_DURATIONS = ['under_20', '20_25', '25_30', '30_35', '35_40'] as const;
export type ActualDuration = (typeof ACTUAL_DURATIONS)[number];

// ── 한글 레이블 매핑 ──

export const ACHIEVED_LEVEL_LABELS: Record<AchievedLevel, string> = {
  AL: 'AL (Advanced Low)',
  IH: 'IH (Intermediate High)',
  IM3: 'IM3 (Intermediate Mid 3)',
  IM2: 'IM2 (Intermediate Mid 2)',
  IM1: 'IM1 (Intermediate Mid 1)',
  IL: 'IL (Intermediate Low)',
  NH: 'NH (Novice High)',
};

// Pill용 짧은 레이블
export const PRE_EXAM_LEVEL_LABELS: Record<PreExamLevel, string> = {
  AL: 'AL', IH: 'IH', IM3: 'IM3', IM2: 'IM2', IM1: 'IM1', IL: 'IL', NH: 'NH',
  none: '없음 (첫 응시)',
};

export const ACHIEVED_LEVEL_OPTION_LABELS: Record<AchievedLevelOption, string> = {
  AL: 'AL', IH: 'IH', IM3: 'IM3', IM2: 'IM2', IM1: 'IM1', IL: 'IL', NH: 'NH',
  unknown: '아직 모름 (발표 전)',
};

export const EXAM_PURPOSE_LABELS: Record<ExamPurpose, string> = {
  employment: '취업',
  promotion: '승진/인사',
  job_change: '이직',
  graduation: '졸업 요건',
  self_development: '자기 계발',
};

export const STUDY_METHOD_LABELS: Record<StudyMethod, string> = {
  self_study: '독학',
  online_lecture: '인강',
  academy: '학원',
  study_group: '스터디',
  app: '앱/서비스',
};

export const PREP_DURATION_LABELS: Record<PrepDuration, string> = {
  under_1w: '1주 미만',
  '1_2w': '1~2주',
  '3_4w': '3~4주',
  '1_2m': '1~2개월',
  '3m_plus': '3개월 이상',
};

export const ATTEMPT_COUNT_LABELS: Record<AttemptCount, string> = {
  first: '첫 응시',
  '2nd': '2회차',
  '3rd': '3회차',
  '4th': '4회차',
  '5th_plus': '5회 이상',
};

export const PERCEIVED_DIFFICULTY_LABELS: Record<PerceivedDifficulty, string> = {
  easy: '쉬웠다',
  normal: '보통이었다',
  hard: '어려웠다',
};

export const TIME_SUFFICIENCY_LABELS: Record<TimeSufficiency, string> = {
  sufficient: '충분했다',
  adequate: '적당했다',
  insufficient: '부족했다',
};

export const ACTUAL_DURATION_LABELS: Record<ActualDuration, string> = {
  under_20: '20분 미만',
  '20_25': '20~25분',
  '25_30': '25~30분',
  '30_35': '30~35분',
  '35_40': '35~40분',
};

export const COMBO_TYPE_LABELS: Record<ComboType, string> = {
  general_1: '일반콤보 1 (2~4번)',
  general_2: '일반콤보 2 (5~7번)',
  general_3: '일반콤보 3 (8~10번)',
  roleplay: '롤플레이 (11~13번)',
  advance: '어드밴스 (14~15번)',
};

// ── DB 매핑 타입 ──

export interface Submission {
  id: number;
  user_id: string;
  exam_date: string;
  pre_exam_level: PreExamLevel;
  achieved_level: AchievedLevelOption;
  exam_purpose: ExamPurpose;
  study_methods: StudyMethod[];
  prep_duration: PrepDuration;
  attempt_count: AttemptCount;
  perceived_difficulty: PerceivedDifficulty;
  time_sufficiency: TimeSufficiency;
  actual_duration: ActualDuration;
  one_line_review: string | null;
  tips: string | null;
  status: 'draft' | 'complete';
  step_completed: number;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmissionQuestion {
  id: number;
  submission_id: number;
  question_number: number;
  combo_type: ComboType;
  topic: string;
  master_question_id: string | null;
  custom_question_text: string | null;
  is_not_remembered: boolean;
  created_at: string;
}

export interface SubmissionCombo {
  id: number;
  submission_id: number;
  combo_type: ComboType;
  topic: string;
  question_ids: string[];
  created_at: string;
}

// ── Step별 폼 데이터 ──

export interface Step1FormData {
  exam_date: string;
  pre_exam_level: PreExamLevel;
  achieved_level: AchievedLevelOption;
  exam_purpose: ExamPurpose;
  study_methods: StudyMethod[];
  prep_duration: PrepDuration;
  attempt_count: AttemptCount;
  perceived_difficulty: PerceivedDifficulty;
  time_sufficiency: TimeSufficiency;
  actual_duration: ActualDuration;
}

export interface QuestionItem {
  question_number: number;
  combo_type: ComboType;
  topic: string;
  master_question_id: string | null;
  custom_question_text: string | null;
  is_not_remembered: boolean;
}

export interface Step3FormData {
  one_line_review: string;
  tips: string;
}

// ── 콤보 단계 정보 ──

export interface ComboStep {
  comboType: ComboType;
  label: string;
  questionNumbers: number[];
  questionCount: number;
  category: '일반' | '롤플레이' | '어드밴스';
}

export const COMBO_STEPS: ComboStep[] = [
  { comboType: 'general_1', label: '일반콤보 1', questionNumbers: [2, 3, 4], questionCount: 3, category: '일반' },
  { comboType: 'general_2', label: '일반콤보 2', questionNumbers: [5, 6, 7], questionCount: 3, category: '일반' },
  { comboType: 'general_3', label: '일반콤보 3', questionNumbers: [8, 9, 10], questionCount: 3, category: '일반' },
  { comboType: 'roleplay', label: '롤플레이', questionNumbers: [11, 12, 13], questionCount: 3, category: '롤플레이' },
  { comboType: 'advance', label: '어드밴스', questionNumbers: [14, 15], questionCount: 2, category: '어드밴스' },
];

// ── 응답 타입 ──

export interface SubmissionWithQuestions extends Submission {
  submission_questions: (SubmissionQuestion & {
    master_questions?: {
      question_id: string;
      question_english: string;
      question_korean: string;
      answer_type: string | null;
      topic: string;
    } | null;
  })[];
}

export interface FrequencyItem {
  topic: string;
  combo_type: ComboType;
  frequency: number;
}

export interface ReviewStats {
  totalReviews: number;
  uniqueTopics: number;
  totalParticipants: number;
}

// ── 빈도 분석 서브탭 ──

export const FREQUENCY_CATEGORIES = ['일반', '롤플레이', '어드밴스'] as const;
export type FrequencyCategory = (typeof FREQUENCY_CATEGORIES)[number];

export const FREQUENCY_COMBO_MAP: Record<FrequencyCategory, ComboType[]> = {
  '일반': ['general_1', 'general_2', 'general_3'],
  '롤플레이': ['roleplay'],
  '어드밴스': ['advance'],
};
