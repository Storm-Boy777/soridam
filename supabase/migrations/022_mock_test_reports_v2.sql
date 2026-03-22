-- ============================================================
-- 022: mock_test_reports_v2 테이블 (v1과 완전 분리)
-- ============================================================

-- v2 종합 리포트 테이블
CREATE TABLE IF NOT EXISTS public.mock_test_reports_v2 (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  user_id uuid NOT NULL,
  -- 종합 소견
  overview jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- 성장 분석
  growth jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- 메타
  model text NOT NULL DEFAULT 'gpt-4.1'::text,
  tokens_used integer NOT NULL DEFAULT 0,
  processing_time_ms integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,

  CONSTRAINT mock_test_reports_v2_pkey PRIMARY KEY (id),
  CONSTRAINT mock_test_reports_v2_session_id_key UNIQUE (session_id),
  CONSTRAINT mock_test_reports_v2_session_id_fkey FOREIGN KEY (session_id)
    REFERENCES mock_test_sessions (session_id) ON DELETE CASCADE,
  CONSTRAINT mock_test_reports_v2_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT mock_test_reports_v2_status_check CHECK (
    status = ANY (ARRAY['pending', 'processing', 'completed', 'failed'])
  )
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_reports_v2_session ON public.mock_test_reports_v2 USING btree (session_id);
CREATE INDEX IF NOT EXISTS idx_reports_v2_user ON public.mock_test_reports_v2 USING btree (user_id);

-- RLS
ALTER TABLE public.mock_test_reports_v2 ENABLE ROW LEVEL SECURITY;

-- 사용자: 본인 조회
CREATE POLICY "reports_v2_select_own" ON public.mock_test_reports_v2
  FOR SELECT USING (auth.uid() = user_id);

-- service_role: INSERT/UPDATE/DELETE
CREATE POLICY "reports_v2_service_insert" ON public.mock_test_reports_v2
  FOR INSERT WITH CHECK (true);
CREATE POLICY "reports_v2_service_update" ON public.mock_test_reports_v2
  FOR UPDATE USING (true);
CREATE POLICY "reports_v2_service_delete" ON public.mock_test_reports_v2
  FOR DELETE USING (true);

-- admin: 조회
CREATE POLICY "reports_v2_admin_select" ON public.mock_test_reports_v2
  FOR SELECT USING (
    (SELECT (auth.jwt()->'app_metadata'->>'role')::text) = 'admin'
  );

-- mock_test_reports에서 v2 컬럼 제거
ALTER TABLE public.mock_test_reports
  DROP COLUMN IF EXISTS overview_v2,
  DROP COLUMN IF EXISTS growth_v2,
  DROP COLUMN IF EXISTS report_v2_status;
