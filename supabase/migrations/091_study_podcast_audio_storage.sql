-- =============================================
-- 091: study-podcast-audio Storage 버킷 + study_podcasts.audio_url
-- =============================================
-- 월요일 스터디(Podcast Stage) — YouTube에서 추출한 "대화 구간 오디오"(가라오케 소스) 저장.
-- talklish-recordings(사용자 답변 녹음, 임시)와 용도가 다름:
--   - 관리자가 자료 생성 시 1회 추출 → 영구 보존 → 모든 멤버가 재생
--   - 공개 YouTube 영상의 짧은 구간(교육용) → public 버킷(재생 URL 직접 사용)
--
-- 정책:
--   - 읽기: public (월요일 화면에서 <audio src> 직접 재생)
--   - 쓰기(INSERT/UPDATE/DELETE): 관리자만. EF는 service role로 업로드(RLS 우회).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'study-podcast-audio',
  'study-podcast-audio',
  true,
  52428800,  -- 50MB (긴 대화 구간 WAV 여유)
  ARRAY['audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/ogg']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 관리자만 쓰기 (읽기는 public 버킷이라 자동 공개 서빙)
DROP POLICY IF EXISTS "study_podcast_audio_admin_write" ON storage.objects;
CREATE POLICY "study_podcast_audio_admin_write"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'study-podcast-audio'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    bucket_id = 'study-podcast-audio'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- study_podcasts: 추출 오디오 URL 컬럼
ALTER TABLE study_podcasts ADD COLUMN IF NOT EXISTS audio_url text;

COMMENT ON COLUMN study_podcasts.audio_url IS
  '월요일 스터디 — yt-dlp로 추출한 대화 구간 오디오 (study-podcast-audio 버킷, 가라오케 재생 소스)';
