/**
 * 오픽 스터디 — 입장 대기실 (Lobby)
 *
 * 세션 룸 진입 전, 멤버 모이기 단계.
 * V2: Realtime presence로 실시간 입장 표시 (지금은 정적 멤버 표시)
 *
 * 디자인: docs/디자인/opic/project/hf-extra.jsx (LobbyHifi)
 */

import { redirect, notFound } from "next/navigation";
import { getUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { OpicStudyLobbyClient } from "../../../_pages/OpicStudyLobbyClient";

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function OpicStudyLobbyPage({ params }: PageProps) {
  const { sessionId } = await params;

  const user = await getUser();
  if (!user) redirect(`/login?next=/opic-study/lobby/${sessionId}`);

  const supabase = await createServerSupabaseClient();

  // 세션 + 그룹 + 멤버 조회
  const { data: session } = await supabase
    .from("opic_study_sessions")
    .select(
      "id, group_id, status, step, study_groups!inner(name)"
    )
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) notFound();

  // 멤버십 확인
  const { data: membership } = await supabase
    .from("study_group_members")
    .select("id")
    .eq("group_id", session.group_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    redirect("/opic-study?reason=not-member");
  }

  // 세션이 이미 완료/포기 상태면 결과 페이지로
  if (session.status !== "active") {
    redirect(`/opic-study/session/${sessionId}`);
  }

  // 세션이 mode_select 단계가 아니면 (이미 진행 중) 세션 룸으로 직진
  if (session.step !== "mode_select") {
    redirect(`/opic-study/session/${sessionId}`);
  }

  // 그룹 멤버 + profile 조회 (FK 분리)
  const { data: rawMembers } = await supabase
    .from("study_group_members")
    .select("user_id, display_name")
    .eq("group_id", session.group_id);

  const memberUserIds = (rawMembers ?? []).map((m) => m.user_id as string);
  const { data: profiles } = memberUserIds.length > 0
    ? await supabase
        .from("profiles")
        .select("id, email, display_name")
        .in("id", memberUserIds)
    : { data: [] };
  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id as string, p])
  );

  const memberList = (rawMembers ?? []).map((m, idx) => {
    const colors: Array<"a" | "b" | "c" | "d"> = ["a", "b", "c", "d"];
    const color = colors[idx % 4];
    const userId = m.user_id as string;
    const p = profileMap.get(userId);
    const name =
      (m.display_name as string | null) ??
      (p?.display_name as string | null) ??
      (p?.email as string | undefined)?.split("@")[0] ??
      "멤버";
    return {
      key: color,
      userId,
      name,
      isMe: userId === user.id,
    };
  });

  const groupMeta = session.study_groups as unknown as {
    name: string;
  };

  return (
    <OpicStudyLobbyClient
      sessionId={sessionId}
      groupName={groupMeta.name}
      members={memberList}
    />
  );
}
