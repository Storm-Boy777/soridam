-- ============================================================
-- 068_coaching_module.sql
-- AI 코치 모듈 — 학습자 답변 → 강사 톤 1:1 코칭 사이클
-- PRD: C:/Users/js777/Desktop/소리담_AI코치_PRD.md (v2)
-- ============================================================

-- ============================================================
-- 1. coaching_sessions — 한 [유형 × 토픽] 학습 세션
-- ============================================================
CREATE TABLE coaching_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 학습 대상
  question_type   TEXT NOT NULL,                              -- description / routine / comparison / past_* / adv_* / rp_*
  topic           TEXT NOT NULL,                              -- 미용실 / 음식점 / 산업 / 집 ...
  question_id     TEXT REFERENCES questions(id),              -- 실제 출제 질문 (questions.id)
  survey_type     TEXT,                                       -- 선택형 / 공통형 (questions에서 가져와 캐시)

  -- 진척
  status          TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'mastered', 'abandoned')),
  attempt_count   INTEGER NOT NULL DEFAULT 0,
  last_grade      TEXT,                                       -- 최근 평가 등급 (내부용)
  last_issue_count   INTEGER,                                    -- 최근 흠 개수

  -- 메타
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_attempt_at TIMESTAMPTZ,
  mastered_at     TIMESTAMPTZ,
  abandoned_at    TIMESTAMPTZ
);

CREATE INDEX idx_coaching_sessions_user ON coaching_sessions(user_id, status);
CREATE INDEX idx_coaching_sessions_user_type ON coaching_sessions(user_id, question_type);

COMMENT ON TABLE coaching_sessions IS 'AI 코치 학습 세션 — 한 [유형 × 토픽] 단위';
COMMENT ON COLUMN coaching_sessions.attempt_count IS '회차 카운트 (1, 2, 3, ... 사이클 진행)';

-- ============================================================
-- 2. coaching_attempts — 회차별 시도 (마이크로 사이클의 단위)
-- ============================================================
CREATE TABLE coaching_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES coaching_sessions(id) ON DELETE CASCADE,
  attempt_number  INTEGER NOT NULL,                           -- 1, 2, 3, ...

  -- 입력
  input_mode      TEXT NOT NULL                               -- voice / text
    CHECK (input_mode IN ('voice', 'text')),
  audio_url       TEXT,
  audio_duration  NUMERIC,

  -- 트랜스크립트 (전처리 전후 둘 다 보관)
  raw_transcript     TEXT,                                    -- Whisper 원본 (구두점 없음)
  cleaned_transcript TEXT,                                    -- GPT 전처리 후 (구두점 + STT 정정)
  stt_fix_log        JSONB,                                   -- 정정 로그 (어디를 어떻게 정정했는지)

  -- 통계
  word_count      INTEGER,
  filler_count    INTEGER,
  filler_ratio    NUMERIC,
  long_pause_count INTEGER,

  -- 평가 (내부 데이터, 학생 노출 X)
  evaluation      JSONB,                                      -- { estimated_grade, 흠_총_개수, 흠_상세[], 강점[], 전회차_대비_진척{} }

  -- 코칭 출력 (학생에게 노출)
  coaching_markdown TEXT,                                     -- 강사 톤 1:1 코칭 markdown

  -- 처리 상태
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'preprocessing', 'evaluating', 'done', 'failed')),
  error_message   TEXT,

  -- 비용/모델
  model           TEXT,                                       -- 사용된 GPT 모델
  tokens_used     INTEGER,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,

  UNIQUE(session_id, attempt_number)
);

CREATE INDEX idx_coaching_attempts_session ON coaching_attempts(session_id, attempt_number);
CREATE INDEX idx_coaching_attempts_status ON coaching_attempts(status) WHERE status IN ('pending', 'preprocessing', 'evaluating');

COMMENT ON TABLE coaching_attempts IS '회차별 답변 시도 — Whisper raw → cleaned → 평가 → 코칭 markdown 체인';

-- ============================================================
-- 3. coaching_topic_mastery — 토픽 졸업 추적
-- ============================================================
CREATE TABLE coaching_topic_mastery (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_type   TEXT NOT NULL,
  topic           TEXT NOT NULL,
  session_id      UUID REFERENCES coaching_sessions(id),

  final_issue_count  INTEGER,
  total_attempts  INTEGER,
  final_grade     TEXT,

  mastered_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, question_type, topic)
);

CREATE INDEX idx_coaching_topic_mastery_user_type ON coaching_topic_mastery(user_id, question_type);

COMMENT ON TABLE coaching_topic_mastery IS '학습자가 졸업한 토픽 추적 — 유형 마스터 카운트 기준';

-- ============================================================
-- 4. coaching_type_mastery — 유형 마스터 (체화 완료)
-- ============================================================
CREATE TABLE coaching_type_mastery (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_type   TEXT NOT NULL,
  topics_mastered TEXT[] NOT NULL,                            -- 졸업한 토픽 배열 (5개 이상)
  total_attempts  INTEGER,                                    -- 누적 회차

  mastered_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, question_type)
);

CREATE INDEX idx_coaching_type_mastery_user ON coaching_type_mastery(user_id);

COMMENT ON TABLE coaching_type_mastery IS '학습자가 마스터한 유형 — 체화 완료 신호 (같은 유형 5개 토픽 졸업)';

-- ============================================================
-- 5. coaching_persona_settings — 사용자별 페르소나 설정 (선택)
-- ============================================================
CREATE TABLE coaching_persona_settings (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_code    TEXT NOT NULL DEFAULT 'stoic_coach'         -- stoic_coach (현재 유일)
    CHECK (persona_code IN ('stoic_coach', 'star_instructor', 'kind_mentor')),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE coaching_persona_settings IS '사용자별 강사 페르소나 (MVP: stoic_coach 1종)';

-- ============================================================
-- 6. updated_at 트리거
-- ============================================================
CREATE TRIGGER set_coaching_persona_settings_updated_at
  BEFORE UPDATE ON coaching_persona_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 7. RLS 정책
-- ============================================================
ALTER TABLE coaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_topic_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_type_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_persona_settings ENABLE ROW LEVEL SECURITY;

-- coaching_sessions: 본인 + 관리자
CREATE POLICY "coaching_sessions_owner_select" ON coaching_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "coaching_sessions_owner_insert" ON coaching_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "coaching_sessions_owner_update" ON coaching_sessions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "coaching_sessions_admin_all" ON coaching_sessions
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- coaching_attempts: 본인 세션의 attempts만 + 관리자
CREATE POLICY "coaching_attempts_owner_select" ON coaching_attempts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM coaching_sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
  );
CREATE POLICY "coaching_attempts_owner_insert" ON coaching_attempts
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM coaching_sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
  );
CREATE POLICY "coaching_attempts_admin_all" ON coaching_attempts
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- coaching_topic_mastery: 본인 + 관리자
CREATE POLICY "coaching_topic_mastery_owner_select" ON coaching_topic_mastery
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "coaching_topic_mastery_admin_all" ON coaching_topic_mastery
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- coaching_type_mastery: 본인 + 관리자
CREATE POLICY "coaching_type_mastery_owner_select" ON coaching_type_mastery
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "coaching_type_mastery_admin_all" ON coaching_type_mastery
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- coaching_persona_settings: 본인만
CREATE POLICY "coaching_persona_settings_owner_all" ON coaching_persona_settings
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- 8. Storage 버킷 (음성 파일)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('coaching-recordings', 'coaching-recordings', false, 10485760, ARRAY['audio/webm', 'audio/wav', 'audio/mp4', 'audio/mpeg'])
ON CONFLICT (id) DO NOTHING;

-- Storage 정책 (본인 폴더만)
CREATE POLICY "coaching_recordings_owner_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'coaching-recordings'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "coaching_recordings_owner_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'coaching-recordings'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "coaching_recordings_admin_all" ON storage.objects
  FOR ALL USING (
    bucket_id = 'coaching-recordings'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- ============================================================
-- 9. 시드 데이터 — 기본 페르소나 (admin 본인용)
-- ============================================================
-- 본인 등록 시 자동으로 stoic_coach 설정 (선택사항, SA에서 처리해도 OK)
