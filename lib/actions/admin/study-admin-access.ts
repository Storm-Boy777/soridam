"use server";

// 스터디 모임 관리자 권한 Server Actions (lectures 패턴 복제 — 090 마이그)

import { requireAdmin } from "@/lib/auth";
import { RPC, T } from "@/lib/constants/tables";
import type {
  StudyAdminAccessStats,
  StudyAdminAccessUser,
  StudyAdminUserSearchResult,
} from "@/lib/types/admin";

// ── 통계 ──

export async function getStudyAdminAccessStats(): Promise<StudyAdminAccessStats> {
  const { supabase } = await requireAdmin();
  const { count } = await supabase
    .from(T.study_admin_access)
    .select("*", { count: "exact", head: true });
  return { active: count ?? 0 };
}

// ── 권한 보유자 목록 ──

export async function getStudyAdminAccessUsers(): Promise<StudyAdminAccessUser[]> {
  const { supabase } = await requireAdmin();

  const { data: rows, error } = await supabase
    .from(T.study_admin_access)
    .select("user_id, granted_by, granted_at, note")
    .order("granted_at", { ascending: false });

  if (error || !rows || rows.length === 0) return [];

  // user_id 기준 profiles 조회 (분리 쿼리 — RLS 재귀 방지 패턴)
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

// ── 이메일 또는 닉네임 검색 (부여 전 확인용) ──
// @ 포함 → 이메일 정확 매치 (단일 결과)
// 그 외 → 닉네임 정확 매치 우선, 부분 매치는 최대 10명
// 반환: users 배열 (UI에서 0/1/N 분기)

export async function searchUserForStudyAdmin(
  query: string
): Promise<{ users: StudyAdminUserSearchResult[]; error?: string }> {
  const q = query.trim();
  if (!q) return { users: [], error: "이메일 또는 닉네임을 입력해주세요" };

  const { supabase } = await requireAdmin();

  type ProfileRow = {
    id: string;
    email: string | null;
    display_name: string | null;
  };
  let rows: ProfileRow[] = [];

  if (q.includes("@")) {
    const { data } = await supabase
      .from(T.profiles)
      .select("id, email, display_name")
      .eq("email", q.toLowerCase())
      .maybeSingle();
    if (data) rows = [data];
  } else {
    const { data: exact } = await supabase
      .from(T.profiles)
      .select("id, email, display_name")
      .eq("display_name", q)
      .limit(10);
    if (exact && exact.length > 0) {
      rows = exact;
    } else {
      const { data: partial } = await supabase
        .from(T.profiles)
        .select("id, email, display_name")
        .ilike("display_name", `%${q}%`)
        .order("display_name", { ascending: true })
        .limit(10);
      rows = partial ?? [];
    }
  }

  if (rows.length === 0) {
    return {
      users: [],
      error: q.includes("@")
        ? "해당 이메일로 가입된 사용자가 없습니다"
        : "해당 닉네임의 사용자를 찾을 수 없습니다",
    };
  }

  const userIds = rows.map((r) => r.id);
  const { data: accesses } = await supabase
    .from(T.study_admin_access)
    .select("user_id")
    .in("user_id", userIds);
  const accessSet = new Set((accesses ?? []).map((a) => a.user_id as string));

  return {
    users: rows.map((r) => ({
      user_id: r.id,
      email: r.email || "",
      display_name: r.display_name,
      current_plan: "",
      has_study_admin_access: accessSet.has(r.id),
    })),
  };
}

// ── 권한 부여 ──

export async function grantStudyAdminAccess(params: {
  userId: string;
  note?: string;
}) {
  const { supabase, userId: adminId, userEmail } = await requireAdmin();

  const { error } = await supabase.from(T.study_admin_access).upsert(
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
    action: "study_admin_access_grant",
    target_type: "user",
    target_id: params.userId,
    details: { note: params.note ?? null },
  });

  return { success: true };
}

// ── 권한 회수 (단건) ──

export async function revokeStudyAdminAccess(targetUserId: string) {
  const { supabase, userId: adminId, userEmail } = await requireAdmin();

  const { error } = await supabase
    .from(T.study_admin_access)
    .delete()
    .eq("user_id", targetUserId);

  if (error) {
    return { success: false, error: `권한 회수 실패: ${error.message}` };
  }

  await supabase.from(T.admin_audit_log).insert({
    admin_id: adminId,
    admin_email: userEmail,
    action: "study_admin_access_revoke",
    target_type: "user",
    target_id: targetUserId,
    details: {},
  });

  return { success: true };
}

// ── 권한 회수 (일괄) ──

export async function bulkRevokeStudyAdminAccess(targetUserIds: string[]) {
  if (targetUserIds.length === 0) {
    return { revoked: 0, failed: 0 };
  }

  const { supabase, userId: adminId, userEmail } = await requireAdmin();

  const { error, count } = await supabase
    .from(T.study_admin_access)
    .delete({ count: "exact" })
    .in("user_id", targetUserIds);

  const revoked = error ? 0 : count ?? 0;
  const failed = error ? targetUserIds.length : 0;

  if (revoked > 0) {
    await supabase.from(T.admin_audit_log).insert({
      admin_id: adminId,
      admin_email: userEmail,
      action: "study_admin_access_bulk_revoke",
      target_type: "user",
      target_id: null,
      details: { user_ids: targetUserIds, revoked, failed },
    });
  }

  return { revoked, failed };
}
