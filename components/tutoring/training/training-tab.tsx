"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Dumbbell,
  ArrowRight,
  CheckCircle2,
  Clock,
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

  const session = data?.session;
  const focuses = data?.focuses ?? [];

  if (!session || focuses.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        <Target className="mx-auto mb-3 h-10 w-10 text-foreground-muted" />
        <h3 className="text-lg font-semibold text-foreground">진단이 필요해요</h3>
        <p className="mt-1 text-sm text-foreground-secondary">
          진단 탭에서 AI 진단을 먼저 시작해주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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

  return (
    <div
      className={`rounded-xl border p-4 sm:p-5 ${
        isGraduated
          ? "border-green-200 bg-green-50/30"
          : "border-border bg-surface"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{statusIcon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              {focus.label}
            </h3>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
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

          {focus.reason && (
            <p className="mt-1 text-xs text-foreground-secondary">{focus.reason}</p>
          )}

          {/* 졸업 진행률 */}
          <div className="mt-3 flex items-center gap-4 text-xs text-foreground-secondary">
            <span>드릴 {focus.drill_pass_count}/2</span>
            <span>전이 {focus.transfer_pass_count}/1</span>
            <span>재평가 {focus.retest_pass_count}/1</span>
          </div>

          {/* CTA */}
          {isActive && (
            <a
              href={`/tutoring/drill?focusId=${focus.id}`}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-primary-700"
            >
              {hasDrill ? "이어서 훈련하기" : "훈련 시작하기"}
              <ArrowRight className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
