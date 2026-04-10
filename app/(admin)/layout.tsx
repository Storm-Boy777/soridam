import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdminUser();
  if (!admin) redirect("/dashboard");

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      {/* 모바일 안내 */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 md:hidden">
        <p className="text-center text-sm text-foreground-secondary">
          관리자 페이지는 PC에서 이용해 주세요.
        </p>
      </div>
      {/* PC 메인 영역 — flex-row이므로 flex-1(너비 확장) + h-full(높이 채움) */}
      <main className="hidden flex-1 overflow-y-auto md:block">
        <div className="mx-auto max-w-5xl px-6 py-6">
          {children}
        </div>
      </main>
      {/* Toaster는 providers.tsx에서 전역 제공 */}
    </div>
  );
}
