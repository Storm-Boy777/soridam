"use client";

import { useState, useEffect } from "react";
import { BarChart3, ClipboardCheck, FileText, TrendingUp } from "lucide-react";
import { TabOverview } from "./tab-overview";
import { TabDiagnosis } from "./tab-diagnosis";
import { TabQuestions } from "./tab-questions";
import { TabGrowth } from "./tab-growth";
import type { DiagnosisTransformOutput } from "@/lib/mock-exam-result/diagnosis-transformer";
import type { OverviewData } from "./tab-overview";
import type { QuestionsData } from "./tab-questions";
import type { GrowthReportV2 } from "@/lib/mock-data/mock-exam-result";

// ── 결과 페이지 메인 래퍼 ──

const TABS = [
  { key: "overview", label: "종합 진단", icon: FileText },
  { key: "diagnosis", label: "세부진단", icon: ClipboardCheck },
  { key: "questions", label: "문항별", icon: BarChart3 },
  { key: "growth", label: "성장", icon: TrendingUp },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/** 결과 페이지에 전달할 실데이터 */
export interface ResultPageData {
  overview?: OverviewData | null;
  diagnosis?: DiagnosisTransformOutput | null;
  questions?: QuestionsData | null;
  growth?: GrowthReportV2 | null;
}

export function ResultPage({
  sessionId,
  data,
  initialTab,
}: {
  sessionId: string;
  data?: ResultPageData;
  /** 서버에서 전달받은 초기 탭 (Hydration 불일치 방지) */
  initialTab?: TabKey;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab || "overview");

  // 탭 변경 시 URL 동기화
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", activeTab);
    history.replaceState(null, "", url.toString());
  }, [activeTab]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── 탭 네비게이션 ── */}
      <div className="shrink-0 border-b border-border bg-surface/80 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl">
          <div className="flex">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-3 text-xs font-medium transition-colors sm:gap-2 sm:px-4 sm:text-sm ${
                    isActive
                      ? "border-primary-500 text-primary-600"
                      : "border-transparent text-foreground-muted hover:border-border hover:text-foreground-secondary"
                  }`}
                >
                  <Icon size={14} className="sm:hidden md:block" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 탭 콘텐츠 (스크롤 영역 — relative+absolute 패턴) ── */}
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0 overflow-y-auto max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden">
          {activeTab === "overview" && <TabOverview data={data?.overview} />}
          {activeTab === "diagnosis" && <TabDiagnosis data={data?.diagnosis} />}
          {activeTab === "questions" && <TabQuestions data={data?.questions} />}
          {activeTab === "growth" && <TabGrowth data={data?.growth} />}
        </div>
      </div>
    </div>
  );
}
