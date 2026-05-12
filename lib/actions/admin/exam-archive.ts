"use server";

// 기출 보관함 권한 관리 Server Actions
// (lib/actions/admin/lectures.ts 패턴 미러)

import { requireAdmin } from "@/lib/auth";
import { RPC, T } from "@/lib/constants/tables";
import type {
  ExamArchiveAccessStats,
  ExamArchiveAccessUser,
  ExamArchiveUserSearchResult,
} from "@/lib/types/admin";

// ── 통계 ──

export async function getExamArchiveAccessStats(): Promise<ExamArchiveAccessStats> {
  const { supabase } = await requireAdmin();
  const { count } = await supabase
    .from(T.exam_archive_access)
    .select("*", { count: "exact", head: true });
  return { active: count ?? 0 };
}

// ── 권한 보유자 목록 ──

export async function getExamArchiveAccessUsers(): Promise<ExamArchiveAccessUser[]> {
  const { supabase } = await requireAdmin();

  const { data: rows, error } = await supabase
    .from(T.exam_archive_access)
    .select("user_id, granted_by, granted_at, note")
    .order("granted_at", { ascending: false });

  if (error || !rows || rows.length === 0) return [];

  const userIds = rows.map((r) => r.user_id);
  const granterIds = Array.from(
    new Set(rows.map((r) => r.granted_by).filter(Boolean))
  ) as string[];
  const allProfileIds = Array.from(new Set([...userIds, ...granterIds]));

  const { data: profiles } = await supabase
    .from(T.profiles)
    .select("id, email, display_name")
    .in("id", allProfileIds);

  const profileMap = new Map(
    (profiles || []).map((p) => [
      p.id,
      { email: p.email || "", display_name: p.display_name },
    ])
  );

  return rows.map((r) => {
    const target = profileMap.get(r.user_id);
    const granter = r.granted_by ? profileMap.get(r.granted_by) : null;
    return {
      user_id: r.user_id,
      email: target?.email || "",
      display_name: target?.display_name ?? null,
      granted_at: r.granted_at,
      granted_by_email: granter?.email ?? null,
      note: r.note,
    };
  });
}

// ── 이메일 검색 ──

export async function searchUserForExamArchive(
  email: string
): Promise<{ user: ExamArchiveUserSearchResult | null; error?: string }> {
  if (!email.trim()) return { user: null, error: "이메일을 입력해주세요" };

  const { supabase } = await requireAdmin();

  const { data, error } = await supabase.rpc(RPC.find_user_by_email, {
    p_email: email.trim().toLowerCase(),
  });

  if (error) return { user: null, error: "검색 중 오류가 발생했습니다" };
  if (!data || data.length === 0)
    return { user: null, error: "해당 이메일로 가입된 사용자가 없습니다" };

  const found = data[0] as {
    user_id: string;
    email: string;
    display_name: string | null;
    current_plan: string;
  };

  const { data: access } = await supabase
    .from(T.exam_archive_access)
    .select("user_id")
    .eq("user_id", found.user_id)
    .maybeSingle();

  return {
    user: {
      user_id: found.user_id,
      email: found.email,
      display_name: found.display_name,
      current_plan: found.current_plan,
      has_exam_archive_access: !!access,
    },
  };
}

// ── 권한 부여 ──

export async function grantExamArchiveAccess(params: {
  userId: string;
  note?: string;
}) {
  const { supabase, userId: adminId, userEmail } = await requireAdmin();

  const { error } = await supabase.from(T.exam_archive_access).upsert(
    {
      user_id: params.userId,
      granted_by: adminId,
      granted_at: new Date().toISOString(),
      note: params.note ?? null,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return { success: false, error: `권한 부여 실패: ${error.message}` };
  }

  await supabase.from(T.admin_audit_log).insert({
    admin_id: adminId,
    admin_email: userEmail,
    action: "exam_archive_access_grant",
    target_type: "user",
    target_id: params.userId,
    details: { note: params.note ?? null },
  });

  return { success: true };
}

// ── 권한 회수 (단건) ──

export async function revokeExamArchiveAccess(targetUserId: string) {
  const { supabase, userId: adminId, userEmail } = await requireAdmin();

  const { error } = await supabase
    .from(T.exam_archive_access)
    .delete()
    .eq("user_id", targetUserId);

  if (error) {
    return { success: false, error: `권한 회수 실패: ${error.message}` };
  }

  await supabase.from(T.admin_audit_log).insert({
    admin_id: adminId,
    admin_email: userEmail,
    action: "exam_archive_access_revoke",
    target_type: "user",
    target_id: targetUserId,
    details: {},
  });

  return { success: true };
}

// ── 권한 회수 (일괄) ──

export async function bulkRevokeExamArchiveAccess(targetUserIds: string[]) {
  if (targetUserIds.length === 0) {
    return { revoked: 0, failed: 0 };
  }

  const { supabase, userId: adminId, userEmail } = await requireAdmin();

  const { error, count } = await supabase
    .from(T.exam_archive_access)
    .delete({ count: "exact" })
    .in("user_id", targetUserIds);

  const revoked = error ? 0 : count ?? 0;
  const failed = error ? targetUserIds.length : 0;

  if (revoked > 0) {
    await supabase.from(T.admin_audit_log).insert({
      admin_id: adminId,
      admin_email: userEmail,
      action: "exam_archive_access_bulk_revoke",
      target_type: "user",
      target_id: null,
      details: { user_ids: targetUserIds, revoked, failed },
    });
  }

  return { revoked, failed };
}
