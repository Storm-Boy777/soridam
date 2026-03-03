"use client";

import type { EvalStatus, MockExamMode } from "@/lib/types/mock-exam";

// ── 15개 질문 상태 그리드 ──

const STATUS_STYLES: Record<string, string> = {
  current: "bg-primary-500 text-white ring-2 ring-primary-300",
  pending_eval: "bg-secondary-100 text-secondary-700 animate-pulse",
  completed: "bg-green-500 text-white",
  skipped: "bg-foreground-muted/20 text-foreground-muted",
  default: "border border-border bg-surface text-foreground-muted",
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
    <div className="grid grid-cols-8 justify-items-center gap-1 md:flex md:justify-between md:gap-1.5">
      {Array.from({ length: 15 }, (_, i) => i + 1).map((qNum) => {
        const status = getStatus(qNum);
        const canNavigate =
          isTraining &&
          qNum !== currentQ &&
          (answeredQuestions.has(qNum) || skippedQuestions.has(qNum));

        // 모바일 grid: 9→col2(2번 아래), 10→col3(3번 아래), ... 15→col8(8번 아래)
        // Q1은 자기소개 → 2행은 col2부터 시작
        const gridCol = qNum > 8 ? { gridColumnStart: qNum - 7 } : undefined;

        return (
          <button
            key={qNum}
            onClick={() => canNavigate && onNavigate?.(qNum)}
            disabled={!canNavigate}
            style={gridCol}
            className={`flex h-5 w-full items-center justify-center rounded text-[10px] font-bold transition-colors md:h-8 md:flex-1 md:rounded-lg md:text-xs ${
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
