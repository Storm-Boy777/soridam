// Talklish · 스터디 준비 — 멤버가 월/수/금 수업 자료를 직접 생성·관리
// talklish/layout.tsx 가 hasStudyAdminAccess() 게이트 + 폰트 변수를 일원화한다.

import { TalklishManageClient } from "@/components/study-group/talklish/manage-client";

export const metadata = {
  title: "Talklish · 스터디 준비 | 소리담",
};

export default function TalklishManagePage() {
  return <TalklishManageClient />;
}
