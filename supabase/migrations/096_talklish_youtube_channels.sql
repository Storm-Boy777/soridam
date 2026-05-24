-- =============================================
-- 096: talklish_youtube_channels — 월요일 자료 준비용 유튜버 채널 바로가기
-- =============================================
-- /talklish/manage 월요일 자료 생성 시, 자주 쓰는 유튜버 채널을 칩으로 띄워
-- 새 창으로 바로 이동(영상 찾기 편의). 관리자 페이지(study-group "월요일 설정")에서 관리.
-- 조회는 로그인 사용자 누구나, 쓰기는 관리자(JWT app_metadata.role)만 — 093 패턴.

CREATE TABLE IF NOT EXISTS talklish_youtube_channels (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  channel_url  text NOT NULL,
  sort_order   int NOT NULL DEFAULT 0,
  is_active    boolean NOT NULL DEFAULT true,
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tyc_sort ON talklish_youtube_channels (sort_order);

COMMENT ON TABLE talklish_youtube_channels IS
  'Talklish 월요일 자료 준비 — 자주 쓰는 유튜버 채널 바로가기 (manage 페이지에서 새 창 연결)';

ALTER TABLE talklish_youtube_channels ENABLE ROW LEVEL SECURITY;

-- 조회: 로그인 사용자 누구나 (manage 진입 게이트가 이미 한 번 걸림)
DROP POLICY IF EXISTS tyc_authed_select ON talklish_youtube_channels;
CREATE POLICY tyc_authed_select ON talklish_youtube_channels
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

-- 쓰기: 관리자만 (JWT app_metadata.role — 093과 동일 패턴, auth.users 접근 없음)
DROP POLICY IF EXISTS tyc_admin_insert ON talklish_youtube_channels;
CREATE POLICY tyc_admin_insert ON talklish_youtube_channels
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS tyc_admin_update ON talklish_youtube_channels;
CREATE POLICY tyc_admin_update ON talklish_youtube_channels
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS tyc_admin_delete ON talklish_youtube_channels;
CREATE POLICY tyc_admin_delete ON talklish_youtube_channels
  FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
