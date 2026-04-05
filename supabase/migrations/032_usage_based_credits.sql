-- 032_usage_based_credits.sql
-- 사용량 기반 크레딧 시스템 (잔액 방식)
-- 현재 횟수 기반 시스템과 병행 — 교체 시점까지 비활성
--
-- 교체 방법:
--   1. user_credits.balance_krw 컬럼 활성화 (이 마이그레이션으로 추가됨)
--   2. Server Actions에서 consume_*_credit → deduct_usage_cost 로 교체
--   3. 기존 횟수 크레딧 컬럼은 당분간 유지 (롤백 가능)

-- ============================================================
-- 1. user_credits에 잔액 컬럼 추가
-- ============================================================
ALTER TABLE user_credits
  ADD COLUMN IF NOT EXISTS balance_krw INTEGER NOT NULL DEFAULT 0;
  -- 원화 잔액 (단위: 원). 충전 시 +, 사용 시 -
  -- 예: ₩14,000 충전 → balance_krw = 14000

COMMENT ON COLUMN user_credits.balance_krw IS '원화 잔액 (사용량 기반 과금). 충전 시 증가, API 사용 시 차감';

-- ============================================================
-- 2. 잔액 충전 함수
-- ============================================================
CREATE OR REPLACE FUNCTION charge_balance(
  p_user_id UUID,
  p_amount_krw INTEGER  -- 충전 금액 (원)
)
RETURNS INTEGER  -- 충전 후 잔액
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  UPDATE user_credits
  SET balance_krw = balance_krw + p_amount_krw,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance_krw INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_credits not found for user %', p_user_id;
  END IF;

  RETURN v_new_balance;
END;
$$;

-- ============================================================
-- 3. 사용량 비용 차감 함수
-- ============================================================
CREATE OR REPLACE FUNCTION deduct_usage_cost(
  p_user_id UUID,
  p_cost_krw INTEGER  -- 차감 금액 (원)
)
RETURNS TABLE (
  success BOOLEAN,
  remaining_balance INTEGER
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_current_balance INTEGER;
BEGIN
  -- 현재 잔액 조회 (FOR UPDATE 락)
  SELECT balance_krw INTO v_current_balance
  FROM user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  -- 잔액 부족 확인
  IF v_current_balance < p_cost_krw THEN
    RETURN QUERY SELECT false, v_current_balance;
    RETURN;
  END IF;

  -- 차감
  UPDATE user_credits
  SET balance_krw = balance_krw - p_cost_krw,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT true, (v_current_balance - p_cost_krw);
END;
$$;

-- ============================================================
-- 4. 사용량 비용 환불 함수 (API 에러 시)
-- ============================================================
CREATE OR REPLACE FUNCTION refund_usage_cost(
  p_user_id UUID,
  p_cost_krw INTEGER  -- 환불 금액 (원)
)
RETURNS INTEGER  -- 환불 후 잔액
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  UPDATE user_credits
  SET balance_krw = balance_krw + p_cost_krw,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance_krw INTO v_new_balance;

  RETURN COALESCE(v_new_balance, 0);
END;
$$;

-- ============================================================
-- 5. 잔액 확인 함수 (사용 전 체크)
-- ============================================================
CREATE OR REPLACE FUNCTION check_balance(
  p_user_id UUID
)
RETURNS INTEGER  -- 현재 잔액
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(balance_krw, 0)
  FROM user_credits
  WHERE user_id = p_user_id;
$$;

-- ============================================================
-- 6. 기간별 사용량 합계 조회 (사용자 대시보드용)
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_cost_summary(
  p_user_id UUID,
  p_from TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_to TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  session_type TEXT,
  total_calls BIGINT,
  total_cost_usd NUMERIC,
  total_cost_krw NUMERIC  -- USD → KRW 환산 (1 USD = 1,400 KRW 기준)
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    session_type,
    COUNT(*) AS total_calls,
    SUM(cost_usd) AS total_cost_usd,
    ROUND(SUM(cost_usd) * 1400, 0) AS total_cost_krw
  FROM api_usage_logs
  WHERE user_id = p_user_id
    AND created_at >= p_from
    AND created_at < p_to
  GROUP BY session_type
  ORDER BY total_cost_krw DESC;
$$;

-- ============================================================
-- 7. USD → KRW 환율 설정 테이블 (향후 동적 환율 지원)
-- ============================================================
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO system_settings (key, value)
VALUES ('usd_to_krw_rate', '{"rate": 1400, "updated_at": "2026-04-04"}')
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE system_settings IS '시스템 설정 (환율, 마진율 등)';

-- ============================================================
-- 참고: 교체 시 체크리스트
-- ============================================================
-- □ 1. Creem/Polar 결제 웹훅 → charge_balance() 호출
-- □ 2. 각 Server Action에서 consume_*_credit → deduct_usage_cost 교체
-- □ 3. api_usage_logs의 cost_usd → KRW 환산 후 차감
-- □ 4. 대시보드에 잔액 표시 UI 추가
-- □ 5. 잔액 부족 시 충전 유도 UX
-- □ 6. 기존 횟수 크레딧이 남은 사용자 마이그레이션 정책 결정
