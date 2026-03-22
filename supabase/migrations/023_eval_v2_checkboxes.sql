-- ============================================================
-- 023: mock_test_evaluations_v2에 체크박스 컬럼 추가
-- + mock_test_reports_v2에 등급 판정 컬럼 추가
-- ============================================================

-- ── evaluations_v2: 체크박스 관련 컬럼 ──
ALTER TABLE mock_test_evaluations_v2
  ADD COLUMN IF NOT EXISTS checkboxes     jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS checkbox_type  text NOT NULL DEFAULT 'INT',
  ADD COLUMN IF NOT EXISTS pass_count     int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fail_count     int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pass_rate      numeric(5,4) NOT NULL DEFAULT 0;

COMMENT ON COLUMN mock_test_evaluations_v2.checkboxes IS '체크박스 pass/fail 결과 — { "INT-1-1": { pass: true, evidence: "..." }, ... }';
COMMENT ON COLUMN mock_test_evaluations_v2.checkbox_type IS '체크박스 세트 타입 — INT / ADV / AL';
COMMENT ON COLUMN mock_test_evaluations_v2.pass_count IS '통과 체크박스 수';
COMMENT ON COLUMN mock_test_evaluations_v2.fail_count IS '미통과 체크박스 수';
COMMENT ON COLUMN mock_test_evaluations_v2.pass_rate IS '통과율 (0.0000 ~ 1.0000)';

-- ── reports_v2: 등급 판정 관련 컬럼 ──
ALTER TABLE mock_test_reports_v2
  ADD COLUMN IF NOT EXISTS final_level      text,
  ADD COLUMN IF NOT EXISTS target_level     text,
  ADD COLUMN IF NOT EXISTS rule_engine_result jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS aggregated_checkboxes jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN mock_test_reports_v2.final_level IS 'rule-engine 최종 판정 등급 (NH~AL)';
COMMENT ON COLUMN mock_test_reports_v2.target_level IS '목표 등급';
COMMENT ON COLUMN mock_test_reports_v2.rule_engine_result IS 'rule-engine 7-Step 전체 결과 JSON';
COMMENT ON COLUMN mock_test_reports_v2.aggregated_checkboxes IS '전체 문항 체크박스 집계 결과';
