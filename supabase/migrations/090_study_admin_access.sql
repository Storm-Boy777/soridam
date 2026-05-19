-- =============================================
-- 090: study_admin_access — 스터디 모임 관리자 권한
-- =============================================
-- /admin/study-group 페이지 + 사이드바 메뉴 접근 권한.
-- lecture_access 패턴(061)을 그대로 복제 — 관리자가 명시적으로 부여한 사용자에게만 노출.
--
-- 정책:
--   - 관리자(app_metadata.role='admin')는 RLS·헬퍼에서 자동 통과
--   - 추가로 study_admin_access에 등록된 사용자도 통과
--   - 일반 사용자는 사이드바 메뉴 미노출 + 페이지 진입 redirect

CREATE TABLE IF NOT EXISTS public.study_admin_access (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_study_admin_access_granted_at
  ON public.study_admin_access(granted_at DESC);

COMMENT ON TABLE public.study_admin_access IS
  '스터디 모임 관리자 접근 권한 (관리자가 부여). 관리자는 RLS에서 자동 통과.';

-- RLS — lecture_access와 동일 패턴
ALTER TABLE public.study_admin_access ENABLE ROW LEVEL SECURITY;

-- 관리자: 전체 CRUD (부여/회수/조회)
DROP POLICY IF EXISTS "Admins manage study admin access" ON public.study_admin_access;
CREATE POLICY "Admins manage study admin access"
  ON public.study_admin_access FOR ALL
  USING ((SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin');

-- 사용자: 본인 row만 조회 (네비 노출 판단용)
DROP POLICY IF EXISTS "Users see own study admin access" ON public.study_admin_access;
CREATE POLICY "Users see own study admin access"
  ON public.study_admin_access FOR SELECT
  USING (auth.uid() = user_id);
