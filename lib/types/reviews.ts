// 시험후기 모듈 타입 정의

// ── ENUM 리터럴 타입 ──

// 순수 OPIc 등급 (필터, 통계용)
export const ACHIEVED_LEVELS = ['NL', 'NM', 'NH', 'IL', 'IM1', 'IM2', 'IM3', 'IH', 'AL'] as const;
export type AchievedLevel = (typeof ACHIEVED_LEVELS)[number];

// 응시 전 등급 (첫 응시 = 'none')
export const PRE_EXAM_LEVELS = ['none', ...ACHIEVED_LEVELS] as const;
export type PreExamLevel = (typeof PRE_EXAM_LEVELS)[number];

// 취득 등급 (미발표 시 null)
export const ACHIEVED_LEVEL_OPTIONS = ACHIEVED_LEVELS;
export type AchievedLevelOption = AchievedLevel;

// 응시 난이도 (시작 레벨 - 재조정 레벨)
export const EXAM_DIFFICULTIES = [
  '6-6', '6-5', '5-6', '5-5', '5-4', '4-5', '4-4', '4-3',
  '3-4', '3-3', '3-2', '2-3', '2-2', '2-1', '1-2', '1-1',
] as const;
export type ExamDifficulty = (typeof EXAM_DIFFICULTIES)[number];

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

export const ACTUAL_DURATIONS = ['under_20', '20_25', '25_30', '30_35', '35_40'] as const;
export type ActualDuration = (typeof ACTUAL_DURATIONS)[number];

// ── 한글 레이블 매핑 ──

export const ACHIEVED_LEVEL_LABELS: Record<AchievedLevel, string> = {
  NL: 'NL',
  NM: 'NM',
  NH: 'NH',
  IL: 'IL',
  IM1: 'IM1',
  IM2: 'IM2',
  IM3: 'IM3',
  IH: 'IH',
  AL: 'AL',
};

export const PRE_EXAM_LEVEL_LABELS: Record<PreExamLevel, string> = {
  NL: 'NL',
  NM: 'NM',
  NH: 'NH',
  IL: 'IL',
  IM1: 'IM1',
  IM2: 'IM2',
  IM3: 'IM3',
  IH: 'IH',
  AL: 'AL',
  none: '처음 응시',
};

export const ACHIEVED_LEVEL_OPTION_LABELS = ACHIEVED_LEVEL_LABELS;

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

export const ACTUAL_DURATION_LABELS: Record<ActualDuration, string> = {
  under_20: '20분 미만',
  '20_25': '20~25분',
  '25_30': '25~30분',
  '30_35': '30~35분',
  '35_40': '35~40분',
};

// ── 서베이 항목 ──

// 라디오 (단일선택)
export const SURVEY_OCCUPATIONS = ['사업/회사', '재택근무/재택사업', '교사/교육자', '일 경험 없음'] as const;
export const SURVEY_STUDENT_OPTIONS = ['예', '아니오'] as const;
export const SURVEY_COURSES = ['학위 과정 수업', '전문 기술 향상을 위한 평생 학습', '어학 수업', '수강 후 5년 이상 지남'] as const;
export const SURVEY_HOUSING_OPTIONS = [
  '개인 주택이나 아파트에 홀로 거주',
  '친구나 룸메이트와 함께 주택이나 아파트에 거주',
  '가족(배우자/자녀/기타 가족)과 함께 주택이나 아파트에 거주',
  '학교 기숙사',
  '군대 막사, 군 시설',
] as const;

// 체크박스 (복수선택)
export const SURVEY_LEISURE_OPTIONS = [
  '영화보기', '클럽/나이트클럽 가기', '박물관 가기', '공원 가기', '스포츠 관람',
  '주거 개선', '게임하기(비디오, 카드, 보드, 휴대폰 등)', '공연보기', 'SNS에 글 올리기', '캠핑하기',
  '구직활동하기', '술집/바에 가기', '요리 관련 프로그램 시청하기', '친구들과 문자대화하기', '스파/마사지샵 가기',
  '당구 치기', '리얼리티쇼 시청하기', '자원봉사하기', '쇼핑하기', '차로 드라이브하기',
  'TV 시청하기', '뉴스를 보거나 듣기', '콘서트 보기', '시험 대비 과정 수강하기', '해변가기',
  '체스하기', '카페/커피전문점 가기',
] as const;

export const SURVEY_HOBBIES_OPTIONS = [
  '아이에게 책 읽어주기', '음악 감상하기', '글쓰기(편지, 단문, 시 등)', '그림그리기',
  '애완동물 기르기', '독서', '주식 투자하기', '신문 읽기', '사진 촬영하기',
  '혼자 노래 부르거나 합창하기', '악기 연주하기', '요리하기', '춤추기', '여행 관련 잡지나 블로그 읽기',
] as const;

export const SURVEY_SPORTS_OPTIONS = [
  '농구', '조깅', '야구/소프트볼', '걷기', '축구', '요가', '미식축구', '하이킹/트레킹',
  '하키', '낚시', '크로켓', '헬스', '골프', '태권도', '배구', '운동 수업 수강하기',
  '테니스', '아이스 스케이트', '배드민턴', '탁구', '수영', '자전거', '스키/스노우보드', '운동을 전혀 하지 않음',
] as const;

export const SURVEY_TRAVEL_OPTIONS = ['국내출장', '해외출장', '집에서 보내는 휴가', '국내여행', '해외여행'] as const;

// 서베이 카테고리 구조 (UI 렌더링용)
export interface SurveyCategory {
  title: string;
  name: string;
  type: 'radio' | 'checkbox';
  options: readonly string[];
}

export const SURVEY_CATEGORIES: SurveyCategory[] = [
  { title: '현재 직업 분야', name: 'survey_occupation', type: 'radio', options: SURVEY_OCCUPATIONS },
  { title: '학생 여부', name: 'survey_student', type: 'radio', options: SURVEY_STUDENT_OPTIONS },
  { title: '수강 경력', name: 'survey_course', type: 'radio', options: SURVEY_COURSES },
  { title: '거주 형태', name: 'survey_housing', type: 'radio', options: SURVEY_HOUSING_OPTIONS },
  { title: '여가 활동', name: 'survey_leisure', type: 'checkbox', options: SURVEY_LEISURE_OPTIONS },
  { title: '취미/관심사', name: 'survey_hobbies', type: 'checkbox', options: SURVEY_HOBBIES_OPTIONS },
  { title: '운동', name: 'survey_sports', type: 'checkbox', options: SURVEY_SPORTS_OPTIONS },
  { title: '휴가/출장', name: 'survey_travel', type: 'checkbox', options: SURVEY_TRAVEL_OPTIONS },
];

// 소리담 추천 서베이 (고정 조합)
export const RECOMMENDED_SURVEY = {
  survey_occupation: '일 경험 없음',
  survey_student: '아니오',
  survey_course: '수강 후 5년 이상 지남',
  survey_housing: '개인 주택이나 아파트에 홀로 거주',
  survey_leisure: ['영화보기', '쇼핑하기', 'TV 시청하기', '공연보기', '콘서트 보기'],
  survey_hobbies: ['음악 감상하기'],
  survey_sports: ['조깅', '걷기', '운동을 전혀 하지 않음'],
  survey_travel: ['집에서 보내는 휴가', '국내여행', '해외여행'],
} as const;

// ── DB 매핑 타입 ──

export type SubmissionSource = 'user' | 'admin';

export interface Submission {
  id: number;
  user_id: string;
  exam_date: string;
  exam_difficulty: ExamDifficulty;
  pre_exam_level: PreExamLevel;
  achieved_level: AchievedLevelOption | null;
  exam_purpose: ExamPurpose;
  study_methods: StudyMethod[];
  prep_duration: PrepDuration;
  attempt_count: AttemptCount;
  perceived_difficulty: PerceivedDifficulty;
  actual_duration: ActualDuration;
  used_recommended_survey: boolean;
  survey_occupation: string | null;
  survey_student: string | null;
  survey_course: string | null;
  survey_housing: string | null;
  survey_leisure: string | null;
  survey_hobbies: string | null;
  survey_sports: string | null;
  survey_travel: string | null;
  one_line_review: string | null;
  tips: string | null;
  status: 'draft' | 'complete';
  step_completed: number;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  source: SubmissionSource;
}

export interface SubmissionQuestion {
  id: number;
  submission_id: number;
  question_number: number;
  combo_type: ComboType;
  topic: string;
  question_id: string | null;
  custom_question_text: string | null;
  is_not_remembered: boolean;
  created_at: string;
}

export interface QuestionItem {
  question_number: number;
  combo_type: ComboType;
  topic: string;
  question_id: string | null;
  custom_question_text: string | null;
  is_not_remembered: boolean;
}

// ── 콤보 단계 정보 ──

interface ComboStep {
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
    questions?: {
      id: string;
      question_short: string | null;
      question_english: string;
      question_korean: string;
      question_type_eng: string | null;
      topic: string;
    } | null;
  })[];
}

export type SurveyType = '선택형' | '공통형' | '롤플레이';

export interface FrequencyItem {
  topic: string;
  combo_type: ComboType;
  frequency: number;
  survey_type?: SurveyType;
}

export interface QuestionFrequencyItem {
  question_english: string;
  question_korean: string;
  question_type: string | null;
  frequency: number;
}

// question_type_eng 정렬 순서
// 일반: 묘사 → 루틴 → 비교 → 경험(어린시절) → 경험(최근)
// 롤플레이: rp_11 → rp_12 → 경험(특별)
// 어드밴스: adv_14 → adv_15
export const QUESTION_TYPE_ORDER: Record<string, number> = {
  description: 1,
  routine: 2,
  comparison: 3,
  past_childhood: 4,
  past_recent: 5,
  rp_11: 6,
  rp_12: 7,
  past_special: 8,
  adv_14: 9,
  adv_15: 10,
};

// question_type_eng 한글 레이블 (questions.question_type_kor 기준, 짧은 뱃지 문구)
export const QUESTION_TYPE_LABELS: Record<string, string> = {
  description: "묘사",
  routine: "루틴",
  comparison: "비교",
  past_special: "경험·특별",
  past_recent: "경험·최근",
  past_childhood: "경험·처음",
  rp_11: "질문하기",
  rp_12: "대안제시",
  adv_14: "비교·변화",
  adv_15: "사회이슈",
};

// question_type_eng 뱃지 색상 (테라코타/웜톤 디자인 시스템 기준)
export const QUESTION_TYPE_COLORS: Record<string, string> = {
  description: "bg-blue-50 text-blue-700",
  routine: "bg-green-50 text-green-700",
  comparison: "bg-purple-50 text-purple-700",
  past_special: "bg-amber-50 text-amber-700",
  past_recent: "bg-orange-50 text-orange-700",
  past_childhood: "bg-rose-50 text-rose-700",
  rp_11: "bg-teal-50 text-teal-700",
  rp_12: "bg-indigo-50 text-indigo-700",
  adv_14: "bg-red-50 text-red-700",
  adv_15: "bg-pink-50 text-pink-700",
};

export interface ReviewStats {
  totalReviews: number;
  uniqueTopics: number;
  uniqueQuestions: number;
}

// ── 빈도 분석 서브탭 ──

export const FREQUENCY_CATEGORIES = ['일반', '롤플레이', '어드밴스'] as const;
export type FrequencyCategory = (typeof FREQUENCY_CATEGORIES)[number];

export const FREQUENCY_COMBO_MAP: Record<FrequencyCategory, ComboType[]> = {
  '일반': ['general_1', 'general_2', 'general_3'],
  '롤플레이': ['roleplay'],
  '어드밴스': ['advance'],
};
