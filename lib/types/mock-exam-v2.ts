// 모의고사 v2 평가 결과 타입 정의

// ── v2 문항별 평가 (mock_test_evaluations 테이블) ──

export interface WeakPointV2 {
  code: string;
  severity: "severe" | "moderate" | "mild";
  reason: string;
  evidence: string;
}

export interface TaskChecklistItemV2 {
  item: string;
  pass: boolean;
  evidence: string;
}

export type FulfillmentStatusV2 = "fulfilled" | "partial" | "unfulfilled" | "skipped";

export interface MockTestEvaluationV2 {
  id: string;
  session_id: string;
  user_id: string;
  question_number: number;
  question_id: string;
  question_type: string;
  target_grade: string;
  fulfillment: FulfillmentStatusV2;
  task_checklist: TaskChecklistItemV2[];
  observation: string;
  directions: string[];
  weak_points: WeakPointV2[];
  model: string;
  tokens_used: number;
  processing_time_ms: number;
  skipped_by_preprocess: boolean;
  evaluated_at: string;
}

// ── v2 종합 진단 (overview_v2 JSONB) ──

export interface OverviewV2 {
  overall_comments: string;
  performance_summary: string[];
}

// ── v2 성장리포트 (growth_v2 JSONB) ──

export interface GrowthImprovementV2 {
  area: string;
  detail: string;
  evidence_questions: number[];
}

export interface GrowthWeaknessV2 {
  area: string;
  detail: string;
  severity: "critical" | "moderate" | "mild";
  wp_codes: string[];
}

export interface TypeComparisonV2 {
  type: string;
  type_ko: string;
  status: "strong" | "stable" | "weak" | "critical";
  comment: string;
  fulfillment_rate: number;
}

export interface GrowthV2 {
  improvements: GrowthImprovementV2[];
  weaknesses: GrowthWeaknessV2[];
  type_comparison: TypeComparisonV2[];
  bottleneck_summary: string;
}

// ── v2 전체 결과 조합 (SA 반환용) ──

export interface MockExamResultV2 {
  session_id: string;
  // 세션 기본 정보
  session: {
    mode: "test" | "training";
    started_at: string;
    completed_at: string | null;
  };
  // v1 리포트 (등급, FACT, 체크박스)
  report: {
    final_level: string | null;
    total_score: number | null;
    score_f: number | null;
    score_a: number | null;
    score_c: number | null;
    score_t: number | null;
    int_pass_rate: number | null;
    adv_pass_rate: number | null;
    al_pass_rate: number | null;
    target_level: string | null;
    valid_question_count: number | null;
    avg_accuracy_score: number | null;
    avg_prosody_score: number | null;
    avg_fluency_score: number | null;
    // v1 체크박스 (세부진단표용)
    aggregated_int_checkboxes: Record<string, { pass: boolean; evidence: string }> | null;
    aggregated_adv_checkboxes: Record<string, { pass: boolean; evidence: string }> | null;
    aggregated_al_checkboxes: Record<string, { pass: boolean; evidence: string }> | null;
    // v2 GPT 생성
    overview_v2: OverviewV2 | null;
    growth_v2: GrowthV2 | null;
    report_v2_status: string;
  };
  // v2 문항별 평가
  evaluations: MockTestEvaluationV2[];
}
