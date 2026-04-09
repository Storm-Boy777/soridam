-- ============================================================
-- 042: shadowing_evaluations 확장 — 실전 말하기 (미니 모의고사) 평가 지원
-- ============================================================
-- 기존 5영역 점수 체계에 모의고사 consult 스타일 평가 컬럼 추가
-- 새 EF(shadowing-speak-eval)가 STT + 발음 + consult 결과를 저장

-- 1. 평가 상태 (폴링용)
ALTER TABLE shadowing_evaluations
  ADD COLUMN IF NOT EXISTS eval_status TEXT NOT NULL DEFAULT 'pending';

COMMENT ON COLUMN shadowing_evaluations.eval_status IS 'pending → processing → completed → failed';

-- 2. STT/발음 상세
ALTER TABLE shadowing_evaluations
  ADD COLUMN IF NOT EXISTS wpm INTEGER,
  ADD COLUMN IF NOT EXISTS filler_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pronunciation_assessment JSONB;

-- 3. consult 스타일 평가 결과
ALTER TABLE shadowing_evaluations
  ADD COLUMN IF NOT EXISTS fulfillment TEXT,
  ADD COLUMN IF NOT EXISTS task_checklist JSONB,
  ADD COLUMN IF NOT EXISTS observation TEXT,
  ADD COLUMN IF NOT EXISTS directions TEXT[],
  ADD COLUMN IF NOT EXISTS weak_points JSONB;

COMMENT ON COLUMN shadowing_evaluations.fulfillment IS '과제 충족도: full/partial/none';
COMMENT ON COLUMN shadowing_evaluations.task_checklist IS '[{item, passed, evidence}] 과제 수행 체크리스트';
COMMENT ON COLUMN shadowing_evaluations.observation IS '평가 관찰 소견 (한국어)';
COMMENT ON COLUMN shadowing_evaluations.directions IS '개선 방향 배열 (한국어)';
COMMENT ON COLUMN shadowing_evaluations.weak_points IS '[{code, severity, reason, evidence}] 약점 분석';

-- 4. 음성 파일 URL (Supabase Storage)
ALTER TABLE shadowing_evaluations
  ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- 5. transcript NOT NULL 제약 완화 (eval_status=pending 시점에는 아직 STT 안 됨)
ALTER TABLE shadowing_evaluations
  ALTER COLUMN transcript DROP NOT NULL;

-- 6. eval_status 인덱스 (폴링 쿼리 최적화)
CREATE INDEX IF NOT EXISTS idx_shadowing_eval_status
  ON shadowing_evaluations(session_id, eval_status);

-- 7. service_role INSERT 정책 (EF에서 직접 저장)
CREATE POLICY "shadowing_evaluations_service_insert"
  ON shadowing_evaluations FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "shadowing_evaluations_service_update"
  ON shadowing_evaluations FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
