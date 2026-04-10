"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Lock,
  ChevronDown,
  ChevronUp,
  Shield,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  getMyInquiries,
  getPostDetail,
  updatePost,
  deleteMyPost,
} from "@/lib/actions/support";
import { StatusBadge, CategoryBadge } from "../shared/status-badge";
import { CommentSection } from "../shared/comment-section";
import { InquiryForm } from "./inquiry-form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { SupportPost } from "@/lib/types/support";

interface InquiryTabProps {
  initialInquiries: SupportPost[];
  isLoggedIn: boolean;
}

function formatTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR");
}

export function InquiryTab({ initialInquiries, isLoggedIn }: InquiryTabProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: inquiries = [] } = useQuery({
    queryKey: ["support-my-inquiries"],
    queryFn: async () => {
      const result = await getMyInquiries();
      return result.data || [];
    },
    initialData: initialInquiries,
    staleTime: 30_000,
    enabled: isLoggedIn,
  });

  const { data: detail } = useQuery({
    queryKey: ["support-post-detail", expandedId],
    queryFn: async () => {
      if (!expandedId) return null;
      const result = await getPostDetail(expandedId);
      return result.data || null;
    },
    enabled: !!expandedId,
    staleTime: 30_000,
  });

  const handlePostCreated = () => {
    setShowForm(false);
    queryClient.invalidateQueries({ queryKey: ["support-my-inquiries"] });
    toast.success("문의가 등록되었습니다");
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["support-my-inquiries"] });
    if (expandedId) {
      queryClient.invalidateQueries({
        queryKey: ["support-post-detail", expandedId],
      });
    }
  };

  const handleSaveEdit = async (postId: number) => {
    if (!editTitle.trim() || !editContent.trim()) return;
    setSaving(true);
    try {
      const result = await updatePost(postId, {
        title: editTitle.trim(),
        content: editContent.trim(),
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("수정되었습니다");
        setEditingId(null);
        refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      const result = await deleteMyPost(deleteTargetId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("삭제되었습니다");
        setExpandedId(null);
        setEditingId(null);
        refresh();
      }
    } finally {
      setDeleting(false);
      setDeleteTargetId(null);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="rounded-xl border border-border bg-surface px-6 py-16">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-secondary">
            <Lock size={28} className="text-foreground-muted" />
          </div>
          <p className="mt-4 text-sm font-semibold text-foreground">
            로그인 후 1:1 문의를 이용할 수 있습니다
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 안내 + 글쓰기 */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-foreground-muted sm:text-sm">
          환불, 계정 문제 등 비공개 문의를 남길 수 있습니다.
        </p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-full bg-primary-500 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-primary-600 sm:text-sm"
        >
          <Pencil size={13} />
          문의하기
        </button>
      </div>

      {/* 글쓰기 폼 */}
      {showForm && (
        <InquiryForm
          onSuccess={handlePostCreated}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* 문의 목록 */}
      {inquiries.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface px-6 py-16">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-secondary">
              <Lock size={28} className="text-foreground-muted" />
            </div>
            <p className="mt-4 text-sm font-semibold text-foreground">
              문의 내역이 없습니다
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          {inquiries.map((post, idx) => {
            const isExpanded = expandedId === post.id;
            const isEditing = editingId === post.id;
            const hasAdminReply = detail?.comments?.some(
              (c) => c.is_admin_reply
            );

            return (
              <div
                key={post.id}
                className={idx > 0 ? "border-t border-border" : ""}
              >
                {/* 행 */}
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : post.id)
                  }
                  className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-surface-secondary/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {post.title}
                      </span>
                      <CategoryBadge category={post.category} />
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <StatusBadge status={post.status} />
                      {hasAdminReply && isExpanded && (
                        <span className="flex items-center gap-0.5 rounded-md bg-primary-50 px-1.5 py-0.5 text-[10px] font-semibold text-primary-600">
                          <Shield size={10} />
                          답변 완료
                        </span>
                      )}
                      <span className="text-[11px] text-foreground-muted">
                        {formatTime(post.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {post.comment_count > 0 && (
                      <span className="text-xs text-foreground-muted">
                        답변 {post.comment_count}
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-foreground-muted" />
                    ) : (
                      <ChevronDown size={16} className="text-foreground-muted" />
                    )}
                  </div>
                </button>

                {/* 확장 영역 */}
                {isExpanded && (
                  <div className="border-t border-border bg-surface-secondary/30 px-5 pb-5 pt-4">
                    {/* 수정/삭제 버튼 */}
                    {!isEditing && (
                      <div className="mb-3 flex justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingId(post.id);
                            setEditTitle(post.title);
                            setEditContent(detail?.content || post.content);
                          }}
                          className="flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground-secondary hover:text-foreground"
                        >
                          <Pencil size={12} />
                          수정
                        </button>
                        <button
                          onClick={() => setDeleteTargetId(post.id)}
                          className="flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground-secondary hover:border-red-200 hover:text-red-500"
                        >
                          <Trash2 size={12} />
                          삭제
                        </button>
                      </div>
                    )}

                    {/* 본문 (수정 모드 / 읽기 모드) */}
                    {isEditing ? (
                      <div className="space-y-3 rounded-lg bg-surface p-4">
                        <input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          maxLength={200}
                          className="w-full rounded-lg border border-border px-3 py-2 text-sm font-semibold outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-200"
                        />
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={5}
                          className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-200"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground-secondary hover:bg-surface-secondary"
                          >
                            취소
                          </button>
                          <button
                            onClick={() => handleSaveEdit(post.id)}
                            disabled={saving || !editTitle.trim() || !editContent.trim()}
                            className="rounded-full bg-primary-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-primary-600 disabled:opacity-50"
                          >
                            {saving ? "저장 중..." : "저장"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap rounded-lg bg-surface p-4 text-sm leading-relaxed text-foreground">
                        {detail?.content || post.content}
                      </p>
                    )}

                    {/* 댓글 (수정 모드가 아닐 때) */}
                    {!isEditing && (
                      <div className="mt-4 rounded-lg bg-surface p-4">
                        <CommentSection
                          postId={post.id}
                          comments={detail?.comments || []}
                          isLoggedIn={isLoggedIn}
                          onRefresh={refresh}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTargetId}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetId(null)}
        title="이 문의를 삭제하시겠습니까?"
        description="답변 내용도 함께 삭제되며, 되돌릴 수 없습니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        variant="danger"
        isLoading={deleting}
      />
    </div>
  );
}
