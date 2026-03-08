// 모의고사 모듈 타입 정의

// ── ENUM 리터럴 타입 ──

// 모의고사 모드 (F-5)
export const MOCK_EXAM_MODES = ['training', 'test'] as const;
export type MockExamMode = (typeof MOCK_EXAM_MODES)[number];

// 세션 상태
export const SESSION_STATUSES = ['active', 'completed', 'expired'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

// 개별 답변 평가 상태
export const EVAL_STATUSES = ['pending', 'processing', 'stt_completed', 'evaluating', 'completed', 'failed', 'skipped'] as const;
export type EvalStatus = (typeof EVAL_STATUSES)[number];

// 종합 평가 상태
export const HOLISTIC_STATUSES = ['pending', 'processing', 'completed', 'failed'] as const;
export type HolisticStatus = (typeof HOLISTIC_STATUSES)[number];

// 체크박스 타입
export const CHECKBOX_TYPES = ['INT', 'ADV', 'AL'] as const;
export type CheckboxType = (typeof CHECKBOX_TYPES)[number];

// OPIc 최종 등급
export const OPIC_LEVELS = ['NH', 'IL', 'IM1', 'IM2', 'IM3', 'IH', 'AL'] as const;
export type OpicLevel = (typeof OPIC_LEVELS)[number];

// 기출 승인 상태
export const EXAM_APPROVED_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type ExamApprovedStatus = (typeof EXAM_APPROVED_STATUSES)[number];

// question_type → 프롬프트 그룹 매핑 (F-15)
export const QUESTION_TYPE_TO_PROMPT: Record<string, string> = {
  description: 'eval_description',
  routine: 'eval_routine',
  rp_11: 'eval_asking_questions',
  comparison: 'eval_comparison',
  past_childhood: 'eval_past_experience',
  past_recent: 'eval_past_experience',
  past_special: 'eval_past_experience',
  rp_12: 'eval_suggest_alternatives',
  adv_14: 'eval_comparison_change',
  adv_15: 'eval_social_issue',
};

// question_type → checkbox_type 매핑
export const QUESTION_TYPE_TO_CHECKBOX: Record<string, CheckboxType> = {
  description: 'INT',
  routine: 'INT',
  rp_11: 'INT',       // 질문하기 롤플레이 (+INT-3)
  comparison: 'ADV',
  past_childhood: 'ADV',
  past_recent: 'ADV',
  past_special: 'ADV',
  rp_12: 'ADV',       // 대안제시 (+ADV-4)
  adv_14: 'AL',
  adv_15: 'AL',
};

// ── 한글 레이블 매핑 ──

export const MOCK_EXAM_MODE_LABELS: Record<MockExamMode, string> = {
  training: '훈련 모드',
  test: '실전 모드',
};

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  active: '진행 중',
  completed: '완료',
  expired: '만료',
};

export const EVAL_STATUS_LABELS: Record<EvalStatus, string> = {
  pending: '대기 중',
  processing: '음성 분석 중',
  stt_completed: '체크박스 평가 중',
  evaluating: '평가 진행 중',
  completed: '평가 완료',
  failed: '평가 실패',
  skipped: '건너뜀',
};

export const OPIC_LEVEL_LABELS: Record<OpicLevel, string> = {
  NH: 'NH · Novice High',
  IL: 'IL · Intermediate Low',
  IM1: 'IM1 · Intermediate Mid 1',
  IM2: 'IM2 · Intermediate Mid 2',
  IM3: 'IM3 · Intermediate Mid 3',
  IH: 'IH · Intermediate High',
  AL: 'AL · Advanced Low',
};

export const OPIC_LEVEL_SHORT_LABELS: Record<OpicLevel, string> = {
  NH: 'NH', IL: 'IL', IM1: 'IM1', IM2: 'IM2', IM3: 'IM3', IH: 'IH', AL: 'AL',
};

// 등급 순서 (낮은 → 높은, 차트/비교용)
export const OPIC_LEVEL_ORDER: Record<OpicLevel, number> = {
  NH: 1, IL: 2, IM1: 3, IM2: 4, IM3: 5, IH: 6, AL: 7,
};

// V2: 등급별 한줄 설명
export const OPIC_LEVEL_DESC: Record<OpicLevel, string> = {
  NH: '단어 중심으로 말합니다',
  IL: '짧은 문장을 만들 수 있습니다',
  IM1: '문장을 나열할 수 있습니다',
  IM2: '문장을 안정적으로 이어갑니다',
  IM3: '문단 구조가 시작됩니다',
  IH: '구조적으로 이야기할 수 있습니다',
  AL: '논리적으로 설명할 수 있습니다',
};

// V2: 발음 점수 → 이해도 라벨
export function getPronunciationLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: '매우 좋음', color: 'text-green-600' };
  if (score >= 60) return { label: '괜찮음', color: 'text-yellow-600' };
  if (score >= 40) return { label: '가끔 어려움', color: 'text-orange-500' };
  return { label: '자주 어려움', color: 'text-red-500' };
}

// V2: FACT 한글 라벨
export const FACT_LABELS: Record<string, string> = {
  F: '말하기흐름',
  A: '문법정확성',
  C: '내용풍부도',
  T: '질문수행',
};

// ── DB 매핑 인터페이스 ──

// mock_test_sessions 테이블
export interface MockTestSession {
  id: string;
  session_id: string;
  user_id: string;
  submission_id: number;
  mode: MockExamMode;
  status: SessionStatus;
  question_ids: string[];          // Q2~Q15 (14개)
  current_question: number;
  total_questions: number;
  holistic_status: HolisticStatus;
  report_retry_count: number;
  report_error: string | null;
  started_at: string;
  completed_at: string | null;
  expires_at: string;
}

// mock_test_answers 테이블
export interface MockTestAnswer {
  id: string;
  session_id: string;
  question_number: number;         // 1~15
  question_id: string | null;      // Q1은 null
  audio_url: string | null;
  audio_duration: number | null;
  transcript: string | null;
  word_count: number | null;
  filler_word_count: number;
  long_pause_count: number;
  pronunciation_assessment: PronunciationAssessment | null;
  eval_status: EvalStatus;
  eval_retry_count: number;
  eval_error: string | null;
  skipped: boolean;
  created_at: string;
}

// Azure 발음 평가 결과
export interface PronunciationAssessment {
  accuracy_score: number;
  prosody_score: number;
  fluency_score: number;
  completeness_score?: number;
  pronunciation_score?: number;
  words?: PronunciationWord[];
}

export interface PronunciationWord {
  word: string;
  accuracyScore: number;
  errorType: 'None' | 'Mispronunciation' | 'Omission' | 'Insertion';
}

// mock_test_evaluations 테이블
export interface MockTestEvaluation {
  id: string;
  session_id: string;
  user_id: string;
  question_number: number;
  question_id: string;
  question_type: string;
  checkbox_type: CheckboxType | null;
  checkbox_count: number | null;
  checkboxes: Record<string, CheckboxResult> | null;
  pass_count: number | null;
  fail_count: number | null;
  pass_rate: number | null;
  sentences: SentenceItem[] | null;
  corrections: CorrectionItem[] | null;
  deep_analysis: DeepAnalysis | null;
  coaching_feedback: CoachingFeedback | null;
  transcript: string | null;
  wpm: number | null;
  audio_duration: number | null;
  filler_count: number | null;
  long_pause_count: number | null;
  pronunciation_assessment: PronunciationAssessment | null;
  audio_url: string | null; // mock_test_answers에서 JOIN
  model: string | null;
  prompt_version: string;
  tokens_used: number | null;
  processing_time_ms: number | null;
  skipped: boolean;
  created_at: string;
}

// 체크박스 개별 결과
export interface CheckboxResult {
  pass: boolean;
  evidence: string;
}

// 문장 아이템
export interface SentenceItem {
  index: number;
  text: string;
}

// 교정 아이템
export interface CorrectionItem {
  sentence_index: number;
  error_parts: string[];
  tip_korean: string;
  corrected_segment: string;
}

// 심층 분석 (V1 — 하위 호환용)
export interface DeepAnalysis {
  overall_assessment: string;
  linguistic_analysis: string;
  communicative_effectiveness: string;
  proficiency_gap: string;
  recommendation: string;
}

// ── V2 코칭 타입 ──

// 개별 평가 코칭 피드백 (coaching_feedback JSONB)
export interface CoachingFeedback {
  one_line_insight: string;
  key_corrections: KeyCorrection[];
  answer_improvement: AnswerImprovement;
  structure_evaluation: StructureEvaluation;
  skill_summary: Record<string, SkillScore>;
  deep_analysis: CoachingDeepAnalysis;
}

export interface KeyCorrection {
  sentence_index: number;
  original: string;
  corrected: string;
  better: string;
  why: string;
  impact: 'high' | 'medium' | 'low';
}

export interface AnswerImprovement {
  student_summary: string;
  corrected_version: string;
  better_version: string;
  what_changed: string[];
}

export interface StructureEvaluation {
  has_intro: boolean;
  has_body: boolean;
  has_conclusion: boolean;
  structure_score: number;        // 1-5
  structure_label: string;
  time_distribution: {
    intro_pct: number;
    body_pct: number;
    conclusion_pct: number;
  };
  story_density: {
    example_count: number;
    detail_level: 'low' | 'medium' | 'high';
  };
  tip: string;
}

export interface SkillScore {
  score: number;                  // 개별: 1-5, 종합: 1-10
  label: string;
  brief: string;
}

export interface CoachingDeepAnalysis {
  strengths: string[];
  weaknesses: Array<{
    point: string;
    l1_cause: string;
    level_impact: string;
  }>;
  target_gap: {
    target: string;
    key_gap: string;
    example_at_target: string;
  };
  practice_suggestion: {
    focus: string;
    method: string;
    example_exercise: string;
  };
}

// 종합 평가 코칭 리포트 (coaching_report JSONB)
export interface CoachingReport {
  coach_diagnosis: CoachDiagnosis;
  level_comparison: LevelComparison;
  skill_radar: Record<string, SkillScore>;
  recurring_mistakes: RecurringMistake[];
  question_type_analysis: QuestionTypeAnalysis;
  action_plan: ActionPlanItem[];
  detailed_analysis: DetailedAnalysis;
  training_recommendations: V2TrainingRecommendation[];
}

export interface CoachDiagnosis {
  level_sentence: string;
  level_description: string;
  why_this_level: string;
  confidence_band: number;
  key_strength: string;
  key_weakness: string;
  next_level_path: string;
}

export interface LevelComparison {
  current_level: string;
  next_level: string;
  comparison_question: string;
  current_level_answer: string;
  next_level_answer: string;
  key_differences: string[];
}

export interface RecurringMistake {
  pattern_name: string;
  category: string;
  severity: string;
  frequency: number;
  affected_questions: number[];
  example_wrong: string;
  example_correct: string;
  practice_sentences: string[];
  tip: string;
}

export interface QuestionTypeAnalysis {
  strong_types: Array<{ type: string; label: string; reason: string }>;
  weak_types: Array<{ type: string; label: string; reason: string; strategy: string }>;
  priority_focus: { type: string; label: string; reason: string };
}

export interface ActionPlanItem {
  priority: number;
  action: string;
  why: string;
  how: string;
  expected_result: string;
}

export interface DetailedAnalysis {
  strengths_detail: string[];
  weaknesses_detail: string[];
  int_adv_gap: string;
}

export interface V2TrainingRecommendation {
  category: string;
  target_type: string;
  target_label: string;
  reason: string;
  practice_tip: string;
  model_sentence: string;
}

// mock_test_reports 테이블
export interface MockTestReport {
  id: string;
  session_id: string;
  user_id: string;
  // 규칙 엔진 결과
  final_level: OpicLevel | null;
  floor_status: string | null;
  floor_level: string | null;
  ceiling_status: string | null;
  sympathetic_listener: string | null;
  // 체크박스 집계
  int_pass_rate: number | null;
  adv_pass_rate: number | null;
  al_pass_rate: number | null;
  valid_question_count: number | null;
  aggregated_int_checkboxes: Record<string, CheckboxResult> | null;
  aggregated_adv_checkboxes: Record<string, CheckboxResult> | null;
  aggregated_al_checkboxes: Record<string, CheckboxResult> | null;
  al_judgment: string | null;
  q12_gatekeeper: string | null;
  skipped_questions: number[] | null;
  // 상태
  rule_engine_status: string;
  report_status: string;
  // FACT 점수
  score_f: number | null;
  score_a: number | null;
  score_c: number | null;
  score_t: number | null;
  total_score: number | null;
  // 피드백
  overall_comments_en: string | null;
  overall_comments_ko: string | null;
  int_performance: Record<string, unknown> | null;
  adv_performance: Record<string, unknown> | null;
  comprehensive_feedback: string | null;
  training_recommendations: TrainingRecommendation[] | null;
  // V2 코칭
  coaching_report: CoachingReport | null;
  recurring_mistakes: RecurringMistake[] | null;
  // 발음 통계
  avg_accuracy_score: number | null;
  avg_prosody_score: number | null;
  avg_fluency_score: number | null;
  // 메타
  target_level: string | null;
  test_date: string | null;
  created_at: string;
  updated_at: string;
}

// 훈련 권장 항목
export interface TrainingRecommendation {
  question_type: string;
  priority: number;
  reason_ko: string;
  reason_en: string;
}

// mock_test_eval_settings 테이블
export interface MockTestEvalSettings {
  id: number;
  model_name: string;
  temperature: number;
  max_tokens: number;
  retry_count: number;
  enabled_description: boolean;
  enabled_routine: boolean;
  enabled_asking_questions: boolean;
  enabled_comparison: boolean;
  enabled_past_experience: boolean;
  enabled_suggest_alternatives: boolean;
  enabled_comparison_change: boolean;
  enabled_social_issue: boolean;
  updated_at: string;
}

// evaluation_prompts 테이블
export interface EvaluationPrompt {
  id: string;
  key: string;
  content: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── UI/프론트엔드 헬퍼 타입 ──

// 기출 풀 미리보기 카드 (F-1)
export interface ExamPoolPreview {
  submission_id: number;
  exam_date: string;
  achieved_level: string | null;
  topics: ExamPoolTopic[];          // 콤보별 대표 주제
  question_type_distribution: Record<string, number>;  // question_type별 문항 수 (UX 1-1)
  difficulty_hint: number;          // 1~3 (쉬움/보통/어려움, UX 1-1)
}

// 기출 카드의 콤보별 주제
export interface ExamPoolTopic {
  combo_type: string;               // general_1, general_2, general_3, roleplay, advance
  topic: string;
  category: string;
}

// 시험 세션 진행 상태 (프론트엔드 상태 관리)
export interface MockExamSessionState {
  phase: 'pool' | 'mode' | 'device' | 'session' | 'waiting' | 'result';
  selectedSubmissionId: number | null;
  selectedMode: MockExamMode | null;
  sessionId: string | null;
  currentQuestion: number;
  answers: Record<number, AnswerState>;
  isRecording: boolean;
  timerSeconds: number;             // 실전: 카운트다운, 훈련: 경과 시간
  isOnline: boolean;                // UX 6-1
}

// 개별 답변 상태 (프론트엔드)
export interface AnswerState {
  questionNumber: number;
  status: 'pending' | 'listening' | 'replay_window' | 'recording' | 'uploading' | 'submitted' | 'skipped';
  audioBlob: Blob | null;
  audioUrl: string | null;
  evalStatus: EvalStatus;
  evaluation: MockTestEvaluation | null;
}

// 질문 오디오 재생 상태
export interface QuestionPlayerState {
  isPlaying: boolean;
  canReplay: boolean;               // 5초 내 1회
  replayCountdown: number;          // 0이면 리플레이 불가
  hasPlayed: boolean;
}

// 녹음기 상태
export interface RecorderState {
  isRecording: boolean;
  duration: number;                 // 초 단위
  volume: number;                   // 0~1 (볼륨 바용)
  hasRecording: boolean;
  audioBlob: Blob | null;
}

// 기출 이력 요약 (이력 탭)
export interface MockExamHistoryItem {
  session_id: string;
  mode: MockExamMode;
  status: SessionStatus;
  started_at: string;
  completed_at: string | null;
  final_level: OpicLevel | null;
  total_score: number | null;
  score_f: number | null;
  score_a: number | null;
  score_c: number | null;
  score_t: number | null;
  topic_summary: string;            // "집, 음악, 재활용, 은행, 기술"
}

// 등급 추이 데이터 (UX 5-3)
export interface LevelTrendItem {
  session_id: string;
  test_date: string;
  final_level: OpicLevel;
  total_score: number;
  attempt_number: number;
}

// ── 유틸 함수 ──

// question_type → 프롬프트 키 매핑 (F-15)
export function getPromptKey(questionType: string): string {
  return QUESTION_TYPE_TO_PROMPT[questionType] || `eval_${questionType}`;
}

// question_type → checkbox_type 매핑
export function getCheckboxType(questionType: string): CheckboxType {
  return QUESTION_TYPE_TO_CHECKBOX[questionType] || 'INT';
}

// 세션 ID 생성 (mt_xxxxxxxx)
export function generateSessionId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = 'mt_';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// 난이도 힌트 계산 (UX 1-1: question_type 분포 기반)
export function calculateDifficultyHint(questionTypes: string[]): number {
  const advCount = questionTypes.filter(t =>
    ['comparison', 'past_childhood', 'past_recent', 'past_special', 'rp_12', 'adv_14', 'adv_15'].includes(t)
  ).length;
  const ratio = advCount / questionTypes.length;
  if (ratio >= 0.6) return 3;      // 어려움
  if (ratio >= 0.4) return 2;      // 보통
  return 1;                         // 쉬움
}

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: '쉬움',
  2: '보통',
  3: '어려움',
};
