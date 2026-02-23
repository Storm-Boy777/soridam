"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { step1Schema, step2Schema, step3Schema } from "@/lib/validations/reviews";
import { extractCombos } from "@/lib/utils/combo-extractor";
import type {
  Submission,
  SubmissionWithQuestions,
  FrequencyItem,
  ReviewStats,
  ComboType,
} from "@/lib/types/reviews";

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
// Step 1: draft 생성
// ============================================================

export async function createDraft(
  formData: Record<string, unknown>
): Promise<ActionResult<{ id: number }>> {
  const parsed = step1Schema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const { supabase, userId } = await requireUser();

    // 기존 draft 삭제 (1개만 유지)
    await supabase
      .from("submissions")
      .delete()
      .eq("user_id", userId)
      .eq("status", "draft");

    // 새 draft INSERT
    const { data, error } = await supabase
      .from("submissions")
      .insert({
        user_id: userId,
        exam_date: parsed.data.exam_date,
        exam_difficulty: parsed.data.exam_difficulty,
        pre_exam_level: parsed.data.pre_exam_level,
        achieved_level: parsed.data.achieved_level === 'unknown' ? null : parsed.data.achieved_level,
        exam_purpose: parsed.data.exam_purpose,
        study_methods: parsed.data.study_methods,
        prep_duration: parsed.data.prep_duration,
        attempt_count: parsed.data.attempt_count,
        perceived_difficulty: parsed.data.perceived_difficulty,
        actual_duration: parsed.data.actual_duration,
        used_recommended_survey: parsed.data.used_recommended_survey,
        survey_occupation: parsed.data.used_recommended_survey ? null : parsed.data.survey_occupation,
        survey_student: parsed.data.used_recommended_survey ? null : parsed.data.survey_student,
        survey_course: parsed.data.used_recommended_survey ? null : parsed.data.survey_course,
        survey_housing: parsed.data.used_recommended_survey ? null : parsed.data.survey_housing,
        survey_leisure: parsed.data.used_recommended_survey ? null : parsed.data.survey_leisure.join(","),
        survey_hobbies: parsed.data.used_recommended_survey ? null : parsed.data.survey_hobbies.join(","),
        survey_sports: parsed.data.used_recommended_survey ? null : parsed.data.survey_sports.join(","),
        survey_travel: parsed.data.used_recommended_survey ? null : parsed.data.survey_travel.join(","),
        status: "draft",
        step_completed: 1,
      })
      .select("id")
      .single();

    if (error) return { error: "후기 생성에 실패했습니다" };
    return { data: { id: data.id } };
  } catch {
    return { error: "로그인이 필요합니다" };
  }
}

// ============================================================
// Step 2: 14개 질문 저장
// ============================================================

export async function saveQuestions(
  formData: Record<string, unknown>
): Promise<ActionResult> {
  const parsed = step2Schema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const { supabase, userId } = await requireUser();

    const { submission_id, questions } = parsed.data;

    // 소유권 확인
    const { data: submission } = await supabase
      .from("submissions")
      .select("id")
      .eq("id", submission_id)
      .eq("user_id", userId)
      .single();

    if (!submission) return { error: "후기를 찾을 수 없습니다" };

    // 기존 질문 삭제
    await supabase
      .from("submission_questions")
      .delete()
      .eq("submission_id", submission_id);

    // 14개 INSERT
    const { error: insertError } = await supabase
      .from("submission_questions")
      .insert(
        questions.map((q) => ({
          submission_id,
          question_number: q.question_number,
          combo_type: q.combo_type,
          topic: q.topic,
          master_question_id: q.master_question_id,
          custom_question_text: q.custom_question_text,
          is_not_remembered: q.is_not_remembered,
        }))
      );

    if (insertError) return { error: "질문 저장에 실패했습니다" };

    // step_completed 업데이트
    await supabase
      .from("submissions")
      .update({ step_completed: 2 })
      .eq("id", submission_id);

    return {};
  } catch {
    return { error: "로그인이 필요합니다" };
  }
}

// ============================================================
// Step 3: 완료 + 콤보 추출 + 크레딧 보상
// ============================================================

export async function completeSubmission(
  formData: Record<string, unknown>
): Promise<ActionResult> {
  const parsed = step3Schema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const { supabase, userId } = await requireUser();

    const { submission_id, one_line_review, tips } = parsed.data;

    // 소유권 확인
    const { data: submission } = await supabase
      .from("submissions")
      .select("id")
      .eq("id", submission_id)
      .eq("user_id", userId)
      .single();

    if (!submission) return { error: "후기를 찾을 수 없습니다" };

    // submissions 업데이트
    const { error: updateError } = await supabase
      .from("submissions")
      .update({
        one_line_review,
        tips: tips || null,
        step_completed: 3,
        status: "complete",
        submitted_at: new Date().toISOString(),
      })
      .eq("id", submission_id);

    if (updateError) return { error: "후기 완료에 실패했습니다" };

    // 콤보 추출 (try-catch: 실패해도 후기는 저장됨)
    try {
      const { data: questions } = await supabase
        .from("submission_questions")
        .select("*")
        .eq("submission_id", submission_id);

      if (questions && questions.length > 0) {
        const combos = extractCombos(questions);

        if (combos.length > 0) {
          // 기존 콤보 삭제 후 재생성
          await supabase
            .from("submission_combos")
            .delete()
            .eq("submission_id", submission_id);

          await supabase.from("submission_combos").insert(
            combos.map((c) => ({
              submission_id,
              combo_type: c.combo_type,
              topic: c.topic,
              question_ids: c.question_ids,
            }))
          );
        }
      }
    } catch {
      // 콤보 추출 실패해도 후기 자체는 저장됨
    }

    // 크레딧 보상 (P-2: 월 2건 제한, script_credits +2)
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { count } = await supabase
        .from("submissions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "complete")
        .gte("submitted_at", monthStart);

      // 이번 달 complete 건수 2 이하이면 크레딧 지급 (방금 완료한 것 포함)
      if ((count ?? 0) <= 2) {
        await supabase.rpc("increment_script_credits", {
          p_user_id: userId,
          p_amount: 2,
        });
      }
    } catch {
      // 크레딧 지급 실패해도 후기 자체는 유지
    }

    revalidatePath("/reviews");
    return {};
  } catch {
    return { error: "로그인이 필요합니다" };
  }
}

// ============================================================
// 후기 삭제
// ============================================================

export async function deleteSubmission(
  submissionId: number
): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireUser();

    const { error } = await supabase
      .from("submissions")
      .delete()
      .eq("id", submissionId)
      .eq("user_id", userId);

    if (error) return { error: "삭제에 실패했습니다" };

    revalidatePath("/reviews");
    return {};
  } catch {
    return { error: "로그인이 필요합니다" };
  }
}

// ============================================================
// 등급 수정
// ============================================================

export async function updateGrade(
  submissionId: number,
  achievedLevel: string
): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireUser();

    const { error } = await supabase
      .from("submissions")
      .update({ achieved_level: achievedLevel })
      .eq("id", submissionId)
      .eq("user_id", userId);

    if (error) return { error: "등급 수정에 실패했습니다" };

    revalidatePath("/reviews");
    return {};
  } catch {
    return { error: "로그인이 필요합니다" };
  }
}

// ============================================================
// 내 후기 목록
// ============================================================

export async function getMySubmissions(): Promise<ActionResult<Submission[]>> {
  try {
    const { supabase, userId } = await requireUser();

    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) return { error: "조회에 실패했습니다" };
    return { data: data as Submission[] };
  } catch {
    return { error: "로그인이 필요합니다" };
  }
}

// ============================================================
// 후기 상세 (questions JOIN master_questions)
// ============================================================

export async function getSubmissionDetail(
  submissionId: number
): Promise<ActionResult<SubmissionWithQuestions>> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("submissions")
    .select(
      `*,
      submission_questions (
        *,
        master_questions (
          question_id,
          question_english,
          question_korean,
          answer_type,
          topic
        )
      )`
    )
    .eq("id", submissionId)
    .single();

  if (error || !data) return { error: "후기를 찾을 수 없습니다" };
  return { data: data as unknown as SubmissionWithQuestions };
}

// ============================================================
// 빈도 분석
// ============================================================

export async function getFrequency(): Promise<ActionResult<FrequencyItem[]>> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("submission_combos")
    .select("topic, combo_type");

  if (error) return { error: "빈도 분석에 실패했습니다" };

  // GROUP BY + COUNT 집계
  const freqMap = new Map<string, FrequencyItem>();
  for (const row of data || []) {
    const key = `${row.combo_type}:${row.topic}`;
    const existing = freqMap.get(key);
    if (existing) {
      existing.frequency += 1;
    } else {
      freqMap.set(key, {
        topic: row.topic,
        combo_type: row.combo_type as ComboType,
        frequency: 1,
      });
    }
  }

  const result = Array.from(freqMap.values()).sort(
    (a, b) => b.frequency - a.frequency
  );

  return { data: result };
}

// ============================================================
// 공개 후기 목록
// ============================================================

export async function getPublicReviews(params: {
  level?: string;
  page?: number;
  limit?: number;
}): Promise<ActionResult<{ reviews: Submission[]; total: number }>> {
  const supabase = await createServerSupabaseClient();
  const page = params.page || 1;
  const limit = params.limit || 10;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("submissions")
    .select("*", { count: "exact" })
    .eq("status", "complete")
    .order("submitted_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (params.level) {
    query = query.eq("achieved_level", params.level);
  }

  const { data, error, count } = await query;

  if (error) return { error: "후기 조회에 실패했습니다" };
  return {
    data: {
      reviews: (data as Submission[]) || [],
      total: count || 0,
    },
  };
}

// ============================================================
// 통계 + 빈도 통합 (서버 1회 조회)
// ============================================================

export async function getStatsAndFrequency(): Promise<{
  stats: ReviewStats;
  frequency: FrequencyItem[];
}> {
  const supabase = await createServerSupabaseClient();

  // 3개 쿼리 병렬 실행 (60-110ms → 20-40ms)
  const [reviewsResult, combosResult, participantsResult] = await Promise.all([
    // 총 후기 수 (head: true → 행 0개 전송)
    supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("status", "complete"),
    // 콤보 데이터 — stats(주제 수) + frequency(빈도) 공용
    supabase.from("submission_combos").select("topic, combo_type"),
    // 참여자 수
    supabase
      .from("submissions")
      .select("user_id")
      .eq("status", "complete"),
  ]);

  // stats 계산
  const combos = combosResult.data || [];
  const uniqueTopics = new Set(
    combos.flatMap((t) => t.topic.split(","))
  ).size;
  const totalParticipants = new Set(
    (participantsResult.data || []).map((p) => p.user_id)
  ).size;

  // frequency 계산 (submission_combos 이중 조회 제거)
  const freqMap = new Map<string, FrequencyItem>();
  for (const row of combos) {
    const key = `${row.combo_type}:${row.topic}`;
    const existing = freqMap.get(key);
    if (existing) {
      existing.frequency += 1;
    } else {
      freqMap.set(key, {
        topic: row.topic,
        combo_type: row.combo_type as ComboType,
        frequency: 1,
      });
    }
  }
  const frequency = Array.from(freqMap.values()).sort(
    (a, b) => b.frequency - a.frequency
  );

  return {
    stats: {
      totalReviews: reviewsResult.count || 0,
      uniqueTopics,
      totalParticipants,
    },
    frequency,
  };
}
