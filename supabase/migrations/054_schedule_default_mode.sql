-- 054: schedule.default_mode 추가 (모임 방식 — 그룹 단위로)
--
-- 기존 study_groups + system_settings.opic_study_schedule 모두에 default_mode 필드 채움.
-- default_mode가 없으면 'online' 폴백.

-- study_groups
UPDATE study_groups
SET schedule = jsonb_set(schedule, '{default_mode}', '"online"', true)
WHERE schedule IS NOT NULL
  AND NOT (schedule ? 'default_mode');

-- system_settings — 글로벌 default 일정
UPDATE system_settings
SET value = jsonb_set(value, '{default_mode}', '"online"', true)
WHERE key = 'opic_study_schedule'
  AND NOT (value ? 'default_mode');
