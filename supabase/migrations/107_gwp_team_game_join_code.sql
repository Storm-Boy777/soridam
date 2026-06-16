-- =============================================
-- 107: GWP 팀 게임 — 입장 코드 + 체크인 마감 토글
--
-- 목적:
--   URL을 전달받은 불참자가 체크인하는 것을 막는다.
--   ① 입장 코드: 행사장 화면에만 띄우는 4자리 코드 입력해야 체크인 (Kahoot/Slido 방식)
--   ② 마감 토글: 진행자가 체크인을 언제든 하드 마감
--
-- 보안:
--   입장 코드가 참가자 클라이언트나 Realtime 페이로드로 새면 의미 없음
--   → 코드는 anon 접근이 차단된 별도 테이블(gwp_session_secrets)에 저장하고
--     EF(service role)에서만 읽고 검증한다. 참가자는 코드를 "제출"만 한다.
--   checkin_open은 비밀이 아니므로(마감 안내에 필요) 세션 테이블에 둔다.
-- =============================================

-- 체크인 마감 토글 (기본 열림)
alter table public.gwp_team_sessions
  add column if not exists checkin_open boolean not null default true;

-- 입장 코드 — anon 접근 불가 (RLS 정책 없음 → service role EF만)
create table if not exists public.gwp_session_secrets (
  session_id uuid primary key references public.gwp_team_sessions(id) on delete cascade,
  join_code  text not null
);
alter table public.gwp_session_secrets enable row level security;
-- 정책을 만들지 않음 → anon/authenticated 는 SELECT/INSERT/UPDATE 모두 불가.
-- Realtime publication에도 추가하지 않음(코드가 페이로드로 새지 않도록).
