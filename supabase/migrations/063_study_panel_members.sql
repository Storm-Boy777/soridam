-- 063_study_panel_members.sql
-- 오프라인 영어 스터디(Talklish) 패널 멤버 — 큰 모니터/TV 화면에 표시되는 6명 패널
-- 관리자가 등록/수정. 사용자 계정과 무관 (단순 표시용 명단).

BEGIN;

CREATE TABLE IF NOT EXISTS public.study_panel_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,                      -- 예: "지수", "민호"
  emoji TEXT NOT NULL DEFAULT '🦊',         -- 아바타 이모지
  color TEXT NOT NULL DEFAULT '#C9522D',   -- HEX 컬러
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_panel_members_active_order
  ON public.study_panel_members(is_active, sort_order);

ALTER TABLE public.study_panel_members ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자는 활성 멤버 조회 가능 (스터디 화면용)
CREATE POLICY "View active panel members"
  ON public.study_panel_members FOR SELECT
  USING (
    is_active = true
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  );

-- 관리자만 CRUD
CREATE POLICY "Admins manage panel members"
  ON public.study_panel_members FOR ALL
  USING (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin')
  WITH CHECK (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin');

COMMENT ON TABLE public.study_panel_members IS
  'Talklish/소리담 오프라인 스터디 패널 멤버 (큰 모니터에 표시되는 6명 명단)';

COMMIT;
