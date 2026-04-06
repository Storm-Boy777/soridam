"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { T } from "@/lib/constants/tables";
import type {
  TutoringSession,
  TutoringFocus,
  TutoringDrill,
  TutoringAttempt,
  TutoringEligibility,
  TutoringCredit,
  TutoringHistoryItem,
} from "@/lib/types/tutoring";

type ActionResult<T = null> = {
  error?: string;
  data?: T;
};

// ── 헬퍼: 현재 로그인 유저 ──

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다");
  return { supabase, userId: user.id };
}

import type { SupabaseClient } from "@supabase/supabase-js";

// ── 상수 ──

const MIN_SESSIONS = 3; // 최소 모의고사 회수
const MAX_SESSIONS = 5; // 최대 분석 회수

// ── 헬퍼: 세션 완료 체크 ──

async function checkSessionCompletion(supabase: SupabaseClient, focusId: string) {
  // focus의 session_id 조회
  const { data: focus } = await supabase
    .from(T.tutoring_focuses)
    .select("session_id")
    .eq("id", focusId)
    .single();

  if (!focus?.session_id) return;

  // 해당 세션의 모든 focus 상태 조회
  const { data: allFocuses } = await supabase
    .from(T.tutoring_focuses)
    .select("status")
    .eq("session_id", focus.session_id);

  if (!allFocuses) return;

  // 모든 focus가 graduated이면 세션 완료
  const allGraduated = allFocuses.every(
    (f: { status: string }) => f.status === "graduated"
  );

  if (allGraduated) {
    await supabase
      .from(T.tutoring_sessions)
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", focus.session_id);
  } else {
    // 아직 active가 아니면 active로 전환
    const { data: session } = await supabase
      .from(T.tutoring_sessions)
      .select("status")
      .eq("id", focus.session_id)
      .single();

    if (session?.status === "diagnosed") {
      await supabase
        .from(T.tutoring_sessions)
        .update({ status: "active" })
        .eq("id", focus.session_id);
    }
  }
}

// ============================================================
// 1. 튜터링 진입 자격 확인 (checkTutoringEligibility)
// ============================================================
// - 모의고사 3회 이상 완료 여부
// - 이전 튜터링 이후 새 3회 여부
// - 분석 가능한 세션 수 반환

export async function checkTutoringEligibility(): Promise<ActionResult<TutoringEligibility>> {
  try {
    const { supabase, userId } = await requireUser();

    // 가장 최근 **완료된** 튜터링 세션 조회
    // (diagnosing/diagnosed/active 중인 세션은 제외 — 현재 진행 중이므로)
    const { data: lastTutoring } = await supabase
      .from(T.tutoring_sessions)
      .select("id, analyzed_session_ids, created_at")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 이전 튜터링에 사용된 세션 ID
    const excludeIds: string[] = lastTutoring?.analyzed_session_ids ?? [];

    // 완료된 모의고사 세션 조회 (이전 튜터링 세션 제외)
    let query = supabase
      .from(T.mock_test_sessions)
      .select("session_id, completed_at")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false });

    // 이전 튜터링 세션 제외
    if (excludeIds.length > 0) {
      query = query.not("session_id", "in", `(${excludeIds.join(",")})`);
    }

    const { data: sessions, error } = await query;

    if (error) {
      return { error: `세션 조회 실패: ${error.message}` };
    }

    const completedCount = sessions?.length ?? 0;
    const remaining = Math.max(0, MIN_SESSIONS - completedCount);

    return {
      data: {
        eligible: completedCount >= MIN_SESSIONS,
        completed_count: completedCount,
        required_count: MIN_SESSIONS,
        remaining_count: remaining,
        last_tutoring_session_id: lastTutoring?.id ?? null,
      },
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "알 수 없는 오류" };
  }
}

// ============================================================
// 2. 튜터링 크레딧 확인 (checkTutoringCredit)
// ============================================================

export async function checkTutoringCredit(): Promise<ActionResult<TutoringCredit>> {
  try {
    const { supabase, userId } = await requireUser();

    const { data: balance } = await supabase
      .from(T.polar_balances)
      .select("balance_krw")
      .eq("user_id", userId)
      .single();

    const balanceKrw = balance?.balance_krw ?? 0;

    return {
      data: {
        available: balanceKrw > 0,
        balanceKrw,
        // 하위 호환용
        plan_credits: 0,
        credits: balanceKrw,
      },
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "알 수 없는 오류" };
  }
}

// ============================================================
// 3. 현재 진행 중 세션 조회 (getActiveSession)
// ============================================================
// - 폴링용: 진단 중(diagnosing) / 진단 완료(diagnosed) / 활성(active) 세션 확인

export async function getActiveSession(): Promise<
  ActionResult<{ session: TutoringSession | null }>
> {
  try {
    const { supabase, userId } = await requireUser();

    const { data: session, error } = await supabase
      .from(T.tutoring_sessions)
      .select("*")
      .eq("user_id", userId)
      .in("status", ["diagnosing", "diagnosed", "active"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { error: `세션 조회 실패: ${error.message}` };
    }

    return { data: { session: session as TutoringSession | null } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "알 수 없는 오류" };
  }
}

// ============================================================
// 4. 진단 시작 (startDiagnosis)
// ============================================================
// - 자격/크레딧 확인 → 세션 생성 → EF 호출 (fire-and-forget)
// - 크레딧은 세션 생성 시 소모

export async function startDiagnosis(): Promise<ActionResult<{ session_id: string }>> {
  try {
    const { supabase, userId } = await requireUser();

    // 1. 자격 확인
    const eligibility = await checkTutoringEligibility();
    if (eligibility.error || !eligibility.data?.eligible) {
      return { error: eligibility.error || `모의고사 ${MIN_SESSIONS}회 이상 완료 후 이용 가능합니다.` };
    }

    // 2. 이미 진행 중인 세션 확인
    const { data: existing } = await supabase
      .from(T.tutoring_sessions)
      .select("id")
      .eq("user_id", userId)
      .in("status", ["diagnosing", "diagnosed", "active"])
      .limit(1)
      .maybeSingle();

    if (existing) {
      return { error: "이미 진행 중인 튜터링 세션이 있습니다." };
    }

    // 3. 크레딧 잔액 확인 (실비용은 EF에서 API 호출 시 자동 차감)
    const { data: balance } = await supabase.rpc("polar_get_balance", { p_user_id: userId });
    if (!balance || balance <= 0) {
      return { error: "크레딧이 부족합니다. 스토어에서 충전해주세요." };
    }

    // 4. 분석할 세션 ID 조회 (이전 튜터링 세션 제외, 최근 MAX_SESSIONS개)
    const lastTutoring = eligibility.data.last_tutoring_session_id;
    const excludeIds: string[] = [];
    if (lastTutoring) {
      const { data: prev } = await supabase
        .from(T.tutoring_sessions)
        .select("analyzed_session_ids")
        .eq("id", lastTutoring)
        .single();
      if (prev?.analyzed_session_ids) {
        excludeIds.push(...prev.analyzed_session_ids);
      }
    }

    let sessionQuery = supabase
      .from(T.mock_test_sessions)
      .select("session_id")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(MAX_SESSIONS);

    if (excludeIds.length > 0) {
      sessionQuery = sessionQuery.not("session_id", "in", `(${excludeIds.join(",")})`);
    }

    const { data: sessions } = await sessionQuery;
    const analyzedIds = (sessions ?? []).map((s) => s.session_id);

    if (analyzedIds.length < MIN_SESSIONS) {
      return { error: `분석 가능한 세션이 ${MIN_SESSIONS}회 미만입니다.` };
    }

    // 5. 세션 ID 생성
    const sessionId = `ts_${crypto.randomUUID().slice(0, 8)}`;

    // 6. target_grade 조회 (user metadata에서)
    const { data: { user } } = await supabase.auth.getUser();
    const targetGrade = (user?.user_metadata?.target_grade as string) || "IM3";

    // 7. 세션 생성
    const { error: insertErr } = await supabase
      .from(T.tutoring_sessions)
      .insert({
        id: sessionId,
        user_id: userId,
        analyzed_session_ids: analyzedIds,
        current_stable_level: "IM2", // placeholder — EF가 업데이트
        next_step_level: "IM3",      // placeholder
        final_target_level: targetGrade,
        status: "diagnosing",
      });

    if (insertErr) {
      return { error: `세션 생성 실패: ${insertErr.message}` };
    }

    // 8. EF tutoring-diagnose 호출 (fire-and-forget)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    fetch(`${supabaseUrl}/functions/v1/tutoring-diagnose`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        session_id: sessionId,
        user_id: userId,
        analyzed_session_ids: analyzedIds,
        target_grade: targetGrade,
      }),
    }).catch((err) => {
      console.error("[tutoring-diagnose] fire-and-forget 호출 실패:", err);
    });

    return { data: { session_id: sessionId } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "알 수 없는 오류" };
  }
}

// ============================================================
// 5. 진단 탭 데이터 조회 (getDiagnosisData)
// ============================================================
// - 최신 세션의 진단 결과 + focuses 반환

export async function getDiagnosisData(): Promise<
  ActionResult<{
    session: TutoringSession | null;
    focuses: TutoringFocus[];
  }>
> {
  try {
    const { supabase, userId } = await requireUser();

    // 가장 최근 세션 (진단 완료 이상)
    const { data: session, error: sessionErr } = await supabase
      .from(T.tutoring_sessions)
      .select("*")
      .eq("user_id", userId)
      .in("status", ["diagnosed", "active", "completed"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionErr) {
      return { error: `세션 조회 실패: ${sessionErr.message}` };
    }

    if (!session) {
      return { data: { session: null, focuses: [] } };
    }

    // 해당 세션의 focuses
    const { data: focuses, error: focusErr } = await supabase
      .from(T.tutoring_focuses)
      .select("*")
      .eq("session_id", session.id)
      .order("priority_rank", { ascending: true });

    if (focusErr) {
      return { error: `Focus 조회 실패: ${focusErr.message}` };
    }

    return {
      data: {
        session: session as TutoringSession,
        focuses: (focuses ?? []) as TutoringFocus[],
      },
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "알 수 없는 오류" };
  }
}

// ============================================================
// 6. Focus 드릴 시작 (startFocusDrill)
// ============================================================
// - EF tutoring-generate-drills 호출 → 질문 선택 + 드릴 세션 생성

export async function startFocusDrill(
  focusId: string
): Promise<ActionResult<{ focus_id: string }>> {
  try {
    const { supabase } = await requireUser();

    // focus 존재 확인
    const { data: focus, error: focusErr } = await supabase
      .from(T.tutoring_focuses)
      .select("id, status, drill_session_plan")
      .eq("id", focusId)
      .single();

    if (focusErr || !focus) {
      return { error: "Focus를 찾을 수 없습니다." };
    }

    // 이미 드릴이 생성되어 있으면 바로 반환
    if (focus.drill_session_plan) {
      return { data: { focus_id: focusId } };
    }

    // EF 호출 (await — 드릴 생성 후 UI에 바로 표시)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const response = await fetch(`${supabaseUrl}/functions/v1/tutoring-generate-drills`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ focus_id: focusId }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { error: `드릴 생성 실패: ${errText}` };
    }

    return { data: { focus_id: focusId } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "알 수 없는 오류" };
  }
}

// ============================================================
// 7. 드릴 데이터 조회 (getDrillData)
// ============================================================

export async function getDrillData(
  focusId: string
): Promise<ActionResult<{ drills: TutoringDrill[]; attempts: TutoringAttempt[] }>> {
  try {
    const { supabase } = await requireUser();

    const { data: drills, error: drillErr } = await supabase
      .from(T.tutoring_drills)
      .select("*")
      .eq("focus_id", focusId)
      .order("question_number", { ascending: true });

    if (drillErr) {
      return { error: `드릴 조회 실패: ${drillErr.message}` };
    }

    // 모든 드릴의 시도 기록
    const drillIds = (drills ?? []).map((d: { id: string }) => d.id);
    let attempts: TutoringAttempt[] = [];
    if (drillIds.length > 0) {
      const { data: attData } = await supabase
        .from(T.tutoring_attempts)
        .select("*")
        .in("drill_id", drillIds)
        .order("created_at", { ascending: true });
      attempts = (attData ?? []) as TutoringAttempt[];
    }

    return {
      data: {
        drills: (drills ?? []) as TutoringDrill[],
        attempts,
      },
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "알 수 없는 오류" };
  }
}

// ============================================================
// 8. 드릴 시도 제출 (submitDrillAttempt)
// ============================================================
// - 녹음 업로드 → attempt 레코드 생성 → EF tutoring-evaluate 호출

export async function submitDrillAttempt(
  drillId: string,
  audioBlob: Blob
): Promise<ActionResult<{ attempt_id: string }>> {
  try {
    const { supabase, userId } = await requireUser();

    // 드릴 확인
    const { data: drill } = await supabase
      .from(T.tutoring_drills)
      .select("id, focus_id, question_number")
      .eq("id", drillId)
      .single();

    if (!drill) return { error: "드릴을 찾을 수 없습니다." };

    // 시도 횟수 확인
    const { count } = await supabase
      .from(T.tutoring_attempts)
      .select("*", { count: "exact", head: true })
      .eq("drill_id", drillId);

    const attemptNumber = (count ?? 0) + 1;
    const attemptId = `ta_${crypto.randomUUID().slice(0, 8)}`;

    // 녹음 업로드
    const audioPath = `${userId}/${drill.focus_id}/${drillId}/${attemptId}.webm`;
    const { error: uploadErr } = await supabase.storage
      .from("tutoring-recordings")
      .upload(audioPath, audioBlob, { contentType: "audio/webm" });

    if (uploadErr) {
      return { error: `녹음 업로드 실패: ${uploadErr.message}` };
    }

    // attempt 레코드 생성
    const { error: insertErr } = await supabase
      .from(T.tutoring_attempts)
      .insert({
        id: attemptId,
        drill_id: drillId,
        attempt_number: attemptNumber,
        audio_url: audioPath,
        result: "pending",
      });

    if (insertErr) {
      return { error: `시도 생성 실패: ${insertErr.message}` };
    }

    // EF 호출 (await — 결과를 바로 UI에 보여줘야 함)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const response = await fetch(`${supabaseUrl}/functions/v1/tutoring-evaluate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        attempt_id: attemptId,
        drill_id: drillId,
        audio_url: audioPath,
      }),
    });

    if (!response.ok) {
      console.error("[submitDrillAttempt] EF 호출 실패:", await response.text());
    }

    return { data: { attempt_id: attemptId } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "알 수 없는 오류" };
  }
}

// ============================================================
// 9. 튜터링 이력 조회 (getTutoringHistory)
// ============================================================

export async function getTutoringHistory(): Promise<ActionResult<TutoringHistoryItem[]>> {
  try {
    const { supabase, userId } = await requireUser();

    const { data: sessions, error } = await supabase
      .from(T.tutoring_sessions)
      .select(`
        id,
        current_stable_level,
        next_step_level,
        final_target_level,
        status,
        created_at,
        completed_at,
        tutoring_focuses(id, status)
      `)
      .eq("user_id", userId)
      .in("status", ["diagnosed", "active", "completed"])
      .order("created_at", { ascending: false });

    if (error) {
      return { error: `이력 조회 실패: ${error.message}` };
    }

    const history: TutoringHistoryItem[] = (sessions ?? []).map((s: {
      id: string;
      current_stable_level: string;
      next_step_level: string;
      final_target_level: string;
      status: string;
      created_at: string;
      completed_at: string | null;
      tutoring_focuses: { id: string; status: string }[];
    }) => {
      const focuses = s.tutoring_focuses ?? [];
      return {
        session_id: s.id,
        current_stable_level: s.current_stable_level as import("@/lib/types/mock-exam").OpicLevel,
        next_step_level: s.next_step_level as import("@/lib/types/mock-exam").OpicLevel,
        final_target_level: s.final_target_level as import("@/lib/types/mock-exam").OpicLevel,
        status: s.status as import("@/lib/types/tutoring").TutoringStatus,
        focus_count: focuses.length,
        graduated_count: focuses.filter((f) => f.status === "graduated").length,
        created_at: s.created_at,
        completed_at: s.completed_at,
      };
    });

    return { data: history };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "알 수 없는 오류" };
  }
}

// ============================================================
// 10. 미니 재평가 생성 (createMiniRetest)
// ============================================================

export async function createMiniRetest(
  focusId: string
): Promise<ActionResult<{ retest_id: string }>> {
  try {
    const { supabase } = await requireUser();

    // focus 조회 + 기존 드릴 조회 병렬 실행
    const [focusRes, existingDrillsRes] = await Promise.all([
      supabase
        .from(T.tutoring_focuses)
        .select("id, focus_code, selection_policy")
        .eq("id", focusId)
        .single(),
      supabase
        .from(T.tutoring_drills)
        .select("question_id")
        .eq("focus_id", focusId),
    ]);

    const focus = focusRes.data;
    if (!focus) return { error: "Focus를 찾을 수 없습니다." };

    const policy = focus.selection_policy as { question_type?: string; primary_topic?: string } | null;
    const questionType = policy?.question_type ?? "comparison";
    const topic = policy?.primary_topic;

    const usedIds = (existingDrillsRes.data ?? []).map((d: { question_id: string }) => d.question_id);

    // 다른 topic에서 2문항 선택 (transfer 확인 목적)
    let query = supabase
      .from(T.questions)
      .select("id, question_type_eng, topic, question_english")
      .eq("question_type_eng", questionType);

    if (topic) {
      query = query.neq("topic", topic); // 다른 topic에서
    }
    if (usedIds.length > 0) {
      query = query.not("id", "in", `(${usedIds.join(",")})`);
    }

    const { data: questions } = await query.limit(2);

    if (!questions || questions.length === 0) {
      return { error: "재평가용 질문을 찾을 수 없습니다." };
    }

    const retestId = `tr_${crypto.randomUUID().slice(0, 8)}`;
    const retestQuestions = questions.map((q: { id: string; question_english: string; topic: string }) => ({
      question_id: q.id,
      question_english: q.question_english,
      topic: q.topic,
    }));

    const { error: insertErr } = await supabase
      .from(T.tutoring_retests)
      .insert({
        id: retestId,
        focus_id: focusId,
        retest_mode: "bottleneck",
        questions: retestQuestions,
      });

    if (insertErr) {
      return { error: `재평가 생성 실패: ${insertErr.message}` };
    }

    return { data: { retest_id: retestId } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "알 수 없는 오류" };
  }
}

// ============================================================
// 11. 미니 재평가 조회 (getRetestData)
// ============================================================

export async function getRetestData(
  retestId: string
): Promise<ActionResult<{ retest: import("@/lib/types/tutoring").TutoringRetest | null }>> {
  try {
    const { supabase } = await requireUser();

    const { data, error } = await supabase
      .from(T.tutoring_retests)
      .select("*")
      .eq("id", retestId)
      .single();

    if (error) return { error: `재평가 조회 실패: ${error.message}` };

    return { data: { retest: data as import("@/lib/types/tutoring").TutoringRetest } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "알 수 없는 오류" };
  }
}

// ============================================================
// 12. 미니 재평가 결과 제출 (submitRetestResult)
// ============================================================

export async function submitRetestResult(
  retestId: string,
  results: { question_id: string; transcript: string; audio_url: string | null; passed: boolean }[]
): Promise<ActionResult<{ overall_result: string }>> {
  try {
    const { supabase } = await requireUser();

    // 재평가 조회
    const { data: retest } = await supabase
      .from(T.tutoring_retests)
      .select("id, focus_id, questions")
      .eq("id", retestId)
      .single();

    if (!retest) return { error: "재평가를 찾을 수 없습니다." };

    // 결과 판정
    const passedCount = results.filter((r) => r.passed).length;
    const totalCount = results.length;
    const passRate = totalCount > 0 ? passedCount / totalCount : 0;

    let overallResult: "graduated" | "improving" | "hold";
    if (passRate >= 0.8) {
      overallResult = "graduated";
    } else if (passRate >= 0.5) {
      overallResult = "improving";
    } else {
      overallResult = "hold";
    }

    // 재평가 업데이트
    await supabase
      .from(T.tutoring_retests)
      .update({ results, overall_result: overallResult })
      .eq("id", retestId);

    // focus 상태 업데이트 + 졸업 판정 자동화
    if (overallResult === "graduated") {
      // 졸업: retest_pass_count 1 + status graduated
      await supabase
        .from(T.tutoring_focuses)
        .update({
          status: "graduated",
          retest_pass_count: 1,
        })
        .eq("id", retest.focus_id);

      // 다음 pending focus를 active로 전환
      const { data: nextFocus } = await supabase
        .from(T.tutoring_focuses)
        .select("id")
        .eq("session_id", (
          await supabase
            .from(T.tutoring_focuses)
            .select("session_id")
            .eq("id", retest.focus_id)
            .single()
        ).data?.session_id ?? "")
        .eq("status", "pending")
        .order("priority_rank", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (nextFocus) {
        await supabase
          .from(T.tutoring_focuses)
          .update({ status: "active" })
          .eq("id", nextFocus.id);
      }

      // 모든 focus가 graduated인지 체크 → 세션 완료
      await checkSessionCompletion(supabase, retest.focus_id);
    } else if (overallResult === "improving") {
      await supabase
        .from(T.tutoring_focuses)
        .update({ status: "improving" })
        .eq("id", retest.focus_id);
    }
    // hold는 status 변경 없음

    return { data: { overall_result: overallResult } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "알 수 없는 오류" };
  }
}
