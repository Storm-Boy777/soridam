-- 109: AI 종료 안내 메일 발송 기록 + 수신자 조회 함수
--
-- 목적:
--  1) email_send_log — 캠페인당 사용자 1회만 발송(중복 방지) + 결과 로그
--  2) get_shutdown_recipients() — 두 그룹(크레딧/자료) 수신자 조회 (EF에서 service_role로 호출)
--
-- ⚠️ 실제 발송은 Edge Function send-shutdown-notice가 담당. 이 마이그는 준비물만.

-- ── 발송 기록 ──
CREATE TABLE IF NOT EXISTS email_send_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign   text NOT NULL,                         -- 예: 'shutdown_2026'
  user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email      text NOT NULL,
  segment    text NOT NULL,                         -- 'credit' | 'script'
  status     text NOT NULL DEFAULT 'sent',          -- 'sent' | 'failed'
  resend_id  text,
  error      text,
  sent_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign, user_id)                         -- 캠페인당 사용자 1회 → 재실행 시 중복 발송 차단
);
COMMENT ON TABLE email_send_log IS 'AI 종료 안내 등 일회성 메일 발송 기록. (campaign, user_id) 유니크로 중복 발송 방지.';

-- service_role(EF)만 접근. RLS 켜고 정책 없음 → anon/authenticated 전면 차단.
ALTER TABLE email_send_log ENABLE ROW LEVEL SECURITY;

-- ── 수신자 조회 함수 ──
-- 크레딧 실결제자(우선) + 자료 보유자를 이메일 인증 완료·비관리자 기준으로 반환.
-- 겹치면 'credit'으로 분류(크레딧 안내가 상위 정보).
CREATE OR REPLACE FUNCTION get_shutdown_recipients()
RETURNS TABLE (user_id uuid, email text, segment text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  WITH paid AS (
    SELECT b.user_id
    FROM polar_balances b
    JOIN auth.users u ON u.id = b.user_id
    WHERE b.total_charged > 0
      AND COALESCE(u.raw_app_meta_data->>'role','user') <> 'admin'
      AND b.balance_cents < 100000               -- 이상치 계정 제외
  ),
  owners AS (
    SELECT DISTINCT s.user_id
    FROM scripts s
    JOIN auth.users u ON u.id = s.user_id
    WHERE COALESCE(u.raw_app_meta_data->>'role','user') <> 'admin'
  )
  SELECT u.id, u.email,
         CASE WHEN p.user_id IS NOT NULL THEN 'credit' ELSE 'script' END AS segment
  FROM auth.users u
  LEFT JOIN paid p ON p.user_id = u.id
  WHERE u.email IS NOT NULL
    AND u.email_confirmed_at IS NOT NULL
    AND (p.user_id IS NOT NULL OR u.id IN (SELECT user_id FROM owners));
$$;

-- 이메일 목록을 노출하므로 일반 롤에는 실행 권한 회수, service_role만 허용.
REVOKE ALL ON FUNCTION get_shutdown_recipients() FROM public;
REVOKE ALL ON FUNCTION get_shutdown_recipients() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION get_shutdown_recipients() TO service_role;
