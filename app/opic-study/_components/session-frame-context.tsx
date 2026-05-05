"use client";

/**
 * 세션 룸 Frame Context
 *
 * Shell 컴포넌트가 Provider로 감싸고, 자식 Step 컴포넌트들이
 * useSessionFrame() 으로 presence/연결 상태에 접근.
 *
 * 별도 파일로 분리 — SetupSteps/LoopSteps/Step7AndEdge에서
 * OpicStudySessionClient를 import하지 않고 안전하게 사용.
 */

import { createContext, useContext } from "react";

export interface SessionFrameMember {
  userId: string;
  name: string;
  initial: string;
  key: "a" | "b" | "c" | "d";
}

export interface SessionFrameContextValue {
  onlineUserIds: Set<string>;
  members: SessionFrameMember[];
  connectionState: "connected" | "reconnecting" | "error";
  onlineMode: boolean;
  /** Immersive layout 안에서 사용 — PcStepShell이 자체 headbar 숨김 (ImmersiveHeader가 대체) */
  isImmersiveLayout?: boolean;
}

export const SessionFrameContext =
  createContext<SessionFrameContextValue | null>(null);

export function useSessionFrame(): SessionFrameContextValue | null {
  return useContext(SessionFrameContext);
}
