// study-dialogue-timestamps
// 추출 WAV + 화자 구분 dialogue_script → Whisper STT(verbose_json) →
// GPT가 세그먼트별 화자 매칭 + 자연스러운 한국어 번역 → dialogue_timestamps 반환.
//
// 레거시 talklish-generate-timestamps 이식. manage가 반환값을 받아 저장(study-audio-extract와 동일 패턴).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { generateRequestId, captureAndRespond } from "../_shared/errorLogger.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const GPT_MODEL = "gpt-4.1";

interface Input {
  audioUrl: string;
  dialogueScript: string;
}

const SYSTEM_PROMPT = `너는 영어 학습용 대화 음성에 자막을 입히는 전문가다. Whisper가 만든 음성 세그먼트(시작/끝 시각 + 영어 텍스트)와 화자 구분 대화 스크립트를 받아, 각 세그먼트에 화자를 매칭하고 자연스러운 한국어 번역을 단다.

# 입력
- Whisper 세그먼트: [{ start, end, text }] — 음성에서 추출, 화자 정보 없음
- 대화 스크립트: 화자별로 구분된 대본 ("화자명: 대사")

# 작업
1. 각 Whisper 세그먼트의 text를 대화 스크립트와 대조해 화자(speaker)를 매칭한다. 화자명은 대화 스크립트의 이름을 그대로 쓴다.
   - 대화 스크립트의 화자 순서를 기준으로 세그먼트를 순서대로 정렬해 매칭한다. 한 대사가 여러 Whisper 세그먼트로 쪼개졌으면 같은 화자를 유지한다.
   - 한 Whisper 세그먼트 안에 두 화자의 말이 섞여 있으면, 내용으로 나눠 각각의 화자로 분리한 세그먼트로 만든다(start/end는 비례 추정).
   - 대화는 보통 2명이 번갈아 말한다. 같은 화자가 부자연스럽게 길게 이어지면 교대 지점을 의심하고 대화 스크립트와 다시 대조한다.
   - 대화 스크립트에 없는 호스트 멘트가 섞여 들어왔다면(추출 구간이 약간 넘친 경우) 그 세그먼트는 가장 가까운 화자로 두되, 대사 흐름을 깨지 않게 한다.
2. 각 세그먼트에 자연스러운 한국어 번역(translation)을 단다.
3. start/end는 Whisper 값 그대로, text도 Whisper 텍스트 그대로 사용한다 (대화 스크립트가 아니라 Whisper가 실제로 들은 텍스트).

# 한국어 번역 원칙 (교과서 직역 금지)
- 실제 한국인이 그 상황에서 쓸 자연스러운 말투로.
- 화자 관계·분위기 반영: 연인/친구는 반말·친근체, 상사·낯선 사람은 존댓말.
- 감정·뉘앙스 살리기 ("아 진짜...", "그러게", "헐", "괜찮아?" 등 적절히). 주어는 한국어답게 자주 생략.

# 응답 형식
순수 JSON만 (마크다운/코드펜스 없이):
{ "segments": [{ "speaker": string, "text": string, "translation": string, "start": number, "end": number }] }`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const requestId = req.headers.get("x-request-id") || generateRequestId();
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";

    // 관리자 또는 활성 패널 멤버
    const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "인증이 필요합니다" }, 401);
    if (user.app_metadata?.role !== "admin") {
      const { data: member } = await supabase
        .from("study_panel_members")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      if (!member) return json({ error: "스터디 패널 멤버만 가능합니다" }, 403);
    }

    const input = (await req.json()) as Input;
    if (!input.audioUrl) return json({ error: "audioUrl이 필요합니다" }, 400);
    if (!input.dialogueScript) return json({ error: "dialogueScript가 필요합니다" }, 400);

    // 1. 추출 오디오 다운로드 → Whisper STT (verbose_json — 세그먼트별 타임스탬프)
    const audioResp = await fetch(input.audioUrl);
    if (!audioResp.ok) return json({ error: "오디오 다운로드 실패" }, 502);
    const audioBlob = await audioResp.blob();

    const fd = new FormData();
    fd.append("file", audioBlob, "audio.wav");
    fd.append("model", "whisper-1");
    fd.append("response_format", "verbose_json");
    fd.append("language", "en");

    const t0 = Date.now();
    const wResp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: fd,
    });
    if (!wResp.ok) {
      const e = await wResp.text();
      console.error("[study-dialogue-timestamps] Whisper 실패:", e.slice(0, 300));
      return json({ error: "음성 인식(Whisper) 실패", detail: e.slice(0, 300) }, 502);
    }
    const whisper = await wResp.json();
    const segments = (whisper.segments ?? [])
      .map((s: Record<string, unknown>) => ({
        start: typeof s.start === "number" ? s.start : 0,
        end: typeof s.end === "number" ? s.end : 0,
        text: typeof s.text === "string" ? s.text.trim() : "",
      }))
      .filter((s: { text: string }) => s.text.length > 0);
    if (segments.length === 0)
      return json({ error: "음성에서 세그먼트를 추출하지 못했습니다" }, 502);

    // 2. GPT — 화자 매칭 + 한국어 번역
    const gResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GPT_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content:
              `대화 스크립트:\n${input.dialogueScript}\n\n` +
              `Whisper 세그먼트:\n${JSON.stringify(segments)}\n\n` +
              `각 세그먼트에 화자 매칭 + 한국어 번역을 달아 JSON으로 응답해줘.`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    });
    const elapsedMs = Date.now() - t0;
    if (!gResp.ok) {
      const e = await gResp.text();
      console.error("[study-dialogue-timestamps] GPT 실패:", e.slice(0, 300));
      return json({ error: "화자 매칭/번역(GPT) 실패", detail: e.slice(0, 300) }, 502);
    }
    const gData = await gResp.json();
    const content = gData.choices?.[0]?.message?.content;
    if (!content) return json({ error: "GPT 빈 응답" }, 502);

    let parsed: { segments?: unknown[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      return json({ error: "GPT JSON 파싱 실패", raw: content.slice(0, 300) }, 502);
    }

    const dialogueTimestamps = (parsed.segments ?? [])
      .map((raw) => {
        const s = (raw ?? {}) as Record<string, unknown>;
        return {
          speaker: typeof s.speaker === "string" ? s.speaker : "",
          text: typeof s.text === "string" ? s.text : "",
          translation: typeof s.translation === "string" ? s.translation : "",
          start: typeof s.start === "number" ? s.start : 0,
          end: typeof s.end === "number" ? s.end : 0,
        };
      })
      .filter((s) => s.text.length > 0);

    return json({
      success: true,
      dialogue_timestamps: dialogueTimestamps,
      meta: { whisper_segments: segments.length, elapsed_ms: elapsedMs },
    });
  } catch (error) {
    console.error("[study-dialogue-timestamps] Error:", error);
    return captureAndRespond(error, requestId, "study-dialogue-timestamps", corsHeaders);
  }
});
