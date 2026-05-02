/**
 * 오픽 스터디 — 학습 기록
 *
 * 활성 그룹의 완료 세션 timeline.
 * 디자인 와이어프레임: docs/설계/오픽스터디.md "세션 이력 페이지" 섹션
 */

import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import {
  getMyActiveGroups,
  getMyClosedGroups,
  getGroupHistory,
} from "@/lib/actions/opic-study";
import { OpicStudyHistoryClient } from "../_pages/OpicStudyHistoryClient";

export default async function OpicStudyHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/login?next=/opic-study/history");

  const params = await searchParams;
  const requestedGroupId = params.group;

  const [activeRes, closedRes] = await Promise.all([
    getMyActiveGroups(),
    getMyClosedGroups(),
  ]);
  const activeGroups = activeRes.data ?? [];
  const closedGroups = closedRes.data ?? [];
  const allGroups = [...activeGroups, ...closedGroups];

  if (allGroups.length === 0) {
    return <OpicStudyHistoryClient groups={[]} sessions={[]} selectedGroupId="" />;
  }

  // 선택된 그룹 (param 우선) 또는 첫 번째 활성/종료
  const selectedGroup =
    allGroups.find((g) => g.id === requestedGroupId) ?? allGroups[0];

  const historyRes = await getGroupHistory(selectedGroup.id);
  const sessions = historyRes.data ?? [];

  return (
    <OpicStudyHistoryClient
      groups={allGroups.map((g) => ({
        id: g.id,
        name: g.name,
        targetLevel: g.target_level,
      }))}
      sessions={sessions.map((s) => {
        const d = new Date(s.ended_at ?? s.started_at);
        return {
          id: s.id,
          dateLabel: `${d.getMonth() + 1}/${d.getDate()}`,
          topic: s.selected_topic ?? "(미선택)",
          category: s.selected_category ?? null,
          totalAnswers: s.total_answers,
          memberCount: s.member_count,
          status: s.status,
          memberHighlights: s.member_highlights,
        };
      })}
      selectedGroupId={selectedGroup.id}
    />
  );
}
