// tutoring-evaluate — 드릴 시도 평가 Edge Function
// Whisper STT → Layer 1 규칙 판정 → 조건부 Prompt F (Layer 2)
// 프롬프트는 evaluation_prompts 테이블에서 동적 로드

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadPromptSet, buildMessages } from "../_shared/tutoring-prompts.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FILLER_PATTERNS = [
  /\bum+\b/gi, /\buh+\b/gi, /\bhmm+\b/gi, /\bah+\b/gi, /\ber+\b/gi,
  /\blike\b/gi, /\byou know\b/gi, /\bi mean\b/gi, /\bwell\b/gi,
  /\bso+\b/gi, /\bactually\b/gi, /\bbasically\b/gi, /\bkind of\b/gi,
];

// Layer 1 마커 (인라인 — 핵심 4종)
const MARKER_SETS: Record<string, Record<string, string[]>> = {
  comparison: {
    past: ["in the past", "before", "when i was younger", "back then", "used to", "years ago"],
    present: ["these days", "now", "nowadays", "today", "currently"],
    difference: ["different", "the biggest difference", "more than", "less than", "compared to", "changed"],
    reason: ["because", "since", "thats why", "the reason is", "i think this is because"],
  },
  routine: {
    routine_anchor: ["usually", "normally", "every day", "my routine"],
    sequence: ["first", "then", "next", "after that", "finally"],
  },
  rp_12: {
    problem: ["there is a problem", "it doesnt work", "unfortunately", "the problem is", "the issue is"],
    reason: ["because", "the reason is", "what happened was"],
    alternative: ["instead", "another option", "could you", "maybe i can", "would it be possible", "one option is"],
  },
  past_special: {
    event_anchor: ["one day", "last year", "i remember", "there was a time"],
    sequence: ["first", "then", "after that", "finally", "suddenly"],
    feeling: ["i felt", "it was amazing", "i was so", "i learned"],
  },
};

const FLAG_MAP: Record<string, Record<string, string>> = {
  comparison: { past_mention: "past", present_mention: "present", difference_statement: "difference", reason_statement: "reason" },
  routine: { routine_anchor_present: "routine_anchor", sequence_progression: "sequence", minimum_two_steps: "sequence" },
  rp_12: { problem_statement: "problem", reason_or_detail: "reason", alternative_request: "alternative" },
  past_special: { event_anchor_present: "event_anchor", sequence_progression: "sequence", result_or_feeling_present: "feeling" },
};

const FLAG_LABELS: Record<string, string> = {
  past_mention: "과거 언급", present_mention: "현재 언급", difference_statement: "핵심 차이",
  reason_statement: "이유 1문장", routine_anchor_present: "루틴 소개", sequence_progression: "순서 전개",
  minimum_two_steps: "2단계 이상", problem_statement: "문제 설명", reason_or_detail: "이유/세부",
  alternative_request: "대안 제시", event_anchor_present: "사건 배경", result_or_feeling_present: "결과/느낌",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { attempt_id, drill_id, audio_url } = await req.json();
    console.log(`[tutoring-evaluate] 시작: attempt=${attempt_id}`);

    // 1. 드릴 데이터 조회
    const { data: drill } = await supabase
      .from("tutoring_drills")
      .select("*, tutoring_focuses!inner(focus_code, session_id)")
      .eq("id", drill_id)
      .single();
    if (!drill) throw new Error("드릴을 찾을 수 없습니다");

    const { count: prevCount } = await supabase
      .from("tutoring_attempts")
      .select("*", { count: "exact", head: true })
      .eq("drill_id", drill_id)
      .neq("id", attempt_id);
    const retryCount = prevCount ?? 0;

    // 2. Whisper STT
    console.log(`[tutoring-evaluate] Whisper STT 시작...`);
    const { data: audioData } = await supabase.storage
      .from("tutoring-recordings")
      .download(audio_url);
    if (!audioData) throw new Error("오디오 다운로드 실패");

    const audioBlob = new Blob([audioData], { type: "audio/webm" });
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");
    formData.append("model", "whisper-1");
    formData.append("language", "en");

    const sttResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: formData,
    });
    if (!sttResponse.ok) throw new Error(`Whisper 에러: ${sttResponse.status}`);
    const sttResult = await sttResponse.json();
    const transcript = sttResult.text ?? "";
    console.log(`[tutoring-evaluate] STT 완료: ${transcript.length}자`);

    // 3. Speech meta
    const words = transcript.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const audioDuration = audioBlob.size / 16000;
    const wpm = audioDuration > 0 ? (wordCount / audioDuration) * 60 : 0;
    let fillerCount = 0;
    for (const p of FILLER_PATTERNS) { fillerCount += (transcript.match(p) || []).length; }
    const fillerRatio = wordCount > 0 ? fillerCount / wordCount : 0;

    // 4. Layer 1
    console.log(`[tutoring-evaluate] Layer 1 판정...`);
    const { data: question } = await supabase.from("questions").select("question_type_eng").eq("id", drill.question_id).single();
    const questionType = question?.question_type_eng ?? "description";
    const passCriteria = drill.pass_criteria ?? { required_flags: [], min_word_count: 20, min_duration_sec: 10 };

    const layer1Result = evaluateLayer1(transcript, questionType, passCriteria, {
      audioDuration, wordCount, wpm, fillerRatio, longPauseCount: 0, unfinishedEnd: false,
    }, retryCount);
    console.log(`[tutoring-evaluate] Layer 1: ${layer1Result.result}`);

    // 5. 조건부 Prompt F
    let layer2Result = null;
    if (layer1Result.result === "escalate_l2") {
      console.log(`[tutoring-evaluate] Layer 2 (Prompt F) 호출...`);
      const promptF = await loadPromptSet(supabase, "tutoring_evaluate");
      const { data: sessionData } = await supabase
        .from("tutoring_sessions")
        .select("next_step_level, final_target_level")
        .eq("id", drill.tutoring_focuses.session_id)
        .single();

      const promptFInput = {
        drill_goal: {
          focus_code: drill.tutoring_focuses.focus_code,
          goal_label: drill.goal,
          next_step_level: sessionData?.next_step_level ?? "IM3",
          final_target_level: sessionData?.final_target_level ?? "IH",
          pass_criteria: passCriteria,
        },
        question: { question_id: drill.question_id, question_type: questionType, topic: drill.topic, question_english: drill.question_english },
        attempt: { attempt_type: retryCount === 0 ? "first" : "retry", transcript, audio_duration: audioDuration, word_count: wordCount, wpm, filler_ratio: fillerRatio, long_pause_count: 0 },
        layer1_result: { result: layer1Result.result, failed_flags: layer1Result.failed_flags },
      };

      const messages = buildMessages(promptF, promptFInput);
      layer2Result = await callGPT(messages, promptF.model);
      console.log(`[tutoring-evaluate] Layer 2 완료`);
    }

    // 6. DB 업데이트
    const finalResult = layer1Result.result === "pass" ? "pass" : layer1Result.result === "escalate_l2" ? (layer2Result?.pass_or_retry ?? "retry") : "retry";

    await supabase.from("tutoring_attempts").update({
      transcript, audio_duration: audioDuration, word_count: wordCount, wpm,
      filler_word_count: fillerCount, filler_ratio: fillerRatio, long_pause_count: 0,
      layer1_result: layer1Result, layer2_result: layer2Result, result: finalResult,
    }).eq("id", attempt_id);

    if (finalResult === "pass") {
      await supabase.from("tutoring_drills").update({ status: "passed" }).eq("id", drill_id);
      const nextNumber = drill.question_number + 1;
      if (nextNumber <= 3) {
        await supabase.from("tutoring_drills").update({ status: "active" }).eq("focus_id", drill.focus_id).eq("question_number", nextNumber);
      }
    }

    console.log(`[tutoring-evaluate] 완료: ${finalResult}`);

    return new Response(
      JSON.stringify({ ok: true, attempt_id, result: finalResult, layer1: layer1Result, layer2: layer2Result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[tutoring-evaluate] 에러:", message);
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ── Layer 1 ──

function evaluateLayer1(
  transcript: string, questionType: string,
  passCriteria: { required_flags: string[]; min_word_count?: number; min_duration_sec?: number; max_filler_ratio?: number },
  meta: { audioDuration: number; wordCount: number; wpm: number; fillerRatio: number; longPauseCount: number; unfinishedEnd: boolean },
  retryCount: number
) {
  const normalized = transcript.toLowerCase().replace(/['']/g, "").replace(/[.,!?;:]/g, " ");

  if (!transcript || transcript.trim().length < 5) {
    return buildL1("retry", [], passCriteria.required_flags, [], "답변이 거의 없어요.", "한두 문장이라도 말해보세요.", {}, {});
  }

  const markers = MARKER_SETS[questionType] ?? {};
  const flagMap = FLAG_MAP[questionType] ?? {};
  const ruleHits: Record<string, string[]> = {};
  const passed: string[] = [];
  const failed: string[] = [];

  for (const flag of passCriteria.required_flags) {
    const group = flagMap[flag];
    if (!group || !markers[group]) { passed.push(flag); continue; }
    const hits = markers[group].filter((m: string) => normalized.includes(m));
    ruleHits[flag] = hits;
    if (flag === "minimum_two_steps" || flag === "feature_count_min_2") {
      hits.length >= 2 ? passed.push(flag) : failed.push(flag);
    } else {
      hits.length > 0 ? passed.push(flag) : failed.push(flag);
    }
  }

  const metaChecks = {
    min_word_count_pass: meta.wordCount >= (passCriteria.min_word_count ?? 10),
    min_duration_pass: meta.audioDuration >= (passCriteria.min_duration_sec ?? 8),
  };

  const warnings: string[] = [];
  if (meta.fillerRatio > (passCriteria.max_filler_ratio ?? 0.15)) warnings.push("high_filler");

  if (retryCount >= 2 && failed.length > 0) {
    return buildL1("escalate_l2", passed, failed, warnings, "기본 구조는 보이지만, 반복 실패.", "더 구체적으로 짚어드릴게요.", ruleHits, metaChecks);
  }

  if (failed.length === 0 && metaChecks.min_word_count_pass && metaChecks.min_duration_pass) {
    return buildL1("pass", passed, failed, warnings, "좋아요. 구조가 잘 잡혔어요.", "", ruleHits, metaChecks);
  }

  const praise = failed.length === 1 ? "좋아요. 뼈대는 잘 잡혔어요." : failed.length === 2 ? "기본 시작은 괜찮아요." : "시작은 했어요.";
  const labels = failed.slice(0, 2).map((f) => FLAG_LABELS[f] ?? f);
  const retryInst = failed.length === 1 ? `이번엔 ${labels[0]}만 넣어서 다시 말해보세요.` : `이번엔 ${labels.join("과(와) ")}가 들리게 다시 말해보세요.`;

  return buildL1("retry", passed, failed, warnings, praise, retryInst, ruleHits, metaChecks);
}

function buildL1(
  result: string, passed: string[], failed: string[], warnings: string[],
  praise: string, retryInst: string, ruleHits: Record<string, string[]>, metaChecks: Record<string, boolean>
) {
  const checklist = [
    ...passed.map((f) => ({ label: FLAG_LABELS[f] ?? f, status: "pass" })),
    ...failed.map((f) => ({ label: FLAG_LABELS[f] ?? f, status: "fail" })),
  ];
  const confidence = passed.length / Math.max(1, passed.length + failed.length);
  return {
    layer: "L1", result, confidence: Math.round(confidence * 100) / 100,
    passed_flags: passed, failed_flags: failed, soft_warnings: warnings,
    student_feedback: { status_label: result === "pass" ? "PASS" : "RETRY", checklist, praise, retry_instruction: retryInst },
    internal_trace: { rule_hits: ruleHits, meta_checks: metaChecks },
    next_action: result === "pass" ? "pass_next_question" : result === "escalate_l2" ? "escalate_to_layer2" : "retry_same_question",
  };
}

// ── GPT ──

async function callGPT(messages: { role: string; content: string }[], model = "gpt-4.1-mini") {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model, messages, temperature: 0.3, response_format: { type: "json_object" } }),
  });
  if (!response.ok) throw new Error(`GPT 에러: ${response.status}`);
  const data = await response.json();
  return JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
}
