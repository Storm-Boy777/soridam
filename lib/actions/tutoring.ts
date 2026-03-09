"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import type {
  TutoringSession,
  TutoringPrescriptionRow,
  TutoringSkillHistory,
  PrescriptionEngineInput,
  LevelParams,
} from "@/lib/types/tutoring";
import {
  getLevelRange,
  LEVEL_PARAMS,
  DRILL_TAG_TO_QUESTION_TYPE,
} from "@/lib/types/tutoring";

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
// 1. 진단 데이터 조회 (getDiagnosis)
// ============================================================

interface DiagnosisResult {
  sessions: TutoringSession[];
  mockReports: Array<{
    session_id: string;
    final_level: string;
    target_level: string;
    score_f: number;
    score_a: number;
    score_c: number;
    score_t: number;
    total_score: number;
    coaching_report: Record<string, unknown> | null;
    tutoring_prescription: Record<string, unknown> | null;
    avg_completion_rate: number | null;
    created_at: string;
  }>;
  skillHistory: TutoringSkillHistory[];
  // 활성 세션의 처방 목록 (처방 탭 즉시 표시용)
  activePrescriptions: TutoringPrescriptionRow[];
}

export async function getDiagnosis(): Promise<ActionResult<DiagnosisResult>> {
  try {
    const { supabase, userId } = await requireUser();

    // 병렬 조회: 튜터링 세션 + 모의고사 리포트 + 성장 이력
    const [sessionsRes, reportsRes, skillRes] = await Promise.all([
      supabase
        .from("tutoring_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("mock_test_reports")
        .select(
          "session_id, final_level, target_level, score_f, score_a, score_c, score_t, total_score, coaching_report, tutoring_prescription, avg_completion_rate, created_at"
        )
        .eq("user_id", userId)
        .eq("report_status", "completed")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("tutoring_skill_history")
        .select("*")
        .eq("user_id", userId)
        .order("recorded_at", { ascending: false })
        .limit(50),
    ]);

    const sessions = (sessionsRes.data || []) as TutoringSession[];

    // 활성 세션이 있으면 처방 목록도 함께 조회 (처방 탭 즉시 표시용)
    const activeSession = sessions.find((s) => s.status === "active");
    let activePrescriptions: TutoringPrescriptionRow[] = [];
    if (activeSession) {
      const { data: prescData } = await supabase
        .from("tutoring_prescriptions")
        .select("*")
        .eq("session_id", activeSession.id)
        .eq("user_id", userId)
        .order("priority");
      activePrescriptions = (prescData || []) as TutoringPrescriptionRow[];
    }

    return {
      data: {
        sessions,
        mockReports: reportsRes.data || [],
        skillHistory: (skillRes.data || []) as TutoringSkillHistory[],
        activePrescriptions,
      },
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "진단 데이터 조회 실패" };
  }
}

// ============================================================
// 2. 튜터링 세션 시작 (startTutoringSession)
//    모의고사 리포트 → 처방 자동 생성
// ============================================================

interface StartSessionInput {
  mock_test_session_id: string;
}

interface StartSessionResult {
  session: TutoringSession;
  prescriptions: TutoringPrescriptionRow[];
}

export async function startTutoringSession(
  input: StartSessionInput
): Promise<ActionResult<StartSessionResult>> {
  try {
    const { supabase, userId } = await requireUser();

    // 1. 모의고사 리포트 조회
    const { data: report, error: reportErr } = await supabase
      .from("mock_test_reports")
      .select(
        "session_id, final_level, target_level, coaching_report, tutoring_prescription"
      )
      .eq("session_id", input.mock_test_session_id)
      .eq("user_id", userId)
      .eq("report_status", "completed")
      .maybeSingle();

    if (reportErr || !report) {
      return { error: "완료된 모의고사 리포트가 없습니다" };
    }

    if (!report.tutoring_prescription) {
      return { error: "처방 데이터가 없습니다. 종합평가가 v3인 모의고사가 필요합니다." };
    }

    // 2. 기존 활성 세션 확인 (같은 모의고사)
    const { data: existing } = await supabase
      .from("tutoring_sessions")
      .select("id")
      .eq("user_id", userId)
      .eq("mock_test_session_id", input.mock_test_session_id)
      .eq("status", "active")
      .maybeSingle();

    if (existing) {
      // 기존 세션의 처방 목록 반환
      const { data: prescriptions } = await supabase
        .from("tutoring_prescriptions")
        .select("*")
        .eq("session_id", existing.id)
        .order("priority");

      const { data: session } = await supabase
        .from("tutoring_sessions")
        .select("*")
        .eq("id", existing.id)
        .single();

      return {
        data: {
          session: session as TutoringSession,
          prescriptions: (prescriptions || []) as TutoringPrescriptionRow[],
        },
      };
    }

    // 3. 처방 엔진: tutoring_prescription → prescriptions 목록 변환
    const currentLevel = report.final_level || "IM1";
    const targetLevel = report.target_level || "IH";
    const levelRange = getLevelRange(currentLevel, targetLevel);
    const levelParams = LEVEL_PARAMS[levelRange];

    const prescriptionItems = buildPrescriptions(
      report.tutoring_prescription as PrescriptionEngineInput["tutoring_prescription"],
      report.coaching_report as Record<string, unknown> | null,
      currentLevel,
      targetLevel,
      levelParams
    );

    // 4. 세션 생성
    const { data: session, error: sessionErr } = await supabase
      .from("tutoring_sessions")
      .insert({
        user_id: userId,
        mock_test_session_id: input.mock_test_session_id,
        target_level: targetLevel,
        current_level: currentLevel,
        total_prescriptions: prescriptionItems.length,
      })
      .select()
      .single();

    if (sessionErr || !session) {
      return { error: sessionErr?.message || "세션 생성 실패" };
    }

    // 5. 처방 과제 일괄 생성
    const prescriptionRows = prescriptionItems.map((item) => ({
      session_id: session.id,
      user_id: userId,
      priority: item.priority,
      question_type: item.question_type,
      topic_id: item.topic_id,
      weakness_tags: item.weakness_tags,
      source: item.source,
      source_data: item.source_data,
      level_params: levelParams,
    }));

    const { data: prescriptions, error: prescErr } = await supabase
      .from("tutoring_prescriptions")
      .insert(prescriptionRows)
      .select();

    if (prescErr) {
      return { error: prescErr.message };
    }

    return {
      data: {
        session: session as TutoringSession,
        prescriptions: (prescriptions || []) as TutoringPrescriptionRow[],
      },
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "튜터링 세션 시작 실패",
    };
  }
}

// ============================================================
// 3. 처방 목록 조회 (getPrescriptions)
// ============================================================

export async function getPrescriptions(
  sessionId: string
): Promise<ActionResult<TutoringPrescriptionRow[]>> {
  try {
    const { supabase, userId } = await requireUser();

    const { data, error } = await supabase
      .from("tutoring_prescriptions")
      .select("*")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .order("priority");

    if (error) return { error: error.message };
    return { data: (data || []) as TutoringPrescriptionRow[] };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "처방 조회 실패" };
  }
}

// ============================================================
// 4. 훈련 세션 생성 (createTrainingSession)
// ============================================================

interface CreateTrainingInput {
  prescription_id: string;
  session_type?: "guided" | "free" | "simulation";
}

export async function createTrainingSession(
  input: CreateTrainingInput
): Promise<ActionResult<{ training_session_id: string }>> {
  try {
    const { supabase, userId } = await requireUser();

    // 처방 조회
    const { data: prescription, error: prescErr } = await supabase
      .from("tutoring_prescriptions")
      .select("*")
      .eq("id", input.prescription_id)
      .eq("user_id", userId)
      .single();

    if (prescErr || !prescription) {
      return { error: "처방 과제를 찾을 수 없습니다" };
    }

    // 기존 미완료 훈련 세션 재사용 (중복 생성 방지)
    const { data: existingTs } = await supabase
      .from("tutoring_training_sessions")
      .select("id")
      .eq("prescription_id", prescription.id)
      .eq("user_id", userId)
      .is("completed_at", null)
      .maybeSingle();

    if (existingTs) {
      return { data: { training_session_id: existingTs.id } };
    }

    // 세션에서 target_level 조회
    const { data: tutoringSession } = await supabase
      .from("tutoring_sessions")
      .select("target_level")
      .eq("id", prescription.session_id)
      .single();

    // 훈련 세션 생성
    const { data: ts, error: tsErr } = await supabase
      .from("tutoring_training_sessions")
      .insert({
        user_id: userId,
        prescription_id: prescription.id,
        session_type: input.session_type || "guided",
        question_type: prescription.question_type,
        topic_id: prescription.topic_id,
        target_level: tutoringSession?.target_level || null,
        level_params: prescription.level_params,
      })
      .select("id")
      .single();

    if (tsErr || !ts) {
      return { error: tsErr?.message || "훈련 세션 생성 실패" };
    }

    // 처방 상태 업데이트 (원자적 증가)
    await supabase
      .from("tutoring_prescriptions")
      .update({ status: "in_progress" })
      .eq("id", prescription.id);

    await supabase.rpc("increment_training_count", {
      p_prescription_id: prescription.id,
    });

    return { data: { training_session_id: ts.id } };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "훈련 세션 생성 실패",
    };
  }
}

// ============================================================
// 5. 훈련 시도 저장 (saveAttempt)
// ============================================================

interface SaveAttemptInput {
  training_session_id: string;
  screen_number: number;
  protocol: string;
  question_id?: string;
  attempt_number?: number;
  user_answer?: string;
  user_audio_url?: string;
  audio_duration_seconds?: number;
  metrics?: Record<string, unknown>;
  pronunciation?: Record<string, unknown>;
  evaluation?: Record<string, unknown>;
  passed?: boolean;
  repair_before?: string;
  repair_after?: string;
  repair_type?: string;
}

export async function saveAttempt(
  input: SaveAttemptInput
): Promise<ActionResult<{ attempt_id: string }>> {
  try {
    const { supabase, userId } = await requireUser();

    const { data, error } = await supabase
      .from("tutoring_attempts")
      .insert({
        user_id: userId,
        training_session_id: input.training_session_id,
        screen_number: input.screen_number,
        protocol: input.protocol,
        question_id: input.question_id || null,
        attempt_number: input.attempt_number || null,
        user_answer: input.user_answer || null,
        user_audio_url: input.user_audio_url || null,
        audio_duration_seconds: input.audio_duration_seconds || null,
        metrics: input.metrics || null,
        pronunciation: input.pronunciation || null,
        evaluation: input.evaluation || null,
        passed: input.passed ?? null,
        repair_before: input.repair_before || null,
        repair_after: input.repair_after || null,
        repair_type: input.repair_type || null,
      })
      .select("id")
      .single();

    if (error) return { error: error.message };
    return { data: { attempt_id: data.id } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "시도 저장 실패" };
  }
}

// ============================================================
// 6. 훈련 세션 완료 (completeTrainingSession)
// ============================================================

interface CompleteTrainingInput {
  training_session_id: string;
  overall_score?: Record<string, unknown>;
  kpi_results?: Record<string, unknown>;
}

export async function completeTrainingSession(
  input: CompleteTrainingInput
): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireUser();

    // 훈련 세션 완료 처리
    const { error } = await supabase
      .from("tutoring_training_sessions")
      .update({
        completed_at: new Date().toISOString(),
        overall_score: input.overall_score || null,
        kpi_results: input.kpi_results || null,
      })
      .eq("id", input.training_session_id)
      .eq("user_id", userId);

    if (error) return { error: error.message };

    // 훈련 세션 정보 조회 (처방 업데이트용)
    const { data: ts } = await supabase
      .from("tutoring_training_sessions")
      .select("prescription_id")
      .eq("id", input.training_session_id)
      .single();

    // 연결된 처방의 완료 여부 확인 (3회 이상 훈련 시 완료 처리)
    if (ts?.prescription_id) {
      const { data: presc } = await supabase
        .from("tutoring_prescriptions")
        .select("training_count, session_id")
        .eq("id", ts.prescription_id)
        .single();

      if (presc && presc.training_count >= 3) {
        await supabase
          .from("tutoring_prescriptions")
          .update({ status: "completed" })
          .eq("id", ts.prescription_id);

        // 튜터링 세션의 completed_prescriptions 증가
        await supabase.rpc("increment_completed_prescriptions", {
          p_session_id: presc.session_id,
        });
      }
    }

    return { data: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "훈련 완료 처리 실패" };
  }
}

// ============================================================
// 7. 훈련 이력 조회 (getTrainingHistory)
// ============================================================

export async function getTrainingHistory(): Promise<
  ActionResult<{
    sessions: TutoringSession[];
    trainingSessions: Array<{
      id: string;
      session_type: string;
      question_type: string;
      screens_completed: number;
      overall_score: Record<string, unknown> | null;
      started_at: string;
      completed_at: string | null;
    }>;
  }>
> {
  try {
    const { supabase, userId } = await requireUser();

    const [sessionsRes, trainingRes] = await Promise.all([
      supabase
        .from("tutoring_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("tutoring_training_sessions")
        .select(
          "id, session_type, question_type, screens_completed, overall_score, started_at, completed_at"
        )
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .limit(50),
    ]);

    return {
      data: {
        sessions: (sessionsRes.data || []) as TutoringSession[],
        trainingSessions: trainingRes.data || [],
      },
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "이력 조회 실패" };
  }
}

// ============================================================
// 처방 엔진: tutoring_prescription → prescriptions 목록 변환
// ============================================================

interface PrescriptionItem {
  priority: number;
  question_type: string;
  topic_id: string | null;
  weakness_tags: string[];
  source: "top3_priorities" | "recurring_patterns" | "question_type_map";
  source_data: Record<string, unknown>;
}

function buildPrescriptions(
  prescription: PrescriptionEngineInput["tutoring_prescription"],
  coachingReport: Record<string, unknown> | null,
  currentLevel: string,
  targetLevel: string,
  levelParams: LevelParams
): PrescriptionItem[] {
  const items: PrescriptionItem[] = [];
  const usedTypes = new Set<string>();

  // 1순위: top3_priorities에서 약점 Top 2 추출
  if (prescription.priority_weaknesses) {
    for (const pw of prescription.priority_weaknesses.slice(0, 2)) {
      const qt =
        DRILL_TAG_TO_QUESTION_TYPE[pw.drill_tag] || "description";
      if (usedTypes.has(qt)) continue;
      usedTypes.add(qt);

      items.push({
        priority: items.length + 1,
        question_type: qt,
        topic_id: null,
        weakness_tags: [pw.drill_tag, pw.area].filter(Boolean) as string[],
        source: "top3_priorities",
        source_data: pw as unknown as Record<string, unknown>,
      });
    }
  }

  // 2순위: recurring_patterns에서 오류 패턴 드릴
  if (prescription.error_drill_tags) {
    for (const tag of prescription.error_drill_tags.slice(0, 2)) {
      const qt = DRILL_TAG_TO_QUESTION_TYPE[tag] || "description";
      if (usedTypes.has(qt)) continue;
      usedTypes.add(qt);

      items.push({
        priority: items.length + 1,
        question_type: qt,
        topic_id: null,
        weakness_tags: [tag],
        source: "recurring_patterns",
        source_data: { drill_tag: tag },
      });
    }
  }

  // 3순위: weak_types에서 추가 유형
  if (prescription.weak_types) {
    for (const wt of prescription.weak_types.slice(0, 2)) {
      // drill_tag가 아닌 question_type인 경우도 있음
      const qt = DRILL_TAG_TO_QUESTION_TYPE[wt] || wt;
      if (usedTypes.has(qt)) continue;
      usedTypes.add(qt);

      items.push({
        priority: items.length + 1,
        question_type: qt,
        topic_id: null,
        weakness_tags: [wt],
        source: "question_type_map",
        source_data: { weak_type: wt },
      });
    }
  }

  // 최소 1개 보장
  if (items.length === 0) {
    items.push({
      priority: 1,
      question_type: "description",
      topic_id: null,
      weakness_tags: ["general"],
      source: "top3_priorities",
      source_data: {},
    });
  }

  return items;
}
