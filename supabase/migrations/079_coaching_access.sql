-- ============================================================
-- 079_coaching_access.sql
-- AI 코치 접근 권한 시스템
--
-- /coaching 페이지 및 하위 모든 코칭 라우트에 접근할 수 있는
-- 사용자를 관리자가 명시적으로 부여/회수하는 테이블.
--
-- 권한 정책:
--   1) 관리자(app_metadata.role = 'admin') — 자동 통과
--   2) coaching_access 보유자 — 관리자가 부여
--   비로그인·권한 없음 → 코칭 페이지 진입 차단 (홈으로 redirect)
--
-- 패턴: lecture_access (061_lectures_restore_and_access.sql) /
--       exam_archive_access (065_exam_archive_access.sql) 동일
-- ============================================================

BEGIN;

-- ========================================
-- 1. coaching_access 테이블
-- ========================================
CREATE TABLE IF NOT EXISTS public.coaching_access (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_coaching_access_granted_at
  ON public.coaching_access(granted_at DESC);

COMMENT ON TABLE public.coaching_access IS
  'AI 코치 접근 권한 (관리자 부여). 관리자는 자동 통과. Dogfooding/베타 단계 사용자 통제용.';

-- ========================================
-- 2. RLS
-- ========================================
ALTER TABLE public.coaching_access ENABLE ROW LEVEL SECURITY;

-- 관리자 ALL
CREATE POLICY "Admins manage coaching access"
  ON public.coaching_access FOR ALL
  USING (
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

-- 본인 권한 조회 (UI 메뉴 노출 판단용)
CREATE POLICY "Users see own coaching access"
  ON public.coaching_access FOR SELECT
  USING (auth.uid() = user_id);

-- ========================================
-- 3. 초기 부여 — 본인(soridamhub@gmail.com) + admin은 자동 통과
-- ========================================
-- soridamhub@gmail.com (251b0655-6fd0-4566-bef2-57c07bb5dcd0) 초기 권한 부여 (테스트용)
INSERT INTO public.coaching_access (user_id, granted_by, note)
VALUES (
  '251b0655-6fd0-4566-bef2-57c07bb5dcd0',
  '251b0655-6fd0-4566-bef2-57c07bb5dcd0',
  '초기 Dogfooding 권한 (v5 백지 재설계 검증)'
)
ON CONFLICT (user_id) DO NOTHING;

COMMIT;
