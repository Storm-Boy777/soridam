// study-podcast-generate
// 영문 스크립트 + (선택) 메타 정보를 받아 GPT-4.1-mini로 팟캐스트 학습 컨텐츠 자동 생성
//
// 출력 필드:
//   - description (한국어 1~2줄 요약)
//   - warmup_question (영문, 토픽 도입용 1개)
//   - key_expressions [5~7개] { english, korean, example }
//   - comprehension_questions [3~5개] (영문, 내용 확인)
//   - discussion_questions [5개] (영문, 자유 의견)
//   - difficulty (beginner | intermediate | advanced) — 입력 없을 때만
//   - topic (한 단어/짧은 구) — 입력 없을 때만

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { generateRequestId, captureAndRespond } from "../_shared/errorLogger.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const MODEL = "gpt-4.1-mini";

interface GenInput {
  scriptText: string;
  youtubeTitle?: string;     // YouTube oEmbed에서 받은 제목 (보조 컨텍스트)
  channelName?: string;      // 채널명
  currentDifficulty?: "beginner" | "intermediate" | "advanced";
  currentTopic?: string;
}

interface GenOutput {
  description: string;
  warmup_question: string;
  key_expressions: { english: string; korean: string; example: string }[];
  comprehension_questions: string[];
  discussion_questions: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  topic: string;
}

const SYSTEM_PROMPT = `너는 영어 학습 컨텐츠 큐레이터다. 영어 팟캐스트/유튜브 스크립트를 받아 한국 학습자가 스터디 모임(6명, 1시간, 큰 모니터에 띄우고 함께 진행)에서 사용할 학습 자료를 만든다.

원칙:
- 영문 질문은 짧고 자연스러운 회화체. 너무 학술적이지 않게.
- key_expressions는 "실제 회화에서 쓸 만한 콜로케이션/관용 표현/구동사 위주"로. 단순 단어보다 패턴/표현 우선.
- 한국어 번역은 자연스럽게. 직역 X.
- example은 본문에서 인용하지 말고, 학습자가 일상에서 쓸 만한 새 문장으로 작성.
- comprehension_questions는 "Yes/No"가 아닌, 한 문장 이상의 답이 나오는 형태.
- discussion_questions는 자기 경험/의견을 묻는 개방형.
- description은 한국어 1~2줄(50~120자) — 이 에피소드가 뭘 다루는지.

응답 형식: 반드시 JSON 객체. 외부 마크다운/코드펜스 없이 순수 JSON.

스키마:
{
  "description": string,
  "warmup_question": string,         // 영문 1개
  "key_expressions": [               // 5~7개
    { "english": string, "korean": string, "example": string }
  ],
  "comprehension_questions": [string, ...],  // 3~5개, 영문
  "discussion_questions": [string, ...],     // 5개, 영문
  "difficulty": "beginner" | "intermediate" | "advanced",
  "topic": string                    // 짧은 한국어 구 (예: "습관 형성", "여행", "건강")
}`;

function buildUserPrompt(input: GenInput): string {
  const lines: string[] = [];
  if (input.youtubeTitle) lines.push(`# 영상 제목\n${input.youtubeTitle}`);
  if (input.channelName) lines.push(`# 채널\n${input.channelName}`);
  if (input.currentDifficulty)
    lines.push(`# 사전 지정 난이도\n${input.currentDifficulty} (이대로 사용)`);
  if (input.currentTopic) lines.push(`# 사전 지정 토픽\n${input.currentTopic} (이대로 사용)`);
  lines.push(`# 영문 스크립트\n${input.scriptText}`);
  lines.push(`\n위 자료를 분석해 스키마대로 JSON만 응답해줘.`);
  return lines.join("\n\n");
}

function validateOutput(data: unknown): GenOutput {
  if (!data || typeof data !== "object") throw new Error("응답이 객체가 아님");
  const d = data as Record<string, unknown>;
  if (typeof d.description !== "string") throw new Error("description 누락");
  if (typeof d.warmup_question !== "string") throw new Error("warmup_question 누락");
  if (!Array.isArray(d.key_expressions) || d.key_expressions.length === 0)
    throw new Error("key_expressions 누락");
  if (!Array.isArray(d.comprehension_questions))
    throw new Error("comprehension_questions 누락");
  if (!Array.isArray(d.discussion_questions))
    throw new Error("discussion_questions 누락");

  // key_expressions 검증
  const exprs = d.key_expressions as unknown[];
  for (const e of exprs) {
    if (
      !e ||
      typeof e !== "object" ||
      typeof (e as Record<string, unknown>).english !== "string" ||
      typeof (e as Record<string, unknown>).korean !== "string" ||
      typeof (e as Record<string, unknown>).example !== "string"
    ) {
      throw new Error("key_expressions 항목 형식 오류");
    }
  }

  const difficulty =
    (typeof d.difficulty === "string" &&
      ["beginner", "intermediate", "advanced"].includes(d.difficulty))
      ? (d.difficulty as "beginner" | "intermediate" | "advanced")
      : "intermediate";

  return {
    description: d.description,
    warmup_question: d.warmup_question,
    key_expressions: exprs as { english: string; korean: string; example: string }[],
    comprehension_questions: d.comprehension_questions as string[],
    discussion_questions: d.discussion_questions as string[],
    difficulty,
    topic: typeof d.topic === "string" ? d.topic : "",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = req.headers.get("x-request-id") || generateRequestId();

  try {
    // 인증 — admin만
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: req.headers.get("Authorization")! } },
      }
    );
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "인증이 필요합니다" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (user.app_metadata?.role !== "admin") {
      return new Response(JSON.stringify({ error: "관리자 권한이 필요합니다" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 입력 검증
    const input = (await req.json()) as GenInput;
    if (!input.scriptText || input.scriptText.trim().length < 50) {
      return new Response(
        JSON.stringify({ error: "스크립트가 너무 짧습니다 (50자 이상 권장)" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    // 8K 토큰 제한 — 스크립트 길이 cap
    const trimmedScript = input.scriptText.slice(0, 16000); // ~4K 토큰

    // GPT 호출
    const userPrompt = buildUserPrompt({ ...input, scriptText: trimmedScript });

    const t0 = Date.now();
    const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.6,
        max_tokens: 2000,
      }),
    });
    const elapsedMs = Date.now() - t0;

    if (!openaiResp.ok) {
      const errText = await openaiResp.text();
      console.error("[study-podcast-generate] GPT 에러:", errText);
      return new Response(
        JSON.stringify({ error: "AI 생성 실패", detail: errText.slice(0, 500) }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const openaiData = await openaiResp.json();
    const content = openaiData.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(JSON.stringify({ error: "빈 응답" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return new Response(JSON.stringify({ error: "JSON 파싱 실패", raw: content.slice(0, 500) }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: GenOutput;
    try {
      result = validateOutput(parsed);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return new Response(
        JSON.stringify({ error: `응답 검증 실패: ${msg}`, raw: parsed }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 사전 지정 난이도/토픽이 있으면 강제 반영
    if (input.currentDifficulty) result.difficulty = input.currentDifficulty;
    if (input.currentTopic) result.topic = input.currentTopic;

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        meta: {
          model: MODEL,
          elapsed_ms: elapsedMs,
          tokens: openaiData.usage,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[study-podcast-generate] Error:", error);
    return captureAndRespond(error, requestId, "study-podcast-generate", corsHeaders);
  }
});
