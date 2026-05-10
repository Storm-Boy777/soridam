-- 061_lectures_restore_and_access.sql
-- 강의 시스템 복원 + lecture_access 권한 시스템 신규 도입
--
-- 변경 사항:
-- 1) bak_* 테이블 이름 복원 (lectures, lecture_materials, lecture_progress)
-- 2) 기존 VIP/Service role 기반 RLS 정책 삭제
-- 3) lecture_access 신규 테이블 (관리자가 부여하는 강의 접근 권한)
-- 4) 신규 RLS: is_admin OR has lecture_access

BEGIN;

-- ========================================
-- 1. 기존 RLS 정책 삭제 (bak_* 테이블에 있던 VIP/Service 기반)
-- ========================================
DROP POLICY IF EXISTS "Authenticated users can view active lectures" ON public.bak_lectures;
DROP POLICY IF EXISTS "Service role can manage lectures" ON public.bak_lectures;
DROP POLICY IF EXISTS "Admins can delete lecture materials" ON public.bak_lecture_materials;
DROP POLICY IF EXISTS "Admins can update lecture materials" ON public.bak_lecture_materials;
DROP POLICY IF EXISTS "Service role can manage lecture materials" ON public.bak_lecture_materials;
DROP POLICY IF EXISTS "Users can view lecture materials" ON public.bak_lecture_materials;
DROP POLICY IF EXISTS "Users can manage own progress" ON public.bak_lecture_progress;

-- ========================================
-- 2. 테이블 이름 복원 (bak_* → 원래 이름)
-- 인덱스/외래키/트리거는 PostgreSQL이 자동 갱신
-- ========================================
ALTER TABLE public.bak_lectures RENAME TO lectures;
ALTER TABLE public.bak_lecture_materials RENAME TO lecture_materials;
ALTER TABLE public.bak_lecture_progress RENAME TO lecture_progress;

-- ========================================
-- 3. lecture_access 신규 테이블 (관리자 부여 권한)
-- ========================================
CREATE TABLE IF NOT EXISTS public.lecture_access (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_lecture_access_granted_at
  ON public.lecture_access(granted_at DESC);

COMMENT ON TABLE public.lecture_access IS
  '강의 접근 권한 (관리자가 부여). 관리자는 자동 부여 — RLS에서 분기.';

-- ========================================
-- 4. RLS 활성화
-- ========================================
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecture_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecture_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecture_access ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 5. RLS 정책 — lectures
-- ========================================
-- 활성 강의 조회: 관리자 또는 lecture_access 보유자
CREATE POLICY "View active lectures with access"
  ON public.lectures FOR SELECT
  USING (
    is_active = true
    AND (
      (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
      OR EXISTS (SELECT 1 FROM public.lecture_access WHERE user_id = auth.uid())
    )
  );

-- 강의 CRUD: 관리자 전용
CREATE POLICY "Admins manage lectures"
  ON public.lectures FOR ALL
  USING ((SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin');

-- ========================================
-- 6. RLS 정책 — lecture_materials
-- ========================================
CREATE POLICY "View materials with access"
  ON public.lecture_materials FOR SELECT
  USING (
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
    OR EXISTS (SELECT 1 FROM public.lecture_access WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins manage materials"
  ON public.lecture_materials FOR ALL
  USING ((SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin');

-- ========================================
-- 7. RLS 정책 — lecture_progress
-- ========================================
-- 본인 진도 CRUD
CREATE POLICY "Users manage own progress"
  ON public.lecture_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 관리자 모든 진도 조회
CREATE POLICY "Admins view all progress"
  ON public.lecture_progress FOR SELECT
  USING ((SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin');

-- ========================================
-- 8. RLS 정책 — lecture_access
-- ========================================
-- 관리자 권한 부여/회수
CREATE POLICY "Admins manage access"
  ON public.lecture_access FOR ALL
  USING ((SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin');

-- 본인 권한 조회 (UI에서 메뉴 노출 여부 판단용)
CREATE POLICY "Users see own access"
  ON public.lecture_access FOR SELECT
  USING (auth.uid() = user_id);

COMMIT;
