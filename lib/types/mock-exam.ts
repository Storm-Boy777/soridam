// 모의고사 모듈 타입 정의

// ── ENUM 리터럴 타입 ──

// 모의고사 모드 (F-5)
export const MOCK_EXAM_MODES = ['training', 'test'] as const;
export type MockExamMode = (typeof MOCK_EXAM_MODES)[number];

// 세션 상태
export const SESSION_STATUSES = ['active', 'completed', 'expired'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

// 개별 답변 평가 상태
export const EVAL_STATUSES = ['pending', 'processing', 'stt_completed', 'evaluating', 'judge_completed', 'completed', 'failed', 'skipped'] as const;
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
  training: '훈련',
  test: '실전',
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
  judge_completed: '코칭 생성 중',
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

// 등급별 한줄 설명
export const OPIC_LEVEL_DESC: Record<OpicLevel, string> = {
  NH: '단어 중심으로 말합니다',
  IL: '짧은 문장을 만들 수 있습니다',
  IM1: '문장을 나열할 수 있습니다',
  IM2: '문장을 안정적으로 이어갑니다',
  IM3: '문단 구조가 시작됩니다',
  IH: '구조적으로 이야기할 수 있습니다',
  AL: '논리적으로 설명할 수 있습니다',
};

// 발음 점수 → 이해도 라벨
export function getPronunciationLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: '매우 좋음', color: 'text-green-600' };
  if (score >= 60) return { label: '괜찮음', color: 'text-yellow-600' };
  if (score >= 40) return { label: '가끔 어려움', color: 'text-orange-500' };
  return { label: '자주 어려움', color: 'text-red-500' };
}

// FACT 한글 라벨
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
  // 과제충족 + 피드백 분기 필드
  task_fulfillment: TaskFulfillment | null;
  feedback_branch: "fulfilled" | "partial" | "failed" | null;
  priority_prescription: PriorityPrescription[] | null;
}

// 과제충족
export interface TaskFulfillment {
  status: "fulfilled" | "partial" | "failed";
  checklist: {
    required: Array<{ item: string; pass: boolean; evidence: string }>;
    advanced: Array<{ item: string; pass: boolean; evidence: string }>;
  };
  completion_rate: number;
  required_pass: number;
  required_total: number;
  advanced_pass: number;
  advanced_total: number;
  reason: string;
}

// 최우선 처방
export interface PriorityPrescription {
  action: string;
  why: string;
  example: string;
}

// rescue 메시지 (무응답)
export interface RescueInfo {
  start_template: string;
  recovery_tip: string;
  tone: string;
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

// 심층 분석 (레거시)
export interface DeepAnalysis {
  overall_assessment: string;
  linguistic_analysis: string;
  communicative_effectiveness: string;
  proficiency_gap: string;
  recommendation: string;
}

// ── 코칭 타입 ──

// 개별 평가 코칭 피드백 (coaching_feedback JSONB)
export interface CoachingFeedback {
  one_line_insight: string;
  key_corrections: string[];
  answer_improvement: AnswerImprovement;
  structure_evaluation: Record<string, string>;   // { "대상 소개": "...", "세부 특징": "..." }
  skill_summary: Record<string, number>;          // { "구조적 흐름": 3, "명확성": 2 }
  deep_analysis: CoachingDeepAnalysis;
  // rescue (무응답)
  rescue?: RescueInfo | null;
}

export interface AnswerImprovement {
  corrected_version: string;
  better_version: string;
  what_changed: string;
}

export interface CoachingDeepAnalysis {
  strengths: string;
  weaknesses: string;
  target_gap: string;
  practice_suggestion: string;
}

// ============================================================
// 종합 평가 코칭 리포트 (coaching_report JSONB)
// 9섹션: snapshot, grade_explanation, top3_priorities, roadmap,
//        question_type_map, recurring_patterns, delivery_interpretation,
//        strengths, training_recommendation
// ============================================================

export interface CoachingReport {
  snapshot: ReportSnapshot;
  grade_explanation: GradeExplanation;
  top3_priorities: Top3Priority[];
  roadmap: Roadmap;
  question_type_map: QuestionTypeMapItem[];
  recurring_patterns: RecurringPattern[];
  delivery_interpretation: DeliveryInterpretation;
  strengths: ReportStrength[];
  training_recommendation: ReportTrainingPlan;
}

export interface ReportSnapshot {
  headline: string;
  diagnosis_tags: string[];
  grade_interpretation: string;
}

export interface GradeExplanation {
  fact_interpretation: {
    F: string;
    A: string;
    C: string;
    T: string;
  };
  difficulty_interpretation: string;
  grade_blockers: string[];
}

export type PriorityArea = "task_performance" | "content_structure" | "delivery";

export interface Top3Priority {
  rank: number;
  area: PriorityArea;
  label: string;
  why: string;
  where: string[];
  before: string;
  after: string;
  fix: string;
  drill_tag: string;
}

export interface Roadmap {
  current_to_next: string;
  personal_blockers: string[];
  next_to_target: string | null;
  long_term_goals: string[];
}

export interface QuestionTypeMapItem {
  type: string;
  status: "strong" | "stable" | "weak" | "very_weak";
  comment: string;
  priority: boolean;
}

export interface RecurringPattern {
  category: "grammar" | "expression" | "structure" | "task_performance" | "delivery_habit";
  label: string;
  frequency: number;
  severity: "high" | "medium" | "low";
  where: string[];
  before: string;
  after: string;
  why_recurring: string;
  fix_principle: string;
  drill_tag: string;
}

export interface DeliveryInterpretation {
  duration_comment: string;
  filler_comment: string;
  pause_comment: string;
  pronunciation_comment: string;
  overall_delivery: string;
}

export interface ReportStrength {
  area: string;
  label: string;
  detail: string;
}

export interface ReportTrainingPlan {
  course_title: string;
  focus_areas: string[];
  estimated_daily_minutes: number;
  session_count: number;
}

// tutoring_prescription (EF 자동 변환)
export interface TutoringPrescription {
  priority_weaknesses: Array<{
    rank: number;
    area: string;
    drill_tag: string | null;
  }>;
  error_drill_tags: string[];
  weak_types: string[];
  training_order: string[];
  must_fix_for_next_grade: string[];
}

// 코칭 리포트 유연 타입 (JSON 파싱 시 추가 필드 허용)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CoachingReportFlex = CoachingReport & Record<string, any>;

export interface RecurringMistake {
  // RecurringPattern과 동일 구조 (하위 호환 alias)
  category: string;
  label: string;
  frequency: number;
  severity: string;
  where: string[];
  before: string;
  after: string;
  why_recurring: string;
  fix_principle: string;
  drill_tag: string;
  // 레거시 필드 (옵션)
  pattern_name?: string;
  affected_questions?: number[];
  example_wrong?: string;
  example_correct?: string;
  practice_sentences?: string[];
  tip?: string;
}

// mock_test_reports 테이블
export interface MockTestReport {
  id: string;
  session_id: string;
  user_id: string;
  // 평가엔진 결과
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
  // 코칭
  coaching_report: CoachingReport | null;
  recurring_mistakes: RecurringPattern[] | null;
  tutoring_prescription: TutoringPrescription | null;
  avg_completion_rate: number | null;
  // 발음 통계
  avg_accuracy_score: number | null;
  avg_prosody_score: number | null;
  avg_fluency_score: number | null;
  // 성장 리포트
  growth_summary: string | null;
  growth_comparison: GrowthComparison | null;
  growth_analysis: GrowthAnalysis | null;
  // 메타
  target_level: string | null;
  test_date: string | null;
  created_at: string;
  updated_at: string;
}

// 성장 리포트: 이전 대비 변화 (규칙 기반)
export interface GrowthComparison {
  previous_session_id: string;
  previous_level: OpicLevel;
  previous_total_score: number;
  previous_score_f: number;
  previous_score_a: number;
  previous_score_c: number;
  previous_score_t: number;
  level_change: "up" | "down" | "same";
  level_diff: number;
  score_diff: number;
  score_f_diff: number;
  score_a_diff: number;
  score_c_diff: number;
  score_t_diff: number;
  session_count: number; // 이 사용자의 총 완료 세션 수
  // ⑤ question_type 비교 (규칙 기반)
  type_comparison: TypeComparisonItem[];
}

export interface TypeComparisonItem {
  type: string;
  current_pass_rate: number;
  previous_pass_rate: number | null;
  change: number | null; // current - previous
  current_count: number;
}

// 성장 리포트: GPT 생성 분석
export interface GrowthAnalysis {
  // ③ 등급 변화 원인
  level_change_reason: string;
  // ④ FACT별 해석
  fact_comments: {
    F: string;
    A: string;
    C: string;
    T: string;
  };
  // ⑥ 병목 분석
  bottleneck: {
    primary: string; // "F" | "A" | "C" | "T"
    reason: string;
  };
  // ⑦ 추천 행동
  recommended_actions: Array<{
    priority: number;
    action: string;
    training_type: string; // epp, forced_variation, timed_practice, self_repair 등
  }>;
  // 성장 패턴 (Phase D)
  growth_pattern: string | null;
  pattern_message: string | null;
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
  // 평가엔진 threshold 13개
  re_checkbox_pass_threshold: number;
  re_floor_nh: number;
  re_floor_il: number;
  re_floor_im1: number;
  re_floor_im2: number;
  re_ceiling_broke_down: number;
  re_ceiling_respond: number;
  re_sympathetic_low: number;
  re_sympathetic_mid: number;
  re_sympathetic_at_times: number;
  re_sympathetic_pron_weight: number;
  re_al_pass_threshold: number;
  re_q12_gatekeeper_threshold: number;
  // GPT 모델 설정 12개
  judge_model: string;
  judge_temperature: number;
  judge_max_tokens: number;
  coach_model: string;
  coach_temperature: number;
  coach_max_tokens: number;
  report_model: string;
  report_temperature: number;
  report_max_tokens: number;
  growth_model: string;
  growth_temperature: number;
  growth_max_tokens: number;
}

// task_fulfillment_checklists 테이블
export interface TaskFulfillmentChecklist {
  question_type: string;
  label: string;
  required: string[];
  advanced: string[];
  ideal_flow: string;
  common_mistakes: string[];
  core_prescription: string;
  feedback_tone: string;
  start_template: string;
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
  final_level: string | null;
  topic_summary: string;            // "집, 음악, 재활용, 은행, 기술"
  coaching_headline: string | null; // 종합 소견 첫 문장
  attempt_number: number;           // N회차
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
