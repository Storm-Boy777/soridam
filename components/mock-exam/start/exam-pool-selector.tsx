"use client";

import { useState } from "react";
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
}

export function ExamPoolSelector({
  pools,
  selectedId,
  onSelect,
  isLoading,
  onRefresh,
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

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          기출 문제를 선택하세요
        </p>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-1 text-xs text-foreground-muted hover:text-foreground-secondary"
        >
          <RefreshCw size={12} />
          새로고침
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {pools.map((pool) => {
          const isSelected = selectedId === pool.submission_id;
          return (
            <button
              key={pool.submission_id}
              onClick={() => onSelect(pool.submission_id)}
              className={`rounded-xl border p-4 text-left transition-all ${
                isSelected
                  ? "border-primary-500 bg-primary-50/30 ring-2 ring-primary-100"
                  : "border-border bg-surface hover:border-primary-200"
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
  );
}
