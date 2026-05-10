// 강의 목록 페이지
// 권한: requireLectureAccess (admin OR lecture_access)

import { Suspense } from "react";
import { requireLectureAccess } from "@/lib/auth";
import { getLectures } from "@/lib/actions/lectures";
import { LecturesContent } from "@/components/lectures/lectures-content";

export const metadata = {
  title: "강의 | 소리담",
  description: "OPIc AL 강의",
};

async function LecturesLoader() {
  const lectures = await getLectures();
  return <LecturesContent initialLectures={lectures} />;
}

export default async function LecturesPage() {
  // 권한 게이트 — 실패 시 redirect("/")
  await requireLectureAccess();

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-foreground-muted">
          강의 목록을 불러오는 중…
        </div>
      }
    >
      <LecturesLoader />
    </Suspense>
  );
}
