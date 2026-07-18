-- 108: 결제(크레딧 충전·후원) 활성화 토글
--
-- 관리자 > 사이트 설정 > 결제 설정에서 on/off.
-- false로 두면 /store의 충전·후원 버튼이 잠기고,
-- createCheckout Server Action이 서버 측에서 결제 개시를 거부한다.
--
-- 대상: credit / credit_sponsor / sponsor 3종 전부 (토글 하나로 일괄)
-- 기본값 true — 적용해도 현재 동작은 변하지 않는다.
--
-- ⚠️ 041의 signup_enabled처럼 upsert 없이 .update()로 쓰면 행 부재 시 조용히 실패하므로,
--    반드시 이 INSERT가 선행되어야 한다. 조회 측(isPaymentEnabled)은 키 부재 시 true로 폴백한다.

INSERT INTO system_settings (key, value) VALUES
  ('payment_enabled', 'true')
ON CONFLICT (key) DO NOTHING;
