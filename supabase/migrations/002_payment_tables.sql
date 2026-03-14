-- ============================================================
-- 002_payment_tables.sql
-- OPIcTalkDoc: 결제 기록(orders) + 사용자 이용권(user_credits)
-- 생성일: 2026-02-20
-- ============================================================

-- ── orders: 결제 기록 ──

CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id      TEXT NOT NULL,           -- 'basic_plan' | 'premium_plan' | 'mock_exam_credit' | 'script_credit'
  order_name      TEXT NOT NULL,           -- '베이직 플랜 (3회권)'
  amount          INTEGER NOT NULL,        -- 결제 금액 (원)
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','paid','failed','cancelled','refunded')),
  payment_id      TEXT,                    -- 포트원 paymentId
  pg_provider     TEXT,                    -- 'KG이니시스', '카카오페이' 등
  pg_tx_id        TEXT,                    -- PG사 거래번호
  pay_method      TEXT,                    -- 'CARD', 'EASY_PAY' 등
  paid_at         TIMESTAMPTZ,
  receipt_url     TEXT,                    -- 영수증 URL
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_orders_payment_id ON orders(payment_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);

-- ── user_credits: 사용자 이용권 (1 row per user) ──

CREATE TABLE user_credits (
  user_id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_plan           TEXT NOT NULL DEFAULT 'free',  -- 'free' | 'basic' | 'premium'
  plan_mock_exam_credits INTEGER NOT NULL DEFAULT 0,    -- 플랜 모의고사 크레딧 (만료됨)
  plan_script_credits    INTEGER NOT NULL DEFAULT 0,    -- 플랜 스크립트 크레딧 (만료됨)
  mock_exam_credits      INTEGER NOT NULL DEFAULT 0,    -- 횟수권 모의고사 크레딧 (영구)
  script_credits         INTEGER NOT NULL DEFAULT 0,    -- 횟수권 스크립트 크레딧 (영구)
  plan_expires_at        TIMESTAMPTZ,                   -- 플랜 만료일 (NULL = 무료)
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- ── updated_at 자동 갱신 (001에서 만든 update_updated_at() 함수 재사용) ──

CREATE TRIGGER trigger_orders_updated_at
  BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_user_credits_updated_at
  BEFORE UPDATE ON user_credits FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS ──

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

-- 본인 주문만 조회
CREATE POLICY "orders_select_own" ON orders
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 본인 크레딧만 조회
CREATE POLICY "user_credits_select_own" ON user_credits
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- service_role만 INSERT/UPDATE (API Route에서 처리)
-- 클라이언트에서 직접 INSERT 불가 → 보안

-- ── 회원가입 시 자동 user_credits 생성 트리거 ──

CREATE OR REPLACE FUNCTION handle_new_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_credits (
    user_id, current_plan,
    plan_mock_exam_credits, plan_script_credits,
    mock_exam_credits, script_credits
  )
  VALUES (NEW.id, 'free', 0, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_credits();
