import { redirect } from "next/navigation";
import { getAdminUser, hasStudyAdminAccess } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminInquiryToast } from "@/components/admin/admin-inquiry-toast";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdminUser();
  if (!admin) redirect("/dashboard");

  // 사이드바 "스터디 모임" 메뉴 권한 체크 (lectures 패턴 — 090 마이그)
  const studyAdminAccess = await hasStudyAdminAccess();

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar hasStudyAdminAccess={studyAdminAccess} />
      {/* 모바일 안내 */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 md:hidden">
        <p className="text-center text-sm text-foreground-secondary">
          관리자 페이지는 PC에서 이용해 주세요.
        </p>
      </div>
      {/* PC 메인 영역 — flex-row이므로 flex-1(너비 확장) + h-full(높이 채움) */}
      <main className="hidden flex-1 overflow-y-scroll md:block">
        <div className="mx-auto max-w-5xl px-6 py-6">
          {children}
        </div>
      </main>
      {/* 미답변 문의 토스트 (세션당 1회) */}
      <AdminInquiryToast />
    </div>
  );
}
