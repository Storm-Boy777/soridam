-- =============================================
-- 093: study_podcasts admin RLS — auth.users 접근 제거
-- =============================================
-- 046 admin 정책은 (SELECT raw_app_meta_data FROM auth.users WHERE id = auth.uid())로
-- role을 확인했는데, authenticated 역할은 auth.users SELECT 권한이 없다.
-- → 멤버 INSERT(092) 시 admin 정책도 함께 평가되며 "permission denied for table users" 발생.
-- → JWT claim(auth.jwt())으로 변경. DB 접근 없이 role 확인 (063/090과 동일 패턴).

DROP POLICY IF EXISTS "study_podcasts_admin_insert" ON study_podcasts;
CREATE POLICY "study_podcasts_admin_insert" ON study_podcasts FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "study_podcasts_admin_update" ON study_podcasts;
CREATE POLICY "study_podcasts_admin_update" ON study_podcasts FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "study_podcasts_admin_delete" ON study_podcasts;
CREATE POLICY "study_podcasts_admin_delete" ON study_podcasts FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
