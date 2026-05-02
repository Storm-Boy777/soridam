import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import "./_styles/opic-study.css";

/**
 * 오픽 스터디 모듈 외곽 layout
 *
 * - 별도 디자인 시스템 (BP 디렉션) — `_styles/opic-study.css` 격리
 * - 전체 모듈 인증 필수 (멤버십은 페이지별로 추가 검증)
 * - 진입 페이지 (홈/마이/이력) → (entry)/layout.tsx (Navbar 포함)
 * - Immersive 페이지 (세션/lobby/preview) → (immersive)/layout.tsx (Navbar 없음)
 */
export default async function OpicStudyLayout({ children }: { children: ReactNode }) {
  const user = await getUser();
  if (!user) {
    redirect("/login?next=/opic-study");
  }

  return <>{children}</>;
}
