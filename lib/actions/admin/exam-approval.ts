"use server";

import { requireAdmin } from "@/lib/auth";
import { T } from "@/lib/constants/tables";

// ── 상태별 건수 조회 ──

export async function getExamApprovalCounts() {
  const { supabase } = await requireAdmin();

  const [pending, approved, rejected] = await Promise.all(
    (["pending", "approved", "rejected"] as const).map(async (status) => {
      const { count } = await supabase
        .from(T.submissions)
        .select("id", { count: "exact", head: true })
        .eq("status", "complete")
        .eq("exam_approved", status);
      return count || 0;
    })
  );

  return { pending, approved, rejected };
}

// ── 기출 승인 목록 조회 ──

export async function getExamApprovalList(params: {
  status?: "pending" | "approved" | "rejected";
  page?: number;
  pageSize?: number;
}) {
  const { supabase } = await requireAdmin();
  const status = params.status || "pending";
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const offset = (page - 1) * pageSize;

  const { data, count } = await supabase
    .from(T.submissions)
    .select("id, user_id, exam_date, achieved_level, submitted_at, one_line_review", {
      count: "exact",
    })
    .eq("status", "complete")
    .eq("exam_approved", status)
    .order("submitted_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  return { data: data || [], total: count || 0, page, pageSize };
}

// ── 기출 상세 조회 (질문 + 선택3:공통2 조건 확인) ──

export async function getSubmissionForReview(submissionId: number) {
  const { supabase } = await requireAdmin();

  const { data: submission } = await supabase
    .from(T.submissions)
    .select(
      "id, user_id, exam_date, achieved_level, submitted_at, one_line_review, tips, exam_approved"
    )
    .eq("id", submissionId)
    .single();

  if (!submission) return null;

  // submission_questions + questions 조인 (survey_type, question_short 등)
  const { data: questions } = await supabase
    .from(T.submission_questions)
    .select(
      "question_number, combo_type, topic, question_id, custom_question_text, is_not_remembered, questions(id, question_short, survey_type, question_type_kor)"
    )
    .eq("submission_id", submissionId)
    .order("question_number");

  // 선택3:공통2 조건 확인
  const condition = checkCondition(questions || []);

  return { submission, questions: questions || [], condition };
}

// ── 승인 ──

export async function approveSubmission(submissionId: number) {
  const { supabase, userId, userEmail } = await requireAdmin();

  const { error } = await supabase
    .from(T.submissions)
    .update({
      exam_approved: "approved",
      exam_approved_at: new Date().toISOString(),
    })
    .eq("id", submissionId)
    .eq("exam_approved", "pending"); // pending만 승인 가능

  if (error) return { success: false, error: error.message };

  await supabase.from(T.admin_audit_log).insert({
    admin_id: userId,
    admin_email: userEmail,
    action: "exam_approve",
    target_type: "submission",
    target_id: String(submissionId),
    details: { action: "approved" },
  });

  return { success: true };
}

// ── 반려 ──

export async function rejectSubmission(submissionId: number, reason?: string) {
  const { supabase, userId, userEmail } = await requireAdmin();

  const { error } = await supabase
    .from(T.submissions)
    .update({
      exam_approved: "rejected",
      exam_approved_at: new Date().toISOString(),
    })
    .eq("id", submissionId)
    .eq("exam_approved", "pending");

  if (error) return { success: false, error: error.message };

  await supabase.from(T.admin_audit_log).insert({
    admin_id: userId,
    admin_email: userEmail,
    action: "exam_reject",
    target_type: "submission",
    target_id: String(submissionId),
    details: { action: "rejected", reason: reason || null },
  });

  return { success: true };
}

// ── 선택3:공통2 조건 확인 유틸 ──

const SET_LABELS: Record<string, string> = {
  general_1: "세트1 (일반)",
  general_2: "세트2 (일반)",
  general_3: "세트3 (일반)",
  roleplay: "세트4 (롤플레이)",
  advance: "세트5 (어드밴스)",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function checkCondition(questions: any[]) {
  const setTypes = ["general_1", "general_2", "general_3", "roleplay", "advance"];

  const sets = setTypes.map((type) => {
    const setQs = questions.filter((q) => q.combo_type === type);
    const surveyType =
      setQs
        .filter((q) => q.question_id && !q.is_not_remembered)
        .map((q) => q.questions?.survey_type)
        .find((s: string | undefined) => s && s !== "시스템") || null;
    const topic = setQs.map((q) => q.topic).find((t: string | undefined) => t) || "미분류";

    return { type, label: SET_LABELS[type], surveyType, topic };
  });

  const selected = sets.filter((s) => s.surveyType === "선택형").length;
  const common = sets.filter((s) => s.surveyType === "공통형").length;

  return { sets, selected, common, isValid: selected === 3 && common === 2 };
}
