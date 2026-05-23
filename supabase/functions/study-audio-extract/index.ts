// study-audio-extract
// 월요일 스터디 — YouTube 대화 구간 오디오 추출 파이프라인의 서버 측 진입점.
//
// 흐름: 관리자 요청 → Apify Actor(yt-dlp + residential proxy) 동기 실행
//       → OUTPUT(WAV) 수신 → Supabase Storage 업로드 → public audio_url 반환
//
// Apify 토큰은 Supabase Secret(APIFY_API_TOKEN)으로만 보관(클라이언트 노출 X).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { generateRequestId, captureAndRespond } from "../_shared/errorLogger.ts";

const APIFY_API_TOKEN = Deno.env.get("APIFY_API_TOKEN")!;
const APIFY_ACTOR_ID = "ahsCLy1KMi3HH3Hiw"; // actor ID (불변 — username 형식 의존 제거)
const STORAGE_BUCKET = "study-podcast-audio";

interface ExtractInput {
  youtubeUrl: string;
  startSec: number;
  endSec: number;
}

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

    // 관리자 인증
    const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "인증이 필요합니다" }, 401);
    // 관리자 또는 활성 패널 멤버 (멤버가 /talklish에서 직접 자료 생성 — 관리자 결석 대비)
    if (user.app_metadata?.role !== "admin") {
      const { data: member } = await supabase
        .from("study_panel_members")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      if (!member)
        return json({ error: "스터디 패널 멤버만 자료를 만들 수 있습니다" }, 403);
    }

    // 입력 검증
    const input = (await req.json()) as ExtractInput;
    if (!input.youtubeUrl || !/(youtube\.com|youtu\.be)/.test(input.youtubeUrl)) {
      return json({ error: "유효한 YouTube URL이 필요합니다" }, 400);
    }
    const startSec = Math.floor(Number(input.startSec));
    const endSec = Math.ceil(Number(input.endSec));
    if (!Number.isFinite(startSec) || !Number.isFinite(endSec) || endSec <= startSec) {
      return json({ error: "시작/종료 시간이 올바르지 않습니다" }, 400);
    }

    // 1. Apify Actor 동기 실행 → OUTPUT(WAV) 바로 수신
    //    run-sync: run 완료 후 Key-Value Store의 OUTPUT 레코드를
    //    저장된 content-type(audio/wav) 그대로 반환. 봇차단 등 실패 시 non-2xx.
    const t0 = Date.now();
    const apifyResp = await fetch(
      `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/run-sync?token=${APIFY_API_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeUrl: input.youtubeUrl, startSec, endSec }),
      }
    );
    const elapsedMs = Date.now() - t0;

    if (!apifyResp.ok) {
      const detail = await apifyResp.text();
      console.error("[study-audio-extract] Apify 실패:", apifyResp.status, detail.slice(0, 500));
      return json(
        { error: "오디오 추출 실패 (Apify Actor)", status: apifyResp.status, detail: detail.slice(0, 500) },
        502
      );
    }

    const contentType = apifyResp.headers.get("content-type") || "";
    if (!contentType.includes("audio")) {
      // OUTPUT이 오디오가 아니면 Actor가 비정상 종료한 것
      const body = await apifyResp.text();
      console.error("[study-audio-extract] 예상치 못한 OUTPUT:", contentType, body.slice(0, 500));
      return json({ error: "추출 결과가 오디오가 아닙니다", detail: body.slice(0, 300) }, 502);
    }

    const wavBuf = new Uint8Array(await apifyResp.arrayBuffer());
    if (wavBuf.byteLength === 0) return json({ error: "빈 오디오가 반환되었습니다" }, 502);

    // 2. Supabase Storage 업로드 (service role — RLS 우회)
    const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const path = `${crypto.randomUUID()}.wav`;
    const { error: upErr } = await admin.storage
      .from(STORAGE_BUCKET)
      .upload(path, wavBuf, { contentType: "audio/wav", upsert: false });
    if (upErr) {
      console.error("[study-audio-extract] Storage 업로드 실패:", upErr);
      return json({ error: "Storage 업로드 실패", detail: upErr.message }, 500);
    }

    const { data: pub } = admin.storage.from(STORAGE_BUCKET).getPublicUrl(path);

    return json({
      success: true,
      audio_url: pub.publicUrl,
      storage_path: path,
      bytes: wavBuf.byteLength,
      meta: { elapsed_ms: elapsedMs, start_sec: startSec, end_sec: endSec },
    });
  } catch (error) {
    console.error("[study-audio-extract] Error:", error);
    return captureAndRespond(error, requestId, "study-audio-extract", corsHeaders);
  }
});
