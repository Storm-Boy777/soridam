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

export interface InactiveUsersStats {
  inactive7days: number;
  inactive14days: number;
  inactive30days: number;
  recentLogins: Array<{ user_id: string; email: string; last_login: string }>;
}

export async function getInactiveUsersStats(): Promise<InactiveUsersStats> {
  const { supabase } = await requireAdmin();

  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 86400000).toISOString();
  const d14 = new Date(now.getTime() - 14 * 86400000).toISOString();
  const d30 = new Date(now.getTime() - 30 * 86400000).toISOString();

  // 전체 사용자의 last_sign_in_at 조회 (Supabase Auth)
  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const users = authUsers?.users || [];

  let inactive7 = 0;
  let inactive14 = 0;
  let inactive30 = 0;

  for (const u of users) {
    const lastSign = u.last_sign_in_at;
    if (!lastSign || lastSign < d30) inactive30++;
    else if (lastSign < d14) inactive14++;
    else if (lastSign < d7) inactive7++;
  }

  // 최근 로그인 10건 (활동 로그)
  const { data: recentLogs } = await supabase
    .from(T.user_activity_log)
    .select("user_id, created_at")
    .eq("action", "login")
    .order("created_at", { ascending: false })
    .limit(10);

  // 이메일 매핑
  const userIds = [...new Set((recentLogs || []).map((l) => l.user_id))];
  const emailMap = new Map<string, string>();
  for (const uid of userIds) {
    const { data } = await supabase.auth.admin.getUserById(uid);
    if (data?.user?.email) emailMap.set(uid, data.user.email);
  }

  return {
    inactive7days: inactive7,
    inactive14days: inactive14,
    inactive30days: inactive30,
    recentLogins: (recentLogs || []).map((l) => ({
      user_id: l.user_id,
      email: emailMap.get(l.user_id) || "",
      last_login: l.created_at,
    })),
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

// ── AI 비용 & 시스템 헬스 타입 ──

export interface AICostStats {
  totalTokens: number;
  moduleBreakdown: { module: string; tokens: number; sessions: number }[];
  dailyCosts: { date: string; tokens: number }[];
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
    // 총 매출 (성공 결제)
    supabase.from(T.orders).select("amount").eq("status", "paid"),
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
      .from(T.orders)
      .select("id, product_name, amount, status, created_at")
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
  ] = await Promise.all([
    // 전체 회원
    supabase.from(T.user_credits).select("*", { count: "exact", head: true }),
    // 1회 이상 결제한 사용자 (DISTINCT user_id) — 최대 5000건
    supabase.from(T.orders).select("user_id").eq("status", "paid").limit(5000),
    // 현재 유료 플랜 사용자
    supabase
      .from(T.user_credits)
      .select("*", { count: "exact", head: true })
      .neq("current_plan", "free"),
    // 평균 주문 금액
    supabase.from(T.orders).select("amount").eq("status", "paid"),
    // 모의고사 1회+ 응시자 — 최대 5000건
    supabase.from(T.mock_test_sessions).select("user_id").limit(5000),
    // 스크립트 1회+ 생성자 — 최대 5000건
    supabase.from(T.scripts).select("user_id").limit(5000),
  ]);

  const totalUsers = totalUsersRes.count || 0;

  // DISTINCT user_id 계산
  const paidUsers = new Set((paidUsersRes.data || []).map((r) => r.user_id)).size;
  const mockExamUsers = new Set((mockUsersRes.data || []).map((r) => r.user_id)).size;
  const scriptUsers = new Set((scriptUsersRes.data || []).map((r) => r.user_id)).size;

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
    mockExamRate: safe(mockExamUsers),
    scriptRate: safe(scriptUsers),
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
        .from(T.orders)
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

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const startIso = startDate.toISOString();

  // 모듈별 토큰 사용량 병렬 조회
  const [tutoringRes, mockReportsRes, scriptsRes] = await Promise.all([
    // 튜터링 세션 토큰
    supabase.from(T.tutoring_sessions).select("tokens_used, created_at"),
    // 모의고사 리포트 (토큰 정보가 있으면)
    supabase.from(T.mock_test_reports).select("created_at").limit(5000),
    // 스크립트 생성 (토큰 추정: 1회 생성 ≈ 4000토큰)
    supabase.from(T.scripts).select("created_at").limit(5000),
  ]);

  const tutoringTokens = (tutoringRes.data || []).reduce((sum, s) => sum + (s.tokens_used || 0), 0);
  const tutoringCount = (tutoringRes.data || []).length;
  // 모의고사: 1세션(14문항) ≈ 평균 50,000 토큰 (judge+coach+report+growth)
  const mockCount = (mockReportsRes.data || []).length;
  const mockTokens = mockCount * 50000;
  // 스크립트: 1회 ≈ 4,000 토큰
  const scriptCount = (scriptsRes.data || []).length;
  const scriptTokens = scriptCount * 4000;

  // 일별 토큰 추이 (최근 30일)
  const dateMap = new Map<string, number>();
  for (let i = 30; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dateMap.set(d.toISOString().split("T")[0], 0);
  }

  for (const s of tutoringRes.data || []) {
    const key = s.created_at?.split("T")[0];
    if (key && dateMap.has(key)) dateMap.set(key, (dateMap.get(key) || 0) + (s.tokens_used || 0));
  }
  for (const r of mockReportsRes.data || []) {
    const key = r.created_at?.split("T")[0];
    if (key && dateMap.has(key)) dateMap.set(key, (dateMap.get(key) || 0) + 50000);
  }
  for (const s of scriptsRes.data || []) {
    const key = s.created_at?.split("T")[0];
    if (key && dateMap.has(key)) dateMap.set(key, (dateMap.get(key) || 0) + 4000);
  }

  return {
    totalTokens: tutoringTokens + mockTokens + scriptTokens,
    moduleBreakdown: [
      { module: "모의고사", tokens: mockTokens, sessions: mockCount },
      { module: "튜터링", tokens: tutoringTokens, sessions: tutoringCount },
      { module: "스크립트", tokens: scriptTokens, sessions: scriptCount },
    ],
    dailyCosts: [...dateMap.entries()].map(([date, tokens]) => ({ date, tokens })),
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
