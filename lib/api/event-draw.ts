const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function callEdgeFunction(
  functionName: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
  } = {}
) {
  const { method = "POST", body } = options;
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/${functionName}`,
    {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.message || "API 요청 실패");
  }

  return res.json();
}

// 멤버 API
export async function fetchMembers() {
  return callEdgeFunction("event-draw-members-list");
}

export async function upsertMember(
  member: {
    id?: string;
    name: string;
    department?: string;
    email?: string;
    phone?: string;
    memo?: string;
    is_active?: boolean;
  }
) {
  return callEdgeFunction("event-draw-members-upsert", { body: { member } });
}

export async function deleteMember(id: string) {
  return callEdgeFunction("event-draw-members-delete", { body: { id } });
}

export async function importMembers(
  members: { name: string; department?: string; email?: string; phone?: string; memo?: string }[]
) {
  return callEdgeFunction("event-draw-members-import", { body: { members } });
}

// 이벤트 API
export async function fetchEvents() {
  return callEdgeFunction("event-draw-events-list");
}

export async function createEvent(event: {
  title: string;
  description?: string;
  rounds: { label: string; prize: string; count: number; mode: string; animation: string }[];
  allow_duplicate?: boolean;
}) {
  return callEdgeFunction("event-draw-events-create", { body: event });
}

export async function deleteEvent(id: string) {
  return callEdgeFunction("event-draw-events-delete", { body: { id } });
}

export async function updateEvent(id: string, updates: { status?: string }) {
  return callEdgeFunction("event-draw-events-update", { body: { id, ...updates } });
}

// 추첨 실행 API
export async function executeDraw(params: {
  event_id: string;
  round_index: number;
  round_label: string;
  prize_name: string;
  count: number;
  participant_ids: string[];
  exclude_ids?: string[];
}) {
  return callEdgeFunction("event-draw-execute", { body: params });
}

// 결과 API
export async function fetchResults(eventId?: string) {
  return callEdgeFunction("event-draw-results", {
    body: { event_id: eventId },
  });
}

export async function fetchMemberHistory(memberId: string) {
  return callEdgeFunction("event-draw-results", {
    body: { member_id: memberId },
  });
}

export async function fetchAllResults() {
  return callEdgeFunction("event-draw-results", { body: {} });
}
