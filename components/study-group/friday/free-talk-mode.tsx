"use client";

import { useState, useCallback, useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { FREE_TALK_CATEGORY_LABELS } from "@/lib/constants/study-group";
import { fetchFreetalkTopics } from "@/lib/actions/study-group";
import { ActivityTimer } from "../activity-timer";
import type { FreeTalkCategory } from "@/lib/types/study-group";

const categoryList: FreeTalkCategory[] = ["daily", "opinions", "hypothetical", "culture", "current"];

export function FreeTalkMode() {
  const [selectedCategory, setSelectedCategory] = useState<FreeTalkCategory | "all">("all");
  const [showFollowUp, setShowFollowUp] = useState(false);

  // DB에서 주제 조회
  const { data: allTopics = [], isLoading } = useQuery({
    queryKey: ["study-freetalk"],
    queryFn: () => fetchFreetalkTopics(),
    staleTime: 5 * 60 * 1000,
  });

  // 카테고리 필터링
  const filteredTopics = useMemo(() => {
    if (selectedCategory === "all") return allTopics;
    return allTopics.filter((t) => t.category === selectedCategory);
  }, [selectedCategory, allTopics]);

  // 랜덤 인덱스
  const [topicIndex, setTopicIndex] = useState(0);

  const currentTopic = filteredTopics.length > 0
    ? filteredTopics[topicIndex % filteredTopics.length]
    : null;

  const nextRandom = useCallback(() => {
    if (filteredTopics.length <= 1) return;
    let next: number;
    do {
      next = Math.floor(Math.random() * filteredTopics.length);
    } while (next === topicIndex % filteredTopics.length);
    setTopicIndex(next);
    setShowFollowUp(false);
  }, [filteredTopics.length, topicIndex]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 카테고리 필터 */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => { setSelectedCategory("all"); setTopicIndex(0); }}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            selectedCategory === "all"
              ? "bg-primary-500 text-white"
              : "bg-surface-secondary text-foreground-secondary hover:bg-primary-50"
          }`}
        >
          전체
        </button>
        {categoryList.map((cat) => (
          <button
            key={cat}
            onClick={() => { setSelectedCategory(cat); setTopicIndex(0); }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedCategory === cat
                ? "bg-primary-500 text-white"
                : "bg-surface-secondary text-foreground-secondary hover:bg-primary-50"
            }`}
          >
            {FREE_TALK_CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* 주제 카드 */}
      {currentTopic && (
        <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <div className="mb-2 flex justify-between">
            <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-600">
              {FREE_TALK_CATEGORY_LABELS[currentTopic.category]}
            </span>
          </div>

          <p className="mt-4 text-center text-xl font-semibold leading-relaxed text-foreground sm:text-2xl">
            {currentTopic.english}
          </p>
          <p className="mt-2 text-center text-sm text-foreground-secondary">
            {currentTopic.korean}
          </p>

          {showFollowUp ? (
            <div className="mt-6 rounded-lg bg-primary-50/50 p-3 text-center">
              <p className="text-xs text-foreground-muted mb-1">Follow-up</p>
              <p className="text-sm font-medium text-primary-700">{currentTopic.follow_up}</p>
            </div>
          ) : (
            <button
              onClick={() => setShowFollowUp(true)}
              className="mt-6 mx-auto block text-xs text-primary-600 hover:text-primary-700 transition-colors"
            >
              후속 질문 보기
            </button>
          )}
        </div>
      )}

      <div className="flex justify-center">
        <button
          onClick={nextRandom}
          className="flex items-center gap-2 rounded-full bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
        >
          <RefreshCw size={16} /> 다음 주제
        </button>
      </div>

      <div className="flex justify-center">
        <ActivityTimer presets={[60, 120, 180]} />
      </div>
    </div>
  );
}
