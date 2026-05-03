/**
 * 관리자 — 오픽 스터디 그룹 라우트 layout
 *
 * 목적: BpConfirmDialog가 사용하는 BP CSS 토큰(`--bp-surface`, `--bp-tc` 등)을
 *       이 라우트에만 한정해서 로드. 다른 admin 페이지엔 영향 없음.
 */

import "@/app/opic-study/_styles/opic-study.css";

export default function AdminStudyGroupsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
