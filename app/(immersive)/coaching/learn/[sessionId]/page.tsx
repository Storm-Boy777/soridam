// 스피킹 코치 — 학습 룸 (마이크로 사이클)

import { redirect } from "next/navigation";
import { getSessionDetail } from "@/lib/actions/coaching";
import { QUESTION_TYPE_LABELS } from "@/lib/types/coaching";
import { LearnRoom } from "@/components/coaching/learn-room";
import { ImmersiveHeader } from "@/components/layout/immersive-header";

interface Props {
  params: Promise<{ sessionId: string }>;
}

export const metadata = {
  title: "스피킹 코치 — 학습 룸",
};

export default async function CoachingLearnPage({ params }: Props) {
  const { sessionId } = await params;
  if (!sessionId) redirect("/coaching");

  // 세션 상세 1회 조회 — 헤더 + 학습 룸 초기 데이터로 공유 (중복 조회 제거)
  const detail = await getSessionDetail(sessionId);
  if (!detail.data) redirect("/coaching");

  const s = detail.data.session;
  const typeLabel = QUESTION_TYPE_LABELS[s.question_type] ?? s.question_type;
  const statusText =
    (s.survey_type === "공통형" ? "돌발 · " : "") +
    (s.status === "mastered" ? "졸업 완료" : `${s.attempt_count}회차 진행 중`);

  return (
    <div className="min-h-dvh bg-background">
      <ImmersiveHeader
        title={`${typeLabel} × ${s.topic}`}
        subtitle={statusText}
        backHref={`/coaching?type=${s.question_type}`}
      />

      <main className="mx-auto max-w-5xl px-4 py-5 sm:py-6">
        <LearnRoom initialDetail={detail.data} />
      </main>
    </div>
  );
}
