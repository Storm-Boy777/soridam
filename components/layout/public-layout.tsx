import { Navbar } from "./navbar";
import { Footer } from "./footer";
import {
  getAuthClaims,
  hasLectureAccess,
  hasStudyPanelAccess,
} from "@/lib/auth";

export async function PublicLayout({ children }: { children: React.ReactNode }) {
  // 권한 메뉴(강의/스터디 패널) 노출 판단 — 서버에서 1회 조회해 Navbar에 전달
  // (Navbar 클라이언트 fallback은 권한을 못 가져오므로 메뉴가 누락됨)
  const [claims, hasLecAccess, hasPanelAccess] = await Promise.all([
    getAuthClaims(),
    hasLectureAccess(),
    hasStudyPanelAccess(),
  ]);
  const meta = (claims as Record<string, unknown>)?.user_metadata as
    | Record<string, string>
    | undefined;
  const serverAuth = claims
    ? {
        isLoggedIn: true,
        userName: meta?.display_name || meta?.full_name || meta?.name || "",
        isAdmin:
          ((claims as Record<string, unknown>)?.app_metadata as
            | Record<string, string>
            | undefined)?.role === "admin",
        hasLectureAccess: hasLecAccess,
        hasStudyPanelAccess: hasPanelAccess,
      }
    : {
        isLoggedIn: false,
        userName: "",
        isAdmin: false,
        hasLectureAccess: false,
        hasStudyPanelAccess: false,
      };

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <Navbar serverAuth={serverAuth} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
