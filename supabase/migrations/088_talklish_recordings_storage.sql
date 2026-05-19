-- =============================================
-- 088: talklish-recordings Storage 버킷 + RLS
-- =============================================
-- Talklish 수요일 OPIc 콤보 시뮬레이션에서 멤버 답변 음성 임시 저장.
-- 짧은 수명(코칭 생성 후 보존 가치 낮음) — 정책상 자동 삭제는 별도 cron이 처리.
--
-- 정책:
--   - 인증된 사용자가 자기 path에 업로드 가능 (path 패턴: {user_id}/{timestamp}.webm)
--   - 관리자(app_metadata.role='admin')는 전체 SELECT/DELETE
--   - Service role은 EF에서 download 시 모두 접근
--   - 비공개 버킷 (signed URL or service role 다운로드)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'talklish-recordings',
  'talklish-recordings',
  false,
  10 * 1024 * 1024,  -- 10MB (4분 webm 충분)
  ARRAY['audio/webm', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg']
)
ON CONFLICT (id) DO UPDATE
  SET file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 사용자: 자기 path({user_id}/...)에 INSERT/UPDATE/DELETE 가능
DROP POLICY IF EXISTS "talklish_recordings_user_insert" ON storage.objects;
CREATE POLICY "talklish_recordings_user_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'talklish-recordings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "talklish_recordings_user_select_own" ON storage.objects;
CREATE POLICY "talklish_recordings_user_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'talklish-recordings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "talklish_recordings_user_delete_own" ON storage.objects;
CREATE POLICY "talklish_recordings_user_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'talklish-recordings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 관리자: 전체 SELECT/DELETE
DROP POLICY IF EXISTS "talklish_recordings_admin_all" ON storage.objects;
CREATE POLICY "talklish_recordings_admin_all"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'talklish-recordings'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    bucket_id = 'talklish-recordings'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

COMMENT ON POLICY "talklish_recordings_user_insert" ON storage.objects IS
  'Talklish 답변 음성 업로드 — 자기 user_id 폴더에만';
