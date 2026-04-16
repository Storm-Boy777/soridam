// mock-test-process — Stage A Edge Function
// Whisper STT + Azure 발음 평가 (~70초)
// SA submitAnswer에서 fire-and-forget으로 호출됨
// 완료 후 mock-test-eval로 fire-and-forget 체인

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  checkAudioSkip,
  checkTranscriptSkip,
} from "../_shared/skip-detector.ts";
import { assessPronunciation } from "../_shared/azure-pronunciation.ts";
import {
  buildRescueMessage,
  getCheckboxType,
  TYPE_CHECKLISTS,
} from "../_shared/question-type-map.ts";
import { logApiUsage, estimateAudioDuration } from "../_shared/api-usage-logger.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const AZURE_SPEECH_KEY = Deno.env.get("AZURE_SPEECH_KEY")!;
const AZURE_SPEECH_REGION = Deno.env.get("AZURE_SPEECH_REGION") || "koreacentral";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// 필러 단어 패턴 (13개, 소리담 이관)
const FILLER_PATTERNS = [
  /\bum+\b/gi,
  /\buh+\b/gi,
  /\bhmm+\b/gi,
  /\bah+\b/gi,
  /\ber+\b/gi,
  /\blike\b/gi,
  /\byou know\b/gi,
  /\bi mean\b/gi,
  /\bwell\b/gi,
  /\bso\b/gi,
  /\bactually\b/gi,
  /\bbasically\b/gi,
  /\bliterally\b/gi,
  /\bsort of\b/gi,
  /\bkind of\b/gi,
];

// 필러 단어 개수 카운트
function countFillerWords(transcript: string): number {
  let count = 0;
  for (const pattern of FILLER_PATTERNS) {
    const matches = transcript.match(pattern);
    if (matches) count += matches.length;
  }
  return count;
}

// WPM 계산
function calculateWPM(wordCount: number, audioDurationSec: number): number {
  if (audioDurationSec <= 0) return 0;
  return Math.round((wordCount / audioDurationSec) * 60);
}

// Long Pause 감지 (WPM 기반 휴리스틱)
function detectLongPauses(wpm: number, audioDurationSec: number): number {
  // WPM이 매우 낮으면 긴 침묵이 있었다고 추정
  if (audioDurationSec < 10) return 0;
  if (wpm < 50) return 3;
  if (wpm < 80) return 2;
  if (wpm < 100) return 1;
  return 0;
}

// Whisper STT 호출
async function whisperSTT(audioBuffer: ArrayBuffer): Promise<string> {
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([audioBuffer], { type: "audio/wav" }),
    "audio.wav",
  );
  formData.append("model", "whisper-1");
  formData.append("language", "en");

  const resp = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: formData,
    },
  );

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Whisper STT 실패 (${resp.status}): ${err}`);
  }

  const json = await resp.json();
  return (json.text || "").trim();
}

// eval_status 업데이트 헬퍼
async function updateAnswerStatus(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  questionNumber: number,
  status: string,
  extra: Record<string, unknown> = {},
) {
  await supabase
    .from("mock_test_answers")
    .update({ eval_status: status, ...extra })
    .eq("session_id", sessionId)
    .eq("question_number", questionNumber);
}

// fire-and-forget → Stage B-1 (mock-test-eval: 체크박스 판정)
function fireAndForgetEval(sessionId: string, questionNumber: number) {
  fetch(`${SUPABASE_URL}/functions/v1/mock-test-eval`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ session_id: sessionId, question_number: questionNumber }),
  }).catch((err) => {
    console.error("fire-and-forget eval 호출 실패:", err?.message || err);
  });
}

// 재시도 로직 (최대 3회)
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  label: string = "",
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries - 1) {
        // exponential backoff: 1초 → 2초 → 4초
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw new Error(`${label} ${maxRetries}회 재시도 후 실패: ${lastError?.message}`);
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // 인증: --no-verify-jwt 배포 — SA에서 service_role_key로 호출
  const startTime = Date.now();

  // catch 블록에서도 접근 가능하도록 body를 먼저 파싱
  let parsedBody: Record<string, unknown> | null = null;

  try {
    parsedBody = await req.json();
    const {
      session_id,
      question_number,
      question_id,
      audio_url,
      audio_duration,
    } = parsedBody as {
      session_id: string;
      question_number: number;
      question_id?: string;
      audio_url: string;
      audio_duration?: number;
    };

    // 필수 파라미터 검증
    if (!session_id || !question_number || !audio_url) {
      return new Response(
        JSON.stringify({ error: "필수 파라미터 누락" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // eval_status → processing
    await updateAnswerStatus(supabase, session_id, question_number, "processing");

    // ── 1차 스킵: 오디오 길이 ──
    const audioSkip = checkAudioSkip(audio_duration || 0);
    if (audioSkip.shouldSkip) {
      // 전체 생략: 평가 불필요
      await updateAnswerStatus(supabase, session_id, question_number, "skipped", {
        skipped: true,
      });

      // skipped 평가 레코드 삽입 (evaluations에도 기록)
      const { data: session } = await supabase
        .from("mock_test_sessions")
        .select("user_id")
        .eq("session_id", session_id)
        .single();

      if (session) {
        await supabase.from("mock_test_evaluations").insert({
          session_id,
          user_id: session.user_id,
          question_number,
          question_id: question_id || "",
          question_type: "",
          model: "skipped",
          skipped: true,
        });
      }

      return new Response(
        JSON.stringify({ status: "skipped", reason: audioSkip.reason }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 세션 user_id 조회 (로깅용) ──
    const { data: sessionData } = await supabase
      .from("mock_test_sessions")
      .select("user_id")
      .eq("session_id", session_id)
      .single();
    const userId = sessionData?.user_id || "";

    // ── 오디오 다운로드 ──
    const audioResp = await fetch(audio_url);
    if (!audioResp.ok) {
      throw new Error(`오디오 다운로드 실패 (${audioResp.status})`);
    }
    const audioBuffer = await audioResp.arrayBuffer();
    const audioFileSize = audioBuffer.byteLength;

    // ── Whisper STT ──
    const whisperStart = Date.now();
    const transcript = await withRetry(
      () => whisperSTT(audioBuffer),
      3,
      "Whisper STT",
    );
    const whisperTimeMs = Date.now() - whisperStart;

    // Whisper 사용량 로깅 (실패해도 메인 로직 중단 안 함)
    logApiUsage(supabase, {
      user_id: userId,
      session_type: "mock_exam",
      session_id: session_id,
      feature: "모의고사 음성인식",
      service: "openai_whisper",
      model: "whisper-1",
      ef_name: "mock-test-process",
      audio_duration_sec: estimateAudioDuration(audioFileSize, "wav"),
      processing_time_ms: whisperTimeMs,
    }).catch((err) => console.error("[process] Whisper 로깅 실패:", err?.message));

    // 단어 수 / 필러 / WPM 계산
    const words = transcript.split(/\s+/).filter((w: string) => w.length > 0);
    const wordCount = words.length;
    const fillerWordCount = countFillerWords(transcript);
    const wpm = calculateWPM(wordCount, audio_duration || 0);
    const longPauseCount = detectLongPauses(wpm, audio_duration || 0);

    // ── 2~3차 스킵: 트랜스크립트 기반 ──
    const transcriptSkip = checkTranscriptSkip(transcript);

    // ── question_type 조회 ──
    let questionType = "";
    if (question_id) {
      const { data: q } = await supabase
        .from("questions")
        .select("question_type_eng")
        .eq("id", question_id)
        .single();
      questionType = q?.question_type_eng || "";
    }

    if (transcriptSkip.shouldSkip) {
      // 트랜스크립트 기반 스킵 → Azure/GPT 모두 생략
      await updateAnswerStatus(supabase, session_id, question_number, "skipped", {
        transcript,
        word_count: wordCount,
        wpm,
        filler_word_count: fillerWordCount,
        long_pause_count: longPauseCount,
        skipped: true,
      });

      // skipped 평가 레코드 (구제 메시지 포함)
      const { data: session } = await supabase
        .from("mock_test_sessions")
        .select("user_id")
        .eq("session_id", session_id)
        .single();

      if (session) {
        const rescue = buildRescueMessage(questionType);
        const checkboxType = questionType ? getCheckboxType(questionType) : null;

        await supabase.from("mock_test_evaluations").insert({
          session_id,
          user_id: session.user_id,
          question_number,
          question_id: question_id || "",
          question_type: questionType,
          checkbox_type: checkboxType,
          transcript,
          wpm,
          audio_duration: audio_duration || 0,
          filler_count: fillerWordCount,
          long_pause_count: longPauseCount,
          model: "skipped",
          prompt_version: "1.0",
          skipped: true,
          task_fulfillment: {
            status: "failed",
            checklist: { required: [], advanced: [] },
            completion_rate: 0,
            required_pass: 0,
            required_total: TYPE_CHECKLISTS[questionType]?.required.length || 0,
            advanced_pass: 0,
            advanced_total: TYPE_CHECKLISTS[questionType]?.advanced.length || 0,
            reason: `무응답 (${transcriptSkip.reason})`,
          },
          feedback_branch: "failed",
          coaching_feedback: rescue.coaching_feedback,
          priority_prescription: rescue.priority_prescription,
        });
      }

      return new Response(
        JSON.stringify({
          status: "skipped",
          reason: transcriptSkip.reason,
          transcript,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Azure 발음 평가 ──
    let pronunciationAssessment = null;
    const azureStart = Date.now();
    try {
      pronunciationAssessment = await withRetry(
        () =>
          assessPronunciation(
            audioBuffer,
            transcript,
            AZURE_SPEECH_KEY,
            AZURE_SPEECH_REGION,
          ),
        3,
        "Azure 발음 평가",
      );
      const azureTimeMs = Date.now() - azureStart;

      // Azure 사용량 로깅 (실패해도 메인 로직 중단 안 함)
      logApiUsage(supabase, {
        user_id: userId,
        session_type: "mock_exam",
        session_id: session_id,
        feature: "모의고사 발음평가",
        service: "azure_speech",
        model: "azure-pronunciation",
        ef_name: "mock-test-process",
        audio_duration_sec: audio_duration || estimateAudioDuration(audioFileSize, "wav"),
        processing_time_ms: azureTimeMs,
      }).catch((err) => console.error("[process] Azure 로깅 실패:", err?.message));
    } catch (azureErr) {
      // Azure 실패해도 GPT 평가는 진행 (발음 데이터 없이)
      console.error("Azure 발음 평가 실패 (계속 진행):", azureErr);
    }

    // ── answers 업데이트: STT 완료 ──
    await updateAnswerStatus(supabase, session_id, question_number, "stt_completed", {
      transcript,
      word_count: wordCount,
      wpm,
      filler_word_count: fillerWordCount,
      long_pause_count: longPauseCount,
      pronunciation_assessment: pronunciationAssessment,
    });

    // ── fire-and-forget → Stage B-1 (eval: 체크박스 판정) ──
    fireAndForgetEval(session_id, question_number);

    const processingTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        status: "stt_completed",
        transcript,
        word_count: wordCount,
        wpm,
        filler_word_count: fillerWordCount,
        processing_time_ms: processingTime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("mock-test-process 에러:", errorMessage);

    // 실패 시 상태 업데이트 (parsedBody는 try 바깥에서 선언되어 접근 가능)
    try {
      const sid = parsedBody?.session_id as string | undefined;
      const qnum = parsedBody?.question_number as number | undefined;
      if (sid && qnum) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // retry_count 조회
        const { data: answer } = await supabase
          .from("mock_test_answers")
          .select("eval_retry_count")
          .eq("session_id", sid)
          .eq("question_number", qnum)
          .single();

        const retryCount = (answer?.eval_retry_count || 0) + 1;

        if (retryCount >= 3) {
          // 3회 실패: failed 상태 + 에러 기록
          await updateAnswerStatus(
            supabase,
            sid,
            qnum,
            "failed",
            {
              eval_retry_count: retryCount,
              eval_error: errorMessage,
            },
          );
        } else {
          // 재시도 가능: pending 복귀 + retry_count 증가
          await updateAnswerStatus(
            supabase,
            sid,
            qnum,
            "pending",
            {
              eval_retry_count: retryCount,
              eval_error: errorMessage,
            },
          );
        }
      }
    } catch {
      // 상태 업데이트 실패는 무시 (completeSession 안전망에서 처리)
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
