"use client";

import { useState, useCallback } from "react";
import { RefreshCw, ThumbsUp, ThumbsDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchGameCards } from "@/lib/actions/study-group";
import { ActivityTimer } from "../../activity-timer";
import type { DebateTopic } from "@/lib/types/study-group";

export function DebateGame() {
  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["study-game-cards", "debate"],
    queryFn: () => fetchGameCards("debate"),
    staleTime: 5 * 60 * 1000,
  });

  const [topicIndex, setTopicIndex] = useState(0);
  const [showPoints, setShowPoints] = useState(false);

  const topic = cards[topicIndex]?.data as DebateTopic | undefined;

  const nextTopic = useCallback(() => {
    if (cards.length <= 1) return;
    let next: number;
    do {
      next = Math.floor(Math.random() * cards.length);
    } while (next === topicIndex);
    setTopicIndex(next);
    setShowPoints(false);
  }, [topicIndex, cards.length]);

  if (isLoading) {
    return <div className="flex items-center justify-center py-10"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>;
  }

  if (!topic) {
    return <div className="rounded-xl border border-border bg-surface p-8 text-center"><p className="text-sm text-foreground-muted">등록된 주제가 없습니다.</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted">DEBATE TOPIC</p>
        <p className="mt-3 text-xl font-bold text-foreground sm:text-2xl">&ldquo;{topic.topic}&rdquo;</p>
        <p className="mt-2 text-sm text-foreground-secondary">{topic.context}</p>
      </div>

      {showPoints ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <ThumbsUp size={16} className="text-blue-600" />
              <span className="text-sm font-bold text-blue-700">PRO (찬성)</span>
            </div>
            <ul className="space-y-2">
              {topic.proPoints.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-blue-700"><span className="mt-0.5 shrink-0">•</span> {p}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <ThumbsDown size={16} className="text-red-600" />
              <span className="text-sm font-bold text-red-700">CON (반대)</span>
            </div>
            <ul className="space-y-2">
              {topic.conPoints.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-red-700"><span className="mt-0.5 shrink-0">•</span> {p}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="flex justify-center">
          <button onClick={() => setShowPoints(true)} className="text-sm text-primary-600 hover:text-primary-700 transition-colors">찬반 포인트 힌트 보기</button>
        </div>
      )}

      <div className="flex justify-center">
        <button onClick={nextTopic} className="flex items-center gap-2 rounded-full bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors">
          <RefreshCw size={16} /> 다음 주제
        </button>
      </div>

      <div className="flex justify-center">
        <ActivityTimer presets={[120, 180, 300]} />
      </div>
    </div>
  );
}
