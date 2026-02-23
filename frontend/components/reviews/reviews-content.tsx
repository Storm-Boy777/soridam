"use client";

import { useState } from "react";
import { BarChart3, Send, MessageSquare } from "lucide-react";
import { FrequencyTab } from "./frequency/frequency-tab";
import { SubmitTab } from "./submit/submit-tab";
import { ListTab } from "./list/list-tab";
import type { ReviewStats, FrequencyItem } from "@/lib/types/reviews";

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
}

export function ReviewsContent({ initialStats, initialFrequency }: ReviewsContentProps) {
  const [activeTab, setActiveTab] = useState<TabId>("frequency");

  return (
    <div>
      {/* 탭 네비게이션 */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex min-w-max border-b border-border">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition-colors sm:gap-2 sm:px-4 ${
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
      {activeTab === "submit" && <SubmitTab />}
      {activeTab === "list" && <ListTab />}
    </div>
  );
}
