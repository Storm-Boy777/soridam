-- =============================================
-- 050: 오픽 스터디 — Storage 버킷 + RLS
--
-- 폴더 구조: {sessionId}/{userId}/{questionIdx}.webm
-- =============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('opic-study-recordings', 'opic-study-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────
-- RLS: 본인이 그룹 멤버인 세션의 자기 폴더만 INSERT
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "opic_study_recordings_insert_own" ON storage.objects;
CREATE POLICY "opic_study_recordings_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'opic-study-recordings'
    AND (storage.foldername(name))[2] = auth.uid()::text  -- 폴더[1]=sessionId, [2]=userId
    AND EXISTS (
      SELECT 1
      FROM opic_study_sessions s
      JOIN study_group_members sgm ON sgm.group_id = s.group_id
      WHERE s.id::text = (storage.foldername(name))[1]
        AND sgm.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- RLS: 같은 세션 멤버는 SELECT (서로 답변 듣기)
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "opic_study_recordings_select_member" ON storage.objects;
CREATE POLICY "opic_study_recordings_select_member"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'opic-study-recordings'
    AND EXISTS (
      SELECT 1
      FROM opic_study_sessions s
      JOIN study_group_members sgm ON sgm.group_id = s.group_id
      WHERE s.id::text = (storage.foldername(name))[1]
        AND sgm.user_id = auth.uid()
    )
  );
