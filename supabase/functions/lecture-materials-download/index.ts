// lecture-materials-download
// 강의 자료 파일 다운로드 (Storage `lecture-materials` 버킷에서 바이너리 반환)
// 권한: is_admin OR has lecture_access

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { generateRequestId, captureAndRespond } from "../_shared/errorLogger.ts";
import { checkLectureAccess } from "../_shared/lectureAccess.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    const { materialId } = await req.json();
    if (!materialId) {
      return new Response(
        JSON.stringify({ error: "자료 ID가 필요합니다" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 자료 정보 조회
    const { data: material, error: fetchError } = await supabase
      .from("lecture_materials")
      .select("*")
      .eq("id", materialId)
      .single();

    if (fetchError || !material) {
      return new Response(
        JSON.stringify({ error: "자료를 찾을 수 없습니다" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // file_url에서 Storage 경로 추출
    // 형식: https://{project}.supabase.co/storage/v1/object/public/lecture-materials/{path}
    const urlParts = material.file_url.split("/lecture-materials/");
    const storagePath = urlParts[1];

    if (!storagePath) {
      return new Response(
        JSON.stringify({ error: "파일 경로를 찾을 수 없습니다" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Storage에서 다운로드
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("lecture-materials")
      .download(storagePath);

    if (downloadError || !fileData) {
      return new Response(
        JSON.stringify({
          error: "파일 다운로드 실패",
          detail: downloadError?.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 다운로드 카운트 증가 (실패해도 무시)
    supabase
      .from("lecture_materials")
      .update({ download_count: (material.download_count || 0) + 1 })
      .eq("id", materialId)
      .then(() => {});

    return new Response(fileData, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": material.file_type,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(material.file_name)}"`,
        "Content-Length": material.file_size.toString(),
      },
    });
  } catch (error) {
    console.error("[lecture-materials-download] Error:", error);
    return captureAndRespond(
      error,
      requestId,
      "lecture-materials-download",
      corsHeaders
    );
  }
});
