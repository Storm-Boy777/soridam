"use client";

import { useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Stethoscope,
  ClipboardCheck,
  Dumbbell,
  ArrowRight,
  Info,
  Target,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BarChart3,
  Zap,
  Loader2,
} from "lucide-react";
import {
  getDiagnosis,
  startTutoringSession,
  getPrescriptions,
} from "@/lib/actions/tutoring";
import type { TutoringPrescriptionRow } from "@/lib/types/tutoring";

/* ── 상수 ── */

const tabs = [
  { id: "diagnosis", label: "진단", icon: Stethoscope },
  { id: "prescription", label: "처방", icon: ClipboardCheck },
  { id: "training", label: "훈련", icon: Dumbbell },
] as const;

type TabId = (typeof tabs)[number]["id"];

const FACT_LABELS: Record<string, string> = {
  F: "말하기흐름",
  A: "문법정확성",
  C: "내용풍부도",
  T: "질문수행력",
};

const QT_KO: Record<string, string> = {
  description: "묘사",
  routine: "루틴",
  comparison: "비교",
  past_experience_memorable: "경험(기억나는)",
  past_experience_change: "경험(변화)",
  past_experience_childhood: "경험(어린시절)",
  roleplay_12: "롤플레이(Q12)",
  roleplay_11: "롤플레이(Q11)",
  advanced_15: "의견/제안(Q15)",
  rp_11: "롤플레이(Q11)",
  rp_12: "롤플레이(Q12)",
  past_childhood: "경험(어린시절)",
  past_memorable: "경험(기억나는)",
  past_change: "경험(변화)",
};

const PRIORITY_BADGE: Record<number, { label: string; color: string }> = {
  1: { label: "높음", color: "bg-red-100 text-red-700 border-red-200" },
  2: { label: "권장", color: "bg-amber-100 text-amber-700 border-amber-200" },
  3: { label: "추가", color: "bg-green-100 text-green-700 border-green-200" },
};

/* ── 메인 컴포넌트 ── */

type DiagnosisData = Awaited<ReturnType<typeof getDiagnosis>>["data"];

export function TutoringContent({
  initialDiagnosis,
}: {
  initialDiagnosis?: DiagnosisData;
} = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // URL ?tab= 파라미터가 single source of truth (useState 없이 URL에서 직접 읽기)
  const tabParam = searchParams.get("tab") as TabId | null;
  const activeTab: TabId = tabParam && tabs.some((t) => t.id === tabParam) ? tabParam : "diagnosis";

  const setActiveTab = useCallback((id: TabId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", id);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const { data: diagData, isLoading, isError, error } = useQuery({
    queryKey: ["tutoring-diagnosis"],
    queryFn: async () => {
      const result = await getDiagnosis();
      if (result.error || !result.data) throw new Error(result.error || "진단 데이터 조회 실패");
      return result.data;
    },
    initialData: initialDiagnosis ?? undefined,
    staleTime: 5 * 60 * 1000,
  });

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

      {/* 로딩 */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-primary-500" />
        </div>
      )}

      {/* 에러 */}
      {isError && (
        <div className="rounded-[var(--radius-xl)] border border-red-200 bg-red-50 p-4 text-center">
          <AlertTriangle size={20} className="mx-auto text-red-400" />
          <p className="mt-2 text-sm text-red-600">
            {error?.message || "데이터를 불러오지 못했습니다"}
          </p>
        </div>
      )}

      {/* 탭 콘텐츠 */}
      {!isLoading && !isError && activeTab === "diagnosis" && (
        <DiagnosisTab diagData={diagData} />
      )}
      {!isLoading && !isError && activeTab === "prescription" && (
        <PrescriptionTab diagData={diagData} />
      )}
      {!isLoading && !isError && activeTab === "training" && (
        <TrainingTab diagData={diagData} />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   진단 탭
   ══════════════════════════════════════════════ */

function DiagnosisTab({
  diagData,
}: {
  diagData: Awaited<ReturnType<typeof getDiagnosis>>["data"] | undefined;
}) {
  const reports = diagData?.mockReports || [];
  const [selectedIdx, setSelectedIdx] = useState(0);
  // selectedIdx 범위 초과 방어 (reports 변경 시)
  const safeIdx = selectedIdx < reports.length ? selectedIdx : 0;
  const report = reports[safeIdx];

  if (reports.length === 0) {
    return <EmptyState icon={Stethoscope} title="아직 진단 결과가 없습니다" desc="모의고사를 응시하면 자동으로 진단이 시작됩니다" />;
  }

  const coaching = report.coaching_report as Record<string, unknown> | null;
  const snapshot = coaching?.snapshot as Record<string, unknown> | null;
  const gradeExpl = coaching?.grade_explanation as Record<string, unknown> | null;
  const top3 = (coaching?.top3_priorities || []) as Array<Record<string, unknown>>;
  const typeMap = (coaching?.question_type_map || []) as Array<Record<string, unknown>>;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 모의고사 선택 드롭다운 */}
      {reports.length > 1 && (
        <select
          value={selectedIdx}
          onChange={(e) => setSelectedIdx(Number(e.target.value))}
          className="w-full rounded-[var(--radius-lg)] border border-border bg-surface px-3 py-2 text-sm"
        >
          {reports.map((r, i) => (
            <option key={r.session_id} value={i}>
              {new Date(r.created_at).toLocaleDateString("ko-KR")} — {r.final_level} ({r.total_score}점)
            </option>
          ))}
        </select>
      )}

      {/* 등급 + 스냅샷 */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 font-bold text-primary-600 sm:h-14 sm:w-14 sm:text-lg">
            {report.final_level}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground sm:text-base">
              확정 등급: {report.final_level}
            </p>
            <p className="text-xs text-foreground-secondary">
              목표: {report.target_level} · 총점: {Number(report.total_score)}/100
            </p>
          </div>
        </div>
        {snapshot?.headline ? (
          <p className="mt-3 text-sm text-foreground-secondary">
            {String(snapshot.headline)}
          </p>
        ) : null}
        {Array.isArray(snapshot?.diagnosis_tags) ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(snapshot.diagnosis_tags as string[]).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-600"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* FACT 점수 */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 sm:p-6">
        <h3 className="mb-3 text-sm font-semibold text-foreground sm:text-base">
          FACT 영역별 점수
        </h3>
        <div className="space-y-3">
          {(["F", "A", "C", "T"] as const).map((key) => {
            // Supabase NUMERIC → string 방어 (Number 변환)
            const rawScore =
              key === "F"
                ? report.score_f
                : key === "A"
                  ? report.score_a
                  : key === "C"
                    ? report.score_c
                    : report.score_t;
            const score = typeof rawScore === "string" ? Number(rawScore) : rawScore;
            const interp =
              (gradeExpl?.fact_interpretation as Record<string, string>)?.[key] || "";
            return (
              <div key={key}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">
                    {FACT_LABELS[key]}
                  </span>
                  <span className="font-semibold text-primary-600">
                    {score}/10
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-secondary">
                  <div
                    className="h-full rounded-full bg-primary-500 transition-all"
                    style={{ width: `${((score || 0) / 10) * 100}%` }}
                  />
                </div>
                {interp && (
                  <p className="mt-0.5 text-xs text-foreground-muted">
                    {interp}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 약점 Top 3 */}
      {top3.length > 0 && (
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 sm:p-6">
          <h3 className="mb-3 text-sm font-semibold text-foreground sm:text-base">
            핵심 약점 Top 3
          </h3>
          <div className="space-y-3">
            {top3.map((item, i) => (
              <div
                key={i}
                className="rounded-[var(--radius-lg)] border border-border bg-background p-3"
              >
                <div className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-500 text-[10px] font-bold text-white">
                    {(item.rank as number) || i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {item.label as string}
                    </p>
                    <p className="mt-0.5 text-xs text-foreground-secondary">
                      {item.why as string}
                    </p>
                    {Array.isArray(item.where) ? (
                      <p className="mt-0.5 text-xs text-foreground-muted">
                        출현: {(item.where as string[]).join(", ")}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 유형별 상태 */}
      {typeMap.length > 0 && (
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 sm:p-6">
          <h3 className="mb-3 text-sm font-semibold text-foreground sm:text-base">
            유형별 진단
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {typeMap.map((item, i) => {
              const status = item.status as string;
              const statusColor =
                status === "strong"
                  ? "text-green-600 bg-green-50"
                  : status === "stable"
                    ? "text-blue-600 bg-blue-50"
                    : status === "weak"
                      ? "text-amber-600 bg-amber-50"
                      : "text-red-600 bg-red-50";
              const statusLabel =
                status === "strong"
                  ? "양호"
                  : status === "stable"
                    ? "안정"
                    : status === "weak"
                      ? "약함"
                      : "매우약함";
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-[var(--radius-lg)] border border-border p-2"
                >
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${statusColor}`}
                  >
                    {statusLabel}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">
                      {QT_KO[item.type as string] || (item.type as string)}
                    </p>
                    <p className="truncate text-[10px] text-foreground-muted">
                      {item.comment as string}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   처방 탭
   ══════════════════════════════════════════════ */

function PrescriptionTab({
  diagData,
}: {
  diagData: Awaited<ReturnType<typeof getDiagnosis>>["data"] | undefined;
}) {
  const queryClient = useQueryClient();
  const reports = diagData?.mockReports || [];
  const sessions = diagData?.sessions || [];

  // 가장 최근 모의고사
  const latestReport = reports[0];

  // 활성 튜터링 세션
  const activeSession = sessions.find((s) => s.status === "active");

  const startMutation = useMutation({
    mutationFn: async (mockSessionId: string) => {
      const result = await startTutoringSession({
        mock_test_session_id: mockSessionId,
      });
      if (result.error || !result.data) throw new Error(result.error || "세션 시작 실패");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tutoring-diagnosis"] });
    },
  });

  // 데이터 없음
  if (!latestReport) {
    return <EmptyState icon={ClipboardCheck} title="처방을 생성할 수 없습니다" desc="먼저 모의고사를 응시하고 종합평가를 받아 주세요" />;
  }

  // 처방 데이터가 없는 경우 (v3 이전 모의고사)
  if (!latestReport.tutoring_prescription) {
    return <EmptyState icon={ClipboardCheck} title="v3 종합평가 데이터가 필요합니다" desc="최신 모의고사를 응시하면 자동으로 처방이 생성됩니다" />;
  }

  // 활성 세션이 있으면 처방 목록 표시
  if (activeSession) {
    return (
      <ActivePrescriptionView
        session={activeSession}
        report={latestReport}
        initialPrescriptions={diagData?.activePrescriptions}
      />
    );
  }

  // 처방 생성 CTA
  const prescription = latestReport.tutoring_prescription as Record<string, unknown>;
  const priorities = (prescription.priority_weaknesses || []) as Array<Record<string, unknown>>;
  const mustFix = (prescription.must_fix_for_next_grade || []) as string[];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 처방 미리보기 */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <Target size={18} className="text-primary-500" />
          <h3 className="text-sm font-semibold text-foreground sm:text-base">
            {latestReport.final_level} → {latestReport.target_level} 처방 준비
          </h3>
        </div>
        <p className="mt-1 text-xs text-foreground-secondary">
          {new Date(latestReport.created_at).toLocaleDateString("ko-KR")} 모의고사 기반
        </p>

        {/* 우선 약점 */}
        {priorities.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-foreground-secondary">
              우선 교정 영역
            </p>
            {priorities.map((p, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-[var(--radius-lg)] bg-background p-2.5"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-500 text-[10px] font-bold text-white">
                  {(p.rank as number) || i + 1}
                </span>
                <span className="text-xs font-medium text-foreground">
                  {p.area as string}
                </span>
                <span className="rounded bg-surface-secondary px-1.5 py-0.5 text-[10px] text-foreground-muted">
                  {p.drill_tag as string}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 필수 교정 */}
        {mustFix.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-foreground-secondary">
              다음 등급 필수 교정
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {mustFix.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 처방 생성 버튼 */}
      <button
        onClick={() => startMutation.mutate(latestReport.session_id)}
        disabled={startMutation.isPending}
        className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-primary-500 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
      >
        {startMutation.isPending ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Zap size={16} />
        )}
        맞춤 처방 생성하기
      </button>

      {startMutation.isError && (
        <p className="text-center text-xs text-red-500">
          {startMutation.error.message}
        </p>
      )}
    </div>
  );
}

/* ── 활성 처방 뷰 ── */

function ActivePrescriptionView({
  session,
  report,
  initialPrescriptions,
}: {
  session: { id: string; current_level: string | null; target_level: string | null; total_prescriptions: number | null; completed_prescriptions: number };
  report: { final_level: string; target_level: string };
  initialPrescriptions?: TutoringPrescriptionRow[];
}) {
  const { data: prescriptions, isLoading } = useQuery({
    queryKey: ["tutoring-prescriptions", session.id],
    queryFn: async () => {
      const { getPrescriptions } = await import("@/lib/actions/tutoring");
      const result = await getPrescriptions(session.id);
      if (result.error || !result.data) throw new Error(result.error || "처방 조회 실패");
      return result.data;
    },
    staleTime: 2 * 60 * 1000,
    initialData: initialPrescriptions,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-primary-500" />
      </div>
    );
  }

  const items = prescriptions || [];
  const completedCount = items.filter((p) => p.status === "completed").length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 진행 상황 */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground sm:text-base">
              {session.current_level} → {session.target_level}
            </h3>
            <p className="text-xs text-foreground-secondary">
              처방 {completedCount}/{items.length} 완료
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50">
            <BarChart3 size={18} className="text-primary-500" />
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-secondary">
          <div
            className="h-full rounded-full bg-primary-500 transition-all"
            style={{
              width: `${items.length > 0 ? (completedCount / items.length) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* 처방 과제 카드 목록 */}
      <div className="space-y-3">
        {items.map((p) => (
          <PrescriptionCard key={p.id} prescription={p} />
        ))}
      </div>
    </div>
  );
}

/* ── 처방 카드 ── */

function PrescriptionCard({ prescription: p }: { prescription: TutoringPrescriptionRow }) {
  const badge = PRIORITY_BADGE[p.priority] || PRIORITY_BADGE[3];
  const statusIcon =
    p.status === "completed" ? (
      <CheckCircle2 size={16} className="text-green-500" />
    ) : p.status === "in_progress" ? (
      <Clock size={16} className="text-amber-500" />
    ) : (
      <Target size={16} className="text-foreground-muted" />
    );

  return (
    <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        {statusIcon}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {QT_KO[p.question_type] || p.question_type}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge.color}`}
            >
              {badge.label}
            </span>
          </div>
          {p.weakness_tags && (
            <div className="mt-1 flex flex-wrap gap-1">
              {p.weakness_tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-surface-secondary px-1.5 py-0.5 text-[10px] text-foreground-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <p className="mt-1 text-xs text-foreground-muted">
            훈련 {p.training_count}회 · {p.source}
          </p>
        </div>
        {p.status !== "completed" && (
          <Link
            href={`/tutoring/training?prescription_id=${p.id}`}
            className="flex h-8 items-center gap-1 rounded-[var(--radius-lg)] bg-primary-500 px-3 text-xs font-medium text-white hover:bg-primary-600"
          >
            훈련
            <ArrowRight size={12} />
          </Link>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   훈련 탭
   ══════════════════════════════════════════════ */

function TrainingTab({
  diagData,
}: {
  diagData: Awaited<ReturnType<typeof getDiagnosis>>["data"] | undefined;
}) {
  const sessions = diagData?.sessions || [];
  const activeSession = sessions.find((s) => s.status === "active");

  // 활성 세션의 미완료 처방 조회
  const { data: prescriptions } = useQuery({
    queryKey: ["tutoring-training-prescriptions", activeSession?.id],
    queryFn: async () => {
      if (!activeSession) return [];
      const result = await getPrescriptions(activeSession.id);
      if (result.error || !result.data) return [];
      return result.data;
    },
    enabled: !!activeSession,
    staleTime: 30_000,
  });

  const nextPrescription = prescriptions?.find(
    (p) => p.status !== "completed"
  );

  if (!activeSession) {
    return (
      <EmptyState
        icon={Dumbbell}
        title="먼저 진단과 처방을 받아 주세요"
        desc="처방 탭에서 맞춤 처방을 생성하면 훈련을 시작할 수 있습니다"
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 안내 */}
      <div className="flex items-start gap-2.5 rounded-[var(--radius-xl)] border border-primary-200 bg-primary-50/50 p-3 sm:p-4">
        <Info size={18} className="shrink-0 text-primary-500" />
        <div>
          <p className="text-sm font-medium text-foreground">
            집중 훈련 모드
          </p>
          <p className="mt-0.5 text-xs text-foreground-secondary">
            처방에 따라 EPP 패턴 고정, 타임드 실전, Self-repair를 순서대로 수행합니다.
            한 세션 약 20~30분 소요됩니다.
          </p>
        </div>
      </div>

      {/* 세션 정보 */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-foreground sm:text-base">
          활성 세션
        </h3>
        <p className="mt-1 text-xs text-foreground-secondary">
          {activeSession.current_level} → {activeSession.target_level} ·
          처방 {activeSession.completed_prescriptions}/{activeSession.total_prescriptions} 완료
        </p>
      </div>

      {/* 훈련 시작 CTA */}
      {nextPrescription ? (
        <Link
          href={`/tutoring/training?prescription_id=${nextPrescription.id}`}
          className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-primary-500 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-600"
        >
          <Dumbbell size={16} />
          훈련 시작하기
          <ArrowRight size={14} />
        </Link>
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-green-200 bg-green-50 p-4 text-center">
          <CheckCircle2 size={20} className="mx-auto text-green-500" />
          <p className="mt-2 text-sm font-medium text-green-700">
            모든 처방을 완료했습니다!
          </p>
        </div>
      )}
    </div>
  );
}

/* ── 공통: 빈 상태 ── */

function EmptyState({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ size: number; className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 sm:p-6">
      <div className="flex flex-col items-center py-6 text-center sm:py-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-secondary">
          <Icon size={24} className="text-foreground-muted" />
        </div>
        <p className="mt-3 text-sm font-medium text-foreground-secondary">
          {title}
        </p>
        <p className="mt-1 text-xs text-foreground-muted">{desc}</p>
      </div>
    </div>
  );
}
