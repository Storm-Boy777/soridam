import { redirect } from "next/navigation";
import { getAdminUser, hasStudyAdminAccess } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminInquiryToast } from "@/components/admin/admin-inquiry-toast";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 관리자 OR study_admin_access(스터디 권한 위임) 보유자만 진입 허용.
  // 비관리자의 경로별 차단(/admin/study-group 외 금지)은 middleware가 담당.
  const [admin, studyAdminAccess] = await Promise.all([
    getAdminUser(),
    hasStudyAdminAccess(),
  ]);
  if (!admin && !studyAdminAccess) redirect("/dashboard");
  const isAdmin = !!admin;

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar hasStudyAdminAccess={studyAdminAccess} isAdmin={isAdmin} />
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
      {/* 미답변 문의 토스트 (세션당 1회) — 관리자에게만 */}
      {isAdmin && <AdminInquiryToast />}
    </div>
  );
}
