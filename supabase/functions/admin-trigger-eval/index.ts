// admin-trigger-eval — 관리자용 평가 트리거
// stt_completed 상태의 answers에 대해 eval-judge를 내부 호출
// 사용: POST /functions/v1/admin-trigger-eval { session_id: "mt_xxx" }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { session_id, admin_key } = await req.json();

    // 간단한 admin 인증 (하드코딩 키)
    if (admin_key !== "opictalk-eval-2026") {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!session_id) {
      return new Response(
        JSON.stringify({ error: "session_id 필수" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // stt_completed 상태의 answers 조회
    const { data: answers, error: fetchErr } = await supabase
      .from("mock_test_answers")
      .select("question_number, question_id, transcript, word_count, wpm, filler_word_count, long_pause_count, audio_duration, pronunciation_assessment")
      .eq("session_id", session_id)
      .eq("eval_status", "stt_completed")
      .order("question_number");

    if (fetchErr || !answers) {
      return new Response(
        JSON.stringify({ error: `answers 조회 실패: ${fetchErr?.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (answers.length === 0) {
      return new Response(
        JSON.stringify({ message: "stt_completed 상태의 answers가 없습니다", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // eval-judge fire-and-forget 호출 (비동기, 응답 대기 X)
    for (const answer of answers) {
      const payload = {
        session_id,
        question_number: answer.question_number,
        question_id: answer.question_id || "",
        question_type: "",
        transcript: answer.transcript,
        word_count: answer.word_count,
        wpm: answer.wpm,
        filler_word_count: answer.filler_word_count,
        long_pause_count: answer.long_pause_count,
        audio_duration: answer.audio_duration,
        pronunciation_assessment: answer.pronunciation_assessment,
      };

      // fire-and-forget: 응답 대기하지 않음
      fetch(`${SUPABASE_URL}/functions/v1/mock-test-eval-judge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify(payload),
      }).catch((err) => {
        console.error(`Q${answer.question_number} eval-judge 호출 실패:`, err?.message || err);
      });
    }

    return new Response(
      JSON.stringify({
        session_id,
        triggered: answers.length,
        message: `${answers.length}개 답변에 대해 eval-judge fire-and-forget 호출 완료. eval-judge → eval-coach → report 체인이 자동 실행됩니다.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
