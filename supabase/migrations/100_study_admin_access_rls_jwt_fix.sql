-- =============================================
-- 100: study_admin_access admin RLS — auth.users 접근 제거 (JWT fix)
-- =============================================
-- 090의 "Admins manage" 정책이
--   (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
-- 으로 role을 확인했는데, authenticated 역할은 auth.users SELECT 권한이 없다.
-- → 비관리자가 본인 권한 행을 SELECT할 때 이 정책(FOR ALL)도 함께 평가되며
--   "permission denied for table users" 에러 발생 → 쿼리 전체 실패
--   → hasStudyAdminAccess()가 false 반환
--   → 상단 '스터디' 메뉴 미노출 + /talklish 진입 시 / 로 redirect.
-- → JWT claim(auth.jwt())으로 변경. DB 접근 없이 role 확인.
--   (062 lectures_rls_jwt_fix / 093 study_podcasts_admin_rls_jwt_fix와 동일 fix)

BEGIN;

DROP POLICY IF EXISTS "Admins manage study admin access" ON public.study_admin_access;
CREATE POLICY "Admins manage study admin access"
  ON public.study_admin_access FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

COMMIT;
