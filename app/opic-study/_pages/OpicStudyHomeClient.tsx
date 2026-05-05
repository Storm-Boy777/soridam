"use client";

/**
 * 오픽 스터디 홈 — 클라이언트 wrapper
 *
 * - 그룹 0개 → 비멤버 안내 페이지 (NonMemberLanding)
 * - 그룹 1개+ → 멤버 홈 (MemberHome)
 *
 * 입장 / 세션 생성 로직은 MemberHome 안의 SessionCard에서 처리.
 */

import { NonMemberLanding } from "../_components/NonMemberLanding";
import { MemberHome } from "../_components/MemberHome";
import type { OpicStudySchedule } from "@/lib/opic-study/schedule";

interface Props {
  user: {
    name: string;
    initial: string;
    todayLabel: string;
    nextSessionTime: string;
  };
  groups: Array<{
    id: string;
    name: string;
    meta: string;
    live: boolean;
  }>;
  hasGroups: boolean;
  hasActiveGroup: boolean;
  activeGroupId?: string;
  hasActiveSession: boolean;
  nextSessionMemberCount?: number;
  nextSessionMembers?: Array<{
    key: "a" | "b" | "c" | "d";
    initial: string;
    userId: string;
  }>;
  schedule: OpicStudySchedule;
  /** 학습 통계 — 마지막 참여 / 누적 답변 / 시험 D-day */
  learnStats: {
    lastParticipationDaysAgo: number | null;
    totalAnswers: number | null;
    examDday: number | null;
  };
  activeSessionId: string | null;
  currentUserId: string;
}

export function OpicStudyHomeClient({
  user,
  groups,
  hasGroups,
  activeGroupId,
  hasActiveSession,
  nextSessionMemberCount,
  nextSessionMembers,
  schedule,
  learnStats,
  activeSessionId,
  currentUserId,
}: Props) {
  // 비멤버 안내
  if (!hasGroups) {
    return <NonMemberLanding userName={user.name} todayLabel={user.todayLabel} />;
  }

  // 멤버 홈 — 자연 스크롤 (외곽 layout의 <main flex-1> 활용)
  return (
    <MemberHome
      user={{
        name: user.name,
        initial: user.initial,
        todayLabel: user.todayLabel,
      }}
      groups={groups}
      schedule={schedule}
      activeGroupId={activeGroupId}
      hasActiveSession={hasActiveSession}
      nextSessionMembers={nextSessionMembers}
      nextSessionMemberCount={nextSessionMemberCount}
      activeSessionId={activeSessionId}
      currentUserId={currentUserId}
      learnStats={learnStats}
    />
  );
}
