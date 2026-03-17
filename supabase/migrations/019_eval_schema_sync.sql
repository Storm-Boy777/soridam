-- ============================================================
-- 019_eval_schema_sync.sql
-- 모의고사 평가 엔진 런타임 스키마 정합성 보정
-- ============================================================

ALTER TABLE mock_test_evaluations
  ADD COLUMN IF NOT EXISTS coaching_feedback jsonb;
