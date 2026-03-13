-- 018: admin_audit_log에 admin_email 스냅샷 컬럼 추가
-- 관리자 ID가 삭제/변경되더라도 누가 실행했는지 추적 가능하도록 이메일을 스냅샷으로 저장

ALTER TABLE admin_audit_log
  ADD COLUMN IF NOT EXISTS admin_email TEXT;

COMMENT ON COLUMN admin_audit_log.admin_email IS '관리자 이메일 스냅샷 (감사 추적용)';
