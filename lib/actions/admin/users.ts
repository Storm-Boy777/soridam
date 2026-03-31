"use server";

import { requireAdmin } from "@/lib/auth";
import type {
  AdminUser,
  AdminUserDetail,
  CreditAdjustParams,
  PlanChangeParams,
  PaginatedResult,
} from "@/lib/types/admin";

export async function getUsers(params: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<PaginatedResult<AdminUser>> {
  const { supabase } = await requireAdmin();
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const offset = (page - 1) * pageSize;

  // auth.users에서 사용자 목록 조회 (service client — admin.listUsers)
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
    page,
    perPage: pageSize,
  });

  if (authError || !authData) {
    return { data: [], total: 0, page, pageSize };
  }

  let users = authData.users;
  const total = authData.users.length < pageSize
    ? offset + authData.users.length
    : offset + pageSize + 1; // 다음 페이지 있음을 표시

  // 검색 필터 (서버 사이드 — email/display_name)
  if (params.search) {
    const q = params.search.toLowerCase();
    users = users.filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        (u.user_metadata?.display_name || "").toLowerCase().includes(q)
    );
  }

  // user_credits 조인
  const userIds = users.map((u) => u.id);
  const { data: credits } = await supabase
    .from("user_credits")
    .select("user_id, plan_mock_exam_credits, plan_script_credits, mock_exam_credits, script_credits, current_plan")
    .in("user_id", userIds);

  const creditMap = new Map(
    (credits || []).map((c) => [c.user_id, c])
  );

  const data: AdminUser[] = users.map((u) => {
    const c = creditMap.get(u.id);
    return {
      id: u.id,
      email: u.email || "",
      display_name: u.user_metadata?.display_name || u.user_metadata?.full_name || null,
      current_grade: u.user_metadata?.current_grade || null,
      target_grade: u.user_metadata?.target_grade || null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at || null,
      banned_until: u.banned_until || null,
      plan_mock_exam_credits: c?.plan_mock_exam_credits || 0,
      plan_script_credits: c?.plan_script_credits || 0,
      mock_exam_credits: c?.mock_exam_credits || 0,
      script_credits: c?.script_credits || 0,
      current_plan: c?.current_plan || "free",
    };
  });

  return { data, total, page, pageSize };
}

export async function getUserDetail(userId: string): Promise<AdminUser | null> {
  const { supabase } = await requireAdmin();

  const { data: authData, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !authData?.user) return null;

  const u = authData.user;
  const { data: c } = await supabase
    .from("user_credits")
    .select("*")
    .eq("user_id", userId)
    .single();

  return {
    id: u.id,
    email: u.email || "",
    display_name: u.user_metadata?.display_name || u.user_metadata?.full_name || null,
    current_grade: u.user_metadata?.current_grade || null,
    target_grade: u.user_metadata?.target_grade || null,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at || null,
    banned_until: u.banned_until || null,
    plan_mock_exam_credits: c?.plan_mock_exam_credits || 0,
    plan_script_credits: c?.plan_script_credits || 0,
    mock_exam_credits: c?.mock_exam_credits || 0,
    script_credits: c?.script_credits || 0,
    current_plan: c?.current_plan || "free",
  };
}

export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail | null> {
  const { supabase } = await requireAdmin();

  // 병렬 쿼리 8개 실행
  const [
    authResult,
    creditsResult,
    mockExamsResult,
    completedMockResult,
    scriptsResult,
    confirmedScriptsResult,
    ordersResult,
  ] = await Promise.all([
    // 1. 기본 정보
    supabase.auth.admin.getUserById(userId),
    // 2. 크레딧
    supabase.from("user_credits").select("*").eq("user_id", userId).single(),
    // 3. 최근 모의고사 5건
    supabase
      .from("mock_test_sessions")
      .select("session_id, mode, status, started_at", { count: "exact" })
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(5),
    // 4. 완료 모의고사 수
    supabase
      .from("mock_test_sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed"),
    // 5. 최근 스크립트 5건
    supabase
      .from("scripts")
      .select("id, question_korean, target_grade, question_type, status, created_at", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    // 6. 확정 스크립트 수
    supabase
      .from("scripts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "confirmed"),
    // 7. 최근 결제 5건
    supabase
      .from("orders")
      .select("id, product_name, amount, status, created_at", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  // 사용자 없으면 null
  if (authResult.error || !authResult.data?.user) return null;

  const u = authResult.data.user;
  const c = creditsResult.data;

  // 모의고사 final_level 매핑 — 최근 5건의 session_id로 reports 조회
  const mockExams = mockExamsResult.data || [];
  let recentMockExams: AdminUserDetail["recentMockExams"] = [];
  if (mockExams.length > 0) {
    const sessionIds = mockExams.map((m) => m.session_id);
    const { data: reports } = await supabase
      .from("mock_test_reports")
      .select("session_id, final_level")
      .in("session_id", sessionIds);

    const reportMap = new Map(
      (reports || []).map((r) => [r.session_id, r.final_level])
    );

    recentMockExams = mockExams.map((m) => ({
      session_id: m.session_id,
      mode: m.mode,
      status: m.status,
      final_level: reportMap.get(m.session_id) || null,
      started_at: m.started_at,
    }));
  }

  // 매출 합계 계산 (paid 주문만)
  const orders = ordersResult.data || [];
  const totalSpent = orders
    .filter((o) => o.status === "paid")
    .reduce((sum, o) => sum + (o.amount || 0), 0);

  // AdminUser 객체 구성
  const user: AdminUser = {
    id: u.id,
    email: u.email || "",
    display_name: u.user_metadata?.display_name || u.user_metadata?.full_name || null,
    current_grade: u.user_metadata?.current_grade || null,
    target_grade: u.user_metadata?.target_grade || null,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at || null,
    banned_until: u.banned_until || null,
    plan_mock_exam_credits: c?.plan_mock_exam_credits || 0,
    plan_script_credits: c?.plan_script_credits || 0,
    mock_exam_credits: c?.mock_exam_credits || 0,
    script_credits: c?.script_credits || 0,
    current_plan: c?.current_plan || "free",
  };

  return {
    user,
    summary: {
      totalMockExams: mockExamsResult.count || 0,
      completedMockExams: completedMockResult.count || 0,
      totalScripts: scriptsResult.count || 0,
      confirmedScripts: confirmedScriptsResult.count || 0,
      totalOrders: ordersResult.count || 0,
      totalSpent,
    },
    recentMockExams,
    recentScripts: (scriptsResult.data || []).map((s) => ({
      id: s.id,
      question_korean: s.question_korean,
      target_grade: s.target_grade,
      question_type: s.question_type,
      status: s.status,
      created_at: s.created_at,
    })),
    recentOrders: (ordersResult.data || []).map((o) => ({
      id: o.id,
      product_name: o.product_name,
      amount: o.amount,
      status: o.status,
      created_at: o.created_at,
    })),
  };
}

const ALLOWED_CREDIT_TYPES = [
  "mock_exam_credits",
  "script_credits",
  "plan_mock_exam_credits",
  "plan_script_credits",
] as const;

export async function adjustCredit(
  params: CreditAdjustParams
): Promise<{ success: boolean; error?: string }> {
  const { supabase, userId: adminId, userEmail: adminEmail } = await requireAdmin();

  // creditType 검증 (허용된 컬럼만)
  if (!ALLOWED_CREDIT_TYPES.includes(params.creditType)) {
    return { success: false, error: "유효하지 않은 크레딧 유형입니다" };
  }

  // 현재 크레딧 조회
  const { data: current, error: fetchError } = await supabase
    .from("user_credits")
    .select(params.creditType)
    .eq("user_id", params.userId)
    .single();

  if (fetchError || !current) {
    return { success: false, error: "사용자 크레딧 조회 실패" };
  }

  const oldValue = (current as Record<string, number>)[params.creditType] || 0;
  const newValue = Math.max(0, oldValue + params.amount);

  const { error: updateError } = await supabase
    .from("user_credits")
    .update({ [params.creditType]: newValue })
    .eq("user_id", params.userId);

  if (updateError) {
    return { success: false, error: `크레딧 수정 실패: ${updateError.message}` };
  }

  // 감사 로그
  await supabase.from("admin_audit_log").insert({
    admin_id: adminId,
    admin_email: adminEmail,
    action: "credit_adjust",
    target_type: "user",
    target_id: params.userId,
    details: {
      credit_type: params.creditType,
      old_value: oldValue,
      new_value: newValue,
      amount: params.amount,
      reason: params.reason,
    },
  });

  return { success: true };
}

// 플랜 변경
export async function changePlan(
  params: PlanChangeParams
): Promise<{ success: boolean; error?: string }> {
  const { supabase, userId: adminId, userEmail: adminEmail } = await requireAdmin();

  // 현재 크레딧/플랜 조회 (변경 전 값 저장)
  const { data: current, error: fetchError } = await supabase
    .from("user_credits")
    .select("current_plan, plan_mock_exam_credits, plan_script_credits")
    .eq("user_id", params.userId)
    .single();

  if (fetchError || !current) {
    return { success: false, error: "사용자 크레딧 조회 실패" };
  }

  // 만료일 계산: free이면 null, 아니면 N개월 후 (setMonth으로 정확한 월 계산)
  let planExpiresAt: string | null = null;
  if (params.plan !== "free") {
    const expires = new Date();
    expires.setMonth(expires.getMonth() + params.expiresInMonths);
    planExpiresAt = expires.toISOString();
  }

  const { error: updateError } = await supabase
    .from("user_credits")
    .update({
      current_plan: params.plan,
      plan_mock_exam_credits: params.mockExamCredits,
      plan_script_credits: params.scriptCredits,
      plan_expires_at: planExpiresAt,
    })
    .eq("user_id", params.userId);

  if (updateError) {
    return { success: false, error: `플랜 변경 실패: ${updateError.message}` };
  }

  // 감사 로그
  await supabase.from("admin_audit_log").insert({
    admin_id: adminId,
    admin_email: adminEmail,
    action: "plan_change",
    target_type: "user",
    target_id: params.userId,
    details: {
      old_plan: current.current_plan,
      new_plan: params.plan,
      old_credits: {
        mock: current.plan_mock_exam_credits,
        script: current.plan_script_credits,
      },
      new_credits: {
        mock: params.mockExamCredits,
        script: params.scriptCredits,
      },
      expires_in_months: params.expiresInMonths,
      reason: params.reason,
    },
  });

  return { success: true };
}

// 계정 차단/해제
export async function toggleUserBan(params: {
  userId: string;
  ban: boolean;
  reason: string;
}): Promise<{ success: boolean; error?: string }> {
  const { supabase, userId: adminId, userEmail: adminEmail } = await requireAdmin();

  // ban_duration: "876000h" = ~100년 (영구 차단), "none" = 차단 해제
  const { error } = await supabase.auth.admin.updateUserById(params.userId, {
    ban_duration: params.ban ? "876000h" : "none",
  });

  if (error) {
    return {
      success: false,
      error: `${params.ban ? "차단" : "차단 해제"} 실패: ${error.message}`,
    };
  }

  // 감사 로그
  await supabase.from("admin_audit_log").insert({
    admin_id: adminId,
    admin_email: adminEmail,
    action: params.ban ? "user_ban" : "user_unban",
    target_type: "user",
    target_id: params.userId,
    details: { reason: params.reason },
  });

  return { success: true };
}

// 사용자 완전 삭제
export async function deleteUser(params: {
  userId: string;
  reason: string;
}): Promise<{ success: boolean; error?: string }> {
  const { supabase, userId: adminId, userEmail: adminEmail } = await requireAdmin();

  // 삭제 대상 이메일 기록용
  const { data: targetUser } = await supabase.auth.admin.getUserById(params.userId);
  const targetEmail = targetUser?.user?.email || "unknown";

  // 관리자 자신은 삭제 불가
  if (params.userId === adminId) {
    return { success: false, error: "자신의 계정은 삭제할 수 없습니다" };
  }

  try {
    // 1. Storage 파일 삭제 (오디오 녹음)
    const buckets = ["audio-recordings", "mock-test-recordings", "tutoring-recordings", "script-packages"];
    for (const bucket of buckets) {
      const { data: files } = await supabase.storage.from(bucket).list(params.userId);
      if (files && files.length > 0) {
        const paths = files.map((f) => `${params.userId}/${f.name}`);
        await supabase.storage.from(bucket).remove(paths);
      }
    }

    // 2. DB 데이터 삭제 (깊은 의존 순서부터)
    // 튜터링 관련
    const { data: tSessions } = await supabase.from("tutoring_sessions").select("id").eq("user_id", params.userId);
    if (tSessions && tSessions.length > 0) {
      const tSessionIds = tSessions.map((s) => s.id);
      const { data: focuses } = await supabase.from("tutoring_focuses").select("id").in("session_id", tSessionIds);
      if (focuses && focuses.length > 0) {
        const focusIds = focuses.map((f) => f.id);
        await supabase.from("tutoring_retests").delete().in("focus_id", focusIds);
        const { data: drills } = await supabase.from("tutoring_drills").select("id").in("focus_id", focusIds);
        if (drills && drills.length > 0) {
          await supabase.from("tutoring_attempts").delete().in("drill_id", drills.map((d) => d.id));
        }
        await supabase.from("tutoring_drills").delete().in("focus_id", focusIds);
        await supabase.from("tutoring_focuses").delete().in("id", focusIds);
      }
      await supabase.from("tutoring_sessions").delete().in("id", tSessionIds);
    }

    // 모의고사 관련
    const { data: mockSessions } = await supabase.from("mock_test_sessions").select("session_id").eq("user_id", params.userId);
    if (mockSessions && mockSessions.length > 0) {
      const sessionIds = mockSessions.map((s) => s.session_id);
      await supabase.from("mock_test_reports").delete().in("session_id", sessionIds);
      await supabase.from("mock_test_consults").delete().in("session_id", sessionIds);
      await supabase.from("mock_test_evaluations").delete().in("session_id", sessionIds);
      await supabase.from("mock_test_answers").delete().in("session_id", sessionIds);
    }
    await supabase.from("mock_test_sessions").delete().eq("user_id", params.userId);

    // 스크립트 관련
    await supabase.from("shadowing_evaluations").delete().eq("user_id", params.userId);
    await supabase.from("shadowing_sessions").delete().eq("user_id", params.userId);
    const { data: scripts } = await supabase.from("scripts").select("id").eq("user_id", params.userId);
    if (scripts && scripts.length > 0) {
      await supabase.from("script_packages").delete().in("script_id", scripts.map((s) => s.id));
    }
    await supabase.from("scripts").delete().eq("user_id", params.userId);

    // 후기 관련
    const { data: subs } = await supabase.from("submissions").select("id").eq("user_id", params.userId);
    if (subs && subs.length > 0) {
      const subIds = subs.map((s) => s.id);
      await supabase.from("submission_questions").delete().in("submission_id", subIds);
      await supabase.from("submission_combos").delete().in("submission_id", subIds);
    }
    await supabase.from("submissions").delete().eq("user_id", params.userId);

    // 결제 + 크레딧 + 프로필
    await supabase.from("orders").delete().eq("user_id", params.userId);
    await supabase.from("user_credits").delete().eq("user_id", params.userId);
    await supabase.from("profiles").delete().eq("id", params.userId);

    // 3. Supabase Auth 사용자 삭제
    const { error: authError } = await supabase.auth.admin.deleteUser(params.userId);
    if (authError) {
      return { success: false, error: `Auth 삭제 실패: ${authError.message}` };
    }

    // 4. 감사 로그
    await supabase.from("admin_audit_log").insert({
      admin_id: adminId,
      admin_email: adminEmail,
      action: "user_delete",
      target_type: "user",
      target_id: params.userId,
      details: { email: targetEmail, reason: params.reason },
    });

    return { success: true };
  } catch (err) {
    console.error("[deleteUser] error:", err);
    return { success: false, error: "사용자 삭제 중 오류가 발생했습니다" };
  }
}
