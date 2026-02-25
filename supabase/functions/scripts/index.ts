// 스크립트 Edge Function — Two-Pass 아키텍처
// Pass 1: 스크립트 생성 (등급 준수 + 구어체 품질에 집중)
// Pass 2: 학습 분석 (핵심 표현 + 만능 패턴 + 연결어 + 필러 리스트 추출)
// T-9 결정: CRUD는 Server Actions, AI 호출은 Edge Functions

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Pass 1 JSON Schema (생성 전용 — parts 없음) ──

const scriptGenerationSchema = {
  name: "script_output",
  strict: true,
  schema: {
    type: "object",
    properties: {
      paragraphs: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["introduction", "body", "conclusion"],
            },
            label: { type: "string" },
            slots: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  slot_index: { type: "integer" },
                  slot_function: { type: "string" },
                  text: { type: "string" },
                  translation_ko: { type: "string" },
                  sentences: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        index: { type: "integer" },
                        english: { type: "string" },
                        korean: { type: "string" },
                      },
                      required: ["index", "english", "korean"],
                      additionalProperties: false,
                    },
                  },
                  keywords: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: [
                  "slot_index",
                  "slot_function",
                  "text",
                  "translation_ko",
                  "sentences",
                  "keywords",
                ],
                additionalProperties: false,
              },
            },
          },
          required: ["type", "label", "slots"],
          additionalProperties: false,
        },
      },
      full_text: {
        type: "object",
        properties: {
          english: { type: "string" },
          korean: { type: "string" },
        },
        required: ["english", "korean"],
        additionalProperties: false,
      },
      word_count: { type: "integer" },
    },
    required: ["paragraphs", "full_text", "word_count"],
    additionalProperties: false,
  },
};

// ── Pass 2 JSON Schema (단순 리스트 추출) ──

const analysisListSchema = {
  name: "analysis_lists",
  strict: true,
  schema: {
    type: "object",
    properties: {
      key_expressions: {
        type: "array",
        items: { type: "string" },
      },
      reusable_patterns: {
        type: "array",
        items: {
          type: "object",
          properties: {
            template: { type: "string" },
            description_ko: { type: "string" },
            example: { type: "string" },
          },
          required: ["template", "description_ko", "example"],
          additionalProperties: false,
        },
      },
      connectors: {
        type: "array",
        items: { type: "string" },
      },
      fillers: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["key_expressions", "reusable_patterns", "connectors", "fillers"],
    additionalProperties: false,
  },
};

// ── 라우터 ──

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();
    const body = await req.json();

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "인증이 필요합니다" }, 401);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    switch (path) {
      case "generate":
        return await handleGenerate(supabase, body);
      case "correct":
        return await handleCorrect(supabase, body);
      case "refine":
        return await handleRefine(supabase, body);
      default:
        return jsonResponse({ error: `알 수 없는 경로: ${path}` }, 404);
    }
  } catch (err) {
    console.error("Edge Function 에러:", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "서버 오류" },
      500
    );
  }
});

// ── 생성 (generate) ──

async function handleGenerate(supabase: any, body: any) {
  const { script_id } = body;
  if (!script_id) return jsonResponse({ error: "script_id 필수" }, 400);

  const startTime = Date.now();

  const { data: script, error: scriptError } = await supabase
    .from("scripts")
    .select("*")
    .eq("id", script_id)
    .single();

  if (scriptError || !script) {
    return jsonResponse({ error: "스크립트를 찾을 수 없습니다" }, 404);
  }

  // Pass 1: 스크립트 생성
  const { system, user } = await assemblePass1Prompt(
    supabase,
    script.answer_type,
    script.target_level,
    script.question_english,
    script.question_korean,
    script.user_story || "",
    "generate"
  );

  const pass1Result = await callGPT(system, user, scriptGenerationSchema, 0.8, 4000);

  // Pass 2: 학습 리스트 추출
  const analysisLists = await runPass2Analysis(
    supabase,
    pass1Result.full_text.english,
    script.target_level,
    script.answer_type,
    script.question_english
  );

  // 분석 결과를 pass1Result에 병합
  pass1Result.key_expressions = analysisLists.key_expressions;
  pass1Result.reusable_patterns = analysisLists.reusable_patterns;
  pass1Result.connectors = analysisLists.connectors;
  pass1Result.fillers = analysisLists.fillers;

  // DB 업데이트
  const generationTime = Math.round((Date.now() - startTime) / 1000);

  const { error: updateError } = await supabase
    .from("scripts")
    .update({
      english_text: pass1Result.full_text.english,
      korean_translation: pass1Result.full_text.korean,
      paragraphs: pass1Result,
      word_count: pass1Result.word_count,
      total_slots: countSlots(pass1Result),
      key_expressions: analysisLists.key_expressions,
      generation_time: generationTime,
      ai_model: "gpt-4.1",
      updated_at: new Date().toISOString(),
    })
    .eq("id", script_id);

  if (updateError) {
    console.error("DB 업데이트 실패:", updateError);
    return jsonResponse({ error: "스크립트 저장 실패" }, 500);
  }

  return jsonResponse({
    success: true,
    script_id,
    word_count: pass1Result.word_count,
    generation_time: generationTime,
  });
}

// ── 교정 (correct) ──

async function handleCorrect(supabase: any, body: any) {
  const { script_id } = body;
  if (!script_id) return jsonResponse({ error: "script_id 필수" }, 400);

  const startTime = Date.now();

  const { data: script, error: scriptError } = await supabase
    .from("scripts")
    .select("*")
    .eq("id", script_id)
    .single();

  if (scriptError || !script) {
    return jsonResponse({ error: "스크립트를 찾을 수 없습니다" }, 404);
  }

  // Pass 1: 교정 생성
  const { system, user } = await assemblePass1Prompt(
    supabase,
    script.answer_type,
    script.target_level,
    script.question_english,
    script.question_korean,
    script.user_original_answer || "",
    "correct"
  );

  const pass1Result = await callGPT(system, user, scriptGenerationSchema, 0.8, 4000);

  // Pass 2: 학습 리스트 추출
  const analysisLists = await runPass2Analysis(
    supabase,
    pass1Result.full_text.english,
    script.target_level,
    script.answer_type,
    script.question_english
  );

  pass1Result.key_expressions = analysisLists.key_expressions;
  pass1Result.reusable_patterns = analysisLists.reusable_patterns;
  pass1Result.connectors = analysisLists.connectors;
  pass1Result.fillers = analysisLists.fillers;

  const generationTime = Math.round((Date.now() - startTime) / 1000);

  const { error: updateError } = await supabase
    .from("scripts")
    .update({
      english_text: pass1Result.full_text.english,
      korean_translation: pass1Result.full_text.korean,
      paragraphs: pass1Result,
      word_count: pass1Result.word_count,
      total_slots: countSlots(pass1Result),
      key_expressions: analysisLists.key_expressions,
      generation_time: generationTime,
      ai_model: "gpt-4.1",
      updated_at: new Date().toISOString(),
    })
    .eq("id", script_id);

  if (updateError) {
    return jsonResponse({ error: "스크립트 저장 실패" }, 500);
  }

  return jsonResponse({
    success: true,
    script_id,
    word_count: pass1Result.word_count,
    generation_time: generationTime,
  });
}

// ── 수정 (refine) ──

async function handleRefine(supabase: any, body: any) {
  const { script_id, user_prompt } = body;
  if (!script_id) return jsonResponse({ error: "script_id 필수" }, 400);

  const startTime = Date.now();

  const { data: script, error: scriptError } = await supabase
    .from("scripts")
    .select("*")
    .eq("id", script_id)
    .single();

  if (scriptError || !script) {
    return jsonResponse({ error: "스크립트를 찾을 수 없습니다" }, 404);
  }

  if (script.status === "confirmed") {
    return jsonResponse({ error: "확정된 스크립트는 수정 불가" }, 400);
  }

  // Pass 1: 수정 생성
  const { system, user: baseUser } = await assemblePass1Prompt(
    supabase,
    script.answer_type,
    script.target_level,
    script.question_english,
    script.question_korean,
    script.source === "correct"
      ? script.user_original_answer || ""
      : script.user_story || "",
    script.source as "generate" | "correct"
  );

  const refineContext = `
---

## ⑥ REFINE (수정 요청)

아래는 기존 생성된 스크립트입니다. 이 스크립트를 기반으로 수정해주세요.

### 기존 스크립트:
${script.english_text}

### 수정 요청:
${user_prompt || "전체적으로 더 자연스럽게 개선해주세요."}

위 수정 요청을 반영하되, 등급 제약(LEVEL GATE)과 슬롯 구조는 반드시 유지하세요.
동일한 JSON 형식으로 반환하세요.
`;

  const pass1Result = await callGPT(
    system,
    baseUser + refineContext,
    scriptGenerationSchema,
    0.8,
    4000
  );

  // Pass 2: 학습 리스트 추출
  const analysisLists = await runPass2Analysis(
    supabase,
    pass1Result.full_text.english,
    script.target_level,
    script.answer_type,
    script.question_english
  );

  pass1Result.key_expressions = analysisLists.key_expressions;
  pass1Result.reusable_patterns = analysisLists.reusable_patterns;
  pass1Result.connectors = analysisLists.connectors;
  pass1Result.fillers = analysisLists.fillers;

  const generationTime = Math.round((Date.now() - startTime) / 1000);

  const { error: updateError } = await supabase
    .from("scripts")
    .update({
      english_text: pass1Result.full_text.english,
      korean_translation: pass1Result.full_text.korean,
      paragraphs: pass1Result,
      word_count: pass1Result.word_count,
      total_slots: countSlots(pass1Result),
      key_expressions: analysisLists.key_expressions,
      generation_time: generationTime,
      updated_at: new Date().toISOString(),
    })
    .eq("id", script_id);

  if (updateError) {
    return jsonResponse({ error: "수정 스크립트 저장 실패" }, 500);
  }

  return jsonResponse({
    success: true,
    script_id,
    word_count: pass1Result.word_count,
    generation_time: generationTime,
  });
}

// ── Pass 1 프롬프트 조립 (생성 전용) ──

async function assemblePass1Prompt(
  supabase: any,
  answerType: string,
  targetLevel: string,
  questionEnglish: string,
  questionKorean: string,
  learnerInput: string,
  mode: "generate" | "correct"
): Promise<{ system: string; user: string }> {
  // System Prompt 로드 (script_system — 생성 전용)
  const { data: template } = await supabase
    .from("ai_prompt_templates")
    .select("system_prompt")
    .eq("template_id", "script_system")
    .eq("is_active", true)
    .single();

  if (!template) {
    throw new Error("프롬프트 템플릿을 찾을 수 없습니다");
  }

  // script_specs 로드
  const guideId = `${answerType}_${targetLevel}`;
  const { data: spec } = await supabase
    .from("script_specs")
    .select(
      "level_constraints, slot_structure, example_output, eval_criteria, total_slots"
    )
    .eq("guide_id", guideId)
    .single();

  if (!spec) {
    throw new Error(`규격서를 찾을 수 없습니다: ${guideId}`);
  }

  const exampleJson =
    typeof spec.example_output === "object"
      ? JSON.stringify(spec.example_output, null, 2)
      : spec.example_output;

  const inputLabel =
    mode === "correct" ? "Learner answer (English)" : "Learner input";
  const generateLabel =
    mode === "correct"
      ? `Correct and improve the learner's ${targetLevel}-level spoken English answer`
      : `Generate a natural ${targetLevel}-level spoken English script`;

  const userPrompt = `## ① LEVEL GATE — ${targetLevel}

⛔ CRITICAL: Target level is ${targetLevel}. NEVER use expressions from higher levels.

${spec.level_constraints}

---

## ② STRUCTURE — ${answerType} × ${targetLevel}

${spec.slot_structure}

---

## ③ EXAMPLE

${exampleJson}

---

## ④ INPUT

Question: ${questionEnglish}
Question (Korean): ${questionKorean}
${inputLabel}: ${learnerInput || "(없음 — Level 3 확장 정책 적용)"}
Answer type: ${answerType}
Total slots: ${spec.total_slots}

---

## ⑤ ${mode === "correct" ? "CORRECT" : "GENERATE"}

${generateLabel}
following all constraints above. Return JSON only.`;

  return { system: template.system_prompt, user: userPrompt };
}

// ── Pass 2: 학습 리스트 추출 ──

interface AnalysisLists {
  key_expressions: string[];
  reusable_patterns: { template: string; description_ko: string; example: string }[];
  connectors: string[];
  fillers: string[];
}

const EMPTY_LISTS: AnalysisLists = {
  key_expressions: [],
  reusable_patterns: [],
  connectors: [],
  fillers: [],
};

async function runPass2Analysis(
  supabase: any,
  fullEnglishText: string,
  targetLevel: string,
  answerType: string,
  questionEnglish: string
): Promise<AnalysisLists> {
  try {
    // 분석 시스템 프롬프트 로드
    const { data: template } = await supabase
      .from("ai_prompt_templates")
      .select("system_prompt")
      .eq("template_id", "script_analysis")
      .eq("is_active", true)
      .single();

    if (!template) {
      console.warn("script_analysis 프롬프트 없음, 빈 리스트 반환");
      return EMPTY_LISTS;
    }

    const userPrompt = `Target level: ${targetLevel}
Answer type: ${answerType}
Question: ${questionEnglish}

Script:
${fullEnglishText}

Extract key learning elements from this script as simple lists.`;

    const result = await callGPT(
      template.system_prompt,
      userPrompt,
      analysisListSchema,
      0.3,
      1500
    );

    return {
      key_expressions: result.key_expressions || [],
      reusable_patterns: result.reusable_patterns || [],
      connectors: result.connectors || [],
      fillers: result.fillers || [],
    };
  } catch (err) {
    console.error("Pass 2 분석 실패, 빈 리스트 반환:", err);
    return EMPTY_LISTS;
  }
}

// ── GPT API 호출 (스키마 파라미터화) ──

async function callGPT(
  systemPrompt: string,
  userPrompt: string,
  jsonSchema: any,
  temperature: number = 0.8,
  maxTokens: number = 4000
) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature,
      max_completion_tokens: maxTokens,
      response_format: {
        type: "json_schema",
        json_schema: jsonSchema,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("GPT API 에러:", response.status, errorBody);
    throw new Error(`GPT API 호출 실패: ${response.status}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("GPT 응답이 비어있습니다");
  }

  return JSON.parse(content);
}

// ── 유틸리티 함수 ──

function countSlots(output: any): number {
  return (output.paragraphs || []).reduce(
    (sum: number, p: any) => sum + (p.slots?.length || 0),
    0
  );
}

// ── 응답 헬퍼 ──

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
