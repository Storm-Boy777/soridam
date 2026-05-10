// lecture-materials-list
// 강의 자료 목록 조회 (lecture_id별)
// 권한: is_admin OR has lecture_access

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { generateRequestId, captureAndRespond } from "../_shared/errorLogger.ts";
import { checkLectureAccess } from "../_shared/lectureAccess.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = req.headers.get("x-request-id") || generateRequestId();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: req.headers.get("Authorization")! } },
      }
    );

    // 사용자 인증
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "인증되지 않은 사용자입니다" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 강의 접근 권한 확인
    const hasAccess = await checkLectureAccess(supabase, user);
    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: "강의 접근 권한이 없습니다" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // POST body
    const { lectureId } = await req.json();
    if (!lectureId) {
      return new Response(
        JSON.stringify({ error: "강의 ID가 필요합니다" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 자료 목록 조회
    const { data: materials, error } = await supabase
      .from("lecture_materials")
      .select("*")
      .eq("lecture_id", lectureId)
      .order("created_at", { ascending: false });

    if (error) {
      return new Response(
        JSON.stringify({
          error: "자료 목록 조회에 실패했습니다",
          detail: error.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: materials || [],
        count: materials?.length || 0,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[lecture-materials-list] Error:", error);
    return captureAndRespond(error, requestId, "lecture-materials-list", corsHeaders);
  }
});
