"use client";

import type { EvalStatus, MockExamMode } from "@/lib/types/mock-exam";

// ── 15개 질문 상태 그리드 ──

const STATUS_STYLES: Record<string, string> = {
  current: "bg-primary-500 text-white ring-2 ring-primary-200",
  pending_eval: "bg-secondary-100 text-secondary-700 animate-pulse",
  completed: "bg-green-100 text-green-700",
  skipped: "bg-foreground-muted/20 text-foreground-muted",
  default: "bg-surface-secondary text-foreground-muted",
};

interface QuestionGridProps {
  currentQ: number;
  mode: MockExamMode;
  answeredQuestions: Set<number>;
  skippedQuestions: Set<number>;
  evalStatuses: Record<number, EvalStatus>;
  onNavigate?: (questionNumber: number) => void;
}

export function QuestionGrid({
  currentQ,
  mode,
  answeredQuestions,
  skippedQuestions,
  evalStatuses,
  onNavigate,
}: QuestionGridProps) {
  const isTraining = mode === "training";

  const getStatus = (qNum: number) => {
    if (qNum === currentQ) return "current";
    if (skippedQuestions.has(qNum)) return "skipped";
    const evalStatus = evalStatuses[qNum];
    if (evalStatus === "completed") return "completed";
    if (evalStatus && evalStatus !== "skipped" && evalStatus !== "failed") {
      return "pending_eval";
    }
    if (answeredQuestions.has(qNum)) return "completed";
    return "default";
  };

  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {Array.from({ length: 15 }, (_, i) => i + 1).map((qNum) => {
        const status = getStatus(qNum);
        const canNavigate =
          isTraining &&
          qNum !== currentQ &&
          (answeredQuestions.has(qNum) || skippedQuestions.has(qNum));

        return (
          <button
            key={qNum}
            onClick={() => canNavigate && onNavigate?.(qNum)}
            disabled={!canNavigate}
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
              STATUS_STYLES[status] || STATUS_STYLES.default
            } ${canNavigate ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
            title={`Q${qNum}`}
          >
            {qNum}
          </button>
        );
      })}
    </div>
  );
}
