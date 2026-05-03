"use client";

/**
 * 오픽 스터디 입장 대기실 — 클라이언트 wrapper
 *
 * V2: Supabase Realtime presence channel 통합 예정.
 * 현재는 정적 멤버 표시 + "세션 룸 입장" 버튼.
 */

import { MemberLobby } from "../_components/MemberLobby";

interface Props {
  sessionId: string;
  groupName: string;
  members: Array<{
    key: "a" | "b" | "c" | "d";
    userId: string;
    name: string;
    isMe: boolean;
  }>;
}

export function OpicStudyLobbyClient({ sessionId, groupName, members }: Props) {
  return (
    <MemberLobby sessionId={sessionId} groupName={groupName} members={members} />
  );
}
