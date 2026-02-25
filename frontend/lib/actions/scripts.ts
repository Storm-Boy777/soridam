"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import {
  generateScriptSchema,
  correctScriptSchema,
  refineScriptSchema,
  confirmScriptSchema,
  createPackageSchema,
} from "@/lib/validations/scripts";
import type {
  Script,
  ScriptListItem,
  ScriptDetail,
  ScriptPackage,
  ShadowingHistoryItem,
  CreditCheckResult,
  ScriptSpec,
  OpicTip,
} from "@/lib/types/scripts";

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
// 크레딧 확인
// ============================================================

export async function checkScriptCredit(): Promise<ActionResult<CreditCheckResult>> {
  try {
    const { supabase, userId } = await requireUser();

    const { data, error } = await supabase
      .from("user_credits")
      .select("plan_script_credits, script_credits")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return { error: "크레딧 정보를 조회할 수 없습니다" };
    }

    const planCredits = data.plan_script_credits ?? 0;
    const permanentCredits = data.script_credits ?? 0;
    const totalCredits = planCredits + permanentCredits;

    return {
      data: {
        hasCredit: totalCredits > 0,
        planCredits,
        permanentCredits,
        totalCredits,
      },
    };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

// ============================================================
// 스크립트 생성 (AI 호출은 Edge Function에서 처리)
// ============================================================

export async function createScript(
  formData: Record<string, unknown>
): Promise<ActionResult<{ id: string }>> {
  const parsed = generateScriptSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const { supabase, userId } = await requireUser();

    // 크레딧 차감 (RPC)
    const { data: creditOk, error: creditError } = await supabase.rpc(
      "consume_script_credit",
      { p_user_id: userId }
    );

    if (creditError || !creditOk) {
      return { error: "스크립트 생성권이 부족합니다. 스토어에서 구매해주세요." };
    }

    // 기존 스크립트 확인 (UPSERT용)
    const { data: existing } = await supabase
      .from("scripts")
      .select("id")
      .eq("user_id", userId)
      .eq("question_id", parsed.data.question_id)
      .maybeSingle();

    if (existing) {
      // 기존 패키지 삭제 (스크립트 재생성 시)
      await supabase
        .from("script_packages")
        .delete()
        .eq("script_id", existing.id);
    }

    // 스크립트 레코드 UPSERT (draft 상태로 생성, AI 응답은 Edge Function이 채움)
    const { data, error } = await supabase
      .from("scripts")
      .upsert(
        {
          user_id: userId,
          question_id: parsed.data.question_id,
          source: "generate",
          category: parsed.data.category,
          topic: parsed.data.topic,
          question_english: parsed.data.question_english,
          question_korean: parsed.data.question_korean,
          answer_type: parsed.data.answer_type,
          target_level: parsed.data.target_level,
          user_story: parsed.data.user_story || null,
          status: "draft",
          refine_count: 0,
          // AI 응답 필드는 Edge Function이 채움
          english_text: "",
          korean_translation: null,
          paragraphs: null,
          key_expressions: [],
          highlighted_script: null,
          word_count: null,
          generation_time: null,
        },
        { onConflict: "user_id,question_id" }
      )
      .select("id")
      .single();

    if (error || !data) {
      // 크레딧 환불
      await supabase.rpc("refund_script_credit", { p_user_id: userId });
      return { error: "스크립트 생성에 실패했습니다" };
    }

    revalidatePath("/scripts");
    return { data: { id: data.id } };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

// ============================================================
// 스크립트 교정 (correct 모드)
// ============================================================

export async function createCorrectScript(
  formData: Record<string, unknown>
): Promise<ActionResult<{ id: string }>> {
  const parsed = correctScriptSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const { supabase, userId } = await requireUser();

    // 크레딧 차감
    const { data: creditOk, error: creditError } = await supabase.rpc(
      "consume_script_credit",
      { p_user_id: userId }
    );

    if (creditError || !creditOk) {
      return { error: "스크립트 생성권이 부족합니다. 스토어에서 구매해주세요." };
    }

    // 기존 스크립트 확인
    const { data: existing } = await supabase
      .from("scripts")
      .select("id")
      .eq("user_id", userId)
      .eq("question_id", parsed.data.question_id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("script_packages")
        .delete()
        .eq("script_id", existing.id);
    }

    const { data, error } = await supabase
      .from("scripts")
      .upsert(
        {
          user_id: userId,
          question_id: parsed.data.question_id,
          source: "correct",
          category: parsed.data.category,
          topic: parsed.data.topic,
          question_english: parsed.data.question_english,
          question_korean: parsed.data.question_korean,
          answer_type: parsed.data.answer_type,
          target_level: parsed.data.target_level,
          user_original_answer: parsed.data.user_original_answer,
          status: "draft",
          refine_count: 0,
          english_text: "",
          korean_translation: null,
          paragraphs: null,
          key_expressions: [],
          highlighted_script: null,
          word_count: null,
          generation_time: null,
        },
        { onConflict: "user_id,question_id" }
      )
      .select("id")
      .single();

    if (error || !data) {
      await supabase.rpc("refund_script_credit", { p_user_id: userId });
      return { error: "스크립트 교정에 실패했습니다" };
    }

    revalidatePath("/scripts");
    return { data: { id: data.id } };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

// ============================================================
// 스크립트 수정 (refine — 최대 3회, 크레딧 소모 없음)
// ============================================================

export async function refineScript(
  formData: Record<string, unknown>
): Promise<ActionResult<{ id: string }>> {
  const parsed = refineScriptSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const { supabase, userId } = await requireUser();

    // 스크립트 조회 + 수정 횟수 확인
    const { data: script, error: fetchError } = await supabase
      .from("scripts")
      .select("id, refine_count, status")
      .eq("id", parsed.data.script_id)
      .eq("user_id", userId)
      .single();

    if (fetchError || !script) {
      return { error: "스크립트를 찾을 수 없습니다" };
    }

    if (script.status === "confirmed") {
      return { error: "확정된 스크립트는 수정할 수 없습니다" };
    }

    if (script.refine_count >= 3) {
      return { error: "수정은 최대 3회까지 가능합니다" };
    }

    // refine_count 증가 + 텍스트 필드 초기화 (폴링 메커니즘 작동 위해)
    // EF가 AI 호출 후 새 결과로 채움
    const { error: updateError } = await supabase
      .from("scripts")
      .update({
        refine_count: script.refine_count + 1,
        english_text: "",
        korean_translation: "",
        highlighted_script: "",
        key_expressions: [],
        word_count: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.script_id);

    if (updateError) {
      return { error: "수정 요청에 실패했습니다" };
    }

    revalidatePath("/scripts");
    return { data: { id: parsed.data.script_id } };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

// ============================================================
// 스크립트 확정
// ============================================================

export async function confirmScript(
  formData: Record<string, unknown>
): Promise<ActionResult> {
  const parsed = confirmScriptSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const { supabase, userId } = await requireUser();

    const { error } = await supabase
      .from("scripts")
      .update({ status: "confirmed", updated_at: new Date().toISOString() })
      .eq("id", parsed.data.script_id)
      .eq("user_id", userId)
      .eq("status", "draft");

    if (error) {
      return { error: "스크립트 확정에 실패했습니다" };
    }

    revalidatePath("/scripts");
    return {};
  } catch (err) {
    return { error: (err as Error).message };
  }
}

// ============================================================
// 스크립트 삭제
// ============================================================

export async function deleteScript(
  scriptId: string
): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireUser();

    // 연관 패키지 먼저 삭제 (CASCADE이지만 Storage 파일도 정리)
    const { data: packages } = await supabase
      .from("script_packages")
      .select("wav_file_path, json_file_path")
      .eq("script_id", scriptId);

    if (packages?.length) {
      const filePaths = packages
        .flatMap((p) => [p.wav_file_path, p.json_file_path])
        .filter(Boolean) as string[];

      if (filePaths.length > 0) {
        await supabase.storage
          .from("script-packages")
          .remove(filePaths);
      }
    }

    const { error } = await supabase
      .from("scripts")
      .delete()
      .eq("id", scriptId)
      .eq("user_id", userId);

    if (error) {
      return { error: "스크립트 삭제에 실패했습니다" };
    }

    revalidatePath("/scripts");
    return {};
  } catch (err) {
    return { error: (err as Error).message };
  }
}

// ============================================================
// 내 스크립트 목록
// ============================================================

export async function getMyScripts(): Promise<ActionResult<ScriptListItem[]>> {
  try {
    const { supabase, userId } = await requireUser();

    const { data, error } = await supabase
      .from("scripts")
      .select(`
        id, question_id, source, title, english_text,
        topic, category, question_korean, target_level,
        answer_type, word_count, status, refine_count,
        created_at, updated_at,
        script_packages(id, status, progress)
      `)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      return { error: "스크립트 목록 조회에 실패했습니다" };
    }

    // script_packages는 1:N이지만 최신 1개만 사용
    const items: ScriptListItem[] = (data ?? []).map((s) => ({
      ...s,
      package: Array.isArray(s.script_packages) && s.script_packages.length > 0
        ? s.script_packages[0]
        : null,
    }));

    return { data: items };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

// ============================================================
// 스크립트 상세
// ============================================================

export async function getScriptDetail(
  scriptId: string
): Promise<ActionResult<ScriptDetail>> {
  try {
    const { supabase, userId } = await requireUser();

    const { data, error } = await supabase
      .from("scripts")
      .select(`
        *,
        script_packages(*)
      `)
      .eq("id", scriptId)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return { error: "스크립트를 찾을 수 없습니다" };
    }

    // master_questions 조회 (별도 쿼리)
    const { data: question } = await supabase
      .from("master_questions")
      .select("question_id, question_english, question_korean, topic, topic_category, answer_type")
      .eq("question_id", data.question_id)
      .single();

    const detail: ScriptDetail = {
      ...data,
      package: Array.isArray(data.script_packages) && data.script_packages.length > 0
        ? data.script_packages[0]
        : null,
      master_question: question ?? undefined,
    };

    return { data: detail };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

// ============================================================
// script_specs 조회 (등급별 규격서)
// ============================================================

export async function getScriptSpec(
  answerType: string,
  targetLevel: string
): Promise<ActionResult<ScriptSpec>> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from("script_specs")
      .select("*")
      .eq("answer_type", answerType)
      .eq("target_level", targetLevel)
      .single();

    if (error || !data) {
      return { error: "스크립트 규격서를 찾을 수 없습니다" };
    }

    return { data: data as ScriptSpec };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

// ============================================================
// 쉐도잉 이력 조회
// ============================================================

export async function getShadowingHistory(): Promise<ActionResult<ShadowingHistoryItem[]>> {
  try {
    const { supabase, userId } = await requireUser();

    const { data, error } = await supabase
      .from("shadowing_sessions")
      .select(`
        id, script_id, topic, question_korean, status,
        audio_duration, started_at, completed_at,
        shadowing_evaluations(overall_score, estimated_level, pronunciation, fluency)
      `)
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(50);

    if (error) {
      return { error: "쉐도잉 이력 조회에 실패했습니다" };
    }

    const items: ShadowingHistoryItem[] = (data ?? []).map((s) => ({
      ...s,
      evaluation: Array.isArray(s.shadowing_evaluations) && s.shadowing_evaluations.length > 0
        ? s.shadowing_evaluations[0]
        : null,
    }));

    return { data: items };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

// ============================================================
// OPIc 학습 팁 (대기 화면용)
// ============================================================

export async function getOpicTips(
  targetLevel: string,
  answerType?: string
): Promise<ActionResult<OpicTip[]>> {
  try {
    const supabase = await createServerSupabaseClient();

    let query = supabase
      .from("opic_tips")
      .select("id, category, title, expression, description")
      .contains("applicable_levels", [targetLevel])
      .eq("is_active", true)
      .order("display_order");

    if (answerType) {
      query = query.or(`answer_type.eq.${answerType},answer_type.is.null`);
    }

    const { data, error } = await query;

    if (error) return { error: "학습 콘텐츠를 불러올 수 없습니다" };
    return { data: (data ?? []) as OpicTip[] };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

// ============================================================
// 스크립트 통계 (대시보드용)
// ============================================================

export async function getScriptStats(): Promise<
  ActionResult<{
    totalScripts: number;
    confirmedScripts: number;
    totalShadowings: number;
  }>
> {
  try {
    const { supabase, userId } = await requireUser();

    const [scriptsResult, confirmedResult, shadowingResult] = await Promise.all([
      supabase
        .from("scripts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("scripts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "confirmed"),
      supabase
        .from("shadowing_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
    ]);

    return {
      data: {
        totalScripts: scriptsResult.count ?? 0,
        confirmedScripts: confirmedResult.count ?? 0,
        totalShadowings: shadowingResult.count ?? 0,
      },
    };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
