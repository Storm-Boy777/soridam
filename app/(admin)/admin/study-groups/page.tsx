/**
 * 관리자 — 오픽 스터디 그룹 목록
 *
 * 설계: docs/설계/오픽스터디.md (관리자 페이지 섹션)
 */

import { listStudyGroups } from "@/lib/actions/admin/study-groups";
import { getOpicStudySchedule } from "@/lib/actions/opic-study-schedule";
import { GroupsListClient } from "./_list-client";
import { ScheduleCard } from "./_schedule-card";
import type { OpicStudySchedule } from "@/lib/opic-study/schedule";

const FALLBACK_SCHEDULE: OpicStudySchedule = {
  days: [1, 2, 3, 4, 5],
  start_time: "07:40",
  end_time: "08:30",
  first_session_date: "2026-05-06",
  default_mode: "online",
  timezone: "Asia/Seoul",
};

export default async function AdminStudyGroupsPage() {
  const [groupsRes, scheduleRes] = await Promise.all([
    listStudyGroups(),
    getOpicStudySchedule(),
  ]);

  const groups = groupsRes.data ?? [];
  const schedule = scheduleRes.data ?? FALLBACK_SCHEDULE;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <ScheduleCard schedule={schedule} />
      <GroupsListClient initialGroups={groups} embedded />
    </div>
  );
}
