"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getExamApprovalCounts,
  getExamApprovalList,
  getSubmissionForReview,
  approveSubmission,
  rejectSubmission,
} from "@/lib/actions/admin/exam-approval";
import { ChevronDown, ChevronUp, CheckCircle, XCircle, Loader2 } from "lucide-react";

type Tab = "pending" | "approved" | "rejected";

const TAB_CONFIG: { key: Tab; label: string }[] = [
  { key: "pending", label: "승인 대기" },
  { key: "approved", label: "승인됨" },
  { key: "rejected", label: "반려됨" },
];

export default function ExamApprovalPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("pending");
  const [page, setPage] = useState(1);

  // 상세 보기
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // 전체 건수
  const { data: counts = { pending: 0, approved: 0, rejected: 0 } } = useQuery({
    queryKey: ["admin-exam-approval-counts"],
    queryFn: getExamApprovalCounts,
    staleTime: 60 * 1000,
  });

  // 목록
  const { data: listResult, isLoading: loading } = useQuery({
    queryKey: ["admin-exam-approval-list", tab, page],
    queryFn: () => getExamApprovalList({ status: tab, page, pageSize: 20 }),
    staleTime: 60 * 1000,
  });
  const data = listResult?.data ?? [];
  const total = listResult?.total ?? 0;

  // 상세 조회
  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["admin-exam-approval-detail", expandedId],
    queryFn: () => getSubmissionForReview(expandedId!),
    enabled: expandedId !== null,
    staleTime: 5 * 60 * 1000,
  });

  // 승인/반려 뮤테이션
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-exam-approval-counts"] });
    queryClient.invalidateQueries({ queryKey: ["admin-exam-approval-list"] });
  };

  const approveMutation = useMutation({
    mutationFn: approveSubmission,
    onSuccess: (result) => {
      if (result.success) {
        setExpandedId(null);
        invalidateAll();
      }
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => rejectSubmission(id),
    onSuccess: (result) => {
      if (result.success) {
        setExpandedId(null);
        invalidateAll();
      }
    },
  });

  const actionLoading = approveMutation.isPending || rejectMutation.isPending;

  // 탭 변경 시 초기화
  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
    setPage(1);
    setExpandedId(null);
  };

  const handleToggle = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const totalCount = counts.pending + counts.approved + counts.rejected;

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-bold text-foreground">기출 승인</h1>
        {totalCount > 0 && (
          <span className="text-sm text-foreground-muted">총 {totalCount}건</span>
        )}
      </div>

      {/* 탭 + 카운트 배지 */}
      <div className="flex border-b border-border">
        {TAB_CONFIG.map((t) => {
          const count = counts[t.key];
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => handleTabChange(t.key)}
              className={`relative flex items-center gap-1.5 px-4 py-3 text-xs font-medium transition-colors sm:px-6 sm:text-sm ${
                isActive
                  ? "text-foreground"
                  : "text-foreground-muted hover:text-foreground-secondary"
              }`}
            >
              {t.label}
              {count > 0 && (
                <span
                  className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none ${
                    t.key === "pending"
                      ? "bg-amber-100 text-amber-700"
                      : isActive
                        ? "bg-primary-100 text-primary-700"
                        : "bg-surface-secondary text-foreground-muted"
                  }`}
                >
                  {count}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-foreground" />
              )}
            </button>
          );
        })}
      </div>

      {/* 목록 */}
      {loading ? (
        <LoadingSkeleton />
      ) : data.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface py-12 text-center text-sm text-foreground-muted">
          {tab === "pending" ? "승인 대기 중인 기출이 없습니다" : "데이터가 없습니다"}
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((row) => (
            <div
              key={row.id}
              className="overflow-hidden rounded-xl border border-border bg-surface"
            >
              {/* 요약 행 */}
              <button
                onClick={() => handleToggle(row.id)}
                className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-surface-secondary"
              >
                <span className="w-12 shrink-0 text-xs font-mono text-foreground-muted">
                  #{row.id}
                </span>
                <span className="w-24 shrink-0 text-sm">{row.exam_date}</span>
                <span className="w-12 shrink-0 rounded bg-primary-50 px-1.5 py-0.5 text-center text-xs font-semibold text-primary-700">
                  {row.achieved_level}
                </span>
                <span className="flex-1 truncate text-sm text-foreground-secondary">
                  {row.one_line_review || "한줄평 없음"}
                </span>
                <span className="text-xs text-foreground-muted">
                  {new Date(row.submitted_at).toLocaleDateString("ko-KR")}
                </span>
                {expandedId === row.id ? (
                  <ChevronUp size={16} className="text-foreground-muted" />
                ) : (
                  <ChevronDown size={16} className="text-foreground-muted" />
                )}
              </button>

              {/* 상세 패널 */}
              {expandedId === row.id && (
                <div className="border-t border-border bg-surface-secondary px-4 py-4">
                  {detailLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 size={20} className="animate-spin text-foreground-muted" />
                    </div>
                  ) : detail ? (
                    <SubmissionDetail
                      detail={detail}
                      showActions={tab === "pending"}
                      actionLoading={actionLoading}
                      onApprove={() => approveMutation.mutate(row.id)}
                      onReject={() => rejectMutation.mutate(row.id)}
                    />
                  ) : (
                    <p className="text-sm text-foreground-muted">데이터를 불러올 수 없습니다</p>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* 페이지네이션 */}
          {Math.ceil(total / 20) > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-foreground-muted">총 {total}건</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded px-3 py-1 text-xs text-foreground-secondary hover:bg-surface-secondary disabled:opacity-30"
                >
                  이전
                </button>
                <span className="px-2 py-1 text-xs text-foreground-secondary">
                  {page} / {Math.ceil(total / 20)}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(total / 20)}
                  className="rounded px-3 py-1 text-xs text-foreground-secondary hover:bg-surface-secondary disabled:opacity-30"
                >
                  다음
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── 상세 패널 컴포넌트 ──

function SubmissionDetail({
  detail,
  showActions,
  actionLoading,
  onApprove,
  onReject,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  detail: any;
  showActions: boolean;
  actionLoading: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { submission, questions, condition } = detail;

  return (
    <div className="space-y-4">
      {/* 조건 배지 */}
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
            condition.isValid
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {condition.isValid ? (
            <CheckCircle size={14} />
          ) : (
            <XCircle size={14} />
          )}
          선택 {condition.selected} : 공통 {condition.common}
          {condition.isValid ? " — 조건 충족" : " — 조건 미충족"}
        </span>
        {submission.tips && (
          <span className="text-xs text-foreground-muted">팁: {submission.tips}</span>
        )}
      </div>

      {/* 세트별 질문 목록 */}
      <div className="space-y-3">
        {condition.sets.map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (set: any) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const setQuestions = questions.filter((q: any) => q.combo_type === set.type);
            if (setQuestions.length === 0) return null;

            return (
              <div key={set.type} className="rounded-lg border border-border bg-surface p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{set.label}</span>
                  <span className="text-xs text-foreground-muted">— {set.topic}</span>
                  {set.surveyType && (
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        set.surveyType === "선택형"
                          ? "bg-blue-50 text-blue-700"
                          : set.surveyType === "공통형"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {set.surveyType}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {setQuestions.map((q: any) => (
                    <div key={q.question_number} className="flex items-start gap-2 text-xs">
                      <span className="w-7 shrink-0 text-foreground-muted">
                        Q{q.question_number}
                      </span>
                      {q.is_not_remembered ? (
                        <span className="italic text-foreground-muted">기억 안 남</span>
                      ) : q.questions ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-foreground">
                            {q.questions.question_short}
                          </span>
                          <span className="text-foreground-muted">
                            ({q.questions.question_type_kor})
                          </span>
                        </div>
                      ) : q.custom_question_text ? (
                        <span className="text-foreground-secondary">
                          {q.custom_question_text}{" "}
                          <span className="text-foreground-muted">(직접 입력)</span>
                        </span>
                      ) : (
                        <span className="italic text-foreground-muted">매칭 안 됨</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          }
        )}
      </div>

      {/* 승인/반려 버튼 */}
      {showActions && (
        <div className="flex gap-2 pt-2">
          <button
            onClick={onApprove}
            disabled={actionLoading}
            className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            <CheckCircle size={16} />
            기출풀 승인
          </button>
          <button
            onClick={onReject}
            disabled={actionLoading}
            className="flex items-center gap-1.5 rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
          >
            <XCircle size={16} />
            반려
          </button>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-xl border border-border bg-surface-secondary"
        />
      ))}
    </div>
  );
}
