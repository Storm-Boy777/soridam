-- =============================================
-- 047: 오픽 스터디 모듈
-- - 스터디 그룹 (월별 + 등급별)
-- - 멤버십 (관리자 직접 등록)
-- - 세션 (실시간 동기화 룸)
-- - 답변 + AI F/B 결과
-- =============================================

-- ─────────────────────────────────────────────
-- 1. study_groups
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS study_groups (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  target_level    text NOT NULL,                       -- 'IM2'|'IH'|'AL' 등
  start_date      date NOT NULL,
  end_date        date NOT NULL,
  status          text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'closed')),
  description     text,
  created_by      uuid NOT NULL REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_groups_status ON study_groups(status);
CREATE INDEX IF NOT EXISTS idx_study_groups_dates ON study_groups(start_date, end_date);

-- ─────────────────────────────────────────────
-- 2. study_group_members
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS study_group_members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        uuid NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    text,
  joined_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_sgm_user ON study_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_sgm_group ON study_group_members(group_id);

-- ─────────────────────────────────────────────
-- 3. opic_study_sessions (실시간 동기화 룸)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS opic_study_sessions (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id                 uuid NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,

  -- 모드
  online_mode              boolean NOT NULL DEFAULT true,

  -- 진행 단계 (Realtime 동기화 핵심)
  step                     text NOT NULL DEFAULT 'mode_select'
                             CHECK (step IN (
                               'mode_select', 'category_select', 'topic_select',
                               'combo_select', 'guide', 'recording',
                               'feedback_share', 'discussion', 'completed'
                             )),

  -- 학습 콘텐츠 선택 상태
  selected_category        text CHECK (selected_category IN ('general','roleplay','advance')),
  selected_topic           text,
  selected_combo_sig       text,
  selected_question_ids    text[] NOT NULL DEFAULT '{}',

  -- 진행 상태
  current_question_idx     integer NOT NULL DEFAULT 0,
  current_speaker_user_id  uuid REFERENCES auth.users(id),

  -- AI 가이드 (1회 생성, 캐싱)
  ai_guide_text            text,
  ai_guide_key_points      jsonb,                       -- ["...", "...", "..."] F/B 입력 일관성용
  ai_guide_generated_at    timestamptz,

  -- 메타
  status                   text NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active', 'completed', 'abandoned')),
  started_at               timestamptz NOT NULL DEFAULT now(),
  ended_at                 timestamptz,
  created_by               uuid NOT NULL REFERENCES auth.users(id),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oss_group ON opic_study_sessions(group_id);
CREATE INDEX IF NOT EXISTS idx_oss_status ON opic_study_sessions(status);
CREATE INDEX IF NOT EXISTS idx_oss_combo_sig ON opic_study_sessions(group_id, selected_combo_sig)
  WHERE status = 'completed';

-- ─────────────────────────────────────────────
-- 4. opic_study_answers (멤버별 답변 + F/B)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS opic_study_answers (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          uuid NOT NULL REFERENCES opic_study_sessions(id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES auth.users(id),
  question_id         text NOT NULL REFERENCES questions(id),
  question_idx        integer NOT NULL,

  -- 음성 + STT
  audio_url           text,
  transcript          text,

  -- 발음 평가 (Azure) — 내부 GPT 입력 전용, UI 노출 X
  pronunciation_score jsonb,

  -- AI F/B (일타강사 코칭)
  feedback_result     jsonb,
  feedback_generated_at timestamptz,

  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id, question_idx)
);

CREATE INDEX IF NOT EXISTS idx_osa_session ON opic_study_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_osa_user ON opic_study_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_osa_qid_user ON opic_study_answers(question_id, user_id)
  WHERE feedback_result IS NOT NULL;

-- ─────────────────────────────────────────────
-- 5. updated_at 자동 갱신 트리거
-- (trigger_set_updated_at 함수는 045_support.sql에서 이미 정의됨, CREATE OR REPLACE)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_study_groups_updated_at ON study_groups;
CREATE TRIGGER set_study_groups_updated_at
  BEFORE UPDATE ON study_groups
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_opic_study_sessions_updated_at ON opic_study_sessions;
CREATE TRIGGER set_opic_study_sessions_updated_at
  BEFORE UPDATE ON opic_study_sessions
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─────────────────────────────────────────────
-- 6. 시험후기 모듈 인덱스 보강 (콤보 빈도 쿼리 최적화)
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sq_topic_combotype
  ON submission_questions(topic, combo_type);
CREATE INDEX IF NOT EXISTS idx_sq_qid
  ON submission_questions(question_id);

-- ─────────────────────────────────────────────
-- 7. RLS 활성화
-- ─────────────────────────────────────────────
ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE opic_study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE opic_study_answers ENABLE ROW LEVEL SECURITY;

-- ─── study_groups ───
-- 관리자 전체 / 멤버는 자기 그룹만 SELECT
DROP POLICY IF EXISTS sg_select ON study_groups;
CREATE POLICY sg_select ON study_groups
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR EXISTS (
      SELECT 1 FROM study_group_members sgm
      WHERE sgm.group_id = study_groups.id AND sgm.user_id = auth.uid()
    )
  );

-- 관리자만 INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS sg_modify ON study_groups;
CREATE POLICY sg_modify ON study_groups
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ─── study_group_members ───
-- 관리자 / 같은 그룹 멤버 SELECT
DROP POLICY IF EXISTS sgm_select ON study_group_members;
CREATE POLICY sgm_select ON study_group_members
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR EXISTS (
      SELECT 1 FROM study_group_members me
      WHERE me.group_id = study_group_members.group_id AND me.user_id = auth.uid()
    )
  );

-- 관리자만 멤버 추가/제거
DROP POLICY IF EXISTS sgm_modify ON study_group_members;
CREATE POLICY sgm_modify ON study_group_members
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ─── opic_study_sessions ───
-- 그룹 멤버만 SELECT (+ 관리자)
DROP POLICY IF EXISTS oss_select ON opic_study_sessions;
CREATE POLICY oss_select ON opic_study_sessions
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR EXISTS (
      SELECT 1 FROM study_group_members sgm
      WHERE sgm.group_id = opic_study_sessions.group_id AND sgm.user_id = auth.uid()
    )
  );

-- 그룹 멤버 INSERT
DROP POLICY IF EXISTS oss_insert ON opic_study_sessions;
CREATE POLICY oss_insert ON opic_study_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_group_members sgm
      WHERE sgm.group_id = opic_study_sessions.group_id AND sgm.user_id = auth.uid()
    )
  );

-- 그룹 멤버 UPDATE (Realtime 동기화 위해 필수 허용)
DROP POLICY IF EXISTS oss_update ON opic_study_sessions;
CREATE POLICY oss_update ON opic_study_sessions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM study_group_members sgm
      WHERE sgm.group_id = opic_study_sessions.group_id AND sgm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_group_members sgm
      WHERE sgm.group_id = opic_study_sessions.group_id AND sgm.user_id = auth.uid()
    )
  );

-- ─── opic_study_answers ───
-- 같은 세션 멤버 모두 SELECT (서로 답변 공유)
DROP POLICY IF EXISTS osa_select ON opic_study_answers;
CREATE POLICY osa_select ON opic_study_answers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM opic_study_sessions s
      JOIN study_group_members sgm ON sgm.group_id = s.group_id
      WHERE s.id = opic_study_answers.session_id AND sgm.user_id = auth.uid()
    )
  );

-- 본인 답변만 INSERT
DROP POLICY IF EXISTS osa_insert_own ON opic_study_answers;
CREATE POLICY osa_insert_own ON opic_study_answers
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM opic_study_sessions s
      JOIN study_group_members sgm ON sgm.group_id = s.group_id
      WHERE s.id = opic_study_answers.session_id AND sgm.user_id = auth.uid()
    )
  );

-- UPDATE는 service_role(EF)만 — RLS 정책 없으면 일반 사용자 차단됨
