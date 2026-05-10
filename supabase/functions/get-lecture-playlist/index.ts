// get-lecture-playlist
// 강의 영상 재생을 위한 HLS playlist URL 발급
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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: req.headers.get("Authorization")! } },
      }
    );

    // 1. 사용자 인증
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "인증이 필요합니다" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. 강의 접근 권한 확인 (admin OR lecture_access)
    const hasAccess = await checkLectureAccess(supabaseClient, user);
    if (!hasAccess) {
      return new Response(
        JSON.stringify({
          error: "강의 접근 권한이 없습니다",
          detail: "관리자에게 권한 부여를 요청해주세요",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. 요청 파라미터
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

    // 4. 강의 정보 조회
    const { data: lecture, error: lectureError } = await supabaseClient
      .from("lectures")
      .select(
        "id, lecture_id, title, description, duration, instructor_name, playlist_url"
      )
      .eq("id", lectureId)
      .eq("is_active", true)
      .single();

    if (lectureError || !lecture) {
      return new Response(
        JSON.stringify({
          error: "강의를 찾을 수 없습니다",
          detail: `강의 ID: ${lectureId}`,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const masterPlaylistKey = lecture.playlist_url;
    if (!masterPlaylistKey) {
      return new Response(
        JSON.stringify({
          error: "플레이리스트 URL이 설정되지 않았습니다",
          detail: `강의 ID: ${lectureId}`,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 5. HLS 프록시 URL 구성
    const HLS_PROXY_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/hls-proxy`;
    const playlistUrl = `${HLS_PROXY_URL}?path=${encodeURIComponent(masterPlaylistKey)}`;
    const baseDir = masterPlaylistKey.substring(
      0,
      masterPlaylistKey.lastIndexOf("/")
    );
    const segmentBaseUrl = `${HLS_PROXY_URL}?path=${encodeURIComponent(baseDir)}/`;

    // 6. 진도 정보 조회 + 갱신 (병렬)
    const [existingProgressResult] = await Promise.all([
      supabaseClient
        .from("lecture_progress")
        .select("last_position, progress_percentage, playback_speed")
        .eq("user_id", user.id)
        .eq("lecture_id", lecture.id)
        .maybeSingle(),
      supabaseClient.from("lecture_progress").upsert(
        {
          user_id: user.id,
          lecture_id: lecture.id,
          total_seconds: lecture.duration || 0,
          last_watched_at: new Date().toISOString(),
        },
        { onConflict: "user_id,lecture_id" }
      ),
    ]);

    const existingProgress = existingProgressResult.data;

    return new Response(
      JSON.stringify({
        success: true,
        playlistUrl,
        segmentBaseUrl,
        lecture: {
          id: lecture.id,
          title: lecture.title,
          description: lecture.description,
          duration: lecture.duration,
          instructor_name: lecture.instructor_name,
          playlist_url: lecture.playlist_url,
        },
        progress: existingProgress || {
          last_position: 0,
          progress_percentage: 0,
          playback_speed: 1.0,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[get-lecture-playlist] Error:", error);
    return captureAndRespond(error, requestId, "get-lecture-playlist", corsHeaders);
  }
});
