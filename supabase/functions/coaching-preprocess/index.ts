/**
 * coaching-preprocess — Whisper raw transcript 전처리 EF
 *
 * 역할:
 *   1. 의미 단위 쉼표·마침표 복원
 *   2. 명백한 STT 오타 정정 (영어 X / 의미 X / 맥락상 다른 단어)
 *   3. 학생 실제 영어 오류는 그대로 보존 (코칭 대상)
 *   4. 변경 로그 (stt_fix_log) 생성
 *
 * 호출: coaching-evaluate EF가 내부 호출 (또는 단독)
 * 입력: { raw_transcript: string, context?: { question_type, topic } }
 * 출력: { cleaned_transcript, stt_fix_log, preserved_errors }
 *
 * 프롬프트: ai_prompt_templates(template_id='coaching_preprocess')
 * 모델: gpt-4.1-mini (저렴, 빠름)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logApiUsage, extractChatUsage } from "../_shared/api-usage-logger.ts";

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

interface SttFix {
  original: string;
  fixed: string;
  reason: string;
  confidence: "high" | "medium" | "low";
}

interface PreprocessOutput {
  cleaned_transcript: string;
  stt_fix_log: SttFix[];
  preserved_errors: string[];
}

interface PreprocessRequestBody {
  raw_transcript: string;
  context?: {
    question_type?: string;
    topic?: string;
    user_id?: string; // 비용 로깅용 (코칭 EF에서 전달)
    session_id?: string;
  };
}

// ============================================================
// 메인 핸들러
// ============================================================

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startedAt = Date.now();

  try {
    const body = (await req.json()) as PreprocessRequestBody;
    if (!body.raw_transcript || body.raw_transcript.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "raw_transcript required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. 프롬프트 로드 (DB)
    const { data: prompt, error: pErr } = await supabase
      .from("ai_prompt_templates")
      .select("system_prompt, model, temperature, max_tokens, response_format")
      .eq("template_id", "coaching_preprocess")
      .eq("is_active", true)
      .single();

    if (pErr || !prompt) {
      console.error("[coaching-preprocess] 프롬프트 로드 실패:", pErr);
      return new Response(
        JSON.stringify({ error: "프롬프트를 찾을 수 없습니다" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. User 프롬프트 조립
    const userPrompt = [
      "## 입력 (Whisper raw transcript)",
      "",
      "```",
      body.raw_transcript.trim(),
      "```",
      "",
      body.context?.question_type
        ? `## 컨텍스트\n- 질문 유형: ${body.context.question_type}\n- 토픽: ${body.context.topic ?? "—"}`
        : "",
      "",
      "위 transcript를 시스템 프롬프트 규칙에 따라 정제하고, JSON으로 응답하세요.",
    ]
      .filter(Boolean)
      .join("\n");

    // 3. GPT 호출
    const gptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: prompt.model ?? "gpt-4.1-mini",
        messages: [
          { role: "system", content: prompt.system_prompt },
          { role: "user", content: userPrompt },
        ],
        temperature: prompt.temperature ?? 0.2,
        max_tokens: prompt.max_tokens ?? 4000,
        response_format: { type: "json_object" },
      }),
    });

    if (!gptResponse.ok) {
      const errText = await gptResponse.text();
      console.error("[coaching-preprocess] GPT 호출 실패:", errText);
      return new Response(
        JSON.stringify({ error: "전처리 GPT 호출 실패", detail: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const gptJson = await gptResponse.json();
    const content = gptJson.choices?.[0]?.message?.content ?? "";

    let parsed: PreprocessOutput;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error("[coaching-preprocess] JSON 파싱 실패:", e, "raw:", content);
      // 파싱 실패 시 원본 그대로 + 빈 로그
      parsed = {
        cleaned_transcript: body.raw_transcript,
        stt_fix_log: [],
        preserved_errors: [],
      };
    }

    // 안전 가드
    if (!parsed.cleaned_transcript) parsed.cleaned_transcript = body.raw_transcript;
    if (!Array.isArray(parsed.stt_fix_log)) parsed.stt_fix_log = [];
    if (!Array.isArray(parsed.preserved_errors)) parsed.preserved_errors = [];

    // 4. 비용 로그 (user_id 있을 때만)
    if (body.context?.user_id) {
      const usage = extractChatUsage(gptJson);
      try {
        await logApiUsage(supabase, {
          user_id: body.context.user_id,
          session_type: "coaching",
          session_id: body.context.session_id,
          feature: "preprocess",
          service: "openai_chat",
          model: prompt.model ?? "gpt-4.1-mini",
          ef_name: "coaching-preprocess",
          tokens_in: usage.prompt_tokens,
          tokens_out: usage.completion_tokens,
          text_length: body.raw_transcript.length,
          processing_time_ms: Date.now() - startedAt,
        });
      } catch (e) {
        console.error("[coaching-preprocess] 비용 로그 실패:", e);
      }
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[coaching-preprocess] 예외:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "전처리 실패" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
