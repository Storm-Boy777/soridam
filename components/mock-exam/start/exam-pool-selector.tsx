"use client";

import { useState, useCallback } from "react";
import {
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { TOPIC_ICONS } from "@/components/reviews/submit/topic-pagination";
import type { ExamPoolPreview } from "@/lib/types/mock-exam";

// 콤보 타입 한글 라벨
const COMBO_LABELS: Record<string, string> = {
  general_1: "일반콤보 1",
  general_2: "일반콤보 2",
  general_3: "일반콤보 3",
  roleplay: "롤플레이",
  advance: "어드밴스",
};

interface ExamPoolSelectorProps {
  pools: ExamPoolPreview[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  isLoading: boolean;
  onRefresh: () => void;
  disabled?: boolean;
}

export function ExamPoolSelector({
  pools,
  selectedId,
  onSelect,
  isLoading,
  onRefresh,
  disabled = false,
}: ExamPoolSelectorProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center py-12">
        <Loader2 size={28} className="animate-spin text-primary-500" />
        <p className="mt-3 text-sm text-foreground-secondary">
          기출 문제를 불러오는 중...
        </p>
      </div>
    );
  }

  if (pools.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <AlertCircle size={28} className="text-foreground-muted" />
        <p className="mt-3 text-sm font-medium text-foreground-secondary">
          응시 가능한 기출이 없습니다
        </p>
        <p className="mt-1 text-xs text-foreground-muted">
          시험후기가 승인되면 기출로 등록됩니다
        </p>
        <button
          onClick={onRefresh}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-surface-secondary px-4 py-2 text-sm font-medium text-foreground-secondary hover:bg-border"
        >
          <RefreshCw size={14} />
          다시 불러오기
        </button>
      </div>
    );
  }

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    onRefresh();
    // 최소 600ms 스피너 표시 (너무 빨리 사라지면 눌렀는지 모름)
    setTimeout(() => setIsRefreshing(false), 600);
  }, [onRefresh]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          기출 문제를 선택하세요
        </p>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-surface-secondary hover:text-foreground-secondary disabled:opacity-50"
        >
          <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} />
          {isRefreshing ? "불러오는 중..." : "새로고침"}
        </button>
      </div>

      <div className="relative">
        {disabled && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-surface/70 backdrop-blur-[1px]">
            <p className="mx-4 text-center text-sm font-semibold text-foreground">
              진행 중인 모의고사를 <span className="text-primary-600">완료</span>하거나 <span className="text-primary-600">그만둔</span> 후<br />새로 시작할 수 있습니다.
            </p>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
        {pools.map((pool) => {
          const isSelected = selectedId === pool.submission_id;
          return (
            <button
              key={pool.submission_id}
              onClick={() => onSelect(pool.submission_id)}
              className={`rounded-xl border p-4 text-left transition-all ${
                isSelected
                  ? "border-primary-500 bg-primary-50/30 ring-2 ring-primary-100 shadow-sm"
                  : "border-border bg-surface hover:-translate-y-0.5 hover:border-primary-300 hover:bg-primary-50/20 hover:shadow-md"
              }`}
            >
              {/* 콤보별 주제 */}
              <div className="space-y-1.5">
                {pool.topics.map((topic) => {
                  const TopicIcon =
                    TOPIC_ICONS[topic.topic] || TOPIC_ICONS["default"];
                  return (
                    <div
                      key={topic.combo_type}
                      className="flex items-center gap-2"
                    >
                      <span className="w-16 shrink-0 text-[10px] text-foreground-muted">
                        {COMBO_LABELS[topic.combo_type] || topic.combo_type}
                      </span>
                      {TopicIcon && <TopicIcon size={13} className="shrink-0 text-foreground-secondary" />}
                      <span className="truncate text-xs font-medium text-foreground">
                        {topic.topic}
                      </span>
                    </div>
                  );
                })}
              </div>

            </button>
          );
        })}
        </div>
      </div>
    </div>
  );
}
