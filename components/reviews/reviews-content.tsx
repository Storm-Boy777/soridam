"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart3, Send, MessageSquare } from "lucide-react";
import { FrequencyTab } from "./frequency/frequency-tab";
import { SubmitTab } from "./submit/submit-tab";
import { ListTab } from "./list/list-tab";
import type { ReviewStats, FrequencyItem, Submission, SubmissionWithQuestions } from "@/lib/types/reviews";

/* ── 상수 ── */

const tabs = [
  { id: "submit", label: "후기 제출", icon: Send },
  { id: "list", label: "시험 후기", icon: MessageSquare },
  { id: "frequency", label: "빈도 분석", icon: BarChart3 },
] as const;

type TabId = (typeof tabs)[number]["id"];

/* ── 메인 컴포넌트 ── */

interface ReviewsContentProps {
  initialStats: ReviewStats;
  initialFrequency: FrequencyItem[];
  initialSubmissions: Submission[];
  initialPublicReviews: { reviews: Submission[]; total: number };
  initialSubmissionDetails: Record<number, SubmissionWithQuestions>;
  isPaidUser?: boolean;
}

export function ReviewsContent({ initialStats, initialFrequency, initialSubmissions, initialPublicReviews, initialSubmissionDetails, isPaidUser = false }: ReviewsContentProps) {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  // useState로 즉시 탭 전환 + history.replaceState로 URL만 동기화 (Next.js 네비게이션 미발생)
  const tabParam = searchParams.get("tab") as TabId | null;
  const fromCompleted = searchParams.get("completed") === "true";
  const initialTab: TabId = tabParam && tabs.some((t) => t.id === tabParam) ? tabParam : "submit";
  const [activeTab, setActiveTabState] = useState<TabId>(initialTab);

  const setActiveTab = useCallback((id: TabId) => {
    setActiveTabState(id);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", id);
    url.searchParams.delete("completed");
    window.history.replaceState(null, "", url.toString());
  }, []);

  // 서버에서 조회한 완료 후기 상세를 캐시에 즉시 세팅 (클라이언트 RTT 0회)
  useEffect(() => {
    for (const [id, detail] of Object.entries(initialSubmissionDetails)) {
      queryClient.setQueryData(["submission-detail", Number(id)], detail);
    }
  }, [initialSubmissionDetails, queryClient]);

  return (
    <div>
      {/* 탭 네비게이션 — 하단 인디케이터 */}
      <div className="mb-4 flex border-b border-border sm:mb-6">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-medium transition-colors sm:gap-2 sm:px-6 sm:text-sm ${
                active
                  ? "text-primary-600"
                  : "text-foreground-muted hover:text-foreground-secondary"
              }`}
            >
              <tab.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{tab.label}</span>
              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === "frequency" && (
        <FrequencyTab initialStats={initialStats} initialFrequency={initialFrequency} isPaidUser={isPaidUser} />
      )}
      {activeTab === "submit" && <SubmitTab initialSubmissions={initialSubmissions} />}
      {activeTab === "list" && <ListTab initialData={initialPublicReviews} />}
    </div>
  );
}
