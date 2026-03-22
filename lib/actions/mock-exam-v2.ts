"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import {
  transformDiagnosisData,
  type DiagnosisTransformInput,
} from "@/lib/mock-exam-v2/diagnosis-transformer";
import type {
  OverviewV2,
  GrowthV2,
} from "@/lib/types/mock-exam-v2";
import type { OverviewData } from "@/components/mock-exam/result-v2/tab-overview";
import type { DiagnosisTransformOutput } from "@/lib/mock-exam-v2/diagnosis-transformer";
import type { QuestionsData } from "@/components/mock-exam/result-v2/tab-questions";
import type { QuestionEvalV2Real } from "@/lib/mock-data/result-v2-questions";
import type { GrowthReportV2, GradeHistoryItem } from "@/lib/mock-data/result-v2";

type ActionResult<T = null> = {
  error?: string;
  data?: T;
};

// ── 헬퍼: 현재 로그인 유저 확인 ──

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다");
  return { supabase, userId: user.id };
}

// (getSessionResultV2 삭제됨 — V2는 탭별 개별 SA 사용: getOverviewData/getDiagnosisData/getQuestionsData/getGrowthData)

// ============================================================
// 2. 종합 진단 탭 데이터 변환 (buildOverviewData)
// ============================================================

export async function getOverviewData(
  sessionId: string,
): Promise<ActionResult<OverviewData>> {
  try {
    const { supabase, userId } = await requireUser();

    const [sessionRes, reportRes] = await Promise.all([
      supabase
        .from("mock_test_sessions")
        .select("mode, started_at, total_questions")
        .eq("session_id", sessionId)
        .eq("user_id", userId)
        .single(),
      supabase
        .from("mock_test_reports")
        .select("final_level, overview")
        .eq("session_id", sessionId)
        .single(),
    ]);

    if (sessionRes.error || reportRes.error) {
      return { error: "데이터 조회 실패" };
    }

    const overview = reportRes.data.overview as OverviewV2 | null;
    if (!overview) {
      return { error: "종합 진단 데이터 미생성 (report-v2 EF 실행 필요)" };
    }

    return {
      data: {
        session: {
          session_id: sessionId,
          grade: reportRes.data.final_level || "IM2",
          mode: sessionRes.data.mode as "training" | "test",
          date: sessionRes.data.started_at || "",
          total_questions: sessionRes.data.total_questions || 15,
        },
        overall_comments: overview.overall_comments,
        performance_summary: overview.performance_summary,
      },
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

// ============================================================
// 3. 세부진단표 데이터 (getDiagnosisData)
// ============================================================

export async function getDiagnosisData(
  sessionId: string,
): Promise<ActionResult<DiagnosisTransformOutput>> {
  try {
    const { supabase, userId } = await requireUser();

    const { data: report, error } = await supabase
      .from("mock_test_reports")
      .select(
        "aggregated_checkboxes, final_level",
      )
      .eq("session_id", sessionId)
      .single();

    if (error || !report) {
      return { error: "리포트 조회 실패" };
    }

    // 세션 소유자 확인 (RLS가 처리하지만 명시적 확인)
    const { data: session } = await supabase
      .from("mock_test_sessions")
      .select("user_id")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .single();
    if (!session) {
      return { error: "세션 접근 권한 없음" };
    }

    const agg = (report.aggregated_checkboxes || {}) as Record<string, unknown>;
    const input: DiagnosisTransformInput = {
      aggregated_int: (agg.int || {}) as Record<string, { pass: boolean; evidence?: string }>,
      aggregated_adv: (agg.adv || {}) as Record<string, { pass: boolean; evidence?: string }>,
      aggregated_al: (agg.al || {}) as Record<string, { pass: boolean; evidence?: string }>,
      final_level: report.final_level || "IM2",
    };

    return { data: transformDiagnosisData(input) };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

// ============================================================
// 4. 문항별 평가 데이터 (getQuestionsData)
// ============================================================

export async function getQuestionsData(
  sessionId: string,
): Promise<ActionResult<QuestionsData>> {
  try {
    const { supabase, userId } = await requireUser();

    // consults_v2 (소견) + reports_v2 (등급) 병렬 조회
    const [consultsRes, reportRes] = await Promise.all([
      supabase
        .from("mock_test_consults")
        .select("*")
        .eq("session_id", sessionId)
        .order("question_number"),
      supabase
        .from("mock_test_reports")
        .select("final_level, target_grade")
        .eq("session_id", sessionId)
        .single(),
    ]);

    if (consultsRes.error || !consultsRes.data?.length) {
      return { error: "v2 소견 데이터 없음" };
    }

    // 소유자 확인
    const { data: session } = await supabase
      .from("mock_test_sessions")
      .select("user_id")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .single();
    if (!session) {
      return { error: "세션 접근 권한 없음" };
    }

    // 질문 메타 조회
    const questionIds = consultsRes.data.map((e) => e.question_id);
    const { data: questions } = await supabase
      .from("questions")
      .select("id, question_short, question_type_eng, topic, category")
      .in("id", questionIds);

    const qMap = new Map(
      (questions || []).map((q) => [q.id, q]),
    );

    // 답변 데이터 조회 (transcript, audio, speech meta)
    const { data: answersRaw } = await supabase
      .from("mock_test_answers")
      .select("*")
      .eq("session_id", sessionId)
      .order("question_number");

    const answers = answersRaw || [];
    const answerMap = new Map(
      answers.map((a) => [a.question_number, a]),
    );

    // consults_v2 → QuestionEvalV2Real 변환
    const evaluations: QuestionEvalV2Real[] = consultsRes.data.map((e) => {
      const qMeta = qMap.get(e.question_id);
      const answer = answerMap.get(e.question_number);
      const pron = answer?.pronunciation_assessment as Record<string, number> | null;

      return {
        question_number: e.question_number,
        question_title: qMeta?.question_short || `Q${e.question_number}`,
        question_type: e.question_type,
        target_grade: e.target_grade,
        topic: qMeta?.topic || "",
        category: qMeta?.category || "",
        fulfillment: e.fulfillment as "fulfilled" | "partial" | "unfulfilled" | "skipped",
        task_checklist: e.task_checklist as Array<{ item: string; pass: boolean; evidence?: string }>,
        observation: e.observation,
        directions: e.directions as string[],
        weak_points: e.weak_points as Array<{ code: string; severity: "severe" | "moderate" | "mild"; reason: string; evidence: string }>,
        audio_url: answer?.audio_url || "",
        transcript: answer?.transcript || "",
        speech_meta: {
          duration_sec: answer?.audio_duration || 0,
          wpm: answer?.wpm || 0,
          word_count: answer?.word_count || 0,
          accuracy_score: pron?.accuracy_score ?? null,
          fluency_score: pron?.fluency_score ?? null,
          prosody_score: pron?.prosody_score ?? null,
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
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

// ============================================================
// 5. v2 문항별 개별 평가 트리거 (triggerEvalV2)
//    문항별로 eval-v2 EF를 fire-and-forget 개별 호출
// ============================================================

export async function triggerEvalV2(
  sessionId: string,
  options?: { target_grade?: string; model?: string },
): Promise<ActionResult<{ status: string; triggered_count: number }>> {
  try {
    const { supabase, userId } = await requireUser();

    // 소유자 확인
    const { data: session } = await supabase
      .from("mock_test_sessions")
      .select("user_id, question_ids")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .single();
    if (!session) {
      return { error: "세션 접근 권한 없음" };
    }

    // v1 답변 조회 (Q2~ : Q1 자기소개 제외)
    const { data: answers } = await supabase
      .from("mock_test_answers")
      .select("question_number, question_id, eval_status")
      .eq("session_id", sessionId)
      .gte("question_number", 2)
      .order("question_number");

    if (!answers || answers.length === 0) {
      return { error: "평가 대상 답변 없음" };
    }

    // 이미 v2 평가된 문항 확인 (재실행 시 덮어씀)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // 문항별 fire-and-forget 호출
    let triggeredCount = 0;
    for (const answer of answers) {
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
      }).catch((err) => {
        console.error(
          `[triggerEvalV2] Q${answer.question_number} EF 호출 실패:`,
          err,
        );
      });
      triggeredCount++;
    }

    console.log(
      `[triggerEvalV2] ${sessionId}: ${triggeredCount}개 문항 eval-v2 트리거`,
    );

    return { data: { status: "triggered", triggered_count: triggeredCount } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

// ============================================================
// 6. v2 리포트 생성 트리거 (triggerReportV2)
// ============================================================

export async function triggerReportV2(
  sessionId: string,
): Promise<ActionResult<{ status: string }>> {
  try {
    const { supabase, userId } = await requireUser();

    // 소유자 확인
    const { data: session } = await supabase
      .from("mock_test_sessions")
      .select("user_id")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .single();
    if (!session) {
      return { error: "세션 접근 권한 없음" };
    }

    // v2 report 이미 완료 확인
    const { data: existingReport } = await supabase
      .from("mock_test_reports")
      .select("status")
      .eq("session_id", sessionId)
      .single();

    if (existingReport?.status === "completed") {
      return { data: { status: "already_completed" } };
    }

    // v2 eval 존재 확인
    const { count } = await supabase
      .from("mock_test_evaluations")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId);

    if (!count || count === 0) {
      return { error: "v2 문항별 평가 미완성 — eval-v2 EF 실행 필요" };
    }

    // report-v2 EF 호출 (fire-and-forget)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    fetch(`${supabaseUrl}/functions/v1/mock-test-report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ session_id: sessionId }),
    }).catch((err) => {
      console.error("[triggerReportV2] EF 호출 실패:", err);
    });

    return { data: { status: "triggered" } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

// ============================================================
// 7. 성장리포트 데이터 (getGrowthData)
// ============================================================

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
  past_childhood: "경험·처음",
  past_recent: "경험·최근",
  past_special: "경험·특별",
  rp_11: "질문하기",
  rp_12: "대안제시",
  adv_14: "비교·변화",
  adv_15: "사회이슈",
};

export async function getGrowthData(
  sessionId: string,
): Promise<ActionResult<GrowthReportV2>> {
  try {
    const { supabase, userId } = await requireUser();

    // 소유자 확인 + 세션 정보
    const { data: session } = await supabase
      .from("mock_test_sessions")
      .select("user_id, started_at")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .single();
    if (!session) return { error: "세션 접근 권한 없음" };

    // 현재 세션 report
    const { data: report } = await supabase
      .from("mock_test_reports")
      .select("final_level, target_grade, growth")
      .eq("session_id", sessionId)
      .single();

    if (!report?.growth) {
      return { error: "성장 분석 데이터 미생성" };
    }

    const growth = report.growth as {
      improvements: Array<{ area: string; detail: string; evidence_questions: number[] }>;
      weaknesses: Array<{ area: string; detail: string; severity: string; wp_codes: string[] }>;
      type_comparison: Array<{ type: string; type_ko: string; status: string; comment: string; fulfillment_rate: number }>;
      bottleneck_summary: string;
    };

    // 전체 세션 이력 (등급 추이용)
    const { data: allReports } = await supabase
      .from("mock_test_reports")
      .select("session_id, final_level, completed_at")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("completed_at");

    const gradeHistory: GradeHistoryItem[] = (allReports || []).map((r, i) => ({
      session_count: i + 1,
      grade: r.final_level || "IM1",
      date: r.completed_at || "",
    }));

    const currentSessionCount = gradeHistory.length;

    // 이전 세션 찾기
    const prevReport = (allReports || [])
      .filter((r) => r.session_id !== sessionId && (r.completed_at || "") < (session.started_at || ""))
      .pop();

    // 1회차면 성장 분석 불가 — null 반환
    if (!prevReport) {
      return { error: "첫 번째 시험입니다. 다음 시험 후 성장 분석이 제공됩니다." };
    }

    const currentGrade = report.final_level || "IM2";
    const prevGrade = prevReport.final_level || currentGrade;
    const diff = GRADE_ORDER.indexOf(currentGrade) - GRADE_ORDER.indexOf(prevGrade);

    // DB growth → UI GrowthReportV2 변환
    const result: GrowthReportV2 = {
      previous_session: {
        session_id: prevReport?.session_id || "",
        grade: prevGrade,
        date: prevReport?.completed_at || "",
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
        previous: prevGrade,
        current: currentGrade,
        diff,
      },
      // DB: [{area, detail}] → UI: string[]
      improvements: growth.improvements.map((i) => i.detail),
      weaknesses: growth.weaknesses.map((w) => w.detail),
      // DB: [{type, type_ko, status, comment, fulfillment_rate}] → UI 형식
      type_comparison: growth.type_comparison.map((tc) => {
        const rate = tc.fulfillment_rate;
        const met = Math.round(rate * 5);
        const status = TYPE_STATUS_MAP[tc.status] || "maintained";
        return {
          type: tc.type,
          type_label: TYPE_LABEL_MAP[tc.type] || tc.type_ko || tc.type,
          status,
          criteria_met: met,
          criteria_total: 5,
          change_observation: tc.comment,
          remaining: status === "reached"
            ? "목표 등급 수준에 도달하였습니다."
            : `충족률 ${Math.round(rate * 100)}% — 추가 개선이 필요합니다.`,
        };
      }),
      focus_point: {
        area_label: growth.weaknesses[0]?.area || "종합",
        observation: growth.bottleneck_summary,
      },
    };

    return { data: result };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
