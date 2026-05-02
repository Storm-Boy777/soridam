/**
 * opic-study-guide — 오픽 스터디 일타강사 가이드 생성 EF
 *
 * 역할: 콤보 선택 직후 1회 실행. AI 일타강사가 오늘 학습 인트로 멘트 + 핵심 3가지 생성.
 *
 * 호출: SA `generateGuide(sessionId)` fire-and-forget
 * 입력: { session_id }
 * 처리:
 *   1. 세션 메타 조회 (그룹 등급, 카테고리, 토픽, 선택된 질문 ID들)
 *   2. 콤보 정보 + 출제 빈도 계산 (시험후기 SSOT)
 *   3. evaluation_prompts에서 'opic_study_guide' 프롬프트 로드
 *   4. GPT-4.1 호출 (CO-STAR, JSON 모드)
 *   5. opic_study_sessions UPDATE: ai_guide_text, ai_guide_key_points
 *   6. api_usage_logs INSERT (시스템 비용, 크레딧 차감 X)
 *
 * 무료 정책: 사용자 크레딧 차감 X — 시스템 부담
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "https://soridamhub.com,http://localhost:3001").split(",");

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

// ── 타입 ──

interface GuideOutput {
  guide_text: string;
  key_points: string[];
}

interface SessionMeta {
  id: string;
  group_id: string;
  selected_category: string;
  selected_topic: string;
  selected_question_ids: string[];
  ai_guide_text: string | null;
}

interface QuestionInfo {
  id: string;
  question_type_eng: string;
  question_english: string;
}

// ── 변수 치환 헬퍼 ──

function buildPrompt(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const v = vars[key];
    if (v === undefined || v === null) return "";
    if (typeof v === "string") return v;
    return JSON.stringify(v, null, 2);
  });
}

function formatQuestions(questions: QuestionInfo[]): string {
  return questions
    .map((q, i) => `${i + 1}. [${q.question_type_eng}] ${q.question_english}`)
    .join("\n");
}

// ── 콤보 출제 빈도 계산 (시험후기 SSOT) ──

async function computeAppearanceStats(
  supabase: SupabaseClient,
  topic: string,
  category: string,
  questionIds: string[]
): Promise<{ appearance_count: number; appearance_pct: number; question_appearance: Record<string, number> }> {
  // 같은 토픽+카테고리의 모든 콤보 조회
  type Row = {
    submission_id: number;
    combo_type: string;
    question_id: string;
  };

  const { data, error } = await supabase
    .from("submission_questions")
    .select("submission_id, combo_type, question_id, submissions!inner(status, exam_approved)")
    .eq("topic", topic)
    .eq("submissions.status", "complete")
    .eq("submissions.exam_approved", "approved");

  if (error || !data) {
    return { appearance_count: 0, appearance_pct: 0, question_appearance: {} };
  }

  // 카테고리 필터
  const filtered = (data as unknown as Row[]).filter((r) => {
    if (category === "general") return r.combo_type.startsWith("general");
    if (category === "roleplay") return r.combo_type === "roleplay";
    return r.combo_type === "advance";
  });

  // 콤보별 그루핑 (submission_id)
  const bySubmission = new Map<number, string[]>();
  for (const r of filtered) {
    const arr = bySubmission.get(r.submission_id) ?? [];
    arr.push(r.question_id);
    bySubmission.set(r.submission_id, arr);
  }

  const totalCombos = bySubmission.size;
  if (totalCombos === 0) {
    return { appearance_count: 0, appearance_pct: 0, question_appearance: {} };
  }

  // 1. 이 콤보(시그니처)의 출제 횟수
  const targetSig = [...questionIds].sort().join("|");
  let comboCount = 0;
  for (const qids of bySubmission.values()) {
    const sig = [...qids].sort().join("|");
    if (sig === targetSig) comboCount++;
  }

  // 2. 토픽 전체 질문별 등장률
  const qidAppearance: Record<string, number> = {};
  for (const qid of filtered.map((r) => r.question_id)) {
    qidAppearance[qid] = (qidAppearance[qid] || 0) + 1;
  }
  const questionAppearance: Record<string, number> = {};
  for (const qid of questionIds) {
    questionAppearance[qid] = Math.round(((qidAppearance[qid] || 0) / totalCombos) * 100);
  }

  return {
    appearance_count: comboCount,
    appearance_pct: Math.round((comboCount / totalCombos) * 100),
    question_appearance: questionAppearance,
  };
}

// ── api_usage_logs INSERT (크레딧 차감 X) ──

async function logSystemUsage(
  supabase: SupabaseClient,
  params: {
    user_id: string;
    session_id: string;
    tokens_in: number;
    tokens_out: number;
    cost_usd: number;
    processing_time_ms: number;
  }
) {
  const { error } = await supabase.from("api_usage_logs").insert({
    user_id: params.user_id,
    session_type: "opic_study",
    session_id: params.session_id,
    feature: "opic_study_guide",
    service: "openai_chat",
    model: "gpt-4.1",
    ef_name: "opic-study-guide",
    tokens_in: params.tokens_in,
    tokens_out: params.tokens_out,
    cost_usd: params.cost_usd,
    processing_time_ms: params.processing_time_ms,
  });
  if (error) console.error("[opic-study-guide] api_usage_logs insert 실패:", error.message);
}

// ── 메인 핸들러 ──

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const startTime = Date.now();
  let sessionId = "";
  let triggeredBy = "";

  try {
    const body = await req.json();
    sessionId = body.session_id;
    triggeredBy = body.triggered_by;
    if (!sessionId || !triggeredBy) {
      return new Response(JSON.stringify({ error: "session_id and triggered_by required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. 세션 메타 조회 (그룹 등급 X — 가이드는 등급 비특정)
    const { data: sessionData, error: sErr } = await supabase
      .from("opic_study_sessions")
      .select("id, group_id, selected_category, selected_topic, selected_question_ids, ai_guide_text")
      .eq("id", sessionId)
      .single();

    if (sErr || !sessionData) {
      return new Response(JSON.stringify({ error: "session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = sessionData as unknown as SessionMeta;

    // 이미 가이드 있으면 skip
    if (session.ai_guide_text) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. 질문 정보 조회
    const { data: questions, error: qErr } = await supabase
      .from("questions")
      .select("id, question_type_eng, question_english")
      .in("id", session.selected_question_ids);

    if (qErr || !questions || questions.length === 0) {
      return new Response(JSON.stringify({ error: "questions not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // selected_question_ids 순서대로 정렬
    const orderedQuestions = session.selected_question_ids
      .map((qid) => questions.find((q) => q.id === qid))
      .filter((q): q is QuestionInfo => !!q);

    // 3. 출제 빈도 계산
    const stats = await computeAppearanceStats(
      supabase,
      session.selected_topic,
      session.selected_category,
      session.selected_question_ids
    );

    // 4. 프롬프트 로드 (system + user 별도 row)
    const [systemRes, userRes] = await Promise.all([
      supabase.from("evaluation_prompts").select("prompt_text").eq("key", "opic_study_guide").maybeSingle(),
      supabase.from("evaluation_prompts").select("prompt_text").eq("key", "opic_study_guide_user").maybeSingle(),
    ]);

    if (!systemRes.data?.prompt_text || !userRes.data?.prompt_text) {
      return new Response(JSON.stringify({ error: "prompt not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPromptText = systemRes.data.prompt_text as string;
    const userPromptTpl = userRes.data.prompt_text as string;

    // 5. 변수 치환 (그룹 등급 X — 멤버 다양한 등급 수용 위해 비특정)
    const userPrompt = buildPrompt(userPromptTpl, {
      group_target_level: "다양한 등급의 멤버", // 프롬프트 호환성 위해 placeholder
      category: session.selected_category,
      topic: session.selected_topic,
      questions_text: formatQuestions(orderedQuestions),
      appearance_count: stats.appearance_count,
      appearance_pct: stats.appearance_pct,
      question_appearance: JSON.stringify(stats.question_appearance, null, 2),
    });

    // 6. GPT-4.1 호출
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        messages: [
          { role: "system", content: systemPromptText },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text();
      console.error("[opic-study-guide] OpenAI 에러:", errText);
      return new Response(JSON.stringify({ error: "AI 가이드 생성 실패" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(JSON.stringify({ error: "empty AI response" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: GuideOutput;
    try {
      parsed = JSON.parse(content);
    } catch {
      return new Response(JSON.stringify({ error: "invalid AI JSON" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 검증: key_points 정확히 3개
    if (!parsed.guide_text || !Array.isArray(parsed.key_points) || parsed.key_points.length !== 3) {
      console.error("[opic-study-guide] AI 응답 검증 실패:", parsed);
      return new Response(JSON.stringify({ error: "AI 응답 형식 오류" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7. DB UPDATE
    const { error: uErr } = await supabase
      .from("opic_study_sessions")
      .update({
        ai_guide_text: parsed.guide_text,
        ai_guide_key_points: parsed.key_points,
        ai_guide_generated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .is("ai_guide_text", null); // 멱등성

    if (uErr) {
      console.error("[opic-study-guide] DB UPDATE 실패:", uErr.message);
    }

    // 8. api_usage_logs (시스템 비용, 크레딧 차감 X)
    const usage = openaiData.usage || {};
    const tokensIn = usage.prompt_tokens || 0;
    const tokensOut = usage.completion_tokens || 0;
    const costUsd = (tokensIn * 2.0 + tokensOut * 8.0) / 1_000_000;

    await logSystemUsage(supabase, {
      user_id: triggeredBy, // 가이드 트리거한 사용자 (스터디는 무료 — 차감 X, 모니터링용)
      session_id: sessionId,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      cost_usd: costUsd,
      processing_time_ms: Date.now() - startTime,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[opic-study-guide] 예외:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
