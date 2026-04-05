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
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Coins,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import dynamic from "next/dynamic";

const GradeProgressChart = dynamic(
  () => import("./history/grade-progress-chart").then((mod) => ({ default: mod.GradeProgressChart })),
  { loading: () => <div className="animate-pulse h-64 rounded-xl bg-surface-secondary" /> }
);
const CurrentStateCard = dynamic(
  () => import("./history/grade-progress-chart").then((mod) => ({ default: mod.CurrentStateCard })),
  { loading: () => <div className="animate-pulse h-32 rounded-xl bg-surface-secondary" /> }
);
import { ExamPoolSelector } from "./start/exam-pool-selector";
import { ModeSelector, TestModeConfirm, type ExtendedMockExamMode } from "./start/mode-selector";
import { NoCreditCard } from "@/components/trial/no-credit-card";
import {
  getExamPool,
  getActiveSession,
  createSession,
  checkMockExamCredit,
  getHistory,
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

// 결과 탭은 이제 별도 immersive 페이지로 이동 (/mock-exam/result/[sessionId])

/* ── 상수 ── */

const tabs = [
  { id: "start", label: "모의고사 응시", icon: Play },
  { id: "history", label: "나의 모의고사", icon: BarChart3 },
] as const;

type TabId = (typeof tabs)[number]["id"];

/* ── Props ── */

interface MockExamContentProps {
  initialHistory?: MockExamHistoryItem[];
  initialActive?: Awaited<ReturnType<typeof getActiveSession>>;
  initialCredit?: Awaited<ReturnType<typeof checkMockExamCredit>>;
  targetGrade?: string;
}

/* ── 메인 컴포넌트 ── */

export function MockExamContent({
  initialHistory,
  initialActive,
  initialCredit,
  targetGrade,
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

  // 이력 → 결과 페이지 이동
  const handleViewResult = useCallback((sessionId: string) => {
    router.push(`/mock-exam/result/${sessionId}`);
  }, [router]);

  return (
    <div>
      {/* 탭 네비게이션 — 카드형 */}
      <div className="mb-4 flex gap-1 rounded-xl bg-surface-secondary p-1 sm:mb-6">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs font-medium transition-all sm:gap-2 sm:px-3 sm:text-sm ${
                active
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-foreground-secondary hover:text-foreground"
              }`}
            >
              <tab.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === "start" && (
        <StartTab
          initialActive={initialActive}
          initialCredit={initialCredit}
        />
      )}
      {activeTab === "history" && (
        <HistoryTab
          initialData={initialHistory}
          onViewResult={handleViewResult}
          targetGrade={targetGrade}
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
  const [selectedMode, setSelectedMode] = useState<ExtendedMockExamMode | null>(null);
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
    staleTime: 60 * 1000, // 60초
    initialData: initialActive,
  });

  // 크레딧 확인 (기출 풀 쿼리보다 먼저 — hasCredit으로 기출 풀 fetch 제어)
  const { data: creditResult } = useQuery({
    queryKey: ["mock-exam-credit"],
    queryFn: () => checkMockExamCredit(),
    staleTime: 60 * 1000,
    initialData: initialCredit,
  });

  const credit = creditResult?.data;
  // undefined = 아직 로딩 중, true/false = 판별 완료
  const hasCredit = credit ? credit.available : undefined;

  // 기출 풀 조회 — 크레딧이 있을 때만 (체험판은 기출 선택 불필요)
  const {
    data: poolResult,
    isLoading: poolLoading,
    refetch: refetchPool,
  } = useQuery({
    queryKey: ["mock-exam-pool"],
    queryFn: () => getExamPool(),
    staleTime: 60 * 1000,
    enabled: hasCredit !== false,
  });

  const activeSession = activeResult?.data;
  const pools = poolResult?.data || [];

  // 세션 생성 핸들러 (훈련/실전 모드만)
  const handleCreateSession = useCallback(async () => {
    if (!selectedPoolId || !selectedMode || selectedMode === "trial") return;

    setIsCreating(true);
    setError(null);

    try {
      const result = await createSession({
        submission_id: selectedPoolId,
        mode: selectedMode as MockExamMode,
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
    if (selectedMode === "trial") {
      // 체험판: 기출 선택 스킵, 바로 세션 페이지로 이동
      router.push("/mock-exam/session?mode=trial");
      return;
    }
    if (selectedMode === "test") {
      setShowTestConfirm(true);
    } else {
      handleCreateSession();
    }
  }, [selectedMode, handleCreateSession, router]);

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
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">
              모의고사 안내
            </p>
            {credit && (
              <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                <Coins size={11} />
                크레딧 : ₩{(credit.balanceKrw ?? 0).toLocaleString()}
              </span>
            )}
          </div>
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
        {/* PC 가로 — 단계 사이 화살표 */}
        <div className="hidden sm:mt-6 sm:grid sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center sm:gap-3">
          {[
            { step: 1, title: "기출 문제 선택", desc: "후기 기반 기출 세트 선택" },
            { step: 2, title: "모드 선택 + 응시", desc: "훈련/실전 모드로 15문항 답변" },
            { step: 3, title: "평가 리포트 확인", desc: "예상 등급과 문항별 피드백 확인" },
          ].flatMap((s, i) => [
            <div key={s.step} className="flex flex-col items-center text-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-border bg-surface-secondary text-sm font-bold text-foreground-muted">
                {s.step}
              </div>
              <p className="mt-2 text-sm font-semibold text-foreground">{s.title}</p>
              <p className="mt-0.5 text-xs text-foreground-secondary">{s.desc}</p>
            </div>,
            ...(i < 2
              ? [<div key={`arrow-${i}`}><ChevronRight size={24} className="text-foreground-muted" /></div>]
              : []),
          ])}
        </div>
      </div>

      {/* 크레딧 표시 — 크레딧 있을 때만 (없을 때는 NoCreditCard에서 표시) */}
      {credit && credit.available && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-foreground-secondary">크레딧 잔액:</span>
          <span className="font-bold text-foreground">
            ₩{(credit.balanceKrw ?? 0).toLocaleString()}
          </span>
        </div>
      )}

      {/* 크레딧 없을 때: 모드 선택 먼저 (체험판 + 잠금 모드) — 활성 세션이 없을 때만 */}
      {hasCredit === false && !activeSession && (
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
          <ModeSelector
            selectedMode={selectedMode}
            onSelect={setSelectedMode}
            hasCredit={false}
          />
          <div className="mt-4">
            <NoCreditCard type="mock-exam" credits={credit?.balanceKrw ?? 0} />
          </div>
        </div>
      )}

      {/* 크레딧 있을 때: 기존 플로우 (기출 선택 → 모드 선택) */}
      {hasCredit === true && (
        <>
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
                hasCredit={true}
              />
            </div>
          )}
        </>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* CTA 버튼 — 크레딧 있고 기출+모드 선택 완료 시 */}
      {hasCredit === true && selectedPoolId && selectedMode && selectedMode !== "trial" && (
        <div>
          <button
            onClick={handleStart}
            disabled={isCreating}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-500 px-8 text-base font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
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

/* ── 결과 탭 (최신 결과 요약 + 추이 그래프 + 전체 이력) ── */

function HistoryTab({
  initialData,
  onViewResult,
  targetGrade,
}: {
  initialData?: MockExamHistoryItem[];
  onViewResult: (sessionId: string) => void;
  targetGrade?: string;
}) {
  const [modeFilter, setModeFilter] = useState<"all" | MockExamMode>("all");
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);
  const [showExpired, setShowExpired] = useState(false);

  const { data: historyResult, isLoading } = useQuery({
    queryKey: ["mock-exam-history"],
    queryFn: () => getHistory(),
    staleTime: 5 * 60 * 1000,
    initialData: initialData ? { data: initialData } : undefined,
  });

  const items = historyResult?.data || [];
  const filtered = items.filter((h) => {
    if (!showExpired && h.status === "expired") return false;
    if (modeFilter !== "all" && h.mode !== modeFilter) return false;
    return true;
  });

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

  // 최신 완료 세션
  const latest = trendData.length > 0 ? trendData[trendData.length - 1] : null;

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <CollapsibleBanner
          title="나의 모의고사란?"
          description="모의고사 응시 후 예상 등급, FACT 영역별 점수, 문항별 피드백을 확인하고, 응시 이력과 등급 변화 추이를 한눈에 볼 수 있습니다."
        />
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
          <h3 className="font-semibold text-foreground">나의 모의고사</h3>
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

  return (
    <div className="space-y-3 sm:space-y-4">
      <CollapsibleBanner
        title="나의 모의고사란?"
        description="모의고사 응시 후 예상 등급, FACT 영역별 점수, 문항별 피드백을 확인하고, 응시 이력과 등급 변화 추이를 한눈에 볼 수 있습니다."
      />

      {/* PC: 최신 결과 + 등급 추이 나란히 / 모바일: 세로 */}
      {latest && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 sm:gap-4">
          {/* 최신 결과 요약 카드 */}
          <div className="flex flex-col rounded-xl border border-border bg-surface p-3 sm:p-6">
            <h3 className="font-semibold text-foreground mb-3 sm:mb-4">
              최근 모의고사{latest.attempt_number > 0 && ` (${latest.attempt_number}회차)`}
            </h3>

            {/* 등급 + 날짜·모드 — 1열 세로 */}
            <div className="flex flex-col items-center py-2">
              <span className="text-2xl font-bold text-primary-600 sm:text-3xl">
                {latest.final_level || "—"}
              </span>
              <p className="mt-1.5 text-xs text-foreground-muted">
                {new Date(latest.started_at).toLocaleDateString("ko-KR")} ·{" "}
                {MOCK_EXAM_MODE_LABELS[latest.mode as keyof typeof MOCK_EXAM_MODE_LABELS]}
              </p>
            </div>

            {/* 코칭 한줄평 */}
            {latest.coaching_headline && (
              <div className="mt-3 rounded-lg bg-surface-secondary/60 px-3 py-2">
                <p className="line-clamp-2 text-xs leading-relaxed text-foreground-secondary sm:text-sm">
                  {latest.coaching_headline}
                </p>
              </div>
            )}

            {/* 상세 결과 보기 */}
            <button
              onClick={() => onViewResult(latest.session_id)}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors sm:mt-4 sm:py-2.5"
            >
              상세 결과 보기
              <ArrowRight size={14} />
            </button>
          </div>

          {/* 등급 추이 그래프 (2건 이상) 또는 현재 상태 카드 (1건) */}
          {trendData.length >= 2 ? (
            <GradeProgressChart data={trendData} />
          ) : trendData.length === 1 ? (
            <CurrentStateCard data={trendData[0]} targetGrade={targetGrade} />
          ) : null}
        </div>
      )}


      {/* 응시 이력 섹션 */}
      <div className="mt-1 border-t border-border pt-3 sm:mt-2 sm:pt-4">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold text-foreground">
            <History size={16} className="text-foreground-muted" />
            응시 이력
            <span className="text-sm font-normal text-foreground-muted">
              {filtered.length}건
            </span>
          </h3>
          <div className="flex items-center gap-0.5 sm:gap-1.5">
            {(["all", "training", "test"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setModeFilter(mode)}
                className={`rounded-full px-2 py-1 text-[11px] transition-colors sm:px-2.5 ${
                  modeFilter === mode
                    ? "bg-primary-100 font-medium text-primary-600"
                    : "text-foreground-muted hover:bg-surface-secondary"
                }`}
              >
                {mode === "all" ? "전체" : MOCK_EXAM_MODE_LABELS[mode]}
              </button>
            ))}
            <span className="mx-px h-3 w-px bg-border sm:mx-0.5" />
            <button
              onClick={() => setShowExpired(!showExpired)}
              className={`rounded-full px-2 py-1 text-[11px] transition-colors sm:px-2.5 ${
                showExpired
                  ? "bg-foreground-muted/15 font-medium text-foreground-secondary"
                  : "text-foreground-muted hover:bg-surface-secondary"
              }`}
            >
              만료 포함
            </button>
        </div>
      </div>

      {filtered.map((item) => {
        const isLoading = loadingSessionId === item.session_id;
        const isClickable = item.status === "completed" && !!item.final_level;
        return (
        <button
          key={item.session_id}
          disabled={!!loadingSessionId}
          onClick={() => {
            if (isClickable) {
              setLoadingSessionId(item.session_id);
              onViewResult(item.session_id);
            }
          }}
          className={`group mt-2.5 w-full rounded-xl border p-3 text-left transition-all sm:mt-3 sm:p-4 ${
            isLoading
              ? "border-primary-300 bg-primary-50/50 ring-1 ring-primary-200"
              : isClickable
                ? "cursor-pointer border-border bg-surface hover:border-primary-300 hover:bg-primary-50/40 hover:shadow-sm active:scale-[0.99]"
                : "cursor-default border-border bg-surface opacity-60"
          }`}
        >
          <div className="flex items-center gap-3 sm:gap-4">
            {/* 등급 배지 */}
            {item.final_level ? (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 sm:h-12 sm:w-12">
                <span className="text-sm font-bold text-primary-600 sm:text-base">
                  {item.final_level}
                </span>
              </div>
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-secondary sm:h-12 sm:w-12">
                <Trophy size={18} className="text-foreground-muted" />
              </div>
            )}

            {/* 회차 + 상태 + 주제 */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-sm font-medium text-foreground">
                  {item.attempt_number > 0 ? `${item.attempt_number}회차` : MOCK_EXAM_MODE_LABELS[item.mode]}
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
              {item.topic_summary && (
                <p className="mt-0.5 min-w-0 truncate text-[11px] text-foreground-muted sm:text-xs">
                  {item.topic_summary}
                </p>
              )}
            </div>

            {/* 날짜 + 모드 (오른쪽) */}
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              <span className="text-[11px] text-foreground-muted sm:text-xs">
                {new Date(item.started_at).toLocaleDateString("ko-KR")}
              </span>
              <span className="text-[10px] text-foreground-muted sm:text-[11px]">
                {MOCK_EXAM_MODE_LABELS[item.mode]}
              </span>
            </div>

            {/* 화살표 / 로딩 */}
            {isClickable && (
              isLoading ? (
                <Loader2 size={16} className="shrink-0 animate-spin text-primary-500" />
              ) : (
                <ChevronRight size={16} className="hidden shrink-0 text-foreground-muted transition-colors group-hover:text-primary-500 sm:block" />
              )
            )}
          </div>
        </button>
        );
      })}
      </div>
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
