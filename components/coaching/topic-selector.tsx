"use client";

// Step 2: 토픽 선택 — 선택형 / 공통형 그룹핑

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { QuestionType, TopicCard, TopicsByType } from "@/lib/types/coaching";

interface Props {
  type: QuestionType;
  initialTopics: TopicsByType;
}

export function TopicSelector({ type, initialTopics }: Props) {
  const [search, setSearch] = useState("");
  const router = useRouter();

  const filterFn = (t: TopicCard) =>
    !search.trim() || t.topic.toLowerCase().includes(search.toLowerCase());

  const selective = initialTopics.selective.filter(filterFn);
  const common = initialTopics.common.filter(filterFn);

  function handlePick(card: TopicCard) {
    // 토픽 클릭 → 그 토픽의 질문 리스트 페이지로 이동
    router.push(`/coaching/topic/${type}/${encodeURIComponent(card.topic)}`);
  }

  return (
    <div className="space-y-5">
      {/* 검색 */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 주제 검색"
        className="w-full rounded-full border border-border bg-surface px-4 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary-400 focus:outline-none"
      />

      {/* 선택형 */}
      <section>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground-secondary">
          <span>✅</span>
          <span>선택형 ({selective.length}) — 백그라운드 서베이</span>
        </div>
        <TopicGrid topics={selective} onPick={handlePick} />
      </section>

      {/* 공통형 (돌발) */}
      <section>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground-secondary">
          <span>🌪️</span>
          <span>공통형 ({common.length}) — 돌발</span>
        </div>
        <TopicGrid topics={common} onPick={handlePick} />
      </section>
    </div>
  );
}

function TopicGrid({
  topics,
  onPick,
}: {
  topics: TopicCard[];
  onPick: (t: TopicCard) => void;
}) {
  if (topics.length === 0) {
    return <p className="px-2 py-3 text-sm text-foreground-muted">결과 없음</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {topics.map((t) => {
        const mastered = t.user_progress?.mastered;
        const inProgress = t.user_progress?.in_progress_session_id;
        return (
          <button
            key={t.topic}
            type="button"
            onClick={() => onPick(t)}
            className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition ${
              mastered
                ? "border-primary-300 bg-primary-50 hover:border-primary-500"
                : inProgress
                  ? "border-accent-300 bg-accent-50 hover:border-accent-500"
                  : "border-border bg-surface hover:border-primary-300 hover:bg-surface-hover"
            }`}
          >
            <span className="text-sm font-semibold text-foreground">{t.topic}</span>
            <div className="flex items-center gap-1 text-[10px] text-foreground-muted">
              {mastered ? (
                <span className="rounded-full bg-primary-100 px-1.5 py-0.5 font-semibold text-primary-700">
                  ✓ 졸업
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
