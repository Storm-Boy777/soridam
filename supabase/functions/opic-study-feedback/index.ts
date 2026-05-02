/**
 * opic-study-feedback — 오픽 스터디 일타강사 코칭 생성 EF
 *
 * 역할: 멤버 답변 1건에 대해 Whisper + Azure 발음 + GPT-4.1 코칭 종합 생성.
 *
 * 호출: SA `submitAnswer({...})` fire-and-forget
 * 입력: { session_id, user_id, question_id, question_idx, audio_url, triggered_by? }
 * 처리:
 *   1. 세션 + 질문 + 답변자 메타 조회
 *   2. audio 다운로드 (Storage)
 *   3. Whisper STT (영문 transcript)
 *   4. Azure 발음 평가 (PronunciationAssessment) — 병렬 가능
 *   5. 'opic_study_feedback' 프롬프트 로드 + 변수 치환
 *   6. GPT-4.1 호출 (response_format: json_object)
 *   7. opic_study_answers UPDATE (transcript + pronunciation_score + feedback_result)
 *   8. api_usage_logs 3건 (Whisper, Azure, GPT) — 시스템 비용, 크레딧 차감 X
 *
 * 무료 정책: 사용자 크레딧 차감 X — 시스템 부담
 * 점수 비공개: pronunciation_score는 DB에 저장하되 UI에 노출 X (GPT 입력 전용)
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assessPronunciation, PronunciationResult } from "../_shared/azure-pronunciation.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const AZURE_SPEECH_KEY = Deno.env.get("AZURE_SPEECH_KEY")!;
const AZURE_SPEECH_REGION = Deno.env.get("AZURE_SPEECH_REGION") || "koreacentral";

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

interface FeedbackOutput {
  feedback_text: string;
  strengths: string[];
  improvements: string[];
  tips: string[];
}

interface SessionMeta {
  selected_category: string;
  selected_topic: string;
  ai_guide_key_points: string[] | null;
}

// ── 헬퍼 ──

function buildPrompt(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const v = vars[key];
    if (v === undefined || v === null) return "";
    if (typeof v === "string") return v;
    return JSON.stringify(v, null, 2);
  });
}

// Azure 결과 → DB JSON 형식 변환 (점수 비공개 정책: DB 저장 OK, UI 노출 X)
function toDbPronunciationScore(azure: PronunciationResult) {
  return {
    accuracy: azure.accuracy_score,
    fluency: azure.fluency_score,
    prosody: azure.prosody_score,
    completeness: azure.completeness_score,
    pron_score: azure.pronunciation_score,
    words: (azure.words || []).map((w) => ({
      word: w.word,
      accuracy: w.accuracyScore,
      error_type: w.errorType !== "None" ? w.errorType : undefined,
    })),
  };
}

// Whisper STT
async function whisperSTT(audioBuffer: ArrayBuffer): Promise<{ transcript: string; tokens_in: number; tokens_out: number }> {
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([audioBuffer], { type: "audio/webm" }),
    "audio.webm"
  );
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

  const json = await resp.json();
  return { transcript: (json.text || "").trim(), tokens_in: 0, tokens_out: 0 };
}

// audio 다운로드 (Storage 공개 URL 또는 인증 URL)
async function downloadAudio(supabase: SupabaseClient, audioUrl: string): Promise<ArrayBuffer> {
  // public URL: 직접 fetch
  // signed URL: 직접 fetch
  // path만 (예: "sessionId/userId/0.webm"): Storage API 사용
  if (audioUrl.startsWith("http")) {
    const resp = await fetch(audioUrl);
    if (!resp.ok) throw new Error(`audio 다운로드 실패: ${resp.status}`);
    return await resp.arrayBuffer();
  }

  // path 형식 → Storage API
  const { data, error } = await supabase.storage
    .from("opic-study-recordings")
    .download(audioUrl);
  if (error || !data) throw new Error(`Storage 다운로드 실패: ${error?.message}`);
  return await data.arrayBuffer();
}

// 답변자 표시명 조회
async function getAnswererName(supabase: SupabaseClient, userId: string, groupId: string): Promise<string> {
  // 1. 그룹 내 display_name 우선
  const { data: member } = await supabase
    .from("study_group_members")
    .select("display_name")
    .eq("user_id", userId)
    .eq("group_id", groupId)
    .maybeSingle();
  if (member?.display_name) return member.display_name as string;

  // 2. profiles.display_name fallback
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", userId)
    .maybeSingle();
  return (profile?.display_name as string) || (profile?.email as string)?.split("@")[0] || "멤버";
}

// 시스템 비용 로그 (크레딧 차감 X)
async function logSystemUsage(
  supabase: SupabaseClient,
  params: {
    user_id: string;
    session_id: string;
    feature: string;
    service: "openai_chat" | "openai_whisper" | "azure_speech";
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
    session_type: "opic_study",
    session_id: params.session_id,
    feature: params.feature,
    service: params.service,
    model: params.model,
    ef_name: "opic-study-feedback",
    tokens_in: params.tokens_in ?? null,
    tokens_out: params.tokens_out ?? null,
    audio_duration_sec: params.audio_duration_sec ?? null,
    cost_usd: params.cost_usd,
    processing_time_ms: params.processing_time_ms,
  });
  if (error) console.error("[opic-study-feedback] api_usage_logs insert 실패:", error.message);
}

// 비용 계산
function calcGptCost(tokens_in: number, tokens_out: number): number {
  // gpt-4.1: $2/1M in, $8/1M out
  return (tokens_in * 2.0 + tokens_out * 8.0) / 1_000_000;
}
function calcWhisperCost(durationSec: number): number {
  // $0.006/min
  return (durationSec / 60) * 0.006;
}
function calcAzureCost(durationSec: number): number {
  // $0.000367/sec
  return durationSec * 0.000367;
}

// ── 메인 핸들러 ──

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const totalStart = Date.now();
  let sessionId = "";
  let userId = "";
  let questionId = "";
  let questionIdx = -1;

  try {
    const body = await req.json();
    sessionId = body.session_id;
    userId = body.user_id;
    questionId = body.question_id;
    questionIdx = body.question_idx;
    const audioUrl = body.audio_url as string;

    if (!sessionId || !userId || !questionId || questionIdx === undefined || !audioUrl) {
      return new Response(JSON.stringify({ error: "missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ─── 1. 세션 + 질문 + 답변자 메타 조회 ───

    const { data: sessionData, error: sErr } = await supabase
      .from("opic_study_sessions")
      .select("group_id, selected_category, selected_topic, ai_guide_key_points")
      .eq("id", sessionId)
      .single();

    if (sErr || !sessionData) {
      return new Response(JSON.stringify({ error: "session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const session = sessionData as unknown as SessionMeta & { group_id: string };

    // 답변자 본인의 목표 등급 조회 (그룹 등급 X — 멤버 개인의 target_grade 사용)
    const { data: answererProfile } = await supabase
      .from("profiles")
      .select("target_grade")
      .eq("id", userId)
      .single();
    const answererTargetGrade =
      (answererProfile?.target_grade as string | null) || "AL"; // 미설정 시 기본 AL

    const { data: question, error: qErr } = await supabase
      .from("questions")
      .select("id, question_type_eng, question_english")
      .eq("id", questionId)
      .single();

    if (qErr || !question) {
      return new Response(JSON.stringify({ error: "question not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const answererName = await getAnswererName(supabase, userId, session.group_id);

    // ─── 2. audio 다운로드 ───

    const audioBuffer = await downloadAudio(supabase, audioUrl);
    const audioDurationSec = Math.max(1, Math.round(audioBuffer.byteLength / 32000)); // 추정 (16kHz mono PCM 가정)

    // ─── 3 & 4. Whisper STT + Azure 발음 평가 (병렬) ───
    // Azure는 reference text가 필요해서 Whisper 결과 의존 → 순차

    const whisperStart = Date.now();
    let transcript = "";
    let whisperOk = false;
    try {
      const result = await whisperSTT(audioBuffer);
      transcript = result.transcript;
      whisperOk = true;
    } catch (err) {
      console.error("[opic-study-feedback] Whisper 실패:", err);
      // 빈 transcript로 계속 진행 (GPT는 발음 데이터로만 코칭)
    }
    const whisperMs = Date.now() - whisperStart;

    if (whisperOk) {
      await logSystemUsage(supabase, {
        user_id: userId,
        session_id: sessionId,
        feature: "opic_study_stt",
        service: "openai_whisper",
        model: "whisper-1",
        audio_duration_sec: audioDurationSec,
        cost_usd: calcWhisperCost(audioDurationSec),
        processing_time_ms: whisperMs,
      });
    }

    let pronunciation: ReturnType<typeof toDbPronunciationScore> | null = null;
    if (transcript) {
      const azureStart = Date.now();
      try {
        const azureResult = await assessPronunciation(
          audioBuffer,
          transcript,
          AZURE_SPEECH_KEY,
          AZURE_SPEECH_REGION
        );
        pronunciation = toDbPronunciationScore(azureResult);

        await logSystemUsage(supabase, {
          user_id: userId,
          session_id: sessionId,
          feature: "opic_study_pronunciation",
          service: "azure_speech",
          model: "azure-pronunciation",
          audio_duration_sec: audioDurationSec,
          cost_usd: calcAzureCost(audioDurationSec),
          processing_time_ms: Date.now() - azureStart,
        });
      } catch (err) {
        console.error("[opic-study-feedback] Azure 실패:", err);
        // 발음 평가 실패해도 transcript만으로 GPT 코칭 진행
      }
    }

    // ─── 5. 프롬프트 로드 + 변수 치환 (system + user 별도 row) ───

    const [systemRes, userRes] = await Promise.all([
      supabase.from("evaluation_prompts").select("prompt_text").eq("key", "opic_study_feedback").maybeSingle(),
      supabase.from("evaluation_prompts").select("prompt_text").eq("key", "opic_study_feedback_user").maybeSingle(),
    ]);

    if (!systemRes.data?.prompt_text || !userRes.data?.prompt_text) {
      return new Response(JSON.stringify({ error: "prompt not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPromptText = systemRes.data.prompt_text as string;
    const userPromptTpl = userRes.data.prompt_text as string;

    // 발음 데이터 자연어 변환 (GPT 입력용 — UI 노출 X)
    const pronText = pronunciation
      ? `정확도 ${pronunciation.accuracy}/100, 유창성 ${pronunciation.fluency}/100, ` +
        `프로소디 ${pronunciation.prosody}/100, 종합 ${pronunciation.pron_score}/100. ` +
        (pronunciation.words?.filter((w) => w.error_type)
          ?.map((w) => `${w.word}(${w.error_type})`)
          .slice(0, 5)
          .join(", ") || "약점 단어 없음")
      : "발음 데이터 없음";

    const userPrompt = buildPrompt(userPromptTpl, {
      // 답변자 본인의 목표 등급 (프롬프트가 group_target_level 변수명을 그대로 쓰면 호환성 위해 둘 다 주입)
      group_target_level: answererTargetGrade,
      answerer_target_grade: answererTargetGrade,
      category: session.selected_category,
      topic: session.selected_topic,
      ai_guide_key_points: (session.ai_guide_key_points || []).map((p, i) => `${i + 1}. ${p}`).join("\n") || "(없음)",
      question_type: question.question_type_eng,
      question_english: question.question_english,
      question_idx: String(questionIdx),
      answerer_name: answererName,
      transcript: transcript || "(답변 없음)",
      pronunciation_text: pronText,
    });

    // ─── 6. GPT-4.1 호출 ───

    const gptStart = Date.now();
    const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        messages: [
          { role: "system", content: systemPromptText },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
        max_tokens: 800,
      }),
    });

    if (!openaiResp.ok) {
      const errText = await openaiResp.text();
      console.error("[opic-study-feedback] GPT 에러:", errText);
      return new Response(JSON.stringify({ error: "AI 코칭 생성 실패" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiData = await openaiResp.json();
    const content = openaiData.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(JSON.stringify({ error: "empty AI response" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: FeedbackOutput;
    try {
      parsed = JSON.parse(content);
    } catch {
      return new Response(JSON.stringify({ error: "invalid AI JSON" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 기본 검증
    if (!parsed.feedback_text || !Array.isArray(parsed.strengths)) {
      console.error("[opic-study-feedback] AI 응답 검증 실패:", parsed);
      return new Response(JSON.stringify({ error: "AI 응답 형식 오류" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 누락 필드 기본값
    parsed.improvements = parsed.improvements || [];
    parsed.tips = parsed.tips || [];

    const gptMs = Date.now() - gptStart;
    const usage = openaiData.usage || {};
    const tokensIn = usage.prompt_tokens || 0;
    const tokensOut = usage.completion_tokens || 0;

    await logSystemUsage(supabase, {
      user_id: userId,
      session_id: sessionId,
      feature: "opic_study_feedback",
      service: "openai_chat",
      model: "gpt-4.1",
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      cost_usd: calcGptCost(tokensIn, tokensOut),
      processing_time_ms: gptMs,
    });

    // ─── 7. opic_study_answers UPDATE ───

    const feedbackResult = {
      feedback_text: parsed.feedback_text,
      strengths: parsed.strengths,
      improvements: parsed.improvements,
      tips: parsed.tips,
      target_grade: answererTargetGrade,
      generated_at: new Date().toISOString(),
    };

    const { error: uErr } = await supabase
      .from("opic_study_answers")
      .update({
        transcript,
        pronunciation_score: pronunciation,
        feedback_result: feedbackResult,
        feedback_generated_at: new Date().toISOString(),
      })
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .eq("question_idx", questionIdx);

    if (uErr) {
      console.error("[opic-study-feedback] DB UPDATE 실패:", uErr.message);
      return new Response(JSON.stringify({ error: "DB 저장 실패" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── 8. "모든 멤버 답변 완료" 자동 감지 → step='feedback_share' ───
    // 현재 question_idx에 대한 답변 수 vs 그룹 멤버 수 비교
    try {
      const [{ count: answeredCount }, { count: memberCount }] = await Promise.all([
        supabase
          .from("opic_study_answers")
          .select("*", { count: "exact", head: true })
          .eq("session_id", sessionId)
          .eq("question_idx", questionIdx)
          .not("feedback_result", "is", null),
        supabase
          .from("study_group_members")
          .select("*", { count: "exact", head: true })
          .eq("group_id", session.group_id),
      ]);

      const ans = answeredCount ?? 0;
      const total = memberCount ?? 0;
      if (ans >= total && total > 0) {
        await supabase
          .from("opic_study_sessions")
          .update({ step: "feedback_share" })
          .eq("id", sessionId)
          .eq("current_question_idx", questionIdx)
          .eq("step", "recording");
        console.log(
          `[opic-study-feedback] 모든 멤버 답변 완료 (${ans}/${total}) — step='feedback_share' 전환`
        );
      }
    } catch (autoErr) {
      // 자동 전환 실패는 fatal X — 다음 발화자 클릭으로 수동 진행 가능
      console.warn("[opic-study-feedback] 자동 step 전환 실패:", autoErr);
    }

    return new Response(
      JSON.stringify({ ok: true, total_ms: Date.now() - totalStart }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[opic-study-feedback] 예외:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
