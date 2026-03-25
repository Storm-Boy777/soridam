"use client";

import { CheckCircle2, ArrowRight, RotateCcw } from "lucide-react";
import type { TutoringDrill, TutoringAttempt } from "@/lib/types/tutoring";

interface DrillCompleteProps {
  focusId: string;
  drills: TutoringDrill[];
  attempts: TutoringAttempt[];
  onStartRetest: () => void;
}

export function DrillComplete({ focusId, drills, attempts, onStartRetest }: DrillCompleteProps) {
  const totalAttempts = attempts.length;
  const passedCount = drills.filter((d) => d.status === "passed").length;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>

        <h2 className="text-xl font-bold text-foreground">드릴 완료!</h2>
        <p className="mt-2 text-sm text-foreground-secondary">
          {passedCount}개 문항을 모두 통과했어요.
          총 {totalAttempts}번 시도했습니다.
        </p>

        {/* 설계서 D-9: 전환 화면 — "시험"이라는 단어 미사용 */}
        <div className="mt-6 rounded-xl border border-border bg-surface-secondary p-4 text-left">
          <p className="text-sm font-medium text-foreground">
            좋아요. 이제 정말 내 것이 됐는지 짧게 확인해볼게요.
          </p>
          <p className="mt-1 text-xs text-foreground-secondary">
            이번에는 힌트 없이 2문항만 해봅니다.
            모르면 아는 만큼 말해도 됩니다.
          </p>
          <div className="mt-2 space-y-1 text-xs text-foreground-muted">
            <p>• Frame / 예시 / 힌트 없음</p>
            <p>• 중간 피드백 없음</p>
            <p>• 녹음 후 바로 결과</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={onStartRetest}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            확인 시작하기
            <ArrowRight className="h-4 w-4" />
          </button>
          <a
            href="/tutoring?tab=training"
            className="flex items-center justify-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary"
          >
            <RotateCcw className="h-4 w-4" />
            나중에 하기
          </a>
        </div>
      </div>
    </div>
  );
}
