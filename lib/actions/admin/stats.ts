"use server";

import { requireAdmin } from "@/lib/auth";
import type {
  AdminDashboardStats,
  RecentActivity,
  DailyTrend,
  ConversionMetrics,
} from "@/lib/types/admin";

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const { supabase } = await requireAdmin();

  const today = new Date().toISOString().split("T")[0];

  const [usersRes, dauRes, revenueRes, evalsRes] = await Promise.all([
    // 총 회원 수
    supabase.from("user_credits").select("*", { count: "exact", head: true }),
    // 오늘 로그인한 사용자 (DAU RPC)
    supabase.rpc("get_dau_count", { target_date: today }),
    // 총 매출 (성공 결제)
    supabase.from("orders").select("amount").eq("status", "paid"),
    // 평가 대기 중인 모의고사 답변
    supabase
      .from("mock_test_answers")
      .select("*", { count: "exact", head: true })
      .not("eval_status", "in", '("complete","skipped")'),
  ]);

  // 에러 로깅
  if (usersRes.error) console.error("[AdminStats] users query failed:", usersRes.error.message);
  if (dauRes.error) console.error("[AdminStats] DAU query failed:", dauRes.error.message);
  if (revenueRes.error) console.error("[AdminStats] revenue query failed:", revenueRes.error.message);
  if (evalsRes.error) console.error("[AdminStats] evals query failed:", evalsRes.error.message);

  const dauCount = (dauRes.data as { count: number }[] | null)?.[0]?.count ?? 0;

  const totalRevenue = (revenueRes.data || []).reduce(
    (sum: number, o: { amount?: number }) => sum + (o.amount || 0),
    0
  );

  return {
    totalUsers: usersRes.count || 0,
    dauToday: Number(dauCount),
    totalRevenue,
    pendingEvals: evalsRes.count || 0,
  };
}

export async function getRecentActivity(): Promise<RecentActivity[]> {
  const { supabase } = await requireAdmin();

  // 최근 활동 — 여러 소스에서 모아 시간순 정렬
  const [ordersRes, sessionsRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id, product_name, amount, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("mock_test_sessions")
      .select("id, mode, status, started_at")
      .order("started_at", { ascending: false })
      .limit(5),
  ]);

  const activities: RecentActivity[] = [];

  for (const o of ordersRes.data || []) {
    activities.push({
      id: o.id,
      type: "order",
      description: `${o.product_name} — ${o.amount?.toLocaleString()}원 (${o.status})`,
      created_at: o.created_at,
    });
  }

  for (const s of sessionsRes.data || []) {
    activities.push({
      id: s.id,
      type: "mock_exam",
      description: `모의고사 ${s.mode === "test" ? "실전" : "훈련"} — ${s.status}`,
      created_at: s.started_at,
    });
  }

  // 시간순 정렬 (최신 먼저)
  activities.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return activities.slice(0, 10);
}

export async function getConversionMetrics(): Promise<ConversionMetrics> {
  const { supabase } = await requireAdmin();

  const [
    totalUsersRes,
    paidUsersRes,
    planUsersRes,
    avgOrderRes,
    mockUsersRes,
    scriptUsersRes,
    tutoringUsersRes,
  ] = await Promise.all([
    // 전체 회원
    supabase.from("user_credits").select("*", { count: "exact", head: true }),
    // 1회 이상 결제한 사용자 (DISTINCT user_id) — 최대 5000건
    supabase.from("orders").select("user_id").eq("status", "paid").limit(5000),
    // 현재 유료 플랜 사용자
    supabase
      .from("user_credits")
      .select("*", { count: "exact", head: true })
      .neq("current_plan", "free"),
    // 평균 주문 금액
    supabase.from("orders").select("amount").eq("status", "paid"),
    // 모의고사 1회+ 응시자 — 최대 5000건
    supabase.from("mock_test_sessions").select("user_id").limit(5000),
    // 스크립트 1회+ 생성자 — 최대 5000건
    supabase.from("scripts").select("user_id").limit(5000),
    // 튜터링 1회+ 사용자 — 최대 5000건
    supabase.from("tutoring_sessions").select("user_id").limit(5000),
  ]);

  const totalUsers = totalUsersRes.count || 0;

  // DISTINCT user_id 계산
  const paidUsers = new Set((paidUsersRes.data || []).map((r) => r.user_id)).size;
  const mockExamUsers = new Set((mockUsersRes.data || []).map((r) => r.user_id)).size;
  const scriptUsers = new Set((scriptUsersRes.data || []).map((r) => r.user_id)).size;
  const tutoringUsers = new Set((tutoringUsersRes.data || []).map((r) => r.user_id)).size;

  const orders = avgOrderRes.data || [];
  const avgOrderValue = orders.length > 0
    ? Math.round(orders.reduce((sum, o) => sum + (o.amount || 0), 0) / orders.length)
    : 0;

  const safe = (n: number) => (totalUsers > 0 ? Math.round((n / totalUsers) * 1000) / 10 : 0);

  return {
    totalUsers,
    paidUsers,
    planUsers: planUsersRes.count || 0,
    conversionRate: safe(paidUsers),
    planRate: safe(planUsersRes.count || 0),
    avgOrderValue,
    mockExamUsers,
    scriptUsers,
    tutoringUsers,
    mockExamRate: safe(mockExamUsers),
    scriptRate: safe(scriptUsers),
    tutoringRate: safe(tutoringUsers),
  };
}

/**
 * 일별 추이 데이터 조회
 * DB에서 최근 N일 데이터를 가져와 클라이언트에서 일별 집계
 */
export async function getDailyTrends(days: number = 30): Promise<DailyTrend[]> {
  const { supabase } = await requireAdmin();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startIso = startDate.toISOString();

  const [signupsRes, ordersRes, mockRes, scriptsRes, tutoringRes] =
    await Promise.all([
      supabase
        .from("user_credits")
        .select("created_at")
        .gte("created_at", startIso)
        .limit(10000),
      supabase
        .from("orders")
        .select("amount, created_at")
        .eq("status", "paid")
        .gte("created_at", startIso)
        .limit(10000),
      supabase
        .from("mock_test_sessions")
        .select("started_at")
        .gte("started_at", startIso)
        .limit(10000),
      supabase
        .from("scripts")
        .select("created_at")
        .gte("created_at", startIso)
        .limit(10000),
      supabase
        .from("tutoring_sessions")
        .select("created_at")
        .gte("created_at", startIso)
        .limit(10000),
    ]);

  // days일 동안의 날짜 배열 생성
  const dateMap = new Map<string, DailyTrend>();
  for (let i = days; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0]; // "2026-03-01"
    dateMap.set(key, {
      date: key,
      signups: 0,
      revenue: 0,
      mockExams: 0,
      scripts: 0,
      tutoring: 0,
    });
  }

  // 각 데이터를 날짜별로 카운트
  for (const row of signupsRes.data || []) {
    const key = row.created_at?.split("T")[0];
    if (key && dateMap.has(key)) dateMap.get(key)!.signups++;
  }

  // orders — amount 합산
  for (const row of ordersRes.data || []) {
    const key = row.created_at?.split("T")[0];
    if (key && dateMap.has(key)) dateMap.get(key)!.revenue += row.amount || 0;
  }

  // mock_test_sessions
  for (const row of mockRes.data || []) {
    const key = row.started_at?.split("T")[0];
    if (key && dateMap.has(key)) dateMap.get(key)!.mockExams++;
  }

  // scripts
  for (const row of scriptsRes.data || []) {
    const key = row.created_at?.split("T")[0];
    if (key && dateMap.has(key)) dateMap.get(key)!.scripts++;
  }

  // tutoring_sessions
  for (const row of tutoringRes.data || []) {
    const key = row.created_at?.split("T")[0];
    if (key && dateMap.has(key)) dateMap.get(key)!.tutoring++;
  }

  return [...dateMap.values()];
}
