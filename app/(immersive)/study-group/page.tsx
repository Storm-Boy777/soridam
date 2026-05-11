// Talklish · Editorial Studio — 오프라인 영어 스터디 진행 화면
// 큰 모니터/TV에 띄워놓고 6명이 같이 보는 허브
// 권한: requireStudyPanelAccess — 관리자 또는 study_panel_members 등록 사용자

import { Spectral, Manrope } from "next/font/google";
import { requireStudyPanelAccess } from "@/lib/auth";
import { TalklishStudyPage } from "@/components/study-group/talklish/study-page";

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

export default async function StudyGroupPage() {
  // 권한 게이트 — 미등록 사용자는 / 로 redirect
  await requireStudyPanelAccess();

  return (
    <div className={`${spectral.variable} ${manrope.variable} h-full`}>
      <TalklishStudyPage />
    </div>
  );
}
