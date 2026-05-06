-- 058_combo_guide_cache.sql
-- 콤보 단위 가이드 캐시 — 둘러보기 + 스터디 룸 Step5 공유
--
-- 변경 사항:
--   1. combo_guide_cache 테이블 신규 — sig PK, 콤보 단위 1회 생성 + 영구 캐시
--   2. 기존 opic_study_sessions의 ai_guide_intro/approaches 무효화 (포맷 변경 — 풀 가이드)
--      → 다음 진입 시 EF가 캐시에서 가져오거나 새로 생성

-- ============================================================
-- 1. combo_guide_cache 테이블
-- ============================================================

CREATE TABLE IF NOT EXISTS combo_guide_cache (
  sig text PRIMARY KEY,                    -- 콤보 시그니처 (정렬된 question_ids '|' join)
  topic text NOT NULL,
  category text NOT NULL,                  -- 'general' | 'roleplay' | 'advance'

  -- 출력
  intro_text text NOT NULL,                -- AI 코치 한 줄 인사
  approaches jsonb NOT NULL,               -- ApproachItem[] — 풀 가이드 array
  --   [{
  --     question_index, type_label, approach,
  --     answer_flow, key_points,
  --     recommended_word_min, recommended_word_max
  --   }]

  -- 메타
  generated_at timestamptz NOT NULL DEFAULT now(),
  prompt_version int NOT NULL DEFAULT 1    -- 프롬프트 큰 변경 시 일괄 무효화용
);

CREATE INDEX IF NOT EXISTS idx_combo_guide_cache_topic ON combo_guide_cache(topic);
CREATE INDEX IF NOT EXISTS idx_combo_guide_cache_category ON combo_guide_cache(category);
CREATE INDEX IF NOT EXISTS idx_combo_guide_cache_version ON combo_guide_cache(prompt_version);

COMMENT ON TABLE combo_guide_cache IS '콤보 단위 가이드 캐시 — 둘러보기 + 스터디 룸 Step5 공유. EF가 1회 생성 후 영구 캐시.';
COMMENT ON COLUMN combo_guide_cache.sig IS '정렬된 question_ids "|" join 시그니처';
COMMENT ON COLUMN combo_guide_cache.approaches IS 'ApproachItem[] — 각 질문별 풀 가이드 (본문 + 흐름 + 포인트 + 권장 길이)';

-- RLS — 모든 인증 사용자 SELECT 가능 (학습 자료 공유)
ALTER TABLE combo_guide_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS combo_guide_cache_select_all ON combo_guide_cache;
CREATE POLICY combo_guide_cache_select_all ON combo_guide_cache
  FOR SELECT TO authenticated USING (true);

-- INSERT/UPDATE/DELETE는 service_role만 (EF가 처리, RLS bypass)
DROP POLICY IF EXISTS combo_guide_cache_admin_modify ON combo_guide_cache;
CREATE POLICY combo_guide_cache_admin_modify ON combo_guide_cache
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- ============================================================
-- 2. 기존 세션 가이드 무효화 (포맷 변경)
-- ============================================================
-- 기존: { question_index, type_label, approach } (한 줄)
-- 새  : { question_index, type_label, approach, answer_flow, key_points, recommended_word_min/max }
--
-- 다음 세션 진입 시 EF가 캐시 또는 새로 생성하여 풀 가이드로 채움.

UPDATE opic_study_sessions
SET
  ai_guide_intro = NULL,
  ai_guide_approaches = NULL,
  ai_guide_generated_at = NULL
WHERE ai_guide_approaches IS NOT NULL;
