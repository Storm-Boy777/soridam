-- =============================================
-- 087: study_podcasts.dialogue_lines 추가 (가라오케용)
-- =============================================
-- 1차 청취(Phase 1) 영상 아래에 자막 가라오케 효과를 표시하기 위해
-- 대화 1차 구간(dialogue_segment)에 해당하는 자막 라인을 별도 컬럼에 저장한다.
--
-- 스키마: dialogue_lines jsonb — [{ start_ms, end_ms, text }, ...]
--   - start_ms / end_ms: 자막 라인의 시작·끝 시각(ms)
--   - text: 자막 텍스트 (한 라인)
-- 자료 자동 생성 시 EF가 dialogue_segment 구간 안에 들어가는 자막만
-- 추려 채운다. 기존 자료는 빈 배열로 시작 → 재생성 시 채워짐.

ALTER TABLE study_podcasts
  ADD COLUMN IF NOT EXISTS dialogue_lines jsonb NOT NULL DEFAULT '[]';

COMMENT ON COLUMN study_podcasts.dialogue_lines IS
  '1차 청취 가라오케용 자막 라인. dialogue_segment 구간만. [{start_ms, end_ms, text}].';
