"use server";

import { requireAdmin } from "@/lib/auth";
import type {
  AdminTutoringSession,
  AdminTutoringDetail,
  TutoringStats,
  PaginatedResult,
} from "@/lib/types/admin";

// ── 튜터링 통계 ──

export async function getTutoringStats(): Promise<TutoringStats> {
  const { supabase } = await requireAdmin();

  const [sessionsRes, focusesRes] = await Promise.all([
    supabase.from("tutoring_sessions").select("status, current_stable_level, tokens_used"),
    supabase.from("tutoring_focuses").select("status"),
  ]);

  const sessions = sessionsRes.data || [];
  const focuses = focusesRes.data || [];

  // 상태별 분포
  const statusDistribution: Record<string, number> = {};
  const levelDistribution: Record<string, number> = {};
  let totalTokens = 0;

  for (const s of sessions) {
    if (s.status) statusDistribution[s.status] = (statusDistribution[s.status] || 0) + 1;
    if (s.current_stable_level) levelDistribution[s.current_stable_level] = (levelDistribution[s.current_stable_level] || 0) + 1;
    totalTokens += s.tokens_used || 0;
  }

  // 포커스 졸업률
  const graduatedFocuses = focuses.filter((f) => f.status === "graduated").length;
  const totalFocuses = focuses.length;

  return {
    totalSessions: sessions.length,
    activeSessions: statusDistribution["active"] || 0,
    completedSessions: statusDistribution["completed"] || 0,
    diagnosingSessions: (statusDistribution["diagnosing"] || 0) + (statusDistribution["diagnosed"] || 0),
    avgTokensUsed: sessions.length > 0 ? Math.round(totalTokens / sessions.length) : 0,
    focusGraduationRate: totalFocuses > 0 ? Math.round((graduatedFocuses / totalFocuses) * 100) : 0,
    statusDistribution,
    levelDistribution,
  };
}

// ── 튜터링 세션 목록 ──

export async function getTutoringSessions(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
}): Promise<PaginatedResult<AdminTutoringSession>> {
  const { supabase } = await requireAdmin();
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const offset = (page - 1) * pageSize;

  // 세션 목록 조회
  let query = supabase
    .from("tutoring_sessions")
    .select("id, user_id, status, current_stable_level, final_target_level, created_at, completed_at, tokens_used", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  const { data: sessions, count } = await query;

  if (!sessions || sessions.length === 0) {
    return { data: [], total: count || 0, page, pageSize };
  }

  // 사용자 이메일 조회
  const userIds = [...new Set(sessions.map((s) => s.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email")
    .in("id", userIds);

  const emailMap = new Map((profiles || []).map((p) => [p.id, p.email]));

  // 포커스 수 조회
  const sessionIds = sessions.map((s) => s.id);
  const { data: focuses } = await supabase
    .from("tutoring_focuses")
    .select("session_id, status")
    .in("session_id", sessionIds);

  const focusCountMap = new Map<string, { total: number; graduated: number }>();
  for (const f of focuses || []) {
    const entry = focusCountMap.get(f.session_id) || { total: 0, graduated: 0 };
    entry.total++;
    if (f.status === "graduated") entry.graduated++;
    focusCountMap.set(f.session_id, entry);
  }

  // 이메일 검색 필터
  let result: AdminTutoringSession[] = sessions.map((s) => ({
    id: s.id,
    user_id: s.user_id,
    user_email: emailMap.get(s.user_id) || "",
    status: s.status,
    current_stable_level: s.current_stable_level,
    final_target_level: s.final_target_level,
    created_at: s.created_at,
    completed_at: s.completed_at,
    focus_count: focusCountMap.get(s.id)?.total || 0,
    graduated_count: focusCountMap.get(s.id)?.graduated || 0,
    tokens_used: s.tokens_used || 0,
  }));

  if (params.search) {
    const keyword = params.search.toLowerCase();
    result = result.filter((s) => s.user_email.toLowerCase().includes(keyword));
  }

  return { data: result, total: count || 0, page, pageSize };
}

// ── 튜터링 세션 상세 ──

export async function getTutoringSessionDetail(sessionId: string): Promise<{ data: AdminTutoringDetail | null; error?: string }> {
  const { supabase } = await requireAdmin();

  // 세션 기본 정보
  const { data: session } = await supabase
    .from("tutoring_sessions")
    .select("id, user_id, status, current_stable_level, final_target_level, created_at, completed_at, tokens_used")
    .eq("id", sessionId)
    .single();

  if (!session) return { data: null, error: "세션을 찾을 수 없습니다." };

  // 사용자 이메일
  const { data: profile } = await supabase.from("profiles").select("email").eq("id", session.user_id).single();

  // 포커스, 드릴, 시도, 재평가 병렬 조회
  const [focusesRes, drillsRes, retestsRes] = await Promise.all([
    supabase.from("tutoring_focuses").select("id, label, focus_code, priority_rank, status, drill_pass_count, retest_pass_count").eq("session_id", sessionId).order("priority_rank"),
    supabase.from("tutoring_drills").select("id, focus_id, question_number, question_english, status").in(
      "focus_id",
      // 서브쿼리 대신 2단계 조회
      (await supabase.from("tutoring_focuses").select("id").eq("session_id", sessionId)).data?.map((f) => f.id) || []
    ).order("question_number"),
    supabase.from("tutoring_retests").select("id, focus_id, overall_result, created_at").in(
      "focus_id",
      (await supabase.from("tutoring_focuses").select("id").eq("session_id", sessionId)).data?.map((f) => f.id) || []
    ).order("created_at", { ascending: false }),
  ]);

  // 드릴별 시도 횟수 조회
  const drillIds = (drillsRes.data || []).map((d) => d.id);
  const { data: attempts } = drillIds.length > 0
    ? await supabase.from("tutoring_attempts").select("drill_id").in("drill_id", drillIds)
    : { data: [] };

  const attemptCountMap = new Map<string, number>();
  for (const a of attempts || []) {
    attemptCountMap.set(a.drill_id, (attemptCountMap.get(a.drill_id) || 0) + 1);
  }

  return {
    data: {
      session: {
        id: session.id,
        user_id: session.user_id,
        user_email: profile?.email || "",
        status: session.status,
        current_stable_level: session.current_stable_level,
        final_target_level: session.final_target_level,
        created_at: session.created_at,
        completed_at: session.completed_at,
        focus_count: (focusesRes.data || []).length,
        graduated_count: (focusesRes.data || []).filter((f) => f.status === "graduated").length,
        tokens_used: session.tokens_used || 0,
      },
      focuses: (focusesRes.data || []).map((f) => ({
        id: f.id,
        label: f.label,
        focus_code: f.focus_code,
        priority_rank: f.priority_rank,
        status: f.status,
        drill_pass_count: f.drill_pass_count || 0,
        retest_pass_count: f.retest_pass_count || 0,
      })),
      drills: (drillsRes.data || []).map((d) => ({
        id: d.id,
        focus_id: d.focus_id,
        question_number: d.question_number,
        question_english: d.question_english,
        status: d.status,
        attempt_count: attemptCountMap.get(d.id) || 0,
      })),
      retests: (retestsRes.data || []).map((r) => ({
        id: r.id,
        focus_id: r.focus_id,
        overall_result: r.overall_result,
        created_at: r.created_at,
      })),
    },
  };
}
