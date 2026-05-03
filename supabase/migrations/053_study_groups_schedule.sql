-- 053: study_groups.schedule JSONB 컬럼 추가 (그룹별 일정)
--
-- 정책 변경:
--   - 기존: system_settings.opic_study_schedule (글로벌 1건)
--   - 신규: study_groups.schedule (그룹별)
--
-- 글로벌 system_settings는 "신규 그룹 생성 시 기본값"으로만 유지 (폐기 X).
--
-- schedule 형식 (jsonb):
--   {
--     "days": [1,2,3,4,5],            -- 0=일, 1=월, ..., 6=토
--     "start_time": "07:40",
--     "end_time": "08:30",
--     "first_session_date": "2026-05-06"  -- YYYY-MM-DD
--   }
--   timezone은 'Asia/Seoul' 고정 (코드 상수)

ALTER TABLE study_groups
  ADD COLUMN IF NOT EXISTS schedule jsonb;

COMMENT ON COLUMN study_groups.schedule IS '그룹별 운영 일정 — {days, start_time, end_time, first_session_date}';

-- 기존 그룹 데이터 마이그레이션
-- 글로벌 default를 모든 기존 그룹에 적용 (있으면 가져오고, 없으면 폴백)
UPDATE study_groups
SET schedule = COALESCE(
  (SELECT value FROM system_settings WHERE key = 'opic_study_schedule'),
  '{"days":[1,2,3,4,5],"start_time":"07:40","end_time":"08:30","first_session_date":"2026-05-06"}'::jsonb
)
WHERE schedule IS NULL;
