"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  checkTutoringEligibility,
  checkTutoringCredit,
  getDiagnosisData,
  getActiveSession,
  startDiagnosis,
} from "@/lib/actions/tutoring";
import type {
  TutoringSession,
  TutoringFocus,
  TutoringEligibility,
  TutoringCredit,
} from "@/lib/types/tutoring";
import { FOCUS_STATUS_LABELS } from "@/lib/types/tutoring";

/* ── Props ── */

interface DiagnosisTabProps {
  initialEligibility?: TutoringEligibility;
  initialCredit?: TutoringCredit;
  initialDiagnosis?: {
    session: TutoringSession | null;
    focuses: TutoringFocus[];
  };
  initialActive?: { session: TutoringSession | null };
  targetGrade?: string;
  onStartTraining: () => void;
}

/* ── 메인 컴포넌트 ── */

export function DiagnosisTab({
  initialEligibility,
  initialCredit,
  initialDiagnosis,
  initialActive,
  targetGrade,
  onStartTraining,
}: DiagnosisTabProps) {
  const [isStarting, setIsStarting] = useState(false);

  // 자격 확인
  const { data: eligibility } = useQuery({
    queryKey: ["tutoring-eligibility"],
    queryFn: async () => {
      const res = await checkTutoringEligibility();
      return res.data;
    },
    initialData: initialEligibility,
    staleTime: 5 * 60 * 1000,
  });

  // 크레딧 확인
  const { data: credit } = useQuery({
    queryKey: ["tutoring-credit"],
    queryFn: async () => {
      const res = await checkTutoringCredit();
      return res.data;
    },
    initialData: initialCredit,
    staleTime: 60 * 1000,
  });

  // 진단 결과 (진행 중이면 폴링)
  const { data: diagnosisData, refetch: refetchDiagnosis } = useQuery({
    queryKey: ["tutoring-diagnosis"],
    queryFn: async () => {
      const res = await getDiagnosisData();
      return res.data;
    },
    initialData: initialDiagnosis,
    staleTime: 10 * 1000,
  });

  // 활성 세션 (diagnosing 상태 폴링)
  const { data: activeData } = useQuery({
    queryKey: ["tutoring-active-session"],
    queryFn: async () => {
      const res = await getActiveSession();
      return res.data;
    },
    initialData: initialActive,
    refetchInterval: (query) => {
      const session = query.state.data?.session;
      // diagnosing 상태면 5초마다 폴링
      if (session?.status === "diagnosing") return 5000;
      return false;
    },
    staleTime: 5000,
  });

  const session = diagnosisData?.session ?? activeData?.session;
  const focuses = diagnosisData?.focuses ?? [];
  const isDiagnosing = activeData?.session?.status === "diagnosing";

  // 진단 시작 핸들러
  const handleStartDiagnosis = async () => {
    setIsStarting(true);
    try {
      const result = await startDiagnosis();
      if (result.error) {
        alert(result.error);
        return;
      }
      // 폴링 시작을 위해 refetch
      await refetchDiagnosis();
    } catch {
      alert("진단 시작에 실패했습니다.");
    } finally {
      setIsStarting(false);
    }
  };

  // ── 상태별 렌더링 ──

  // Case 1: 자격 미충족
  if (!eligibility?.eligible) {
    return (
      <IneligibleView
        completedCount={eligibility?.completed_count ?? 0}
        requiredCount={eligibility?.required_count ?? 3}
      />
    );
  }

  // Case 2: 진단 진행 중
  if (isDiagnosing || isStarting) {
    return <DiagnosingView />;
  }

  // Case 3: 진단 결과 있음
  if (session && session.status !== "diagnosing") {
    return (
      <DiagnosisResultView
        session={session}
        focuses={focuses}
        onStartTraining={onStartTraining}
      />
    );
  }

  // Case 4: 진단 시작 가능
  return (
    <StartDiagnosisView
      credit={credit}
      targetGrade={targetGrade || ""}
      onStart={handleStartDiagnosis}
      isStarting={isStarting}
    />
  );
}

/* ── 자격 미충족 화면 ── */

function IneligibleView({
  completedCount,
  requiredCount,
}: {
  completedCount: number;
  requiredCount: number;
}) {
  const remaining = requiredCount - completedCount;

  return (
    <div className="rounded-xl border border-border bg-surface p-6 sm:p-8">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
          <Target className="h-8 w-8 text-primary-500" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">
          모의고사 {remaining}회 더 필요해요
        </h3>
        <p className="mt-2 text-sm text-foreground-secondary">
          AI 튜터링은 모의고사 {requiredCount}회 이상의 데이터를 분석하여
          반복되는 약점을 정확히 잡아냅니다.
        </p>

        {/* 진행률 */}
        <div className="mt-6">
          <div className="mb-2 flex justify-between text-xs text-foreground-secondary">
            <span>현재 {completedCount}회 완료</span>
            <span>{requiredCount}회 필요</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-surface-secondary">
            <div
              className="h-full rounded-full bg-primary-500 transition-all"
              style={{
                width: `${Math.min(100, (completedCount / requiredCount) * 100)}%`,
              }}
            />
          </div>
        </div>

        <a
          href="/mock-exam"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          모의고사 응시하기
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

/* ── 진단 진행 중 화면 ── */

function DiagnosingView() {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 sm:p-8">
      <div className="mx-auto max-w-md text-center">
        <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary-500" />
        <h3 className="text-lg font-semibold text-foreground">AI가 분석 중이에요</h3>
        <p className="mt-2 text-sm text-foreground-secondary">
          최근 모의고사 데이터를 종합 분석하여
          <br />
          반복 약점과 맞춤 훈련 계획을 만들고 있습니다.
        </p>
        <p className="mt-4 text-xs text-foreground-muted">약 30초~1분 소요됩니다</p>
      </div>
    </div>
  );
}

/* ── 진단 시작 화면 ── */

function StartDiagnosisView({
  credit,
  targetGrade,
  onStart,
  isStarting,
}: {
  credit?: TutoringCredit;
  targetGrade: string;
  onStart: () => void;
  isStarting: boolean;
}) {
  const hasCredit = credit?.available ?? false;

  return (
    <div className="rounded-xl border border-border bg-surface p-6 sm:p-8">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
          <Sparkles className="h-8 w-8 text-primary-500" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">AI 튜터링 시작하기</h3>
        <p className="mt-2 text-sm text-foreground-secondary">
          최근 모의고사 데이터를 분석하여 목표 등급
          {targetGrade && (
            <span className="font-semibold text-primary-500"> {targetGrade}</span>
          )}
          까지 막고 있는 핵심 병목을 찾아드립니다.
        </p>

        <div className="mt-6 space-y-3 text-left">
          <div className="flex items-start gap-3 rounded-lg bg-surface-secondary p-3">
            <Zap className="mt-0.5 h-5 w-5 shrink-0 text-primary-500" />
            <div>
              <p className="text-sm font-medium text-foreground">반복 약점 진단</p>
              <p className="text-xs text-foreground-secondary">
                여러 회차에 걸쳐 반복되는 패턴만 병목으로 잡아냅니다
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-surface-secondary p-3">
            <Target className="mt-0.5 h-5 w-5 shrink-0 text-primary-500" />
            <div>
              <p className="text-sm font-medium text-foreground">맞춤 훈련 처방</p>
              <p className="text-xs text-foreground-secondary">
                목표 등급에 맞춘 핵심 병목 3개와 드릴을 추천합니다
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-surface-secondary p-3">
            <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-primary-500" />
            <div>
              <p className="text-sm font-medium text-foreground">재발화 중심 훈련</p>
              <p className="text-xs text-foreground-secondary">
                직접 다시 말하고, 개선 여부를 확인하는 루프 훈련
              </p>
            </div>
          </div>
        </div>

        {hasCredit ? (
          <button
            onClick={onStart}
            disabled={isStarting}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            {isStarting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            진단 시작하기
          </button>
        ) : (
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-center gap-2 text-sm text-foreground-secondary">
              <AlertTriangle className="h-4 w-4 text-accent-500" />
              튜터링 크레딧이 없습니다
            </div>
            <a
              href="/store"
              className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
            >
              크레딧 구매하기
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        )}

        <p className="mt-3 text-xs text-foreground-muted">
          크레딧 1회 소모 · 진단 + 훈련 전체 포함
        </p>
      </div>
    </div>
  );
}

/* ── 진단 결과 화면 ── */

function DiagnosisResultView({
  session,
  focuses,
  onStartTraining,
}: {
  session: TutoringSession;
  focuses: TutoringFocus[];
  onStartTraining: () => void;
}) {
  const summary = session.student_summary;
  const gapSummary = session.target_gap_summary;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 등급 상태 카드 */}
      <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
        <h3 className="mb-4 text-base font-semibold text-foreground sm:text-lg">현재 상태</h3>
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <LevelCard
            label="현재 안정권"
            level={session.current_stable_level}
            variant="current"
          />
          <LevelCard
            label="다음 단계"
            level={session.next_step_level}
            variant="next"
          />
          <LevelCard
            label="최종 목표"
            level={session.final_target_level}
            variant="target"
          />
        </div>

        {/* 갭 요약 */}
        {gapSummary && (
          <div className="mt-4 space-y-2 rounded-lg bg-surface-secondary p-3 text-sm text-foreground-secondary">
            {gapSummary.current_to_next && <p>→ {gapSummary.current_to_next}</p>}
            {gapSummary.next_to_final && <p>→ {gapSummary.next_to_final}</p>}
          </div>
        )}
      </div>

      {/* 코치 메시지 */}
      {summary && (
        <div className="rounded-xl border border-primary-200 bg-primary-50/50 p-4 sm:p-6">
          <p className="text-sm font-medium text-foreground">{summary.why_now_message}</p>
        </div>
      )}

      {/* 병목 Top 3 */}
      {focuses.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
          <h3 className="mb-4 text-base font-semibold text-foreground sm:text-lg">
            이번 핵심 병목
          </h3>
          <div className="space-y-3">
            {focuses.map((focus, idx) => (
              <div
                key={focus.id}
                className="flex items-start gap-3 rounded-lg border border-border p-3 sm:p-4"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white">
                  {idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{focus.label}</p>
                  {focus.reason && (
                    <p className="mt-0.5 text-xs text-foreground-secondary">{focus.reason}</p>
                  )}
                  {focus.why_now_for_target && (
                    <p className="mt-1 text-xs text-primary-600">{focus.why_now_for_target}</p>
                  )}
                  <div className="mt-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        focus.status === "graduated"
                          ? "bg-green-100 text-green-700"
                          : focus.status === "active"
                            ? "bg-primary-100 text-primary-700"
                            : focus.status === "improving"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {FOCUS_STATUS_LABELS[focus.status]}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={onStartTraining}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            훈련 시작하기
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Type Mastery (간략) */}
      {session.diagnosis_internal?.type_mastery && (
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
          <h3 className="mb-3 text-base font-semibold text-foreground">유형별 상태</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {Object.entries(session.diagnosis_internal.type_mastery).map(([type, level]) => (
              <div
                key={type}
                className="flex items-center justify-between rounded-lg bg-surface-secondary px-3 py-2"
              >
                <span className="text-xs text-foreground-secondary">{TYPE_LABELS[type] ?? type}</span>
                <MasteryBadge level={level as string} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Topic Mastery (설계서 5-1: topic은 같은 이야기 세계를 공유하는 질문 묶음) */}
      {session.diagnosis_internal?.topic_mastery && (
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
          <h3 className="mb-1 text-base font-semibold text-foreground">주제별 상태</h3>
          <p className="mb-3 text-xs text-foreground-muted">
            같은 주제에서 반복 취약하면 해당 이야기 세계의 훈련이 더 필요합니다
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {Object.entries(session.diagnosis_internal.topic_mastery).map(([topic, level]) => (
              <div
                key={topic}
                className="flex items-center justify-between rounded-lg bg-surface-secondary px-3 py-2"
              >
                <span className="text-xs text-foreground-secondary">{topic}</span>
                <MasteryBadge level={level as string} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 헬퍼 컴포넌트 ── */

function LevelCard({
  label,
  level,
  variant,
}: {
  label: string;
  level: string;
  variant: "current" | "next" | "target";
}) {
  const colors = {
    current: "border-blue-200 bg-blue-50",
    next: "border-primary-200 bg-primary-50",
    target: "border-green-200 bg-green-50",
  };

  const textColors = {
    current: "text-blue-700",
    next: "text-primary-700",
    target: "text-green-700",
  };

  return (
    <div className={`rounded-lg border p-3 text-center ${colors[variant]}`}>
      <p className="text-xs text-foreground-secondary">{label}</p>
      <p className={`mt-1 text-lg font-bold ${textColors[variant]}`}>{level}</p>
    </div>
  );
}

function MasteryBadge({ level }: { level: string }) {
  const config: Record<string, { label: string; className: string }> = {
    stable: { label: "안정", className: "bg-green-100 text-green-700" },
    borderline: { label: "불안정", className: "bg-yellow-100 text-yellow-700" },
    weak: { label: "취약", className: "bg-red-100 text-red-700" },
    not_ready: { label: "미준비", className: "bg-gray-100 text-gray-500" },
  };

  const c = config[level] ?? { label: level, className: "bg-gray-100 text-gray-500" };

  return (
    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${c.className}`}>
      {c.label}
    </span>
  );
}

/* ── 상수 ── */

const TYPE_LABELS: Record<string, string> = {
  description: "묘사",
  routine: "루틴",
  past_childhood: "어린시절",
  past_recent: "최근경험",
  past_special: "특별경험",
  comparison: "비교",
  rp_11: "RP질문",
  rp_12: "RP해결",
  adv_14: "고급변화",
  adv_15: "고급이슈",
};
