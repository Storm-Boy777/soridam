"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, FileText, Trash2, ChevronDown, ChevronRight, CheckCircle2, Info } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SubmissionDetail } from "./submission-detail";
import { getMySubmissions, deleteSubmission } from "@/lib/actions/reviews";
import type { Submission } from "@/lib/types/reviews";

interface SubmitTabProps {
  initialSubmissions?: Submission[];
}

export function SubmitTab({ initialSubmissions }: SubmitTabProps) {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [bannerOpen, setBannerOpen] = useState(false);

  // URL params로 완료 배너 표시
  const completed = searchParams.get("completed") === "true";

  // 완료 후 돌아왔을 때 URL params 정리 (히스토리 교체)
  useEffect(() => {
    if (completed) {
      window.history.replaceState(null, "", "/reviews");
    }
  }, [completed]);

  const { data: submissions = [] } = useQuery({
    queryKey: ["my-submissions"],
    queryFn: async () => {
      const result = await getMySubmissions();
      return result.data || [];
    },
    initialData: initialSubmissions,
    initialDataUpdatedAt: Date.now(),
    staleTime: 5 * 60 * 1000, // 5분
  });

  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteConfirm = async () => {
    if (confirmDeleteId === null) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    setDeleteError(null);
    const result = await deleteSubmission(id);
    if (result.error) {
      setDeleteError(result.error);
    } else {
      queryClient.invalidateQueries({ queryKey: ["my-submissions"] });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 삭제 실패 에러 메시지 */}
      {deleteError && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{deleteError}</p>
          <button onClick={() => setDeleteError(null)} className="text-xs text-red-500 hover:text-red-700">닫기</button>
        </div>
      )}

      {/* 안내 배너 (접이식) */}
      <button
        onClick={() => setBannerOpen(!bannerOpen)}
        className="flex w-full items-start gap-2.5 rounded-[var(--radius-xl)] border border-primary-200 bg-primary-50/50 p-3 text-left sm:gap-3 sm:p-4"
      >
        <Info size={18} className="shrink-0 text-primary-500" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            후기 제출이란?
          </p>
          {bannerOpen && (
            <p className="mt-0.5 text-xs text-foreground-secondary sm:mt-1 sm:text-sm">
              여러분의 후기 데이터가 빈도 분석의 정확도를 높여줍니다.
            </p>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`shrink-0 text-primary-400 transition-transform ${bannerOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* 완료 메시지 (몰입형 위저드에서 돌아온 경우) */}
      {completed && (
        <div className="flex items-start gap-2.5 rounded-[var(--radius-xl)] border border-green-200 bg-green-50/50 p-3 sm:gap-3 sm:p-4">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-600" />
          <div>
            <p className="text-sm font-medium text-green-800">
              후기가 성공적으로 제출되었습니다!
            </p>
            <p className="mt-0.5 text-xs text-green-600">
              소중한 후기 감사합니다.
            </p>
          </div>
        </div>
      )}

      {/* 제출 가이드 + CTA */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-foreground sm:text-base">시험 후기 제출하기</h3>
        <p className="mt-0.5 text-xs text-foreground-secondary sm:mt-1 sm:text-sm">
          여러분의 데이터가 더 정확한 빈도 분석을 만듭니다.
        </p>

        {/* 3단계 안내 — 모바일: 세로 타임라인, PC: 가로 3컬럼 */}
        {/* 모바일 세로 */}
        <div className="relative mt-4 sm:hidden">
          {[
            { step: 1, title: "시험 정보 입력", desc: "시험 날짜, 등급, 서베이 선택" },
            { step: 2, title: "출제 질문 입력", desc: "콤보별 주제와 질문 선택" },
            { step: 3, title: "한줄 후기 + 팁", desc: "후기 작성 후 제출 완료" },
          ].map((s, i) => (
            <div key={s.step} className="relative flex gap-3 pb-4 last:pb-0">
              {i < 2 && (
                <div className="absolute left-3.5 top-7 bottom-0 w-px bg-border" />
              )}
              <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-border bg-surface-secondary text-xs font-bold text-foreground-muted">
                {s.step}
              </div>
              <div className="pt-0.5">
                <p className="text-sm font-semibold text-foreground">{s.title}</p>
                <p className="text-xs text-foreground-secondary">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
        {/* PC 가로 — 단계 사이 화살표 */}
        <div className="hidden sm:mt-6 sm:grid sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center sm:gap-3">
          {[
            { step: 1, title: "시험 정보 입력", desc: "시험 날짜, 등급, 서베이 선택" },
            { step: 2, title: "출제 질문 입력", desc: "콤보별 주제와 질문 선택" },
            { step: 3, title: "한줄 후기 + 팁", desc: "후기 작성 후 제출 완료" },
          ].flatMap((s, i) => [
            <div key={s.step} className="flex flex-col items-center text-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-border bg-surface-secondary text-sm font-bold text-foreground-muted">
                {s.step}
              </div>
              <p className="mt-2 text-sm font-semibold text-foreground">{s.title}</p>
              <p className="mt-0.5 text-xs text-foreground-secondary">{s.desc}</p>
            </div>,
            ...(i < 2
              ? [<div key={`arrow-${i}`}><ChevronRight size={24} className="text-foreground-muted" /></div>]
              : []),
          ])}
        </div>

        {/* CTA */}
        <div className="mt-4 border-t border-border pt-3 sm:mt-6 sm:pt-4">
          <Link
            href="/reviews/submit"
            className="flex h-9 w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-primary-500 px-4 text-sm font-medium text-white transition-colors hover:bg-primary-600 sm:h-10"
          >
            <Send size={16} />
            후기 제출 시작하기
          </Link>
        </div>
      </div>

      {/* 내 제출 이력 */}
      <div className="rounded-xl border border-border bg-surface p-3 sm:rounded-[var(--radius-xl)] sm:p-6">
        <h3 className="text-[13px] font-semibold text-foreground sm:text-base">내 제출 이력</h3>
        {submissions.length === 0 ? (
          <div className="mt-3 flex flex-col items-center py-5 text-center sm:mt-6 sm:py-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-secondary sm:h-14 sm:w-14">
              <Send size={20} className="text-foreground-muted sm:hidden" />
              <Send size={24} className="hidden text-foreground-muted sm:block" />
            </div>
            <p className="mt-2.5 text-[13px] font-medium text-foreground-secondary sm:mt-3 sm:text-sm">
              아직 제출한 후기가 없습니다
            </p>
            <p className="mt-0.5 text-[11px] text-foreground-muted sm:mt-1 sm:text-xs">
              시험 후기를 제출하면 여기에 이력이 표시됩니다
            </p>
          </div>
        ) : (
          <div className="mt-3 space-y-2 sm:mt-4 sm:space-y-3">
            {submissions.map((sub) => {
              const isExpanded = expandedId === sub.id;
              return (
                <div
                  key={sub.id}
                  className="rounded-lg border border-border p-2.5 sm:rounded-[var(--radius-lg)] sm:p-3"
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-surface-secondary sm:flex">
                      {sub.status === "complete" ? (
                        <FileText size={16} className="text-primary-500" />
                      ) : (
                        <FileText size={16} className="text-foreground-muted" />
                      )}
                    </div>
                    <div
                      className={`min-w-0 flex-1 ${sub.status === "complete" ? "cursor-pointer" : ""}`}
                      onClick={() => {
                        if (sub.status === "complete") {
                          setExpandedId(isExpanded ? null : sub.id);
                        }
                      }}
                    >
                      <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                        <span className="text-[13px] font-medium text-foreground sm:text-sm">
                          {sub.exam_date}
                        </span>
                        <span className="rounded-full bg-surface-secondary px-1.5 py-0.5 text-[10px] font-medium text-foreground-muted">
                          {sub.pre_exam_level === 'none' ? '첫 응시' : sub.pre_exam_level}
                        </span>
                        <span className="text-[10px] text-foreground-muted">→</span>
                        <span className="rounded-full bg-primary-50 px-1.5 py-0.5 text-[10px] font-medium text-primary-700">
                          {sub.achieved_level || '발표 전'}
                        </span>
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                            sub.status === "complete"
                              ? "bg-green-50 text-green-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {sub.status === "complete" ? "완료" : "작성 중"}
                        </span>
                      </div>
                      {sub.one_line_review && (
                        <p className="mt-0.5 truncate text-[11px] text-foreground-secondary sm:text-xs">
                          {sub.one_line_review}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
                      {sub.status === "complete" && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                          className="rounded-md p-1 text-foreground-muted transition-colors hover:bg-surface-secondary sm:rounded-[var(--radius-md)] sm:p-1.5"
                        >
                          <ChevronDown
                            size={14}
                            className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          />
                        </button>
                      )}
                      {sub.status === "draft" && (
                        <>
                          <Link
                            href={`/reviews/submit?resume=${sub.id}`}
                            className="rounded-md px-1.5 py-1 text-[11px] font-medium text-primary-600 transition-colors hover:bg-primary-50 sm:rounded-[var(--radius-md)] sm:px-2 sm:py-1.5 sm:text-xs"
                          >
                            이어쓰기
                          </Link>
                          <button
                            onClick={() => setConfirmDeleteId(sub.id)}
                            className="rounded-md p-1 text-foreground-muted transition-colors hover:bg-accent-50 hover:text-accent-500 sm:rounded-[var(--radius-md)] sm:p-1.5"
                          >
                            <Trash2 size={13} className="sm:hidden" />
                            <Trash2 size={14} className="hidden sm:block" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {/* 상세 내용 (완료된 후기만) */}
                  {isExpanded && sub.status === "complete" && (
                    <SubmissionDetail submissionId={sub.id} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        open={confirmDeleteId !== null}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDeleteId(null)}
        title="작성 중인 후기를 삭제하시겠습니까?"
        description="삭제하면 복구할 수 없습니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        variant="danger"
      />
    </div>
  );
}
