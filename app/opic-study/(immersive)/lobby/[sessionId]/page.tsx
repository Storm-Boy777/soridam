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

  // 성능 최적화 — 멤버+profile 매핑을 RPC로 1 RTT (RPC 066, FK 분리 해소)
  const { data: rawMembers } = await supabase.rpc(
    "get_opic_study_group_members",
    { p_group_id: session.group_id }
  );

  const colors: Array<"a" | "b" | "c" | "d"> = ["a", "b", "c", "d"];
  const memberList = ((rawMembers ?? []) as Array<{
    user_id: string;
    display_name: string;
  }>).map((m, idx) => ({
    key: colors[idx % 4],
    userId: m.user_id,
    name: m.display_name,
    isMe: m.user_id === user.id,
  }));

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
