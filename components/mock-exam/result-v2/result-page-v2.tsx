"use client";

import { useState } from "react";
import { BarChart3, ClipboardCheck, FileText, TrendingUp } from "lucide-react";
import { TabOverviewV2 } from "./tab-overview-v2";
import { TabDiagnosisV2 } from "./tab-diagnosis-v2";
import { TabQuestionsV2 } from "./tab-questions-v2";
import { TabGrowthV2 } from "./tab-growth-v2";

// ── v2 결과 페이지 메인 래퍼 ──

const TABS = [
  { key: "overview", label: "종합 진단", icon: FileText },
  { key: "diagnosis", label: "세부진단", icon: ClipboardCheck },
  { key: "questions", label: "문항별", icon: BarChart3 },
  { key: "growth", label: "성장", icon: TrendingUp },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function ResultPageV2({ sessionId }: { sessionId: string }) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── 탭 네비게이션 ── */}
      <nav className="sticky top-0 z-10 flex border-b border-border bg-background/95 backdrop-blur-sm">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "border-b-2 border-primary-500 text-primary-500"
                  : "text-foreground-muted hover:text-foreground-secondary"
              }`}
            >
              <Icon className="hidden h-4 w-4 sm:block" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* ── 탭 콘텐츠 (스크롤 영역 — relative+absolute 패턴) ── */}
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0 overflow-y-auto max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden">
          {activeTab === "overview" && <TabOverviewV2 />}
          {activeTab === "diagnosis" && <TabDiagnosisV2 />}
          {activeTab === "questions" && <TabQuestionsV2 />}
          {activeTab === "growth" && <TabGrowthV2 />}
        </div>
      </div>
    </div>
  );
}