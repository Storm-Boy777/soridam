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

// 체크인
export async function checkinMember(memberId: string) {
  return callEdgeFunction("event-attendance-checkin", {
    body: { member_id: memberId },
  });
}

// 참석 현황 조회
export async function fetchAttendanceStatus() {
  return callEdgeFunction("event-attendance-status", { body: {} });
}

// 참석 초기화
export async function resetAttendance(memberIds?: string[]) {
  return callEdgeFunction("event-attendance-reset", {
    body: { member_ids: memberIds },
  });
}
