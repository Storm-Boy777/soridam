-- 062_lectures_rls_jwt_fix.sql
-- 강의 시스템 RLS 정책의 admin 체크를 auth.users 조회 → JWT 클레임 직접 사용으로 변경
--
-- 배경: 기존 정책은 (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid())
--       방식인데 authenticated 롤이 auth.users에 SELECT 권한 없음
--       → admin이 lectures를 SELECT 시도 시 RLS 통과 못해 빈 결과 반환
--
-- 해결: auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
--       JWT에 이미 app_metadata가 포함되므로 추가 권한 불필요

BEGIN;

-- ========================================
-- lectures
-- ========================================
DROP POLICY IF EXISTS "View active lectures with access" ON public.lectures;
DROP POLICY IF EXISTS "Admins manage lectures" ON public.lectures;

CREATE POLICY "View active lectures with access"
  ON public.lectures FOR SELECT
  USING (
    is_active = true
    AND (
      COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
      OR EXISTS (SELECT 1 FROM public.lecture_access WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Admins manage lectures"
  ON public.lectures FOR ALL
  USING (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin')
  WITH CHECK (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin');

-- ========================================
-- lecture_materials
-- ========================================
DROP POLICY IF EXISTS "View materials with access" ON public.lecture_materials;
DROP POLICY IF EXISTS "Admins manage materials" ON public.lecture_materials;

CREATE POLICY "View materials with access"
  ON public.lecture_materials FOR SELECT
  USING (
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    OR EXISTS (SELECT 1 FROM public.lecture_access WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins manage materials"
  ON public.lecture_materials FOR ALL
  USING (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin')
  WITH CHECK (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin');

-- ========================================
-- lecture_progress
-- ========================================
DROP POLICY IF EXISTS "Admins view all progress" ON public.lecture_progress;

CREATE POLICY "Admins view all progress"
  ON public.lecture_progress FOR SELECT
  USING (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin');

-- ========================================
-- lecture_access
-- ========================================
DROP POLICY IF EXISTS "Admins manage access" ON public.lecture_access;

CREATE POLICY "Admins manage access"
  ON public.lecture_access FOR ALL
  USING (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin')
  WITH CHECK (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin');

COMMIT;
