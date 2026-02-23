-- ============================================================
-- 005_survey_fields.sql
-- 서베이 정보 필드 추가 (오픽톡닥 추천 서베이 시스템)
-- 생성일: 2026-02-23
-- ============================================================

-- 1. 추천 서베이 사용 여부
ALTER TABLE submissions
  ADD COLUMN used_recommended_survey BOOLEAN NOT NULL DEFAULT true;

-- 2. 라디오 필드 (단일선택, 커스텀일 때만 값 존재)
ALTER TABLE submissions ADD COLUMN survey_occupation TEXT;
ALTER TABLE submissions ADD COLUMN survey_student TEXT;
ALTER TABLE submissions ADD COLUMN survey_course TEXT;
ALTER TABLE submissions ADD COLUMN survey_housing TEXT;

-- 3. 체크박스 필드 (복수선택, 콤마 구분 문자열)
ALTER TABLE submissions ADD COLUMN survey_leisure TEXT;
ALTER TABLE submissions ADD COLUMN survey_hobbies TEXT;
ALTER TABLE submissions ADD COLUMN survey_sports TEXT;
ALTER TABLE submissions ADD COLUMN survey_travel TEXT;
