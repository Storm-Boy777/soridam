"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Play,
  BarChart3,
  History,
  ClipboardList,
  Info,
  Loader2,
  ArrowRight,
  Trophy,
  Calendar,
  Filter,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import dynamic from "next/dynamic";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { GradeProgressChart, CurrentStateCard } from "./history/grade-progress-chart";
import { GrowthReport } from "./result/growth-report";
import { ExamPoolSelector } from "./start/exam-pool-selector";
import { ModeSelector, TestModeConfirm } from "./start/mode-selector";
import {
  getExamPool,
  getActiveSession,
  createSession,
  checkMockExamCredit,
  getHistory,
  getSession,
  expireSession,
} from "@/lib/actions/mock-exam";
import type {
  MockExamMode,
  MockExamHistoryItem,
} from "@/lib/types/mock-exam";
import {
  MOCK_EXAM_MODE_LABELS,
  SESSION_STATUS_LABELS,
} from "@/lib/types/mock-exam";

// 결과 탭 ResultSummary — 동적 로드 (초기 번들 감소 + 에러 핸들링)
const ResultSummary = dynamic(
  () =>
    import("./result/result-summary").then((mod) => ({
      default: mod.ResultSummary,
    })),
  {
    loading: () => (
      <div className="flex justify-center py-12">
        <Loader2 size={24} className="animate-spin text-primary-500" />
      </div>
    ),
    ssr: false,
  }
);

/* ── 상수 ── */

const tabs = [
  { id: "start", label: "응시", icon: Play },
  { id: "results", label: "결과", icon: BarChart3 },
  { id: "history", label: "나의 이력", icon: History },
] as const;

type TabId = (typeof tabs)[number]["id"];

/* ── Props ── */

interface MockExamContentProps {
  initialHistory?: MockExamHistoryItem[];
  initialActive?: Awaited<ReturnType<typeof getActiveSession>>;
  initialCredit?: Awaited<ReturnType<typeof checkMockExamCredit>>;
  initialLatestSession?: Awaited<ReturnType<typeof getSession>>;
  latestSessionId?: string;
}

/* ── 메인 컴포넌트 ── */

export function MockExamContent({
  initialHistory,
  initialActive,
  initialCredit,
  initialLatestSession,
  latestSessionId,
}: MockExamContentProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // useState로 즉시 탭 전환 + history.replaceState로 URL만 동기화 (Next.js 네비게이션 미발생)
  const tabParam = searchParams.get("tab") as TabId | null;
  const initialTab: TabId = tabParam && tabs.some((t) => t.id === tabParam) ? tabParam : "start";
  const [activeTab, setActiveTabState] = useState<TabId>(initialTab);

  const setActiveTab = useCallback((id: TabId) => {
    setActiveTabState(id);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", id);
    window.history.replaceState(null, "", url.toString());
  }, []);

  // 이력에서 결과 탭으로 이동 시 사용할 session_id
  const [viewSessionId, setViewSessionId] = useState<string | null>(null);

  // 이력 → 결과 탭 이동
  const handleViewResult = useCallback((sessionId: string) => {
    setViewSessionId(sessionId);
    setActiveTab("results");
  }, [setActiveTab]);

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
      {activeTab === "start" && (
        <StartTab
          initialActive={initialActive}
          initialCredit={initialCredit}
        />
      )}
      {activeTab === "results" && (
        <ResultsTab
          targetSessionId={viewSessionId}
          onClearTarget={() => setViewSessionId(null)}
          initialHistory={initialHistory}
          initialLatestSession={initialLatestSession}
          latestSessionId={latestSessionId}
        />
      )}
      {activeTab === "history" && (
        <HistoryTab
          initialData={initialHistory}
          onViewResult={handleViewResult}
        />
      )}
    </div>
  );
}

/* ── 응시 탭 ── */

function StartTab({
  initialActive,
  initialCredit,
}: {
  initialActive?: Awaited<ReturnType<typeof getActiveSession>>;
  initialCredit?: Awaited<ReturnType<typeof checkMockExamCredit>>;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedPoolId, setSelectedPoolId] = useState<number | null>(null);
  const [selectedMode, setSelectedMode] = useState<MockExamMode | null>(null);
  const [showTestConfirm, setShowTestConfirm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isAbandoning, setIsAbandoning] = useState(false);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 활성 세션 확인 (서버 사전 조회 initialData 활용)
  const { data: activeResult } = useQuery({
    queryKey: ["mock-active-session"],
    queryFn: () => getActiveSession(),
    staleTime: 30 * 1000, // 30초
    initialData: initialActive,
  });

  // 기출 풀 조회
  const {
    data: poolResult,
    isLoading: poolLoading,
    refetch: refetchPool,
  } = useQuery({
    queryKey: ["mock-exam-pool"],
    queryFn: () => getExamPool(),
    staleTime: 60 * 1000, // 1분
  });

  // 크레딧 확인
  const { data: creditResult } = useQuery({
    queryKey: ["mock-exam-credit"],
    queryFn: () => checkMockExamCredit(),
    staleTime: 60 * 1000,
    initialData: initialCredit,
  });

  const activeSession = activeResult?.data;
  const pools = poolResult?.data || [];
  const credit = creditResult?.data;

  // 세션 생성 핸들러
  const handleCreateSession = useCallback(async () => {
    if (!selectedPoolId || !selectedMode) return;

    setIsCreating(true);
    setError(null);

    try {
      const result = await createSession({
        submission_id: selectedPoolId,
        mode: selectedMode,
      });

      if (result.error) {
        setError(result.error);
        setIsCreating(false);
        return;
      }

      if (result.data) {
        // 네비게이션 직후 동기 state update / invalidateQueries 금지
        // → React concurrent mode에서 startTransition(네비게이션)보다
        //   동기 setState가 우선순위가 높아 전환을 중단시킴
        // 캐시는 staleTime 만료 시 자동 갱신됨
        router.push(`/mock-exam/session?id=${result.data.session_id}`);
        return;
      }

      // data도 error도 없는 경우
      setIsCreating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "세션 생성 중 오류가 발생했습니다");
      setIsCreating(false);
    }
  }, [selectedPoolId, selectedMode, router]);

  // 시작 버튼 핸들러
  const handleStart = useCallback(() => {
    if (selectedMode === "test") {
      setShowTestConfirm(true);
    } else {
      handleCreateSession();
    }
  }, [selectedMode, handleCreateSession]);

  return (
    <div className="space-y-6">
      {/* 활성 세션 복원 배너 */}
      {activeSession && (
        <div className="rounded-xl border border-primary-200 bg-primary-50/50 p-3 sm:p-4">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex flex-1 items-center gap-3">
              <Play size={18} className="shrink-0 text-primary-500" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  진행 중인 모의고사가 있습니다
                </p>
                <p className="text-xs text-foreground-secondary">
                  {MOCK_EXAM_MODE_LABELS[activeSession.mode as MockExamMode]} ·
                  Q{activeSession.current_question}/15
                </p>
              </div>
            </div>
            <div className="flex gap-2">
            <button
              onClick={() => setShowAbandonConfirm(true)}
              disabled={isAbandoning}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface-secondary disabled:opacity-50 sm:w-28 sm:flex-none"
            >
              {isAbandoning ? <Loader2 size={14} className="animate-spin" /> : null}
              그만두기
            </button>
            <button
              onClick={() =>
                router.push(
                  `/mock-exam/session?id=${activeSession.session_id}`
                )
              }
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 sm:w-28 sm:flex-none"
            >
              이어하기
              <ArrowRight size={14} />
            </button>
            </div>
          </div>
        </div>
      )}

      {/* 안내 배너 (접이식) */}
      <button
        onClick={() => setBannerOpen(!bannerOpen)}
        className="flex w-full items-start gap-2.5 rounded-xl border border-primary-200 bg-primary-50/50 p-3 text-left sm:gap-3 sm:p-4"
      >
        <Info size={18} className="shrink-0 text-primary-500" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            모의고사 안내
          </p>
          {bannerOpen && (
            <p className="mt-0.5 text-xs text-foreground-secondary sm:mt-1 sm:text-sm">
              실제 OPIc과 동일하게 15문제를 풀고, 예상 등급과 상세 피드백을 받습니다.
              <span className="font-medium text-foreground-secondary"> 훈련 모드</span>는 자유롭게 연습하고,
              <span className="font-medium text-foreground-secondary"> 실전 모드</span>는 40분 제한으로 실제 시험처럼 진행됩니다.
            </p>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`shrink-0 text-primary-400 transition-transform ${bannerOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* 진행 과정 + CTA 카드 */}
      <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-foreground sm:text-base">모의고사 진행 과정</h3>
        <p className="mt-0.5 text-xs text-foreground-secondary sm:mt-1 sm:text-sm">
          3단계로 실전 OPIc을 체험하고 평가를 받습니다
        </p>

        {/* 모바일 세로 */}
        <div className="relative mt-4 sm:hidden">
          {[
            { step: 1, title: "기출 문제 선택", desc: "후기 기반 기출 세트 선택" },
            { step: 2, title: "모드 선택 + 응시", desc: "훈련/실전 모드로 15문항 답변" },
            { step: 3, title: "평가 리포트 확인", desc: "예상 등급과 문항별 피드백 확인" },
          ].map((s, i) => (
            <div key={s.step} className="relative flex gap-3 pb-4 last:pb-0">
              {i < 2 && (
                <div className="absolute left-3.5 top-7 bottom-0 w-px bg-border" />
              )}
              <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-border bg-surface-secondary text-xs font-bold text-foreground-muted">
                {s.step}
              </div>
              <div className="pt-0.5">
                <p className="text-sm font-semibold text-foreground">{s.title}</p>
                <p className="text-xs text-foreground-secondary">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
        {/* PC 가로 3컬럼 */}
        <div className="hidden sm:mt-6 sm:grid sm:grid-cols-3 sm:gap-4">
          {[
            { step: 1, title: "기출 문제 선택", desc: "후기 기반 기출 세트 선택" },
            { step: 2, title: "모드 선택 + 응시", desc: "훈련/실전 모드로 15문항 답변" },
            { step: 3, title: "평가 리포트 확인", desc: "예상 등급과 문항별 피드백 확인" },
          ].map((s) => (
            <div key={s.step} className="flex flex-col items-center text-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-border bg-surface-secondary text-sm font-bold text-foreground-muted">
                {s.step}
              </div>
              <p className="mt-2 text-sm font-semibold text-foreground">{s.title}</p>
              <p className="mt-0.5 text-xs text-foreground-secondary">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 크레딧 표시 */}
      {credit && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-foreground-secondary">모의고사 크레딧:</span>
          <span className="font-bold text-foreground">
            {credit.planCredits + credit.credits}회
          </span>
          {!credit.available && (
            <span className="text-xs text-accent-500">
              (크레딧이 부족합니다)
            </span>
          )}
        </div>
      )}

      {/* 기출 선택 */}
      <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
        <ExamPoolSelector
          pools={pools}
          selectedId={selectedPoolId}
          onSelect={setSelectedPoolId}
          isLoading={poolLoading}
          onRefresh={() => refetchPool()}
          disabled={!!activeSession}
        />
      </div>

      {/* 모드 선택 — 기출 선택 후에만 표시 */}
      {selectedPoolId && (
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
          <ModeSelector
            selectedMode={selectedMode}
            onSelect={setSelectedMode}
          />
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* CTA 버튼 */}
      {selectedPoolId && selectedMode && (
        <div className="flex justify-center">
          <button
            onClick={handleStart}
            disabled={isCreating || !credit?.available}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary-500 px-8 text-base font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
          >
            {isCreating ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Play size={18} />
            )}
            {isCreating ? "세션 생성 중..." : "모의고사 시작하기"}
            {!isCreating && <ArrowRight size={16} />}
          </button>
        </div>
      )}

      {/* 실전 모드 확인 다이얼로그 */}
      <TestModeConfirm
        open={showTestConfirm}
        onConfirm={() => {
          setShowTestConfirm(false);
          handleCreateSession();
        }}
        onCancel={() => setShowTestConfirm(false)}
        isLoading={isCreating}
      />

      {/* 모의고사 포기 확인 다이얼로그 */}
      <ConfirmDialog
        open={showAbandonConfirm}
        onConfirm={async () => {
          setShowAbandonConfirm(false);
          setIsAbandoning(true);
          const result = await expireSession({ session_id: activeSession!.session_id });
          if (result.error) {
            setError(result.error);
          } else {
            queryClient.invalidateQueries({ queryKey: ["mock-active-session"] });
            queryClient.invalidateQueries({ queryKey: ["mock-exam-history"] });
          }
          setIsAbandoning(false);
        }}
        onCancel={() => setShowAbandonConfirm(false)}
        title="모의고사를 포기하시겠습니까?"
        description="사용한 크레딧은 복구되지 않습니다."
        confirmLabel="포기하기"
        cancelLabel="계속하기"
        variant="warning"
        icon={AlertTriangle}
        isLoading={isAbandoning}
      />
    </div>
  );
}

/* ── 결과 탭 (전체 결과 뷰) ── */

function ResultsTab({
  targetSessionId,
  onClearTarget,
  initialHistory,
  initialLatestSession,
  latestSessionId,
}: {
  targetSessionId: string | null;
  onClearTarget: () => void;
  initialHistory?: MockExamHistoryItem[];
  initialLatestSession?: Awaited<ReturnType<typeof getSession>>;
  latestSessionId?: string;
}) {
  // 이력 조회 (서버 사전 조회 initialData 활용)
  const { data: historyResult, isLoading: historyLoading } = useQuery({
    queryKey: ["mock-exam-history"],
    queryFn: () => getHistory(),
    staleTime: 5 * 60 * 1000,
    initialData: initialHistory ? { data: initialHistory } : undefined,
  });

  const completed = (historyResult?.data || []).filter(
    (h) => h.status === "completed" && h.final_level
  );

  // 표시할 session_id 결정: 지정된 것 또는 최근
  const sessionId = targetSessionId || completed[0]?.session_id || null;

  // 서버 사전 조회 데이터 활용 (최근 세션과 일치할 때만)
  const sessionInitialData =
    !targetSessionId && sessionId === latestSessionId && initialLatestSession
      ? initialLatestSession
      : undefined;

  // 전체 세션 데이터 조회 (서버 사전 조회 initialData 활용)
  const { data: sessionResult, isLoading: sessionLoading } = useQuery({
    queryKey: ["mock-exam-session-detail", sessionId],
    queryFn: () => getSession({ session_id: sessionId! }),
    enabled: !!sessionId,
    staleTime: 10 * 60 * 1000, // 10분 (결과는 변경 안 됨)
    initialData: sessionInitialData,
    // report 미완료 시 10초마다 자동 재조회 (평가 완료 감지)
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.data && !data.data.report) return 10_000;
      return false;
    },
  });

  // 이전 결과 (비교용)
  const previousResult = completed.length > 1
    ? targetSessionId
      ? completed.find((h) => h.session_id !== targetSessionId) || null
      : completed[1] || null
    : null;

  if (historyLoading || sessionLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={24} className="animate-spin text-primary-500" />
      </div>
    );
  }

  if (!sessionId || completed.length === 0) {
    return (
      <div className="space-y-6">
        <CollapsibleBanner
          title="모의고사 결과란?"
          description="모의고사 응시 후 FACT 영역별 점수, 예상 등급, 문항별 상세 피드백을 확인할 수 있습니다."
        />
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
          <h3 className="font-semibold text-foreground">모의고사 결과</h3>
          <div className="mt-4 flex flex-col items-center py-6 text-center sm:mt-6 sm:py-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-secondary">
              <BarChart3 size={24} className="text-foreground-muted" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground-secondary">
              아직 완료된 모의고사가 없습니다
            </p>
            <p className="mt-1 text-xs text-foreground-muted">
              모의고사를 응시하면 평가 결과가 여기에 표시됩니다
            </p>
          </div>
        </div>
      </div>
    );
  }

  const sessionData = sessionResult?.data;
  if (!sessionData?.report) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
          <h3 className="font-semibold text-foreground">결과 처리 중</h3>
          <div className="mt-4 flex flex-col items-center py-6 text-center sm:mt-6 sm:py-8">
            <Loader2 size={32} className="animate-spin text-primary-400" />
            <p className="mt-3 text-sm text-foreground-secondary">
              답변을 분석하고 있습니다. 잠시만 기다려주세요.
            </p>
            <p className="mt-1 text-xs text-foreground-muted">
              보통 2~5분 정도 소요됩니다. 완료되면 자동으로 표시됩니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CollapsibleBanner
        title="모의고사 결과란?"
        description="모의고사 응시 후 FACT 영역별 점수, 예상 등급, 문항별 상세 피드백을 확인할 수 있습니다."
      />

      {/* 다른 세션 보기 중 표시 */}
      {targetSessionId && targetSessionId !== completed[0]?.session_id && (
        <button
          onClick={onClearTarget}
          className="mb-4 inline-flex items-center gap-1 text-sm text-primary-500 hover:text-primary-600"
        >
          ← 최근 결과로 돌아가기
        </button>
      )}

      <ResultSummary
        report={sessionData.report}
        evaluations={sessionData.evaluations}
        answers={sessionData.answers}
        questions={sessionData.questions}
        sessionDate={sessionData.session.started_at}
        mode={sessionData.session.mode}
        previousResult={previousResult}
      />

      {/* 성장 리포트 (2회차부터 표시) */}
      <GrowthReport report={sessionData.report} />
    </div>
  );
}

/* ── 나의 이력 탭 ── */

function HistoryTab({
  initialData,
  onViewResult,
}: {
  initialData?: MockExamHistoryItem[];
  onViewResult: (sessionId: string) => void;
}) {
  const [modeFilter, setModeFilter] = useState<"all" | MockExamMode>("all");

  const { data: historyResult, isLoading } = useQuery({
    queryKey: ["mock-exam-history"],
    queryFn: () => getHistory(),
    staleTime: 5 * 60 * 1000,
    initialData: initialData ? { data: initialData } : undefined,
  });

  const items = historyResult?.data || [];
  const filtered =
    modeFilter === "all"
      ? items
      : items.filter((h) => h.mode === modeFilter);

  // 등급 추이 데이터 (완료된 것만, 시간순)
  const trendData = items
    .filter((h) => h.status === "completed" && h.final_level)
    .reverse(); // 오래된 것부터

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={24} className="animate-spin text-primary-500" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <CollapsibleBanner
          title="나의 이력이란?"
          description="모의고사 응시 기록과 등급 변화 추이를 한눈에 확인할 수 있습니다."
        />
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
          <h3 className="font-semibold text-foreground">나의 응시 이력</h3>
          <div className="mt-4 flex flex-col items-center py-6 text-center sm:mt-6 sm:py-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-secondary">
              <ClipboardList size={24} className="text-foreground-muted" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground-secondary">
              아직 응시 이력이 없습니다
            </p>
            <p className="mt-1 text-xs text-foreground-muted">
              모의고사를 응시하면 이력과 성장 그래프가 표시됩니다
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CollapsibleBanner
        title="나의 이력이란?"
        description="모의고사 응시 기록과 등급 변화 추이를 한눈에 확인할 수 있습니다."
      />

      {/* 등급 추이 그래프 (2건 이상) 또는 현재 상태 카드 (1건) */}
      {trendData.length >= 2 ? (
        <GradeProgressChart data={trendData} />
      ) : trendData.length === 1 ? (
        <CurrentStateCard data={trendData[0]} />
      ) : null}

      {/* 헤더 + 필터 */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">
          나의 응시 이력
          <span className="ml-2 text-sm font-normal text-foreground-muted">
            {filtered.length}건
          </span>
        </h3>
        <div className="flex items-center gap-1">
          <Filter size={12} className="text-foreground-muted" />
          {(["all", "training", "test"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setModeFilter(mode)}
              className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                modeFilter === mode
                  ? "bg-primary-100 font-medium text-primary-600"
                  : "text-foreground-muted hover:bg-surface-secondary"
              }`}
            >
              {mode === "all" ? "전체" : MOCK_EXAM_MODE_LABELS[mode]}
            </button>
          ))}
        </div>
      </div>

      {filtered.map((item) => (
        <button
          key={item.session_id}
          onClick={() => {
            if (item.status === "completed" && item.final_level) {
              onViewResult(item.session_id);
            }
          }}
          className="w-full rounded-xl border border-border bg-surface p-3 text-left transition-colors hover:border-primary-200 sm:p-4"
        >
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* 등급 배지 */}
            {item.final_level ? (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 sm:h-10 sm:w-10">
                <span className="text-xs font-bold text-primary-600 sm:text-sm">
                  {item.final_level}
                </span>
              </div>
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-secondary sm:h-10 sm:w-10">
                <Trophy size={16} className="text-foreground-muted" />
              </div>
            )}

            {/* 모드 + 날짜 */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-sm font-medium text-foreground">
                  {MOCK_EXAM_MODE_LABELS[item.mode]}
                </span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium sm:px-2 ${
                    item.status === "completed"
                      ? "bg-green-50 text-green-600"
                      : "bg-foreground-muted/10 text-foreground-muted"
                  }`}
                >
                  {SESSION_STATUS_LABELS[item.status]}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-foreground-muted sm:text-xs">
                <Calendar size={10} />
                {new Date(item.started_at).toLocaleDateString("ko-KR")}
              </div>
            </div>

            {/* FACT 점수 + 화살표 */}
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {item.total_score != null && (
                <div className="text-right">
                  <p className="text-base font-bold text-foreground sm:text-lg">
                    {item.total_score}
                  </p>
                  <p className="text-[10px] text-foreground-muted">/ 100</p>
                </div>
              )}
              {item.status === "completed" && item.final_level && (
                <ArrowRight size={14} className="hidden text-foreground-muted sm:block" />
              )}
            </div>
          </div>

          {/* 주제 요약 + FACT 미니 */}
          {(item.topic_summary || item.score_f != null) && (
            <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-border/50 pt-1.5 sm:mt-2 sm:pt-2">
              {item.topic_summary && (
                <p className="min-w-0 truncate text-[11px] text-foreground-muted sm:text-xs">
                  {item.topic_summary}
                </p>
              )}
              {item.score_f != null && (
                <div className="flex shrink-0 gap-1.5 text-[10px] text-foreground-muted sm:gap-2">
                  <span>F:{item.score_f?.toFixed(1)}</span>
                  <span>A:{item.score_a?.toFixed(1)}</span>
                  <span>C:{item.score_c?.toFixed(1)}</span>
                  <span>T:{item.score_t?.toFixed(1)}</span>
                </div>
              )}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

/* ── 접이식 안내 배너 ── */

function CollapsibleBanner({ title, description }: { title: string; description: string }) {
  const [open, setOpen] = useState(false);

  return (
    <button
      onClick={() => setOpen(!open)}
      className="flex w-full items-start gap-2.5 rounded-xl border border-primary-200 bg-primary-50/50 p-3 text-left sm:gap-3 sm:p-4"
    >
      <Info size={18} className="shrink-0 text-primary-500" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {open && (
          <p className="mt-0.5 text-xs text-foreground-secondary sm:mt-1 sm:text-sm">
            {description}
          </p>
        )}
      </div>
      <ChevronDown
        size={16}
        className={`shrink-0 text-primary-400 transition-transform ${open ? "rotate-180" : ""}`}
      />
    </button>
  );
}
