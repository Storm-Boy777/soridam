-- =============================================
-- 094: study_podcasts 대화 스크립트 + 역할극 컬럼
-- =============================================
-- 월요일 가라오케(화자 구분 대화 → Whisper STT)와 무대 역할극을 위한 컬럼.
--   - dialogue_title : 대화 상황 영문 제목
--   - dialogue_script: 화자 구분 대화 스크립트 (Whisper STT 화자 매칭 기준)
--   - roleplay       : 2인 무대 역할극 가이드 (scenario + role_a/role_b)
--   - dialogue_timestamps: Whisper 결과 화자별 세그먼트 (가라오케 재생) — 095(EF)에서 채움

ALTER TABLE study_podcasts
  ADD COLUMN IF NOT EXISTS dialogue_title      text,
  ADD COLUMN IF NOT EXISTS dialogue_script     text,
  ADD COLUMN IF NOT EXISTS roleplay            jsonb,
  ADD COLUMN IF NOT EXISTS dialogue_timestamps jsonb NOT NULL DEFAULT '[]';

COMMENT ON COLUMN study_podcasts.dialogue_script IS
  '화자 구분 대화 스크립트 (Whisper STT 가라오케 화자 매칭 기준)';
COMMENT ON COLUMN study_podcasts.roleplay IS
  '2인 무대 역할극 가이드 { scenario, scenario_ko, role_a, role_b }';
COMMENT ON COLUMN study_podcasts.dialogue_timestamps IS
  'Whisper 화자별 세그먼트 [{speaker, text, translation, start, end}] (가라오케 재생)';
