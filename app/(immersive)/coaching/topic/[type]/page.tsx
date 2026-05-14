// AI 코치 — Step 2: 토픽 선택 (선택형 / 공통형 그룹핑)

import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { getTopicsByType } from "@/lib/actions/coaching";
import { QUESTION_TYPES, QUESTION_TYPE_LABELS } from "@/lib/types/coaching";
import type { QuestionType } from "@/lib/types/coaching";
import { TopicSelector } from "@/components/coaching/topic-selector";

interface Props {
  params: Promise<{ type: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { type } = await params;
  const label = QUESTION_TYPE_LABELS[type as QuestionType] ?? type;
  return { title: `AI 코치 — ${label}` };
}

async function TopicLoader({ type }: { type: QuestionType }) {
  const result = await getTopicsByType(type);
  if (result.error || !result.data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 text-foreground-secondary">
        {result.error ?? "토픽을 불러올 수 없습니다"}
      </div>
    );
  }
  return <TopicSelector type={type} initialTopics={result.data} />;
}

export default async function CoachingTopicPage({ params }: Props) {
  const { type: typeParam } = await params;
  const type = typeParam as QuestionType;

  if (!QUESTION_TYPES.includes(type)) {
    redirect("/coaching");
  }

  const label = QUESTION_TYPE_LABELS[type];

  return (
    <div className="min-h-dvh bg-background">
      {/* Immersive 헤더 */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link
            href="/coaching"
            className="flex items-center gap-1 rounded-full px-2 py-1 text-sm text-foreground-secondary hover:bg-surface-hover"
          >
            <ArrowLeft className="h-4 w-4" />
            돌아가기
          </Link>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-foreground">{label}</h1>
            <p className="text-xs text-foreground-muted">주제를 선택하세요</p>
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
          <TopicLoader type={type} />
        </Suspense>
      </main>
    </div>
  );
}
