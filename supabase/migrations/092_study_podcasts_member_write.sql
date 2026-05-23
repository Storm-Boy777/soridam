-- =============================================
-- 092: study_podcasts 패널 멤버 쓰기 허용
-- =============================================
-- 046은 INSERT/UPDATE/DELETE를 admin만 허용했음.
-- /talklish 멤버(study_panel_members 활성)가 직접 수업 자료를 만들 수 있도록
-- INSERT/UPDATE를 멤버에게도 개방한다. (관리자 결석 대비)
--   - DELETE는 admin만 유지 (멤버의 자료 삭제는 막음)
--   - admin 정책(046)은 그대로 — PostgreSQL은 복수 정책을 OR로 결합

DROP POLICY IF EXISTS "study_podcasts_member_insert" ON study_podcasts;
CREATE POLICY "study_podcasts_member_insert" ON study_podcasts FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_panel_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "study_podcasts_member_update" ON study_podcasts;
CREATE POLICY "study_podcasts_member_update" ON study_podcasts FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM study_panel_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_panel_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
