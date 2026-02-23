-- ============================================================
-- 004_grade_two_fields.sql
-- 응시 전 등급 + 취득 등급 2단계 시스템
-- 생성일: 2026-02-23
-- ============================================================

-- 1. 응시 전 등급 컬럼 추가 (none = 첫 응시/없음)
ALTER TABLE submissions
  ADD COLUMN pre_exam_level TEXT
  CHECK (pre_exam_level IN ('AL','IH','IM3','IM2','IM1','IL','NH','none'));

-- 2. achieved_level CHECK 제약 변경 (unknown = 아직 모름 추가)
ALTER TABLE submissions
  DROP CONSTRAINT IF EXISTS submissions_achieved_level_check;

ALTER TABLE submissions
  ADD CONSTRAINT submissions_achieved_level_check
  CHECK (achieved_level IN ('AL','IH','IM3','IM2','IM1','IL','NH','unknown'));

-- 3. 기존 데이터 처리
UPDATE submissions SET pre_exam_level = 'none' WHERE pre_exam_level IS NULL;
UPDATE submissions SET achieved_level = 'unknown' WHERE achieved_level IS NULL;

-- 4. NOT NULL 제약 추가
ALTER TABLE submissions ALTER COLUMN pre_exam_level SET NOT NULL;
ALTER TABLE submissions ALTER COLUMN achieved_level SET NOT NULL;
