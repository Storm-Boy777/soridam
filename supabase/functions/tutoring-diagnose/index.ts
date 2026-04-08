// tutoring-diagnose — 튜터링 진단 Edge Function
// Prompt C (종합 병목 분석) + Prompt D (처방 생성) 실행
// 프롬프트는 evaluation_prompts 테이블에서 동적 로드
// SA startDiagnosis에서 fire-and-forget으로 호출됨

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadPromptSet, buildMessages } from "../_shared/tutoring-prompts.ts";
import { logApiUsage, extractChatUsage } from "../_shared/api-usage-logger.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { session_id, user_id, analyzed_session_ids, target_grade } =
      await req.json();

    console.log(`[tutoring-diagnose] 시작: ${session_id}, 세션 ${analyzed_session_ids.length}회분`);

    // ============================================================
    // 1. 프롬프트 로드 (DB에서)
    // ============================================================

    const [promptC, promptD] = await Promise.all([
      loadPromptSet(supabase, "tutoring_diagnosis"),
      loadPromptSet(supabase, "tutoring_prescription"),
    ]);

    console.log(`[tutoring-diagnose] 프롬프트 로드 완료: C(v${promptC.version}), D(v${promptD.version})`);

    // ============================================================
    // 2. 분석 데이터 수집 (D-5 입력 스펙)
    // ============================================================

    const { data: reports } = await supabase
      .from("mock_test_reports")
      .select("session_id, final_level, target_grade")
      .in("session_id", analyzed_session_ids);

    const reportMap = new Map(
      (reports ?? []).map((r: { session_id: string; final_level: string; target_grade: string }) => [r.session_id, r])
    );

    const { data: answers } = await supabase
      .from("mock_test_answers")
      .select(
        `session_id, question_number, question_id, transcript,
         audio_duration, word_count, wpm, filler_word_count,
         filler_ratio, long_pause_count, pronunciation_assessment,
         skipped, meta_only, unfinished_end`
      )
      .in("session_id", analyzed_session_ids)
      .order("session_id")
      .order("question_number");

    const questionIds = [...new Set((answers ?? []).map((a: { question_id: string }) => a.question_id))];
    const { data: questions } = await supabase
      .from("questions")
      .select("id, question_type_eng, topic, question_english")
      .in("id", questionIds);

    const questionMap = new Map(
      (questions ?? []).map((q: { id: string; question_type_eng: string; topic: string; question_english: string }) => [q.id, q])
    );

    const { data: sessions } = await supabase
      .from("mock_test_sessions")
      .select("session_id, completed_at, mode")
      .in("session_id", analyzed_session_ids);

    const sessionMap = new Map(
      (sessions ?? []).map((s: { session_id: string; completed_at: string; mode: string }) => [s.session_id, s])
    );

    // Prompt C 입력 구성
    const promptCInput = {
      user_id,
      analysis_window: {
        source_session_ids: analyzed_session_ids,
        source_count: analyzed_session_ids.length,
      },
      sessions: analyzed_session_ids.map((sid: string) => {
        const report = reportMap.get(sid);
        const session = sessionMap.get(sid);
        const sessionAnswers = (answers ?? [])
          .filter((a: { session_id: string }) => a.session_id === sid)
          .map((a: {
            question_number: number; question_id: string; transcript: string;
            audio_duration: number; word_count: number; wpm: number;
            filler_word_count: number; filler_ratio: number; long_pause_count: number;
            pronunciation_assessment: Record<string, unknown>;
            skipped: boolean; meta_only: boolean; unfinished_end: boolean;
          }) => {
            const q = questionMap.get(a.question_id);
            return {
              question_number: a.question_number,
              question_id: a.question_id,
              answer_type: q?.question_type_eng ?? null,
              topic: q?.topic ?? null,
              transcript: (a.transcript ?? "").slice(0, 500),
              audio_duration: a.audio_duration,
              word_count: a.word_count,
              wpm: a.wpm,
              filler_word_count: a.filler_word_count,
              filler_ratio: a.filler_ratio,
              long_pause_count: a.long_pause_count,
              // pronunciation_assessment → 요약 점수만 (단어별 상세 제외)
              pronunciation_summary: a.pronunciation_assessment ? {
                accuracy: (a.pronunciation_assessment as Record<string, unknown>).accuracyScore ?? null,
                fluency: (a.pronunciation_assessment as Record<string, unknown>).fluencyScore ?? null,
                prosody: (a.pronunciation_assessment as Record<string, unknown>).prosodyScore ?? null,
              } : null,
              skipped: a.skipped,
              meta_only: a.meta_only,
              unfinished_end: a.unfinished_end,
            };
          });
        return {
          session_id: sid,
          completed_at: session?.completed_at ?? null,
          mode: session?.mode ?? "test",
          final_level: report?.final_level ?? null,
          target_grade: target_grade,
          items: sessionAnswers,
        };
      }),
    };

    // ============================================================
    // 3. Prompt C — 종합 병목 분석
    // ============================================================

    console.log(`[tutoring-diagnose] Prompt C 호출 중...`);
    const promptCMessages = buildMessages(promptC, promptCInput);
    const { content: promptCResult, usage: promptCUsage } = await callGPT(promptCMessages, promptC.model);
    console.log(`[tutoring-diagnose] Prompt C 완료: stable=${promptCResult.current_stable_level}`);

    // API 사용량 로깅 (Prompt C)
    await logApiUsage(supabase, {
      user_id,
      session_type: "tutoring",
      session_id,
      feature: "튜터링 진단",
      service: "openai_chat",
      model: promptC.model,
      ef_name: "tutoring-diagnose",
      tokens_in: promptCUsage.prompt_tokens,
      tokens_out: promptCUsage.completion_tokens,
    });

    // ============================================================
    // 4. Prompt D — 처방 생성
    // ============================================================

    const { data: templates } = await supabase
      .from("type_templates")
      .select("type_code, type_label_ko, default_pass_criteria, graduation_relevance");

    const promptDInput = {
      cycle_context: {
        current_stable_level: promptCResult.current_stable_level,
        next_step_level: promptCResult.next_step_level,
        final_target_level: target_grade,
      },
      diagnosis_result: {
        top_bottlenecks_internal: promptCResult.top_bottlenecks_internal,
        student_top_focuses: promptCResult.student_top_focuses,
        diagnosis_summary_internal: promptCResult.diagnosis_summary_internal,
      },
      available_type_templates: templates ?? [],
    };

    console.log(`[tutoring-diagnose] Prompt D 호출 중...`);
    const promptDMessages = buildMessages(promptD, promptDInput);
    const { content: promptDResult, usage: promptDUsage } = await callGPT(promptDMessages, promptD.model);
    console.log(`[tutoring-diagnose] Prompt D 완료: focus ${promptDResult.weekly_focuses?.length}개`);

    // API 사용량 로깅 (Prompt D)
    await logApiUsage(supabase, {
      user_id,
      session_type: "tutoring",
      session_id,
      feature: "튜터링 처방",
      service: "openai_chat",
      model: promptD.model,
      ef_name: "tutoring-diagnose",
      tokens_in: promptDUsage.prompt_tokens,
      tokens_out: promptDUsage.completion_tokens,
    });

    // ============================================================
    // 5. DB 업데이트
    // ============================================================

    const { error: updateErr } = await supabase
      .from("tutoring_sessions")
      .update({
        current_stable_level: promptCResult.current_stable_level,
        ceiling_candidate_level: promptCResult.ceiling_candidate_level,
        next_step_level: promptCResult.next_step_level,
        stable_confidence: promptCResult.stable_confidence,
        floor_status: promptCResult.floor_status,
        target_gap_summary: promptCResult.target_gap_summary,
        diagnosis_internal: promptCResult.diagnosis_summary_internal,
        top_bottlenecks: promptCResult.top_bottlenecks_internal,
        student_top_focuses: promptCResult.student_top_focuses,
        student_summary: promptCResult.student_summary,
        prescription_json: promptDResult,
        status: "diagnosed",
        model: promptC.model,
        prompt_version: `C:${promptC.version},D:${promptD.version}`,
      })
      .eq("id", session_id);

    if (updateErr) throw new Error(`세션 업데이트 실패: ${updateErr.message}`);

    // tutoring_focuses 생성
    const focuses = (promptDResult.weekly_focuses ?? []).map(
      (f: {
        priority_rank: number; focus_code: string; label: string;
        reason: string; why_now_for_target: string; selection_policy: Record<string, unknown>;
      }, idx: number) => ({
        id: `tf_${crypto.randomUUID().slice(0, 8)}`,
        session_id,
        priority_rank: f.priority_rank ?? idx + 1,
        focus_code: f.focus_code,
        label: f.label,
        reason: f.reason,
        why_now_for_target: f.why_now_for_target,
        selection_policy: f.selection_policy,
        status: idx === 0 ? "active" : "pending",
      })
    );

    if (focuses.length > 0) {
      const { error: focusErr } = await supabase.from("tutoring_focuses").insert(focuses);
      if (focusErr) console.error(`[tutoring-diagnose] Focus 생성 실패:`, focusErr);
    }

    console.log(`[tutoring-diagnose] 완료: ${session_id}`);

    return new Response(
      JSON.stringify({ ok: true, session_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[tutoring-diagnose] 에러:`, message);

    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body.session_id) {
        await supabase
          .from("tutoring_sessions")
          .update({ status: "diagnosed" })
          .eq("id", body.session_id);
      }
    } catch { /* ignore */ }

    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ── GPT 호출 ──

async function callGPT(
  messages: { role: string; content: string }[],
  model = "gpt-4.1-mini"
) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error(`GPT API 에러 (${response.status}): ${await response.text()}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("GPT 응답이 비어있습니다");
  return { content: JSON.parse(content), usage: extractChatUsage(data) };
}
