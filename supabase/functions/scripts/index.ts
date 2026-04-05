// 스크립트 Edge Function — Two-Pass 아키텍처
// Pass 1: 스크립트 생성 (등급 준수 + 구어체 품질에 집중)
// Pass 2: 학습 분석 (핵심 표현 + 만능 패턴 + 연결어 + 필러 리스트 추출)
// T-9 결정: CRUD는 Server Actions, AI 호출은 Edge Functions

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logApiUsage, extractChatUsage, estimateAudioDuration } from "../_shared/api-usage-logger.ts";

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
                        index: { type: "integer", description: "전체 스크립트 기준 1부터 시작하는 연속 번호. 슬롯/단락 구분 없이 전체 문장을 순서대로 1, 2, 3, 4... 로 매긴다." },
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

// ── Pass 2 JSON Schema (7가지 학습 분석 콘텐츠) ──

const analysisListSchema = {
  name: "analysis_lists",
  strict: true,
  schema: {
    type: "object",
    properties: {
      structure_summary: {
        type: "array",
        items: {
          type: "object",
          properties: {
            tag: { type: "string" },
            description: { type: "string" },
          },
          required: ["tag", "description"],
          additionalProperties: false,
        },
      },
      key_sentences: {
        type: "array",
        items: {
          type: "object",
          properties: {
            english: { type: "string" },
            reason: { type: "string" },
          },
          required: ["english", "reason"],
          additionalProperties: false,
        },
      },
      key_expressions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            en: { type: "string" },
            ko: { type: "string" },
            tip: { type: "string" },
          },
          required: ["en", "ko", "tip"],
          additionalProperties: false,
        },
      },
      discourse_markers: {
        type: "array",
        items: {
          type: "object",
          properties: {
            en: { type: "string" },
            ko: { type: "string" },
            function: { type: "string" },
            usage: { type: "string" },
          },
          required: ["en", "ko", "function", "usage"],
          additionalProperties: false,
        },
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
      similar_questions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            reuse_hint: { type: "string" },
          },
          required: ["question", "reuse_hint"],
          additionalProperties: false,
        },
      },
      expansion_ideas: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: [
      "structure_summary", "key_sentences", "key_expressions",
      "discourse_markers", "reusable_patterns", "similar_questions",
      "expansion_ideas",
    ],
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

    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 라우팅 (인증은 --no-verify-jwt + 게이트웨이 레벨에서 처리)
    switch (path) {
      case "generate":
        return await handleGenerate(supabase, body);
      case "correct":
        return await handleCorrect(supabase, body);
      case "refine":
        return await handleRefine(supabase, body);
      case "evaluate":
        return await handleEvaluate(supabase, body, authHeader);
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
    script.question_type,
    script.target_grade,
    script.question_english,
    script.question_korean,
    script.user_story || "",
    "generate"
  );

  const pass1Start = Date.now();
  const { content: pass1Result, usage: pass1Usage } = await callGPT(system, user, scriptGenerationSchema, 0.8, 4000);
  const pass1Ms = Date.now() - pass1Start;

  // Pass 1 사용량 로깅
  await logApiUsage(supabase, {
    user_id: script.user_id,
    session_type: "script",
    session_id: script_id,
    feature: "script_generate_pass1",
    service: "openai_chat",
    model: "gpt-4.1",
    ef_name: "scripts",
    tokens_in: pass1Usage.prompt_tokens,
    tokens_out: pass1Usage.completion_tokens,
    processing_time_ms: pass1Ms,
  });

  // Pass 2: 학습 리스트 추출
  const { analysisLists, usage: pass2Usage, processingTimeMs: pass2Ms } = await runPass2Analysis(
    supabase,
    pass1Result.full_text.english,
    script.target_grade,
    script.question_type,
    script.question_english
  );

  // Pass 2 사용량 로깅
  if (pass2Usage) {
    await logApiUsage(supabase, {
      user_id: script.user_id,
      session_type: "script",
      session_id: script_id,
      feature: "script_generate_pass2",
      service: "openai_chat",
      model: "gpt-4.1",
      ef_name: "scripts",
      tokens_in: pass2Usage.prompt_tokens,
      tokens_out: pass2Usage.completion_tokens,
      processing_time_ms: pass2Ms,
    });
  }

  // 분석 결과를 pass1Result에 병합
  pass1Result.structure_summary = analysisLists.structure_summary;
  pass1Result.key_sentences = analysisLists.key_sentences;
  pass1Result.key_expressions = analysisLists.key_expressions;
  pass1Result.discourse_markers = analysisLists.discourse_markers;
  pass1Result.reusable_patterns = analysisLists.reusable_patterns;
  pass1Result.similar_questions = analysisLists.similar_questions;
  pass1Result.expansion_ideas = analysisLists.expansion_ideas;

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
      key_expressions: analysisLists.key_expressions.map((e: { en: string }) => e.en),
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
    script.question_type,
    script.target_grade,
    script.question_english,
    script.question_korean,
    script.user_original_answer || "",
    "correct"
  );

  const pass1Start = Date.now();
  const { content: pass1Result, usage: pass1Usage } = await callGPT(system, user, scriptGenerationSchema, 0.8, 4000);
  const pass1Ms = Date.now() - pass1Start;

  // Pass 1 사용량 로깅
  await logApiUsage(supabase, {
    user_id: script.user_id,
    session_type: "script",
    session_id: script_id,
    feature: "script_correct_pass1",
    service: "openai_chat",
    model: "gpt-4.1",
    ef_name: "scripts",
    tokens_in: pass1Usage.prompt_tokens,
    tokens_out: pass1Usage.completion_tokens,
    processing_time_ms: pass1Ms,
  });

  // Pass 2: 학습 리스트 추출
  const { analysisLists, usage: pass2Usage, processingTimeMs: pass2Ms } = await runPass2Analysis(
    supabase,
    pass1Result.full_text.english,
    script.target_grade,
    script.question_type,
    script.question_english
  );

  // Pass 2 사용량 로깅
  if (pass2Usage) {
    await logApiUsage(supabase, {
      user_id: script.user_id,
      session_type: "script",
      session_id: script_id,
      feature: "script_correct_pass2",
      service: "openai_chat",
      model: "gpt-4.1",
      ef_name: "scripts",
      tokens_in: pass2Usage.prompt_tokens,
      tokens_out: pass2Usage.completion_tokens,
      processing_time_ms: pass2Ms,
    });
  }

  pass1Result.structure_summary = analysisLists.structure_summary;
  pass1Result.key_sentences = analysisLists.key_sentences;
  pass1Result.key_expressions = analysisLists.key_expressions;
  pass1Result.discourse_markers = analysisLists.discourse_markers;
  pass1Result.reusable_patterns = analysisLists.reusable_patterns;
  pass1Result.similar_questions = analysisLists.similar_questions;
  pass1Result.expansion_ideas = analysisLists.expansion_ideas;

  const generationTime = Math.round((Date.now() - startTime) / 1000);

  const { error: updateError } = await supabase
    .from("scripts")
    .update({
      english_text: pass1Result.full_text.english,
      korean_translation: pass1Result.full_text.korean,
      paragraphs: pass1Result,
      word_count: pass1Result.word_count,
      total_slots: countSlots(pass1Result),
      key_expressions: analysisLists.key_expressions.map((e: { en: string }) => e.en),
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
    script.question_type,
    script.target_grade,
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

  const pass1Start = Date.now();
  const { content: pass1Result, usage: pass1Usage } = await callGPT(
    system,
    baseUser + refineContext,
    scriptGenerationSchema,
    0.8,
    4000
  );
  const pass1Ms = Date.now() - pass1Start;

  // Pass 1 사용량 로깅
  await logApiUsage(supabase, {
    user_id: script.user_id,
    session_type: "script",
    session_id: script_id,
    feature: "script_refine_pass1",
    service: "openai_chat",
    model: "gpt-4.1",
    ef_name: "scripts",
    tokens_in: pass1Usage.prompt_tokens,
    tokens_out: pass1Usage.completion_tokens,
    processing_time_ms: pass1Ms,
  });

  // Pass 2: 학습 리스트 추출
  const { analysisLists, usage: pass2Usage, processingTimeMs: pass2Ms } = await runPass2Analysis(
    supabase,
    pass1Result.full_text.english,
    script.target_grade,
    script.question_type,
    script.question_english
  );

  // Pass 2 사용량 로깅
  if (pass2Usage) {
    await logApiUsage(supabase, {
      user_id: script.user_id,
      session_type: "script",
      session_id: script_id,
      feature: "script_refine_pass2",
      service: "openai_chat",
      model: "gpt-4.1",
      ef_name: "scripts",
      tokens_in: pass2Usage.prompt_tokens,
      tokens_out: pass2Usage.completion_tokens,
      processing_time_ms: pass2Ms,
    });
  }

  pass1Result.structure_summary = analysisLists.structure_summary;
  pass1Result.key_sentences = analysisLists.key_sentences;
  pass1Result.key_expressions = analysisLists.key_expressions;
  pass1Result.discourse_markers = analysisLists.discourse_markers;
  pass1Result.reusable_patterns = analysisLists.reusable_patterns;
  pass1Result.similar_questions = analysisLists.similar_questions;
  pass1Result.expansion_ideas = analysisLists.expansion_ideas;

  const generationTime = Math.round((Date.now() - startTime) / 1000);

  const { error: updateError } = await supabase
    .from("scripts")
    .update({
      english_text: pass1Result.full_text.english,
      korean_translation: pass1Result.full_text.korean,
      paragraphs: pass1Result,
      word_count: pass1Result.word_count,
      total_slots: countSlots(pass1Result),
      key_expressions: analysisLists.key_expressions.map((e: { en: string }) => e.en),
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
  questionType: string,
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
  const guideId = `${questionType}_${targetLevel}`;
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

## ② STRUCTURE — ${questionType} × ${targetLevel}

${spec.slot_structure}

---

## ③ EXAMPLE

${exampleJson}

---

## ④ INPUT

Question: ${questionEnglish}
Question (Korean): ${questionKorean}
${inputLabel}: ${learnerInput || "(없음 — Level 3 확장 정책 적용)"}
Answer type: ${questionType}
Total slots: ${spec.total_slots}

---

## ⑤ ${mode === "correct" ? "CORRECT" : "GENERATE"}

${generateLabel}
following all constraints above. Return JSON only.`;

  return { system: template.system_prompt, user: userPrompt };
}

// ── Pass 2: 학습 리스트 추출 ──

interface AnalysisLists {
  structure_summary: { tag: string; description: string }[];
  key_sentences: { english: string; reason: string }[];
  key_expressions: { en: string; ko: string; tip: string }[];
  discourse_markers: { en: string; ko: string; function: string; usage: string }[];
  reusable_patterns: { template: string; description_ko: string; example: string }[];
  similar_questions: { question: string; reuse_hint: string }[];
  expansion_ideas: string[];
}

const EMPTY_LISTS: AnalysisLists = {
  structure_summary: [],
  key_sentences: [],
  key_expressions: [],
  discourse_markers: [],
  reusable_patterns: [],
  similar_questions: [],
  expansion_ideas: [],
};

async function runPass2Analysis(
  supabase: any,
  fullEnglishText: string,
  targetLevel: string,
  questionType: string,
  questionEnglish: string
): Promise<{
  analysisLists: AnalysisLists;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null;
  processingTimeMs: number;
}> {
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
      return { analysisLists: EMPTY_LISTS, usage: null, processingTimeMs: 0 };
    }

    const userPrompt = `Target level: ${targetLevel}
Answer type: ${questionType}
Question: ${questionEnglish}

Script:
${fullEnglishText}

Extract 7 categories of learning content from this script following the density guidelines for ${targetLevel} level.`;

    const pass2Start = Date.now();
    const { content: result, usage } = await callGPT(
      template.system_prompt,
      userPrompt,
      analysisListSchema,
      0.3,
      2500
    );
    const pass2Ms = Date.now() - pass2Start;

    return {
      analysisLists: {
        structure_summary: result.structure_summary || [],
        key_sentences: result.key_sentences || [],
        key_expressions: result.key_expressions || [],
        discourse_markers: result.discourse_markers || [],
        reusable_patterns: result.reusable_patterns || [],
        similar_questions: result.similar_questions || [],
        expansion_ideas: result.expansion_ideas || [],
      },
      usage,
      processingTimeMs: pass2Ms,
    };
  } catch (err) {
    console.error("Pass 2 분석 실패, 빈 리스트 반환:", err);
    return { analysisLists: EMPTY_LISTS, usage: null, processingTimeMs: 0 };
  }
}

// ── GPT API 호출 (스키마 파라미터화) ──

async function callGPT(
  systemPrompt: string,
  userPrompt: string,
  jsonSchema: any,
  temperature: number = 0.8,
  maxTokens: number = 4000
): Promise<{ content: any; usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } }> {
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
  const rawContent = result.choices?.[0]?.message?.content;

  if (!rawContent) {
    throw new Error("GPT 응답이 비어있습니다");
  }

  const usage = extractChatUsage(result);

  try {
    return { content: JSON.parse(rawContent), usage };
  } catch (parseErr) {
    console.error("GPT 응답 JSON 파싱 실패:", rawContent.slice(0, 200));
    throw new Error("GPT 응답 JSON 파싱 실패");
  }
}

// ── 쉐도잉 평가 (evaluate) ──

const evaluationSchema = {
  name: "shadowing_evaluation",
  strict: true,
  schema: {
    type: "object",
    properties: {
      pronunciation: { type: "integer" },
      fluency: { type: "integer" },
      grammar: { type: "integer" },
      vocabulary: { type: "integer" },
      content_score: { type: "integer" },
      overall_score: { type: "integer" },
      estimated_level: {
        type: "string",
        enum: ["IL", "IM1", "IM2", "IM3", "IH", "AL"],
      },
      script_utilization: { type: "integer" },
      strengths: {
        type: "array",
        items: { type: "string" },
      },
      weaknesses: {
        type: "array",
        items: { type: "string" },
      },
      suggestions: {
        type: "array",
        items: { type: "string" },
      },
      key_sentences_used: {
        type: "array",
        items: { type: "string" },
      },
      key_vocabulary_used: {
        type: "array",
        items: { type: "string" },
      },
      missing_elements: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: [
      "pronunciation",
      "fluency",
      "grammar",
      "vocabulary",
      "content_score",
      "overall_score",
      "estimated_level",
      "script_utilization",
      "strengths",
      "weaknesses",
      "suggestions",
      "key_sentences_used",
      "key_vocabulary_used",
      "missing_elements",
    ],
    additionalProperties: false,
  },
};

async function handleEvaluate(supabase: any, body: any, authHeader: string) {
  const { session_id, audio_base64, audio_duration } = body;
  if (!session_id) return jsonResponse({ error: "session_id 필수" }, 400);
  if (!audio_base64) return jsonResponse({ error: "audio_base64 필수" }, 400);

  // 세션 조회
  const { data: session, error: sessionError } = await supabase
    .from("shadowing_sessions")
    .select("id, user_id, script_id, question_text, topic")
    .eq("id", session_id)
    .single();

  if (sessionError || !session) {
    return jsonResponse({ error: "세션을 찾을 수 없습니다" }, 404);
  }

  const userId = session.user_id;

  // 크레딧 잔액 확인 (실비용은 logApiUsage에서 자동 차감)
  const { data: balance } = await supabase.rpc("polar_get_balance", { p_user_id: userId });
  if (!balance || balance <= 0) {
    return jsonResponse({ error: "크레딧이 부족합니다. 스토어에서 충전해주세요." }, 402);
  }

  try {
    // Whisper STT
    const audioBuffer = Uint8Array.from(atob(audio_base64), (c) =>
      c.charCodeAt(0)
    );
    const audioBlob = new Blob([audioBuffer], { type: "audio/webm" });

    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");
    formData.append("model", "whisper-1");
    formData.append("language", "en");

    const whisperStart = Date.now();
    const whisperRes = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: formData,
      }
    );
    const whisperMs = Date.now() - whisperStart;

    if (!whisperRes.ok) {
      // 환불 (세션 상태로 이중 환불 방지)
      const { error: refundErr } = await supabase.rpc("refund_script_credit", { p_user_id: userId });
      if (refundErr) console.error("환불 실패:", refundErr);
      return jsonResponse({ error: "음성 인식에 실패했습니다" }, 500);
    }

    const whisperResult = await whisperRes.json();
    const transcript = whisperResult.text || "";
    if (!whisperResult.text) {
      console.warn("Whisper 응답에 text 필드 없음:", JSON.stringify(whisperResult).slice(0, 200));
    }

    // Whisper STT 사용량 로깅
    await logApiUsage(supabase, {
      user_id: userId,
      session_type: "shadowing",
      session_id: session_id,
      feature: "script_evaluate_stt",
      service: "openai_whisper",
      model: "whisper-1",
      ef_name: "scripts",
      audio_duration_sec: audio_duration || estimateAudioDuration(audioBlob.size, "webm"),
      processing_time_ms: whisperMs,
    });

    // 발화 길이 검증 (5단어 미만 → 환불)
    const wordCount = transcript.split(/\s+/).filter(Boolean).length;
    if (wordCount < 5) {
      const { error: refundErr } = await supabase.rpc("refund_script_credit", { p_user_id: userId });
      if (refundErr) console.error("환불 실패:", refundErr);
      return jsonResponse(
        { error: "발화가 너무 짧습니다 (5단어 이상 필요). 크레딧이 환불되었습니다." },
        400
      );
    }

    // 스크립트 정보 조회
    const { data: script } = await supabase
      .from("scripts")
      .select("english_text, key_expressions, question_english, target_grade")
      .eq("id", session.script_id)
      .single();

    // 평가 프롬프트 로드
    const { data: template } = await supabase
      .from("ai_prompt_templates")
      .select("system_prompt")
      .eq("template_id", "evaluate_shadowing")
      .eq("is_active", true)
      .single();

    const systemPrompt =
      template?.system_prompt ||
      `You are an OPIc speaking evaluation expert. Evaluate the student's spoken English based on the training script and question. Score each area 0-100 and estimate OPIc level. Respond in Korean for strengths/weaknesses/suggestions.`;

    const userPrompt = `## 질문
${script?.question_english || session.question_text || "(질문 없음)"}

## 학습 스크립트 (정답 기준)
${script?.english_text || "(스크립트 없음)"}

## 핵심 표현
${(script?.key_expressions || []).join(", ") || "(없음)"}

## 목표 등급
${script?.target_grade || "IM2"}

## 학생 발화 (STT 결과)
${transcript}

## 발화 길이
${wordCount}단어, ${audio_duration || 0}초

위 정보를 기반으로 OPIc 말하기를 평가하세요.`;

    // GPT-4.1 평가
    const evalStart = Date.now();
    const { content: evalResult, usage: evalUsage } = await callGPT(
      systemPrompt,
      userPrompt,
      evaluationSchema,
      0.3,
      2000
    );
    const evalMs = Date.now() - evalStart;

    // GPT 평가 사용량 로깅
    await logApiUsage(supabase, {
      user_id: userId,
      session_type: "shadowing",
      session_id: session_id,
      feature: "script_evaluate_gpt",
      service: "openai_chat",
      model: "gpt-4.1",
      ef_name: "scripts",
      tokens_in: evalUsage.prompt_tokens,
      tokens_out: evalUsage.completion_tokens,
      processing_time_ms: evalMs,
    });

    // 세션 완료 업데이트
    await supabase
      .from("shadowing_sessions")
      .update({
        status: "completed",
        audio_duration: audio_duration || null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", session_id);

    // 평가 결과 저장
    const { data: evalData, error: evalError } = await supabase
      .from("shadowing_evaluations")
      .insert({
        session_id,
        user_id: userId,
        transcript,
        word_count: wordCount,
        pronunciation: evalResult.pronunciation,
        fluency: evalResult.fluency,
        grammar: evalResult.grammar,
        vocabulary: evalResult.vocabulary,
        content_score: evalResult.content_score,
        overall_score: evalResult.overall_score,
        estimated_level: evalResult.estimated_level,
        script_utilization: evalResult.script_utilization,
        strengths: evalResult.strengths,
        weaknesses: evalResult.weaknesses,
        suggestions: evalResult.suggestions,
        script_analysis: {
          key_sentences_used: evalResult.key_sentences_used,
          key_vocabulary_used: evalResult.key_vocabulary_used,
          missing_elements: evalResult.missing_elements,
        },
      })
      .select("*")
      .single();

    if (evalError) {
      console.error("평가 결과 저장 실패:", evalError);
    }

    return jsonResponse(evalData || evalResult);
  } catch (err) {
    // API 오류 → 환불
    const { error: refundErr } = await supabase.rpc("refund_script_credit", { p_user_id: userId });
    if (refundErr) console.error("환불 실패:", refundErr);
    console.error("평가 처리 실패:", err);
    return jsonResponse(
      { error: "평가 처리 중 오류가 발생했습니다. 크레딧이 환불되었습니다." },
      500
    );
  }
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
