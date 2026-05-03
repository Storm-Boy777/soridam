"use server";

// 오픽 스터디 모듈 — 관리자용 Server Actions
// 설계서: docs/설계/오픽스터디.md (관리자 페이지 섹션)

import { requireAdmin } from "@/lib/auth";
import { T } from "@/lib/constants/tables";
import type {
  ActionResult,
  StudyGroup,
  StudyGroupWithStats,
  AdminGroupDetail,
  AdminGroupStats,
  CreateStudyGroupInput,
  GroupMemberWithProfile,
  GroupSchedule,
  ProfileLite,
  SessionHistoryItem,
  StudyGroupStatus,
} from "@/lib/types/opic-study";

// 일정 검증 — 형식/논리적 유효성. 통과 시 null 반환.
function validateSchedule(s: GroupSchedule): string | null {
  if (!Array.isArray(s.days) || s.days.length === 0) {
    return "운영 요일을 1개 이상 선택해주세요";
  }
  if (s.days.some((d) => d < 0 || d > 6)) {
    return "운영 요일이 유효하지 않습니다 (0~6)";
  }
  if (!/^\d{2}:\d{2}$/.test(s.start_time)) {
    return "시작 시간 형식이 올바르지 않습니다 (HH:MM)";
  }
  if (!/^\d{2}:\d{2}$/.test(s.end_time)) {
    return "종료 시간 형식이 올바르지 않습니다 (HH:MM)";
  }
  if (s.start_time >= s.end_time) {
    return "종료 시간이 시작 시간보다 늦어야 합니다";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s.first_session_date)) {
    return "첫 시작일 형식이 올바르지 않습니다 (YYYY-MM-DD)";
  }
  if (s.default_mode !== "online" && s.default_mode !== "offline") {
    return "모임 방식이 유효하지 않습니다 (온라인/오프라인)";
  }
  if (s.day_modes) {
    for (const [key, value] of Object.entries(s.day_modes)) {
      const dayNum = Number(key);
      if (!Number.isInteger(dayNum) || dayNum < 0 || dayNum > 6) {
        return "요일별 모임 방식 — 잘못된 요일 키";
      }
      if (value !== "online" && value !== "offline") {
        return "요일별 모임 방식 값이 유효하지 않습니다";
      }
    }
  }
  return null;
}

// ============================================================
// 1. 그룹 CRUD (5개)
// ============================================================

/** 그룹 목록 + 통계 */
export async function listStudyGroups(filter?: {
  status?: StudyGroupStatus;
}): Promise<ActionResult<StudyGroupWithStats[]>> {
  try {
    const { supabase } = await requireAdmin();

    let query = supabase
      .from(T.study_groups)
      .select("*")
      .order("start_date", { ascending: false });

    if (filter?.status) query = query.eq("status", filter.status);

    const { data: groups, error } = await query;
    if (error) return { error: "그룹 목록 조회 실패" };
    if (!groups || groups.length === 0) return { data: [] };

    // 각 그룹별 통계 (병렬)
    const enriched = await Promise.all(
      groups.map(async (g) => {
        const [{ count: members }, { count: active }, { count: completed }] = await Promise.all([
          supabase.from(T.study_group_members).select("*", { count: "exact", head: true }).eq("group_id", g.id),
          supabase.from(T.opic_study_sessions).select("*", { count: "exact", head: true }).eq("group_id", g.id).eq("status", "active"),
          supabase.from(T.opic_study_sessions).select("*", { count: "exact", head: true }).eq("group_id", g.id).eq("status", "completed"),
        ]);
        return {
          ...(g as StudyGroup),
          member_count: members ?? 0,
          active_session_count: active ?? 0,
          completed_session_count: completed ?? 0,
        } as StudyGroupWithStats;
      })
    );

    return { data: enriched };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "그룹 목록 조회 실패" };
  }
}

/** 그룹 상세 (멤버 + 세션 이력 + 통계) */
export async function getStudyGroupDetail(groupId: string): Promise<ActionResult<AdminGroupDetail>> {
  try {
    const { supabase } = await requireAdmin();

    // 1. 그룹 메타
    const { data: group, error: gErr } = await supabase
      .from(T.study_groups)
      .select("*")
      .eq("id", groupId)
      .single();
    if (gErr || !group) return { error: "그룹 조회 실패" };

    // 2. 멤버 목록 + profiles (profiles FK 직접 없어서 분리 쿼리)
    const { data: members, error: mErr } = await supabase
      .from(T.study_group_members)
      .select("id, group_id, user_id, display_name, joined_at")
      .eq("group_id", groupId)
      .order("joined_at", { ascending: true });
    if (mErr) return { error: "멤버 조회 실패" };

    const memberUserIds = (members ?? []).map((m) => m.user_id as string);
    const { data: profiles } = memberUserIds.length > 0
      ? await supabase
          .from(T.profiles)
          .select("id, email, display_name")
          .in("id", memberUserIds)
      : { data: [] };

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.id as string, p])
    );

    const enrichedMembers: GroupMemberWithProfile[] = (members ?? []).map((m) => {
      const p = profileMap.get(m.user_id as string);
      return {
        id: m.id as string,
        group_id: m.group_id as string,
        user_id: m.user_id as string,
        display_name: m.display_name as string | null,
        joined_at: m.joined_at as string,
        email: (p?.email as string | null) ?? null,
        user_display_name: (p?.display_name as string | null) ?? null,
      };
    });

    // 3. 세션 이력
    const { data: sessions } = await supabase
      .from(T.opic_study_sessions)
      .select("id, selected_category, selected_topic, selected_combo_sig, started_at, ended_at, status")
      .eq("group_id", groupId)
      .order("started_at", { ascending: false })
      .limit(50);

    const sessionList = await Promise.all(
      (sessions || []).map(async (s) => {
        const { count: answerCount } = await supabase
          .from(T.opic_study_answers)
          .select("*", { count: "exact", head: true })
          .eq("session_id", s.id);
        return {
          ...s,
          total_answers: answerCount ?? 0,
          member_count: enrichedMembers.length,
        } as SessionHistoryItem;
      })
    );

    // 4. 통계
    const stats = await getGroupStatsInternal(supabase, groupId, enrichedMembers.length);

    return {
      data: {
        group: group as StudyGroup,
        members: enrichedMembers,
        sessions: sessionList,
        stats,
      },
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "그룹 상세 조회 실패" };
  }
}

/** 그룹 생성 (멤버 일괄 등록 + 감사 로그) */
export async function createStudyGroup(
  input: CreateStudyGroupInput
): Promise<ActionResult<{ groupId: string }>> {
  try {
    const { supabase, userId, userEmail } = await requireAdmin();

    // 검증
    if (!input.name?.trim()) return { error: "그룹 이름이 필요합니다" };
    if (!input.start_date || !input.end_date) return { error: "기간이 필요합니다" };
    if (new Date(input.start_date) >= new Date(input.end_date)) {
      return { error: "종료일이 시작일보다 늦어야 합니다" };
    }

    // 일정 검증
    const sErr = validateSchedule(input.schedule);
    if (sErr) return { error: sErr };

    // 1. 그룹 INSERT (그룹 등급 X — 멤버 개인의 target_grade 사용)
    const { data: group, error: gErr } = await supabase
      .from(T.study_groups)
      .insert({
        name: input.name.trim(),
        start_date: input.start_date,
        end_date: input.end_date,
        description: input.description?.trim() || null,
        schedule: input.schedule,
        created_by: userId,
      })
      .select("id")
      .single();
    if (gErr || !group) return { error: "그룹 생성 실패" };

    // 2. 멤버 일괄 INSERT
    if (input.member_user_ids.length > 0) {
      const rows = input.member_user_ids.map((uid) => ({
        group_id: group.id,
        user_id: uid,
      }));
      const { error: mErr } = await supabase.from(T.study_group_members).insert(rows);
      if (mErr) {
        // 그룹은 만들어졌으니 경고만
        console.error("멤버 일괄 등록 일부 실패:", mErr);
      }
    }

    // 3. 감사 로그
    await supabase.from(T.admin_audit_log).insert({
      admin_id: userId,
      admin_email: userEmail,
      action: "create_study_group",
      target_type: "study_group",
      target_id: group.id,
      details: {
        name: input.name,
        member_count: input.member_user_ids.length,
      },
    });

    return { data: { groupId: group.id } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "그룹 생성 실패" };
  }
}

/** 그룹 수정 (이름/기간/설명/상태/일정) */
export async function updateStudyGroup(
  groupId: string,
  patch: Partial<
    Pick<
      StudyGroup,
      "name" | "start_date" | "end_date" | "description" | "status" | "schedule"
    >
  >
): Promise<ActionResult> {
  try {
    const { supabase, userId, userEmail } = await requireAdmin();

    // 일정 검증 (schedule이 patch에 포함된 경우만)
    if (patch.schedule !== undefined && patch.schedule !== null) {
      const sErr = validateSchedule(patch.schedule);
      if (sErr) return { error: sErr };
    }

    // 변경 전 상태 조회 (감사 로그용)
    const { data: before } = await supabase.from(T.study_groups).select("*").eq("id", groupId).single();
    if (!before) return { error: "그룹을 찾을 수 없습니다" };

    const { error } = await supabase.from(T.study_groups).update(patch).eq("id", groupId);
    if (error) return { error: "그룹 수정 실패" };

    // 감사 로그
    await supabase.from(T.admin_audit_log).insert({
      admin_id: userId,
      admin_email: userEmail,
      action: "update_study_group",
      target_type: "study_group",
      target_id: groupId,
      details: {
        changed_fields: Object.keys(patch),
        before: Object.fromEntries(Object.keys(patch).map((k) => [k, (before as Record<string, unknown>)[k]])),
        after: patch,
      },
    });

    return { data: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "그룹 수정 실패" };
  }
}

/** 그룹 종료 (status='closed') */
export async function closeStudyGroup(groupId: string, reason?: string): Promise<ActionResult> {
  try {
    const { supabase, userId, userEmail } = await requireAdmin();

    const { error } = await supabase
      .from(T.study_groups)
      .update({ status: "closed" })
      .eq("id", groupId);
    if (error) return { error: "그룹 종료 실패" };

    await supabase.from(T.admin_audit_log).insert({
      admin_id: userId,
      admin_email: userEmail,
      action: "close_study_group",
      target_type: "study_group",
      target_id: groupId,
      details: { reason: reason ?? null },
    });

    return { data: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "그룹 종료 실패" };
  }
}

/** 그룹 재활성화 (closed → active) */
export async function reopenStudyGroup(groupId: string): Promise<ActionResult> {
  try {
    const { supabase, userId, userEmail } = await requireAdmin();

    const { error } = await supabase
      .from(T.study_groups)
      .update({ status: "active" })
      .eq("id", groupId);
    if (error) return { error: "그룹 재활성화 실패" };

    await supabase.from(T.admin_audit_log).insert({
      admin_id: userId,
      admin_email: userEmail,
      action: "reopen_study_group",
      target_type: "study_group",
      target_id: groupId,
      details: {},
    });

    return { data: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "그룹 재활성화 실패" };
  }
}

/**
 * 그룹 영구 삭제
 *
 * FK CASCADE로 다음이 함께 삭제됨:
 * - study_group_members (멤버)
 * - opic_study_sessions (세션)
 * - opic_study_answers (답변)
 * - Storage `opic-study-recordings/{groupId}/...` 녹음은 별도 정리 X (필요 시 수동/배치)
 */
export async function deleteStudyGroup(groupId: string): Promise<ActionResult<{ deleted: true }>> {
  try {
    const { supabase, userId, userEmail } = await requireAdmin();

    // 감사 로그용으로 삭제 전 메타 + 카운트 수집
    const { data: group } = await supabase
      .from(T.study_groups)
      .select("name, status, start_date, end_date")
      .eq("id", groupId)
      .single();
    if (!group) return { error: "그룹을 찾을 수 없습니다" };

    const [{ count: memberCount }, { count: sessionCount }] = await Promise.all([
      supabase.from(T.study_group_members).select("*", { count: "exact", head: true }).eq("group_id", groupId),
      supabase.from(T.opic_study_sessions).select("*", { count: "exact", head: true }).eq("group_id", groupId),
    ]);

    const { error } = await supabase.from(T.study_groups).delete().eq("id", groupId);
    if (error) return { error: "그룹 삭제 실패" };

    await supabase.from(T.admin_audit_log).insert({
      admin_id: userId,
      admin_email: userEmail,
      action: "delete_study_group",
      target_type: "study_group",
      target_id: groupId,
      details: {
        name: group.name,
        status: group.status,
        period: `${group.start_date} ~ ${group.end_date}`,
        deleted_member_count: memberCount ?? 0,
        deleted_session_count: sessionCount ?? 0,
      },
    });

    return { data: { deleted: true } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "그룹 삭제 실패" };
  }
}

// ============================================================
// 2. 멤버 CRUD (3개)
// ============================================================

/** 회원 풀 검색 (이메일 / 표시명) */
export async function searchMemberCandidates(query: string): Promise<ActionResult<ProfileLite[]>> {
  try {
    const { supabase } = await requireAdmin();
    const q = query.trim();
    if (!q) return { data: [] };

    const { data, error } = await supabase
      .from(T.profiles)
      .select("id, email, display_name")
      .or(`email.ilike.%${q}%,display_name.ilike.%${q}%`)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) return { error: "회원 검색 실패" };

    const result: ProfileLite[] = (data || []).map((p) => ({
      user_id: p.id as string,
      email: (p.email as string | null) || "",
      display_name: (p.display_name as string | null) || null,
    }));

    return { data: result };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "회원 검색 실패" };
  }
}

/** 그룹 멤버 일괄 추가 */
export async function addGroupMembers(
  groupId: string,
  userIds: string[]
): Promise<ActionResult<{ added: number }>> {
  try {
    const { supabase, userId, userEmail } = await requireAdmin();
    if (userIds.length === 0) return { data: { added: 0 } };

    const rows = userIds.map((uid) => ({ group_id: groupId, user_id: uid }));

    // 이미 있는 멤버는 UNIQUE 위반으로 실패 → upsert로 처리하거나 무시
    const { data, error } = await supabase
      .from(T.study_group_members)
      .upsert(rows, { onConflict: "group_id,user_id", ignoreDuplicates: true })
      .select("user_id");

    if (error) return { error: "멤버 추가 실패" };

    const added = data?.length ?? 0;

    await supabase.from(T.admin_audit_log).insert({
      admin_id: userId,
      admin_email: userEmail,
      action: "add_group_members",
      target_type: "study_group_members",
      target_id: groupId,
      details: { added_user_ids: userIds, added_count: added },
    });

    return { data: { added } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "멤버 추가 실패" };
  }
}

/** 그룹 멤버 제거 */
export async function removeGroupMember(groupId: string, removeUserId: string): Promise<ActionResult> {
  try {
    const { supabase, userId, userEmail } = await requireAdmin();

    const { error } = await supabase
      .from(T.study_group_members)
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", removeUserId);
    if (error) return { error: "멤버 제거 실패" };

    await supabase.from(T.admin_audit_log).insert({
      admin_id: userId,
      admin_email: userEmail,
      action: "remove_group_member",
      target_type: "study_group_members",
      target_id: groupId,
      details: { removed_user_id: removeUserId },
    });

    return { data: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "멤버 제거 실패" };
  }
}

// ============================================================
// 3. 통계 (1개)
// ============================================================

/** 그룹 통계 (관리자 대시보드 / 그룹 상세) */
export async function getGroupStats(groupId: string): Promise<ActionResult<AdminGroupStats>> {
  try {
    const { supabase } = await requireAdmin();

    const { count: memberCount } = await supabase
      .from(T.study_group_members)
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId);

    const stats = await getGroupStatsInternal(supabase, groupId, memberCount ?? 0);
    return { data: stats };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "통계 조회 실패" };
  }
}

// 내부 헬퍼 — supabase 인스턴스 재사용
async function getGroupStatsInternal(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  groupId: string,
  memberCount: number
): Promise<AdminGroupStats> {
  // 1. 활성 / 완료 세션 수
  const [{ count: activeCount }, { count: completedCount }] = await Promise.all([
    supabase.from(T.opic_study_sessions).select("*", { count: "exact", head: true }).eq("group_id", groupId).eq("status", "active"),
    supabase.from(T.opic_study_sessions).select("*", { count: "exact", head: true }).eq("group_id", groupId).eq("status", "completed"),
  ]);

  // 2. 그룹의 모든 세션 ID
  const { data: sessions } = await supabase
    .from(T.opic_study_sessions)
    .select("id")
    .eq("group_id", groupId);
  const sessionIds = (sessions || []).map((s) => s.id as string);

  // 3. 답변 수
  let totalAnswers = 0;
  if (sessionIds.length > 0) {
    const { count } = await supabase
      .from(T.opic_study_answers)
      .select("*", { count: "exact", head: true })
      .in("session_id", sessionIds);
    totalAnswers = count ?? 0;
  }

  // 4. AI 비용 (api_usage_logs 집계 — 그룹의 모든 세션 합)
  let aiCostCents = 0;
  if (sessionIds.length > 0) {
    type CostRow = { cost_usd: number };
    const { data: costRows } = await supabase
      .from(T.api_usage_logs)
      .select("cost_usd")
      .eq("session_type", "opic_study")
      .in("session_id", sessionIds);
    const totalUsd = ((costRows as unknown as CostRow[]) || []).reduce(
      (sum, r) => sum + (Number(r.cost_usd) || 0),
      0
    );
    aiCostCents = Math.round(totalUsd * 100);
  }

  return {
    member_count: memberCount,
    active_session_count: activeCount ?? 0,
    completed_session_count: completedCount ?? 0,
    total_answers: totalAnswers,
    ai_cost_usd_cents: aiCostCents,
  };
}
