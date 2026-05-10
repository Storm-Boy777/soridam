"use server";

// 강의 모듈 Server Actions
// 권한: requireLectureAccess (admin OR lecture_access)

import { requireLectureAccess } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { T } from "@/lib/constants/tables";
import type {
  Lecture,
  LectureListItem,
  LectureDetailData,
} from "@/lib/types/lectures";

// ── 강의 목록 (목록 페이지용 — 진도 합산) ──
export async function getLectures(): Promise<LectureListItem[]> {
  const user = await requireLectureAccess();
  const supabase = await createServerSupabaseClient();

  const [lecturesResult, progressResult] = await Promise.all([
    supabase
      .from(T.lectures)
      .select(
        "id, title, description, level, lecture_id, thumbnail_url, duration, instructor_name, order_index, is_active"
      )
      .eq("is_active", true)
      .order("order_index", { ascending: true }),
    supabase
      .from(T.lecture_progress)
      .select("lecture_id, progress_percentage, completed_at")
      .eq("user_id", user.id),
  ]);

  const lectures = lecturesResult.data || [];
  const progressMap = new Map(
    (progressResult.data || []).map((p) => [
      p.lecture_id,
      {
        progress_percentage: Number(p.progress_percentage) || 0,
        is_completed: !!p.completed_at,
      },
    ])
  );

  return lectures.map((l) => ({
    ...l,
    progress_percentage: progressMap.get(l.id)?.progress_percentage ?? 0,
    is_completed: progressMap.get(l.id)?.is_completed ?? false,
  }));
}

// ── 강의 상세 (영상 페이지 초기 데이터) ──
export async function getLectureDetail(
  lectureId: string
): Promise<LectureDetailData | null> {
  const user = await requireLectureAccess();
  const supabase = await createServerSupabaseClient();

  const [lectureResult, materialsResult, progressResult, allLecturesResult] =
    await Promise.all([
      supabase.from(T.lectures).select("*").eq("id", lectureId).single(),
      supabase
        .from(T.lecture_materials)
        .select("*")
        .eq("lecture_id", lectureId)
        .order("created_at", { ascending: false }),
      supabase
        .from(T.lecture_progress)
        .select("*")
        .eq("user_id", user.id)
        .eq("lecture_id", lectureId)
        .maybeSingle(),
      supabase
        .from(T.lectures)
        .select(
          "id, title, description, level, lecture_id, thumbnail_url, duration, instructor_name, order_index, is_active"
        )
        .eq("is_active", true)
        .order("order_index", { ascending: true }),
    ]);

  if (lectureResult.error || !lectureResult.data) {
    return null;
  }

  // 모든 강의의 진도도 함께 병합 (사이드 재생목록에 진도 표시)
  const allLectures = allLecturesResult.data || [];
  let allProgressMap = new Map<string, { progress_percentage: number; is_completed: boolean }>();
  if (allLectures.length > 0) {
    const { data: allProgress } = await supabase
      .from(T.lecture_progress)
      .select("lecture_id, progress_percentage, completed_at")
      .eq("user_id", user.id)
      .in(
        "lecture_id",
        allLectures.map((l) => l.id)
      );
    allProgressMap = new Map(
      (allProgress || []).map((p) => [
        p.lecture_id,
        {
          progress_percentage: Number(p.progress_percentage) || 0,
          is_completed: !!p.completed_at,
        },
      ])
    );
  }

  const allLecturesWithProgress: LectureListItem[] = allLectures.map((l) => ({
    ...l,
    progress_percentage: allProgressMap.get(l.id)?.progress_percentage ?? 0,
    is_completed: allProgressMap.get(l.id)?.is_completed ?? false,
  }));

  return {
    lecture: lectureResult.data as Lecture,
    materials: materialsResult.data || [],
    progress: progressResult.data || null,
    allLectures: allLecturesWithProgress,
  };
}

// ── 진도 저장 (영상 시청 중 호출) ──
export async function updateLectureProgress(params: {
  lectureId: string;
  lastPosition: number;
  watchedSeconds: number;
  totalSeconds: number;
  playbackSpeed?: number;
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireLectureAccess();
  const supabase = await createServerSupabaseClient();

  const progressPercentage =
    params.totalSeconds > 0
      ? Math.min(100, (params.watchedSeconds / params.totalSeconds) * 100)
      : 0;

  const isCompleted = progressPercentage >= 95;

  const { error } = await supabase
    .from(T.lecture_progress)
    .upsert(
      {
        user_id: user.id,
        lecture_id: params.lectureId,
        last_position: params.lastPosition,
        watched_seconds: params.watchedSeconds,
        total_seconds: params.totalSeconds,
        progress_percentage: progressPercentage,
        playback_speed: params.playbackSpeed ?? 1.0,
        last_watched_at: new Date().toISOString(),
        ...(isCompleted ? { completed_at: new Date().toISOString() } : {}),
      },
      { onConflict: "user_id,lecture_id" }
    );

  if (error) return { success: false, error: error.message };
  return { success: true };
}
