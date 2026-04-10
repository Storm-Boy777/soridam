-- 043_beta_revamp.sql
-- 베타 시스템 개편: 공개 오픈 베타 → 관리자 초대 베타
-- 변경 내용:
--   - beta_applications: kakao_nickname 제거, memo + granted_cents 추가
--   - status: pending/approved/rejected → active/revoked/expired
--   - 사용자 자기 신청 정책 삭제 (관리자만 발급)
--   - 크레딧 지급 방식: plan_mock_exam_credits → polar_balances.balance_cents

-- ══════════════════════════════════════════
-- 1. 데이터 마이그레이션 (상태값 변환)
-- ══════════════════════════════════════════

-- approved → active, pending/rejected → revoked
UPDATE beta_applications SET status = 'active'  WHERE status = 'approved';
UPDATE beta_applications SET status = 'revoked' WHERE status IN ('pending', 'rejected');

-- ══════════════════════════════════════════
-- 2. 테이블 구조 변경
-- ══════════════════════════════════════════

-- 기존 CHECK 제약 제거
ALTER TABLE beta_applications DROP CONSTRAINT IF EXISTS beta_applications_status_check;

-- kakao_nickname 제거, memo + granted_cents 추가
ALTER TABLE beta_applications
  DROP COLUMN IF EXISTS kakao_nickname,
  ADD COLUMN IF NOT EXISTS memo TEXT,
  ADD COLUMN IF NOT EXISTS granted_cents INTEGER NOT NULL DEFAULT 0;

-- status 기본값 변경 (pending → active)
ALTER TABLE beta_applications ALTER COLUMN status SET DEFAULT 'active';

-- 새 CHECK 제약
ALTER TABLE beta_applications
  ADD CONSTRAINT beta_applications_status_check
  CHECK (status IN ('active', 'revoked', 'expired'));

-- 테이블 코멘트 업데이트
COMMENT ON TABLE beta_applications IS '베타 사용자 관리 (관리자 초대 방식, 소리담 내부 테스트용)';

-- ══════════════════════════════════════════
-- 3. RLS 정책 — 사용자 신청 정책 삭제
-- ══════════════════════════════════════════

-- 사용자가 직접 신청하던 정책 삭제 (관리자만 UPSERT)
DROP POLICY IF EXISTS "beta_insert_own" ON beta_applications;

-- ══════════════════════════════════════════
-- 4. 기존 함수 제거
-- ══════════════════════════════════════════

DROP FUNCTION IF EXISTS approve_beta_application(UUID, UUID);
DROP FUNCTION IF EXISTS get_beta_stats();

-- ══════════════════════════════════════════
-- 5. grant_beta_access RPC
--    관리자가 특정 사용자에게 베타 접근 권한 부여
--    1. beta_applications UPSERT
--    2. user_credits 플랜 설정
--    3. polar_balances 크레딧 충전
-- ══════════════════════════════════════════

CREATE OR REPLACE FUNCTION grant_beta_access(
  p_user_id      UUID,
  p_admin_id     UUID,
  p_balance_cents INTEGER,
  p_expires_at   TIMESTAMPTZ,
  p_memo         TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- 1. beta_applications UPSERT (기존 발급 이력이 있으면 갱신)
  INSERT INTO beta_applications (
    user_id, status, memo, granted_cents, reviewed_by, reviewed_at
  ) VALUES (
    p_user_id, 'active', p_memo, p_balance_cents, p_admin_id, NOW()
  )
  ON CONFLICT (user_id) DO UPDATE
    SET status       = 'active',
        memo         = COALESCE(p_memo, beta_applications.memo),
        granted_cents = p_balance_cents,
        reviewed_by  = p_admin_id,
        reviewed_at  = NOW(),
        updated_at   = NOW();

  -- 2. user_credits 플랜 식별자 업데이트
  UPDATE user_credits
  SET current_plan   = 'beta',
      plan_expires_at = p_expires_at,
      updated_at     = NOW()
  WHERE user_id = p_user_id;

  -- 3. polar_balances 크레딧 충전
  IF p_balance_cents > 0 THEN
    PERFORM polar_charge_balance(
      p_user_id,
      p_balance_cents,
      '베타 크레딧 지급'
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'user_id', p_user_id::text);
END;
$$;

-- ══════════════════════════════════════════
-- 6. revoke_beta_access RPC
--    베타 접근 권한 회수 + 플랜 초기화
-- ══════════════════════════════════════════

CREATE OR REPLACE FUNCTION revoke_beta_access(
  p_user_id  UUID,
  p_admin_id UUID
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- 1. beta_applications 상태 변경
  UPDATE beta_applications
  SET status      = 'revoked',
      reviewed_by = p_admin_id,
      reviewed_at = NOW(),
      updated_at  = NOW()
  WHERE user_id = p_user_id AND status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', '활성 베타 사용자가 아닙니다');
  END IF;

  -- 2. user_credits 플랜 초기화
  UPDATE user_credits
  SET current_plan    = 'free',
      plan_expires_at = NULL,
      updated_at      = NOW()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ══════════════════════════════════════════
-- 7. get_beta_stats RPC (단순화)
-- ══════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_beta_stats()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_active  INTEGER;
  v_revoked INTEGER;
  v_total   INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_active  FROM beta_applications WHERE status = 'active';
  SELECT COUNT(*) INTO v_revoked FROM beta_applications WHERE status IN ('revoked', 'expired');
  SELECT COUNT(*) INTO v_total   FROM beta_applications;

  RETURN jsonb_build_object(
    'active',  v_active,
    'revoked', v_revoked,
    'total',   v_total
  );
END;
$$;

-- ══════════════════════════════════════════
-- 8. get_beta_users RPC
--    활성 베타 사용자 목록 (관리자용)
-- ══════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_beta_users()
RETURNS TABLE(
  application_id UUID,
  user_id        UUID,
  email          TEXT,
  display_name   TEXT,
  granted_cents  INTEGER,
  balance_cents  INTEGER,
  plan_expires_at TIMESTAMPTZ,
  memo           TEXT,
  granted_at     TIMESTAMPTZ
)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT
    ba.id                                          AS application_id,
    ba.user_id,
    u.email,
    p.display_name,
    ba.granted_cents,
    COALESCE(pb.balance_cents, 0)                  AS balance_cents,
    uc.plan_expires_at,
    ba.memo,
    COALESCE(ba.reviewed_at, ba.created_at)        AS granted_at
  FROM beta_applications ba
  JOIN auth.users u ON u.id = ba.user_id
  LEFT JOIN profiles p ON p.id = ba.user_id
  LEFT JOIN polar_balances pb ON pb.user_id = ba.user_id
  LEFT JOIN user_credits uc ON uc.user_id = ba.user_id
  WHERE ba.status = 'active'
  ORDER BY ba.reviewed_at DESC NULLS LAST;
$$;

-- ══════════════════════════════════════════
-- 9. find_user_by_email RPC
--    이메일로 사용자 검색 (관리자 베타 발급용)
-- ══════════════════════════════════════════

CREATE OR REPLACE FUNCTION find_user_by_email(p_email TEXT)
RETURNS TABLE(
  user_id       UUID,
  email         TEXT,
  display_name  TEXT,
  current_plan  TEXT,
  is_beta_active BOOLEAN
)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT
    u.id                                           AS user_id,
    u.email,
    p.display_name,
    COALESCE(uc.current_plan, 'free')              AS current_plan,
    EXISTS (
      SELECT 1 FROM beta_applications ba
      WHERE ba.user_id = u.id AND ba.status = 'active'
    )                                              AS is_beta_active
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  LEFT JOIN user_credits uc ON uc.user_id = u.id
  WHERE lower(u.email) = lower(p_email)
  LIMIT 1;
$$;
