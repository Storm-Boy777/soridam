-- ============================================================
-- 021_mock_test_report_v2.sql
-- mock_test_reports에 v2 종합 진단 + 성장리포트 컬럼 추가
-- v1 기존 컬럼 수정 없음, v2 전용 JSONB 컬럼 추가
-- ============================================================

-- v2 종합 진단 (overview 탭) — GPT 생성
ALTER TABLE mock_test_reports
  ADD COLUMN IF NOT EXISTS overview_v2 jsonb DEFAULT NULL;
-- 구조: { overall_comments: string, performance_summary: string[] }

-- v2 성장리포트 (growth 탭) — GPT 생성
ALTER TABLE mock_test_reports
  ADD COLUMN IF NOT EXISTS growth_v2 jsonb DEFAULT NULL;
-- 구조: { improvements: [...], weaknesses: [...], type_comparison: [...], bottleneck_summary: string }

-- v2 리포트 생성 상태 추적
ALTER TABLE mock_test_reports
  ADD COLUMN IF NOT EXISTS report_v2_status text NOT NULL DEFAULT 'pending'
    CHECK (report_v2_status IN ('pending', 'processing', 'completed', 'failed'));

COMMENT ON COLUMN mock_test_reports.overview_v2 IS 'v2 종합 진단 — GPT 생성 (overall_comments + performance_summary)';
COMMENT ON COLUMN mock_test_reports.growth_v2 IS 'v2 성장리포트 — GPT 생성 (improvements, weaknesses, type_comparison, bottleneck)';
COMMENT ON COLUMN mock_test_reports.report_v2_status IS 'v2 리포트 생성 상태 (pending/processing/completed/failed)';
