"use client";

// 토픽 선택 — 선택형 / 공통형 그룹핑
// 유형별 탭(TypeBrowser) 내부에 임베드 — 클릭 시 콜백으로 상위에 알림 (네비게이션 X)

import { useQuery } from "@tanstack/react-query";
import { TOPIC_ICONS } from "@/components/reviews/submit/topic-pagination";
import { Folder, ListChecks, Shuffle, CheckCircle2, Loader2, TrendingUp } from "lucide-react";
import { getTopicsByType } from "@/lib/actions/coaching";
import type { QuestionType, TopicCard } from "@/lib/types/coaching";

interface Props {
  type: QuestionType;
  selectedTopic: string | null;
  onPickTopic: (topic: string) => void;
}

export function TopicSelector({ type, selectedTopic, onPickTopic }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["coaching-topics-by-type", type],
    queryFn: async () => {
      const r = await getTopicsByType(type);
      if (r.error) throw new Error(r.error);
      return r.data ?? { selective: [], common: [] };
    },
    staleTime: 0,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
      </div>
    );
  }

  const selective = data?.selective ?? [];
  const common = data?.common ?? [];

  return (
    <div className="space-y-5">
      {/* 빈도순 안내 */}
      <div className="flex items-start gap-2 rounded-xl bg-primary-50 px-3 py-2.5 text-xs leading-relaxed text-primary-700">
        <TrendingUp className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          주제는 <strong className="font-semibold">기출 빈도순</strong>으로 정렬돼 있어요. 자주
          나오는 위쪽 주제부터 학습하는 걸 추천해요.
        </span>
      </div>

      {/* 선택형 */}
      <section>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground-secondary">
          <ListChecks className="h-4 w-4 text-foreground-muted" />
          <span>선택형 ({selective.length}) — 백그라운드 서베이</span>
        </div>
        <TopicGrid topics={selective} selectedTopic={selectedTopic} onPick={onPickTopic} />
      </section>

      {/* 공통형 (돌발) */}
      <section>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground-secondary">
          <Shuffle className="h-4 w-4 text-foreground-muted" />
          <span>공통형 ({common.length}) — 돌발</span>
        </div>
        <TopicGrid topics={common} selectedTopic={selectedTopic} onPick={onPickTopic} />
      </section>
    </div>
  );
}

function TopicGrid({
  topics,
  selectedTopic,
  onPick,
}: {
  topics: TopicCard[];
  selectedTopic: string | null;
  onPick: (topic: string) => void;
}) {
  if (topics.length === 0) {
    return <p className="px-2 py-3 text-sm text-foreground-muted">결과 없음</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {topics.map((t) => {
        const mastered = t.user_progress?.mastered;
        const inProgress = t.user_progress?.in_progress_session_id;
        const active = selectedTopic === t.topic;
        const Icon = TOPIC_ICONS[t.topic] ?? Folder;
        return (
          <button
            key={t.topic}
            type="button"
            onClick={() => onPick(t.topic)}
            className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition ${
              active
                ? "border-primary-400 bg-primary-50 ring-1 ring-primary-200"
                : mastered
                  ? "border-primary-300 bg-primary-50 hover:border-primary-500"
                  : inProgress
                    ? "border-accent-300 bg-accent-50 hover:border-accent-500"
                    : "border-border bg-surface hover:border-primary-300 hover:bg-surface-hover"
            }`}
          >
            <Icon
              size={18}
              className={
                mastered
                  ? "text-primary-600"
                  : inProgress
                    ? "text-accent-600"
                    : "text-foreground-secondary"
              }
            />
            <span className="text-sm font-semibold text-foreground">{t.topic}</span>
            <div className="flex items-center gap-1 text-[10px] text-foreground-muted">
              {mastered ? (
                <span className="flex items-center gap-0.5 rounded-full bg-primary-100 px-1.5 py-0.5 font-semibold text-primary-700">
                  <CheckCircle2 className="h-3 w-3" />
                  졸업
                </span>
              ) : inProgress ? (
                <span className="rounded-full bg-accent-100 px-1.5 py-0.5 font-semibold text-accent-700">
                  진행중 {t.user_progress?.attempt_count ?? 0}회
                </span>
              ) : (
                <span>새 토픽</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
