"use server";

// 베타 관리자 Server Actions — 관리자 초대 베타

import { requireAdmin } from "@/lib/auth";
import { RPC, T } from "@/lib/constants/tables";
import type { BetaStats, BetaUser, UserSearchResult } from "@/lib/types/admin";

// ── 베타 통계 ──

export async function getBetaStats(): Promise<BetaStats> {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.rpc(RPC.get_beta_stats);
  return data ?? { active: 0, revoked: 0, total: 0 };
}

// ── 활성 베타 사용자 목록 ──

export async function getBetaUsers(): Promise<BetaUser[]> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc(RPC.get_beta_users);
  if (error || !data) return [];
  return data as BetaUser[];
}

// ── 이메일로 사용자 검색 (발급 전 확인용) ──

export async function searchUserForBeta(
  email: string
): Promise<{ user: UserSearchResult | null; error?: string }> {
  if (!email.trim()) return { user: null, error: "이메일을 입력해주세요" };

  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc(RPC.find_user_by_email, {
    p_email: email.trim().toLowerCase(),
  });

  if (error) return { user: null, error: "검색 중 오류가 발생했습니다" };
  if (!data || data.length === 0) return { user: null, error: "해당 이메일로 가입된 사용자가 없습니다" };

  return { user: data[0] as UserSearchResult };
}

// ── 베타 발급 ──

export async function grantBeta(params: {
  userId: string;
  balanceCents: number;   // 지급할 크레딧 (센트, 예: 1000 = $10)
  expiresAt: string;      // ISO 날짜 문자열
  memo?: string;
}) {
  const { supabase, userId: adminId, userEmail } = await requireAdmin();

  const { data, error } = await supabase.rpc(RPC.grant_beta_access, {
    p_user_id:      params.userId,
    p_admin_id:     adminId,
    p_balance_cents: params.balanceCents,
    p_expires_at:   params.expiresAt,
    p_memo:         params.memo ?? null,
  });

  if (error) return { success: false, error: "베타 발급 중 오류가 발생했습니다" };
  if (!data?.success) return { success: false, error: "베타 발급에 실패했습니다" };

  // 감사 로그
  await supabase.from(T.admin_audit_log).insert({
    admin_id:    adminId,
    admin_email: userEmail,
    action:      "beta_grant",
    target_type: "user",
    target_id:   params.userId,
    details: {
      balance_cents: params.balanceCents,
      expires_at:    params.expiresAt,
      memo:          params.memo,
    },
  });

  return { success: true };
}

// ── 베타 회수 (단건) ──

export async function revokeBeta(targetUserId: string) {
  const { supabase, userId: adminId, userEmail } = await requireAdmin();

  const { data, error } = await supabase.rpc(RPC.revoke_beta_access, {
    p_user_id:  targetUserId,
    p_admin_id: adminId,
  });

  if (error) return { success: false, error: "베타 회수 중 오류가 발생했습니다" };
  if (!data?.success) return { success: false, error: data?.error ?? "베타 회수에 실패했습니다" };

  // 감사 로그
  await supabase.from(T.admin_audit_log).insert({
    admin_id:    adminId,
    admin_email: userEmail,
    action:      "beta_revoke",
    target_type: "user",
    target_id:   targetUserId,
    details:     {},
  });

  return { success: true };
}

// ── 베타 일괄 회수 ──

export async function bulkRevokeBeta(targetUserIds: string[]) {
  if (!targetUserIds.length) return { success: true, revoked: 0, failed: 0 };

  const { supabase, userId: adminId, userEmail } = await requireAdmin();

  let revoked = 0;
  let failed = 0;

  for (const targetUserId of targetUserIds) {
    const { data, error } = await supabase.rpc(RPC.revoke_beta_access, {
      p_user_id:  targetUserId,
      p_admin_id: adminId,
    });
    if (!error && data?.success) {
      revoked++;
    } else {
      failed++;
    }
  }

  // 감사 로그 (일괄)
  await supabase.from(T.admin_audit_log).insert({
    admin_id:    adminId,
    admin_email: userEmail,
    action:      "beta_bulk_revoke",
    target_type: "user",
    target_id:   null,
    details:     { user_ids: targetUserIds, revoked, failed },
  });

  return { success: true, revoked, failed };
}
