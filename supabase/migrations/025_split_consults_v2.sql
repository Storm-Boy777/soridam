-- 025: evaluations_v2 / consults_v2 테이블 분리
-- evaluations_v2 = 체크박스 전용 (eval-v2 EF)
-- consults_v2 = 소견 전용 (consult-v2 EF)

-- 1. consult 전용 테이블 생성
CREATE TABLE IF NOT EXISTS mock_test_consults_v2 (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  question_number int NOT NULL,
  question_id text NOT NULL,
  question_type text NOT NULL,
  target_grade text NOT NULL,
  fulfillment text NOT NULL CHECK (fulfillment IN ('fulfilled', 'partial', 'unfulfilled', 'skipped')),
  task_checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  observation text NOT NULL DEFAULT '',
  directions jsonb NOT NULL DEFAULT '[]'::jsonb,
  weak_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  model text NOT NULL DEFAULT 'gpt-4.1',
  tokens_used int NOT NULL DEFAULT 0,
  processing_time_ms int NOT NULL DEFAULT 0,
  skipped_by_preprocess boolean NOT NULL DEFAULT false,
  evaluated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, question_number)
);

-- 2. evaluations_v2에서 소견 컬럼 제거 (체크박스 전용)
ALTER TABLE mock_test_evaluations_v2 DROP COLUMN IF EXISTS fulfillment;
ALTER TABLE mock_test_evaluations_v2 DROP COLUMN IF EXISTS task_checklist;
ALTER TABLE mock_test_evaluations_v2 DROP COLUMN IF EXISTS observation;
ALTER TABLE mock_test_evaluations_v2 DROP COLUMN IF EXISTS directions;
ALTER TABLE mock_test_evaluations_v2 DROP COLUMN IF EXISTS weak_points;

-- 3. RLS
ALTER TABLE mock_test_consults_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_full_access_consults ON mock_test_consults_v2
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY user_select_own_consults ON mock_test_consults_v2
  FOR SELECT USING (auth.uid() = user_id);
