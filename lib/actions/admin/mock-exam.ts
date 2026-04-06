"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { T } from "@/lib/constants/tables";
import type { AdminMockSession, MockExamStats, PaginatedResult } from "@/lib/types/admin";
import type {
  MockTestSession,
  MockTestAnswer,
  MockTestEvaluation,
  MockTestReport,
} from "@/lib/types/mock-exam";

export async function getMockExamStats(): Promise<MockExamStats> {
  const { supabase } = await requireAdmin();

  const [totalRes, completedRes, pendingRes, failedRes, gradesRes, sessionsRes] = await Promise.all([
    supabase.from(T.mock_test_sessions).select("*", { count: "exact", head: true }),
    supabase.from(T.mock_test_sessions).select("*", { count: "exact", head: true }).eq("status", "completed"),
    supabase
      .from(T.mock_test_answers)
      .select("*", { count: "exact", head: true })
      .not("eval_status", "in", '("completed","skipped")'),
    supabase
      .from(T.mock_test_answers)
      .select("*", { count: "exact", head: true })
      .eq("eval_status", "error"),
    supabase
      .from(T.mock_test_reports)
      .select("final_level")
      .not("final_level", "is", null)
      .limit(200),
    supabase
      .from(T.mock_test_sessions)
      .select("mode, status"),
  ]);

  // 등급별 분포 + 가장 빈번한 등급
  const levelDistribution: Record<string, number> = {};
  for (const r of gradesRes.data || []) {
    const g = r.final_level;
    if (g) levelDistribution[g] = (levelDistribution[g] || 0) + 1;
  }
  const avgGrade = Object.keys(levelDistribution).length > 0
    ? Object.entries(levelDistribution).sort((a, b) => b[1] - a[1])[0][0]
    : null;

  // 모드별, 상태별 분포
  const modeDistribution: Record<string, number> = {};
  const statusDistribution: Record<string, number> = {};
  for (const s of sessionsRes.data || []) {
    if (s.mode) modeDistribution[s.mode] = (modeDistribution[s.mode] || 0) + 1;
    if (s.status) statusDistribution[s.status] = (statusDistribution[s.status] || 0) + 1;
  }

  return {
    totalSessions: totalRes.count || 0,
    completedSessions: completedRes.count || 0,
    pendingEvals: pendingRes.count || 0,
    failedEvals: failedRes.count || 0,
    avgGrade,
    levelDistribution,
    modeDistribution,
    statusDistribution,
  };
}

export async function getMockExamSessions(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  level?: string;
  mode?: string;
}): Promise<PaginatedResult<AdminMockSession>> {
  const { supabase } = await requireAdmin();
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from(T.mock_test_sessions)
    .select("*", { count: "exact" });

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  if (params.mode && params.mode !== "all") {
    query = query.eq("mode", params.mode);
  }

  // 검색/등급 필터 시 넉넉히 조회 후 클라이언트 필터
  const isSearching = !!params.search?.trim();
  const isLevelFiltering = !!params.level && params.level !== "all";
  const needsClientFilter = isSearching || isLevelFiltering;
  const fetchSize = needsClientFilter ? 200 : pageSize;
  const fetchOffset = needsClientFilter ? 0 : offset;

  const { data, count } = await query
    .order("started_at", { ascending: false })
    .range(fetchOffset, fetchOffset + fetchSize - 1);

  if (!data) return { data: [], total: 0, page, pageSize };

  // 사용자 이메일 + 리포트 조인
  const userIds = [...new Set(data.map((s) => s.user_id))];
  const sessionIds = data.map((s) => s.session_id);

  const [emailResults, reportsRes] = await Promise.all([
    Promise.all(userIds.map((uid) => supabase.auth.admin.getUserById(uid))),
    supabase
      .from(T.mock_test_reports)
      .select("session_id, final_level")
      .in("session_id", sessionIds),
  ]);
  const emailMap = new Map<string, string>();
  emailResults.forEach((res, i) => {
    if (res.data?.user?.email) emailMap.set(userIds[i], res.data.user.email);
  });

  const gradeMap = new Map(
    (reportsRes.data || []).map((r) => [r.session_id, r.final_level])
  );

  let sessions: AdminMockSession[] = data.map((s) => ({
    id: s.session_id,
    user_id: s.user_id,
    user_email: emailMap.get(s.user_id) || "-",
    mode: s.mode,
    status: s.status,
    started_at: s.started_at,
    completed_at: s.completed_at,
    eval_progress: s.status === "completed" ? "complete" : s.status,
    final_level: gradeMap.get(s.session_id) || null,
  }));

  // 클라이언트 필터: 이메일 검색
  if (isSearching) {
    const term = params.search!.trim().toLowerCase();
    sessions = sessions.filter((s) => s.user_email.toLowerCase().includes(term));
  }

  // 클라이언트 필터: 등급
  if (isLevelFiltering) {
    sessions = sessions.filter((s) => s.final_level === params.level);
  }

  if (needsClientFilter) {
    const filteredTotal = sessions.length;
    const start = (page - 1) * pageSize;
    sessions = sessions.slice(start, start + pageSize);
    return { data: sessions, total: filteredTotal, page, pageSize };
  }

  return { data: sessions, total: count || 0, page, pageSize };
}

// ── 세션 삭제 (관리자) ──

export async function deleteAdminSession(
  sessionId: string
): Promise<{ error?: string }> {
  const { supabase, userId, userEmail } = await requireAdmin();

  // 세션 존재 확인
  const { data: session } = await supabase
    .from(T.mock_test_sessions)
    .select("session_id, user_id, mode, status")
    .eq("session_id", sessionId)
    .single();

  if (!session) {
    return { error: "세션을 찾을 수 없습니다" };
  }

  // Storage 파일 삭제: answers에서 audio_url 목록 조회
  const { data: answers } = await supabase
    .from(T.mock_test_answers)
    .select("audio_url")
    .eq("session_id", sessionId);

  if (answers?.length) {
    // audio_url은 full URL → 버킷 내 상대 경로로 변환
    const bucketSegment = "/mock-test-recordings/";
    const audioPaths = answers
      .map((a) => {
        if (!a.audio_url) return null;
        const idx = a.audio_url.indexOf(bucketSegment);
        return idx !== -1 ? a.audio_url.slice(idx + bucketSegment.length) : null;
      })
      .filter(Boolean) as string[];

    if (audioPaths.length > 0) {
      await supabase.storage.from("mock-test-recordings").remove(audioPaths);
    }
  }

  // 수동 삭제 (CASCADE 아닌 테이블)
  await Promise.all([
    supabase.from(T.mock_test_evaluations).delete().eq("session_id", sessionId),
    supabase.from(T.mock_test_consults).delete().eq("session_id", sessionId),
    supabase.from(T.mock_test_reports).delete().eq("session_id", sessionId),
  ]);

  // DB 삭제 (answers는 CASCADE로 자동 삭제)
  const { error } = await supabase
    .from(T.mock_test_sessions)
    .delete()
    .eq("session_id", sessionId);

  if (error) {
    return { error: "세션 삭제에 실패했습니다" };
  }

  // 감사 로그 기록
  await supabase.from(T.admin_audit_log).insert({
    admin_id: userId,
    admin_email: userEmail,
    action: "delete_mock_session",
    target_type: "mock_session",
    target_id: sessionId,
    details: {
      user_id: session.user_id,
      mode: session.mode,
      status: session.status,
    },
  });

  revalidatePath("/admin/mock-exam");
  return {};
}

export async function retriggerEvaluation(sessionId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const { supabase, userId, userEmail } = await requireAdmin();

  // admin-trigger-eval Edge Function 호출
  const { error } = await supabase.functions.invoke("admin-trigger-eval", {
    body: {
      session_id: sessionId,
      admin_key: "opictalk-eval-2026",
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // 감사 로그
  await supabase.from(T.admin_audit_log).insert({
    admin_id: userId,
    admin_email: userEmail,
    action: "eval_retrigger",
    target_type: "mock_session",
    target_id: sessionId,
    details: {},
  });

  return { success: true };
}

// ── 과제충족 체크리스트 조회 ──

export async function getTaskChecklists() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from(T.task_fulfillment_checklists)
    .select("*")
    .order("question_type");
  return data || [];
}

// ── 과제충족 체크리스트 업데이트 ──

export async function updateTaskChecklist(
  questionType: string,
  updates: Record<string, unknown>,
): Promise<{ success: boolean; error?: string }> {
  const { supabase, userId, userEmail } = await requireAdmin();

  const { error } = await supabase
    .from(T.task_fulfillment_checklists)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("question_type", questionType);

  if (error) return { success: false, error: error.message };

  // 감사 로그
  await supabase.from(T.admin_audit_log).insert({
    admin_id: userId,
    admin_email: userEmail,
    action: "checklist_update",
    target_type: "task_fulfillment_checklist",
    target_id: questionType,
    details: updates,
  });

  return { success: true };
}

// ── 평가 품질 QA ──

export interface EvalQualityStats {
  levelDistribution: Record<string, number>;
  recentLevelDistribution: Record<string, number>; // 최근 30일
  skipRate: number; // 스킵률 (%)
  failRate: number; // 실패율 (%)
  avgProcessingMinutes: number; // 평균 처리 시간 (분)
  checkboxAnomalies: Array<{ id: string; passRate: number }>; // 비정상 체크박스 (pass율 <10% 또는 >95%)
}

export async function getEvalQualityStats(): Promise<EvalQualityStats> {
  const { supabase } = await requireAdmin();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysIso = thirtyDaysAgo.toISOString();

  const [reportsRes, recentReportsRes, answersRes, evalsRes] = await Promise.all([
    // 전체 등급 분포
    supabase.from(T.mock_test_reports).select("final_level").not("final_level", "is", null),
    // 최근 30일 등급 분포
    supabase.from(T.mock_test_reports).select("final_level").not("final_level", "is", null).gte("created_at", thirtyDaysIso),
    // 답변 상태 분포
    supabase.from(T.mock_test_answers).select("eval_status, created_at, updated_at").limit(10000),
    // 체크박스 평가 (최근 200건)
    supabase.from(T.mock_test_evaluations).select("checkboxes").limit(200),
  ]);

  // 등급 분포
  const levelDistribution: Record<string, number> = {};
  for (const r of reportsRes.data || []) {
    if (r.final_level) levelDistribution[r.final_level] = (levelDistribution[r.final_level] || 0) + 1;
  }
  const recentLevelDistribution: Record<string, number> = {};
  for (const r of recentReportsRes.data || []) {
    if (r.final_level) recentLevelDistribution[r.final_level] = (recentLevelDistribution[r.final_level] || 0) + 1;
  }

  // 스킵/실패율 + 처리 시간
  const answers = answersRes.data || [];
  const total = answers.length;
  const skipped = answers.filter((a) => a.eval_status === "skipped").length;
  const failed = answers.filter((a) => a.eval_status === "error" || a.eval_status === "failed").length;
  let totalProcessMs = 0;
  let processedCount = 0;
  for (const a of answers) {
    if (a.eval_status === "complete" && a.created_at && a.updated_at) {
      totalProcessMs += new Date(a.updated_at).getTime() - new Date(a.created_at).getTime();
      processedCount++;
    }
  }

  // 체크박스 이상 탐지
  const checkboxPassCounts = new Map<string, { pass: number; total: number }>();
  for (const e of evalsRes.data || []) {
    const checkboxes = e.checkboxes as Record<string, boolean> | null;
    if (!checkboxes) continue;
    for (const [key, passed] of Object.entries(checkboxes)) {
      const entry = checkboxPassCounts.get(key) || { pass: 0, total: 0 };
      entry.total++;
      if (passed) entry.pass++;
      checkboxPassCounts.set(key, entry);
    }
  }
  const checkboxAnomalies: Array<{ id: string; passRate: number }> = [];
  for (const [id, counts] of checkboxPassCounts) {
    if (counts.total < 10) continue; // 표본 부족
    const rate = Math.round((counts.pass / counts.total) * 100);
    if (rate < 10 || rate > 95) {
      checkboxAnomalies.push({ id, passRate: rate });
    }
  }
  checkboxAnomalies.sort((a, b) => a.passRate - b.passRate);

  return {
    levelDistribution,
    recentLevelDistribution,
    skipRate: total > 0 ? Math.round((skipped / total) * 1000) / 10 : 0,
    failRate: total > 0 ? Math.round((failed / total) * 1000) / 10 : 0,
    avgProcessingMinutes: processedCount > 0 ? Math.round(totalProcessMs / processedCount / 60000) : 0,
    checkboxAnomalies: checkboxAnomalies.slice(0, 10),
  };
}

// ── 세션 상세 조회 (사용자 화면 재사용용) ──

export async function getAdminSessionDetail(sessionId: string): Promise<{
  error?: string;
  data?: {
    session: MockTestSession;
    answers: MockTestAnswer[];
    evaluations: MockTestEvaluation[];
    report: MockTestReport | null;
    questions: Array<{
      id: string;
      question_english: string;
      question_korean: string;
      question_short: string;
      question_type_eng: string;
      survey_type: string;
      topic: string;
      category: string;
      audio_url: string | null;
    }>;
  };
}> {
  const { supabase } = await requireAdmin();

  // 세션 조회 (user_id 필터 없음)
  const { data: session, error: sessErr } = await supabase
    .from(T.mock_test_sessions)
    .select("*")
    .eq("session_id", sessionId)
    .single();

  if (sessErr || !session) {
    return { error: "세션을 찾을 수 없습니다" };
  }

  // 답변 + 평가 + 리포트 + 질문 병렬 조회
  const [
    { data: answers },
    { data: evaluations },
    { data: report },
    { data: questions },
  ] = await Promise.all([
    supabase
      .from(T.mock_test_answers)
      .select("*")
      .eq("session_id", sessionId)
      .order("question_number"),
    supabase
      .from(T.mock_test_evaluations)
      .select("*")
      .eq("session_id", sessionId)
      .order("question_number"),
    supabase
      .from(T.mock_test_reports)
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle(),
    supabase
      .from(T.questions)
      .select("id, question_english, question_korean, question_short, question_type_eng, survey_type, topic, category, audio_url")
      .in("id", session.question_ids || []),
  ]);

  return {
    data: {
      session: session as MockTestSession,
      answers: (answers || []) as MockTestAnswer[],
      evaluations: (evaluations || []) as MockTestEvaluation[],
      report: (report as MockTestReport) || null,
      questions: questions || [],
    },
  };
}
