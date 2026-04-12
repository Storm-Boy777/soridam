import { Suspense } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { getAuthClaims } from "@/lib/auth";
import { GradeNudgeBanner } from "@/components/ui/grade-nudge-banner";
import { AnnouncementBanner } from "@/components/ui/announcement-banner";
import { getActiveAnnouncements } from "@/lib/actions/announcements";
import { AdminInquiryToast } from "@/components/admin/admin-inquiry-toast";

// 공지사항 배너 로더
async function AnnouncementBannerLoader() {
  const announcements = await getActiveAnnouncements();
  if (announcements.length === 0) return null;
  return <AnnouncementBanner announcements={announcements} />;
}

// 비동기 서버 컴포넌트: getAuthClaims()로 로컬 JWT claims에서 등급 정보를 읽어 배너에 전달
// getAuthClaims()는 로컬 JWT 검증 (0ms, 네트워크 왕복 없음)
// ※ updateUser() 직후에는 JWT 갱신 전이라 이전 값이 나올 수 있으나,
//    마이페이지에서 updateUser 후 revalidatePath로 처리하므로 실사용에 영향 없음
async function GradeNudgeBannerLoader() {
  const claims = await getAuthClaims();
  const meta = (claims as Record<string, unknown>)?.user_metadata as Record<string, string> | undefined;
  const currentGrade = meta?.current_grade || "";
  const targetGrade = meta?.target_grade || "";
  return <GradeNudgeBanner currentGrade={currentGrade} targetGrade={targetGrade} />;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // getAuthClaims(): 로컬 JWT 검증 (0ms) — Navbar 깜빡임 제거를 위해 서버에서 인증 정보 전달
  const claims = await getAuthClaims();
  const meta = (claims as Record<string, unknown>)?.user_metadata as Record<string, string> | undefined;
  const serverAuth = claims
    ? {
        isLoggedIn: true,
        userName: meta?.display_name || meta?.full_name || meta?.name || "",
        isAdmin: ((claims as Record<string, unknown>)?.app_metadata as Record<string, string> | undefined)?.role === "admin",
      }
    : { isLoggedIn: false, userName: "", isAdmin: false };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar serverAuth={serverAuth} />
      {/* 공지사항 배너 — 관리자가 등록한 공지를 사용자에게 표시 */}
      <Suspense fallback={null}>
        <AnnouncementBannerLoader />
      </Suspense>
      {/* 등급 넛지 배너 — 목표 등급 미설정 시 표시 */}
      <Suspense fallback={null}>
        <GradeNudgeBannerLoader />
      </Suspense>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
      <Footer />
      {/* 관리자: 미답변 문의 토스트 (세션당 1회) */}
      {serverAuth.isAdmin && <AdminInquiryToast />}
    </div>
  );
}
