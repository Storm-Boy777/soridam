/**
 * talklish-coach — Talklish 수요일(OPIc) 답변 AI 코칭 EF
 *
 * 역할: 멤버 답변 1건에 대해 Whisper STT + GPT-4.1 코칭을 한 번에 생성.
 *
 * 입력 (JSON body):
 *   - audio_path: string         — Storage path ({user_id}/{ts}.webm)
 *   - speaker_name: string       — 답변자 표시명 (예: "Jay")
 *   - question_english: string
 *   - question_korean?: string
 *   - question_type?: string     — OPIc question_type_eng (예: "description")
 *   - category?: string          — 카테고리 (일반/롤플레이/어드밴스)
 *   - topic?: string             — 토픽 (예: "음악")
 *
 * 처리:
 *   1. Storage 다운로드 (audio_path)
 *   2. Whisper STT (영어)
 *   3. GPT-4.1 코칭 (JSON 출력)
 *   4. api_usage_logs 2건 (Whisper + GPT) — session_type='talklish'
 *   5. 결과 즉시 반환 (동기 호출)
 *
 * 출력:
 *   { success: true, data: { transcript, coaching: {...}, processing_time_ms } }
 *
 * 비용: 답변 1건 ≈ $0.005 ~ $0.015 (Whisper $0.006/분 + GPT-4.1 입출력)
 * 무료 정책: 사용자 크레딧 차감 X — 시스템 부담 (api_usage_logs 기록만)
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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
    // ★ 모바일 브라우저(삼성/모바일 Chrome)는 Allow-Methods 명시가 없으면 preflight 거부 → 본 POST 안 보냄
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

// ── Promise.race timeout 헬퍼 (AbortSignal.timeout이 Deno fetch body stream에 안 먹는 케이스 백업) ──
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout (${ms / 1000}s)`)), ms),
    ),
  ]);
}

interface RequestBody {
  audio_path: string;
  speaker_name: string;
  question_english: string;
  question_korean?: string;
  question_type?: string;
  category?: string;
  topic?: string;
}

interface CoachingOutput {
  summary: string;
  good_points: Array<{ quote: string; note: string }>;
  improve_points: Array<{ quote: string; issue: string; suggestion: string }>;
  upgrade_points: Array<{ tip: string; example?: string }>;
  next_speaker_tip: string;
}

// ── Whisper STT (30초 timeout) ──

async function whisperSTT(audioBuffer: ArrayBuffer): Promise<{ transcript: string; duration_sec: number }> {
  const fetchPromise = (async () => {
    const formData = new FormData();
    formData.append("file", new Blob([audioBuffer], { type: "audio/webm" }), "audio.webm");
    formData.append("model", "whisper-1");
    formData.append("language", "en");

    const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: formData,
      signal: AbortSignal.timeout(30_000),
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Whisper ${resp.status}: ${err.slice(0, 200)}`);
    }

    const json = await resp.json();
    const transcript = (json.text || "").trim();
    // Whisper API는 duration을 반환하지 않으므로 audio size로 대략 추정 (불완전)
    // webm opus 평균 ~16KB/s
    const duration_sec = Math.max(1, Math.round(audioBuffer.byteLength / 16000));
    return { transcript, duration_sec };
  })();
  // AbortSignal.timeout이 Deno fetch body stream에 안 먹는 케이스 백업 (35s)
  return await withTimeout(fetchPromise, 35_000, "Whisper STT");
}

// ── audio 다운로드 (디버깅 로그 + timeout 20s) ──

async function downloadAudio(supabase: SupabaseClient, audioPath: string): Promise<ArrayBuffer> {
  const t0 = Date.now();
  console.log("[talklish-coach] download start", { path_prefix: audioPath.slice(0, 60) });
  const downloadPromise = supabase.storage
    .from("talklish-recordings")
    .download(audioPath)
    .then(({ data, error }) => {
      if (error || !data) throw new Error(`Storage 다운로드 실패: ${error?.message}`);
      return data.arrayBuffer();
    });
  const buffer = await withTimeout(downloadPromise, 20_000, "Storage download");
  console.log("[talklish-coach] download done", { size: buffer.byteLength, ms: Date.now() - t0 });
  return buffer;
}

// ── GPT-4.1 코칭 ──

const SYSTEM_PROMPT = `당신은 OPIc 시험 그룹 스터디에서 멤버들에게 짧고 실용적인 코칭 노트를 작성하는 AI 코치입니다.

[원칙]
- 한국어로 작성, 단 영어 인용(quote)과 영어 대안(suggestion)은 영어 원문 그대로.
- 점수/등급(IL, IM, AL 등) 노출 금지 — 멤버 모두가 함께 보는 화면이라 비교 부담 X.
- 답변 텍스트(transcript)를 정확히 인용해서 짚기 — 환각 금지.
- 보완점(improve_points)은 무엇이 왜 어색/틀렸는지 이유까지 짧게 짚고, 바로 쓸 영어 대안을 준다.
- 답변을 한 단계 끌어올릴 구체 제안(upgrade_points) 2~3개를 반드시 준다: 구체적인 예시·디테일 추가, 표현 격상, 반복 표현 다양화 등. 각 제안에는 바로 따라 말할 영어 예문(example)을 곁들인다.
- 잘한 점 1~2개, 보완점 1~2개로 핵심만 (너무 많이 짚으면 부담).

[출력 형식 — JSON 객체]
{
  "summary": "한 줄 요약 (한국어, 25자 내)",
  "good_points": [
    { "quote": "<영어 답변에서 그대로 인용>", "note": "<왜 좋은지 한국어 한 줄>" }
  ],
  "improve_points": [
    { "quote": "<영어 답변에서 그대로 인용>", "issue": "<무엇이 왜 어색/틀렸는지 한국어>", "suggestion": "<영어 대안 그대로>" }
  ],
  "upgrade_points": [
    { "tip": "<답변을 더 풍부하게 만들 제안 (한국어)>", "example": "<바로 따라 말할 영어 예문>" }
  ],
  "next_speaker_tip": "<다음 발화자가 활용할 만한 한 마디 (한국어, 영어 표현 섞어도 OK)>"
}`;

async function generateCoaching(
  speakerName: string,
  transcript: string,
  question: { english: string; korean?: string; type?: string; category?: string; topic?: string }
): Promise<{ coaching: CoachingOutput; tokens_in: number; tokens_out: number }> {
  const fetchPromise = (async () => {
    const userPrompt = `[질문]
- 영어: ${question.english}
${question.korean ? `- 한국어: ${question.korean}\n` : ""}${question.type ? `- 유형: ${question.type}\n` : ""}${question.category ? `- 카테고리: ${question.category}\n` : ""}${question.topic ? `- 토픽: ${question.topic}\n` : ""}
[답변자] ${speakerName}

[답변 (영어 transcript)]
${transcript || "(빈 답변)"}

위 답변에 대한 코칭 노트를 JSON 형식으로 생성해주세요.`;

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 1500,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`GPT ${resp.status}: ${err.slice(0, 200)}`);
    }

    const json = await resp.json();
    const content = json.choices?.[0]?.message?.content || "{}";
    const usage = json.usage || { prompt_tokens: 0, completion_tokens: 0 };

    let coaching: CoachingOutput;
    try {
      coaching = JSON.parse(content) as CoachingOutput;
    } catch {
      throw new Error("GPT 응답 JSON 파싱 실패");
    }

    return {
      coaching,
      tokens_in: usage.prompt_tokens || 0,
      tokens_out: usage.completion_tokens || 0,
    };
  })();
  // AbortSignal.timeout이 Deno fetch body stream에 안 먹는 케이스 백업 (65s)
  return await withTimeout(fetchPromise, 65_000, "GPT coaching");
}

// ── 시스템 비용 로그 ──

async function logUsage(
  supabase: SupabaseClient,
  params: {
    user_id: string | null;
    feature: string;
    service: "openai_chat" | "openai_whisper";
    model: string;
    tokens_in?: number;
    tokens_out?: number;
    audio_duration_sec?: number;
    cost_usd: number;
    processing_time_ms: number;
  }
) {
  const { error } = await supabase.from("api_usage_logs").insert({
    user_id: params.user_id,
    session_type: "talklish",
    session_id: null,
    feature: params.feature,
    service: params.service,
    model: params.model,
    ef_name: "talklish-coach",
    tokens_in: params.tokens_in ?? null,
    tokens_out: params.tokens_out ?? null,
    audio_duration_sec: params.audio_duration_sec ?? null,
    cost_usd: params.cost_usd,
    processing_time_ms: params.processing_time_ms,
  });
  if (error) console.error("[talklish-coach] usage log 실패:", error.message);
}

// ── 비용 계산 ──

function calcWhisperCost(duration_sec: number): number {
  // Whisper-1: $0.006 / 분
  return (duration_sec / 60) * 0.006;
}

function calcGpt41Cost(tokens_in: number, tokens_out: number): number {
  // GPT-4.1 (2026 기준): input $2/1M, output $8/1M
  return (tokens_in / 1_000_000) * 2 + (tokens_out / 1_000_000) * 8;
}

// ── 메인 핸들러 ──

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  // 디버깅: 모든 진입 요청 헤더 로깅 (PC vs 모바일 차이 진단용)
  console.log("[talklish-coach] request received", {
    method: req.method,
    origin: req.headers.get("origin"),
    contentType: req.headers.get("content-type"),
    contentLength: req.headers.get("content-length"),
    userAgent: req.headers.get("user-agent")?.slice(0, 100),
    hasAuth: !!req.headers.get("authorization"),
  });

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "POST only" }),
      { status: 405, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  const t0 = Date.now();

  try {
    // body parse — 모바일 chunked transfer가 끊겨도 10초 안에 throw
    const body = (await withTimeout(req.json(), 10_000, "body parse")) as RequestBody;
    console.log("[talklish-coach] body parsed", {
      audio_path_prefix: body.audio_path?.slice(0, 60),
      speaker: body.speaker_name,
      q_type: body.question_type,
      q_en_len: body.question_english?.length,
      q_kr_len: body.question_korean?.length,
      category: body.category,
      topic: body.topic,
      ms: Date.now() - t0,
    });

    if (!body.audio_path || !body.speaker_name || !body.question_english) {
      console.warn("[talklish-coach] 필수 필드 누락", { body: Object.keys(body || {}) });
      return new Response(
        JSON.stringify({ success: false, error: "audio_path, speaker_name, question_english 필수" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // 요청 사용자 추출 (Bearer)
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    let userId: string | null = null;
    if (token) {
      const authT0 = Date.now();
      const { data } = await withTimeout(supabase.auth.getUser(token), 10_000, "auth.getUser");
      userId = data.user?.id ?? null;
      console.log("[talklish-coach] auth done", { userId, ms: Date.now() - authT0 });
    } else {
      console.warn("[talklish-coach] no auth token");
    }

    // 1. Audio 다운로드 (downloadAudio 내부 timeout 20s)
    const audioBuffer = await downloadAudio(supabase, body.audio_path);

    // 2. Whisper STT (withTimeout 35s)
    const whisperT0 = Date.now();
    console.log("[talklish-coach] whisper start");
    const { transcript, duration_sec } = await whisperSTT(audioBuffer);
    const whisperMs = Date.now() - whisperT0;
    console.log("[talklish-coach] whisper done", { duration_sec, transcript_len: transcript.length, ms: whisperMs });
    const whisperCost = calcWhisperCost(duration_sec);

    // Whisper 로그
    await logUsage(supabase, {
      user_id: userId,
      feature: "stt",
      service: "openai_whisper",
      model: "whisper-1",
      audio_duration_sec: duration_sec,
      cost_usd: whisperCost,
      processing_time_ms: whisperMs,
    });

    // 3. GPT-4.1 코칭 (withTimeout 65s)
    const gptT0 = Date.now();
    console.log("[talklish-coach] gpt start");
    const { coaching, tokens_in, tokens_out } = await generateCoaching(
      body.speaker_name,
      transcript,
      {
        english: body.question_english,
        korean: body.question_korean,
        type: body.question_type,
        category: body.category,
        topic: body.topic,
      }
    );
    const gptMs = Date.now() - gptT0;
    console.log("[talklish-coach] gpt done", { tokens_in, tokens_out, ms: gptMs });
    const gptCost = calcGpt41Cost(tokens_in, tokens_out);

    // GPT 로그
    await logUsage(supabase, {
      user_id: userId,
      feature: "coaching",
      service: "openai_chat",
      model: "gpt-4.1",
      tokens_in,
      tokens_out,
      cost_usd: gptCost,
      processing_time_ms: gptMs,
    });

    const totalMs = Date.now() - t0;
    console.log("[talklish-coach] DONE", { totalMs, totalCost: whisperCost + gptCost });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          transcript,
          coaching,
          processing_time_ms: totalMs,
          duration_sec,
          cost_usd: whisperCost + gptCost,
        },
      }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack?.slice(0, 500) : "";
    console.error("[talklish-coach] FAIL", { msg, stack, ms: Date.now() - t0 });
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
