-- ============================================================
-- 052_opic_study_drop_target_level.sql
--
-- 목적: study_groups.target_level 컬럼 삭제.
-- 배경: 같은 그룹이라도 멤버마다 목표 등급이 다를 수 있음.
--       그룹 단위 등급은 의미 없고, profiles.target_grade를 사용.
-- 영향: AI F/B 입력에서 답변자 본인의 target_grade 사용.
--       Admin UI에서 그룹 등급 입력 제거.
-- ============================================================

ALTER TABLE study_groups DROP COLUMN IF EXISTS target_level;
