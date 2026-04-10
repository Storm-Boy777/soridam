"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Stethoscope, Dumbbell, ClipboardList } from "lucide-react";
import { DiagnosisTab } from "./diagnosis/diagnosis-tab";
import { TrainingTab } from "./training/training-tab";
import { HistoryTab } from "./history/history-tab";
import type {
  TutoringSession,
  TutoringFocus,
  TutoringEligibility,
  TutoringCredit,
} from "@/lib/types/tutoring";

/* ── 탭 정의 ── */

const tabs = [
  { id: "diagnosis", label: "진단", icon: Stethoscope },
  { id: "training", label: "훈련", icon: Dumbbell },
  { id: "history", label: "나의 튜터링", icon: ClipboardList },
] as const;

type TabId = (typeof tabs)[number]["id"];

/* ── Props ── */

interface TutoringContentProps {
  initialEligibility?: TutoringEligibility;
  initialCredit?: TutoringCredit;
  initialDiagnosis?: {
    session: TutoringSession | null;
    focuses: TutoringFocus[];
  };
  initialActive?: { session: TutoringSession | null };
  targetGrade?: string;
}

/* ── 메인 컴포넌트 ── */

export function TutoringContent({
  initialEligibility,
  initialCredit,
  initialDiagnosis,
  initialActive,
  targetGrade,
}: TutoringContentProps) {
  const searchParams = useSearchParams();

  // 탭 상태 (URL 동기화)
  const tabParam = searchParams.get("tab") as TabId | null;
  const initialTab: TabId =
    tabParam && tabs.some((t) => t.id === tabParam) ? tabParam : "diagnosis";
  const [activeTab, setActiveTabState] = useState<TabId>(initialTab);

  const setActiveTab = useCallback((id: TabId) => {
    setActiveTabState(id);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", id);
    window.history.replaceState({}, "", url.toString());
  }, []);

  return (
    <div>
      {/* 탭 네비게이션 — 하단 인디케이터 */}
      <div className="mb-4 flex border-b border-border sm:mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-medium transition-colors sm:gap-2 sm:px-6 sm:text-sm ${
                isActive
                  ? "text-primary-600"
                  : "text-foreground-muted hover:text-foreground-secondary"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === "diagnosis" && (
        <DiagnosisTab
          initialEligibility={initialEligibility}
          initialCredit={initialCredit}
          initialDiagnosis={initialDiagnosis}
          initialActive={initialActive}
          targetGrade={targetGrade}
          onStartTraining={() => setActiveTab("training")}
        />
      )}
      {activeTab === "training" && (
        <TrainingTab initialDiagnosis={initialDiagnosis} />
      )}
      {activeTab === "history" && <HistoryTab />}
    </div>
  );
}
