// 오픽 IH 안정화 4주 커리큘럼 — 전용 뷰 페이지
// 권한: requireCoachingAccess (스피킹 코치 접근 권한자만)

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireCoachingAccess } from "@/lib/auth";
import { CurriculumView } from "@/components/coaching/curriculum-view";

export const metadata = {
  title: "오픽 IH 안정화 커리큘럼 | 소리담",
  description: "강지완 일타강사 강의 기반 4주 IH 안정화 셀프 스터디 커리큘럼",
};

export default async function CurriculumPage() {
  await requireCoachingAccess();

  return (
    <div className="pb-8 pt-1 sm:pt-2 lg:pt-0">
      <Link
        href="/coaching"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-foreground-secondary transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        스피킹 코치로 돌아가기
      </Link>
      <CurriculumView />
    </div>
  );
}
