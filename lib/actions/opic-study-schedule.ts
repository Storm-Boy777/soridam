"use server";

/**
 * 오픽 스터디 일정 — Server Actions
 *
 * - 조회: 모든 사용자 (RLS: anyone can read settings)
 * - 변경: admin only + 감사 로그
 */

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/auth";
import { T } from "@/lib/constants/tables";
import type { OpicStudySchedule } from "@/lib/opic-study/schedule";

const SETTINGS_KEY = "opic_study_schedule";

const DEFAULT_SCHEDULE: OpicStudySchedule = {
  days: [1, 2, 3, 4, 5],
  start_time: "07:40",
  end_time: "08:30",
  first_session_date: "2026-05-06",
  default_mode: "online",
  timezone: "Asia/Seoul",
};

interface ActionResult<T = null> {
  data?: T;
  error?: string;
}

// ============================================================
// 조회 (공개)
// ============================================================

export async function getOpicStudySchedule(): Promise<
  ActionResult<OpicStudySchedule>
> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from(T.system_settings)
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();

    if (error) return { error: "일정 조회 실패" };

    const value = (data?.value as OpicStudySchedule | undefined) ?? null;
    return { data: value ?? DEFAULT_SCHEDULE };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "일정 조회 실패",
    };
  }
}

// ============================================================
// 업데이트 (admin only)
// ============================================================

export async function updateOpicStudySchedule(
  patch: Partial<OpicStudySchedule>
): Promise<ActionResult<OpicStudySchedule>> {
  try {
    const { supabase, userId, userEmail } = await requireAdmin();

    // 변경 전 값
    const { data: before } = await supabase
      .from(T.system_settings)
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();

    const current = (before?.value as OpicStudySchedule | undefined) ?? DEFAULT_SCHEDULE;
    const next: OpicStudySchedule = { ...current, ...patch };

    // 검증
    if (!Array.isArray(next.days) || next.days.some((d) => d < 0 || d > 6)) {
      return { error: "운영 요일이 유효하지 않습니다 (0~6)" };
    }
    if (next.days.length === 0) {
      return { error: "운영 요일을 1개 이상 선택해주세요" };
    }
    if (!/^\d{2}:\d{2}$/.test(next.start_time)) {
      return { error: "시작 시간 형식이 올바르지 않습니다 (HH:MM)" };
    }
    if (!/^\d{2}:\d{2}$/.test(next.end_time)) {
      return { error: "종료 시간 형식이 올바르지 않습니다 (HH:MM)" };
    }
    if (next.start_time >= next.end_time) {
      return { error: "종료 시간이 시작 시간보다 늦어야 합니다" };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(next.first_session_date)) {
      return { error: "첫 시작일 형식이 올바르지 않습니다 (YYYY-MM-DD)" };
    }

    // upsert
    const { error: upsertErr } = await supabase
      .from(T.system_settings)
      .upsert(
        { key: SETTINGS_KEY, value: next, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
    if (upsertErr) return { error: "일정 저장 실패" };

    // 감사 로그
    await supabase.from(T.admin_audit_log).insert({
      admin_id: userId,
      admin_email: userEmail,
      action: "update_opic_study_schedule",
      target_type: "system_settings",
      target_id: SETTINGS_KEY,
      details: {
        before: current,
        after: next,
      },
    });

    return { data: next };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "일정 저장 실패",
    };
  }
}
