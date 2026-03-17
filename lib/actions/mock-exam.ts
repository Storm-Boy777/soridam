"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import {
  createSessionSchema,
  submitAnswerSchema,
  getSessionSchema,
  expireSessionSchema,
  completeSessionSchema,
} from "@/lib/validations/mock-exam";
import {
  generateSessionId,
  type MockTestSession,
  type MockTestAnswer,
  type MockTestEvaluation,
  type MockTestReport,
  type MockExamHistoryItem,
  type ExamPoolPreview,
  type ExamPoolTopic,
} from "@/lib/types/mock-exam";

type ActionResult<T = null> = {
  error?: string;
  data?: T;
};

// ── 헬퍼: 현재 로그인 유저 ID ──

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다");
  return { supabase, userId: user.id };
}

// ============================================================
// 1. 기출 풀 조회 (getExamPool)
// ============================================================

export async function getExamPool(): Promise<ActionResult<ExamPoolPreview[]>> {
  try {
    const { supabase, userId } = await requireUser();

    // 사용자가 이미 사용한 기출(submission_id) 목록
    const { data: usedSessions } = await supabase
      .from("mock_test_sessions")
      .select("submission_id")
      .eq("user_id", userId)
      .neq("status", "expired");

    const usedIds = (usedSessions || []).map((s) => s.submission_id);

    // 승인된 기출 조회 (본인 후기 제외)
    let query = supabase
      .from("submissions")
      .select("id, exam_date, achieved_level")
      .eq("status", "complete")
      .eq("exam_approved", "approved")
      .neq("user_id", userId);

    if (usedIds.length > 0) {
      // Supabase에서 NOT IN → .not('id', 'in', `(${ids})`) 형태
      query = query.not("id", "in", `(${usedIds.join(",")})`);
    }

    const { data: candidates, error: candError } = await query
      .order("exam_date", { ascending: false })
      .limit(20);

    if (candError) {
      return { error: "기출 목록 조회 실패" };
    }

    // 사용 가능한 기출이 3개 미만이면 이력 리셋 후 재조회
    let pool = candidates || [];
    if (pool.length < 3) {
      // 전체 승인된 기출에서 랜덤 추출 (이력 무시)
      const { data: allCandidates } = await supabase
        .from("submissions")
        .select("id, exam_date, achieved_level")
        .eq("status", "complete")
        .eq("exam_approved", "approved")
        .neq("user_id", userId)
        .order("exam_date", { ascending: false })
        .limit(20);

      pool = allCandidates || [];
    }

    if (pool.length === 0) {
      return { data: [] };
    }

    // 랜덤 3개 추출
    const shuffled = pool.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 3);

    // 선택된 기출의 콤보+질문 정보 조회
    const submissionIds = selected.map((s) => s.id);

    const [{ data: combos }, { data: subQuestionRows }] = await Promise.all([
      supabase
        .from("submission_combos")
        .select("submission_id, combo_type, topic")
        .in("submission_id", submissionIds),
      supabase
        .from("submission_questions")
        .select("submission_id, question_id, topic")
        .in("submission_id", submissionIds),
    ]);

    // questions 테이블에서 question_type 조회
    const questionIds = (subQuestionRows || [])
      .map((q) => q.question_id)
      .filter(Boolean);

    const { data: questionTypes } = questionIds.length > 0
      ? await supabase
          .from("questions")
          .select("id, question_type_eng")
          .in("id", questionIds)
      : { data: [] };

    const qtMap = new Map(
      (questionTypes || []).map((q) => [q.id, q.question_type_eng])
    );

    // combo_type → category 매핑
    const comboToCategory = (ct: string) =>
      ct.startsWith("general") ? "일반" : ct === "roleplay" ? "롤플레이" : "어드밴스";

    // 미리보기 카드 구성
    const previews: ExamPoolPreview[] = selected.map((sub) => {
      const subCombos = (combos || []).filter(
        (c) => c.submission_id === sub.id
      );
      const subQs = (subQuestionRows || []).filter(
        (q) => q.submission_id === sub.id
      );

      // 콤보별 대표 주제
      const topics: ExamPoolTopic[] = subCombos.map((c) => ({
        combo_type: c.combo_type,
        topic: c.topic,
        category: comboToCategory(c.combo_type),
      }));

      // question_type 분포
      const typeDist: Record<string, number> = {};
      for (const q of subQs) {
        const qt = qtMap.get(q.question_id) || "unknown";
        typeDist[qt] = (typeDist[qt] || 0) + 1;
      }

      // 난이도 힌트 (UX 1-1)
      const allTypes = subQs
        .map((q) => qtMap.get(q.question_id))
        .filter(Boolean) as string[];
      const advCount = allTypes.filter((t) =>
        ["comparison", "past_childhood", "past_recent", "past_special", "rp_12", "adv_14", "adv_15"].includes(t)
      ).length;
      const ratio = allTypes.length > 0 ? advCount / allTypes.length : 0;
      const difficultyHint = ratio >= 0.6 ? 3 : ratio >= 0.4 ? 2 : 1;

      return {
        submission_id: sub.id,
        exam_date: sub.exam_date,
        achieved_level: sub.achieved_level,
        topics,
        question_type_distribution: typeDist,
        difficulty_hint: difficultyHint,
      };
    });

    return { data: previews };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "기출 조회 실패" };
  }
}

// ============================================================
// 2. 세션 생성 (createSession)
// ============================================================

export async function createSession(
  input: Record<string, unknown>
): Promise<ActionResult<{ session_id: string }>> {
  const parsed = createSessionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const { supabase, userId } = await requireUser();

    // 기존 활성 세션 확인 (동시 1개 제한)
    const { data: activeSessions } = await supabase
      .from("mock_test_sessions")
      .select("session_id, mode, current_question, started_at")
      .eq("user_id", userId)
      .eq("status", "active");

    if (activeSessions && activeSessions.length > 0) {
      return {
        error: `진행 중인 모의고사가 있습니다. (${activeSessions[0].session_id})`,
      };
    }

    // 크레딧 차감 (plpgsql RPC)
    const { data: creditOk, error: creditErr } = await supabase.rpc(
      "consume_mock_exam_credit",
      { p_user_id: userId }
    );

    if (creditErr || !creditOk) {
      return { error: "모의고사 크레딧이 부족합니다" };
    }

    // 기출 문제 ID 조회 (Q1~Q15, Q1 자기소개 포함)
    const { data: subQuestions, error: sqErr } = await supabase
      .from("submission_questions")
      .select("question_id")
      .eq("submission_id", parsed.data.submission_id)
      .order("question_number", { ascending: true });

    if (sqErr || !subQuestions || subQuestions.length === 0) {
      // 크레딧 환불
      const { error: refundErr } = await supabase.rpc("refund_mock_exam_credit", { p_user_id: userId });
      if (refundErr) console.error("크레딧 환불 실패:", refundErr);
      return { error: "기출 문제를 조회할 수 없습니다" };
    }

    const questionIds = subQuestions.map((q) => q.question_id);

    // 세션 만료 시간 계산
    const now = new Date();
    const expiresAt =
      parsed.data.mode === "training"
        ? new Date(now.getTime() + 72 * 60 * 60 * 1000) // 72시간
        : new Date(now.getTime() + 90 * 60 * 1000); // 90분

    const sessionId = generateSessionId();

    // 세션 INSERT
    const { error: insertErr } = await supabase
      .from("mock_test_sessions")
      .insert({
        session_id: sessionId,
        user_id: userId,
        submission_id: parsed.data.submission_id,
        mode: parsed.data.mode,
        status: "active",
        question_ids: questionIds,
        current_question: 1,
        total_questions: 15,
        expires_at: expiresAt.toISOString(),
      });

    if (insertErr) {
      // 크레딧 환불
      const { error: refundErr } = await supabase.rpc("refund_mock_exam_credit", { p_user_id: userId });
      if (refundErr) console.error("크레딧 환불 실패:", refundErr);
      return { error: "세션 생성 실패" };
    }

    return { data: { session_id: sessionId } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "세션 생성 실패" };
  }
}

// ============================================================
// 3. 답변 제출 (submitAnswer)
// ============================================================

export async function submitAnswer(
  input: Record<string, unknown>
): Promise<ActionResult<{ answer_id: string }>> {
  const parsed = submitAnswerSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const { supabase, userId } = await requireUser();

    // 세션 소유자 확인 + 상태 검증
    const { data: session, error: sessErr } = await supabase
      .from("mock_test_sessions")
      .select("user_id, status, mode, expires_at")
      .eq("session_id", parsed.data.session_id)
      .single();

    if (sessErr || !session) {
      return { error: "세션을 찾을 수 없습니다" };
    }
    if (session.user_id !== userId) {
      return { error: "권한이 없습니다" };
    }
    if (session.status !== "active") {
      return { error: "종료된 세션입니다" };
    }

    // 만료 확인
    if (new Date(session.expires_at) < new Date()) {
      await supabase
        .from("mock_test_sessions")
        .update({ status: "expired" })
        .eq("session_id", parsed.data.session_id);
      return { error: "세션이 만료되었습니다" };
    }

    // Q1은 평가 제외 (F-6)
    const isQ1 = parsed.data.question_number === 1;

    // 답변 UPSERT
    const { data: answer, error: ansErr } = await supabase
      .from("mock_test_answers")
      .upsert(
        {
          session_id: parsed.data.session_id,
          question_number: parsed.data.question_number,
          question_id: parsed.data.question_id,
          audio_url: parsed.data.audio_url,
          audio_duration: parsed.data.audio_duration,
          eval_status: isQ1 ? "skipped" : "pending",
          skipped: isQ1,
        },
        { onConflict: "session_id,question_number" }
      )
      .select("id")
      .single();

    if (ansErr || !answer) {
      return { error: "답변 저장 실패" };
    }

    // 현재 문항 업데이트
    await supabase
      .from("mock_test_sessions")
      .update({
        current_question: parsed.data.question_number + 1,
      })
      .eq("session_id", parsed.data.session_id);

    // Q2~Q15: fire-and-forget → Edge Function (Stage A)
    if (!isQ1) {
      const efUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/mock-test-process`;
      // fire-and-forget: await 하지 않음
      fetch(efUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          session_id: parsed.data.session_id,
          question_number: parsed.data.question_number,
          question_id: parsed.data.question_id,
          audio_url: parsed.data.audio_url,
          audio_duration: parsed.data.audio_duration,
        }),
      }).catch((err) => {
        console.error("fire-and-forget mock-test-process 호출 실패:", err?.message || err);
      });
    }

    return { data: { answer_id: answer.id } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "답변 제출 실패" };
  }
}

// ============================================================
// 4. 세션 상세 조회 (getSession)
// ============================================================

export async function getSession(
  input: Record<string, unknown>
): Promise<
  ActionResult<{
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
  }>
> {
  const parsed = getSessionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const { supabase, userId } = await requireUser();

    // 세션 조회
    const { data: session, error: sessErr } = await supabase
      .from("mock_test_sessions")
      .select("*")
      .eq("session_id", parsed.data.session_id)
      .eq("user_id", userId)
      .single();

    if (sessErr || !session) {
      return { error: "세션을 찾을 수 없습니다" };
    }

    // 답변 + 평가 + 리포트 + 질문 정보 병렬 조회
    const [
      { data: answers },
      { data: evaluations },
      { data: report },
      { data: questions },
    ] = await Promise.all([
      supabase
        .from("mock_test_answers")
        .select("*")
        .eq("session_id", parsed.data.session_id)
        .order("question_number"),
      supabase
        .from("mock_test_evaluations")
        .select("*")
        .eq("session_id", parsed.data.session_id)
        .order("question_number"),
      supabase
        .from("mock_test_reports")
        .select("*")
        .eq("session_id", parsed.data.session_id)
        .maybeSingle(),
      // 세션의 question_ids로 질문 정보 조회
      supabase
        .from("questions")
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
  } catch (err) {
    return { error: err instanceof Error ? err.message : "세션 조회 실패" };
  }
}

// ============================================================
// 6. 세션 완료 처리 (completeSession)
// ============================================================

export async function completeSession(
  input: Record<string, unknown>
): Promise<ActionResult> {
  const parsed = completeSessionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const { supabase, userId } = await requireUser();

    // 세션 소유자 확인
    const { data: session } = await supabase
      .from("mock_test_sessions")
      .select("user_id, status")
      .eq("session_id", parsed.data.session_id)
      .single();

    if (!session || session.user_id !== userId) {
      return { error: "권한이 없습니다" };
    }
    if (session.status !== "active") {
      return { error: "이미 종료된 세션입니다" };
    }

    // 세션 완료 처리
    const { error: updateErr } = await supabase
      .from("mock_test_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        holistic_status: "pending",
      })
      .eq("session_id", parsed.data.session_id);

    if (updateErr) {
      return { error: "세션 완료 처리 실패" };
    }

    // 모든 답변 평가가 이미 완료된 경우 → Stage C 즉시 트리거
    // (Stage B보다 completeSession이 늦게 호출되는 Case A 대응)
    const { data: pendingAnswers } = await supabase
      .from("mock_test_answers")
      .select("question_number, eval_status")
      .eq("session_id", parsed.data.session_id)
      .not("eval_status", "in", '("completed","skipped","failed")');

    if (!pendingAnswers || pendingAnswers.length === 0) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

      fetch(`${supabaseUrl}/functions/v1/mock-test-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ session_id: parsed.data.session_id }),
      }).catch(() => {
        // fire-and-forget: 실패 시 폴링에서 stuck 감지
      });
    }

    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "세션 완료 실패" };
  }
}

// ============================================================
// 7. 세션 만료 처리 (expireSession)
// ============================================================

export async function expireSession(
  input: Record<string, unknown>
): Promise<ActionResult> {
  const parsed = expireSessionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const { supabase, userId } = await requireUser();

    const { error } = await supabase
      .from("mock_test_sessions")
      .update({ status: "expired" })
      .eq("session_id", parsed.data.session_id)
      .eq("user_id", userId)
      .eq("status", "active");

    if (error) {
      return { error: "세션 만료 처리 실패" };
    }

    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "만료 처리 실패" };
  }
}

// ============================================================
// 8. 이력 조회 (getHistory)
// ============================================================

export async function getHistory(): Promise<
  ActionResult<MockExamHistoryItem[]>
> {
  try {
    const { supabase, userId } = await requireUser();

    // 세션 + 리포트 조인 조회
    const { data: sessions, error: sessErr } = await supabase
      .from("mock_test_sessions")
      .select(`
        session_id,
        mode,
        status,
        started_at,
        completed_at,
        submission_id,
        question_ids
      `)
      .eq("user_id", userId)
      .in("status", ["completed", "expired"])
      .order("started_at", { ascending: false })
      .limit(50);

    if (sessErr || !sessions) {
      return { error: "이력 조회 실패" };
    }

    if (sessions.length === 0) {
      return { data: [] };
    }

    // 리포트 조회
    const sessionIds = sessions.map((s) => s.session_id);
    const { data: reports } = await supabase
      .from("mock_test_reports")
      .select("session_id, final_level, total_score, score_f, score_a, score_c, score_t, coaching_report")
      .in("session_id", sessionIds);

    const reportMap = new Map(
      (reports || []).map((r) => [r.session_id, r])
    );

    // 주제 요약 (question_ids → topics)
    const allQuestionIds = sessions.flatMap((s) => s.question_ids || []);
    const uniqueIds = [...new Set(allQuestionIds)];

    const { data: questionTopics } = uniqueIds.length > 0
      ? await supabase
          .from("questions")
          .select("id, topic")
          .in("id", uniqueIds)
      : { data: [] };

    const topicMap = new Map(
      (questionTopics || []).map((q) => [q.id, q.topic])
    );

    // 완료된 세션 수 (회차 계산용, 오래된 순)
    const completedCount = sessions.filter((s) => s.status === "completed").length;
    let completedIdx = completedCount; // 최신→오래된 역순이므로 카운트다운

    // 이력 아이템 구성
    const history: MockExamHistoryItem[] = sessions.map((s) => {
      const report = reportMap.get(s.session_id);
      // Q1(자기소개) 제외하고 토픽 추출
      const topics = (s.question_ids || []).slice(1)
        .map((id: string) => topicMap.get(id))
        .filter(Boolean);
      const uniqueTopics = [...new Set(topics)];

      // 코칭 헤드라인 추출
      const coaching = report?.coaching_report as Record<string, unknown> | null;
      const snapshot = coaching?.snapshot as Record<string, unknown> | null;
      const headline = (snapshot?.headline as string) || null;

      // 회차 번호 (완료된 세션만 번호 부여)
      const attemptNumber = s.status === "completed" ? completedIdx-- : 0;

      return {
        session_id: s.session_id,
        mode: s.mode,
        status: s.status,
        started_at: s.started_at,
        completed_at: s.completed_at,
        final_level: report?.final_level ?? null,
        total_score: report?.total_score == null ? null : Number(report.total_score),
        score_f: report?.score_f == null ? null : Number(report.score_f),
        score_a: report?.score_a == null ? null : Number(report.score_a),
        score_c: report?.score_c == null ? null : Number(report.score_c),
        score_t: report?.score_t == null ? null : Number(report.score_t),
        topic_summary: uniqueTopics.slice(0, 5).join(", "),
        coaching_headline: headline,
        attempt_number: attemptNumber,
      };
    });

    return { data: history };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "이력 조회 실패" };
  }
}

// ============================================================
// 9. 활성 세션 확인 (getActiveSession)
// ============================================================

export async function getActiveSession(): Promise<
  ActionResult<{
    session_id: string;
    mode: string;
    current_question: number;
    started_at: string;
  } | null>
> {
  try {
    const { supabase, userId } = await requireUser();

    const { data: session } = await supabase
      .from("mock_test_sessions")
      .select("session_id, mode, current_question, started_at, expires_at")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (!session) {
      return { data: null };
    }

    // 만료 확인
    if (new Date(session.expires_at) < new Date()) {
      await supabase
        .from("mock_test_sessions")
        .update({ status: "expired" })
        .eq("session_id", session.session_id);
      return { data: null };
    }

    return {
      data: {
        session_id: session.session_id,
        mode: session.mode,
        current_question: session.current_question,
        started_at: session.started_at,
      },
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "세션 확인 실패" };
  }
}

// ============================================================
// 10. 개별 평가 결과 조회 (getEvaluation)
// ============================================================

export async function getEvaluation(input: {
  session_id: string;
  question_number: number;
}): Promise<ActionResult<MockTestEvaluation | null>> {
  try {
    const { supabase, userId } = await requireUser();

    // 평가 + 답변 오디오 URL 병렬 조회
    const [evalRes, answerRes] = await Promise.all([
      supabase
        .from("mock_test_evaluations")
        .select("*")
        .eq("session_id", input.session_id)
        .eq("question_number", input.question_number)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("mock_test_answers")
        .select("audio_url")
        .eq("session_id", input.session_id)
        .eq("question_number", input.question_number)
        .maybeSingle(),
    ]);

    if (evalRes.error) {
      return { error: "평가 조회 실패" };
    }

    if (!evalRes.data) return { data: null };

    return {
      data: {
        ...(evalRes.data as MockTestEvaluation),
        audio_url: answerRes.data?.audio_url ?? null,
      },
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "평가 조회 실패" };
  }
}

// ============================================================
// 11. 모의고사 크레딧 확인 (checkMockExamCredit)
// ============================================================

export async function checkMockExamCredit(): Promise<
  ActionResult<{
    available: boolean;
    planCredits: number;
    credits: number;
  }>
> {
  try {
    const { supabase, userId } = await requireUser();

    const { data, error } = await supabase
      .from("user_credits")
      .select("plan_mock_exam_credits, mock_exam_credits")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return { error: "크레딧 정보를 조회할 수 없습니다" };
    }

    const planCredits = Number(data.plan_mock_exam_credits ?? 0);
    const credits = Number(data.mock_exam_credits ?? 0);

    return {
      data: {
        available: planCredits + credits > 0,
        planCredits,
        credits,
      },
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "크레딧 조회 실패" };
  }
}
