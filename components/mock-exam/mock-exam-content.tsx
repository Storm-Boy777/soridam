"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { ExamPoolSelector } from "./start/exam-pool-selector";
import { ModeSelector, TestModeConfirm } from "./start/mode-selector";
import { ResultSummary } from "./result/result-summary";
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
  OpicLevel,
} from "@/lib/types/mock-exam";
import {
  MOCK_EXAM_MODE_LABELS,
  SESSION_STATUS_LABELS,
  OPIC_LEVEL_LABELS,
  OPIC_LEVEL_ORDER,
} from "@/lib/types/mock-exam";

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
}

/* ── 메인 컴포넌트 ── */

export function MockExamContent({ initialHistory }: MockExamContentProps) {
  const [activeTab, setActiveTab] = useState<TabId>("start");
  // 이력에서 결과 탭으로 이동 시 사용할 session_id
  const [viewSessionId, setViewSessionId] = useState<string | null>(null);

  // 이력 → 결과 탭 이동
  const handleViewResult = useCallback((sessionId: string) => {
    setViewSessionId(sessionId);
    setActiveTab("results");
  }, []);

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
      {activeTab === "start" && <StartTab />}
      {activeTab === "results" && (
        <ResultsTab
          targetSessionId={viewSessionId}
          onClearTarget={() => setViewSessionId(null)}
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

function StartTab() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedPoolId, setSelectedPoolId] = useState<number | null>(null);
  const [selectedMode, setSelectedMode] = useState<MockExamMode | null>(null);
  const [showTestConfirm, setShowTestConfirm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isAbandoning, setIsAbandoning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 활성 세션 확인
  const { data: activeResult } = useQuery({
    queryKey: ["mock-active-session"],
    queryFn: () => getActiveSession(),
    staleTime: 30 * 1000, // 30초
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
        <div className="flex items-center justify-between gap-3 rounded-xl border border-primary-200 bg-primary-50/50 p-4">
          <div className="flex items-center gap-3">
            <Play size={18} className="shrink-0 text-primary-500" />
            <div>
              <p className="text-sm font-medium text-foreground">
                진행 중인 모의고사가 있습니다
              </p>
              <p className="text-xs text-foreground-secondary">
                {MOCK_EXAM_MODE_LABELS[activeSession.mode as MockExamMode]} ·
                Q{activeSession.current_question}/15
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                if (!confirm("진행 중인 모의고사를 포기하시겠습니까? 사용한 크레딧은 복구되지 않습니다.")) return;
                setIsAbandoning(true);
                await expireSession({ session_id: activeSession.session_id });
                queryClient.invalidateQueries({ queryKey: ["mock-active-session"] });
                queryClient.invalidateQueries({ queryKey: ["mock-exam-history"] });
                setIsAbandoning(false);
              }}
              disabled={isAbandoning}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface-secondary disabled:opacity-50"
            >
              {isAbandoning ? <Loader2 size={14} className="animate-spin" /> : null}
              포기하기
            </button>
            <button
              onClick={() =>
                router.push(
                  `/mock-exam/session?id=${activeSession.session_id}`
                )
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
            >
              이어하기
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* 안내 배너 */}
      <div className="flex items-start gap-3 rounded-xl border border-primary-200 bg-primary-50/50 p-4">
        <Info size={18} className="mt-0.5 shrink-0 text-primary-500" />
        <div>
          <p className="text-sm font-medium text-foreground">
            실전 모의고사란?
          </p>
          <p className="mt-1 text-sm text-foreground-secondary">
            실제 OPIc 시험과 동일한 환경에서 15문제를 풀고, AI가 답변을
            분석하여 예상 등급과 상세 피드백을 제공합니다.
          </p>
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
      <div className="rounded-xl border border-border bg-surface p-6">
        <ExamPoolSelector
          pools={pools}
          selectedId={selectedPoolId}
          onSelect={setSelectedPoolId}
          isLoading={poolLoading}
          onRefresh={() => refetchPool()}
        />
      </div>

      {/* 모드 선택 — 기출 선택 후에만 표시 */}
      {selectedPoolId && (
        <div className="rounded-xl border border-border bg-surface p-6">
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
    </div>
  );
}

/* ── 결과 탭 (전체 결과 뷰) ── */

function ResultsTab({
  targetSessionId,
  onClearTarget,
}: {
  targetSessionId: string | null;
  onClearTarget: () => void;
}) {
  // 이력 조회 (최근 완료 세션 찾기용)
  const { data: historyResult, isLoading: historyLoading } = useQuery({
    queryKey: ["mock-exam-history"],
    queryFn: () => getHistory(),
    staleTime: 5 * 60 * 1000,
  });

  const completed = (historyResult?.data || []).filter(
    (h) => h.status === "completed" && h.final_level
  );

  // 표시할 session_id 결정: 지정된 것 또는 최근
  const sessionId = targetSessionId || completed[0]?.session_id || null;

  // 전체 세션 데이터 조회
  const { data: sessionResult, isLoading: sessionLoading } = useQuery({
    queryKey: ["mock-exam-session-detail", sessionId],
    queryFn: () => getSession({ session_id: sessionId! }),
    enabled: !!sessionId,
    staleTime: 10 * 60 * 1000, // 10분 (결과는 변경 안 됨)
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
        <div className="rounded-xl border border-border bg-surface p-6">
          <h3 className="font-semibold text-foreground">모의고사 결과</h3>
          <div className="mt-6 flex flex-col items-center py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-secondary">
              <BarChart3 size={24} className="text-foreground-muted" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground-secondary">
              아직 완료된 모의고사가 없습니다
            </p>
            <p className="mt-1 text-xs text-foreground-muted">
              모의고사를 응시하면 AI 평가 결과가 여기에 표시됩니다
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
        <div className="rounded-xl border border-border bg-surface p-6">
          <h3 className="font-semibold text-foreground">결과 처리 중</h3>
          <div className="mt-6 flex flex-col items-center py-8 text-center">
            <Loader2 size={32} className="animate-spin text-primary-400" />
            <p className="mt-3 text-sm text-foreground-secondary">
              AI가 답변을 분석하고 있습니다. 잠시만 기다려주세요.
            </p>
            <p className="mt-1 text-xs text-foreground-muted">
              보통 2~5분 정도 소요됩니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
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
        <div className="rounded-xl border border-border bg-surface p-6">
          <h3 className="font-semibold text-foreground">나의 응시 이력</h3>
          <div className="mt-6 flex flex-col items-center py-8 text-center">
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
      {/* 등급 추이 미니 차트 (2건 이상일 때만) */}
      {trendData.length >= 2 && (
        <LevelTrendMini data={trendData} />
      )}

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
          className="w-full rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-primary-200"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {/* 등급 배지 */}
              {item.final_level ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50">
                  <span className="text-sm font-bold text-primary-600">
                    {item.final_level}
                  </span>
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-secondary">
                  <Trophy size={16} className="text-foreground-muted" />
                </div>
              )}

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {MOCK_EXAM_MODE_LABELS[item.mode]}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      item.status === "completed"
                        ? "bg-green-50 text-green-600"
                        : "bg-foreground-muted/10 text-foreground-muted"
                    }`}
                  >
                    {SESSION_STATUS_LABELS[item.status]}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
                  <Calendar size={10} />
                  {new Date(item.started_at).toLocaleDateString("ko-KR")}
                </div>
              </div>
            </div>

            {/* FACT 점수 + 결과 보기 화살표 */}
            <div className="flex items-center gap-2">
              {item.total_score != null && (
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">
                    {item.total_score}
                  </p>
                  <p className="text-[10px] text-foreground-muted">/ 100점</p>
                </div>
              )}
              {item.status === "completed" && item.final_level && (
                <ArrowRight size={14} className="text-foreground-muted" />
              )}
            </div>
          </div>

          {/* 주제 요약 + FACT 미니 */}
          <div className="mt-2 flex items-center justify-between">
            {item.topic_summary && (
              <p className="truncate text-xs text-foreground-muted">
                {item.topic_summary}
              </p>
            )}
            {item.score_f != null && (
              <div className="flex gap-2 text-[10px] text-foreground-muted shrink-0 ml-2">
                <span>F:{item.score_f?.toFixed(1)}</span>
                <span>A:{item.score_a?.toFixed(1)}</span>
                <span>C:{item.score_c?.toFixed(1)}</span>
                <span>T:{item.score_t?.toFixed(1)}</span>
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

/* ── 등급 추이 미니 차트 ── */

function LevelTrendMini({
  data,
}: {
  data: MockExamHistoryItem[];
}) {
  // 최근 10건만
  const items = data.slice(-10);
  const maxLevel = 7; // AL

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h4 className="text-xs font-medium text-foreground-muted mb-3">등급 추이</h4>
      <div className="flex items-end gap-1" style={{ height: 80 }}>
        {items.map((item, i) => {
          const levelNum = OPIC_LEVEL_ORDER[item.final_level as OpicLevel] ?? 0;
          const heightPct = maxLevel > 0 ? (levelNum / maxLevel) * 100 : 0;
          const isLast = i === items.length - 1;

          return (
            <div key={item.session_id} className="flex flex-1 flex-col items-center gap-1">
              {/* 등급 레이블 (마지막만) */}
              {isLast && (
                <span className="text-[9px] font-bold text-primary-600">
                  {item.final_level}
                </span>
              )}
              {/* 바 */}
              <div
                className={`w-full rounded-t transition-all ${
                  isLast ? "bg-primary-500" : "bg-primary-200"
                }`}
                style={{
                  height: `${Math.max(heightPct, 8)}%`,
                  minHeight: 6,
                }}
              />
              {/* 날짜 */}
              <span className="text-[8px] text-foreground-muted">
                {new Date(item.started_at).toLocaleDateString("ko-KR", {
                  month: "numeric",
                  day: "numeric",
                })}
              </span>
            </div>
          );
        })}
      </div>
      {/* Y축 레이블 */}
      <div className="mt-1 flex justify-between text-[8px] text-foreground-muted">
        <span>NH</span>
        <span>IM2</span>
        <span>AL</span>
      </div>
    </div>
  );
}
