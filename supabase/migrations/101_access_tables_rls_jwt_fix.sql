-- =============================================
-- 101: coaching_access / exam_archive_access admin RLS — auth.users 접근 제거 (JWT fix)
-- =============================================
-- 100(study_admin_access)과 동일한 버그.
-- "Admins manage" 정책(FOR ALL)이
--   (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
-- 으로 role을 확인 → authenticated는 auth.users SELECT 권한이 없어
-- 비관리자가 본인 권한 행을 SELECT할 때 "permission denied for table users" 발생
--   → hasCoachingAccess()/hasExamArchiveAccess()가 false 반환
--   → 비관리자 권한 보유자에게 스피킹 코치/기출 보관함 메뉴·페이지가 노출되지 않음.
-- → JWT claim(auth.jwt()) 기반으로 교체 (lecture_access / study_admin_access와 동일 패턴).

BEGIN;

-- coaching_access
DROP POLICY IF EXISTS "Admins manage coaching access" ON public.coaching_access;
CREATE POLICY "Admins manage coaching access"
  ON public.coaching_access FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- exam_archive_access
DROP POLICY IF EXISTS "Admins manage exam archive access" ON public.exam_archive_access;
CREATE POLICY "Admins manage exam archive access"
  ON public.exam_archive_access FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

COMMIT;
