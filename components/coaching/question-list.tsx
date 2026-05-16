"use client";

// Step 2.5: 한 토픽 안 질문 리스트
// 사용자가 학습할 질문을 직접 선택 → 세션 시작 → 학습 룸으로

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCcw, Sparkles, Volume2 } from "lucide-react";
import { startOrResumeSession } from "@/lib/actions/coaching";
import type { QuestionListByTopic, QuestionListItem } from "@/lib/types/coaching";

interface Props {
  payload: QuestionListByTopic;
}

export function QuestionList({ payload }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const router = useRouter();

  const isCommon = payload.survey_type === "공통형";

  function handlePick(item: QuestionListItem) {
    setError(null);
    setPendingId(item.question_id);
    startTransition(async () => {
      const result = await startOrResumeSession({
        question_type: payload.type,
        topic: payload.topic,
        question_id: item.question_id,
      });
      if (result.error || !result.data) {
        setError(result.error ?? "세션 시작 실패");
        setPendingId(null);
        return;
      }
      router.push(`/coaching/learn/${result.data.session_id}`);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-foreground-muted">
        <span className="rounded-full bg-foreground-muted/10 px-2 py-0.5 font-medium text-foreground-secondary">
          {isCommon ? "돌발" : "선택형"}
        </span>
        <span>{payload.questions.length}개 질문</span>
      </div>

      {error && (
        <div className="rounded-xl border border-accent-300 bg-accent-50 px-4 py-2 text-sm text-accent-700">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {payload.questions.map((q, idx) => {
          const progress = q.user_progress;
          const isPickPending = pendingId === q.question_id;
          return (
            <button
              key={q.question_id}
              type="button"
              disabled={isPending}
              onClick={() => handlePick(q)}
              className={`group relative flex w-full flex-col gap-2 rounded-2xl border p-4 text-left transition disabled:opacity-50 ${
                progress?.mastered
                  ? "border-primary-300 bg-primary-50 hover:border-primary-500"
                  : progress?.has_session
                    ? "border-accent-300 bg-accent-50 hover:border-accent-500"
                    : "border-border bg-surface hover:border-primary-300 hover:bg-surface-hover"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-foreground-muted/15 px-2 py-0.5 text-xs font-mono text-foreground-secondary">
                    Q{idx + 1}
                  </span>
                  {progress?.mastered ? (
                    <span className="flex items-center gap-1 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700">
                      <CheckCircle2 className="h-3 w-3" />
                      졸업
                    </span>
                  ) : progress?.has_session ? (
                    <span className="flex items-center gap-1 rounded-full bg-accent-100 px-2 py-0.5 text-xs font-semibold text-accent-700">
                      <RotateCcw className="h-3 w-3" />
                      이어하기 ({progress.attempt_count}회차)
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-foreground-muted/10 px-2 py-0.5 text-xs text-foreground-muted">
                      <Sparkles className="h-3 w-3" />
                      새 질문
                    </span>
                  )}
                </div>
                {q.audio_url && (
                  <span className="text-foreground-muted">
                    <Volume2 className="h-4 w-4" />
                  </span>
                )}
              </div>

              {q.question_korean && (
                <p className="text-sm font-medium leading-relaxed text-foreground">
                  {q.question_korean}
                </p>
              )}
              <p className="text-xs leading-relaxed text-foreground-secondary">
                {q.question_english}
              </p>

              {progress?.last_attempt_at && (
                <div className="text-xs text-foreground-muted">
                  최근 시도: {new Date(progress.last_attempt_at).toLocaleDateString("ko-KR")}
                </div>
              )}

              {isPickPending && (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-surface/80">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
