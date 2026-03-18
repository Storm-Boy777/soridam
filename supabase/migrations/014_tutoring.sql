-- ============================================================
-- 014_tutoring.sql — 튜터링 모듈 (7개 테이블)
-- 진단 → 처방 → 훈련 → 복습 → 성장추적
-- ============================================================

-- ──────────────────────────────────────────────
-- 1. tutoring_sessions (튜터링 세션)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tutoring_sessions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mock_test_session_id    TEXT NOT NULL,
  target_level            TEXT,
  current_level           TEXT,
  status                  TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'completed')),
  total_prescriptions     SMALLINT,
  completed_prescriptions SMALLINT DEFAULT 0,
  started_at              TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at        TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tutoring_sessions_user
  ON tutoring_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_tutoring_sessions_mock
  ON tutoring_sessions(mock_test_session_id);

-- RLS
ALTER TABLE tutoring_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tutoring_sessions_select_own"
  ON tutoring_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "tutoring_sessions_insert_own"
  ON tutoring_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tutoring_sessions_update_own"
  ON tutoring_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────
-- 2. tutoring_prescriptions (처방 과제)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tutoring_prescriptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID NOT NULL REFERENCES tutoring_sessions(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users(id),
  priority          SMALLINT NOT NULL,
  question_type     TEXT NOT NULL,
  topic_id          TEXT,
  weakness_tags     JSONB,
  source            TEXT NOT NULL
    CHECK (source IN ('top3_priorities', 'recurring_patterns', 'question_type_map', 'individual_eval')),
  source_data       JSONB,
  level_params      JSONB,
  status            TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed')),
  training_count    SMALLINT DEFAULT 0,
  best_score        JSONB,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tutoring_prescriptions_session
  ON tutoring_prescriptions(session_id);
CREATE INDEX IF NOT EXISTS idx_tutoring_prescriptions_user
  ON tutoring_prescriptions(user_id);

-- RLS
ALTER TABLE tutoring_prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tutoring_prescriptions_select_own"
  ON tutoring_prescriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "tutoring_prescriptions_insert_own"
  ON tutoring_prescriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tutoring_prescriptions_update_own"
  ON tutoring_prescriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────
-- 3. tutoring_training_sessions (훈련 세션 기록)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tutoring_training_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id),
  prescription_id     UUID REFERENCES tutoring_prescriptions(id) ON DELETE SET NULL,
  session_type        TEXT DEFAULT 'guided'
    CHECK (session_type IN ('guided', 'free', 'simulation')),
  question_type       TEXT NOT NULL,
  topic_id            TEXT,
  target_level        TEXT,
  level_params        JSONB,
  session_goal        TEXT,
  success_criteria    JSONB,
  duration_seconds    INTEGER,
  screens_completed   SMALLINT DEFAULT 0,
  overall_score       JSONB,
  kpi_results         JSONB,
  next_recommendation JSONB,
  started_at          TIMESTAMPTZ DEFAULT NOW(),
  completed_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tutoring_training_sessions_user
  ON tutoring_training_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_tutoring_training_sessions_prescription
  ON tutoring_training_sessions(prescription_id);

-- RLS
ALTER TABLE tutoring_training_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tutoring_training_sessions_select_own"
  ON tutoring_training_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "tutoring_training_sessions_insert_own"
  ON tutoring_training_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tutoring_training_sessions_update_own"
  ON tutoring_training_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────
-- 4. tutoring_attempts (훈련 시도 기록)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tutoring_attempts (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id),
  training_session_id     UUID NOT NULL REFERENCES tutoring_training_sessions(id) ON DELETE CASCADE,
  screen_number           SMALLINT NOT NULL,
  protocol                TEXT
    CHECK (protocol IS NULL OR protocol IN ('epp', 'variation', 'transformation', 'timed', 'self_repair', 'warmup', 'simulation')),
  question_id             TEXT,
  attempt_number          SMALLINT,
  user_answer             TEXT,
  user_audio_url          TEXT,
  audio_duration_seconds  INTEGER,
  -- 측정 지표
  metrics                 JSONB,
  pronunciation           JSONB,
  -- 평가 결과
  evaluation              JSONB,
  passed                  BOOLEAN,
  -- Self-repair 전용
  repair_before           TEXT,
  repair_after            TEXT,
  repair_type             TEXT
    CHECK (repair_type IS NULL OR repair_type IN ('grammar', 'l1_interference', 'upgrade')),
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tutoring_attempts_training
  ON tutoring_attempts(training_session_id);
CREATE INDEX IF NOT EXISTS idx_tutoring_attempts_user
  ON tutoring_attempts(user_id);

-- RLS
ALTER TABLE tutoring_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tutoring_attempts_select_own"
  ON tutoring_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "tutoring_attempts_insert_own"
  ON tutoring_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tutoring_attempts_update_own"
  ON tutoring_attempts FOR UPDATE
  USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────
-- 5. tutoring_review_schedule (SRS 복습 스케줄)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tutoring_review_schedule (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prescription_id UUID NOT NULL REFERENCES tutoring_prescriptions(id) ON DELETE CASCADE,
  question_type   TEXT NOT NULL,
  next_review_at  TIMESTAMPTZ NOT NULL,
  review_count    SMALLINT DEFAULT 0,
  interval_days   SMALLINT DEFAULT 1,
  status          TEXT DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'completed', 'skipped')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tutoring_review_user
  ON tutoring_review_schedule(user_id);
CREATE INDEX IF NOT EXISTS idx_tutoring_review_next
  ON tutoring_review_schedule(next_review_at)
  WHERE status = 'scheduled';

-- RLS
ALTER TABLE tutoring_review_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tutoring_review_select_own"
  ON tutoring_review_schedule FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "tutoring_review_insert_own"
  ON tutoring_review_schedule FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tutoring_review_update_own"
  ON tutoring_review_schedule FOR UPDATE
  USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────
-- 6. tutoring_skill_history (성장 추적)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tutoring_skill_history (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source                  TEXT NOT NULL
    CHECK (source IN ('mock_test', 'training', 'simulation')),
  source_id               TEXT,
  question_type           TEXT,
  avg_structure_score     NUMERIC(3,1),
  avg_wpm                 NUMERIC(5,1),
  avg_filler_pct          NUMERIC(4,1),
  avg_connector_count     NUMERIC(3,1),
  avg_silence_seconds     NUMERIC(4,1),
  self_repair_count       SMALLINT,
  variation_success_rate  NUMERIC(4,2),
  block_completion_rate   NUMERIC(4,2),
  recorded_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tutoring_skill_user
  ON tutoring_skill_history(user_id);
CREATE INDEX IF NOT EXISTS idx_tutoring_skill_recorded
  ON tutoring_skill_history(user_id, recorded_at);

-- RLS
ALTER TABLE tutoring_skill_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tutoring_skill_select_own"
  ON tutoring_skill_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "tutoring_skill_insert_own"
  ON tutoring_skill_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ──────────────────────────────────────────────
-- 7. Storage 버킷 (튜터링 녹음)
-- ──────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('tutoring-recordings', 'tutoring-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: 본인 폴더만 접근
CREATE POLICY "tutoring_recordings_select_own"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tutoring-recordings' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "tutoring_recordings_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'tutoring-recordings' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ──────────────────────────────────────────────
-- 8. ai_prompt_templates 추가 (튜터링 전용)
-- ──────────────────────────────────────────────
INSERT INTO evaluation_prompts (key, content, updated_at)
VALUES
  ('tutoring_session_brief', '## 세션 브리프 생성 프롬프트 (placeholder)', NOW()),
  ('tutoring_epp_generate', '## EPP 패턴 생성 프롬프트 (placeholder)', NOW()),
  ('tutoring_timed_evaluate', '## 타임드 실전 평가 프롬프트 (placeholder)', NOW()),
  ('tutoring_self_repair', '## Self-repair 평가 프롬프트 (placeholder)', NOW())
ON CONFLICT (key) DO NOTHING;
