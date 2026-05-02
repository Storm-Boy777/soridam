"use client";

/**
 * 오픽 스터디 마이페이지 — 클라이언트 컴포넌트
 *
 * BP 모음은 V2 기능 (사용자가 다른 멤버 답변에서 마음에 든 표현 저장).
 * 현재는 빈 상태 또는 "준비 중" 안내.
 */

import { MyPage } from "../_screens/EntryScreens";

interface Props {
  userName: string;
  userInitial: string;
  groupLabel: string;
  historyItems: Array<{ name: string; date: string; done: boolean }>;
}

export function OpicStudyMyClient({
  userName,
  userInitial,
  groupLabel,
  historyItems,
}: Props) {
  return (
    <div style={{ minHeight: "100dvh", display: "flex" }}>
      <MyPage
        userName={userName}
        userInitial={userInitial}
        groupLabel={groupLabel}
        bps={[]} // V2: 사용자가 저장한 BP 모음
        history={historyItems}
        liveMode={true}
      />
    </div>
  );
}
