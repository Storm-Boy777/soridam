-- =============================================
-- 046: 스터디 모임 콘텐츠 테이블 (팟캐스트, 프리토킹, 게임 카드)
-- =============================================

-- 1. study_podcasts
CREATE TABLE IF NOT EXISTS study_podcasts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  source          text NOT NULL,
  url             text NOT NULL,
  duration        text NOT NULL,
  difficulty      text NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  topic           text NOT NULL,
  description     text NOT NULL,
  warmup_question text NOT NULL,
  key_expressions jsonb NOT NULL DEFAULT '[]',
  comprehension_questions jsonb NOT NULL DEFAULT '[]',
  discussion_questions    jsonb NOT NULL DEFAULT '[]',
  sort_order      int NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- 2. study_freetalk
CREATE TABLE IF NOT EXISTS study_freetalk (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  english         text NOT NULL,
  korean          text NOT NULL,
  follow_up       text NOT NULL,
  category        text NOT NULL CHECK (category IN ('daily', 'opinions', 'hypothetical', 'culture', 'current')),
  sort_order      int NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- 3. study_game_cards
CREATE TABLE IF NOT EXISTS study_game_cards (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type       text NOT NULL CHECK (game_type IN ('taboo', 'would-you-rather', 'debate', 'story-chain')),
  data            jsonb NOT NULL DEFAULT '{}',
  sort_order      int NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_study_freetalk_category ON study_freetalk(category);
CREATE INDEX IF NOT EXISTS idx_study_game_cards_game_type ON study_game_cards(game_type);

-- RLS 활성화
ALTER TABLE study_podcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_freetalk ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_game_cards ENABLE ROW LEVEL SECURITY;

-- RLS: 인증 사용자 SELECT
CREATE POLICY "study_podcasts_select" ON study_podcasts FOR SELECT TO authenticated USING (true);
CREATE POLICY "study_freetalk_select" ON study_freetalk FOR SELECT TO authenticated USING (true);
CREATE POLICY "study_game_cards_select" ON study_game_cards FOR SELECT TO authenticated USING (true);

-- RLS: admin만 INSERT/UPDATE/DELETE
CREATE POLICY "study_podcasts_admin_insert" ON study_podcasts FOR INSERT TO authenticated
  WITH CHECK ((SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin');
CREATE POLICY "study_podcasts_admin_update" ON study_podcasts FOR UPDATE TO authenticated
  USING ((SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin');
CREATE POLICY "study_podcasts_admin_delete" ON study_podcasts FOR DELETE TO authenticated
  USING ((SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "study_freetalk_admin_insert" ON study_freetalk FOR INSERT TO authenticated
  WITH CHECK ((SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin');
CREATE POLICY "study_freetalk_admin_update" ON study_freetalk FOR UPDATE TO authenticated
  USING ((SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin');
CREATE POLICY "study_freetalk_admin_delete" ON study_freetalk FOR DELETE TO authenticated
  USING ((SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "study_game_cards_admin_insert" ON study_game_cards FOR INSERT TO authenticated
  WITH CHECK ((SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin');
CREATE POLICY "study_game_cards_admin_update" ON study_game_cards FOR UPDATE TO authenticated
  USING ((SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin');
CREATE POLICY "study_game_cards_admin_delete" ON study_game_cards FOR DELETE TO authenticated
  USING ((SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin');

-- updated_at 자동 갱신 트리거
CREATE TRIGGER trg_study_podcasts_updated_at BEFORE UPDATE ON study_podcasts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_study_freetalk_updated_at BEFORE UPDATE ON study_freetalk
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_study_game_cards_updated_at BEFORE UPDATE ON study_game_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
