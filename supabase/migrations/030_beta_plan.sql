-- 030_beta_plan.sql
-- 오픈 베타 플랜: 100명 한정, 2026-04-30 만료

-- ══════════════════════════════════════════
-- 1. beta_applications 테이블
-- ══════════════════════════════════════════

CREATE TABLE beta_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kakao_nickname TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  rejected_reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT beta_one_per_user UNIQUE (user_id)
);

COMMENT ON TABLE beta_applications IS '오픈 베타 신청 테이블 (100명 한정, 2026-04)';

-- updated_at 자동 갱신 트리거
CREATE TRIGGER set_beta_applications_updated_at
  BEFORE UPDATE ON beta_applications
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- 인덱스: 상태별 조회 최적화
CREATE INDEX idx_beta_applications_status ON beta_applications(status);

-- ══════════════════════════════════════════
-- 2. RLS 정책
-- ══════════════════════════════════════════

ALTER TABLE beta_applications ENABLE ROW LEVEL SECURITY;

-- 본인 조회
CREATE POLICY "beta_select_own" ON beta_applications
  FOR SELECT USING (auth.uid() = user_id);

-- 본인 신청 (INSERT)
CREATE POLICY "beta_insert_own" ON beta_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ══════════════════════════════════════════
-- 3. approve_beta_application RPC
--    원자적: 100명 검증 + 상태 변경 + 크레딧 지급
-- ══════════════════════════════════════════

CREATE OR REPLACE FUNCTION approve_beta_application(
  p_application_id UUID,
  p_admin_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_current_count INTEGER;
  v_max_beta INTEGER := 100;
  v_beta_expires TIMESTAMPTZ := '2026-04-30 23:59:59+09'::TIMESTAMPTZ;
BEGIN
  -- 1. 신청 레코드 조회 + 잠금
  SELECT user_id INTO v_user_id
  FROM beta_applications
  WHERE id = p_application_id AND status = 'pending'
  FOR UPDATE;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', '유효하지 않은 신청이거나 이미 처리되었습니다');
  END IF;

  -- 2. 현재 승인 수 확인
  SELECT COUNT(*) INTO v_current_count
  FROM beta_applications
  WHERE status = 'approved';

  IF v_current_count >= v_max_beta THEN
    RETURN jsonb_build_object('success', false, 'error', '베타 정원(100명)이 마감되었습니다');
  END IF;

  -- 3. 신청 상태 업데이트
  UPDATE beta_applications
  SET status = 'approved',
      reviewed_by = p_admin_id,
      reviewed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_application_id;

  -- 4. 크레딧 지급 (실전 플랜 동일: 모의고사 3, 스크립트 15, 튜터링 0)
  UPDATE user_credits
  SET current_plan = 'beta',
      plan_mock_exam_credits = 3,
      plan_script_credits = 15,
      plan_tutoring_credits = 0,
      plan_expires_at = v_beta_expires,
      updated_at = NOW()
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id::text,
    'remaining', v_max_beta - v_current_count - 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════
-- 4. get_beta_stats RPC
-- ══════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_beta_stats()
RETURNS JSONB AS $$
DECLARE
  v_total INTEGER;
  v_approved INTEGER;
  v_pending INTEGER;
  v_rejected INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total FROM beta_applications;
  SELECT COUNT(*) INTO v_approved FROM beta_applications WHERE status = 'approved';
  SELECT COUNT(*) INTO v_pending FROM beta_applications WHERE status = 'pending';
  SELECT COUNT(*) INTO v_rejected FROM beta_applications WHERE status = 'rejected';

  RETURN jsonb_build_object(
    'total', v_total,
    'approved', v_approved,
    'pending', v_pending,
    'rejected', v_rejected,
    'remaining', 100 - v_approved
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════
-- 5. expire_beta_plans 함수 (수동 실행용)
--    5/1 이후 관리자가 수동으로 SELECT expire_beta_plans() 실행
-- ══════════════════════════════════════════

CREATE OR REPLACE FUNCTION expire_beta_plans()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE user_credits
  SET current_plan = 'free',
      plan_mock_exam_credits = 0,
      plan_script_credits = 0,
      plan_tutoring_credits = 0,
      plan_expires_at = NULL,
      updated_at = NOW()
  WHERE current_plan = 'beta'
    AND (plan_expires_at IS NULL OR plan_expires_at < NOW());

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
