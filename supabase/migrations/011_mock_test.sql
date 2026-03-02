-- ============================================================
-- 011_mock_test.sql
-- 오픽톡닥 Step 3: 모의고사 모듈
-- 6테이블 + submissions ALTER + RLS + 인덱스 + RPC + Storage
-- 생성일: 2026-03-02
-- 의사결정: F-1 ~ F-17 (docs/의사결정.md)
-- 설계: docs/설계/모의고사.md
-- ============================================================

-- ============================================================
-- 1. submissions 테이블 변경 (기출 승인 시스템, F-1)
-- ============================================================

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS exam_approved TEXT DEFAULT 'pending'
    CHECK (exam_approved IN ('pending','approved','rejected')),
  ADD COLUMN IF NOT EXISTS exam_approved_at TIMESTAMPTZ;

-- 승인된 기출만 빠르게 조회
CREATE INDEX IF NOT EXISTS idx_submissions_exam_approved
  ON submissions(exam_approved)
  WHERE status = 'complete';

-- ============================================================
-- 2. mock_test_sessions (세션 관리)
-- ============================================================

CREATE TABLE mock_test_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        TEXT UNIQUE NOT NULL,          -- 'mt_xxxxxxxx' 형식
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_id     INTEGER NOT NULL REFERENCES submissions(id),  -- F-1: 기출 세트 원본
  mode              TEXT NOT NULL CHECK (mode IN ('training','test')),  -- F-5: 2모드
  status            TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','completed','expired')),
  question_ids      TEXT[] NOT NULL,               -- Q2~Q15 question_id 배열 (14개)
  current_question  SMALLINT DEFAULT 1,
  total_questions   SMALLINT DEFAULT 15,
  holistic_status   TEXT DEFAULT 'pending'
                    CHECK (holistic_status IN ('pending','processing','completed','failed')),
  report_retry_count SMALLINT DEFAULT 0,           -- 최대 3회 재시도
  report_error      TEXT,
  started_at        TIMESTAMPTZ DEFAULT NOW(),
  completed_at      TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ NOT NULL            -- training: +72h, test: +90m (40분은 프론트 타이머)
);

-- 인덱스
CREATE INDEX idx_mock_sessions_user_status ON mock_test_sessions(user_id, status);
CREATE INDEX idx_mock_sessions_expires_at ON mock_test_sessions(expires_at);
CREATE INDEX idx_mock_sessions_submission ON mock_test_sessions(submission_id);

-- updated_at 없음 (세션은 상태 변경만 추적)

-- RLS
ALTER TABLE mock_test_sessions ENABLE ROW LEVEL SECURITY;

-- 본인 세션만 조회
CREATE POLICY "mock_sessions_select_own"
  ON mock_test_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- 본인 세션만 생성
CREATE POLICY "mock_sessions_insert_own"
  ON mock_test_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 본인 세션만 수정 (상태 변경)
CREATE POLICY "mock_sessions_update_own"
  ON mock_test_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- 3. mock_test_answers (답변 + 평가 큐 통합)
-- ============================================================

CREATE TABLE mock_test_answers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        TEXT NOT NULL REFERENCES mock_test_sessions(session_id) ON DELETE CASCADE,
  question_number   SMALLINT NOT NULL,             -- 1~15
  question_id       TEXT,                           -- Q1은 NULL 가능 (시스템 질문)
  audio_url         TEXT,
  audio_duration    NUMERIC(8,2),
  transcript        TEXT,
  word_count        INTEGER,
  filler_word_count INTEGER DEFAULT 0,
  long_pause_count  INTEGER DEFAULT 0,
  pronunciation_assessment JSONB,                  -- Azure Speech SDK 결과
  eval_status       TEXT DEFAULT 'pending'
                    CHECK (eval_status IN ('pending','processing','stt_completed',
                           'evaluating','completed','failed','skipped')),
  eval_retry_count  SMALLINT DEFAULT 0,
  eval_error        TEXT,
  skipped           BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, question_number)
);

-- 인덱스
CREATE INDEX idx_mock_answers_session ON mock_test_answers(session_id);
CREATE INDEX idx_mock_answers_eval_status ON mock_test_answers(eval_status)
  WHERE eval_status != 'completed' AND eval_status != 'skipped';

-- RLS (서비스 키로 EF 접근, 클라이언트는 세션 조인으로 간접 접근)
ALTER TABLE mock_test_answers ENABLE ROW LEVEL SECURITY;

-- 본인 세션의 답변만 조회 (서브쿼리)
CREATE POLICY "mock_answers_select_own"
  ON mock_test_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM mock_test_sessions s
      WHERE s.session_id = mock_test_answers.session_id
        AND s.user_id = auth.uid()
    )
  );

-- 본인 세션에만 답변 삽입
CREATE POLICY "mock_answers_insert_own"
  ON mock_test_answers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mock_test_sessions s
      WHERE s.session_id = mock_test_answers.session_id
        AND s.user_id = auth.uid()
    )
  );

-- 본인 세션 답변만 수정 (EF 업데이트는 service_role)
CREATE POLICY "mock_answers_update_own"
  ON mock_test_answers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM mock_test_sessions s
      WHERE s.session_id = mock_test_answers.session_id
        AND s.user_id = auth.uid()
    )
  );

-- ============================================================
-- 4. mock_test_evaluations (개별 문항 평가, F-12)
-- ============================================================

CREATE TABLE mock_test_evaluations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        TEXT NOT NULL,
  user_id           UUID NOT NULL REFERENCES auth.users(id),
  question_number   SMALLINT NOT NULL,             -- 2~15 (Q1 제외)
  question_id       TEXT NOT NULL,
  question_type     TEXT NOT NULL,                 -- question_type_eng (10종 → 8프롬프트 그룹)
  -- 체크박스 평가
  checkbox_type     TEXT CHECK (checkbox_type IN ('INT','ADV','AL')),
  checkbox_count    SMALLINT,
  checkboxes        JSONB,                         -- {체크박스ID: {pass, evidence}}
  pass_count        SMALLINT,
  fail_count        SMALLINT,
  pass_rate         NUMERIC(5,4),
  -- 교정 + 분석
  sentences         JSONB,
  corrections       JSONB,                         -- eval_only에서도 문장별 교정 포함
  deep_analysis     JSONB,                         -- 5섹션: overall/linguistic/communicative/gap/recommendation
  -- 음성 분석 데이터
  transcript        TEXT,
  wpm               NUMERIC(6,2),
  audio_duration    NUMERIC(8,2),
  filler_count      SMALLINT,
  long_pause_count  SMALLINT,
  pronunciation_assessment JSONB,
  -- 메타
  model             TEXT,
  prompt_version    TEXT DEFAULT 'v1.0',
  tokens_used       INTEGER,
  processing_time_ms INTEGER,
  skipped           BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, question_number)
);

-- 인덱스
CREATE INDEX idx_mock_evals_session ON mock_test_evaluations(session_id);
CREATE INDEX idx_mock_evals_user ON mock_test_evaluations(user_id);

-- RLS
ALTER TABLE mock_test_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mock_evals_select_own"
  ON mock_test_evaluations FOR SELECT
  USING (auth.uid() = user_id);

-- EF가 service_role로 INSERT하므로 클라이언트 INSERT 불필요
-- service_role은 RLS 우회

-- ============================================================
-- 5. mock_test_reports (종합 평가 + FACT 점수)
-- ============================================================

CREATE TABLE mock_test_reports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        TEXT UNIQUE NOT NULL,
  user_id           UUID NOT NULL REFERENCES auth.users(id),
  -- 규칙 엔진 결과
  final_level       TEXT,                          -- NH|IL|IM1|IM2|IM3|IH|AL
  floor_status      TEXT,
  floor_level       TEXT,
  ceiling_status    TEXT,
  sympathetic_listener TEXT,
  -- 체크박스 집계
  int_pass_rate     NUMERIC(5,4),
  adv_pass_rate     NUMERIC(5,4),
  al_pass_rate      NUMERIC(5,4),
  valid_question_count SMALLINT,
  aggregated_int_checkboxes JSONB,
  aggregated_adv_checkboxes JSONB,
  aggregated_al_checkboxes  JSONB,
  al_judgment       TEXT,
  q12_gatekeeper    TEXT,
  skipped_questions JSONB,
  -- 상태 관리
  rule_engine_status TEXT DEFAULT 'pending'
                    CHECK (rule_engine_status IN ('pending','completed','failed')),
  report_status     TEXT DEFAULT 'pending'
                    CHECK (report_status IN ('pending','processing','completed','failed')),
  -- FACT 점수
  score_f           NUMERIC(4,1),
  score_a           NUMERIC(4,1),
  score_c           NUMERIC(4,1),
  score_t           NUMERIC(4,1),
  total_score       NUMERIC(5,1),                  -- (F+A+C+T) * 2.5 = 100점 만점
  -- 리포트 피드백
  overall_comments_en TEXT,
  overall_comments_ko TEXT,
  int_performance     JSONB,
  adv_performance     JSONB,
  comprehensive_feedback TEXT,
  training_recommendations JSONB,
  -- 발음 통계
  avg_accuracy_score  NUMERIC(5,1),
  avg_prosody_score   NUMERIC(5,1),
  avg_fluency_score   NUMERIC(5,1),
  -- 메타데이터
  target_level      TEXT,
  test_date         DATE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_mock_reports_user ON mock_test_reports(user_id);

-- updated_at 트리거
CREATE TRIGGER trigger_mock_reports_updated_at
  BEFORE UPDATE ON mock_test_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE mock_test_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mock_reports_select_own"
  ON mock_test_reports FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- 6. mock_test_eval_settings (관리자 설정 — 단일 행, F-12)
-- ============================================================

CREATE TABLE mock_test_eval_settings (
  id                INTEGER PRIMARY KEY DEFAULT 1,
  model_name        TEXT DEFAULT 'gpt-4.1',
  temperature       NUMERIC(3,2) DEFAULT 0.30,
  max_tokens        INTEGER DEFAULT 10000,
  retry_count       INTEGER DEFAULT 2,
  -- question_type별 활성화 토글 (F-15 네이밍)
  enabled_description       BOOLEAN DEFAULT true,
  enabled_routine           BOOLEAN DEFAULT true,
  enabled_asking_questions  BOOLEAN DEFAULT true,   -- 소리담: enabled_roleplay_11
  enabled_comparison        BOOLEAN DEFAULT true,
  enabled_past_experience   BOOLEAN DEFAULT true,   -- 경험 3종 공통
  enabled_suggest_alternatives BOOLEAN DEFAULT true, -- 소리담: enabled_roleplay_12
  enabled_comparison_change BOOLEAN DEFAULT true,    -- 소리담: enabled_advanced_14
  enabled_social_issue      BOOLEAN DEFAULT true,    -- 소리담: enabled_advanced_15
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- updated_at 트리거
CREATE TRIGGER trigger_mock_eval_settings_updated_at
  BEFORE UPDATE ON mock_test_eval_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS: 전체 읽기 가능 (관리 설정은 공개)
ALTER TABLE mock_test_eval_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mock_eval_settings_read"
  ON mock_test_eval_settings FOR SELECT
  USING (true);

-- 초기 데이터 (단일 행)
INSERT INTO mock_test_eval_settings (id) VALUES (1);

-- ============================================================
-- 7. evaluation_prompts (평가 프롬프트 — F-16)
-- ============================================================

CREATE TABLE evaluation_prompts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key               TEXT UNIQUE NOT NULL,          -- 'eval_description', 'eval_comprehensive' 등
  content           TEXT NOT NULL,                  -- 프롬프트 본문 ({transcript}, {question_english} 등 변수)
  description       TEXT,                           -- 관리용 설명
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- updated_at 트리거
CREATE TRIGGER trigger_eval_prompts_updated_at
  BEFORE UPDATE ON evaluation_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS: 전체 읽기 (EF에서 조회)
ALTER TABLE evaluation_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eval_prompts_read"
  ON evaluation_prompts FOR SELECT
  USING (true);

-- 프롬프트 시드 데이터 (9행 — 본문은 Phase C에서 UPDATE)
INSERT INTO evaluation_prompts (key, content, description) VALUES
  ('eval_description', '{{PLACEHOLDER}}', '묘사 개별 평가 프롬프트'),
  ('eval_routine', '{{PLACEHOLDER}}', '루틴 개별 평가 프롬프트'),
  ('eval_asking_questions', '{{PLACEHOLDER}}', '질문하기 개별 평가 프롬프트'),
  ('eval_comparison', '{{PLACEHOLDER}}', '비교 개별 평가 프롬프트'),
  ('eval_past_experience', '{{PLACEHOLDER}}', '경험 3종 공유 개별 평가 프롬프트'),
  ('eval_suggest_alternatives', '{{PLACEHOLDER}}', '대안제시 개별 평가 프롬프트'),
  ('eval_comparison_change', '{{PLACEHOLDER}}', '비교변화 개별 평가 프롬프트'),
  ('eval_social_issue', '{{PLACEHOLDER}}', '사회적이슈 개별 평가 프롬프트'),
  ('eval_comprehensive', '{{PLACEHOLDER}}', '종합 리포트 프롬프트');

-- ============================================================
-- 8. RPC 함수: 모의고사 크레딧 차감/환불 (F-5)
-- ============================================================

-- 크레딧 차감 (플랜 → 횟수권 순서)
CREATE OR REPLACE FUNCTION consume_mock_exam_credit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_plan_credits INTEGER;
  v_credits INTEGER;
BEGIN
  SELECT plan_mock_exam_credits, mock_exam_credits
  INTO v_plan_credits, v_credits
  FROM user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- 플랜 크레딧 먼저 차감 (만료분 우선)
  IF v_plan_credits > 0 THEN
    UPDATE user_credits
    SET plan_mock_exam_credits = plan_mock_exam_credits - 1,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    RETURN true;
  END IF;

  -- 횟수권 크레딧 차감 (영구)
  IF v_credits > 0 THEN
    UPDATE user_credits
    SET mock_exam_credits = mock_exam_credits - 1,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    RETURN true;
  END IF;

  -- 크레딧 부족
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 크레딧 환불 (시스템 오류 시만, F-5)
CREATE OR REPLACE FUNCTION refund_mock_exam_credit(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- 횟수권 크레딧으로 환불 (영구)
  UPDATE user_credits
  SET mock_exam_credits = mock_exam_credits + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 9. Storage 버킷: mock-test-recordings (F-13)
-- ============================================================

-- 주의: Supabase Storage 버킷은 SQL로 생성 불가
-- Dashboard 또는 API로 생성 필요:
-- 버킷명: mock-test-recordings
-- 공개 읽기: true (오디오 URL 직접 접근)
-- 인증 업로드: true
-- 파일 크기 제한: 10MB
-- 허용 MIME: audio/wav, audio/webm, audio/mpeg
-- 경로 패턴: {userId}/{sessionId}/Q{n}_{timestamp}.wav

-- ============================================================
-- 완료
-- ============================================================
