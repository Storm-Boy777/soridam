"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { step1Schema, step2Schema, step3Schema } from "@/lib/validations/reviews";
import { extractCombos } from "@/lib/utils/combo-extractor";
import {
  ANSWER_TYPE_ORDER,
  FREQUENCY_COMBO_MAP,
  type Submission,
  type SubmissionWithQuestions,
  type FrequencyItem,
  type QuestionFrequencyItem,
  type ReviewStats,
  type ComboType,
  type FrequencyCategory,
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
  } catch (e) {
    if (e instanceof Error && e.message === "로그인이 필요합니다") {
      return { error: e.message };
    }
    return { error: "서버 오류가 발생했습니다" };
  }
}

// ============================================================
// Draft 조회 (뒤로가기 시 데이터 복원용)
// ============================================================

export async function getDraft(
  submissionId: number
): Promise<ActionResult<Submission>> {
  try {
    const { supabase, userId } = await requireUser();

    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .eq("id", submissionId)
      .eq("user_id", userId)
      .single();

    if (error || !data) return { error: "후기를 찾을 수 없습니다" };
    return { data: data as Submission };
  } catch (e) {
    if (e instanceof Error && e.message === "로그인이 필요합니다") {
      return { error: e.message };
    }
    return { error: "서버 오류가 발생했습니다" };
  }
}

// ============================================================
// Draft 수정 (Step 2→1 뒤로가기 후 재제출)
// ============================================================

export async function updateDraft(
  submissionId: number,
  formData: Record<string, unknown>
): Promise<ActionResult<{ id: number }>> {
  const parsed = step1Schema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const { supabase, userId } = await requireUser();

    const { error } = await supabase
      .from("submissions")
      .update({
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
      })
      .eq("id", submissionId)
      .eq("user_id", userId);

    if (error) return { error: "수정에 실패했습니다" };
    return { data: { id: submissionId } };
  } catch (e) {
    if (e instanceof Error && e.message === "로그인이 필요합니다") {
      return { error: e.message };
    }
    return { error: "서버 오류가 발생했습니다" };
  }
}

// ============================================================
// Step 2: 질문 저장 (14개 + 자기소개 Q1 자동 추가 = 15개)
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

    // 소유권 확인 + 자기소개 question id 병렬 조회
    const [ownerResult, selfIntroResult] = await Promise.all([
      supabase
        .from("submissions")
        .select("id")
        .eq("id", submission_id)
        .eq("user_id", userId)
        .single(),
      supabase
        .from("questions")
        .select("id")
        .eq("topic", "자기소개")
        .limit(1)
        .maybeSingle(),
    ]);

    if (!ownerResult.data) return { error: "후기를 찾을 수 없습니다" };

    // 기존 질문 삭제
    await supabase
      .from("submission_questions")
      .delete()
      .eq("submission_id", submission_id);

    // Q1 자기소개 자동 추가 + 14개 사용자 질문 = 15개 INSERT
    const allQuestions = [
      {
        submission_id,
        question_number: 1,
        combo_type: "self_intro",
        topic: "자기소개",
        question_id: selfIntroResult.data?.id || null,
        custom_question_text: null,
        is_not_remembered: false,
      },
      ...questions.map((q) => ({
        submission_id,
        question_number: q.question_number,
        combo_type: q.combo_type,
        topic: q.topic,
        question_id: q.question_id,
        custom_question_text: q.custom_question_text,
        is_not_remembered: q.is_not_remembered,
      })),
    ];

    const { error: insertError } = await supabase
      .from("submission_questions")
      .insert(allQuestions);

    if (insertError) return { error: "질문 저장에 실패했습니다" };

    // step_completed 업데이트
    await supabase
      .from("submissions")
      .update({ step_completed: 2 })
      .eq("id", submission_id);

    return {};
  } catch (e) {
    if (e instanceof Error && e.message === "로그인이 필요합니다") {
      return { error: e.message };
    }
    return { error: "서버 오류가 발생했습니다" };
  }
}

// ============================================================
// Step 3: 완료 + 콤보 추출 + 크레딧 보상
// ============================================================

export async function completeSubmission(
  formData: Record<string, unknown>
): Promise<ActionResult<{ creditGranted: boolean; nextCreditDate: string | null }>> {
  const parsed = step3Schema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const { supabase, userId } = await requireUser();

    const { submission_id, one_line_review, tips } = parsed.data;

    // 소유권 + draft 상태 확인 (중복 완료 방지)
    const { data: submission } = await supabase
      .from("submissions")
      .select("id, status")
      .eq("id", submission_id)
      .eq("user_id", userId)
      .single();

    if (!submission) return { error: "후기를 찾을 수 없습니다" };
    if (submission.status === "complete") return { error: "이미 완료된 후기입니다" };

    // submissions 업데이트 (원자적: status='draft'인 경우에만 + 결과 확인)
    const { data: updated, error: updateError } = await supabase
      .from("submissions")
      .update({
        one_line_review,
        tips: tips || null,
        step_completed: 3,
        status: "complete",
        submitted_at: new Date().toISOString(),
        exam_approved: "approved",
        exam_approved_at: new Date().toISOString(),
      })
      .eq("id", submission_id)
      .eq("status", "draft")
      .select("id")
      .single();

    if (updateError || !updated) return { error: "후기 완료에 실패했습니다" };

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

    // 크레딧 보상 (25일 룰: 최초 2회 무조건 지급, 3회차부터 마지막 지급일로부터 25일 경과 필요)
    let creditGranted = false;
    let nextCreditDate: string | null = null;
    try {
      // 크레딧이 지급된 이전 완료 건수 + 마지막 지급일 조회
      // (방금 완료한 건 제외: submitted_at < 현재 시각 직전)
      const { data: creditHistory } = await supabase
        .from("submissions")
        .select("submitted_at")
        .eq("user_id", userId)
        .eq("status", "complete")
        .eq("credit_granted", true)
        .order("submitted_at", { ascending: false });

      const creditCount = creditHistory?.length ?? 0;

      if (creditCount < 2) {
        // 최초 2회: 무조건 지급
        creditGranted = true;
      } else {
        // 3회차부터: 마지막 지급일로부터 25일 경과 확인
        const lastGrantedAt = creditHistory![0].submitted_at;
        if (lastGrantedAt) {
          const lastDate = new Date(lastGrantedAt);
          const daysSince = Math.floor(
            (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSince >= 25) {
            creditGranted = true;
          } else {
            const next = new Date(lastDate);
            next.setDate(next.getDate() + 25);
            nextCreditDate = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
          }
        }
      }

      if (creditGranted) {
        await supabase.rpc("increment_script_credits", {
          p_user_id: userId,
          p_amount: 2,
        });
        // 크레딧 지급 여부 기록
        await supabase
          .from("submissions")
          .update({ credit_granted: true })
          .eq("id", submission_id);
      }
    } catch {
      // 크레딧 지급 실패해도 후기 자체는 유지
    }

    revalidatePath("/reviews");
    return { data: { creditGranted, nextCreditDate } };
  } catch (e) {
    if (e instanceof Error && e.message === "로그인이 필요합니다") {
      return { error: e.message };
    }
    return { error: "서버 오류가 발생했습니다" };
  }
}

// ============================================================
// 제출 상세 조회 (submission + questions 한 번에)
// ============================================================

export async function getSubmissionWithQuestions(
  submissionId: number
): Promise<ActionResult<SubmissionWithQuestions>> {
  try {
    const { supabase, userId } = await requireUser();

    const { data, error } = await supabase
      .from("submissions")
      .select("*, submission_questions(*, questions(id, question_short, question_english, question_korean, question_type_eng, topic))")
      .eq("id", submissionId)
      .eq("user_id", userId)
      .order("question_number", { referencedTable: "submission_questions" })
      .single();

    if (error || !data) return { error: "후기를 찾을 수 없습니다" };
    return { data: data as SubmissionWithQuestions };
  } catch (e) {
    if (e instanceof Error && e.message === "로그인이 필요합니다") {
      return { error: e.message };
    }
    return { error: "서버 오류가 발생했습니다" };
  }
}

// ============================================================
// 제출 상세 일괄 조회 (N+1 방지 — page.tsx 서버 사전 로딩용)
// ============================================================

export async function getSubmissionsWithQuestionsBatch(
  submissionIds: number[]
): Promise<Record<number, SubmissionWithQuestions>> {
  if (submissionIds.length === 0) return {};

  try {
    const { supabase, userId } = await requireUser();

    const { data, error } = await supabase
      .from("submissions")
      .select("*, submission_questions(*, questions(id, question_short, question_english, question_korean, question_type_eng, topic))")
      .in("id", submissionIds)
      .eq("user_id", userId)
      .order("question_number", { referencedTable: "submission_questions" });

    if (error || !data) return {};

    const result: Record<number, SubmissionWithQuestions> = {};
    for (const row of data) {
      result[row.id] = row as SubmissionWithQuestions;
    }
    return result;
  } catch {
    return {};
  }
}

// ============================================================
// Draft 질문 로드 (이어쓰기용)
// ============================================================

export async function getDraftQuestions(
  submissionId: number
): Promise<ActionResult<{
  combo_type: string;
  topic: string;
  question_id: string | null;
  custom_question_text: string | null;
  is_not_remembered: boolean;
  question_title: string | null;
  question_korean: string | null;
}[]>> {
  try {
    const { supabase, userId } = await requireUser();

    // 소유권 확인
    const { data: submission } = await supabase
      .from("submissions")
      .select("id")
      .eq("id", submissionId)
      .eq("user_id", userId)
      .single();

    if (!submission) return { error: "후기를 찾을 수 없습니다" };

    const { data, error } = await supabase
      .from("submission_questions")
      .select("combo_type, topic, question_id, custom_question_text, is_not_remembered, questions(question_short, question_korean)")
      .eq("submission_id", submissionId)
      .order("question_number");

    if (error) return { error: "질문 로드에 실패했습니다" };

    // questions 조인 결과를 플랫하게 변환
    const flat = (data || []).map((q: Record<string, unknown>) => {
      const mq = q.questions as { question_short: string; question_korean: string } | null;
      return {
        combo_type: q.combo_type as string,
        topic: q.topic as string,
        question_id: q.question_id as string | null,
        custom_question_text: q.custom_question_text as string | null,
        is_not_remembered: q.is_not_remembered as boolean,
        question_title: mq?.question_short || null,
        question_korean: mq?.question_korean || null,
      };
    });

    return { data: flat };
  } catch (e) {
    if (e instanceof Error && e.message === "로그인이 필요합니다") {
      return { error: e.message };
    }
    return { error: "서버 오류가 발생했습니다" };
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

    // 완료된 후기는 삭제 불가 (크레딧 악용 방지 + 빈도 분석 데이터 보존)
    const { data: submission } = await supabase
      .from("submissions")
      .select("id, status")
      .eq("id", submissionId)
      .eq("user_id", userId)
      .single();

    if (!submission) return { error: "후기를 찾을 수 없습니다" };
    if (submission.status === "complete") return { error: "완료된 후기는 삭제할 수 없습니다" };

    const { error } = await supabase
      .from("submissions")
      .delete()
      .eq("id", submissionId)
      .eq("user_id", userId)
      .eq("status", "draft");

    if (error) return { error: "삭제에 실패했습니다" };

    revalidatePath("/reviews");
    return {};
  } catch (e) {
    if (e instanceof Error && e.message === "로그인이 필요합니다") {
      return { error: e.message };
    }
    return { error: "서버 오류가 발생했습니다" };
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
  } catch (e) {
    if (e instanceof Error && e.message === "로그인이 필요합니다") {
      return { error: e.message };
    }
    return { error: "서버 오류가 발생했습니다" };
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
  } catch (e) {
    if (e instanceof Error && e.message === "로그인이 필요합니다") {
      return { error: e.message };
    }
    return { error: "서버 오류가 발생했습니다" };
  }
}

// ============================================================
// 후기 상세 (submission_questions JOIN questions)
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
        questions (
          id,
          question_short,
          question_english,
          question_korean,
          question_type_eng,
          topic
        )
      )`
    )
    .eq("id", submissionId)
    .single();

  if (error || !data) return { error: "후기를 찾을 수 없습니다" };
  return { data: data as unknown as SubmissionWithQuestions };
}

// ── 내부 헬퍼: 콤보 + survey_type 조회 (getFrequency, getStatsAndFrequency 공유) ──

async function fetchCombosAndSurveyTypes(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
) {
  const [combosResult, surveyTypeResult] = await Promise.all([
    supabase.from("submission_combos").select("topic, combo_type"),
    supabase.from("questions").select("topic, survey_type"),
  ]);

  const surveyTypeMap = new Map<string, string>();
  for (const row of surveyTypeResult.data || []) {
    if (!surveyTypeMap.has(row.topic)) {
      surveyTypeMap.set(row.topic, row.survey_type);
    }
  }

  return { combos: combosResult.data || [], surveyTypeMap, error: combosResult.error };
}

function buildFrequencyList(
  combos: { topic: string; combo_type: string }[],
  surveyTypeMap: Map<string, string>
): FrequencyItem[] {
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
        survey_type: (surveyTypeMap.get(row.topic) as FrequencyItem["survey_type"]) || undefined,
      });
    }
  }
  return Array.from(freqMap.values()).sort((a, b) => b.frequency - a.frequency);
}

// ============================================================
// 빈도 분석
// ============================================================

export async function getFrequency(): Promise<ActionResult<FrequencyItem[]>> {
  const supabase = await createServerSupabaseClient();
  const { combos, surveyTypeMap, error } = await fetchCombosAndSurveyTypes(supabase);
  if (error) return { error: "빈도 분석에 실패했습니다" };
  return { data: buildFrequencyList(combos, surveyTypeMap) };
}

// ============================================================
// 주제별 질문 빈도
// ============================================================

export async function getQuestionFrequency(topic: string, category?: FrequencyCategory): Promise<ActionResult<QuestionFrequencyItem[]>> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("submission_questions")
    .select("question_id, combo_type, questions!inner(question_english, question_korean, question_type_eng)")
    .eq("topic", topic)
    .not("question_id", "is", null)
    .not("is_not_remembered", "eq", true);

  // 카테고리별 combo_type 필터
  if (category) {
    const comboTypes = FREQUENCY_COMBO_MAP[category];
    query = query.in("combo_type", comboTypes);
  }

  const { data, error } = await query;

  if (error) return { error: "질문 빈도 조회에 실패했습니다" };

  // 질문별 빈도 집계
  const freqMap = new Map<string, QuestionFrequencyItem>();
  for (const row of data || []) {
    const mq = row.questions as unknown as { question_english: string; question_korean: string; question_type_eng: string | null };
    const key = row.question_id!;
    const existing = freqMap.get(key);
    if (existing) {
      existing.frequency += 1;
    } else {
      freqMap.set(key, {
        question_english: mq.question_english,
        question_korean: mq.question_korean,
        answer_type: mq.question_type_eng,
        frequency: 1,
      });
    }
  }

  // 빈도순 → 같은 빈도면 answer_type순 → 같은 타입이면 가나다순
  const result = Array.from(freqMap.values()).sort((a, b) => {
    if (a.frequency !== b.frequency) return b.frequency - a.frequency;
    const orderA = ANSWER_TYPE_ORDER[a.answer_type || ""] ?? 99;
    const orderB = ANSWER_TYPE_ORDER[b.answer_type || ""] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return (a.question_korean || "").localeCompare(b.question_korean || "", "ko");
  });
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
    .neq("source", "admin")
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

  // 3개 병렬: 후기 수(admin 포함) + (콤보+survey_type) + 참여자 user_id(사용자만)
  const [reviewsResult, { combos, surveyTypeMap }, participantsResult] = await Promise.all([
    supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("status", "complete"),
    fetchCombosAndSurveyTypes(supabase),
    supabase
      .from("submissions")
      .select("user_id")
      .eq("status", "complete")
      .neq("source", "admin"),
  ]);

  const uniqueTopics = new Set(combos.flatMap((t) => t.topic.split(","))).size;
  const totalParticipants = new Set((participantsResult.data || []).map((r) => r.user_id)).size;

  return {
    stats: {
      totalReviews: reviewsResult.count || 0,
      uniqueTopics,
      totalParticipants,
    },
    frequency: buildFrequencyList(combos, surveyTypeMap),
  };
}
