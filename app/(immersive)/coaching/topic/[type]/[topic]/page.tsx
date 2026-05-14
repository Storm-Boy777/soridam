// AI 코치 — Step 2.5: 토픽 안 질문 리스트 (사용자가 질문 직접 선택)

import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { getQuestionsByTopicAndType } from "@/lib/actions/coaching";
import { QUESTION_TYPES, QUESTION_TYPE_LABELS } from "@/lib/types/coaching";
import type { QuestionType } from "@/lib/types/coaching";
import { QuestionList } from "@/components/coaching/question-list";

interface Props {
  params: Promise<{ type: string; topic: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { type, topic } = await params;
  const label = QUESTION_TYPE_LABELS[type as QuestionType] ?? type;
  return { title: `AI 코치 — ${label} × ${decodeURIComponent(topic)}` };
}

async function ListLoader({ type, topic }: { type: QuestionType; topic: string }) {
  const result = await getQuestionsByTopicAndType(type, topic);
  if (result.error || !result.data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 text-foreground-secondary">
        {result.error ?? "질문을 불러올 수 없습니다"}
      </div>
    );
  }
  return <QuestionList payload={result.data} />;
}

export default async function CoachingTopicQuestionsPage({ params }: Props) {
  const { type: typeParam, topic: topicParam } = await params;
  const type = typeParam as QuestionType;
  const topic = decodeURIComponent(topicParam);

  if (!QUESTION_TYPES.includes(type)) redirect("/coaching");

  const label = QUESTION_TYPE_LABELS[type];

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link
            href={`/coaching/topic/${type}`}
            className="flex items-center gap-1 rounded-full px-2 py-1 text-sm text-foreground-secondary hover:bg-surface-hover"
          >
            <ArrowLeft className="h-4 w-4" />
            토픽 선택
          </Link>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-foreground">
              {label} × {topic}
            </h1>
            <p className="text-xs text-foreground-muted">질문을 선택하세요. 같은 질문에 여러 회차 사이클로 학습합니다.</p>
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
          <ListLoader type={type} topic={topic} />
        </Suspense>
      </main>
    </div>
  );
}
