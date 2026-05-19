-- =============================================
-- 085: study_podcasts v2 — 대화 구간 + 어휘 훈련 카드
-- =============================================
-- study-podcast-generate EF 개편(YouTube URL → Supadata 자막 → EnglishPod 자료)에
-- 맞춰 컬럼을 추가한다.
--   - listening_mission : 1차 청취 focus 미션 (한국어)
--   - dialogue_segment  : 대화 1차 구간 { start_sec, end_sec }  (대화 못 찾으면 null)
--   - todays_picks      : 오늘의 표현 후보 3개 (string[])
--
-- key_expressions(jsonb)는 컬럼 변경 없이 내부 구조만 확장된다:
--   구버전 { english, korean, example }
--   → 신버전 { expression, meaning_ko, meaning_en, examples[], similar_expressions[],
--             speaking_prompt, level }
-- ⚠️ 기존에 저장된 팟캐스트가 있다면 구버전 어휘 구조이므로, 새 EF로 재생성해야 한다.

ALTER TABLE study_podcasts
  ADD COLUMN IF NOT EXISTS listening_mission text  NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS dialogue_segment  jsonb,
  ADD COLUMN IF NOT EXISTS todays_picks      jsonb NOT NULL DEFAULT '[]';
