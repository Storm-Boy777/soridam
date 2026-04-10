// 튜터링 모듈 타입 정의
// 설계서: docs/설계/튜터링.md

import type { OpicLevel } from './mock-exam';

// ── ENUM 리터럴 타입 ──

// 튜터링 세션 상태
export const TUTORING_STATUSES = ['diagnosing', 'diagnosed', 'active', 'completed'] as const;
export type TutoringStatus = (typeof TUTORING_STATUSES)[number];

// Focus 상태
export const FOCUS_STATUSES = ['pending', 'active', 'improving', 'graduated', 'hold'] as const;
export type FocusStatus = (typeof FOCUS_STATUSES)[number];

// 드릴 상태
export const DRILL_STATUSES = ['pending', 'active', 'passed', 'failed'] as const;
export type DrillStatus = (typeof DRILL_STATUSES)[number];

// 드릴 시도 결과
export const ATTEMPT_RESULTS = ['pending', 'pass', 'retry', 'escalate_l2'] as const;
export type AttemptResult = (typeof ATTEMPT_RESULTS)[number];

// 힌트 레벨
export const HINT_LEVELS = ['full', 'reduced', 'minimal'] as const;
export type HintLevel = (typeof HINT_LEVELS)[number];

// 재평가 모드
export const RETEST_MODES = ['bottleneck', 'type', 'topic'] as const;
export type RetestMode = (typeof RETEST_MODES)[number];

// 재평가 결과
export const RETEST_RESULTS = ['graduated', 'improving', 'hold'] as const;
export type RetestResult = (typeof RETEST_RESULTS)[number];

// 병목 카테고리
export const BOTTLENECK_CATEGORIES = ['foundation', 'type', 'skill', 'target_gap'] as const;
export type BottleneckCategory = (typeof BOTTLENECK_CATEGORIES)[number];

// Type mastery 상태
export const MASTERY_LEVELS = ['stable', 'borderline', 'weak', 'not_ready'] as const;
export type MasteryLevel = (typeof MASTERY_LEVELS)[number];

// ── 한국어 라벨 매핑 ──

export const TUTORING_STATUS_LABELS: Record<TutoringStatus, string> = {
  diagnosing: '진단 중',
  diagnosed: '진단 완료',
  active: '훈련 진행 중',
  completed: '완료',
};

export const FOCUS_STATUS_LABELS: Record<FocusStatus, string> = {
  pending: '대기',
  active: '진행 중',
  improving: '개선 중',
  graduated: '통과',
  hold: '보류',
};

export const RETEST_RESULT_LABELS: Record<RetestResult, string> = {
  graduated: '통과',
  improving: '개선 중',
  hold: '재훈련 필요',
};

// ── DB 테이블 매핑 인터페이스 ──

// tutoring_sessions
export interface TutoringSession {
  id: string;
  user_id: string;
  analyzed_session_ids: string[];

  // Prompt C 진단 결과
  current_stable_level: OpicLevel;
  ceiling_candidate_level: OpicLevel | null;
  next_step_level: OpicLevel;
  final_target_level: OpicLevel;
  stable_confidence: number | null;
  floor_status: FloorStatus | null;
  target_gap_summary: TargetGapSummary | null;
  diagnosis_internal: DiagnosisInternal | null;
  top_bottlenecks: Bottleneck[] | null;
  student_top_focuses: StudentFocus[] | null;
  student_summary: StudentSummary | null;

  // Prompt D 처방
  prescription_json: PrescriptionResult | null;

  // 메타
  status: TutoringStatus;
  model: string | null;
  tokens_used: number | null;
  prompt_version: string | null;
  created_at: string;
  completed_at: string | null;
}

// tutoring_focuses
export interface TutoringFocus {
  id: string;
  session_id: string;
  priority_rank: number;
  focus_code: string;
  label: string;
  reason: string | null;
  why_now_for_target: string | null;

  // QSE
  selection_policy: SelectionPolicy | null;
  question_pool: QuestionPool | null;

  // Prompt E
  drill_session_plan: DrillSessionPlan | null;

  // 졸업 추적
  status: FocusStatus;
  drill_pass_count: number;
  transfer_pass_count: number;
  retest_pass_count: number;

  created_at: string;
}

// tutoring_drills
export interface TutoringDrill {
  id: string;
  focus_id: string;
  question_number: number; // 1, 2, 3
  question_id: string;
  question_english: string;
  topic: string | null;
  goal: string | null;
  hint_level: HintLevel;
  frame_slots: FrameSlot[] | null;
  sample_answer: string | null;
  pass_criteria: PassCriteria | null;
  rule_only_hint: string | null;

  status: DrillStatus;
  created_at: string;
}

// tutoring_attempts
export interface TutoringAttempt {
  id: string;
  drill_id: string;
  attempt_number: number;

  // 녹음/STT
  transcript: string | null;
  audio_url: string | null;
  audio_duration: number | null;
  word_count: number | null;
  wpm: number | null;
  filler_word_count: number | null;
  filler_ratio: number | null;
  long_pause_count: number | null;
  pronunciation_assessment: Record<string, unknown> | null;

  // 피드백
  layer1_result: Layer1Result | null;
  layer2_result: Layer2Result | null;
  result: AttemptResult;

  created_at: string;
}

// tutoring_retests
export interface TutoringRetest {
  id: string;
  focus_id: string;
  retest_mode: RetestMode;
  questions: RetestQuestion[];
  results: RetestQuestionResult[] | null;
  overall_result: RetestResult | null;
  created_at: string;
}

// ── Prompt C 출력 구조 ──

export interface FloorStatus {
  intermediate_floor_met: boolean;
  ih_floor_met: boolean;
  al_floor_met: boolean;
}

export interface TargetGapSummary {
  current_to_next: string;
  next_to_final: string;
}

export interface MasteryDetail {
  mastery: MasteryLevel;
  reason: string;       // 한국어, 1~2문장: 왜 이 상태인지
  evidence: string[];   // 한국어, 구체적 문항 근거 1~3개
}

export interface DiagnosisInternal {
  level_rationale: string[];
  type_mastery: Record<string, MasteryLevel>;
  topic_mastery: Record<string, MasteryLevel>;
  type_details?: Record<string, MasteryDetail>;   // 유형별 상세 근거
  topic_details?: Record<string, MasteryDetail>;   // 주제별 상세 근거
}

export interface Bottleneck {
  bottleneck_code: string;
  label: string;
  category: BottleneckCategory;
  severity: number;
  recurrence: number;
  source_types: string[];
  source_topics: string[];
  why_it_blocks_target: string;
}

export interface StudentFocus {
  focus_code: string;
  label: string;
  reason_summary: string;
  success_hint: string;
}

export interface StudentSummary {
  current_level_message: string;
  next_step_message: string;
  why_now_message: string;
}

// ── Prompt D 출력 구조 ──

export interface PrescriptionResult {
  coach_message: string;
  weekly_focuses: PrescriptionFocus[];
}

export interface PrescriptionFocus {
  priority_rank: number;
  focus_code: string;
  label: string;
  reason: string;
  why_now_for_target: string;
  recommended_drill_codes: string[];
  selection_policy: SelectionPolicy;
  success_criteria: string[];
  retest_criteria: {
    mode: RetestMode;
    item_count: number;
    must_pass_without_hint: boolean;
  };
}

// ── QSE 구조 ──

export interface SelectionPolicy {
  question_type: string;
  primary_topic: string;
  topic_mode: 'same_then_transfer' | 'transfer_only' | 'same_only';
  q1_rule: string;
  q2_rule: string;
  q3_rule: string;
  exclude_recent_question_ids: string[];
  candidate_limit: number;
}

export interface QuestionCandidate {
  question_id: string;
  question_type: string;
  topic: string;
  question_english: string;
}

export interface QuestionPool {
  q1_candidates: QuestionCandidate[];
  q2_candidates: QuestionCandidate[];
  q3_candidates: QuestionCandidate[];
}

// ── Prompt E 출력 구조 ──

export interface FrameSlot {
  slot: string;
  frame_en: string;
  label_ko: string;
}

export interface PassCriteria {
  required_flags: string[];
  min_word_count?: number;
  min_duration_sec?: number;
  max_long_pause_count?: number;
  max_filler_ratio?: number;
}

export interface DrillSessionPlan {
  drill_code: string;
  focus_code: string;
  session_goal: string;
  why_this_matters_for_target: string;
  q1: DrillQuestionPlan;
  q2: DrillQuestionPlan;
  q3: DrillQuestionPlan;
}

export interface DrillQuestionPlan {
  question_id: string;
  question_english: string;
  topic: string;
  goal: string;
  hint_level: HintLevel;
  frame_slots: FrameSlot[];
  sample_answer: string;
  pass_criteria: PassCriteria;
  rule_only_hint?: string; // Q3용
}

// ── Layer 1 규칙 엔진 출력 ──

export interface Layer1Result {
  layer: 'L1';
  result: 'pass' | 'retry' | 'escalate_l2';
  confidence: number;
  passed_flags: string[];
  failed_flags: string[];
  soft_warnings: string[];
  student_feedback: {
    status_label: string;
    checklist: ChecklistItem[];
    praise: string;
    retry_instruction: string;
  };
  internal_trace: {
    rule_hits: Record<string, string[]>;
    meta_checks: Record<string, boolean>;
  };
  next_action: 'pass_next_question' | 'retry_same_question' | 'escalate_to_layer2';
}

export interface ChecklistItem {
  label: string;
  status: 'pass' | 'fail';
}

// ── Prompt F (Layer 2) 출력 ──

export interface Layer2Result {
  praise_one: string;
  fix_one_or_two: string[];
  correction_examples: string[];
  retry_instruction: string;
  target_connection_hint: string;
  pass_or_retry: 'pass' | 'retry';
  confidence: number;
}

// ── 재평가 ──

export interface RetestQuestion {
  question_id: string;
  question_english: string;
  topic: string;
}

export interface RetestQuestionResult {
  question_id: string;
  transcript: string;
  audio_url: string | null;
  passed: boolean;
}

// ── 참조 테이블 ──

export interface TypeTemplate {
  type_code: string;
  type_label_ko: string;
  db_question_types: string[];
  purpose: string | null;
  core_skill_targets: string[] | null;
  default_slot_order: string[] | null;
  slot_definitions: Record<string, { label_ko: string; required: boolean }> | null;
  default_pass_criteria: string[] | null;
  default_retest_criteria: string[] | null;
  layer1_markers: Record<string, string[]> | null;
  graduation_relevance: string | null;
}

export interface LevelModifier {
  level_code: string;
  level_label: string;
  target_text_type: string | null;
  sentence_target: { min: number; recommended: number } | null;
  word_count_target: { min: number; recommended: number } | null;
  duration_target_sec: { min: number; recommended: number } | null;
  required_discourse_features: string[] | null;
  feedback_policy: {
    frame_strength: string;
    allow_slot_rescue_on_q1: boolean;
    allow_slot_rescue_on_q2: boolean;
    q3_hint_level: string;
  } | null;
  pass_adjustments: { strictness: string } | null;
}

// ── SA 응답 래퍼 ──

export interface TutoringEligibility {
  eligible: boolean;
  completed_count: number;      // 분석 가능한 세션 수
  required_count: number;       // 필요 최소 수 (3)
  remaining_count: number;      // 추가 필요 수
  last_tutoring_session_id: string | null; // 이전 튜터링 세션
}

export interface TutoringCredit {
  available: boolean;
  plan_credits: number;
  credits: number;
  balanceCents: number;
  estimatedCostCents: number;
}

// ── 이력 ──

export interface TutoringHistoryItem {
  session_id: string;
  current_stable_level: OpicLevel;
  next_step_level: OpicLevel;
  final_target_level: OpicLevel;
  status: TutoringStatus;
  focus_count: number;
  graduated_count: number;
  created_at: string;
  completed_at: string | null;
}
