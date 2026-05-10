// 강의 상세 (영상 재생) 페이지
// 권한: requireLectureAccess (admin OR lecture_access)

import { notFound } from "next/navigation";
import { requireLectureAccess } from "@/lib/auth";
import { getLectureDetail } from "@/lib/actions/lectures";
import { LectureDetailContent } from "@/components/lectures/lecture-detail-content";

export const metadata = {
  title: "강의 시청 | 소리담",
};

export default async function LectureDetailPage({
  params,
}: {
  params: Promise<{ lectureId: string }>;
}) {
  // 권한 게이트
  await requireLectureAccess();

  const { lectureId } = await params;
  const data = await getLectureDetail(lectureId);

  if (!data) {
    notFound();
  }

  return <LectureDetailContent initialData={data} />;
}
