"use client";

import { type ReactNode, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  Dumbbell,
  ArrowRight,
  CheckCircle2,
  Clock,
  Info,
  Loader2,
  Target,
} from "lucide-react";
import { getDiagnosisData } from "@/lib/actions/tutoring";
import { FOCUS_STATUS_LABELS } from "@/lib/types/tutoring";
import type { TutoringSession, TutoringFocus } from "@/lib/types/tutoring";

interface TrainingTabProps {
  initialDiagnosis?: {
    session: TutoringSession | null;
    focuses: TutoringFocus[];
  };
}

export function TrainingTab({ initialDiagnosis }: TrainingTabProps) {
  const { data } = useQuery({
    queryKey: ["tutoring-diagnosis"],
    queryFn: async () => {
      const res = await getDiagnosisData();
      return res.data;
    },
    initialData: initialDiagnosis,
    staleTime: 30 * 1000,
  });

  const [bannerOpen, setBannerOpen] = useState(false);
  const session = data?.session;
  const focuses = data?.focuses ?? [];

  // 공통 배너 + 상태별 콘텐츠
  let content: ReactNode;

  if (!session || focuses.length === 0) {
    content = (
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-foreground sm:text-base">맞춤 훈련</h3>
        <div className="mt-4 flex flex-col items-center py-6 text-center sm:mt-6 sm:py-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-secondary">
            <Target size={24} className="text-foreground-muted" />
          </div>
          <p className="mt-3 text-sm font-medium text-foreground-secondary">
            진단이 필요해요
          </p>
          <p className="mt-1 text-xs text-foreground-muted">
            진단 탭에서 먼저 진단을 시작하면 맞춤 훈련이 여기에 표시됩니다
          </p>
        </div>
      </div>
    );
  } else {
    content = (
      <>
        {/* 코치 메시지 */}
        {session.prescription_json && (
          <div className="rounded-xl border border-primary-200 bg-primary-50/50 p-4">
            <p className="text-sm font-medium text-foreground">
              {(session.prescription_json as { coach_message?: string }).coach_message}
            </p>
          </div>
        )}

        {/* Focus별 드릴 카드 */}
        {focuses.map((focus) => (
          <FocusDrillCard key={focus.id} focus={focus} />
        ))}
      </>
    );
  }

  return (
    <div className="space-y-4">
      {/* 접이식 안내 배너 */}
      <button
        onClick={() => setBannerOpen(!bannerOpen)}
        className="flex w-full items-start gap-2.5 rounded-xl border border-primary-200 bg-primary-50/50 p-3 text-left sm:gap-3 sm:p-4"
      >
        <Info size={18} className="shrink-0 text-primary-500" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">맞춤 훈련 안내</p>
          {bannerOpen && (
            <p className="mt-0.5 text-xs text-foreground-secondary sm:mt-1 sm:text-sm">
              진단에서 찾은 핵심 병목별로 맞춤 드릴을 제공합니다.
              각 드릴은 3문항으로 구성되며, 구조를 익히고 → 적용하고 → 혼자 해보는 순서로 진행됩니다.
              드릴 완료 후에는 힌트 없이 확인하는 미니 재평가가 이어집니다.
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

/* ── Focus 드릴 카드 ── */

function FocusDrillCard({ focus }: { focus: TutoringFocus }) {
  const isActive = focus.status === "active" || focus.status === "pending";
  const isGraduated = focus.status === "graduated";
  const isImproving = focus.status === "improving";
  const hasDrill = !!focus.drill_session_plan;

  const statusIcon = isGraduated ? (
    <CheckCircle2 className="h-5 w-5 text-green-500" />
  ) : isImproving ? (
    <Clock className="h-5 w-5 text-yellow-500" />
  ) : (
    <Dumbbell className="h-5 w-5 text-primary-500" />
  );

  const totalSteps = 4; // drill 2 + transfer 1 + retest 1
  const completedSteps = focus.drill_pass_count + focus.transfer_pass_count + focus.retest_pass_count;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  return (
    <div
      className={`rounded-xl border p-4 sm:p-5 ${
        isGraduated
          ? "border-green-200 bg-green-50/30"
          : "border-border bg-surface"
      }`}
    >
      {/* 상단: 아이콘 + 제목 + 상태 */}
      <div className="flex items-center gap-2.5">
        <div>{statusIcon}</div>
        <h3 className="text-sm font-semibold text-foreground sm:text-base">{focus.label}</h3>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
            isGraduated
              ? "bg-green-100 text-green-700"
              : isImproving
                ? "bg-yellow-100 text-yellow-700"
                : "bg-primary-100 text-primary-700"
          }`}
        >
          {FOCUS_STATUS_LABELS[focus.status]}
        </span>
      </div>

      {/* 설명 */}
      {focus.reason && (
        <p className="mt-2 text-xs leading-relaxed text-foreground-secondary sm:text-sm">{focus.reason}</p>
      )}
      {focus.why_now_for_target && (
        <p className="mt-1 text-xs leading-relaxed text-primary-600">{focus.why_now_for_target}</p>
      )}

      {/* 하단: 진행률 + CTA (모바일/PC 동일 세로 배치) */}
      <div className="mt-4 border-t border-border pt-3 sm:pt-4">
        <div className="grid grid-cols-2 items-center gap-3">
          {/* 좌 50%: 진행바 */}
          <div className="flex items-center gap-2 text-xs text-foreground-secondary">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-secondary">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isGraduated ? "bg-green-500" : "bg-primary-500"}`}
                style={{ width: `${Math.max(progressPercent, 3)}%` }}
              />
            </div>
            <span className="shrink-0">{progressPercent}%</span>
          </div>
          {/* 우 50%: 졸업현황 */}
          <div className="flex items-center justify-end gap-1.5 text-[10px] text-foreground-secondary sm:gap-2 sm:text-xs">
            <span className="shrink-0">드릴 {focus.drill_pass_count}/2</span>
            <span className="text-foreground-muted">·</span>
            <span className="shrink-0">전이 {focus.transfer_pass_count}/1</span>
            <span className="text-foreground-muted">·</span>
            <span className="shrink-0">재평가 {focus.retest_pass_count}/1</span>
          </div>
        </div>

        {isActive && (
          <a
            href={`/tutoring/drill?focusId=${focus.id}`}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 sm:py-3"
          >
            {hasDrill ? "이어서 훈련하기" : "훈련 시작하기"}
            <ArrowRight className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}

/* ── 졸업 진행 아이템 ── */

function ProgressItem({ label, current, total }: { label: string; current: number; total: number }) {
  const done = current >= total;
  return (
    <div className={`flex flex-col items-center rounded-lg px-2 py-1.5 ${done ? "bg-green-100/50" : "bg-surface"}`}>
      <span className={`text-sm font-semibold ${done ? "text-green-600" : "text-foreground"}`}>
        {current}/{total}
      </span>
      <span className={`mt-0.5 text-[10px] ${done ? "text-green-600" : "text-foreground-muted"}`}>
        {done ? "✓ " : ""}{label}
      </span>
    </div>
  );
}
