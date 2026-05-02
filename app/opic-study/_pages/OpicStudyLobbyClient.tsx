"use client";

/**
 * 오픽 스터디 입장 대기실 — 클라이언트
 *
 * V2: Supabase Realtime presence channel 통합 예정.
 * 현재는 정적 멤버 표시 + "세션 룸 입장" 버튼.
 */

import { useRouter } from "next/navigation";
import { Lobby } from "../_screens/EntryScreens";

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
  const router = useRouter();

  // V2: Realtime presence로 in/out 상태 추적
  // 현재는 본인은 'me', 나머지는 'in' (서버 컴포넌트에서 모두 그룹 멤버)
  const lobbyMembers = members.map((m) => ({
    key: m.key,
    name: m.name,
    state: m.isMe ? ("me" as const) : ("in" as const),
  }));

  return (
    <div style={{ minHeight: "100dvh", display: "flex" }}>
      <Lobby
        groupName={groupName}
        members={lobbyMembers}
        liveMode
        onBack={() => router.push("/opic-study")}
        onPreview={() => router.push(`/opic-study/session/${sessionId}`)}
      />
    </div>
  );
}
