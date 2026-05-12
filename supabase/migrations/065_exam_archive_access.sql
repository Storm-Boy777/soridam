-- ============================================================
-- 065_exam_archive_access.sql
-- 기출 보관함 접근 권한 시스템
--
-- /reviews 페이지의 새 탭 "기출 보관함"에 접근할 수 있는
-- 사용자를 관리자가 명시적으로 부여/회수하는 테이블.
--
-- 별도 권한 정책:
--   1) 관리자(app_metadata.role = 'admin') — 자동 통과
--   2) exam_archive_access 보유자 — 관리자가 부여
--   3) (애플리케이션 레벨) 크레딧 잔액 > 0 사용자 — DB 체크 X, SA에서 OR 처리
--
-- 패턴: lecture_access (061_lectures_restore_and_access.sql)와 동일
-- ============================================================

BEGIN;

-- ========================================
-- 1. exam_archive_access 테이블
-- ========================================
CREATE TABLE IF NOT EXISTS public.exam_archive_access (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_exam_archive_access_granted_at
  ON public.exam_archive_access(granted_at DESC);

COMMENT ON TABLE public.exam_archive_access IS
  '기출 보관함 접근 권한 (관리자 부여). 관리자/크레딧 보유자도 통과(애플리케이션 레벨 분기).';

-- ========================================
-- 2. RLS
-- ========================================
ALTER TABLE public.exam_archive_access ENABLE ROW LEVEL SECURITY;

-- 관리자 ALL
CREATE POLICY "Admins manage exam archive access"
  ON public.exam_archive_access FOR ALL
  USING (
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

-- 본인 권한 조회 (UI 메뉴 노출 판단용)
CREATE POLICY "Users see own exam archive access"
  ON public.exam_archive_access FOR SELECT
  USING (auth.uid() = user_id);

COMMIT;
