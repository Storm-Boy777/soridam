// 관리자 스터디 모임 관리 — 진입 게이트 (lectures 패턴)
// hasStudyAdminAccess(관리자 OR study_admin_access 부여자)가 아니면 /admin 으로 redirect.

import { requireStudyAdminAccess } from "@/lib/auth";

export default async function AdminStudyGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireStudyAdminAccess();
  return <>{children}</>;
}
