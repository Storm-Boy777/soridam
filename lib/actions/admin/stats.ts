"use server";

import { requireAdmin } from "@/lib/auth";
import { T } from "@/lib/constants/tables";
import type {
  AdminDashboardStats,
  RecentActivity,
  DailyTrend,
  ConversionMetrics,
} from "@/lib/types/admin";

// ── 비활성 사용자 감지 ──

export interface UserEngagementStats {
  totalUsers: number;
  // 활성 사용자 (기간별 고유 로그인)
  activeToday: number;
  activeWeek: number;
  activeMonth: number;
  // 리텐션 (가입 후 재방문)
  neverLoggedIn: number;
  // 최근 로그인 (고유 사용자, 중복 제거)
  recentLogins: Array<{
    user_id: string;
    email: string;
    display_name: string | null;
    last_login: string;
  }>;
}

export async function getUserEngagementStats(): Promise<UserEngagementStats> {
  const { supabase } = await requireAdmin();

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const week = new Date(now.getTime() - 7 * 86400000).toISOString();
  const month = new Date(now.getTime() - 30 * 86400000).toISOString();

  // 1. 전체 사용자 수
  const { count: totalCount } = await supabase
    .from(T.user_credits)
    .select("*", { count: "exact", head: true });
  const totalUsers = totalCount || 0;

  // 2. 기간별 활성 사용자 (고유 user_id) — 3개 쿼리 병렬
  const [todayRes, weekRes, monthRes] = await Promise.all([
    supabase.rpc("get_dau_count", { target_date: today.split("T")[0] }),
    supabase
      .from(T.user_activity_log)
      .select("user_id")
      .eq("action", "login")
      .gte("created_at", week),
    supabase
      .from(T.user_activity_log)
      .select("user_id")
      .eq("action", "login")
      .gte("created_at", month),
  ]);

  const activeToday = (todayRes.data as { count: number }[] | null)?.[0]?.count ?? 0;
  const activeWeek = new Set((weekRes.data || []).map((r: { user_id: string }) => r.user_id)).size;
  const activeMonth = new Set((monthRes.data || []).map((r: { user_id: string }) => r.user_id)).size;

  // 3. 한 번도 로그인 안 한 사용자
  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const neverLoggedIn = (authUsers?.users || []).filter(
    (u) => !u.last_sign_in_at
  ).length;

  // 4. 최근 로그인 (고유 사용자, 최신 로그인만)
  const { data: recentLogs } = await supabase
    .from(T.user_activity_log)
    .select("user_id, created_at")
    .eq("action", "login")
    .order("created_at", { ascending: false })
    .limit(50);

  // 고유 사용자 추출 (최신 로그인만)
  const seen = new Set<string>();
  const uniqueLogins: { user_id: string; created_at: string }[] = [];
  for (const log of recentLogs || []) {
    if (!seen.has(log.user_id)) {
      seen.add(log.user_id);
      uniqueLogins.push(log);
      if (uniqueLogins.length >= 10) break;
    }
  }

  // 프로필 매핑
  const userIds = uniqueLogins.map((l) => l.user_id);
  const { data: profiles } = await supabase
    .from(T.profiles)
    .select("id, email, display_name")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles || []).map((p) => [p.id, p])
  );

  return {
    totalUsers,
    activeToday,
    activeWeek,
    activeMonth,
    neverLoggedIn,
    recentLogins: uniqueLogins.map((l) => {
      const p = profileMap.get(l.user_id);
      return {
        user_id: l.user_id,
        email: p?.email || "",
        display_name: p?.display_name || null,
        last_login: l.created_at,
      };
    }),
  };
}

// ── 사용자 활동 로그 조회 ──

export async function getUserActivityLog(userId: string, limit: number = 20) {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from(T.user_activity_log)
    .select("action, metadata, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return data || [];
}

// ── 전체 사용자 활동 로그 ──

export interface ActivityLogEntry {
  id: number;
  user_id: string;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  // JOIN
  email?: string;
  display_name?: string | null;
}

export async function getAllActivityLogs(params: {
  action?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: ActivityLogEntry[]; total: number }> {
  const { supabase } = await requireAdmin();
  const page = params.page || 1;
  const limit = params.limit || 50;
  const offset = (page - 1) * limit;

  let query = supabase
    .from(T.user_activity_log)
    .select("*, profiles(email, display_name)", { count: "exact" });

  if (params.action) {
    query = query.eq("action", params.action);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[getAllActivityLogs]", error);
    return { data: [], total: 0 };
  }

  // profiles JOIN 결과를 flatten
  const entries: ActivityLogEntry[] = (data || []).map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    action: row.action,
    metadata: row.metadata,
    created_at: row.created_at,
    email: row.profiles?.email || "",
    display_name: row.profiles?.display_name || null,
  }));

  return { data: entries, total: count || 0 };
}

// ── AI 비용 & 시스템 헬스 타입 ──

export interface AICostStats {
  totalTokens: number;
  totalCostUsd: number;
  moduleBreakdown: { module: string; tokens: number; calls: number; costUsd: number }[];
  dailyCosts: { date: string; tokens: number; costUsd: number }[];
}

export interface SystemHealthStats {
  pendingEvals: number;
  failedEvals: number;
  avgWaitMinutes: number; // 평가 대기 평균 시간 (분)
  pipelineStatus: { stage: string; pending: number; failed: number; completed: number }[];
  storageUsage: { bucket: string; fileCount: number }[];
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const { supabase } = await requireAdmin();

  const today = new Date().toISOString().split("T")[0];

  const [usersRes, dauRes, revenueRes, evalsRes] = await Promise.all([
    // 총 회원 수
    supabase.from(T.user_credits).select("*", { count: "exact", head: true }),
    // 오늘 로그인한 사용자 (DAU RPC)
    supabase.rpc("get_dau_count", { target_date: today }),
    // 총 매출 (성공 결제) — polar_orders 사용
    supabase.from(T.polar_orders).select("amount").eq("status", "paid"),
    // 평가 대기 중인 모의고사 답변
    supabase
      .from(T.mock_test_answers)
      .select("*", { count: "exact", head: true })
      .not("eval_status", "in", '("completed","skipped")'),
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
      .from(T.polar_orders)
      .select("id, product_type, amount, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from(T.mock_test_sessions)
      .select("id, mode, status, started_at")
      .order("started_at", { ascending: false })
      .limit(5),
  ]);

  const activities: RecentActivity[] = [];

  for (const o of ordersRes.data || []) {
    activities.push({
      id: o.id,
      type: "order",
      description: `${o.product_type} — $${((o.amount || 0) / 100).toFixed(2)} (${o.status})`,
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

  // DB 레벨 DISTINCT — Supabase 행 수 제한(1000)에 영향받지 않음
  const { data, error } = await supabase.rpc("admin_conversion_metrics");
  if (error) throw new Error(`admin_conversion_metrics RPC 실패: ${error.message}`);

  const m = data as {
    total_users: number;
    paid_users: number;
    plan_users: number;
    avg_order_cents: number;
    mock_exam_users: number;
    script_users: number;
  };

  const totalUsers = m.total_users;
  const safe = (n: number) => (totalUsers > 0 ? Math.round((n / totalUsers) * 1000) / 10 : 0);

  return {
    totalUsers,
    paidUsers: m.paid_users,
    planUsers: m.plan_users,
    conversionRate: safe(m.paid_users),
    planRate: safe(m.plan_users),
    avgOrderValue: m.avg_order_cents,
    mockExamUsers: m.mock_exam_users,
    scriptUsers: m.script_users,
    mockExamRate: safe(m.mock_exam_users),
    scriptRate: safe(m.script_users),
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

  const [signupsRes, ordersRes, mockRes, scriptsRes] =
    await Promise.all([
      supabase
        .from(T.user_credits)
        .select("created_at")
        .gte("created_at", startIso)
        .limit(10000),
      supabase
        .from(T.polar_orders)
        .select("amount, created_at")
        .eq("status", "paid")
        .gte("created_at", startIso)
        .limit(10000),
      supabase
        .from(T.mock_test_sessions)
        .select("started_at")
        .gte("started_at", startIso)
        .limit(10000),
      supabase
        .from(T.scripts)
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

  return [...dateMap.values()];
}

// ── AI 비용 모니터링 ──

export async function getAICostStats(): Promise<AICostStats> {
  const { supabase } = await requireAdmin();

  // api_usage_logs 실데이터 기반 집계
  const [totalsRes, dailyRes] = await Promise.all([
    supabase.rpc("admin_ai_cost_stats"),
    supabase.rpc("admin_ai_daily_tokens", { days_back: 30 }),
  ]);

  if (totalsRes.error) throw new Error(`admin_ai_cost_stats RPC 실패: ${totalsRes.error.message}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = totalsRes.data as any;

  const moduleNameMap: Record<string, string> = {
    mock_exam: "모의고사",
    script: "스크립트",
    tutoring: "튜터링",
    shadowing: "쉐도잉",
  };

  const dailyCosts: { date: string; tokens: number; costUsd: number }[] =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((dailyRes.data || []) as any[]).map((d) => ({
      date: String(d.date),
      tokens: Number(d.tokens) || 0,
      costUsd: Number(d.cost_usd) || 0,
    }));

  return {
    totalTokens: Number(raw?.total_tokens) || 0,
    totalCostUsd: Number(raw?.total_cost_usd) || 0,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    moduleBreakdown: ((raw?.modules || []) as any[]).map((mod) => ({
      module: moduleNameMap[mod.session_type] || mod.session_type,
      tokens: Number(mod.total_tokens) || 0,
      calls: Number(mod.calls) || 0,
      costUsd: Number(mod.total_cost_usd) || 0,
    })),
    dailyCosts,
  };
}

// ── 시스템 헬스 모니터링 ──

export async function getSystemHealthStats(): Promise<SystemHealthStats> {
  const { supabase } = await requireAdmin();

  // 파이프라인 상태별 답변 수
  const { data: answers } = await supabase
    .from(T.mock_test_answers)
    .select("eval_status, created_at, updated_at")
    .limit(5000);

  const pipeline: Record<string, { pending: number; failed: number; completed: number }> = {
    "STT (음성→텍스트)": { pending: 0, failed: 0, completed: 0 },
    "Judge (체크박스)": { pending: 0, failed: 0, completed: 0 },
    "Consult (소견)": { pending: 0, failed: 0, completed: 0 },
    "Report (종합)": { pending: 0, failed: 0, completed: 0 },
  };

  let pendingCount = 0;
  let failedCount = 0;
  let totalWaitMs = 0;
  let waitItems = 0;

  for (const a of answers || []) {
    const status = a.eval_status || "pending";
    if (status === "complete" || status === "skipped") {
      pipeline["Report (종합)"].completed++;
    } else if (status === "error" || status === "failed") {
      failedCount++;
      if (status === "error") pipeline["STT (음성→텍스트)"].failed++;
      else pipeline["Judge (체크박스)"].failed++;
    } else if (status === "pending") {
      pendingCount++;
      pipeline["STT (음성→텍스트)"].pending++;
      if (a.created_at) {
        totalWaitMs += Date.now() - new Date(a.created_at).getTime();
        waitItems++;
      }
    } else if (status === "processing" || status === "stt_completed") {
      pendingCount++;
      pipeline["STT (음성→텍스트)"].completed++;
      pipeline["Judge (체크박스)"].pending++;
    } else if (status === "evaluating" || status === "judge_completed") {
      pipeline["Judge (체크박스)"].completed++;
      pipeline["Consult (소견)"].pending++;
    }
  }

  // Storage 버킷별 파일 수 (간접 추정)
  const [audioRes, mockAudioRes, tutoringAudioRes, scriptPkgRes] = await Promise.all([
    supabase.from(T.shadowing_evaluations).select("*", { count: "exact", head: true }),
    supabase.from(T.mock_test_answers).select("*", { count: "exact", head: true }).not("audio_url", "is", null),
    supabase.from(T.tutoring_attempts).select("*", { count: "exact", head: true }).not("audio_url", "is", null),
    supabase.from(T.script_packages).select("*", { count: "exact", head: true }),
  ]);

  return {
    pendingEvals: pendingCount,
    failedEvals: failedCount,
    avgWaitMinutes: waitItems > 0 ? Math.round(totalWaitMs / waitItems / 60000) : 0,
    pipelineStatus: Object.entries(pipeline).map(([stage, counts]) => ({ stage, ...counts })),
    storageUsage: [
      { bucket: "쉐도잉 녹음", fileCount: audioRes.count || 0 },
      { bucket: "모의고사 녹음", fileCount: mockAudioRes.count || 0 },
      { bucket: "튜터링 녹음", fileCount: tutoringAudioRes.count || 0 },
      { bucket: "스크립트 패키지", fileCount: scriptPkgRes.count || 0 },
    ],
  };
}

// ── 최근 가입자 ──

export interface RecentSignup {
  id: string;
  email: string;
  display_name: string | null;
  provider: string;
  created_at: string;
}

export async function getRecentSignups(
  limit: number = 5
): Promise<RecentSignup[]> {
  const { supabase } = await requireAdmin();

  // auth.admin.listUsers는 최신순 정렬을 지원하지 않으므로,
  // profiles 테이블에서 최근 가입자를 조회
  const { data } = await supabase
    .from(T.profiles)
    .select("id, email, display_name, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data || data.length === 0) return [];

  // 가입 방법 확인 (auth.users의 app_metadata.provider)
  const userIds = data.map((u) => u.id);
  const { data: authData } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });

  const providerMap = new Map<string, string>();
  if (authData?.users) {
    for (const u of authData.users) {
      if (userIds.includes(u.id)) {
        providerMap.set(
          u.id,
          u.app_metadata?.provider || u.app_metadata?.providers?.[0] || "email"
        );
      }
    }
  }

  return data.map((u) => ({
    id: u.id,
    email: u.email || "",
    display_name: u.display_name,
    provider: providerMap.get(u.id) || "email",
    created_at: u.created_at,
  }));
}
