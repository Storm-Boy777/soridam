-- ============================================================
-- 020_mock_test_v2.sql
-- 모의고사 평가 v2 전용 테이블
-- v1 테이블 일절 수정하지 않음 (완전 분리)
-- ============================================================

-- ── mock_test_evaluations_v2: v2 문항별 평가 결과 ──
CREATE TABLE IF NOT EXISTS mock_test_evaluations_v2 (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id    text NOT NULL REFERENCES mock_test_sessions(session_id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_number int NOT NULL,
  question_id   text NOT NULL,
  question_type text NOT NULL,
  target_grade  text NOT NULL,

  -- GPT 평가 결과 (Structured Outputs)
  fulfillment   text NOT NULL CHECK (fulfillment IN ('fulfilled', 'partial', 'unfulfilled', 'skipped')),
  task_checklist jsonb NOT NULL DEFAULT '[]',    -- [{item, pass, evidence}]
  observation   text NOT NULL DEFAULT '',
  directions    jsonb NOT NULL DEFAULT '[]',     -- string[]
  weak_points   jsonb NOT NULL DEFAULT '[]',     -- [{code, severity, reason, evidence}]

  -- 메타
  model         text NOT NULL DEFAULT 'gpt-4.1-mini',
  tokens_used   int NOT NULL DEFAULT 0,
  processing_time_ms int NOT NULL DEFAULT 0,
  skipped_by_preprocess boolean NOT NULL DEFAULT false,
  evaluated_at  timestamptz NOT NULL DEFAULT now(),

  -- 복합 유니크: 한 세션에서 같은 문항은 1개만
  UNIQUE (session_id, question_number)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_eval_v2_session ON mock_test_evaluations_v2(session_id);
CREATE INDEX IF NOT EXISTS idx_eval_v2_user ON mock_test_evaluations_v2(user_id);

-- RLS
ALTER TABLE mock_test_evaluations_v2 ENABLE ROW LEVEL SECURITY;

-- 정책: 본인 조회
CREATE POLICY "eval_v2_select_own" ON mock_test_evaluations_v2
  FOR SELECT USING (auth.uid() = user_id);

-- 정책: service_role만 INSERT/UPDATE/DELETE (EF에서 사용)
CREATE POLICY "eval_v2_service_insert" ON mock_test_evaluations_v2
  FOR INSERT WITH CHECK (
    current_setting('role') = 'service_role'
    OR auth.uid() = user_id
  );

CREATE POLICY "eval_v2_service_delete" ON mock_test_evaluations_v2
  FOR DELETE USING (
    current_setting('role') = 'service_role'
    OR auth.uid() = user_id
  );

-- 관리자 전체 조회
CREATE POLICY "eval_v2_admin_select" ON mock_test_evaluations_v2
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data->>'role') = 'admin'
    )
  );

-- ── evaluation_prompts에 v2 프롬프트 키 등록 ──
INSERT INTO evaluation_prompts (key, content, is_active)
VALUES ('eval_v2_system', '{{PLACEHOLDER}}', false)
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE mock_test_evaluations_v2 IS 'v2 문항별 평가 결과 — v1과 완전 분리, Structured Outputs 기반';
