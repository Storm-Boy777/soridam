-- 044_cleanup_old_credits.sql
-- 구버전 credit 컬럼·RPC 정리
-- polar_balances (USD 센트 기반)이 새 크레딧 시스템으로 완전 전환됨

-- ══════════════════════════════════════════
-- 1. user_credits — 미사용 컬럼 제거
--    (mock_exam_credits, script_credits 등 모두 0이며 어디서도 사용 안 함)
-- ══════════════════════════════════════════

ALTER TABLE user_credits
  DROP COLUMN IF EXISTS mock_exam_credits,
  DROP COLUMN IF EXISTS script_credits,
  DROP COLUMN IF EXISTS plan_mock_exam_credits,
  DROP COLUMN IF EXISTS plan_script_credits,
  DROP COLUMN IF EXISTS plan_tutoring_credits,
  DROP COLUMN IF EXISTS tutoring_credits,
  DROP COLUMN IF EXISTS balance_krw;

-- ══════════════════════════════════════════
-- 2. user_credits.current_plan — CHECK 제약 추가
--    ('free' | 'beta' 만 허용)
-- ══════════════════════════════════════════

ALTER TABLE user_credits
  DROP CONSTRAINT IF EXISTS user_credits_plan_check;

ALTER TABLE user_credits
  ADD CONSTRAINT user_credits_plan_check
  CHECK (current_plan IN ('free', 'beta'));

-- ══════════════════════════════════════════
-- 3. 깨진 RPC 함수 제거
--    (v2_user_credits 참조 → 해당 테이블 없어서 이미 오류)
-- ══════════════════════════════════════════

DROP FUNCTION IF EXISTS consume_mock_exam_credit(UUID);
DROP FUNCTION IF EXISTS consume_script_credit(UUID);
DROP FUNCTION IF EXISTS consume_tutoring_credit(UUID);
DROP FUNCTION IF EXISTS refund_mock_exam_credit(UUID);
DROP FUNCTION IF EXISTS refund_tutoring_credit(UUID);
DROP FUNCTION IF EXISTS increment_script_credits(UUID, INTEGER);

-- refund_script_credit: scripts Edge Function에서 여전히 호출하므로 삭제 대신 no-op으로 교체
CREATE OR REPLACE FUNCTION refund_script_credit(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- no-op: 구버전 호환용. 실제 크레딧은 polar_balances로 관리됨.
  RETURN;
END;
$$;

-- ══════════════════════════════════════════
-- 4. 트리거 함수 교정 — v2_* 테이블 → 실제 테이블명
--    (신규 가입자 생성 흐름이 현재 전부 깨져 있음)
-- ══════════════════════════════════════════

-- 4-1. handle_new_user: v2_profiles → profiles
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 4-2. handle_new_user_credits: v2_user_credits → user_credits
CREATE OR REPLACE FUNCTION handle_new_user_credits()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_credits (user_id, current_plan)
  VALUES (NEW.id, 'free')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 4-3. handle_new_user_polar_balance: v2_polar_balances / balance_krw → polar_balances / balance_cents
CREATE OR REPLACE FUNCTION handle_new_user_polar_balance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO polar_balances (user_id, balance_cents, total_charged, total_used)
  VALUES (NEW.id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
