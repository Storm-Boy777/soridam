"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { useEvalPolling } from "@/lib/hooks/use-eval-polling";
import { EVAL_STATUS_LABELS, type EvalStatus } from "@/lib/types/mock-exam";

// ── 평가 대기 화면 (화면 4) ──
// 세션 완료 후 EF 평가 진행 상태 모니터링

interface EvalWaitingProps {
  sessionId: string;
  totalQuestions: number;      // 평가 대상 문항 수 (Q1 제외 = 14)
  onReportReady?: () => void;  // 리포트 완료 시 콜백
}

export function EvalWaiting({
  sessionId,
  totalQuestions,
  onReportReady,
}: EvalWaitingProps) {
  const router = useRouter();
  const hasNotifiedRef = useRef(false);

  const {
    evalStatuses,
    holisticStatus,
    completedCount,
    isAllCompleted,
    isReportReady,
  } = useEvalPolling({
    sessionId,
    enabled: true,
    interval: 5000,
  });

  // 리포트 완료 시
  useEffect(() => {
    if (isReportReady && !hasNotifiedRef.current) {
      hasNotifiedRef.current = true;

      // 브라우저 탭 제목 업데이트 (UX 4-2)
      document.title = "🎯 평가 완료! — 오픽톡닥 모의고사";

      // Notification API (UX 4-2)
      if (document.hidden && "Notification" in window && Notification.permission === "granted") {
        new Notification("모의고사 평가가 완료되었습니다", {
          body: "결과를 확인하세요.",
          icon: "/logo-bandaid-terracotta.png",
        });
      }

      onReportReady?.();
    }
  }, [isReportReady, onReportReady]);

  // 평가 대기 중 탭 제목 업데이트
  useEffect(() => {
    document.title = "평가 진행 중... — 오픽톡닥 모의고사";
    return () => {
      document.title = "모의고사 | 오픽톡닥";
    };
  }, []);

  // 진행률
  const progress =
    totalQuestions > 0 ? Math.round((completedCount / totalQuestions) * 100) : 0;

  // 문항별 상태 아이콘
  const getStatusIcon = (status: EvalStatus | undefined) => {
    if (!status || status === "pending") return <Clock size={14} className="text-foreground-muted" />;
    if (status === "completed") return <CheckCircle2 size={14} className="text-green-500" />;
    if (status === "skipped") return <CheckCircle2 size={14} className="text-foreground-muted" />;
    if (status === "failed") return <AlertTriangle size={14} className="text-red-500" />;
    // processing, stt_completed, evaluating
    return <Loader2 size={14} className="animate-spin text-primary-500" />;
  };

  const getStatusLabel = (status: EvalStatus | undefined) => {
    if (!status) return "대기 중";
    return EVAL_STATUS_LABELS[status] || status;
  };

  // 프로그레스 바 색상
  const getProgressBarColor = (status: EvalStatus | undefined) => {
    if (!status || status === "pending") return "bg-surface-secondary";
    if (status === "completed") return "bg-green-500";
    if (status === "skipped") return "bg-foreground-muted/30";
    if (status === "failed") return "bg-red-400";
    return "bg-primary-400"; // processing 등
  };

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-12">
      {/* 메인 상태 */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
        {isReportReady ? (
          <CheckCircle2 size={32} className="text-green-500" />
        ) : (
          <Loader2 size={32} className="animate-spin text-primary-500" />
        )}
      </div>

      <h2 className="mt-4 text-lg font-semibold text-foreground">
        {isReportReady
          ? "평가가 완료되었습니다!"
          : "평가 진행 중..."}
      </h2>

      <p className="mt-1 text-sm text-foreground-secondary">
        {isReportReady
          ? "결과를 확인하세요"
          : `개별 평가: ${completedCount}/${totalQuestions} 완료`}
      </p>

      {/* 전체 프로그레스 바 */}
      <div className="mt-6 w-full">
        <div className="h-2 overflow-hidden rounded-full bg-surface-secondary">
          <div
            className="h-full rounded-full bg-primary-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1 text-center text-xs text-foreground-muted">
          {progress}%
        </p>
      </div>

      {/* 문항별 상태 */}
      <div className="mt-6 w-full space-y-2">
        {Array.from({ length: totalQuestions }, (_, i) => {
          const qNum = i + 2; // Q2~Q15
          const status = evalStatuses[qNum] as EvalStatus | undefined;

          return (
            <div key={qNum} className="flex items-center gap-3">
              <span className="w-8 text-right text-xs font-bold text-foreground-muted">
                Q{qNum}
              </span>
              <div className="flex-1">
                <div className="h-2 overflow-hidden rounded-full bg-surface-secondary">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${getProgressBarColor(status)}`}
                    style={{
                      width:
                        !status || status === "pending"
                          ? "0%"
                          : status === "completed" || status === "skipped" || status === "failed"
                            ? "100%"
                            : status === "stt_completed" || status === "evaluating"
                              ? "70%"
                              : "35%",
                    }}
                  />
                </div>
              </div>
              <div className="flex w-28 items-center gap-1.5">
                {getStatusIcon(status)}
                <span className="text-xs text-foreground-secondary">
                  {getStatusLabel(status)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 종합 분석 상태 */}
      <div className="mt-6 w-full rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-2">
          {holisticStatus === "completed" ? (
            <CheckCircle2 size={16} className="text-green-500" />
          ) : holisticStatus === "processing" ? (
            <Loader2 size={16} className="animate-spin text-primary-500" />
          ) : (
            <Clock size={16} className="text-foreground-muted" />
          )}
          <span className="text-sm font-medium text-foreground">종합 분석</span>
          <span className="text-xs text-foreground-muted">
            {holisticStatus === "completed"
              ? "완료"
              : holisticStatus === "processing"
                ? "진행 중..."
                : isAllCompleted
                  ? "곧 시작됩니다"
                  : "개별 평가 완료 후 시작"}
          </span>
        </div>
      </div>

      {/* CTA 버튼 */}
      {isReportReady && (
        <button
          onClick={() => router.push("/mock-exam")}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary-500 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-600"
        >
          결과 확인하기
        </button>
      )}
    </div>
  );
}
