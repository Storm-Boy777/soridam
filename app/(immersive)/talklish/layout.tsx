// Talklish · Editorial Studio 공통 레이아웃
// 폰트 변수 (Spectral, Manrope) 주입 + 권한 게이트 일원화.
// 진입(/study-group) + 월/수/금 라우트가 모두 이 레이아웃을 공유한다.

import { redirect } from "next/navigation";
import { Spectral, Manrope } from "next/font/google";
import { hasStudyAdminAccess } from "@/lib/auth";

const spectral = Spectral({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["italic", "normal"],
  variable: "--font-spectral",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata = {
  title: "Talklish · 스터디 진행 | 소리담",
};

export default async function StudyGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 권한 게이트 — 스터디 권한(study_admin_access) 미보유자는 / 로 redirect
  if (!(await hasStudyAdminAccess())) redirect("/");

  return (
    <div className={`${spectral.variable} ${manrope.variable} h-full`}>
      {children}
    </div>
  );
}
