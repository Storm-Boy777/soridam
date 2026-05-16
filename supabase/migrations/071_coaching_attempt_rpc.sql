-- 071_coaching_attempt_rpc.sql
-- AI 코치 — 회차 번호 원자적 발급 RPC
-- submitAttempt의 read-modify-write 레이스 컨디션 방지:
--   기존: SELECT attempt_count → +1 → INSERT → UPDATE (비원자적)
--   변경: 단일 UPDATE ... RETURNING 으로 attempt_count 증가 + 회차 번호 발급

create or replace function coaching_claim_attempt_number(
  p_session_id uuid,
  p_user_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update coaching_sessions
     set attempt_count   = attempt_count + 1,
         last_attempt_at = now()
   where id      = p_session_id
     and user_id = p_user_id
     and status  = 'active'
  returning attempt_count into v_count;

  -- 매칭되는 active 세션이 없으면 NULL 반환 (호출측에서 에러 처리)
  return v_count;
end;
$$;

grant execute on function coaching_claim_attempt_number(uuid, uuid)
  to authenticated, service_role;
