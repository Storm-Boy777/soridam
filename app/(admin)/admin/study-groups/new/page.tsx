/**
 * 관리자 — 새 오픽 스터디 그룹 생성
 */

import { NewStudyGroupForm } from "./_form";
import { getOpicStudySchedule } from "@/lib/actions/opic-study-schedule";
import type { GroupSchedule } from "@/lib/types/opic-study";

const FALLBACK_SCHEDULE: GroupSchedule = {
  days: [1, 2, 3, 4, 5],
  start_time: "07:40",
  end_time: "08:30",
  first_session_date: "2026-05-06",
  default_mode: "online",
};

export default async function NewStudyGroupPage() {
  const scheduleRes = await getOpicStudySchedule();
  const defaults = scheduleRes.data ?? FALLBACK_SCHEDULE;
  // OpicStudySchedule(timezone 포함) → GroupSchedule(timezone 없음)으로 정리
  const initialSchedule: GroupSchedule = {
    days: defaults.days,
    start_time: defaults.start_time,
    end_time: defaults.end_time,
    first_session_date: defaults.first_session_date,
    default_mode: defaults.default_mode ?? "online",
    day_modes: defaults.day_modes,
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">새 스터디 그룹 만들기</h1>
        <p className="mt-1 text-sm text-foreground-secondary">
          이름 · 운영 기간 · 일정 · 초기 멤버 등록
        </p>
      </div>

      <NewStudyGroupForm initialSchedule={initialSchedule} />
    </div>
  );
}
