import type { ReactNode } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import {
  getAuthClaims,
  hasLectureAccess,
  hasStudyAdminAccess,
} from "@/lib/auth";

/**
 * 오픽 스터디 — 진입 페이지 layout
 *
 * 홈/마이페이지/이력 등에 적용. 메인 Navbar + Footer 포함하여
 * 사용자가 다른 모듈로 자유롭게 이동 가능.
 *
 * 세션 룸/입장 대기 등 immersive 라우트는 (immersive)/layout.tsx 사용.
 */
export default async function OpicStudyEntryLayout({
  children,
}: {
  children: ReactNode;
}) {
  // 권한 메뉴(강의/스터디 패널) 노출 판단 — 서버에서 1회 조회해 Navbar에 전달
  const [claims, hasLecAccess, hasPanelAccess] = await Promise.all([
    getAuthClaims(),
    hasLectureAccess(),
    hasStudyAdminAccess(),
  ]);
  const meta = (claims as Record<string, unknown>)?.user_metadata as
    | Record<string, string>
    | undefined;
  const serverAuth = claims
    ? {
        isLoggedIn: true,
        userName:
          meta?.display_name ?? meta?.full_name ?? meta?.name ?? "",
        isAdmin:
          ((claims as Record<string, unknown>)?.app_metadata as
            | Record<string, string>
            | undefined)?.role === "admin",
        hasLectureAccess: hasLecAccess,
        hasStudyAdminAccess: hasPanelAccess,
      }
    : {
        isLoggedIn: false,
        userName: "",
        isAdmin: false,
        hasLectureAccess: false,
        hasStudyAdminAccess: false,
      };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar serverAuth={serverAuth} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
