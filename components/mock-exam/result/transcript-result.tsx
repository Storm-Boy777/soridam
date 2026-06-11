"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check, Loader2, FileText } from "lucide-react";
import {
  getTranscriptResult,
  type TranscriptResultItem,
} from "@/lib/actions/mock-exam";
import { RetakeCard } from "./retake-card";

interface TranscriptResultData {
  submission_id: number;
  mode: string;
  status: string;
  items: TranscriptResultItem[];
}

const DONE_STATUSES = ["completed", "skipped", "failed"];

export function TranscriptResult({
  sessionId,
  initialData,
}: {
  sessionId: string;
  initialData: TranscriptResultData;
}) {
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // 트랜스크립트 생성 폴링 (아직 STT 진행 중인 문항이 있으면 3초마다)
  const { data: result } = useQuery({
    queryKey: ["transcript-result", sessionId],
    queryFn: () => getTranscriptResult(sessionId),
    initialData: { data: initialData },
    refetchInterval: (query) => {
      const list = query.state.data?.data?.items ?? [];
      const allDone =
        list.length > 0 &&
        list.every((it) => DONE_STATUSES.includes(it.eval_status));
      return allDone ? false : 3000;
    },
  });

  const data = result?.data ?? initialData;
  const items = data.items;
  const pendingCount = items.filter(
    (it) => !DONE_STATUSES.includes(it.eval_status)
  ).length;

  // 외부 LLM 붙여넣기용 전체 텍스트
  const buildCopyText = useCallback(() => {
    return items
      .map((it) => {
        const q = it.question_english || it.question_korean || "";
        const ans = it.transcript?.trim() || "(무응답)";
        return `Q${it.question_number}. ${q}\nMy answer: ${ans}`;
      })
      .join("\n\n");
  }, [items]);

  const handleCopyAll = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(buildCopyText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setActionError("복사에 실패했습니다. 답변을 직접 드래그해 복사해주세요.");
    }
  }, [buildCopyText]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0 overflow-y-auto max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden">
          <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
            {/* 헤더 + 액션 */}
            <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
              <div className="flex items-start gap-2">
                <FileText size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    내 답변 트랜스크립트
                  </h2>
                  <p className="mt-0.5 text-xs text-foreground-secondary sm:text-sm">
                    실전처럼 응시한 답변을 텍스트로 확인하세요. 전체를 복사해 ChatGPT 등 다른 AI에
                    붙여넣으면 평가·개선 피드백을 받을 수 있어요.
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <button
                  onClick={handleCopyAll}
                  disabled={pendingCount > 0}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? "복사 완료!" : "전체 복사"}
                </button>
              </div>

              {pendingCount > 0 && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-primary-600">
                  <Loader2 size={12} className="animate-spin" />
                  트랜스크립트 생성 중... ({items.length - pendingCount}/{items.length})
                </p>
              )}
              {actionError && (
                <p className="mt-2 text-xs text-red-600">{actionError}</p>
              )}
            </div>

            {/* 문항별 카드 (Q2~Q15) */}
            <div className="mt-4 space-y-3">
              {items.map((it) => {
                const done =
                  it.eval_status === "completed" || it.eval_status === "skipped";
                return (
                  <div
                    key={it.question_number}
                    className="rounded-xl border border-border bg-surface p-4"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        Q{it.question_number}
                      </span>
                      {it.category && (
                        <span className="text-xs text-foreground-muted">
                          {it.category}
                        </span>
                      )}
                      {it.topic && (
                        <span className="text-xs text-foreground-muted">
                          · {it.topic}
                        </span>
                      )}
                    </div>

                    {(it.question_english || it.question_korean) && (
                      <div className="mt-2">
                        {it.question_english && (
                          <p className="text-sm font-medium text-foreground">
                            {it.question_english}
                          </p>
                        )}
                        {it.question_korean && (
                          <p className="mt-0.5 text-xs text-foreground-secondary">
                            {it.question_korean}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="mt-3 rounded-lg bg-surface-secondary/60 p-3">
                      {done ? (
                        it.transcript?.trim() ? (
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                            {it.transcript}
                          </p>
                        ) : (
                          <p className="text-sm text-foreground-muted">(무응답)</p>
                        )
                      ) : it.eval_status === "failed" ? (
                        <p className="text-sm text-red-500">
                          트랜스크립트 생성에 실패했습니다
                        </p>
                      ) : (
                        <p className="flex items-center gap-1.5 text-sm text-foreground-muted">
                          <Loader2 size={14} className="animate-spin" />
                          생성 중...
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 재응시 카드 (페이지 하단) ── */}
          <RetakeCard
            submissionId={data.submission_id}
            currentMode="transcript"
            maxWidthClass="max-w-3xl"
          />
        </div>
      </div>
    </div>
  );
}
