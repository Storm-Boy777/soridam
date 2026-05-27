-- =============================================
-- 099: study_freetalk_sets — 금요일 AI 게임 세트 (세션 단위)
-- =============================================
-- Phase B. 테마 1개로 AI가 그날 저녁 게임 콘텐츠를 통째 생성 → 한 행(=한 세트)으로 저장.
-- 월요일 study_podcasts와 동일한 "한 행 = 한 자료" 모델.
-- roleplay까지 jsonb로 품으므로 기존 테이블(study_game_cards 등)은 건드리지 않는다.
--
-- 라이브 화면(FreetalkStage)은 세트를 골라 그 안의 배열로 게임을 진행한다.
-- 세트가 없을 땐 기존 풀(study_freetalk + study_game_cards + 하드코딩 롤플레이)을
-- "기본 세트"로 폴백한다.

CREATE TABLE IF NOT EXISTS study_freetalk_sets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme           text NOT NULL,                         -- 테마 라벨 (예: "여행", "음식")
  difficulty      text NOT NULL DEFAULT 'intermediate'
                    CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  description     text NOT NULL DEFAULT '',              -- 한국어 1~2줄 요약

  -- 게임별 콘텐츠 배열 (각 게임 컴포넌트가 기대하는 data 모양 그대로)
  spinner_topics  jsonb NOT NULL DEFAULT '[]',  -- [{ english, korean, follow_up, category }]
  taboo           jsonb NOT NULL DEFAULT '[]',  -- [{ target, forbidden: string[5] }]  (Taboo + 스무고개 공용)
  wyr             jsonb NOT NULL DEFAULT '[]',  -- [{ optionA, optionB }]
  roleplay        jsonb NOT NULL DEFAULT '[]',  -- [{ title, situation, situation_ko, role_a:{name,mission}, role_b:{name,mission}, phrases:string[], emotion }]
  story           jsonb NOT NULL DEFAULT '[]',  -- [{ opening, genre }]
  debate          jsonb NOT NULL DEFAULT '[]',  -- [{ topic, context, proPoints:string[], conPoints:string[] }]

  sort_order      int NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_freetalk_sets_active
  ON study_freetalk_sets(is_active, sort_order);

-- RLS
ALTER TABLE study_freetalk_sets ENABLE ROW LEVEL SECURITY;

-- SELECT: 인증 사용자 전체
DROP POLICY IF EXISTS "study_freetalk_sets_select" ON study_freetalk_sets;
CREATE POLICY "study_freetalk_sets_select" ON study_freetalk_sets
  FOR SELECT TO authenticated USING (true);

-- INSERT/UPDATE: admin (JWT claim — 093 패턴) OR 활성 패널 멤버 (092 패턴)
-- PostgreSQL은 복수 정책을 OR로 결합하므로 admin·member 정책을 분리해 둔다.
DROP POLICY IF EXISTS "study_freetalk_sets_admin_insert" ON study_freetalk_sets;
CREATE POLICY "study_freetalk_sets_admin_insert" ON study_freetalk_sets
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "study_freetalk_sets_admin_update" ON study_freetalk_sets;
CREATE POLICY "study_freetalk_sets_admin_update" ON study_freetalk_sets
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "study_freetalk_sets_member_insert" ON study_freetalk_sets;
CREATE POLICY "study_freetalk_sets_member_insert" ON study_freetalk_sets
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_panel_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "study_freetalk_sets_member_update" ON study_freetalk_sets;
CREATE POLICY "study_freetalk_sets_member_update" ON study_freetalk_sets
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM study_panel_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_panel_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- DELETE: admin만
DROP POLICY IF EXISTS "study_freetalk_sets_admin_delete" ON study_freetalk_sets;
CREATE POLICY "study_freetalk_sets_admin_delete" ON study_freetalk_sets
  FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- updated_at 자동 갱신
DROP TRIGGER IF EXISTS trg_study_freetalk_sets_updated_at ON study_freetalk_sets;
CREATE TRIGGER trg_study_freetalk_sets_updated_at BEFORE UPDATE ON study_freetalk_sets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
