-- ============================================================
-- 016_tutoring_credits.sql
-- 튜터링 크레딧 시스템: 컬럼 추가 + consume/refund RPC
-- 패턴 참조: 011_mock_test.sql (모의고사 크레딧)
-- 생성일: 2026-03-15
-- ============================================================

-- 1. user_credits에 튜터링 크레딧 컬럼 추가
ALTER TABLE user_credits
  ADD COLUMN IF NOT EXISTS plan_tutoring_credits INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tutoring_credits INTEGER NOT NULL DEFAULT 0;

-- 2. 크레딧 차감 RPC (플랜 → 횟수권 순서)
CREATE OR REPLACE FUNCTION consume_tutoring_credit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_plan_credits INTEGER;
  v_credits INTEGER;
BEGIN
  SELECT plan_tutoring_credits, tutoring_credits
  INTO v_plan_credits, v_credits
  FROM user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- 플랜 크레딧 먼저 차감 (만료분 우선)
  IF v_plan_credits > 0 THEN
    UPDATE user_credits
    SET plan_tutoring_credits = plan_tutoring_credits - 1,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    RETURN true;
  END IF;

  -- 횟수권 크레딧 차감 (영구)
  IF v_credits > 0 THEN
    UPDATE user_credits
    SET tutoring_credits = tutoring_credits - 1,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    RETURN true;
  END IF;

  -- 크레딧 부족
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 크레딧 환불 RPC (시스템 오류 시만)
CREATE OR REPLACE FUNCTION refund_tutoring_credit(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- 횟수권 크레딧으로 환불 (영구)
  UPDATE user_credits
  SET tutoring_credits = tutoring_credits + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. process_payment RPC 수정: p_tutoring_credits 파라미터 추가
CREATE OR REPLACE FUNCTION process_payment(
  p_user_id UUID,
  p_payment_id TEXT,
  p_product_id TEXT,
  p_order_name TEXT,
  p_amount INTEGER,
  p_pg_provider TEXT DEFAULT NULL,
  p_pg_tx_id TEXT DEFAULT NULL,
  p_pay_method TEXT DEFAULT NULL,
  p_paid_at TIMESTAMPTZ DEFAULT NULL,
  p_receipt_url TEXT DEFAULT NULL,
  p_is_plan BOOLEAN DEFAULT FALSE,
  p_plan TEXT DEFAULT 'free',
  p_plan_months INTEGER DEFAULT 0,
  p_mock_exam_credits INTEGER DEFAULT 0,
  p_script_credits INTEGER DEFAULT 0,
  p_tutoring_credits INTEGER DEFAULT 0
) RETURNS JSONB AS $$
DECLARE
  v_order_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- 원자적 INSERT (UNIQUE INDEX idx_orders_payment_id로 중복 방지)
  INSERT INTO orders (
    user_id, product_id, order_name, amount, status,
    payment_id, pg_provider, pg_tx_id, pay_method, paid_at, receipt_url
  ) VALUES (
    p_user_id, p_product_id, p_order_name, p_amount, 'paid',
    p_payment_id, p_pg_provider, p_pg_tx_id, p_pay_method,
    COALESCE(p_paid_at, NOW()), p_receipt_url
  )
  ON CONFLICT (payment_id) DO NOTHING
  RETURNING id INTO v_order_id;

  -- 이미 처리된 결제면 크레딧 지급 건너뛰기 (멱등성)
  IF v_order_id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'duplicate', true);
  END IF;

  -- 크레딧 지급
  IF p_is_plan THEN
    -- 플랜 상품: 플랜 크레딧 설정 + 만료일 설정
    v_expires_at := NOW() + (p_plan_months || ' months')::INTERVAL;
    UPDATE user_credits SET
      current_plan = p_plan,
      plan_mock_exam_credits = p_mock_exam_credits,
      plan_script_credits = p_script_credits,
      plan_tutoring_credits = p_tutoring_credits,
      plan_expires_at = v_expires_at,
      updated_at = NOW()
    WHERE user_id = p_user_id;
  ELSE
    -- 횟수권: 영구 크레딧 누적
    UPDATE user_credits SET
      mock_exam_credits = mock_exam_credits + p_mock_exam_credits,
      script_credits = script_credits + p_script_credits,
      tutoring_credits = tutoring_credits + p_tutoring_credits,
      updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'order_id', v_order_id::text);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 완료
-- ============================================================
