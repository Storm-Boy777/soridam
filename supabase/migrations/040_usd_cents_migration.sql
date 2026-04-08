-- Migration: KRW -> USD cents
-- polar_balances.balance_krw already renamed to balance_cents
-- All data already reset to 0

-- Drop existing functions
DROP FUNCTION IF EXISTS polar_get_balance(UUID);
DROP FUNCTION IF EXISTS polar_charge_balance(UUID, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS polar_deduct_balance(UUID, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS polar_refund_balance(UUID, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS polar_admin_adjust_balance(UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS process_polar_payment(UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER);

-- 1. polar_get_balance
CREATE FUNCTION polar_get_balance(p_user_id UUID) RETURNS INTEGER LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(balance_cents, 0) FROM polar_balances WHERE user_id = p_user_id;
$$;

-- 2. polar_charge_balance
CREATE FUNCTION polar_charge_balance(
  p_user_id UUID, p_amount_cents INTEGER, p_description TEXT, p_ref_id TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_new_balance INTEGER;
BEGIN
  UPDATE polar_balances SET balance_cents = balance_cents + p_amount_cents, total_charged = total_charged + p_amount_cents, updated_at = NOW()
  WHERE user_id = p_user_id RETURNING balance_cents INTO v_new_balance;
  IF NOT FOUND THEN
    INSERT INTO polar_balances (user_id, balance_cents, total_charged, total_used) VALUES (p_user_id, p_amount_cents, p_amount_cents, 0) RETURNING balance_cents INTO v_new_balance;
  END IF;
  INSERT INTO polar_transactions (user_id, type, amount, balance_after, description, ref_id) VALUES (p_user_id, 'charge', p_amount_cents, v_new_balance, p_description, p_ref_id);
  RETURN jsonb_build_object('success', true, 'balance', v_new_balance);
END; $$;

-- 3. polar_deduct_balance
CREATE FUNCTION polar_deduct_balance(
  p_user_id UUID, p_cost_cents INTEGER, p_description TEXT, p_ref_id TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_current INTEGER; v_new INTEGER;
BEGIN
  SELECT balance_cents INTO v_current FROM polar_balances WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'no_balance', 'balance', 0); END IF;
  IF v_current < p_cost_cents THEN RETURN jsonb_build_object('success', false, 'error', 'insufficient', 'balance', v_current); END IF;
  v_new := v_current - p_cost_cents;
  UPDATE polar_balances SET balance_cents = v_new, total_used = total_used + p_cost_cents, updated_at = NOW() WHERE user_id = p_user_id;
  INSERT INTO polar_transactions (user_id, type, amount, balance_after, description, ref_id) VALUES (p_user_id, 'usage', -p_cost_cents, v_new, p_description, p_ref_id);
  RETURN jsonb_build_object('success', true, 'balance', v_new);
END; $$;

-- 4. polar_refund_balance
CREATE FUNCTION polar_refund_balance(
  p_user_id UUID, p_amount_cents INTEGER, p_description TEXT, p_ref_id TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_new INTEGER;
BEGIN
  UPDATE polar_balances SET balance_cents = balance_cents + p_amount_cents, total_used = GREATEST(total_used - p_amount_cents, 0), updated_at = NOW()
  WHERE user_id = p_user_id RETURNING balance_cents INTO v_new;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'no_balance'); END IF;
  INSERT INTO polar_transactions (user_id, type, amount, balance_after, description, ref_id) VALUES (p_user_id, 'refund', p_amount_cents, v_new, p_description, p_ref_id);
  RETURN jsonb_build_object('success', true, 'balance', v_new);
END; $$;

-- 5. polar_admin_adjust_balance
CREATE FUNCTION polar_admin_adjust_balance(
  p_user_id UUID, p_amount INTEGER, p_description TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_new INTEGER;
BEGIN
  UPDATE polar_balances SET balance_cents = GREATEST(balance_cents + p_amount, 0), updated_at = NOW()
  WHERE user_id = p_user_id RETURNING balance_cents INTO v_new;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'no_balance'); END IF;
  INSERT INTO polar_transactions (user_id, type, amount, balance_after, description) VALUES (p_user_id, 'admin_adjust', p_amount, v_new, p_description);
  RETURN jsonb_build_object('success', true, 'balance', v_new);
END; $$;

-- 6. process_polar_payment
CREATE FUNCTION process_polar_payment(
  p_user_id UUID, p_polar_checkout_id TEXT, p_polar_product_id TEXT,
  p_product_type TEXT, p_amount INTEGER, p_credit_amount INTEGER
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_order_id UUID; v_balance JSONB;
BEGIN
  SELECT id INTO v_order_id FROM polar_orders WHERE polar_checkout_id = p_polar_checkout_id;
  IF FOUND THEN RETURN jsonb_build_object('success', true, 'duplicate', true, 'order_id', v_order_id); END IF;
  INSERT INTO polar_orders (user_id, polar_checkout_id, polar_product_id, product_type, amount, credit_amount, status, paid_at)
  VALUES (p_user_id, p_polar_checkout_id, p_polar_product_id, p_product_type, p_amount, p_credit_amount, 'paid', NOW())
  RETURNING id INTO v_order_id;
  IF p_credit_amount > 0 THEN
    SELECT polar_charge_balance(p_user_id, p_credit_amount, 'Credit charge (' || p_product_type || ')', p_polar_checkout_id) INTO v_balance;
  END IF;
  RETURN jsonb_build_object('success', true, 'order_id', v_order_id, 'balance', v_balance);
END; $$;
