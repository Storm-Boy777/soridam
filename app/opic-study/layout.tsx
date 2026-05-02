import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import "./_styles/opic-study.css";

/**
 * 오픽 스터디 모듈 레이아웃
 *
 * - 별도 디자인 시스템 (BP 디렉션) — `_styles/opic-study.css` 격리
 * - 전체 모듈 인증 필수 (멤버십은 페이지별로 추가 검증)
 * - Navbar / Footer 없음 (디자인 자체 헤더 사용)
 */
export default async function OpicStudyLayout({ children }: { children: ReactNode }) {
  const user = await getUser();
  if (!user) {
    redirect("/login?next=/opic-study");
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#ede9e0", // 디자인 캔버스 외곽 배경
        display: "flex",
        flexDirection: "column",
      }}
    >
      {children}
    </div>
  );
}
