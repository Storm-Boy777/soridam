-- 033_polar_tables.sql
-- Polar 결제 시스템 전용 테이블 + RPC 함수
-- 기존 orders / user_credits는 레거시로 유지

-- ============================================================
-- 1. polar_orders — Polar 결제 기록
-- ============================================================
CREATE TABLE IF NOT EXISTS polar_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  polar_checkout_id TEXT NOT NULL,
  polar_product_id TEXT,
  product_type TEXT NOT NULL CHECK (product_type IN ('credit', 'credit_sponsor', 'sponsor')),
  amount INTEGER NOT NULL,          -- 결제 금액 (원)
  credit_amount INTEGER NOT NULL DEFAULT 0,  -- 지급 크레딧 (원, 후원은 0)
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'refunded')),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_polar_orders_checkout_id
  ON polar_orders(polar_checkout_id);
CREATE INDEX IF NOT EXISTS idx_polar_orders_user_id
  ON polar_orders(user_id);

ALTER TABLE polar_orders ENABLE ROW LEVEL SECURITY;

-- 본인 주문만 조회
CREATE POLICY "polar_orders_select_own"
  ON polar_orders FOR SELECT
  USING (auth.uid() = user_id);

COMMENT ON TABLE polar_orders IS 'Polar 결제 기록';

-- ============================================================
-- 2. polar_balances — 크레딧 잔액
-- ============================================================
CREATE TABLE IF NOT EXISTS polar_balances (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance_krw INTEGER NOT NULL DEFAULT 0,       -- 현재 잔액 (원)
  total_charged INTEGER NOT NULL DEFAULT 0,     -- 누적 충전액
  total_used INTEGER NOT NULL DEFAULT 0,        -- 누적 사용액
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE polar_balances ENABLE ROW LEVEL SECURITY;

-- 본인 잔액만 조회
CREATE POLICY "polar_balances_select_own"
  ON polar_balances FOR SELECT
  USING (auth.uid() = user_id);

COMMENT ON TABLE polar_balances IS '크레딧 잔액 (Polar)';

-- ============================================================
-- 3. polar_transactions — 충전/차감 이력
-- ============================================================
CREATE TABLE IF NOT EXISTS polar_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('charge', 'usage', 'refund', 'admin_adjust')),
  amount INTEGER NOT NULL,            -- 변동 금액 (양수: 충전, 음수: 차감)
  balance_after INTEGER NOT NULL,     -- 변동 후 잔액
  description TEXT NOT NULL,          -- '크레딧 충전', '모의고사 사용' 등
  ref_id TEXT,                        -- 관련 ID (polar_checkout_id, session_id 등)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_polar_transactions_user_id
  ON polar_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_polar_transactions_created_at
  ON polar_transactions(created_at DESC);

ALTER TABLE polar_transactions ENABLE ROW LEVEL SECURITY;

-- 본인 이력만 조회
CREATE POLICY "polar_transactions_select_own"
  ON polar_transactions FOR SELECT
  USING (auth.uid() = user_id);

COMMENT ON TABLE polar_transactions IS '크레딧 변동 이력 (충전/사용/환불/관리자조정)';

-- ============================================================
-- 4. 회원가입 시 polar_balances 자동 생성 트리거
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user_polar_balance()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO polar_balances (user_id, balance_krw, total_charged, total_used)
  VALUES (NEW.id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 기존 사용자 트리거와 별도로 추가
DROP TRIGGER IF EXISTS on_auth_user_created_polar_balance ON auth.users;
CREATE TRIGGER on_auth_user_created_polar_balance
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_polar_balance();

-- 기존 사용자 잔액 행 생성 (없는 경우)
INSERT INTO polar_balances (user_id, balance_krw, total_charged, total_used)
SELECT id, 0, 0, 0
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM polar_balances)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- 5. RPC: 크레딧 충전 (Polar webhook에서 호출)
-- ============================================================
CREATE OR REPLACE FUNCTION polar_charge_balance(
  p_user_id UUID,
  p_amount_krw INTEGER,
  p_description TEXT DEFAULT '크레딧 충전',
  p_ref_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  -- 잔액 충전
  UPDATE polar_balances
  SET balance_krw = balance_krw + p_amount_krw,
      total_charged = total_charged + p_amount_krw,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance_krw INTO v_new_balance;

  IF NOT FOUND THEN
    -- 행이 없으면 생성
    INSERT INTO polar_balances (user_id, balance_krw, total_charged, total_used)
    VALUES (p_user_id, p_amount_krw, p_amount_krw, 0)
    RETURNING balance_krw INTO v_new_balance;
  END IF;

  -- 이력 기록
  INSERT INTO polar_transactions (user_id, type, amount, balance_after, description, ref_id)
  VALUES (p_user_id, 'charge', p_amount_krw, v_new_balance, p_description, p_ref_id);

  RETURN jsonb_build_object('success', true, 'balance', v_new_balance);
END;
$$;

-- ============================================================
-- 6. RPC: 크레딧 차감 (모의고사/스크립트/튜터링 사용 시)
-- ============================================================
CREATE OR REPLACE FUNCTION polar_deduct_balance(
  p_user_id UUID,
  p_cost_krw INTEGER,
  p_description TEXT DEFAULT '크레딧 사용',
  p_ref_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- 현재 잔액 조회 (FOR UPDATE 락)
  SELECT balance_krw INTO v_current_balance
  FROM polar_balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_balance', 'balance', 0);
  END IF;

  -- 잔액 부족
  IF v_current_balance < p_cost_krw THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient', 'balance', v_current_balance);
  END IF;

  -- 차감
  v_new_balance := v_current_balance - p_cost_krw;
  UPDATE polar_balances
  SET balance_krw = v_new_balance,
      total_used = total_used + p_cost_krw,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- 이력 기록
  INSERT INTO polar_transactions (user_id, type, amount, balance_after, description, ref_id)
  VALUES (p_user_id, 'usage', -p_cost_krw, v_new_balance, p_description, p_ref_id);

  RETURN jsonb_build_object('success', true, 'balance', v_new_balance);
END;
$$;

-- ============================================================
-- 7. RPC: 크레딧 환불 (API 에러 시)
-- ============================================================
CREATE OR REPLACE FUNCTION polar_refund_balance(
  p_user_id UUID,
  p_amount_krw INTEGER,
  p_description TEXT DEFAULT '크레딧 환불',
  p_ref_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  UPDATE polar_balances
  SET balance_krw = balance_krw + p_amount_krw,
      total_used = GREATEST(total_used - p_amount_krw, 0),
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance_krw INTO v_new_balance;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_balance');
  END IF;

  -- 이력 기록
  INSERT INTO polar_transactions (user_id, type, amount, balance_after, description, ref_id)
  VALUES (p_user_id, 'refund', p_amount_krw, v_new_balance, p_description, p_ref_id);

  RETURN jsonb_build_object('success', true, 'balance', v_new_balance);
END;
$$;

-- ============================================================
-- 8. RPC: 잔액 조회
-- ============================================================
CREATE OR REPLACE FUNCTION polar_get_balance(p_user_id UUID)
RETURNS INTEGER
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(balance_krw, 0)
  FROM polar_balances
  WHERE user_id = p_user_id;
$$;

-- ============================================================
-- 9. RPC: Polar 결제 처리 (원자적 — 주문 기록 + 충전)
-- ============================================================
CREATE OR REPLACE FUNCTION process_polar_payment(
  p_user_id UUID,
  p_polar_checkout_id TEXT,
  p_polar_product_id TEXT,
  p_product_type TEXT,
  p_amount INTEGER,
  p_credit_amount INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_new_balance INTEGER;
BEGIN
  -- 멱등성: polar_checkout_id 중복 방지
  INSERT INTO polar_orders (
    user_id, polar_checkout_id, polar_product_id,
    product_type, amount, credit_amount, status
  ) VALUES (
    p_user_id, p_polar_checkout_id, p_polar_product_id,
    p_product_type, p_amount, p_credit_amount, 'paid'
  )
  ON CONFLICT (polar_checkout_id) DO NOTHING
  RETURNING id INTO v_order_id;

  -- 이미 처리된 결제
  IF v_order_id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'duplicate', true);
  END IF;

  -- 크레딧 지급 (후원만 상품은 0)
  IF p_credit_amount > 0 THEN
    SELECT (polar_charge_balance(p_user_id, p_credit_amount, '크레딧 충전', p_polar_checkout_id))->>'balance'
    INTO v_new_balance;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id::text,
    'balance', COALESCE(v_new_balance, 0)
  );
END;
$$;

-- ============================================================
-- 10. RPC: 관리자 잔액 조정
-- ============================================================
CREATE OR REPLACE FUNCTION polar_admin_adjust_balance(
  p_user_id UUID,
  p_amount INTEGER,       -- 양수: 추가, 음수: 차감
  p_description TEXT DEFAULT '관리자 조정'
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  UPDATE polar_balances
  SET balance_krw = GREATEST(balance_krw + p_amount, 0),
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance_krw INTO v_new_balance;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_balance');
  END IF;

  -- 이력 기록
  INSERT INTO polar_transactions (user_id, type, amount, balance_after, description)
  VALUES (p_user_id, 'admin_adjust', p_amount, v_new_balance, p_description);

  RETURN jsonb_build_object('success', true, 'balance', v_new_balance);
END;
$$;
