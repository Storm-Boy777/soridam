"use server";

// 오픈 베타 관리자 Server Actions

import { requireAdmin } from "@/lib/auth";
import type { BetaApplication, BetaStats, PaginatedResult } from "@/lib/types/admin";

// ── 베타 통계 ──

export async function getBetaStats(): Promise<BetaStats> {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.rpc("get_beta_stats");
  return data ?? { total: 0, approved: 0, pending: 0, rejected: 0, remaining: 100 };
}

// ── 베타 신청 목록 ──

export async function getBetaApplications(params: {
  page?: number;
  pageSize?: number;
  status?: string; // 'all' | 'pending' | 'approved' | 'rejected'
}): Promise<PaginatedResult<BetaApplication>> {
  const { supabase } = await requireAdmin();
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  // 신청 목록 조회
  let query = supabase
    .from("beta_applications")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  const { data: apps, count, error } = await query;
  if (error || !apps) {
    return { data: [], total: 0, page, pageSize };
  }

  // user 정보 매핑 (profiles 조인)
  const userIds = apps.map((a: { user_id: string }) => a.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", userIds);

  // auth.users에서 이메일 가져오기
  const enriched: BetaApplication[] = [];
  for (const app of apps) {
    const profile = profiles?.find((p: { id: string }) => p.id === app.user_id);
    // service role로 개별 사용자 이메일 조회
    const { data: { user } } = await supabase.auth.admin.getUserById(app.user_id);
    enriched.push({
      id: app.id,
      user_id: app.user_id,
      user_email: user?.email ?? "—",
      user_name: profile?.display_name ?? null,
      kakao_nickname: app.kakao_nickname,
      status: app.status,
      rejected_reason: app.rejected_reason,
      reviewed_at: app.reviewed_at,
      created_at: app.created_at,
    });
  }

  return { data: enriched, total: count ?? 0, page, pageSize };
}

// ── 베타 승인 ──

export async function approveBeta(applicationId: string) {
  const { supabase, userId, userEmail } = await requireAdmin();

  const { data, error } = await supabase.rpc("approve_beta_application", {
    p_application_id: applicationId,
    p_admin_id: userId,
  });

  if (error) {
    return { success: false, error: "승인 처리 중 오류가 발생했습니다" };
  }

  if (!data?.success) {
    return { success: false, error: data?.error ?? "승인에 실패했습니다" };
  }

  // 감사 로그
  await supabase.from("admin_audit_log").insert({
    admin_id: userId,
    admin_email: userEmail,
    action: "beta_approve",
    target_type: "beta_application",
    target_id: applicationId,
    details: { user_id: data.user_id, remaining: data.remaining },
  });

  return { success: true, remaining: data.remaining };
}

// ── 베타 거절 ──

export async function rejectBeta(applicationId: string, reason: string) {
  const { supabase, userId, userEmail } = await requireAdmin();

  const { error } = await supabase
    .from("beta_applications")
    .update({
      status: "rejected",
      rejected_reason: reason,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", applicationId)
    .eq("status", "pending");

  if (error) {
    return { success: false, error: "거절 처리 중 오류가 발생했습니다" };
  }

  // 감사 로그
  await supabase.from("admin_audit_log").insert({
    admin_id: userId,
    admin_email: userEmail,
    action: "beta_reject",
    target_type: "beta_application",
    target_id: applicationId,
    details: { reason },
  });

  return { success: true };
}
