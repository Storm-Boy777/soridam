// 스크립트 패키지 생성 Edge Function
// Phase 1: Gemini TTS → PCM → WAV → Storage 업로드
// Phase 2: Whisper STT word-level → 타임스탬프 매칭 → JSON → Storage

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logApiUsage, extractWhisperDuration } from "../_shared/api-usage-logger.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
// 서비스 계정 JSON(base64) — Cloud TTS(Gemini-TTS GA)는 API 키가 아닌 OAuth로 호출
const GOOGLE_TTS_SA_KEY_B64 = Deno.env.get("GOOGLE_TTS_SA_KEY_B64")!;
// ElevenLabs (남성 프리미엄 음성)
const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

// 음성 제공자별 설정
const TTS_MODEL = "gemini-2.5-pro-tts";            // 여성 (Cloud TTS GA, 서비스계정 OAuth)
const ELEVEN_VOICE_MALE = "TX3LPaxmHKxFdv7VOQHJ";  // 남성 (ElevenLabs)
const ELEVEN_MODEL = "eleven_v3";

// tts_voice id → 제공자/음성 해석 (레거시 'Zephyr'/'Aoede' 하위호환)
function resolveVoice(ttsVoice: string): {
  provider: "gemini" | "elevenlabs";
  geminiVoice?: string;
  elevenVoiceId?: string;
  elevenModelId?: string;
} {
  if (ttsVoice === "eleven_male") {
    return {
      provider: "elevenlabs",
      elevenVoiceId: ELEVEN_VOICE_MALE,
      elevenModelId: ELEVEN_MODEL,
    };
  }
  // 'Aoede'(여성) + 레거시 'Zephyr'(구 Gemini 남성) → Gemini Cloud TTS
  return { provider: "gemini", geminiVoice: ttsVoice === "Zephyr" ? "Zephyr" : "Aoede" };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
      case "generate-package":
        return await handleGeneratePackage(supabase, body);
      case "generate-shadowing":
        return await handleGenerateShadowing(supabase, body);
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

// (PCM→WAV 변환·리샘플 함수는 Cloud TTS GA 전환으로 제거 — LINEAR16 응답이 완성 WAV를 직접 반환)

// ── Google 서비스 계정 OAuth (Cloud TTS 호출용) ──

let _gToken: { token: string; exp: number } | null = null;

function _b64urlStr(s: string): string {
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function _b64urlBytes(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function _pemToPkcs8(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

function getServiceAccount(): {
  client_email: string;
  private_key: string;
  token_uri?: string;
  project_id: string;
} {
  if (!GOOGLE_TTS_SA_KEY_B64) {
    throw new Error("GOOGLE_TTS_SA_KEY_B64가 설정되지 않았습니다");
  }
  return JSON.parse(atob(GOOGLE_TTS_SA_KEY_B64));
}

// 서비스 계정 키로 OAuth access token 발급 (RS256 JWT → 토큰 교환, 1시간 캐시)
async function getGoogleAccessToken(): Promise<{ token: string; projectId: string }> {
  const sa = getServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  if (_gToken && _gToken.exp > now + 60) {
    return { token: _gToken.token, projectId: sa.project_id };
  }
  const tokenUri = sa.token_uri || "https://oauth2.googleapis.com/token";
  const header = _b64urlStr(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = _b64urlStr(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      aud: tokenUri,
      iat: now,
      exp: now + 3600,
    }),
  );
  const signingInput = `${header}.${claims}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    _pemToPkcs8(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );
  const jwt = `${signingInput}.${_b64urlBytes(new Uint8Array(sig))}`;
  const resp = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const j = await resp.json();
  if (!j.access_token) {
    throw new Error(`Google 토큰 발급 실패: ${JSON.stringify(j).slice(0, 200)}`);
  }
  _gToken = { token: j.access_token, exp: now + (j.expires_in || 3600) };
  return { token: j.access_token, projectId: sa.project_id };
}

// ── Phase 1: Gemini TTS 음성 생성 ──

async function handleGeneratePackage(supabase: any, body: any) {
  const { script_id, tts_voice = "Aoede", user_id } = body;
  if (!script_id) return jsonResponse({ error: "script_id 필수" }, 400);
  if (!user_id) return jsonResponse({ error: "user_id 필수" }, 400);

  // 스크립트 조회
  const { data: script, error: scriptError } = await supabase
    .from("scripts")
    .select("id, english_text, status, user_id")
    .eq("id", script_id)
    .single();

  if (scriptError || !script) {
    return jsonResponse({ error: "스크립트를 찾을 수 없습니다" }, 404);
  }

  if (script.user_id !== user_id) {
    return jsonResponse({ error: "권한이 없습니다" }, 403);
  }

  if (script.status !== "confirmed") {
    return jsonResponse(
      { error: "확정된 스크립트만 패키지 생성 가능합니다" },
      400
    );
  }

  if (!script.english_text || script.english_text.length < 10) {
    return jsonResponse({ error: "스크립트 텍스트가 너무 짧습니다" }, 400);
  }

  // 기존 패키지 삭제 (재생성 시)
  const { data: existingPkgs } = await supabase
    .from("script_packages")
    .select("id, wav_file_path, json_file_path")
    .eq("script_id", script_id);

  if (existingPkgs?.length) {
    const filePaths = existingPkgs
      .flatMap((p: any) => [p.wav_file_path, p.json_file_path])
      .filter(Boolean);
    if (filePaths.length > 0) {
      await supabase.storage.from("script-packages").remove(filePaths);
    }
    await supabase
      .from("script_packages")
      .delete()
      .eq("script_id", script_id);
  }

  // 패키지 레코드 생성 (processing 상태)
  const { data: pkg, error: pkgError } = await supabase
    .from("script_packages")
    .insert({
      user_id,
      script_id,
      tts_voice: tts_voice,
      status: "processing",
      progress: 10,
    })
    .select("id")
    .single();

  if (pkgError || !pkg) {
    console.error("패키지 레코드 생성 실패:", pkgError);
    return jsonResponse({ error: "패키지 생성에 실패했습니다" }, 500);
  }

  const packageId = pkg.id;

  try {
    await updatePackageProgress(supabase, packageId, 20);

    const voiceCfg = resolveVoice(tts_voice);
    console.log(`🎵 TTS 호출: provider=${voiceCfg.provider}, voice=${tts_voice}`);

    let audioBuffer: ArrayBuffer;
    let audioExt: string;
    let audioContentType: string;

    if (voiceCfg.provider === "elevenlabs") {
      // ── 남성 (ElevenLabs 프리미엄) → MP3 ──
      if (!ELEVENLABS_API_KEY) {
        throw new Error("ELEVENLABS_API_KEY가 설정되지 않았습니다");
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 180초
      const elResp = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceCfg.elevenVoiceId}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: script.english_text,
            model_id: voiceCfg.elevenModelId,
            voice_settings: {
              stability: 0.4,
              similarity_boost: 0.75,
              use_speaker_boost: true,
            },
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (!elResp.ok) {
        const errText = await elResp.text();
        console.error("ElevenLabs 에러:", elResp.status, errText.slice(0, 500));
        await failPackage(supabase, packageId, `TTS 음성 생성 실패 (${elResp.status})`);
        return jsonResponse({ error: "음성 생성에 실패했습니다" }, 500);
      }

      audioBuffer = await elResp.arrayBuffer();
      audioExt = "mp3";
      audioContentType = "audio/mpeg";

      await updatePackageProgress(supabase, packageId, 40);
      console.log("✅ MP3 수신 완료:", { size: audioBuffer.byteLength });

      // 사용량 로깅 (ElevenLabs는 문자당 과금)
      try {
        await logApiUsage(supabase, {
          user_id,
          session_type: "script",
          session_id: script_id,
          feature: "TTS 음성 생성",
          service: "elevenlabs",
          model: voiceCfg.elevenModelId!,
          ef_name: "scripts-package",
          text_length: script.english_text.length,
        });
      } catch (logErr) {
        console.error("[scripts-package] ElevenLabs 사용량 로깅 실패:", logErr);
      }
    } else {
      // ── 여성 (Cloud TTS Gemini-TTS GA) → WAV ──
      const { token: gToken, projectId: gProject } = await getGoogleAccessToken();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 180초
      const ttsResponse = await fetch(
        "https://texttospeech.googleapis.com/v1/text:synthesize",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${gToken}`,
            "x-goog-user-project": gProject,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input: {
              prompt: "Read aloud in a friendly, natural way, as if talking to a friend.",
              text: script.english_text,
            },
            voice: {
              languageCode: "en-US",
              name: voiceCfg.geminiVoice,
              model_name: TTS_MODEL,
            },
            audioConfig: { audioEncoding: "LINEAR16", sampleRateHertz: 24000 },
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (!ttsResponse.ok) {
        const errText = await ttsResponse.text();
        console.error("Cloud TTS 에러:", ttsResponse.status, errText.slice(0, 500));
        await failPackage(supabase, packageId, `TTS 음성 생성 실패 (${ttsResponse.status})`);
        return jsonResponse({ error: "음성 생성에 실패했습니다" }, 500);
      }

      const ttsData = await ttsResponse.json();
      const base64Audio = ttsData.audioContent; // LINEAR16 → 완성 WAV(RIFF)

      if (!base64Audio) {
        console.error("Cloud TTS 응답에 audioContent 없음");
        await failPackage(supabase, packageId, "TTS 응답에 오디오 없음");
        return jsonResponse({ error: "음성 데이터를 받지 못했습니다" }, 500);
      }

      await updatePackageProgress(supabase, packageId, 40);

      const binaryString = atob(base64Audio);
      const wavBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        wavBytes[i] = binaryString.charCodeAt(i);
      }
      audioBuffer = wavBytes.buffer;
      audioExt = "wav";
      audioContentType = "audio/wav";
      console.log("✅ WAV 수신 완료:", { size: audioBuffer.byteLength });

      // 사용량 로깅 (오디오 길이로 산출: 오디오 초당 25토큰)
      try {
        const SR = 24000; // 요청한 sampleRateHertz, 16-bit mono
        const audioBytes = Math.max(audioBuffer.byteLength - 44, 0);
        const durationSec = audioBytes / (SR * 2);
        await logApiUsage(supabase, {
          user_id,
          session_type: "script",
          session_id: script_id,
          feature: "TTS 음성 생성",
          service: "gemini_tts",
          model: TTS_MODEL,
          ef_name: "scripts-package",
          tokens_in: Math.ceil(script.english_text.length / 4),
          tokens_out: Math.round(durationSec * 25),
          text_length: script.english_text.length,
          audio_duration_sec: Math.round(durationSec),
        });
      } catch (logErr) {
        console.error("[scripts-package] Cloud TTS 사용량 로깅 실패:", logErr);
      }
    }

    // Storage 업로드 (provider에 따라 wav/mp3)
    const audioPath = `audio/${packageId}.${audioExt}`;

    const { error: uploadError } = await supabase.storage
      .from("script-packages")
      .upload(audioPath, audioBuffer, {
        contentType: audioContentType,
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage 업로드 실패:", uploadError);
      await failPackage(supabase, packageId, "음성 파일 업로드 실패");
      return jsonResponse({ error: "음성 파일 저장에 실패했습니다" }, 500);
    }

    // 패키지 업데이트 (Phase 1 완료)
    await supabase
      .from("script_packages")
      .update({
        wav_file_path: audioPath,
        wav_file_size: audioBuffer.byteLength,
        progress: 60,
      })
      .eq("id", packageId);

    return jsonResponse({
      success: true,
      package_id: packageId,
      wav_file_path: audioPath,
      file_size: audioBuffer.byteLength,
    });
  } catch (err) {
    console.error("Phase 1 실패:", err);
    await failPackage(
      supabase,
      packageId,
      err instanceof Error ? err.message : "음성 생성 중 오류"
    );
    return jsonResponse(
      { error: "패키지 생성 중 오류가 발생했습니다" },
      500
    );
  }
}

// ── Phase 2: 타임스탬프 생성 (Whisper STT → 문장 매칭) ──

async function handleGenerateShadowing(supabase: any, body: any) {
  const { package_id, user_id } = body;
  if (!package_id) return jsonResponse({ error: "package_id 필수" }, 400);
  if (!user_id) return jsonResponse({ error: "user_id 필수" }, 400);

  // 패키지 + 스크립트 조회
  const { data: pkg, error: pkgError } = await supabase
    .from("script_packages")
    .select("id, script_id, wav_file_path, user_id")
    .eq("id", package_id)
    .single();

  if (pkgError || !pkg) {
    return jsonResponse({ error: "패키지를 찾을 수 없습니다" }, 404);
  }

  if (pkg.user_id !== user_id) {
    return jsonResponse({ error: "권한이 없습니다" }, 403);
  }

  if (!pkg.wav_file_path) {
    return jsonResponse({ error: "음성 파일이 없습니다" }, 400);
  }

  const { data: script, error: scriptError } = await supabase
    .from("scripts")
    .select("paragraphs, english_text")
    .eq("id", pkg.script_id)
    .single();

  if (scriptError || !script) {
    return jsonResponse({ error: "스크립트를 찾을 수 없습니다" }, 404);
  }

  try {
    await updatePackageProgress(supabase, package_id, 65);

    // Storage에서 오디오 다운로드
    const { data: audioData, error: downloadError } = await supabase.storage
      .from("script-packages")
      .download(pkg.wav_file_path);

    if (downloadError || !audioData) {
      console.error("오디오 다운로드 실패:", downloadError);
      await partialPackage(supabase, package_id, "오디오 다운로드 실패");
      return jsonResponse({ error: "오디오 파일을 읽을 수 없습니다" }, 500);
    }

    await updatePackageProgress(supabase, package_id, 70);

    // Whisper STT (word-level timestamps)
    // Phase 1 provider에 따라 .wav(Gemini) 또는 .mp3(ElevenLabs) — Whisper는 파일명 확장자로 포맷 판별
    const audioExt = (pkg.wav_file_path.split(".").pop() || "wav").toLowerCase();
    const audioMime = audioExt === "mp3" ? "audio/mpeg" : "audio/wav";
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([await audioData.arrayBuffer()], { type: audioMime }),
      `audio.${audioExt}`
    );
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");
    formData.append("timestamp_granularities[]", "word");
    formData.append("language", "en");

    const whisperResponse = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData,
      }
    );

    if (!whisperResponse.ok) {
      const errText = await whisperResponse.text();
      console.error("Whisper 에러:", whisperResponse.status, errText);
      await partialPackage(supabase, package_id, "음성 인식 실패");
      return jsonResponse({ error: "음성 인식에 실패했습니다" }, 500);
    }

    const whisperResult = await whisperResponse.json();

    // Whisper STT 사용량 로깅 (실패해도 메인 로직 계속)
    try {
      const whisperDuration = extractWhisperDuration(whisperResult);
      await logApiUsage(supabase, {
        user_id,
        session_type: "script",
        session_id: pkg.script_id,
        feature: "TTS 타임스탬프",
        service: "openai_whisper",
        model: "whisper-1",
        ef_name: "scripts-package",
        audio_duration_sec: whisperDuration,
      });
    } catch (logErr) {
      console.error("[scripts-package] Whisper 사용량 로깅 실패:", logErr);
    }

    const whisperWords: WhisperWord[] = whisperResult.words || [];

    if (whisperWords.length === 0) {
      await partialPackage(supabase, package_id, "음성 인식 결과 없음");
      return jsonResponse(
        { error: "음성에서 단어를 인식하지 못했습니다" },
        500
      );
    }

    await updatePackageProgress(supabase, package_id, 80);

    // 문장 추출 (paragraphs에서)
    const sentences = extractSentences(script.paragraphs);

    // 문장-단어 타임스탬프 매칭
    const timestamps = matchSentencesToWords(sentences, whisperWords);

    // 갭/오버랩 보정
    fillTimestampGaps(timestamps);

    await updatePackageProgress(supabase, package_id, 90);

    // JSON Storage 업로드
    const jsonPath = `json/${package_id}.json`;
    const jsonContent = JSON.stringify(timestamps, null, 2);
    const jsonBlob = new Blob([jsonContent], { type: "application/json" });

    const { error: jsonUploadError } = await supabase.storage
      .from("script-packages")
      .upload(jsonPath, jsonBlob, {
        contentType: "application/json",
        upsert: true,
      });

    if (jsonUploadError) {
      console.error("JSON 업로드 실패:", jsonUploadError);
      await partialPackage(supabase, package_id, "타임스탬프 저장 실패");
      return jsonResponse({ error: "타임스탬프 저장에 실패했습니다" }, 500);
    }

    // 패키지 완료 업데이트
    await supabase
      .from("script_packages")
      .update({
        json_file_path: jsonPath,
        timestamp_data: timestamps,
        status: "completed",
        progress: 100,
        completed_at: new Date().toISOString(),
      })
      .eq("id", package_id);

    return jsonResponse({
      success: true,
      sentence_count: timestamps.length,
    });
  } catch (err) {
    console.error("Phase 2 실패:", err);
    await partialPackage(
      supabase,
      package_id,
      err instanceof Error ? err.message : "타임스탬프 생성 중 오류"
    );
    return jsonResponse(
      { error: "쉐도잉 데이터 생성에 실패했습니다" },
      500
    );
  }
}

// ── 문장 추출 (paragraphs → flat sentences) ──

interface SentenceData {
  index: number;
  english: string;
  korean: string;
}

function extractSentences(paragraphs: any): SentenceData[] {
  if (!paragraphs?.paragraphs) return [];

  const sentences: SentenceData[] = [];
  let globalIndex = 1;
  for (const para of paragraphs.paragraphs) {
    for (const slot of para.slots || []) {
      for (const sent of slot.sentences || []) {
        sentences.push({
          index: globalIndex++,
          english: sent.english,
          korean: sent.korean,
        });
      }
    }
  }
  return sentences;
}

// ── Whisper 타입 ──

interface WhisperWord {
  word: string;
  start: number;
  end: number;
}

// ── 타임스탬프 결과 타입 ──

interface TimestampResult {
  index: number;
  english: string;
  korean: string;
  start: number;
  end: number;
  duration: number;
}

// ── 문장-단어 매칭 (Levenshtein Distance + 슬라이딩 윈도우) ──

function matchSentencesToWords(
  sentences: SentenceData[],
  words: WhisperWord[]
): TimestampResult[] {
  const results: TimestampResult[] = [];
  let searchStart = 0;

  for (const sentence of sentences) {
    const sentenceWords = normalizeText(sentence.english)
      .split(/\s+/)
      .filter(Boolean);
    if (sentenceWords.length === 0) continue;

    const windowSize = sentenceWords.length;
    let bestScore = -1;
    let bestStart = searchStart;
    let bestEnd = searchStart + windowSize;

    // 슬라이딩 윈도우로 최적 매칭 위치 탐색
    const searchEnd = Math.min(words.length, searchStart + windowSize * 3);

    for (
      let i = searchStart;
      i <= searchEnd - windowSize && i < words.length;
      i++
    ) {
      const windowWords = words
        .slice(i, i + windowSize)
        .map((w) => normalizeText(w.word));

      const score = calculateSimilarity(sentenceWords, windowWords);

      if (score > bestScore) {
        bestScore = score;
        bestStart = i;
        bestEnd = Math.min(i + windowSize, words.length);
      }
    }

    // 유사도 임계값 (0.3 이상이면 매칭으로 인정)
    if (bestScore >= 0.3 && bestStart < words.length) {
      const startTime = words[bestStart].start;
      const endTime = words[Math.min(bestEnd - 1, words.length - 1)].end;

      results.push({
        index: sentence.index,
        english: sentence.english,
        korean: sentence.korean,
        start: Math.round(startTime * 100) / 100,
        end: Math.round(endTime * 100) / 100,
        duration: Math.round((endTime - startTime) * 100) / 100,
      });

      searchStart = bestEnd;
    } else {
      // 매칭 실패 시 이전 결과 기반으로 추정
      const prevEnd =
        results.length > 0 ? results[results.length - 1].end : 0;
      const estimatedDuration = sentenceWords.length * 0.4;
      results.push({
        index: sentence.index,
        english: sentence.english,
        korean: sentence.korean,
        start: Math.round(prevEnd * 100) / 100,
        end: Math.round((prevEnd + estimatedDuration) * 100) / 100,
        duration: Math.round(estimatedDuration * 100) / 100,
      });
    }
  }

  return results;
}

// ── 텍스트 정규화 ──

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ── 유사도 계산 (단어 시퀀스) ──

function calculateSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;

  let matches = 0;
  const maxLen = Math.max(a.length, b.length);

  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) {
      matches++;
    } else if (
      levenshteinDistance(a[i], b[i]) <=
      Math.max(1, Math.floor(a[i].length / 3))
    ) {
      matches += 0.7;
    }
  }

  return matches / maxLen;
}

// ── Levenshtein Distance ──

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

// ── 갭/오버랩 보정 ──

function fillTimestampGaps(timestamps: TimestampResult[]): void {
  for (let i = 1; i < timestamps.length; i++) {
    const prev = timestamps[i - 1];
    const curr = timestamps[i];
    const gap = curr.start - prev.end;

    if (gap > 0.5) {
      const mid = (prev.end + curr.start) / 2;
      prev.end = Math.round(mid * 100) / 100;
      curr.start = Math.round(mid * 100) / 100;
    } else if (gap < 0) {
      const mid = (prev.end + curr.start) / 2;
      prev.end = Math.round(mid * 100) / 100;
      curr.start = Math.round(mid * 100) / 100;
    }

    prev.duration = Math.round((prev.end - prev.start) * 100) / 100;
    curr.duration = Math.round((curr.end - curr.start) * 100) / 100;
  }
}

// ── 헬퍼 함수 ──

async function updatePackageProgress(
  supabase: any,
  packageId: string,
  progress: number
) {
  await supabase
    .from("script_packages")
    .update({ progress })
    .eq("id", packageId);
}

async function failPackage(
  supabase: any,
  packageId: string,
  errorMessage: string
) {
  await supabase
    .from("script_packages")
    .update({
      status: "failed",
      error_message: errorMessage,
    })
    .eq("id", packageId);
}

async function partialPackage(
  supabase: any,
  packageId: string,
  errorMessage: string
) {
  await supabase
    .from("script_packages")
    .update({
      status: "partial",
      progress: 60,
      error_message: errorMessage,
    })
    .eq("id", packageId);
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
