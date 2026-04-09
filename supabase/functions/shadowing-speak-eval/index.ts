/**
 * shadowing-speak-eval — 쉐도잉 실전 말하기 평가 Edge Function
 *
 * 단일 EF에서 3단계를 순차 실행:
 *   1. Whisper STT + WPM/필러 계산
 *   2. Azure 발음 평가
 *   3. GPT consult (소견/방향/약점 생성)
 *
 * 입력: { evaluation_id, audio_url, question_id, user_id }
 * 출력: shadowing_evaluations 테이블 업데이트 (eval_status: completed)
 *
 * 프롬프트: evaluation_prompts (consult/consult_user/consult_schema)
 * 기준표: evaluation_criteria (목표등급 × 질문타입)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assessPronunciation } from "../_shared/azure-pronunciation.ts";
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

// ── 유틸리티 ──

const FILLER_PATTERNS = [
  /\bum+\b/gi, /\buh+\b/gi, /\bhmm+\b/gi, /\bah+\b/gi, /\ber+\b/gi,
  /\blike\b/gi, /\byou know\b/gi, /\bi mean\b/gi, /\bwell\b/gi, /\bso\b/gi,
  /\bactually\b/gi, /\bbasically\b/gi, /\bliterally\b/gi, /\bsort of\b/gi, /\bkind of\b/gi,
];

function countFillerWords(transcript: string): number {
  let count = 0;
  for (const pattern of FILLER_PATTERNS) {
    const matches = transcript.match(pattern);
    if (matches) count += matches.length;
  }
  return count;
}

function calculateWPM(wordCount: number, audioDurationSec: number): number {
  if (audioDurationSec <= 0) return 0;
  return Math.round((wordCount / audioDurationSec) * 60);
}

function sanitizeTranscript(text: string): string {
  return text
    .replace(/---USER---|---SYSTEM---|---ASSISTANT---/gi, "[FILTERED]")
    .replace(/ignore\s+(all\s+)?previous\s+instructions/gi, "[FILTERED]")
    .replace(/you\s+are\s+now\s+a/gi, "[FILTERED]")
    .replace(/forget\s+(all\s+)?your\s+(previous\s+)?instructions/gi, "[FILTERED]")
    .slice(0, 10_000);
}

function substituteVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

/** 3축 무응답 감지 */
function detectSkipped(transcript: string | null, durationSec: number | null, wordCount: number | null): boolean {
  if (!durationSec || durationSec < 5) return true;
  if (!transcript || transcript.trim().length === 0) return true;
  const meaningfulWords = (transcript || "")
    .replace(/\b(um|uh|hmm|ah|oh|like|you know|I mean|well|so|okay)\b/gi, "")
    .trim().split(/\s+/).filter((w) => w.length > 1);
  if (meaningfulWords.length < 3) return true;
  return false;
}

/** 재시도 래퍼 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, label = ""): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        console.error(`[${label}] 재시도 ${attempt + 1}/${maxRetries}, ${delay}ms 후...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw new Error(`${label} ${maxRetries}회 시도 후 실패: ${lastError?.message}`);
}

// ── Whisper STT ──

async function whisperSTT(audioBuffer: ArrayBuffer): Promise<string> {
  const formData = new FormData();
  formData.append("file", new Blob([audioBuffer], { type: "audio/wav" }), "audio.wav");
  formData.append("model", "whisper-1");
  formData.append("language", "en");

  const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: formData,
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Whisper STT 실패 (${resp.status}): ${err}`);
  }
  return ((await resp.json()).text || "").trim();
}

// ── GPT Consult ──

interface ConsultResult {
  fulfillment: string;
  fulfillment_summary: string;
  task_checklist: Array<{ item: string; pass: boolean; evidence: string }>;
  observation: string;
  directions: string[];
  weak_points: Array<{ code: string; severity: string; reason: string; evidence: string }>;
}

async function callGptConsult(
  systemPrompt: string,
  userPrompt: string,
  responseFormat: Record<string, unknown>,
  model: string,
): Promise<{ result: ConsultResult; tokensUsed: number; promptTokens: number; completionTokens: number }> {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 4000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: responseFormat,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Chat Completions API 실패 (${resp.status}): ${errText}`);
  }

  const json = await resp.json();
  const content = json.choices?.[0]?.message?.content || "{}";
  return {
    result: JSON.parse(content) as ConsultResult,
    tokensUsed: json.usage?.total_tokens || 0,
    promptTokens: json.usage?.prompt_tokens || 0,
    completionTokens: json.usage?.completion_tokens || 0,
  };
}

// ── eval_status 업데이트 헬퍼 ──

async function updateEvalStatus(
  supabase: ReturnType<typeof createClient>,
  evaluationId: string,
  status: string,
  extra: Record<string, unknown> = {},
) {
  await supabase
    .from("shadowing_evaluations")
    .update({ eval_status: status, ...extra })
    .eq("id", evaluationId);
}

// ── 메인 핸들러 ──

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body = await req.json();
    const {
      evaluation_id,
      audio_url,
      question_id,
      user_id,
      model = "gpt-4.1",
    } = body as {
      evaluation_id: string;
      audio_url: string;
      question_id: string;
      user_id: string;
      model?: string;
    };

    if (!evaluation_id || !audio_url || !question_id || !user_id) {
      return new Response(
        JSON.stringify({ error: "evaluation_id, audio_url, question_id, user_id 필수" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[speak-eval] 시작: eval=${evaluation_id}, question=${question_id}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // eval_status → processing
    await updateEvalStatus(supabase, evaluation_id, "processing");

    // ── 1. 오디오 다운로드 ──

    const audioResp = await fetch(audio_url);
    if (!audioResp.ok) throw new Error(`오디오 다운로드 실패: ${audioResp.status}`);
    const audioBuffer = await audioResp.arrayBuffer();
    const audioDuration = estimateAudioDuration(audioBuffer.byteLength, "audio/webm");

    // ── 2. Whisper STT (재시도 3회) ──

    const transcript = await withRetry(() => whisperSTT(audioBuffer), 3, "whisper");
    const wordCount = transcript.split(/\s+/).filter((w) => w.length > 0).length;
    const wpm = calculateWPM(wordCount, audioDuration);
    const fillerCount = countFillerWords(transcript);

    console.log(`[speak-eval] STT 완료: ${wordCount}단어, ${wpm}WPM, 필러${fillerCount}`);

    // ── 3. Azure 발음 평가 (실패해도 계속) ──

    let pronunciationAssessment = null;
    try {
      if (transcript.length >= 5) {
        pronunciationAssessment = await assessPronunciation(
          audioBuffer,
          transcript,
          AZURE_SPEECH_KEY,
          AZURE_SPEECH_REGION,
        );
      }
    } catch (err) {
      console.error("[speak-eval] Azure 발음 평가 실패 (계속 진행):", (err as Error).message);
    }

    // STT 결과 즉시 저장
    await updateEvalStatus(supabase, evaluation_id, "processing", {
      transcript,
      word_count: wordCount,
      wpm,
      filler_count: fillerCount,
      pronunciation_assessment: pronunciationAssessment,
    });

    // ── 4. 무응답 감지 ──

    if (detectSkipped(transcript, audioDuration, wordCount)) {
      console.log(`[speak-eval] 무응답 감지 → 스킵 결과 저장`);
      await updateEvalStatus(supabase, evaluation_id, "completed", {
        fulfillment: "skipped",
        task_checklist: [],
        observation: "응답이 감지되지 않았거나 의미 있는 발화가 충분하지 않았습니다.",
        directions: [],
        weak_points: [{
          code: "WP_T01",
          severity: "severe",
          reason: "질문 핵심 요구 미수행 — 발화 부족 또는 무응답",
          evidence: transcript ? `발화: "${transcript.slice(0, 100)}"` : "transcript 없음",
        }],
        estimated_level: null,
        overall_score: 0,
      });

      return new Response(
        JSON.stringify({ status: "skipped", evaluation_id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 5. 질문 메타 + 기준표 + 프롬프트 로드 ──

    const [qMetaRes, promptsRes] = await Promise.all([
      supabase.from("questions").select("question_english, question_type_eng").eq("id", question_id).single(),
      supabase.from("evaluation_prompts").select("key, prompt_text").in("key", ["consult", "consult_user", "consult_schema"]),
    ]);

    if (qMetaRes.error || !qMetaRes.data) throw new Error(`질문 조회 실패: ${qMetaRes.error?.message}`);
    if (promptsRes.error || !promptsRes.data || promptsRes.data.length < 3) {
      throw new Error(`프롬프트 로드 실패: ${promptsRes.error?.message || "3행 미만"}`);
    }

    const questionType = qMetaRes.data.question_type_eng || "";
    if (!questionType) {
      await updateEvalStatus(supabase, evaluation_id, "completed", {
        observation: "평가 대상 질문 유형이 아닙니다.",
        fulfillment: "skipped",
      });
      return new Response(
        JSON.stringify({ status: "skipped", reason: "question_type 없음" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const promptMap: Record<string, string> = {};
    for (const row of promptsRes.data) promptMap[row.key] = row.prompt_text;

    // 목표 등급
    const { data: authUser } = await supabase.auth.admin.getUserById(user_id);
    const target_grade = (authUser?.user?.user_metadata?.target_grade as string) || "IH";

    // 기준표
    const { data: criteriaRow, error: criteriaErr } = await supabase
      .from("evaluation_criteria")
      .select("criteria_text")
      .eq("target_grade", target_grade)
      .eq("question_type", questionType)
      .single();

    if (criteriaErr || !criteriaRow) {
      throw new Error(`기준표 로드 실패 (${target_grade}+${questionType}): ${criteriaErr?.message}`);
    }

    // ── 6. 변수 치환 + GPT consult 호출 ──

    const pron = (pronunciationAssessment || {}) as Record<string, unknown>;
    const pronScore = (pron.PronScore as number) || (pron.pronunciation_score as number) || 0;
    const fluencyScore = (pron.FluencyScore as number) || (pron.fluency_score as number) || 0;

    const userPrompt = substituteVariables(promptMap["consult_user"], {
      target_grade,
      question_type: questionType,
      question_text: qMetaRes.data.question_english || question_id,
      criteria: criteriaRow.criteria_text,
      transcript: sanitizeTranscript(transcript),
      duration: String(Math.round(audioDuration)),
      word_count: String(wordCount),
      wpm: String(wpm),
      pronunciation_score: String(pronScore),
      fluency_score: String(fluencyScore),
    });

    const responseFormat = JSON.parse(promptMap["consult_schema"]);

    const { result, tokensUsed, promptTokens, completionTokens } = await withRetry(
      () => callGptConsult(promptMap["consult"], userPrompt, responseFormat, model),
      2,
      "speak-eval consult",
    );

    const processingTimeMs = Date.now() - startTime;

    // API 사용량 로깅
    logApiUsage(supabase, {
      user_id,
      session_type: "shadowing",
      session_id: evaluation_id,
      feature: "쉐도잉 실전 평가",
      service: "openai_chat",
      model,
      ef_name: "shadowing-speak-eval",
      tokens_in: promptTokens,
      tokens_out: completionTokens,
      processing_time_ms: processingTimeMs,
    }).catch((err) => console.error("[speak-eval] API 로깅 실패:", err?.message));

    // Whisper 사용량도 별도 로깅
    logApiUsage(supabase, {
      user_id,
      session_type: "shadowing",
      session_id: evaluation_id,
      feature: "쉐도잉 실전 STT",
      service: "openai_whisper",
      model: "whisper-1",
      ef_name: "shadowing-speak-eval",
      tokens_in: 0,
      tokens_out: 0,
      audio_duration_sec: audioDuration,
      processing_time_ms: processingTimeMs,
    }).catch((err) => console.error("[speak-eval] Whisper 로깅 실패:", err?.message));

    // ── 7. DB 저장 ──

    await updateEvalStatus(supabase, evaluation_id, "completed", {
      fulfillment: result.fulfillment,
      task_checklist: result.task_checklist,
      observation: result.observation,
      directions: result.directions,
      weak_points: result.weak_points,
      estimated_level: target_grade,
      overall_score: pronScore > 0 ? Math.round((pronScore + fluencyScore) / 2) : null,
      pronunciation: pronScore > 0 ? Math.round(pronScore / 20 * 10) / 10 : null,
      fluency: fluencyScore > 0 ? Math.round(fluencyScore / 20 * 10) / 10 : null,
    });

    console.log(
      `[speak-eval] 완료: ${result.fulfillment}, WP=${result.weak_points.length}, ` +
      `${tokensUsed} tokens, ${processingTimeMs}ms`,
    );

    return new Response(
      JSON.stringify({ status: "completed", evaluation_id, fulfillment: result.fulfillment }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const errMsg = (err as Error).message || "알 수 없는 오류";
    console.error("[speak-eval] 오류:", errMsg);

    // 실패 시 eval_status 업데이트 시도
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body.evaluation_id) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await updateEvalStatus(supabase, body.evaluation_id, "failed", {
          observation: `평가 실패: ${errMsg.slice(0, 500)}`,
        });
      }
    } catch { /* 무시 */ }

    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
