/**
 * 오픽 스터디 마이페이지
 *
 * - 사용자 프로필
 * - 학습한 콤보 이력 (그룹 단위 합산)
 * - BP 모음 (TODO: 실제 데이터 모델 정의 — 일단 빈 상태)
 *
 * 디자인: docs/디자인/opic/project/hf-extra.jsx (MyHifi)
 */

import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import {
  getMyActiveGroups,
  getMyClosedGroups,
  getGroupHistory,
} from "@/lib/actions/opic-study";
import { OpicStudyMyClient } from "../_pages/OpicStudyMyClient";

export default async function OpicStudyMyPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/opic-study/my");

  // 사용자 정보
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const userName =
    (meta?.display_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "회원";
  const userInitial = userName.charAt(0).toUpperCase();

  // 그룹 + 학습 이력
  const [activeRes, closedRes] = await Promise.all([
    getMyActiveGroups(),
    getMyClosedGroups(),
  ]);
  const activeGroups = activeRes.data ?? [];
  const closedGroups = closedRes.data ?? [];

  // 활성 그룹 우선, 없으면 종료 그룹 사용
  const primaryGroup = activeGroups[0] ?? closedGroups[0];

  // 학습 이력 (활성 그룹 기준)
  let historyItems: Array<{ name: string; date: string; done: boolean }> = [];
  let totalSessions = 0;

  if (primaryGroup) {
    const historyRes = await getGroupHistory(primaryGroup.id);
    const sessions = historyRes.data ?? [];
    totalSessions = sessions.filter((s) => s.status === "completed").length;

    historyItems = sessions
      .filter((s) => s.status === "completed")
      .slice(0, 10)
      .map((s) => {
        const dateStr = s.ended_at ?? s.started_at;
        const d = new Date(dateStr);
        return {
          name: `${s.selected_topic ?? "(미선택)"} · ${primaryGroup.target_level}`,
          date: `${d.getMonth() + 1}/${d.getDate()}`,
          done: true,
        };
      });
  }

  const groupLabel = primaryGroup
    ? `${primaryGroup.name} · ${totalSessions}회 함께함`
    : "참여한 스터디 없음";

  return (
    <OpicStudyMyClient
      userName={userName}
      userInitial={userInitial}
      groupLabel={groupLabel}
      historyItems={historyItems}
    />
  );
}
