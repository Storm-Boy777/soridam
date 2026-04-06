"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { T } from "@/lib/constants/tables";
import {
  generateScriptSchema,
  correctScriptSchema,
  refineScriptSchema,
  confirmScriptSchema,
  createPackageSchema,
  startShadowingSchema,
} from "@/lib/validations/scripts";
import type {
  Script,
  ScriptListItem,
  ScriptDetail,
  ScriptPackage,
  ShadowingHistoryItem,
  ShadowingEvaluation,
  CreditCheckResult,
  ScriptSpec,
  OpicTip,
  TimestampItem,
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

    const { data: balance } = await supabase
      .from(T.polar_balances)
      .select("balance_krw")
      .eq("user_id", userId)
      .single();

    const balanceKrw = balance?.balance_krw ?? 0;

    return {
      data: {
        hasCredit: balanceKrw > 0,
        balanceKrw,
        // 하위 호환용 (기존 UI에서 참조)
        planCredits: 0,
        permanentCredits: 0,
        totalCredits: balanceKrw,
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

    // 크레딧 잔액 확인 (실비용은 EF에서 API 호출 시 자동 차감)
    const { data: balance } = await supabase.rpc("polar_get_balance", { p_user_id: userId });
    if (!balance || balance <= 0) {
      return { error: "크레딧이 부족합니다. 스토어에서 충전해주세요." };
    }

    // 기존 스크립트 확인 (UPSERT용)
    const { data: existing } = await supabase
      .from(T.scripts)
      .select("id")
      .eq("user_id", userId)
      .eq("question_id", parsed.data.question_id)
      .maybeSingle();

    if (existing) {
      // 기존 패키지 삭제 (스크립트 재생성 시)
      await supabase
        .from(T.script_packages)
        .delete()
        .eq("script_id", existing.id);
    }

    // 스크립트 레코드 UPSERT (draft 상태로 생성, AI 응답은 Edge Function이 채움)
    const { data, error } = await supabase
      .from(T.scripts)
      .upsert(
        {
          user_id: userId,
          question_id: parsed.data.question_id,
          source: "generate",
          category: parsed.data.category,
          topic: parsed.data.topic,
          question_english: parsed.data.question_english,
          question_korean: parsed.data.question_korean,
          question_type: parsed.data.question_type,
          target_grade: parsed.data.target_grade,
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
      return { error: "스크립트 생성에 실패했습니다" };
    }

    // EF 호출: AI 생성 실행 (fire-and-forget — 클라이언트는 폴링으로 결과 확인)
    fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/scripts/generate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ script_id: data.id }),
      }
    ).catch((err) => {
      console.error("scripts/generate EF 호출 실패:", err?.message || err);
    });

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

    // 크레딧 잔액 확인 (실비용은 EF에서 API 호출 시 자동 차감)
    const { data: balance } = await supabase.rpc("polar_get_balance", { p_user_id: userId });
    if (!balance || balance <= 0) {
      return { error: "크레딧이 부족합니다. 스토어에서 충전해주세요." };
    }

    // 기존 스크립트 확인
    const { data: existing } = await supabase
      .from(T.scripts)
      .select("id")
      .eq("user_id", userId)
      .eq("question_id", parsed.data.question_id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from(T.script_packages)
        .delete()
        .eq("script_id", existing.id);
    }

    const { data, error } = await supabase
      .from(T.scripts)
      .upsert(
        {
          user_id: userId,
          question_id: parsed.data.question_id,
          source: "correct",
          category: parsed.data.category,
          topic: parsed.data.topic,
          question_english: parsed.data.question_english,
          question_korean: parsed.data.question_korean,
          question_type: parsed.data.question_type,
          target_grade: parsed.data.target_grade,
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
      return { error: "스크립트 교정에 실패했습니다" };
    }

    // EF 호출: AI 교정 실행 (fire-and-forget — 클라이언트는 폴링으로 결과 확인)
    fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/scripts/correct`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ script_id: data.id }),
      }
    ).catch((err) => {
      console.error("scripts/correct EF 호출 실패:", err?.message || err);
    });

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
      .from(T.scripts)
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
      .from(T.scripts)
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

    // EF 호출: AI 수정 실행 (fire-and-forget — 클라이언트는 폴링으로 결과 확인)
    fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/scripts/refine`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          script_id: parsed.data.script_id,
          user_prompt: parsed.data.user_prompt || "",
        }),
      }
    ).catch((err) => {
      console.error("scripts/refine EF 호출 실패:", err?.message || err);
    });

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
      .from(T.scripts)
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
      .from(T.script_packages)
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
      .from(T.scripts)
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
      .from(T.scripts)
      .select(`
        id, question_id, source, title, english_text,
        topic, category, question_korean, question_english, target_grade,
        question_type, word_count, status, refine_count,
        created_at, updated_at,
        script_packages(id, status, progress),
        questions(question_short)
      `)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      return { error: "스크립트 목록 조회에 실패했습니다" };
    }

    // script_packages는 1:N이지만 최신 1개만 사용, questions nested → 플랫
    const items: ScriptListItem[] = (data ?? []).map((s) => {
      const { questions, script_packages, ...rest } = s as typeof s & { questions: { question_short: string } | null };
      return {
        ...rest,
        question_short: questions?.question_short ?? null,
        package: Array.isArray(script_packages) && script_packages.length > 0
          ? script_packages[0]
          : null,
      };
    });

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
      .from(T.scripts)
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

    // questions 조회 (별도 쿼리)
    const { data: question } = await supabase
      .from(T.questions)
      .select("id, question_english, question_korean, topic, category, question_type_eng")
      .eq("id", data.question_id)
      .single();

    const detail: ScriptDetail = {
      ...data,
      package: Array.isArray(data.script_packages) && data.script_packages.length > 0
        ? data.script_packages[0]
        : null,
      question_detail: question ?? undefined,
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
  questionType: string,
  targetLevel: string
): Promise<ActionResult<ScriptSpec>> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from(T.script_specs)
      .select("*")
      .eq("question_type", questionType)
      .eq("target_grade", targetLevel)
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
      .from(T.shadowing_sessions)
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
  questionType?: string
): Promise<ActionResult<OpicTip[]>> {
  try {
    const supabase = await createServerSupabaseClient();

    let query = supabase
      .from(T.opic_tips)
      .select("id, category, title, expression, description")
      .contains("applicable_levels", [targetLevel])
      .eq("is_active", true)
      .order("display_order");

    if (questionType) {
      query = query.or(`question_type.eq.${questionType},question_type.is.null`);
    }

    const { data, error } = await query;

    if (error) return { error: "학습 콘텐츠를 불러올 수 없습니다" };
    return { data: (data ?? []) as OpicTip[] };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

// ============================================================
// 패키지 생성 요청
// ============================================================

export async function createPackage(
  formData: Record<string, unknown>
): Promise<ActionResult<{ packageId: string }>> {
  const parsed = createPackageSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const { supabase, userId } = await requireUser();

    // 스크립트 확인 (confirmed + 본인 소유)
    const { data: script, error: fetchError } = await supabase
      .from(T.scripts)
      .select("id, status")
      .eq("id", parsed.data.script_id)
      .eq("user_id", userId)
      .single();

    if (fetchError || !script) {
      return { error: "스크립트를 찾을 수 없습니다" };
    }

    if (script.status !== "confirmed") {
      return { error: "확정된 스크립트만 패키지를 생성할 수 있습니다" };
    }

    // EF Phase 1: TTS 음성 생성
    const phase1Res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/scripts-package/generate-package`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          script_id: parsed.data.script_id,
          tts_voice: parsed.data.tts_voice,
          user_id: userId,
        }),
      }
    );

    if (!phase1Res.ok) {
      const err = await phase1Res.json().catch(() => ({ error: "음성 생성 실패" }));
      return { error: err.error || "패키지 음성 생성에 실패했습니다" };
    }

    const phase1Data = await phase1Res.json();
    const packageId = phase1Data.package_id;

    // EF Phase 2: 타임스탬프 생성 (실패해도 partial로 유지 — 음성은 사용 가능)
    let phase2Failed = false;
    try {
      const phase2Res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/scripts-package/generate-shadowing`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            package_id: packageId,
            user_id: userId,
          }),
        }
      );

      if (!phase2Res.ok) {
        const errBody = await phase2Res.text().catch(() => "");
        console.error("Phase 2 실패 (partial 상태 유지):", errBody);
        phase2Failed = true;
      }
    } catch (phase2Err) {
      console.error("Phase 2 예외 (partial 상태 유지):", (phase2Err as Error).message);
      phase2Failed = true;
    }

    if (phase2Failed) {
      console.warn(`패키지 ${packageId}: Phase 2 실패 — partial 상태로 제공`);
    }

    revalidatePath("/scripts");
    return { data: { packageId } };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

// ============================================================
// 쉐도잉 데이터 로드 (패키지 + 스크립트 통합)
// ============================================================

export interface ShadowingData {
  packageId: string;
  scriptId: string;
  wavUrl: string;
  jsonUrl: string | null;
  sentences: TimestampItem[];
  questionText: string | null;
  questionKorean: string | null;
  questionAudioUrl: string | null;
  topic: string | null;
  keyExpressions: string[];
  targetLevel: string | null;
  ttsVoice: string;
  packageStatus: string;
  structureSummary: import("@/lib/types/scripts").StructureSummaryItem[] | null;
  keySentences: import("@/lib/types/scripts").KeySentence[] | null;
}

export async function getShadowingData(
  packageId: string
): Promise<ActionResult<ShadowingData>> {
  try {
    const { supabase, userId } = await requireUser();

    const { data: pkg, error: pkgError } = await supabase
      .from(T.script_packages)
      .select(`
        id, script_id, status, wav_file_path, json_file_path,
        timestamp_data, tts_voice
      `)
      .eq("id", packageId)
      .eq("user_id", userId)
      .single();

    if (pkgError || !pkg) {
      return { error: "패키지를 찾을 수 없습니다" };
    }

    if (!pkg.wav_file_path) {
      return { error: "음성 파일이 준비되지 않았습니다" };
    }

    const { data: script, error: scriptError } = await supabase
      .from(T.scripts)
      .select("question_id, question_english, question_korean, topic, key_expressions, target_grade, paragraphs")
      .eq("id", pkg.script_id)
      .single();

    if (scriptError || !script) {
      return { error: "스크립트를 찾을 수 없습니다" };
    }

    // Storage public URL 생성
    const { data: wavUrlData } = supabase.storage
      .from("script-packages")
      .getPublicUrl(pkg.wav_file_path);

    let jsonUrl: string | null = null;
    if (pkg.json_file_path) {
      const { data: jsonUrlData } = supabase.storage
        .from("script-packages")
        .getPublicUrl(pkg.json_file_path);
      jsonUrl = jsonUrlData?.publicUrl || null;
    }

    // 질문 오디오 URL 조회
    let questionAudioUrl: string | null = null;
    if (script.question_id) {
      const { data: q } = await supabase
        .from(T.questions)
        .select("audio_url")
        .eq("id", script.question_id)
        .single();
      questionAudioUrl = q?.audio_url || null;
    }

    return {
      data: {
        packageId: pkg.id,
        scriptId: pkg.script_id,
        wavUrl: wavUrlData?.publicUrl || "",
        jsonUrl,
        sentences: pkg.timestamp_data || [],
        questionText: script.question_english,
        questionKorean: script.question_korean,
        questionAudioUrl,
        topic: script.topic,
        keyExpressions: script.key_expressions || [],
        targetLevel: script.target_grade,
        ttsVoice: pkg.tts_voice,
        packageStatus: pkg.status,
        structureSummary: (script.paragraphs as import("@/lib/types/scripts").ScriptOutput | null)?.structure_summary ?? null,
        keySentences: (script.paragraphs as import("@/lib/types/scripts").ScriptOutput | null)?.key_sentences ?? null,
      },
    };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

// ============================================================
// 쉐도잉 세션 시작 (Step 5)
// ============================================================

export async function startShadowingSession(
  formData: Record<string, unknown>
): Promise<ActionResult<{ sessionId: string }>> {
  const parsed = startShadowingSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const { supabase, userId } = await requireUser();

    // 스크립트 정보 조회 (세션에 기록)
    const { data: script } = await supabase
      .from(T.scripts)
      .select("question_english, question_korean, topic")
      .eq("id", parsed.data.script_id)
      .single();

    const { data: session, error } = await supabase
      .from(T.shadowing_sessions)
      .insert({
        user_id: userId,
        package_id: parsed.data.package_id,
        script_id: parsed.data.script_id,
        question_text: script?.question_english || null,
        question_korean: script?.question_korean || null,
        topic: script?.topic || null,
        status: "active",
      })
      .select("id")
      .single();

    if (error || !session) {
      return { error: "세션 생성에 실패했습니다" };
    }

    return { data: { sessionId: session.id } };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

// ============================================================
// 쉐도잉 평가 상세 조회
// ============================================================

export interface ShadowingSessionDetail {
  id: string;
  script_id: string;
  package_id: string | null;
  topic: string | null;
  question_text: string | null;
  question_korean: string | null;
  audio_duration: number | null;
  started_at: string;
  completed_at: string | null;
  evaluation: ShadowingEvaluation | null;
}

export async function getShadowingSessionDetail(
  sessionId: string
): Promise<ActionResult<ShadowingSessionDetail>> {
  try {
    const { supabase, userId } = await requireUser();

    const { data, error } = await supabase
      .from(T.shadowing_sessions)
      .select(`
        id, script_id, package_id, topic,
        question_text, question_korean,
        audio_duration, started_at, completed_at,
        shadowing_evaluations (*)
      `)
      .eq("id", sessionId)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return { error: "세션을 찾을 수 없습니다" };
    }

    const evalArr = data.shadowing_evaluations as unknown as ShadowingEvaluation[];
    return {
      data: {
        id: data.id,
        script_id: data.script_id,
        package_id: data.package_id ?? null,
        topic: data.topic ?? null,
        question_text: data.question_text ?? null,
        question_korean: data.question_korean ?? null,
        audio_duration: data.audio_duration ?? null,
        started_at: data.started_at,
        completed_at: data.completed_at ?? null,
        evaluation: evalArr?.[0] ?? null,
      },
    };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function getShadowingEvaluation(
  sessionId: string
): Promise<ActionResult<ShadowingEvaluation>> {
  try {
    const { supabase, userId } = await requireUser();

    const { data, error } = await supabase
      .from(T.shadowing_evaluations)
      .select("*")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return { error: "평가 결과를 찾을 수 없습니다" };
    }

    return { data: data as ShadowingEvaluation };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

// ============================================================
// 쉐도잉 훈련 가능 스크립트 목록 (패키지 완료된 것만)
// ============================================================

export async function getShadowableScripts(): Promise<
  ActionResult<ScriptListItem[]>
> {
  try {
    const { supabase, userId } = await requireUser();

    const { data, error } = await supabase
      .from(T.scripts)
      .select(`
        id, question_id, source, title, english_text,
        topic, category, question_korean, question_english, target_grade,
        question_type, word_count, status, refine_count,
        created_at, updated_at,
        script_packages!inner(id, status, progress)
      `)
      .eq("user_id", userId)
      .eq("status", "confirmed")
      .in("script_packages.status", ["completed", "partial"])
      .order("updated_at", { ascending: false });

    if (error) {
      return { error: "스크립트 목록 조회에 실패했습니다" };
    }

    const items: ScriptListItem[] = (data ?? []).map((s: any) => ({
      ...s,
      package:
        Array.isArray(s.script_packages) && s.script_packages.length > 0
          ? s.script_packages[0]
          : null,
    }));

    return { data: items };
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
        .from(T.scripts)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from(T.scripts)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "confirmed"),
      supabase
        .from(T.shadowing_sessions)
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
