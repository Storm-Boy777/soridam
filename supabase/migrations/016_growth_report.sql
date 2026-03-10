-- 016_growth_report.sql
-- 성장 리포트: mock_test_reports에 성장 분석 컬럼 추가

-- ① 한 줄 요약 (GPT 생성)
ALTER TABLE mock_test_reports
  ADD COLUMN IF NOT EXISTS growth_summary TEXT;

-- ② 이전 대비 변화 데이터 (규칙 기반 계산)
ALTER TABLE mock_test_reports
  ADD COLUMN IF NOT EXISTS growth_comparison JSONB;

-- ③④⑥⑦ GPT 생성 분석 (원인/FACT해석/병목/추천행동)
ALTER TABLE mock_test_reports
  ADD COLUMN IF NOT EXISTS growth_analysis JSONB;
