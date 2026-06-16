// GWP 팀 매칭 게임 — Edge Function(gwp-team-game) 호출 래퍼 + 타입
// 쓰기는 모두 이 EF 경유. 읽기/실시간은 페이지에서 supabase 클라이언트로 직접.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface GwpSession {
  id: string;
  title: string;
  team_count: number;
  team_size: number;
  parts: string[];
  status: "setup" | "checkin" | "playing" | "ended";
  buzzer_active: boolean;
  buzzer_round: number;
  created_at: string;
  updated_at: string;
}

export interface GwpAssignment {
  id: string;
  session_id: string;
  member_id: string;
  member_name: string;
  part: string;
  team_number: number;
  checked_in_at: string;
}

export interface GwpPress {
  id: string;
  session_id: string;
  round: number;
  member_id: string;
  member_name: string;
  team_number: number;
  pressed_at: string;
}

async function call(action: string, body: Record<string, unknown> = {}) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/gwp-team-game`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ action, ...body }),
  });
  const data = await res.json().catch(() => ({ error: res.statusText }));
  if (!res.ok) throw new Error(data.error || data.message || "요청 실패");
  return data;
}

// ── 진행자(콘솔) ───────────────────────────────
export function createSession(input: {
  title?: string;
  team_count: number;
  team_size: number;
  parts: string[];
}): Promise<{ session: GwpSession }> {
  return call("create_session", input);
}

export function updateSession(
  session_id: string,
  patch: Partial<Pick<GwpSession, "title" | "team_count" | "team_size" | "parts" | "status">>,
): Promise<{ session: GwpSession }> {
  return call("update_session", { session_id, ...patch });
}

// 게임 시작/종료 (status 전환 — 모든 폰 화면 전환 트리거)
export function startGame(session_id: string): Promise<{ session: GwpSession }> {
  return updateSession(session_id, { status: "playing" });
}

export function endGame(session_id: string): Promise<{ session: GwpSession }> {
  return updateSession(session_id, { status: "ended" });
}

export function armBuzzer(session_id: string): Promise<{ session: GwpSession }> {
  return call("arm_buzzer", { session_id });
}

export function stopBuzzer(session_id: string): Promise<{ ok: true }> {
  return call("stop_buzzer", { session_id });
}

export function clearRound(session_id: string): Promise<{ ok: true }> {
  return call("clear_round", { session_id });
}

export function resetCheckins(session_id: string): Promise<{ ok: true }> {
  return call("reset_checkins", { session_id });
}

// ── 참가자(폰) ─────────────────────────────────
export function checkin(
  session_id: string,
  member_id: string,
): Promise<{ team_number: number; member_name: string; part: string; already: boolean }> {
  return call("checkin", { session_id, member_id });
}

export function buzz(
  session_id: string,
  member_id: string,
): Promise<{ ok: boolean; already?: boolean; inactive?: boolean; error?: string }> {
  return call("buzz", { session_id, member_id });
}
