-- =============================================
-- 051: 오픽 스터디 RLS 재귀 정책 수정
--
-- 문제:
--   기존 study_group_members SELECT 정책이 자기 테이블을 EXISTS로 참조
--   → PostgreSQL이 정책 평가 시 무한 재귀 감지 → false 반환
--   → 사용자가 본인 멤버십도 못 보고 → /opic-study에서 그룹 0개
--
-- 해결:
--   SECURITY DEFINER 함수로 RLS 우회 멤버십 체크.
--   study_groups, opic_study_sessions, opic_study_answers 정책도 동일 함수로 단순화.
-- =============================================

-- ─────────────────────────────────────────────
-- 1. SECURITY DEFINER 헬퍼 함수
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_study_group_member(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM study_group_members
    WHERE group_id = p_group_id AND user_id = p_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION is_study_group_member(uuid, uuid) TO authenticated;

-- ─────────────────────────────────────────────
-- 2. study_groups SELECT (재귀 제거)
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS sg_select ON study_groups;
CREATE POLICY sg_select ON study_groups
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR is_study_group_member(study_groups.id, auth.uid())
  );

-- ─────────────────────────────────────────────
-- 3. study_group_members SELECT (재귀 제거)
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS sgm_select ON study_group_members;
CREATE POLICY sgm_select ON study_group_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR is_study_group_member(group_id, auth.uid())
  );

-- ─────────────────────────────────────────────
-- 4. opic_study_sessions (SELECT/INSERT/UPDATE)
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS oss_select ON opic_study_sessions;
CREATE POLICY oss_select ON opic_study_sessions
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR is_study_group_member(opic_study_sessions.group_id, auth.uid())
  );

DROP POLICY IF EXISTS oss_insert ON opic_study_sessions;
CREATE POLICY oss_insert ON opic_study_sessions
  FOR INSERT TO authenticated
  WITH CHECK (is_study_group_member(opic_study_sessions.group_id, auth.uid()));

DROP POLICY IF EXISTS oss_update ON opic_study_sessions;
CREATE POLICY oss_update ON opic_study_sessions
  FOR UPDATE TO authenticated
  USING (is_study_group_member(opic_study_sessions.group_id, auth.uid()))
  WITH CHECK (is_study_group_member(opic_study_sessions.group_id, auth.uid()));

-- ─────────────────────────────────────────────
-- 5. opic_study_answers (SELECT/INSERT)
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS osa_select ON opic_study_answers;
CREATE POLICY osa_select ON opic_study_answers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM opic_study_sessions s
      WHERE s.id = opic_study_answers.session_id
        AND is_study_group_member(s.group_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS osa_insert_own ON opic_study_answers;
CREATE POLICY osa_insert_own ON opic_study_answers
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM opic_study_sessions s
      WHERE s.id = opic_study_answers.session_id
        AND is_study_group_member(s.group_id, auth.uid())
    )
  );

-- ─────────────────────────────────────────────
-- 6. Storage 버킷 RLS도 같은 함수로 단순화
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "opic_study_recordings_insert_own" ON storage.objects;
CREATE POLICY "opic_study_recordings_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'opic-study-recordings'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM opic_study_sessions s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND is_study_group_member(s.group_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "opic_study_recordings_select_member" ON storage.objects;
CREATE POLICY "opic_study_recordings_select_member"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'opic-study-recordings'
    AND EXISTS (
      SELECT 1 FROM opic_study_sessions s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND is_study_group_member(s.group_id, auth.uid())
    )
  );
