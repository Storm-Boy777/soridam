"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatUsd } from "@/lib/constants/pricing";
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  Info,
  Loader2,
  Sparkles,
  Target,
  Coins,
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
  const { data: activeData, refetch: refetchActive } = useQuery({
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
      // 폴링 시작을 위해 active session + diagnosis 모두 refetch
      await refetchActive();
      await refetchDiagnosis();
    } catch {
      alert("진단 시작에 실패했습니다.");
    } finally {
      setIsStarting(false);
    }
  };

  const [bannerOpen, setBannerOpen] = useState(false);

  // ── 상태별 콘텐츠 결정 ──

  let content: React.ReactNode;

  if (!eligibility?.eligible) {
    content = (
      <IneligibleView
        completedCount={eligibility?.completed_count ?? 0}
        requiredCount={eligibility?.required_count ?? 3}
      />
    );
  } else if (isDiagnosing || isStarting) {
    content = <DiagnosingView />;
  } else if (session && session.status !== "diagnosing") {
    content = (
      <DiagnosisResultView
        session={session}
        focuses={focuses}
        onStartTraining={onStartTraining}
      />
    );
  } else {
    content = (
      <StartDiagnosisView
        credit={credit}
        targetGrade={targetGrade || ""}
        onStart={handleStartDiagnosis}
        isStarting={isStarting}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 접이식 안내 배너 — 모의고사 "모의고사 안내" 패턴과 동일 */}
      <button
        onClick={() => setBannerOpen(!bannerOpen)}
        className="flex w-full items-start gap-2.5 rounded-xl border border-primary-200 bg-primary-50/50 p-3 text-left sm:gap-3 sm:p-4"
      >
        <Info size={18} className="shrink-0 text-primary-500" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">튜터링 안내</p>
            {credit && (
              <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                <Coins size={11} />
                크레딧 : {formatUsd(credit.balanceCents)}
              </span>
            )}
          </div>
          {bannerOpen && (
            <p className="mt-0.5 text-xs text-foreground-secondary sm:mt-1 sm:text-sm">
              모의고사 3회 이상의 데이터를 종합 분석하여, 목표 등급까지 막고 있는
              반복 병목을 찾아냅니다. 병목별 맞춤 드릴로 구조를 익히고, 직접 다시
              말하면서 수행을 자동화하는 방식으로 훈련합니다.
            </p>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`shrink-0 text-primary-400 transition-transform ${bannerOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* 상태별 콘텐츠 */}
      {content}
    </div>
  );
}

/* ── 공통: 3단계 안내 (시험후기 후기제출 패턴) ── */

const TUTORING_STEPS = [
  { step: 1, title: "반복 약점 진단", desc: "여러 회차 데이터에서 패턴 분석" },
  { step: 2, title: "맞춤 훈련 처방", desc: "핵심 병목 3개와 드릴 추천" },
  { step: 3, title: "재발화 훈련", desc: "직접 말하고 개선 확인하는 루프" },
];

function StepsGuide() {
  return (
    <>
      {/* 모바일: 세로 타임라인 */}
      <div className="relative mt-4 sm:hidden">
        {TUTORING_STEPS.map((s, i) => (
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
      {/* PC: 가로 그리드 + 화살표 */}
      <div className="hidden sm:mt-6 sm:grid sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center sm:gap-3">
        {TUTORING_STEPS.flatMap((s, i) => [
          <div key={s.step} className="flex flex-col items-center text-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-border bg-surface-secondary text-sm font-bold text-foreground-muted">
              {s.step}
            </div>
            <p className="mt-2 text-sm font-semibold text-foreground">{s.title}</p>
            <p className="mt-0.5 text-xs text-foreground-secondary">{s.desc}</p>
          </div>,
          ...(i < 2
            ? [<div key={`arrow-${i}`}><ArrowRight size={20} className="text-foreground-muted" /></div>]
            : []),
        ])}
      </div>
    </>
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
    <>
      {/* 진행 과정 카드 */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-foreground sm:text-base">튜터링 진행 과정</h3>
        <p className="mt-0.5 text-xs text-foreground-secondary sm:mt-1 sm:text-sm">
          모의고사 결과에서 반복 병목을 찾고, 맞춤 드릴로 훈련합니다
        </p>
        <StepsGuide />
      </div>

      {/* 미자격 안내 카드 */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-foreground sm:text-base">
          모의고사 {remaining}회 더 필요해요
        </h3>
        <p className="mt-0.5 text-xs text-foreground-secondary sm:mt-1 sm:text-sm">
          튜터링은 모의고사 {requiredCount}회 이상의 데이터를 분석하여 반복되는 약점을 정확히 잡아냅니다.
        </p>

        {/* 진행률 */}
        <div className="mt-4 sm:mt-5">
          <div className="mb-2 flex items-end justify-between text-xs text-foreground-secondary">
            <span>현재 <span className="font-semibold text-foreground">{completedCount}</span>회 완료</span>
            <span>최소 {requiredCount}회 · 최대 5회 분석</span>
          </div>
          <div className="relative h-2.5 overflow-hidden rounded-full bg-surface-secondary sm:h-3">
            <div
              className="h-full rounded-full bg-primary-500 transition-all"
              style={{ width: `${Math.min(100, (completedCount / 5) * 100)}%` }}
            />
            <div
              className="absolute top-0 h-full w-px bg-primary-700/40"
              style={{ left: `${(3 / 5) * 100}%` }}
            />
          </div>
          <div className="mt-1.5 flex text-[10px] text-foreground-muted sm:text-xs">
            <span>0회</span>
            <span className="ml-auto mr-8">3회 (시작 가능)</span>
            <span>5회</span>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-4 border-t border-border pt-3 sm:mt-5 sm:pt-4">
          <a
            href="/mock-exam"
            className="flex h-9 w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-primary-500 px-4 text-sm font-medium text-white transition-colors hover:bg-primary-600 sm:h-10"
          >
            <Target size={16} />
            모의고사 응시하기
          </a>
        </div>
      </div>
    </>
  );
}

/* ── 진단 진행 중 화면 ── */

function DiagnosingView() {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 sm:p-8">
      <div className="mx-auto max-w-md text-center">
        <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-primary-500 sm:h-12 sm:w-12" />
        <h3 className="text-base font-semibold text-foreground sm:text-lg">분석 중이에요</h3>
        <p className="mt-2 text-xs leading-relaxed text-foreground-secondary sm:text-sm">
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
    <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 sm:p-6">
      <h3 className="text-sm font-semibold text-foreground sm:text-base">튜터링 시작하기</h3>
      <p className="mt-0.5 text-xs text-foreground-secondary sm:mt-1 sm:text-sm">
        최근 모의고사 데이터를 분석하여 목표 등급
        {targetGrade && (
          <span className="font-semibold text-primary-500"> {targetGrade}</span>
        )}
        까지 막고 있는 핵심 병목을 찾아드립니다.
      </p>

      <StepsGuide />

      {/* CTA */}
      <div className="mt-4 border-t border-border pt-3 sm:mt-6 sm:pt-4">
        {hasCredit ? (
          <button
            onClick={onStart}
            disabled={isStarting}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-primary-500 px-4 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-50 sm:h-10"
          >
            {isStarting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            진단 시작하기
          </button>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-2 text-xs text-foreground-secondary sm:text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 text-accent-500" />
              크레딧이 부족합니다
            </div>
            <a
              href="/store"
              className="flex h-9 w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-primary-500 px-4 text-sm font-medium text-white transition-colors hover:bg-primary-600 sm:h-10"
            >
              크레딧 충전하기
              <ArrowRight size={16} />
            </a>
          </>
        )}
        <p className="mt-2 text-center text-[11px] text-foreground-muted sm:text-xs">
          크레딧이 사용량에 따라 차감됩니다
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

  // session_id → "N회차" 매핑 생성
  const sessionIdMap: Record<string, string> = {};
  (session.analyzed_session_ids ?? []).forEach((sid, idx) => {
    sessionIdMap[sid] = `${idx + 1}회차`;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 등급 상태 카드 */}
      <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
        <h3 className="mb-3 text-sm font-semibold text-foreground sm:mb-4 sm:text-base">현재 상태</h3>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
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
          <div className="mt-3 space-y-1.5 rounded-lg bg-surface-secondary p-3 text-xs text-foreground-secondary sm:mt-4 sm:text-sm">
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
          <h3 className="mb-3 text-sm font-semibold text-foreground sm:mb-4 sm:text-base">
            이번 핵심 병목
          </h3>
          <div className="space-y-2.5 sm:space-y-3">
            {focuses.map((focus, idx) => (
              <div
                key={focus.id}
                className="flex items-start gap-2.5 rounded-lg border border-border p-3 sm:gap-3 sm:p-4"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-500 text-[11px] font-bold text-white sm:h-7 sm:w-7 sm:text-xs">
                  {idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground sm:text-sm">{focus.label}</p>
                  {focus.reason && (
                    <p className="mt-0.5 text-[11px] leading-relaxed text-foreground-secondary sm:text-xs">{focus.reason}</p>
                  )}
                  {focus.why_now_for_target && (
                    <p className="mt-1 text-[11px] text-primary-600 sm:text-xs">{focus.why_now_for_target}</p>
                  )}
                  <div className="mt-1.5 sm:mt-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium sm:text-xs ${
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
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 sm:py-3"
          >
            훈련 시작하기
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Type Mastery (클릭 시 상세) */}
      {session.diagnosis_internal?.type_mastery && (
        <MasterySection
          title="유형별 상태"
          entries={session.diagnosis_internal.type_mastery}
          details={session.diagnosis_internal.type_details}
          labelMap={TYPE_LABELS}
          sessionIdMap={sessionIdMap}
        />
      )}

      {/* Topic Mastery (클릭 시 상세) */}
      {session.diagnosis_internal?.topic_mastery && (
        <MasterySection
          title="주제별 상태"
          subtitle="같은 주제에서 반복 취약하면 해당 이야기 세계의 훈련이 더 필요합니다"
          entries={session.diagnosis_internal.topic_mastery}
          details={session.diagnosis_internal.topic_details}
          columns="topic"
          sessionIdMap={sessionIdMap}
        />
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
    <div className={`rounded-lg border p-2.5 text-center sm:p-3 ${colors[variant]}`}>
      <p className="text-[10px] text-foreground-secondary sm:text-xs">{label}</p>
      <p className={`mt-0.5 text-base font-bold sm:mt-1 sm:text-lg ${textColors[variant]}`}>{level}</p>
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

/* ── Mastery 섹션 (클릭 시 상세 근거 표시) ── */

function MasterySection({
  title,
  subtitle,
  entries,
  details,
  labelMap,
  columns = "type",
  sessionIdMap,
}: {
  title: string;
  subtitle?: string;
  entries: Record<string, string>;
  details?: Record<string, { mastery: string; reason: string; evidence: string[] }>;
  labelMap?: Record<string, string>;
  columns?: "type" | "topic";
  sessionIdMap?: Record<string, string>; // session_id → "N회차" 매핑
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  // evidence 텍스트에서 session_id를 "N회차"로 치환
  const formatEvidence = (text: string) => {
    if (!sessionIdMap) return text;
    let result = text;
    for (const [sid, label] of Object.entries(sessionIdMap)) {
      result = result.replace(sid, label);
    }
    return result;
  };

  const gridCols = columns === "type"
    ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
    : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";

  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
      <h3 className="mb-1 text-sm font-semibold text-foreground sm:text-base">{title}</h3>
      {subtitle && (
        <p className="mb-3 text-[11px] text-foreground-muted sm:text-xs">{subtitle}</p>
      )}
      {!subtitle && <div className="mb-3" />}

      <div className={`grid gap-1.5 sm:gap-2 ${gridCols}`}>
        {Object.entries(entries).map(([key, level]) => {
          const hasDetail = details?.[key];
          const isExpanded = expanded === key;
          const displayLabel = labelMap?.[key] ?? key;

          return (
            <button
              key={key}
              onClick={() => hasDetail ? setExpanded(isExpanded ? null : key) : undefined}
              className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition-colors sm:px-3 sm:py-2 ${
                isExpanded
                  ? "bg-primary-50 ring-1 ring-primary-200"
                  : hasDetail
                    ? "bg-surface-secondary hover:bg-surface-secondary/80 cursor-pointer"
                    : "bg-surface-secondary cursor-default"
              }`}
            >
              <span className="truncate text-[11px] text-foreground-secondary sm:text-xs">{displayLabel}</span>
              <MasteryBadge level={level as string} />
            </button>
          );
        })}
      </div>

      {/* 상세 근거 패널 */}
      {expanded && details?.[expanded] && (
        <div className="mt-3 rounded-lg border border-primary-200 bg-primary-50/30 p-3 sm:p-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-semibold text-foreground sm:text-sm">
              {labelMap?.[expanded] ?? expanded}
              <MasteryBadge level={details[expanded].mastery} />
            </h4>
            <button
              onClick={() => setExpanded(null)}
              className="text-xs text-foreground-muted hover:text-foreground"
            >
              닫기
            </button>
          </div>

          {/* 이유 */}
          <p className="text-xs leading-relaxed text-foreground-secondary sm:text-sm">
            {details[expanded].reason}
          </p>

          {/* 근거 */}
          {details[expanded].evidence?.length > 0 && (
            <ul className="mt-2 space-y-1">
              {details[expanded].evidence.map((ev, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11px] text-foreground-secondary sm:text-xs">
                  <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-primary-400" />
                  {formatEvidence(ev)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
