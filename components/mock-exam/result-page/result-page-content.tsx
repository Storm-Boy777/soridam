"use client";

// 결과 페이지 메인 래퍼 — 4탭 네비게이션
import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Target,
  ClipboardList,
  TrendingUp,
  Loader2,
} from "lucide-react";
import type {
  MockTestSession,
  MockTestAnswer,
  MockTestEvaluation,
  MockTestReport,
  MockExamHistoryItem,
  CoachingReport,
} from "@/lib/types/mock-exam";
import { getSession } from "@/lib/actions/mock-exam";
import { OverviewTab } from "./tab-overview";
import { DiagnosisTab } from "./tab-diagnosis";
import { QuestionsTab } from "./tab-questions";
import { GrowthTab } from "./tab-growth";

// ── 탭 정의 ──

const tabs = [
  { id: "overview", label: "종합", icon: BarChart3 },
  { id: "diagnosis", label: "진단", icon: Target },
  { id: "questions", label: "문항별", icon: ClipboardList },
  { id: "growth", label: "성장", icon: TrendingUp },
] as const;

type TabId = (typeof tabs)[number]["id"];

// ── Props ──

interface ResultPageContentProps {
  sessionId: string;
  initialData?: {
    session: MockTestSession;
    answers: MockTestAnswer[];
    evaluations: MockTestEvaluation[];
    report: MockTestReport | null;
    questions: Array<{
      id: string;
      question_english: string;
      question_korean: string;
      question_short: string;
      question_type_eng: string;
      survey_type: string;
      topic: string;
      category: string;
      audio_url: string | null;
    }>;
  };
  previousResult?: MockExamHistoryItem | null;
  initialTab?: string;
}

// ── 메인 ──

export function ResultPageContent({
  sessionId,
  initialData,
  previousResult,
  initialTab,
}: ResultPageContentProps) {
  // 탭 상태 (URL 동기화)
  const tabParam = initialTab as TabId | undefined;
  const startTab: TabId = tabParam && tabs.some((t) => t.id === tabParam) ? tabParam : "overview";
  const [activeTab, setActiveTabState] = useState<TabId>(startTab);

  const setActiveTab = useCallback((id: TabId) => {
    setActiveTabState(id);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", id);
    window.history.replaceState(null, "", url.toString());
  }, []);

  // TanStack Query — 서버에서 가져온 initialData 활용 + 평가 미완료 시 폴링
  const { data: sessionResult, isLoading } = useQuery({
    queryKey: ["mock-exam-result", sessionId],
    queryFn: () => getSession({ session_id: sessionId }),
    staleTime: Infinity, // 결과는 변경되지 않음
    initialData: initialData ? { data: initialData } : undefined,
    refetchInterval: (query) => {
      const d = query.state.data;
      if (d?.data && !d.data.report) return 10_000; // 리포트 미완료 시 10초 폴링
      return false;
    },
  });

  const sessionData = sessionResult?.data;

  // 로딩
  if (isLoading || !sessionData) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary-400" />
      </div>
    );
  }

  // 리포트 미완료 — 평가 대기 상태
  if (!sessionData.report) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="text-center">
          <Loader2 size={32} className="mx-auto animate-spin text-primary-400" />
          <p className="mt-3 text-sm text-foreground-secondary">
            답변을 분석하고 있습니다. 잠시만 기다려주세요.
          </p>
          <p className="mt-1 text-xs text-foreground-muted">
            보통 2~5분 정도 소요됩니다. 완료되면 자동으로 표시됩니다.
          </p>
        </div>
      </div>
    );
  }

  const { report, evaluations, answers, questions, session } = sessionData;
  const coaching = report.coaching_report as CoachingReport | null;

  return (
    <div className="flex h-0 min-h-0 flex-grow flex-col md:h-auto md:flex-1">
      {/* 탭 네비게이션 — 고정 */}
      <div className="shrink-0 border-b border-border bg-surface/80 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl">
          <div className="flex">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-3 text-xs font-medium transition-colors sm:gap-2 sm:px-4 sm:text-sm ${
                    active
                      ? "border-primary-500 text-primary-600"
                      : "border-transparent text-foreground-muted hover:border-border hover:text-foreground-secondary"
                  }`}
                >
                  <tab.icon size={14} className="sm:hidden md:block" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 탭 콘텐츠 — 스크롤 가능 */}
      <div className="mobile-scrollbar-hidden h-0 flex-grow overflow-y-auto max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden">
        {activeTab === "questions" ? (
          <QuestionsTab
            evaluations={evaluations}
            answers={answers}
            questions={questions}
          />
        ) : (
          <div className="mx-auto max-w-5xl px-3 py-4 sm:px-6 sm:py-6">
            {activeTab === "overview" && (
              <OverviewTab
                report={report}
                coaching={coaching}
                sessionDate={session.started_at}
                mode={session.mode}
                previousResult={previousResult}
              />
            )}
            {activeTab === "diagnosis" && (
              <DiagnosisTab
                report={report}
                coaching={coaching}
              />
            )}
            {activeTab === "growth" && (
              <GrowthTab report={report} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
