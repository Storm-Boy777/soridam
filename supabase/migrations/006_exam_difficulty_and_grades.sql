-- ============================================================
-- 006_exam_difficulty_and_grades.sql
-- 응시 난이도 컬럼 추가 + 등급 체계 확장 (NL, NM 추가)
-- 생성일: 2026-02-23
-- ============================================================

-- 1. 응시 난이도 컬럼 추가
ALTER TABLE submissions
  ADD COLUMN exam_difficulty TEXT
  CHECK (exam_difficulty IN (
    '6-6','6-5','5-6','5-5','5-4','4-5','4-4','4-3',
    '3-4','3-3','3-2','2-3','2-2','2-1','1-2','1-1'
  ));

-- 2. pre_exam_level CHECK 제약 변경 (NL, NM 추가)
ALTER TABLE submissions
  DROP CONSTRAINT IF EXISTS submissions_pre_exam_level_check;

ALTER TABLE submissions
  ADD CONSTRAINT submissions_pre_exam_level_check
  CHECK (pre_exam_level IN ('AL','IH','IM3','IM2','IM1','IL','NH','NM','NL','none'));

-- 3. achieved_level CHECK 제약 변경 (NL, NM 추가 + nullable, 'unknown' 제거)
ALTER TABLE submissions
  DROP CONSTRAINT IF EXISTS submissions_achieved_level_check;

ALTER TABLE submissions ALTER COLUMN achieved_level DROP NOT NULL;

UPDATE submissions SET achieved_level = NULL WHERE achieved_level = 'unknown';

ALTER TABLE submissions
  ADD CONSTRAINT submissions_achieved_level_check
  CHECK (achieved_level IN ('AL','IH','IM3','IM2','IM1','IL','NH','NM','NL') OR achieved_level IS NULL);
