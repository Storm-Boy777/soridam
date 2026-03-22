// ============================================================
// 튜터링 v3 타입 정의
// ============================================================

// ── 등급별 파라미터 ──

export type TutoringLevelRange = "IL_IM" | "IM_IH" | "IH_AL";

export interface LevelParams {
  text_policy: "full" | "keywords" | "off";
  timer: { prep: number; main: number; wrap: number }; // 초 단위
  epp_count: number;
  variation_changes: number; // 변경 요소 수
  self_repair_min: number; // 최소 수행 횟수
  target_duration: { min: number; max: number }; // 목표 답변 길이 (초)
  required_blocks: number; // 필수 블록 수
  gpt_feedback_depth: "light" | "standard" | "deep";
}

// ── 등급별 파라미터 상수 ──

export const LEVEL_PARAMS: Record<TutoringLevelRange, LevelParams> = {
  IL_IM: {
    text_policy: "full",
    timer: { prep: 15, main: 30, wrap: 15 },
    epp_count: 3,
    variation_changes: 1,
    self_repair_min: 0,
    target_duration: { min: 30, max: 45 },
    required_blocks: 3,
    gpt_feedback_depth: "light",
  },
  IM_IH: {
    text_policy: "keywords",
    timer: { prep: 15, main: 60, wrap: 15 },
    epp_count: 3,
    variation_changes: 2,
    self_repair_min: 1,
    target_duration: { min: 60, max: 75 },
    required_blocks: 5,
    gpt_feedback_depth: "standard",
  },
  IH_AL: {
    text_policy: "off",
    timer: { prep: 15, main: 75, wrap: 15 },
    epp_count: 2,
    variation_changes: 3,
    self_repair_min: 2,
    target_duration: { min: 75, max: 90 },
    required_blocks: 6,
    gpt_feedback_depth: "deep",
  },
};

// ── 등급 → 파라미터 매핑 ──

export function getLevelRange(currentLevel: string, targetLevel: string): TutoringLevelRange {
  const order = ["NL", "NM", "NH", "IL", "IM1", "IM2", "IM3", "IH", "AL"];
  const ci = order.indexOf(currentLevel);
  // IH 이상이면 IH_AL
  if (ci >= order.indexOf("IH")) return "IH_AL";
  // IM 이상이면 IM_IH
  if (ci >= order.indexOf("IM1")) return "IM_IH";
  // 나머지 IL_IM
  return "IL_IM";
}

// ── DB 테이블 타입 ──

export interface TutoringSession {
  id: string;
  user_id: string;
  mock_test_session_id: string;
  target_grade: string | null;
  current_level: string | null;
  status: "active" | "paused" | "completed";
  total_prescriptions: number | null;
  completed_prescriptions: number;
  started_at: string;
  last_activity_at: string | null;
  created_at: string;
}

export type PrescriptionSource =
  | "top3_priorities"
  | "recurring_patterns"
  | "question_type_map"
  | "individual_eval";

export type PrescriptionStatus = "pending" | "in_progress" | "completed";

export interface TutoringPrescriptionRow {
  id: string;
  session_id: string;
  user_id: string;
  priority: number;
  question_type: string;
  topic_id: string | null;
  weakness_tags: string[] | null;
  source: PrescriptionSource;
  source_data: Record<string, unknown> | null;
  level_params: LevelParams | null;
  status: PrescriptionStatus;
  training_count: number;
  best_score: Record<string, unknown> | null;
  created_at: string;
}

export type TrainingSessionType = "guided" | "free" | "simulation";

export interface TutoringTrainingSession {
  id: string;
  user_id: string;
  prescription_id: string | null;
  session_type: TrainingSessionType;
  question_type: string;
  topic_id: string | null;
  target_grade: string | null;
  level_params: LevelParams | null;
  session_goal: string | null;
  success_criteria: SuccessCriterion[] | null;
  duration_seconds: number | null;
  screens_completed: number;
  overall_score: OverallScore | null;
  kpi_results: Record<string, unknown> | null;
  next_recommendation: Record<string, unknown> | null;
  started_at: string;
  completed_at: string | null;
}

export interface SuccessCriterion {
  criteria: string;
  met: boolean;
}

export interface OverallScore {
  fluency: number | null;
  structure: number | null;
  detail: number | null;
  variation: number | null;
  repair: number | null;
}

export type AttemptProtocol =
  | "epp"
  | "variation"
  | "transformation"
  | "timed"
  | "self_repair"
  | "warmup"
  | "simulation";

export interface TutoringAttempt {
  id: string;
  user_id: string;
  training_session_id: string;
  screen_number: number;
  protocol: AttemptProtocol | null;
  question_id: string | null;
  attempt_number: number | null;
  user_answer: string | null;
  user_audio_url: string | null;
  audio_duration_seconds: number | null;
  metrics: AttemptMetrics | null;
  pronunciation: AttemptPronunciation | null;
  evaluation: Record<string, unknown> | null;
  passed: boolean | null;
  repair_before: string | null;
  repair_after: string | null;
  repair_type: "grammar" | "l1_interference" | "upgrade" | null;
  created_at: string;
}

export interface AttemptMetrics {
  wpm?: number;
  filler_ratio?: number;
  filler_count?: number;
  connector_count?: number;
  silence_seconds?: number;
  block_checklist?: Record<string, boolean>;
}

export interface AttemptPronunciation {
  accuracy?: number;
  fluency?: number;
  prosody?: number;
  problem_words?: string[];
}

export interface TutoringReviewSchedule {
  id: string;
  user_id: string;
  prescription_id: string;
  question_type: string;
  next_review_at: string;
  review_count: number;
  interval_days: number;
  status: "scheduled" | "completed" | "skipped";
  created_at: string;
}

export interface TutoringSkillHistory {
  id: string;
  user_id: string;
  source: "mock_test" | "training" | "simulation";
  source_id: string | null;
  question_type: string | null;
  avg_structure_score: number | null;
  avg_wpm: number | null;
  avg_filler_pct: number | null;
  avg_connector_count: number | null;
  avg_silence_seconds: number | null;
  self_repair_count: number | null;
  variation_success_rate: number | null;
  block_completion_rate: number | null;
  recorded_at: string;
}

// ── 진단 뷰 타입 (프론트엔드용) ──

export interface DiagnosisData {
  session: TutoringSession;
  mockReport: {
    session_id: string;
    final_level: string;
    target_grade: string;
    score_f: number;
    score_a: number;
    score_c: number;
    score_t: number;
    total_score: number;
    coaching_report: Record<string, unknown> | null;
    tutoring_prescription: Record<string, unknown> | null;
    avg_completion_rate: number | null;
    created_at: string;
  };
  prescriptions: TutoringPrescriptionRow[];
  skillHistory: TutoringSkillHistory[];
}

// ── 처방 엔진 입력 타입 ──

export interface PrescriptionEngineInput {
  tutoring_prescription: {
    priority_weaknesses: Array<{
      rank: number;
      area: string;
      drill_tag: string;
    }>;
    error_drill_tags: string[];
    weak_types: string[];
    training_order: string[];
    must_fix_for_next_grade: string[];
  };
  current_level: string;
  target_grade: string;
}

// ── drill_tag → question_type 매핑 ──

export const DRILL_TAG_TO_QUESTION_TYPE: Record<string, string> = {
  description_detail: "description",
  routine_sequence: "routine",
  comparison_frame: "comparison",
  past_narrative: "past_special",
  tense_consistency: "past_special",
  roleplay_questions: "rp_12",
  roleplay_recovery: "rp_12",
  opinion_support: "adv_15",
  social_perspective: "adv_15",
  detail_expansion: "description",
  example_insertion: "description",
  transition_words: "routine",
  vocabulary_variety: "description",
  polite_expression: "rp_12",
  opening_entry: "description",
  closing_wrap: "description",
  pause_control: "past_special",
  filler_reduction: "routine",
  sentence_completion: "routine",
};
