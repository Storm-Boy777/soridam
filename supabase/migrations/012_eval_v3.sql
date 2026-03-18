-- ============================================================
-- 012_eval_v3.sql — 개별평가 마이그레이션
-- 4-Stage EF: process → eval-judge → eval-coach → report
-- ============================================================

-- 1. mock_test_answers: 파생 지표 컬럼 추가
ALTER TABLE mock_test_answers ADD COLUMN IF NOT EXISTS wpm numeric(6,2);
ALTER TABLE mock_test_answers ADD COLUMN IF NOT EXISTS meta_only boolean DEFAULT false;
ALTER TABLE mock_test_answers ADD COLUMN IF NOT EXISTS unfinished_end boolean DEFAULT false;
ALTER TABLE mock_test_answers ADD COLUMN IF NOT EXISTS filler_ratio numeric(5,4);

-- 2. mock_test_answers: eval_status CHECK 확장 (judge_completed 추가)
ALTER TABLE mock_test_answers DROP CONSTRAINT IF EXISTS mock_test_answers_eval_status_check;
ALTER TABLE mock_test_answers ADD CONSTRAINT mock_test_answers_eval_status_check
  CHECK (eval_status = ANY (ARRAY[
    'pending'::text, 'processing'::text, 'stt_completed'::text,
    'evaluating'::text, 'judge_completed'::text,
    'completed'::text, 'failed'::text, 'skipped'::text
  ]));

-- 3. mock_test_evaluations: 평가 필드 추가
ALTER TABLE mock_test_evaluations ADD COLUMN IF NOT EXISTS task_fulfillment jsonb;
ALTER TABLE mock_test_evaluations ADD COLUMN IF NOT EXISTS feedback_branch text;
ALTER TABLE mock_test_evaluations ADD COLUMN IF NOT EXISTS priority_prescription jsonb;
ALTER TABLE mock_test_evaluations ADD COLUMN IF NOT EXISTS judge_model text;
ALTER TABLE mock_test_evaluations ADD COLUMN IF NOT EXISTS judge_tokens_used integer;

-- feedback_branch CHECK 제약
DO $$ BEGIN
  ALTER TABLE mock_test_evaluations ADD CONSTRAINT mock_test_evaluations_feedback_branch_check
    CHECK (feedback_branch IS NULL OR feedback_branch = ANY (ARRAY['fulfilled'::text, 'partial'::text, 'failed'::text]));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. mock_test_reports: 종합평가 컬럼 추가
ALTER TABLE mock_test_reports ADD COLUMN IF NOT EXISTS tutoring_prescription jsonb;
ALTER TABLE mock_test_reports ADD COLUMN IF NOT EXISTS avg_completion_rate integer DEFAULT 0;
