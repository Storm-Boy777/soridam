"use client";

import { useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart3, Send, MessageSquare } from "lucide-react";
import { FrequencyTab } from "./frequency/frequency-tab";
import { SubmitTab } from "./submit/submit-tab";
import { ListTab } from "./list/list-tab";
import type { ReviewStats, FrequencyItem, Submission, SubmissionWithQuestions } from "@/lib/types/reviews";

/* ── 상수 ── */

const tabs = [
  { id: "frequency", label: "빈도 분석", icon: BarChart3 },
  { id: "submit", label: "후기 제출", icon: Send },
  { id: "list", label: "시험 후기", icon: MessageSquare },
] as const;

type TabId = (typeof tabs)[number]["id"];

/* ── 메인 컴포넌트 ── */

interface ReviewsContentProps {
  initialStats: ReviewStats;
  initialFrequency: FrequencyItem[];
  initialSubmissions: Submission[];
  initialPublicReviews: { reviews: Submission[]; total: number };
  initialSubmissionDetails: Record<number, SubmissionWithQuestions>;
}

export function ReviewsContent({ initialStats, initialFrequency, initialSubmissions, initialPublicReviews, initialSubmissionDetails }: ReviewsContentProps) {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  // URL ?tab= 파라미터가 single source of truth (useState 없이 URL에서 직접 읽기)
  const tabParam = searchParams.get("tab") as TabId | null;
  const fromCompleted = searchParams.get("completed") === "true";
  const activeTab: TabId = tabParam && tabs.some((t) => t.id === tabParam) ? tabParam : fromCompleted ? "submit" : "frequency";

  const setActiveTab = useCallback((id: TabId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", id);
    params.delete("completed");
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  // 서버에서 조회한 완료 후기 상세를 캐시에 즉시 세팅 (클라이언트 RTT 0회)
  useEffect(() => {
    for (const [id, detail] of Object.entries(initialSubmissionDetails)) {
      queryClient.setQueryData(["submission-detail", Number(id)], detail);
    }
  }, [initialSubmissionDetails, queryClient]);

  return (
    <div>
      {/* 탭 네비게이션 */}
      <div className="mb-4 overflow-x-auto sm:mb-6">
        <div className="flex border-b border-border">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition-colors sm:min-w-[120px] sm:flex-none sm:gap-2 sm:px-4 ${
                  active
                    ? "border-primary-500 text-primary-600"
                    : "border-transparent text-foreground-muted hover:border-border hover:text-foreground-secondary"
                }`}
              >
                <tab.icon size={16} className="hidden sm:block" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === "frequency" && (
        <FrequencyTab initialStats={initialStats} initialFrequency={initialFrequency} />
      )}
      {activeTab === "submit" && <SubmitTab initialSubmissions={initialSubmissions} />}
      {activeTab === "list" && <ListTab initialData={initialPublicReviews} />}
    </div>
  );
}
