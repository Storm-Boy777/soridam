// AI 코치 — Step 3: 학습 룸 (마이크로 사이클)

import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { getSessionDetail } from "@/lib/actions/coaching";
import { QUESTION_TYPE_LABELS } from "@/lib/types/coaching";
import { LearnRoom } from "@/components/coaching/learn-room";

interface Props {
  params: Promise<{ sessionId: string }>;
}

export const metadata = {
  title: "AI 코치 — 학습 룸",
};

async function LearnLoader({ sessionId }: { sessionId: string }) {
  const result = await getSessionDetail(sessionId);
  if (result.error || !result.data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 text-foreground-secondary">
        {result.error ?? "세션을 불러올 수 없습니다"}
      </div>
    );
  }
  return <LearnRoom initialDetail={result.data} />;
}

export default async function CoachingLearnPage({ params }: Props) {
  const { sessionId } = await params;
  if (!sessionId) redirect("/coaching");

  // 헤더용으로 라이트하게 한 번 더 (Suspense fallback에 표시)
  const detail = await getSessionDetail(sessionId);
  if (!detail.data) redirect("/coaching");

  const typeLabel = QUESTION_TYPE_LABELS[detail.data.session.question_type] ?? detail.data.session.question_type;
  const surveyMark = detail.data.session.survey_type === "공통형" ? "🌪️" : "";

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link
            href={`/coaching/topic/${detail.data.session.question_type}`}
            className="flex items-center gap-1 rounded-full px-2 py-1 text-sm text-foreground-secondary hover:bg-surface-hover"
          >
            <ArrowLeft className="h-4 w-4" />
            토픽 선택
          </Link>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-foreground">
              {typeLabel} × {detail.data.session.topic} {surveyMark}
            </h1>
            <p className="text-xs text-foreground-muted">
              {detail.data.session.attempt_count}회차 진행 중 · {detail.data.session.status === "mastered" ? "졸업" : "진행"}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 sm:py-6">
        <Suspense
          fallback={
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            </div>
          }
        >
          <LearnLoader sessionId={sessionId} />
        </Suspense>
      </main>
    </div>
  );
}
