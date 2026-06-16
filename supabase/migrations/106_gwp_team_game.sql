-- =============================================
-- 106: GWP 팀 매칭 게임 (체크인 → 팀 배정 → 저요 버저)
--
-- 목적:
--   평소 안 섞이는 두 파트(부서)를 랜덤 혼합 팀으로 묶고,
--   "저요!!" 버저 게임을 진행하기 위한 백엔드.
--
-- 핵심 규칙 (팀 배정):
--   - 팀 개수는 고정(설정값). 팀당 인원은 총원÷팀수로 자연히 결정.
--   - 부서(파트)별 독립 "라운드 랜덤" 배정:
--       체크인 시 → 그 파트 인원이 가장 적은 팀들 중 랜덤 1곳에 배치.
--       (= 모든 팀이 1명씩 찰 때까지 같은 팀에 2명째 안 들어감 → 라운드 단위 순환)
--   - 팀 수가 고정이라 한 번 정해진 팀은 절대 안 바뀜(불변).
--
-- 구성:
--   1) gwp_team_sessions      게임 1판 = 설정 + 라이브 상태(버저)
--   2) gwp_team_assignments   체크인 + 팀 배정 (참가자 1명 = 1행)
--   3) gwp_buzzer_presses     저요 버저 기록 (서버 도착시각 = 공정성 기준)
--   + RLS(읽기 anon 허용 / 쓰기는 EF·RPC만)
--   + supabase_realtime publication (폰 실시간 구독용)
--   + gwp_assign_team() RPC (advisory lock으로 동시 체크인 직렬화)
--
-- 점수는 플랫폼에서 다루지 않음(진행자 별도 집계). 문제 출제도 진행자 구두/PPT.
-- =============================================

-- ──────────────────────────────────────────────
-- 1. 게임 세션 (1판 = 1행)
-- ──────────────────────────────────────────────
create table if not exists public.gwp_team_sessions (
  id            uuid primary key default gen_random_uuid(),
  title         text not null default 'GWP 팀 매칭 게임',
  team_count    int  not null default 6  check (team_count between 1 and 50),  -- 기준 다이얼: 팀 개수
  team_size     int  not null default 5  check (team_size  between 1 and 100), -- 팀당 목표 인원(표시/안내용)
  parts         text[] not null default '{}',   -- 참여 부서(파트) 목록 = event_members.department 값
  status        text not null default 'checkin'
                  check (status in ('setup','checkin','playing','ended')),
  buzzer_active boolean not null default false,  -- 진행자가 "저요" 버저를 켰는지
  buzzer_round  int     not null default 0,      -- 버저 라운드 (켤 때마다 +1 → 폰 버튼 위치 재배치 트리거)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 2. 체크인 + 팀 배정 (참가자 1명 = 1행)
-- ──────────────────────────────────────────────
create table if not exists public.gwp_team_assignments (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.gwp_team_sessions(id) on delete cascade,
  member_id     uuid not null references public.event_members(id)     on delete cascade,
  member_name   text not null,            -- 이름 스냅샷 (명단 변경에도 표시 안정)
  part          text not null,            -- 부서(파트) 스냅샷
  team_number   int  not null,            -- 배정된 팀 (1 ~ team_count)
  checked_in_at timestamptz not null default now(),
  unique (session_id, member_id)          -- 한 세션에 한 사람 중복 체크인 방지
);
create index if not exists idx_gwp_assign_session_team on public.gwp_team_assignments (session_id, team_number);
create index if not exists idx_gwp_assign_session_part on public.gwp_team_assignments (session_id, part);

-- ──────────────────────────────────────────────
-- 3. 저요 버저 기록 (라운드별 · 사람별 1회)
-- ──────────────────────────────────────────────
create table if not exists public.gwp_buzzer_presses (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.gwp_team_sessions(id) on delete cascade,
  round        int  not null,
  member_id    uuid not null references public.event_members(id) on delete cascade,
  member_name  text not null,
  team_number  int  not null,
  pressed_at   timestamptz not null default now(),  -- 서버 도착 시각 = 누가 먼저인지 판정 기준
  unique (session_id, round, member_id)             -- 한 라운드에 한 번만
);
create index if not exists idx_gwp_buzz_session_round on public.gwp_buzzer_presses (session_id, round, pressed_at);

-- ──────────────────────────────────────────────
-- 4. RLS — 읽기는 anon/authenticated 허용(폰 실시간 구독용), 쓰기는 정책 없음
--    → 쓰기는 Edge Function(service role) / SECURITY DEFINER RPC로만 가능.
-- ──────────────────────────────────────────────
alter table public.gwp_team_sessions    enable row level security;
alter table public.gwp_team_assignments enable row level security;
alter table public.gwp_buzzer_presses   enable row level security;

drop policy if exists gwp_sessions_read    on public.gwp_team_sessions;
drop policy if exists gwp_assignments_read on public.gwp_team_assignments;
drop policy if exists gwp_presses_read     on public.gwp_buzzer_presses;

create policy gwp_sessions_read    on public.gwp_team_sessions    for select to anon, authenticated using (true);
create policy gwp_assignments_read on public.gwp_team_assignments for select to anon, authenticated using (true);
create policy gwp_presses_read     on public.gwp_buzzer_presses   for select to anon, authenticated using (true);

-- ──────────────────────────────────────────────
-- 5. Realtime publication (postgres_changes 구독 활성화) — idempotent
-- ──────────────────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_publication_tables
                 where pubname='supabase_realtime' and schemaname='public' and tablename='gwp_team_sessions') then
    alter publication supabase_realtime add table public.gwp_team_sessions;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_publication_tables
                 where pubname='supabase_realtime' and schemaname='public' and tablename='gwp_team_assignments') then
    alter publication supabase_realtime add table public.gwp_team_assignments;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_publication_tables
                 where pubname='supabase_realtime' and schemaname='public' and tablename='gwp_buzzer_presses') then
    alter publication supabase_realtime add table public.gwp_buzzer_presses;
  end if;
end $$;

-- ──────────────────────────────────────────────
-- 6. 팀 배정 RPC — 체크인 시 "그 파트 인원이 가장 적은 팀 중 랜덤 1곳"에 배치.
--    동시 체크인 직렬화: (세션+파트) 단위 advisory lock으로 비율 깨짐 방지.
--    이미 체크인된 경우 기존 팀을 그대로 반환(멱등).
--    service_role만 EXECUTE (EF가 호출) → anon 직접 호출 차단.
-- ──────────────────────────────────────────────
create or replace function public.gwp_assign_team(p_session uuid, p_member uuid)
returns table (team_number int, member_name text, part text, already boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_part       text;
  v_name       text;
  v_team_count int;
  v_team       int;
begin
  -- 세션 + 팀 수
  select s.team_count into v_team_count from gwp_team_sessions s where s.id = p_session;
  if v_team_count is null then
    raise exception '세션을 찾을 수 없습니다';
  end if;

  -- 멤버 정보 (이름 · 부서)
  select m.name, m.department into v_name, v_part from event_members m where m.id = p_member;
  if v_name is null then
    raise exception '멤버를 찾을 수 없습니다';
  end if;
  if v_part is null then
    raise exception '부서(파트)가 지정되지 않은 멤버입니다';
  end if;

  -- 이미 체크인했으면 기존 팀 반환
  select a.team_number into v_team
  from gwp_team_assignments a
  where a.session_id = p_session and a.member_id = p_member;
  if v_team is not null then
    return query select v_team, v_name, v_part, true;
    return;
  end if;

  -- (세션+파트) 단위 직렬화 — 같은 파트의 동시 체크인이 같은 min-count를 보고 몰리는 것 방지
  perform pg_advisory_xact_lock(hashtext(p_session::text || '|' || v_part));

  -- 이 파트 기준, 각 팀의 현재 인원 → 최소 인원 팀들 중 랜덤 1곳
  with team_nums as (
    select generate_series(1, v_team_count) as t
  ),
  counts as (
    select tn.t,
           (select count(*) from gwp_team_assignments a
            where a.session_id = p_session and a.part = v_part and a.team_number = tn.t) as c
    from team_nums tn
  )
  select c.t into v_team
  from counts c
  where c.c = (select min(c2.c) from counts c2)
  order by random()
  limit 1;

  insert into gwp_team_assignments (session_id, member_id, member_name, part, team_number)
  values (p_session, p_member, v_name, v_part, v_team);

  return query select v_team, v_name, v_part, false;
end;
$$;

revoke all on function public.gwp_assign_team(uuid, uuid) from public;
grant execute on function public.gwp_assign_team(uuid, uuid) to service_role;
