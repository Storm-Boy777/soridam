-- 064_panel_members_user_link.sql
-- 패널 멤버를 실제 소리담 사용자(profiles.id)와 연결.
-- - 한 사용자당 한 멤버만 가능 (UNIQUE)
-- - 사용자 삭제 시 멤버도 함께 삭제 (CASCADE)
-- - 사용자(panel member) 본인은 자기 멤버 정보 조회 가능 (네비 노출 판단용)

BEGIN;

ALTER TABLE public.study_panel_members
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_panel_members_user_id
  ON public.study_panel_members(user_id);

CREATE INDEX IF NOT EXISTS idx_panel_members_user_active
  ON public.study_panel_members(user_id, is_active);

-- 기존 SELECT 정책 갱신: 활성 멤버 + 본인이 멤버인 경우 → 본인 행 조회 허용 (네비 노출 판단)
DROP POLICY IF EXISTS "View active panel members" ON public.study_panel_members;
CREATE POLICY "View active panel members"
  ON public.study_panel_members FOR SELECT
  USING (
    is_active = true
    OR user_id = auth.uid()
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  );

COMMENT ON COLUMN public.study_panel_members.user_id IS
  '소리담 사용자(profiles.id) 연결. NULL이면 레거시(게스트) 멤버.';

COMMIT;
