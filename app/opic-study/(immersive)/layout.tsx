import type { ReactNode } from "react";

/**
 * 오픽 스터디 — Immersive 라우트 layout
 *
 * 세션 룸 / 입장 대기 / 디자인 미리보기에 적용. Navbar/Footer 없이
 * 자체 헤더 (Shell + 디자인 헤더)만 사용. 디자인 캔버스 외곽 배경 유지.
 */
export default function OpicStudyImmersiveLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#ede9e0",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {children}
    </div>
  );
}
