"use server";

import { requireAdmin } from "@/lib/auth";
import type {
  AdminTutoringSession,
  AdminTutoringStats,
  AdminTutoringDetail,
  PaginatedResult,
} from "@/lib/types/admin";

// ── 튜터링 통계 조회 ──

export async function getAdminTutoringStats(): Promise<AdminTutoringStats> {
  const { supabase } = await requireAdmin();

  const [
    totalRes,
    activeRes,
    completedRes,
    totalPrescRes,
    completedPrescRes,
    totalTrainingRes,
    sessionsRes,
    prescriptionsRes,
  ] = await Promise.all([
    // 전체 세션 수
    supabase.from("tutoring_sessions").select("*", { count: "exact", head: true }),
    // 진행 중 세션
    supabase.from("tutoring_sessions").select("*", { count: "exact", head: true }).eq("status", "active"),
    // 완료 세션
    supabase.from("tutoring_sessions").select("*", { count: "exact", head: true }).eq("status", "completed"),
    // 전체 처방 수
    supabase.from("tutoring_prescriptions").select("*", { count: "exact", head: true }),
    // 완료 처방 수
    supabase.from("tutoring_prescriptions").select("*", { count: "exact", head: true }).eq("status", "completed"),
    // 전체 훈련 수
    supabase.from("tutoring_training_sessions").select("*", { count: "exact", head: true }),
    // 등급+상태 분포 계산용
    supabase.from("tutoring_sessions").select("target_level, status"),
    // 질문 타입 분포 계산용
    supabase.from("tutoring_prescriptions").select("question_type"),
  ]);

  // 등급별 분포
  const levelDistribution: Record<string, number> = {};
  const statusDistribution: Record<string, number> = {};
  for (const s of sessionsRes.data || []) {
    if (s.target_level) {
      levelDistribution[s.target_level] = (levelDistribution[s.target_level] || 0) + 1;
    }
    if (s.status) {
      statusDistribution[s.status] = (statusDistribution[s.status] || 0) + 1;
    }
  }

  // 질문 타입 분포
  const questionTypeDistribution: Record<string, number> = {};
  for (const p of prescriptionsRes.data || []) {
    if (p.question_type) {
      questionTypeDistribution[p.question_type] = (questionTypeDistribution[p.question_type] || 0) + 1;
    }
  }

  return {
    totalSessions: totalRes.count || 0,
    activeSessions: activeRes.count || 0,
    completedSessions: completedRes.count || 0,
    totalPrescriptions: totalPrescRes.count || 0,
    completedPrescriptions: completedPrescRes.count || 0,
    totalTrainings: totalTrainingRes.count || 0,
    levelDistribution,
    statusDistribution,
    questionTypeDistribution,
  };
}

// ── 튜터링 세션 목록 조회 ──

export async function getAdminTutoringSessions(params: {
  page?: number;
  pageSize?: number;
  status?: string;
}): Promise<PaginatedResult<AdminTutoringSession>> {
  const { supabase } = await requireAdmin();
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("tutoring_sessions")
    .select("*", { count: "exact" });

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (!data) return { data: [], total: 0, page, pageSize };

  // 사용자 이메일 조회
  const userIds = [...new Set(data.map((s) => s.user_id))];
  const emailMap = new Map<string, string>();
  for (const uid of userIds) {
    const { data: u } = await supabase.auth.admin.getUserById(uid);
    if (u?.user?.email) emailMap.set(uid, u.user.email);
  }

  const sessions: AdminTutoringSession[] = data.map((s) => ({
    id: s.id,
    user_id: s.user_id,
    user_email: emailMap.get(s.user_id) || "-",
    mock_test_session_id: s.mock_test_session_id,
    target_level: s.target_level,
    current_level: s.current_level,
    status: s.status,
    total_prescriptions: s.total_prescriptions ?? 0,
    completed_prescriptions: s.completed_prescriptions ?? 0,
    created_at: s.created_at,
    last_activity_at: s.last_activity_at,
  }));

  return { data: sessions, total: count || 0, page, pageSize };
}

// ── 튜터링 세션 상세 조회 ──

export async function getAdminTutoringDetail(
  sessionId: string
): Promise<AdminTutoringDetail | null> {
  const { supabase } = await requireAdmin();

  // 1. 세션 조회
  const { data: session, error: sessErr } = await supabase
    .from("tutoring_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (sessErr || !session) return null;

  // 2. 사용자 이메일 + 처방 목록 병렬 조회
  const [emailRes, prescRes] = await Promise.all([
    supabase.auth.admin.getUserById(session.user_id),
    supabase
      .from("tutoring_prescriptions")
      .select("id, priority, question_type, weakness_tags, status, training_count, best_score")
      .eq("session_id", sessionId)
      .order("priority"),
  ]);

  const prescriptions = (prescRes.data || []).map((p) => ({
    id: p.id,
    priority: p.priority,
    question_type: p.question_type,
    weakness_tags: Array.isArray(p.weakness_tags) ? p.weakness_tags : [],
    status: p.status,
    training_count: p.training_count ?? 0,
    best_score: p.best_score,
  }));

  // 3. 처방 ID 목록으로 최근 훈련 기록 조회
  const prescriptionIds = prescriptions.map((p) => p.id);
  let recentTrainings: AdminTutoringDetail["recentTrainings"] = [];

  if (prescriptionIds.length > 0) {
    const { data: trainings } = await supabase
      .from("tutoring_training_sessions")
      .select(
        "id, prescription_id, session_type, question_type, overall_score, screens_completed, duration_seconds, started_at, completed_at"
      )
      .in("prescription_id", prescriptionIds)
      .order("started_at", { ascending: false })
      .limit(10);

    recentTrainings = (trainings || []).map((t) => ({
      id: t.id,
      prescription_id: t.prescription_id,
      session_type: t.session_type,
      question_type: t.question_type,
      overall_score: t.overall_score,
      screens_completed: t.screens_completed ?? 0,
      duration_seconds: t.duration_seconds,
      started_at: t.started_at,
      completed_at: t.completed_at,
    }));
  }

  // 세션 데이터 매핑
  const sessionData: AdminTutoringSession = {
    id: session.id,
    user_id: session.user_id,
    user_email: emailRes.data?.user?.email || "-",
    mock_test_session_id: session.mock_test_session_id,
    target_level: session.target_level,
    current_level: session.current_level,
    status: session.status,
    total_prescriptions: session.total_prescriptions ?? 0,
    completed_prescriptions: session.completed_prescriptions ?? 0,
    created_at: session.created_at,
    last_activity_at: session.last_activity_at,
  };

  return {
    session: sessionData,
    prescriptions,
    recentTrainings,
  };
}
