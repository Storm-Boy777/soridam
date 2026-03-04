"use client";

import type { EvalStatus, MockExamMode } from "@/lib/types/mock-exam";

// ── 문항 상태 ──
type QStatus =
  | "current"      // 현재 답변 중
  | "eval_done"    // 개별평가 완료
  | "eval_failed"  // 개별평가 실패
  | "evaluating"   // 평가 진행 중 (STT/GPT 처리)
  | "skipped"      // 스킵됨
  | "answered"     // 답변 완료 (아직 평가 안 시작)
  | "pending";     // 미답변

// 상태별 스타일 — 오픽톡닥 디자인 시스템 컬러
const STATUS_STYLES: Record<QStatus, string> = {
  current:     "bg-primary-500 text-white ring-2 ring-primary-300",
  eval_done:   "bg-emerald-500 text-white",
  eval_failed: "bg-accent-500 text-white",
  evaluating:  "bg-secondary-300 text-secondary-800 animate-pulse",
  skipped:     "bg-foreground-muted/30 text-foreground-muted line-through",
  answered:    "bg-secondary-100 text-secondary-700",
  pending:     "border border-border bg-surface text-foreground-muted",
};

interface QuestionGridProps {
  currentQ: number;
  mode: MockExamMode;
  answeredQuestions: Set<number>;
  skippedQuestions: Set<number>;
  evalStatuses: Record<number, EvalStatus>;
  viewingEvalQNum?: number | null; // 현재 보고 있는 평가 문항
  onNavigate?: (questionNumber: number) => void;
  onEvalClick?: (questionNumber: number) => void;
  onReturnToSession?: () => void; // 평가 뷰에서 세션으로 복귀
}

export function QuestionGrid({
  currentQ,
  mode,
  answeredQuestions,
  skippedQuestions,
  evalStatuses,
  viewingEvalQNum,
  onNavigate,
  onEvalClick,
  onReturnToSession,
}: QuestionGridProps) {
  const isTraining = mode === "training";

  const getStatus = (qNum: number): QStatus => {
    if (qNum === currentQ) return "current";

    const evalStatus = evalStatuses[qNum];

    // 터미널 상태 (개별평가 끝남)
    if (evalStatus === "completed") return "eval_done";
    if (evalStatus === "failed") return "eval_failed";
    if (evalStatus === "skipped" || skippedQuestions.has(qNum)) return "skipped";

    // 평가 진행 중 (processing, stt_done, pronunciation_done, eval_done 등)
    if (evalStatus && evalStatus !== "pending") return "evaluating";

    // 답변은 했지만 아직 평가 시작 전
    if (answeredQuestions.has(qNum)) return "answered";

    return "pending";
  };

  const handleClick = (qNum: number, status: QStatus) => {
    // 평가 뷰 중 현재 문항 클릭 → 세션 복귀
    if (qNum === currentQ && viewingEvalQNum != null && onReturnToSession) {
      onReturnToSession();
      return;
    }
    // 평가 완료된 문항 → 평가 보기 (훈련 모드)
    if (status === "eval_done" && isTraining && onEvalClick) {
      onEvalClick(qNum);
      return;
    }
    // 기존 네비게이션 (훈련 모드에서 이전 문항으로 이동)
    if (
      isTraining &&
      qNum !== currentQ &&
      (answeredQuestions.has(qNum) || skippedQuestions.has(qNum)) &&
      onNavigate
    ) {
      onNavigate(qNum);
    }
  };

  return (
    <div className="grid grid-cols-8 justify-items-center gap-1 md:flex md:justify-between md:gap-1.5">
      {Array.from({ length: 15 }, (_, i) => i + 1).map((qNum) => {
        const status = getStatus(qNum);
        const canClick =
          isTraining &&
          ((qNum === currentQ && viewingEvalQNum != null) || // 평가 뷰 중 현재 문항 → 세션 복귀
            (qNum !== currentQ &&
              (status === "eval_done" ||
                answeredQuestions.has(qNum) ||
                skippedQuestions.has(qNum))));

        // 모바일 grid: 9→col2, 10→col3, ... 15→col8
        const gridCol = qNum > 8 ? { gridColumnStart: qNum - 7 } : undefined;

        return (
          <button
            key={qNum}
            onClick={() => canClick && handleClick(qNum, status)}
            disabled={!canClick}
            style={gridCol}
            className={`flex h-5 w-full items-center justify-center rounded text-[10px] font-bold transition-colors md:h-8 md:flex-1 md:rounded-lg md:text-xs ${
              STATUS_STYLES[status]
            } ${viewingEvalQNum === qNum ? "ring-2 ring-emerald-300 scale-110" : ""} ${canClick ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
            title={
              status === "eval_done"
                ? `Q${qNum} — 평가 완료 (클릭하여 확인)`
                : status === "eval_failed"
                  ? `Q${qNum} — 평가 실패`
                  : status === "evaluating"
                    ? `Q${qNum} — 평가 중...`
                    : status === "skipped"
                      ? `Q${qNum} — 스킵`
                      : `Q${qNum}`
            }
          >
            {qNum}
          </button>
        );
      })}
    </div>
  );
}
