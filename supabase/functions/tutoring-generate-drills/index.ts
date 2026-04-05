// tutoring-generate-drills — 드릴 세션 생성 Edge Function
// QSE(질문 선택) + Prompt E(드릴 세션 계획) 실행
// 프롬프트는 evaluation_prompts 테이블에서 동적 로드

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadPromptSet, buildMessages } from "../_shared/tutoring-prompts.ts";
import { logApiUsage, extractChatUsage } from "../_shared/api-usage-logger.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { focus_id } = await req.json();
    console.log(`[tutoring-generate-drills] 시작: ${focus_id}`);

    // 1. 프롬프트 로드
    const promptE = await loadPromptSet(supabase, "tutoring_drill_generate");

    // 2. Focus 데이터 조회
    const { data: focus, error: focusErr } = await supabase
      .from("tutoring_focuses")
      .select("*, tutoring_sessions!inner(id, user_id, current_stable_level, next_step_level, final_target_level)")
      .eq("id", focus_id)
      .single();

    if (focusErr || !focus) throw new Error(`Focus 조회 실패: ${focusErr?.message}`);

    const session = focus.tutoring_sessions;
    const selectionPolicy = focus.selection_policy;
    if (!selectionPolicy) throw new Error("selection_policy가 없습니다");

    // 3. QSE — 질문 선택
    console.log(`[tutoring-generate-drills] QSE 실행`);
    const questionPool = await selectQuestionsFromDB(supabase, selectionPolicy);

    await supabase
      .from("tutoring_focuses")
      .update({ question_pool: questionPool })
      .eq("id", focus_id);

    // 4. Prompt E 호출
    console.log(`[tutoring-generate-drills] Prompt E 호출 중...`);

    const promptEInput = {
      focus: { focus_code: focus.focus_code, label: focus.label, reason: focus.reason },
      level_context: { next_step_level: session.next_step_level, final_target_level: session.final_target_level },
      question_pool: questionPool,
    };

    const messages = buildMessages(promptE, promptEInput);
    const { content: drillPlan, usage: promptEUsage } = await callGPT(messages, promptE.model);

    console.log(`[tutoring-generate-drills] Prompt E 완료`);

    // API 사용량 로깅 (Prompt E)
    await logApiUsage(supabase, {
      user_id: session.user_id,
      session_type: "tutoring",
      session_id: session.id,
      feature: "tutoring_drills_e",
      service: "openai_chat",
      model: promptE.model,
      ef_name: "tutoring-generate-drills",
      tokens_in: promptEUsage.prompt_tokens,
      tokens_out: promptEUsage.completion_tokens,
    });

    // 5. DB 저장
    await supabase
      .from("tutoring_focuses")
      .update({ drill_session_plan: drillPlan, status: "active" })
      .eq("id", focus_id);

    const drillRows = [];
    for (const qKey of ["q1", "q2", "q3"] as const) {
      const q = drillPlan[qKey];
      if (!q) continue;
      const num = qKey === "q1" ? 1 : qKey === "q2" ? 2 : 3;
      drillRows.push({
        id: `td_${crypto.randomUUID().slice(0, 8)}`,
        focus_id,
        question_number: num,
        question_id: q.question_id,
        question_english: q.question_english,
        topic: q.topic,
        goal: q.goal,
        hint_level: q.hint_level,
        frame_slots: q.frame_slots,
        sample_answer: q.sample_answer,
        pass_criteria: q.pass_criteria,
        rule_only_hint: q.rule_only_hint ?? null,
        status: num === 1 ? "active" : "pending",
      });
    }

    if (drillRows.length > 0) {
      const { error: drillErr } = await supabase.from("tutoring_drills").insert(drillRows);
      if (drillErr) console.error("[tutoring-generate-drills] 드릴 생성 실패:", drillErr);
    }

    console.log(`[tutoring-generate-drills] 완료: ${drillRows.length}개 드릴`);

    return new Response(
      JSON.stringify({ ok: true, focus_id, drill_count: drillRows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[tutoring-generate-drills] 에러:", message);
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ── QSE ──

async function selectQuestionsFromDB(
  supabase: ReturnType<typeof createClient>,
  policy: Record<string, unknown>
) {
  const questionType = policy.question_type as string;
  const primaryTopic = policy.primary_topic as string;
  const topicMode = (policy.topic_mode as string) || "same_then_transfer";
  const excludeIds = (policy.exclude_recent_question_ids as string[]) || [];

  const q1 = await queryQ(supabase, questionType, primaryTopic, null, excludeIds, 5);
  const q1Ids = q1.map((q: { question_id: string }) => q.question_id);
  const allExclude = [...excludeIds, ...q1Ids];

  let q2;
  if (topicMode === "same_only") {
    q2 = await queryQ(supabase, questionType, primaryTopic, null, allExclude, 3);
  } else {
    q2 = await queryQ(supabase, questionType, primaryTopic, null, allExclude, 2);
    if (q2.length < 2) {
      const more = await queryQ(supabase, questionType, null, primaryTopic, [...allExclude, ...q2.map((q: { question_id: string }) => q.question_id)], 2);
      q2 = [...q2, ...more];
    }
  }

  const allPrev = [...allExclude, ...q2.map((q: { question_id: string }) => q.question_id)];
  const q3 = topicMode === "same_only"
    ? await queryQ(supabase, questionType, primaryTopic, null, allPrev, 3)
    : await queryQ(supabase, questionType, null, primaryTopic, allPrev, 3);

  return { q1_candidates: q1, q2_candidates: q2, q3_candidates: q3 };
}

async function queryQ(
  supabase: ReturnType<typeof createClient>,
  type: string, topic: string | null, excludeTopic: string | null,
  excludeIds: string[], limit: number
) {
  let query = supabase.from("questions").select("id, question_type_eng, topic, question_english").eq("question_type_eng", type);
  if (topic) query = query.eq("topic", topic);
  if (excludeTopic) query = query.neq("topic", excludeTopic);
  if (excludeIds.length > 0) query = query.not("id", "in", `(${excludeIds.join(",")})`);
  const { data } = await query.limit(limit);
  return (data ?? []).map((r: { id: string; question_type_eng: string; topic: string; question_english: string }) => ({
    question_id: r.id, question_type: r.question_type_eng, topic: r.topic, question_english: r.question_english,
  }));
}

// ── GPT ──

async function callGPT(messages: { role: string; content: string }[], model = "gpt-4.1-mini") {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model, messages, temperature: 0.4, response_format: { type: "json_object" } }),
  });
  if (!response.ok) throw new Error(`GPT 에러: ${response.status}`);
  const data = await response.json();
  return { content: JSON.parse(data.choices?.[0]?.message?.content ?? "{}"), usage: extractChatUsage(data) };
}
