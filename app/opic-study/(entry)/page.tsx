/**
 * 오픽 스터디 홈
 *
 * - 멤버: 활성 그룹 카드 + 다음 세션 + 종료 그룹 이력
 * - 비멤버 (활성/종료 그룹 0개): 신청 안내
 *
 * 디자인: docs/디자인/opic/project/hf-extra.jsx (HomeHifi)
 */

import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getMyActiveGroups, getMyClosedGroups } from "@/lib/actions/opic-study";
import { getOpicStudySchedule } from "@/lib/actions/opic-study-schedule";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { OpicStudyHomeClient } from "../_pages/OpicStudyHomeClient";
import type { OpicStudySchedule } from "@/lib/opic-study/schedule";

const FALLBACK_SCHEDULE: OpicStudySchedule = {
  days: [1, 2, 3, 4, 5],
  start_time: "07:40",
  end_time: "08:30",
  first_session_date: "2026-05-06",
  default_mode: "online",
  timezone: "Asia/Seoul",
};

export default async function OpicStudyHomePage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/opic-study");

  const [activeRes, closedRes, fallbackScheduleRes] = await Promise.all([
    getMyActiveGroups(),
    getMyClosedGroups(),
    getOpicStudySchedule(),
  ]);

  const fallbackSchedule = fallbackScheduleRes.data ?? FALLBACK_SCHEDULE;

  // 사용자 정보
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const userName =
    (meta?.display_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "회원";
  const userInitial = userName.charAt(0).toUpperCase();

  // 시험 D-day (user_metadata.exam_date 있을 때만)
  const examDate = (meta?.exam_date as string | undefined) ?? null;
  let examDday: number | null = null;
  if (examDate) {
    const ms = new Date(examDate).getTime() - Date.now();
    examDday = Math.ceil(ms / 86400_000);
  }

  // 오늘 날짜
  const today = new Date();
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const todayLabel = `${today.getMonth() + 1}월 ${today.getDate()}일 ${
    days[today.getDay()]
  }요일`;

  // 그룹 데이터 매핑
  const activeGroups = activeRes.data ?? [];
  const closedGroups = closedRes.data ?? [];

  const dayShort = ["일", "월", "화", "수", "목", "금", "토"];
  const formatScheduleMeta = (s: typeof activeGroups[0]["schedule"]) => {
    if (!s) return "";
    const days = s.days
      .slice()
      .sort((a, b) => a - b)
      .map((d) => dayShort[d])
      .join("·");
    return `매주 ${days} ${s.start_time}`;
  };

  const groupsForUi = [
    ...activeGroups.map((g) => {
      const scheduleMeta = formatScheduleMeta(g.schedule);
      return {
        id: g.id,
        name: g.name,
        meta: scheduleMeta
          ? `${scheduleMeta} · 멤버 ${g.member_count}명`
          : `멤버 ${g.member_count}명 · 세션 ${g.completed_session_count}회`,
        live: true,
      };
    }),
    ...closedGroups.map((g) => ({
      id: g.id,
      name: g.name,
      meta: `종료 · ${g.start_date.slice(5).replace("-", "/")} ~ ${g.end_date.slice(5).replace("-", "/")}`,
      live: false,
    })),
  ];

  // 활성 세션이 있는 그룹의 첫 번째 (입장 버튼 대상)
  const activeGroup = activeGroups.find((g) => g.active_session_count > 0);
  const targetGroup = activeGroup ?? activeGroups[0];
  const nextSessionLabel = activeGroup
    ? "진행 중인 세션 있음"
    : activeGroups.length > 0
      ? "오늘 새 세션 시작 가능"
      : "예정된 세션 없음";

  // 멤버 홈에서 사용할 schedule — 첫 활성 그룹의 일정 우선, 없으면 fallback(글로벌 default)
  const schedule = targetGroup?.schedule ?? fallbackSchedule;

  // 다음 세션의 실제 멤버 정보 조회 + 활성 세션 ID 조회
  let nextSessionMemberCount = 0;
  let nextSessionMembers: Array<{
    key: "a" | "b" | "c" | "d";
    initial: string;
    userId: string;
  }> = [];
  let activeSessionId: string | null = null;
  if (targetGroup) {
    const supabase = await createServerSupabaseClient();
    const { data: rawMembers } = await supabase
      .from("study_group_members")
      .select("user_id, display_name")
      .eq("group_id", targetGroup.id)
      .order("joined_at", { ascending: true });

    const userIds = (rawMembers ?? []).map((m) => m.user_id as string);
    const { data: profiles } = userIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, email, display_name")
          .in("id", userIds)
      : { data: [] };
    const profileMap = new Map((profiles ?? []).map((p) => [p.id as string, p]));

    const colors: Array<"a" | "b" | "c" | "d"> = ["a", "b", "c", "d"];
    nextSessionMemberCount = rawMembers?.length ?? 0;
    nextSessionMembers = (rawMembers ?? []).slice(0, 4).map((m, idx) => {
      const userId = m.user_id as string;
      const p = profileMap.get(userId);
      const name =
        (m.display_name as string | null) ??
        (p?.display_name as string | null) ??
        (p?.email as string | undefined)?.split("@")[0] ??
        "M";
      return {
        key: colors[idx % 4],
        initial: name.charAt(0).toUpperCase(),
        userId,
      };
    });

    // 활성 세션 ID 조회 (presence channel 식별용)
    if (activeGroup) {
      const { data: activeSession } = await supabase
        .from("opic_study_sessions")
        .select("id")
        .eq("group_id", targetGroup.id)
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      activeSessionId = (activeSession?.id as string | undefined) ?? null;
    }
  }

  return (
    <OpicStudyHomeClient
      user={{
        name: userName,
        initial: userInitial,
        todayLabel,
        nextSessionTime: nextSessionLabel,
      }}
      groups={groupsForUi}
      hasGroups={activeGroups.length + closedGroups.length > 0}
      hasActiveGroup={activeGroups.length > 0}
      activeGroupId={activeGroup?.id ?? activeGroups[0]?.id}
      hasActiveSession={!!activeGroup}
      nextSessionMemberCount={nextSessionMemberCount}
      nextSessionMembers={nextSessionMembers}
      schedule={schedule}
      examDday={examDday}
      activeSessionId={activeSessionId}
      currentUserId={user.id}
    />
  );
}
