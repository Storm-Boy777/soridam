"use server";

import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { T } from "@/lib/constants/tables";
import {
  transformDiagnosisData,
  type DiagnosisTransformInput,
  type DiagnosisTransformOutput,
} from "@/lib/mock-exam-result/diagnosis-transformer";
import type { OverviewV2 } from "@/lib/types/mock-exam-result";
import type { OverviewData } from "@/components/mock-exam/result/tab-overview";
import type { QuestionsData } from "@/components/mock-exam/result/tab-questions";
import type { QuestionEvalV2Real } from "@/lib/mock-data/mock-exam-result-questions";
import type { GrowthReportV2, GradeHistoryItem } from "@/lib/mock-data/mock-exam-result";

type ActionResult<T = null> = {
  error?: string;
  data?: T;
};

type ViewerContext = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  userId: string;
  isAdmin: boolean;
};

type SessionAccessResult<TSession> = ViewerContext & {
  session: TSession;
};

type SessionOwnerRow = {
  user_id: string;
};

const GRADE_ORDER = ["NL", "NM", "NH", "IL", "IM1", "IM2", "IM3", "IH", "AL"];

const TYPE_STATUS_MAP: Record<string, "reached" | "improved" | "maintained" | "not_attempted"> = {
  strong: "reached",
  stable: "improved",
  weak: "maintained",
  critical: "not_attempted",
};

const TYPE_LABEL_MAP: Record<string, string> = {
  description: "묘사",
  routine: "루틴",
  comparison: "비교",
  past_childhood: "경험·어린 시절",
  past_recent: "경험·최근",
  past_special: "경험·특별",
  rp_11: "질문하기",
  rp_12: "대안 제시",
  adv_14: "비교·변화",
  adv_15: "사회 이슈",
};

async function requireViewer(): Promise<ViewerContext> {
  const authSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }

  const isAdmin = user.app_metadata?.role === "admin";
  const supabase = isAdmin
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      )
    : authSupabase;

  return {
    supabase,
    userId: user.id,
    isAdmin,
  };
}

async function requireSessionAccess<TSession extends Record<string, unknown>>(
  sessionId: string,
  columns: string,
): Promise<SessionAccessResult<TSession>> {
  const context = await requireViewer();

  let query = context.supabase
    .from(T.mock_test_sessions)
    .select(columns)
    .eq("session_id", sessionId);

  if (!context.isAdmin) {
    query = query.eq("user_id", context.userId);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    throw new Error("세션 접근 권한이 없습니다.");
  }

  return {
    ...context,
    session: data,
  };
}

export async function getOverviewData(
  sessionId: string,
): Promise<ActionResult<OverviewData>> {
  try {
    const { supabase, session } = await requireSessionAccess<{
      mode: "training" | "test";
      started_at: string | null;
      total_questions: number | null;
    }>(sessionId, "mode, started_at, total_questions");

    const { data: report, error } = await supabase
      .from(T.mock_test_reports)
      .select("final_level, overview")
      .eq("session_id", sessionId)
      .single();

    if (error || !report) {
      return { error: "데이터 조회에 실패했습니다." };
    }

    const overview = report.overview as OverviewV2 | null;
    if (!overview) {
      return { error: "종합 진단 데이터가 아직 생성되지 않았습니다." };
    }

    return {
      data: {
        session: {
          session_id: sessionId,
          grade: report.final_level || "IM2",
          mode: session.mode,
          date: session.started_at || "",
          total_questions: session.total_questions || 15,
        },
        overall_comments: overview.overall_comments,
        performance_summary: overview.performance_summary,
      },
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

export async function getDiagnosisData(
  sessionId: string,
): Promise<ActionResult<DiagnosisTransformOutput>> {
  try {
    const { supabase } = await requireSessionAccess<SessionOwnerRow>(sessionId, "user_id");

    const { data: report, error } = await supabase
      .from(T.mock_test_reports)
      .select("aggregated_checkboxes, final_level")
      .eq("session_id", sessionId)
      .single();

    if (error || !report) {
      return { error: "리포트 조회에 실패했습니다." };
    }

    const aggregated = (report.aggregated_checkboxes || {}) as Record<
      string,
      Record<string, { final_pass?: boolean; pass?: boolean; evidence?: string }>
    >;

    const normalizeCheckboxes = (
      raw: Record<string, { final_pass?: boolean; pass?: boolean; evidence?: string }> | undefined,
    ): Record<string, { pass: boolean; evidence?: string }> => {
      if (!raw) return {};

      const normalized: Record<string, { pass: boolean; evidence?: string }> = {};
      for (const [checkboxId, value] of Object.entries(raw)) {
        normalized[checkboxId] = {
          pass: value.final_pass ?? value.pass ?? false,
          evidence: value.evidence,
        };
      }
      return normalized;
    };

    const input: DiagnosisTransformInput = {
      aggregated_int: normalizeCheckboxes(aggregated.int),
      aggregated_adv: normalizeCheckboxes(aggregated.adv),
      aggregated_al: normalizeCheckboxes(aggregated.al),
      final_level: report.final_level || "IM2",
    };

    return {
      data: transformDiagnosisData(input),
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

export async function getQuestionsData(
  sessionId: string,
): Promise<ActionResult<QuestionsData>> {
  try {
    const { supabase } = await requireSessionAccess<SessionOwnerRow>(sessionId, "user_id");

    const [consultsRes, reportRes] = await Promise.all([
      supabase
        .from(T.mock_test_consults)
        .select("*")
        .eq("session_id", sessionId)
        .order("question_number"),
      supabase
        .from(T.mock_test_reports)
        .select("final_level, target_grade")
        .eq("session_id", sessionId)
        .single(),
    ]);

    if (consultsRes.error || !consultsRes.data?.length) {
      return { error: "문항별 코칭 데이터가 없습니다." };
    }

    const questionIds = consultsRes.data.map((consult: any) => consult.question_id);
    const [questionsRes, answersRes] = await Promise.all([
      supabase
        .from(T.questions)
        .select("id, question_short, question_type_eng, topic, category")
        .in("id", questionIds),
      supabase
        .from(T.mock_test_answers)
        .select("*")
        .eq("session_id", sessionId)
        .order("question_number"),
    ]);

    const questionMap = new Map((questionsRes.data || []).map((question: any) => [question.id, question]));
    const answerMap = new Map((answersRes.data || []).map((answer: any) => [answer.question_number, answer]));

    const evaluations: QuestionEvalV2Real[] = consultsRes.data.map((consult: any) => {
      const questionMeta: any = questionMap.get(consult.question_id);
      const answer: any = answerMap.get(consult.question_number);
      const pronunciation = (answer?.pronunciation_assessment || null) as Record<string, number> | null;

      return {
        question_number: consult.question_number,
        question_title: questionMeta?.question_short || `Q${consult.question_number}`,
        question_type: consult.question_type,
        target_grade: consult.target_grade,
        topic: questionMeta?.topic || "",
        category: questionMeta?.category || "",
        fulfillment: consult.fulfillment as "fulfilled" | "partial" | "unfulfilled" | "skipped",
        task_checklist: consult.task_checklist as Array<{ item: string; pass: boolean; evidence?: string }>,
        observation: consult.observation,
        directions: consult.directions as string[],
        weak_points: consult.weak_points as Array<{
          code: string;
          severity: "severe" | "moderate" | "mild";
          reason: string;
          evidence: string;
        }>,
        audio_url: answer?.audio_url || "",
        transcript: answer?.transcript || "",
        speech_meta: {
          duration_sec: answer?.audio_duration || 0,
          wpm: answer?.wpm || 0,
          word_count: answer?.word_count || 0,
          accuracy_score: pronunciation?.accuracy_score ?? null,
          fluency_score: pronunciation?.fluency_score ?? null,
          prosody_score: pronunciation?.prosody_score ?? null,
          pause_count_3s_plus: answer?.long_pause_count || 0,
        },
      };
    });

    return {
      data: {
        target_grade: reportRes.data?.target_grade || consultsRes.data[0]?.target_grade || "IH",
        session_grade: reportRes.data?.final_level || "IM2",
        evaluations,
      },
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

export async function triggerEvalV2(
  sessionId: string,
  options?: { target_grade?: string; model?: string },
): Promise<ActionResult<{ status: string; triggered_count: number }>> {
  try {
    const { supabase } = await requireSessionAccess<SessionOwnerRow>(sessionId, "user_id");

    const { data: answers } = await supabase
      .from(T.mock_test_answers)
      .select("question_number, question_id, eval_status")
      .eq("session_id", sessionId)
      .gte("question_number", 2)
      .order("question_number");

    if (!answers?.length) {
      return { error: "평가 대상 답변이 없습니다." };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const evalPromises = answers.map((answer: any) =>
      fetch(`${supabaseUrl}/functions/v1/mock-test-eval`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          session_id: sessionId,
          question_number: answer.question_number,
          target_grade: options?.target_grade,
          model: options?.model,
        }),
      }).catch((error) => {
        console.error(`[triggerEvalV2] Q${answer.question_number} 호출 실패:`, error);
      }),
    );

    Promise.allSettled(evalPromises);

    return {
      data: {
        status: "triggered",
        triggered_count: answers.length,
      },
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

export async function triggerReportV2(
  sessionId: string,
): Promise<ActionResult<{ status: string }>> {
  try {
    const { supabase } = await requireSessionAccess<SessionOwnerRow>(sessionId, "user_id");

    const { data: existingReport } = await supabase
      .from(T.mock_test_reports)
      .select("status")
      .eq("session_id", sessionId)
      .single();

    if (existingReport?.status === "completed") {
      return { data: { status: "already_completed" } };
    }

    const { count } = await supabase
      .from(T.mock_test_evaluations)
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId);

    if (!count) {
      return { error: "문항별 평가가 아직 생성되지 않았습니다." };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    fetch(`${supabaseUrl}/functions/v1/mock-test-report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ session_id: sessionId }),
    }).catch((error) => {
      console.error("[triggerReportV2] 호출 실패:", error);
    });

    return { data: { status: "triggered" } };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

export async function getGrowthData(
  sessionId: string,
): Promise<ActionResult<GrowthReportV2>> {
  try {
    const { supabase, session } = await requireSessionAccess<{
      user_id: string;
      started_at: string | null;
    }>(sessionId, "user_id, started_at");

    const [reportRes, allReportsRes] = await Promise.all([
      supabase
        .from(T.mock_test_reports)
        .select("final_level, target_grade, growth")
        .eq("session_id", sessionId)
        .single(),
      supabase
        .from(T.mock_test_reports)
        .select("session_id, final_level, completed_at")
        .eq("user_id", session.user_id)
        .eq("status", "completed")
        .order("completed_at"),
    ]);

    const report = reportRes.data;
    const allReports = allReportsRes.data || [];

    if (!report?.growth) {
      return { error: "성장 분석 데이터가 아직 생성되지 않았습니다." };
    }

    const growth = report.growth as {
      improvements: Array<{ area: string; detail: string; evidence_questions: number[] }>;
      weaknesses: Array<{ area: string; detail: string; severity: string; wp_codes: string[] }>;
      type_comparison: Array<{
        type: string;
        type_ko: string;
        status: string;
        comment: string;
        fulfillment_rate: number;
      }>;
      bottleneck_summary: string;
      focus_point?: { area_label: string; observation: string };
    };

    const gradeHistory: GradeHistoryItem[] = allReports.map((history: any, index: number) => ({
      session_count: index + 1,
      grade: history.final_level || "IM1",
      date: history.completed_at || "",
    }));

    const currentSessionCount = gradeHistory.length;
    const previousReport = allReports
      .filter(
        (history: any) =>
          history.session_id !== sessionId &&
          (history.completed_at || "") < (session.started_at || ""),
      )
      .pop();

    if (!previousReport) {
      return { error: "첫 응시입니다. 다음 응시부터 성장 분석을 제공합니다." };
    }

    const currentGrade = report.final_level || "IM2";
    const previousGrade = previousReport.final_level || currentGrade;
    const diff = GRADE_ORDER.indexOf(currentGrade) - GRADE_ORDER.indexOf(previousGrade);

    const result: GrowthReportV2 = {
      previous_session: {
        session_id: previousReport.session_id || "",
        grade: previousGrade,
        date: previousReport.completed_at || "",
        session_count: Math.max(currentSessionCount - 1, 1),
      },
      current_session: {
        session_id: sessionId,
        grade: currentGrade,
        date: session.started_at || "",
        session_count: currentSessionCount,
      },
      target_grade: report.target_grade || "IH",
      grade_history: gradeHistory,
      grade_change: {
        previous: previousGrade,
        current: currentGrade,
        diff,
      },
      improvements: growth.improvements.map((item) => item.detail),
      weaknesses: growth.weaknesses.map((item) => item.detail),
      type_comparison: growth.type_comparison.map((comparison) => {
        const rate = comparison.fulfillment_rate;
        const status = TYPE_STATUS_MAP[comparison.status] || "maintained";
        return {
          type: comparison.type,
          type_label:
            TYPE_LABEL_MAP[comparison.type] || comparison.type_ko || comparison.type,
          status,
          criteria_met: Math.round(rate * 5),
          criteria_total: 5,
          change_observation: comparison.comment,
          remaining:
            status === "reached"
              ? "목표 등급 요구를 충분히 충족했습니다."
              : `충족률 ${Math.round(rate * 100)}%로 추가 개선이 필요합니다.`,
        };
      }),
      focus_point: {
        area_label: growth.focus_point?.area_label || "",
        observation: growth.focus_point?.observation || "",
      },
    };

    return { data: result };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}
