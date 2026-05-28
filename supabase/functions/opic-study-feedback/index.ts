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
  summary: string;
  flow: {
    intro: string | null;
    body: string | null;
    conclusion: string | null;
  };
  good_expressions: Array<{ quote: string; note: string }>;
  refine_expressions: Array<{ quote: string; issue: string; suggestion: string }>;
  pronunciation_patterns?: string[];
  discussion_hooks: string[];
  next_speaker_tip: { take: string; enhance: string };
  estimated_level?: {
    level: "IL" | "IM1" | "IM2" | "IM3" | "IH" | "AL";
    basis: string[];
    next_level_tip: string;
  };
}

interface ApproachItem {
  question_index: number;
  type_label: string;
  approach: string;
}

interface SessionMeta {
  selected_category: string;
  selected_topic: string;
  ai_guide_approaches: ApproachItem[] | null;
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

// Whisper STT (30초 timeout)
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
    signal: AbortSignal.timeout(30_000),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Whisper ${resp.status}: ${err.slice(0, 200)}`);
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
  // gpt-4.1-mini: $0.40/1M in, $1.60/1M out
  return (tokens_in * 0.40 + tokens_out * 1.60) / 1_000_000;
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
    // status 200 + "ok" body — 일부 모바일 브라우저(특히 삼성 인터넷·구버전 모바일 Chrome)는
    // OPTIONS preflight에 204를 비정상으로 처리해서 본 POST를 발사하지 않음
    return new Response("ok", { status: 200, headers: corsHeaders });
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
  let stage: string = "init";

  // 입력 파싱 (실패 시 DB에 저장 못함 — 단순 400 응답)
  let audioUrl = "";
  try {
    const body = await req.json();
    sessionId = body.session_id;
    userId = body.user_id;
    questionId = body.question_id;
    questionIdx = body.question_idx;
    audioUrl = body.audio_url as string;
  } catch {
    return new Response(JSON.stringify({ error: "invalid body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!sessionId || !userId || !questionId || questionIdx === undefined || !audioUrl) {
    return new Response(JSON.stringify({ error: "missing required fields" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // supabase client는 catch에서도 사용 (에러를 DB에 기록)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 단계별 에러를 DB의 feedback_result.error에 저장 → UI가 Realtime으로 받음
  const saveErrorToDb = async (stageName: string, errMessage: string) => {
    try {
      await supabase
        .from("opic_study_answers")
        .update({
          feedback_result: {
            error: {
              stage: stageName,
              message: errMessage.slice(0, 500),
              timestamp: new Date().toISOString(),
            },
          },
          feedback_generated_at: new Date().toISOString(),
        })
        .eq("session_id", sessionId)
        .eq("user_id", userId)
        .eq("question_idx", questionIdx);
    } catch (saveErr) {
      console.error("[opic-study-feedback] error 저장 실패:", saveErr);
    }
  };

  try {

    // ─── 1. 세션 + 질문 + 답변자 메타 조회 ───
    stage = "session_lookup";

    const { data: sessionData, error: sErr } = await supabase
      .from("opic_study_sessions")
      .select("group_id, selected_category, selected_topic, ai_guide_approaches")
      .eq("id", sessionId)
      .single();

    if (sErr || !sessionData) {
      throw new Error(`session not found: ${sErr?.message ?? ""}`);
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

    stage = "question_lookup";
    const { data: question, error: qErr } = await supabase
      .from("questions")
      .select("id, question_type_eng, question_english")
      .eq("id", questionId)
      .single();

    if (qErr || !question) {
      throw new Error(`question not found: ${qErr?.message ?? ""}`);
    }

    const answererName = await getAnswererName(supabase, userId, session.group_id);

    // ─── 2. audio 다운로드 ───
    stage = "audio_download";
    const audioBuffer = await downloadAudio(supabase, audioUrl);
    const audioDurationSec = Math.max(1, Math.round(audioBuffer.byteLength / 32000)); // 추정 (16kHz mono PCM 가정)

    // ─── 3 & 4. Whisper STT + Azure 발음 평가 ───
    // Whisper/Azure 실패는 fatal 아님 (transcript/pronunciation 없이도 GPT 진행)

    stage = "whisper";
    const whisperStart = Date.now();
    let transcript = "";
    let whisperOk = false;
    try {
      const result = await whisperSTT(audioBuffer);
      transcript = result.transcript;
      whisperOk = true;
    } catch (err) {
      console.error("[opic-study-feedback] Whisper 실패 (계속 진행):", err);
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
      stage = "azure";
      const azureStart = Date.now();
      try {
        // Azure SDK 자체에 timeout 옵션 없음 → Promise.race로 30초 강제 cap
        const azureResult = await Promise.race([
          assessPronunciation(audioBuffer, transcript, AZURE_SPEECH_KEY, AZURE_SPEECH_REGION),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Azure timeout 30s")), 30_000)
          ),
        ]);
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
    stage = "prompt_load";

    const [systemRes, userRes] = await Promise.all([
      supabase.from("evaluation_prompts").select("prompt_text").eq("key", "opic_study_feedback").maybeSingle(),
      supabase.from("evaluation_prompts").select("prompt_text").eq("key", "opic_study_feedback_user").maybeSingle(),
    ]);

    if (!systemRes.data?.prompt_text || !userRes.data?.prompt_text) {
      throw new Error("evaluation_prompts에 'opic_study_feedback' / 'opic_study_feedback_user' 키가 없습니다");
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

    // 답변한 질문(question_idx)에 해당하는 approach만 추출 (questionIdx는 0-based, question_index는 1-based)
    const targetApproach = (session.ai_guide_approaches || []).find(
      (a) => a.question_index === questionIdx + 1
    );
    const guideForThisQuestion = targetApproach
      ? `[${targetApproach.type_label}] ${targetApproach.approach}`
      : "(가이드 없음)";

    const userPrompt = buildPrompt(userPromptTpl, {
      // 답변자 본인의 목표 등급 (프롬프트가 group_target_level 변수명을 그대로 쓰면 호환성 위해 둘 다 주입)
      group_target_level: answererTargetGrade,
      answerer_target_grade: answererTargetGrade,
      category: session.selected_category,
      topic: session.selected_topic,
      // 변수명 호환성 유지 (evaluation_prompts의 prompt_text 무수정)
      // 의미 변경: 기존 "오늘 콤보 핵심 3가지" → "이 질문에 대한 한글 가이드 1개"
      ai_guide_key_points: guideForThisQuestion,
      question_type: question.question_type_eng,
      question_english: question.question_english,
      question_idx: String(questionIdx),
      answerer_name: answererName,
      transcript: transcript || "(답변 없음)",
      pronunciation_text: pronText,
    });

    // ─── 6. GPT-4.1-mini 호출 (45초 timeout, finish_reason 체크) ───
    stage = "gpt";

    const gptStart = Date.now();
    const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPromptText },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
        max_tokens: 2000,
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!openaiResp.ok) {
      const errText = await openaiResp.text();
      throw new Error(`GPT ${openaiResp.status}: ${errText.slice(0, 300)}`);
    }

    const openaiData = await openaiResp.json();
    const finishReason = openaiData.choices?.[0]?.finish_reason as string | undefined;
    const content = openaiData.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error(`GPT 빈 응답 (finish_reason=${finishReason ?? "?"})`);
    }
    if (finishReason === "length") {
      console.warn("[opic-study-feedback] GPT 응답이 max_tokens에 잘림 — JSON 파싱이 실패할 수 있음");
    }

    stage = "parse";
    let parsed: FeedbackOutput;
    try {
      parsed = JSON.parse(content);
    } catch (parseErr) {
      throw new Error(
        `JSON 파싱 실패 (finish_reason=${finishReason ?? "?"}): ${(parseErr as Error).message}`
      );
    }

    // ─── 검증 + fallback: 502 대신 부분 결과라도 저장해서 UI 무한 대기 방지 ───
    stage = "validate";
    parsed.summary = typeof parsed.summary === "string" && parsed.summary
      ? parsed.summary
      : "AI 응답에 summary가 누락되었습니다.";
    parsed.flow = typeof parsed.flow === "string" && parsed.flow ? parsed.flow : "";
    parsed.good_expressions = Array.isArray(parsed.good_expressions)
      ? parsed.good_expressions
      : [];
    parsed.refine_expressions = Array.isArray(parsed.refine_expressions)
      ? parsed.refine_expressions
      : [];
    parsed.pronunciation_patterns = Array.isArray(parsed.pronunciation_patterns)
      ? parsed.pronunciation_patterns
      : [];
    parsed.discussion_hooks = Array.isArray(parsed.discussion_hooks)
      ? parsed.discussion_hooks
      : [];
    parsed.next_speaker_tip = parsed.next_speaker_tip || { take: "", enhance: "" };

    // 등급 추정 — GPT가 빠뜨리면 undefined로 두기 (UI에서 조건부 노출)
    const ALLOWED_LEVELS = ["IL", "IM1", "IM2", "IM3", "IH", "AL"];
    if (
      parsed.estimated_level &&
      typeof parsed.estimated_level === "object" &&
      ALLOWED_LEVELS.includes(parsed.estimated_level.level)
    ) {
      parsed.estimated_level = {
        level: parsed.estimated_level.level,
        basis: Array.isArray(parsed.estimated_level.basis)
          ? parsed.estimated_level.basis.filter((b: unknown) => typeof b === "string" && b)
          : [],
        next_level_tip: typeof parsed.estimated_level.next_level_tip === "string"
          ? parsed.estimated_level.next_level_tip
          : "",
      };
    } else {
      parsed.estimated_level = undefined;
    }

    const gptMs = Date.now() - gptStart;
    const usage = openaiData.usage || {};
    const tokensIn = usage.prompt_tokens || 0;
    const tokensOut = usage.completion_tokens || 0;

    await logSystemUsage(supabase, {
      user_id: userId,
      session_id: sessionId,
      feature: "opic_study_feedback",
      service: "openai_chat",
      model: "gpt-4.1-mini",
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      cost_usd: calcGptCost(tokensIn, tokensOut),
      processing_time_ms: gptMs,
    });

    // ─── 7. opic_study_answers UPDATE ───
    stage = "db_update";

    const feedbackResult = {
      // 신규 토론 자료 구조
      summary: parsed.summary,
      flow: parsed.flow,
      good_expressions: parsed.good_expressions,
      refine_expressions: parsed.refine_expressions,
      pronunciation_patterns: parsed.pronunciation_patterns,
      discussion_hooks: parsed.discussion_hooks,
      next_speaker_tip: parsed.next_speaker_tip,
      // 답변 등급 추정 (단일 답변 기준 — IL~AL, 정확한 등급은 모의고사로)
      estimated_level: parsed.estimated_level,
      // 메타
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
      throw new Error(`DB UPDATE 실패: ${uErr.message}`);
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
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[opic-study-feedback] 실패 — stage=${stage}, msg=${message}`);

    // 단계별 에러를 DB에 저장 → UI가 Realtime으로 받아 안내
    await saveErrorToDb(stage, message);

    return new Response(
      JSON.stringify({
        ok: false,
        stage,
        error: message,
        total_ms: Date.now() - totalStart,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
