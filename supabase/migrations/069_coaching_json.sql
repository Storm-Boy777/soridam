-- 069_coaching_json.sql
-- AI 코치 — 구조화 코칭 출력 컬럼 추가
--
-- 배경: 기존 coaching_markdown(자유 텍스트)은 ReactMarkdown 렌더링만 가능해
--       정보 위계를 디자인으로 통제하기 어려웠다. 코칭 출력을 섹션 단위
--       구조화 JSON(intro / issues[] / model_answer / action_items)으로 전환해
--       학습 룸에서 전용 카드 UI로 렌더링한다.
--
-- 호환: coaching_markdown은 그대로 유지(기존 회차 폴백 렌더링용).
--       신규 회차는 coaching_json을 채우고 coaching_markdown은 비운다.

ALTER TABLE coaching_attempts
  ADD COLUMN IF NOT EXISTS coaching_json jsonb;

COMMENT ON COLUMN coaching_attempts.coaching_json IS
  'AI 코치 구조화 코칭 출력 — { intro, progress_table?, issues[], model_answer, action_items[], closing? }. 구버전 회차는 NULL이며 coaching_markdown으로 폴백 렌더링.';
