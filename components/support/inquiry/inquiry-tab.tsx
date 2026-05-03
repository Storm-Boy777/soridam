"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MessageCircleHeart,
  Lock,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Shield,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  getMyInquiries,
  getPostDetail,
  updatePost,
  deleteMyPost,
} from "@/lib/actions/support";
import { CategoryBadge } from "../shared/status-badge";
import { CommentSection } from "../shared/comment-section";
import { InquiryForm } from "./inquiry-form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { SupportPost } from "@/lib/types/support";
import {
  getInquiryPrefill,
  type InquiryPrefill,
} from "@/lib/constants/inquiry-prefills";

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
  const searchParams = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [prefill, setPrefill] = useState<InquiryPrefill | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const LIMIT = 5;

  // URL ?prefill=<key> 감지 → 폼 자동 펼침 + 값 채움 (한 번만)
  useEffect(() => {
    if (!isLoggedIn) return;
    const prefillKey = searchParams.get("prefill");
    const data = getInquiryPrefill(prefillKey);
    if (!data) return;

    setPrefill(data);
    setShowForm(true);

    // URL에서 prefill 파라미터 제거 (재진입 시 중복 적용 방지)
    const url = new URL(window.location.href);
    url.searchParams.delete("prefill");
    window.history.replaceState(null, "", url.toString());
    // 초기 마운트 시 1회만 — searchParams는 의존성에서 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

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
    setPrefill(null);
    queryClient.invalidateQueries({ queryKey: ["support-my-inquiries"] });
    toast.success("이야기가 전달되었습니다");
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
      <div className="py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-secondary">
          <Lock size={24} className="text-foreground-muted" />
        </div>
        <p className="mt-3 text-sm font-medium text-foreground-secondary">
          로그인 후 이용할 수 있습니다
        </p>
        <p className="mt-1 text-xs text-foreground-muted">
          개발자에게 안전하게 이야기를 건넬 수 있어요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 안내 + 글쓰기 — 게시판과 동일한 컴팩트 레이아웃 */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-foreground-secondary sm:text-sm">
          개인적인 문의는 이곳에 남겨주세요.
        </p>
        <button
          onClick={() => {
            setShowForm((v) => {
              const next = !v;
              if (!next) setPrefill(null);
              return next;
            });
          }}
          className="flex shrink-0 items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background shadow-sm hover:bg-foreground/90 sm:gap-1.5 sm:px-4"
        >
          <MessageCircleHeart size={12} />
          <span className="sm:hidden">문의</span>
          <span className="hidden sm:inline">이야기 건네기</span>
        </button>
      </div>

      {/* 글쓰기 폼 */}
      {showForm && (
        <InquiryForm
          onSuccess={handlePostCreated}
          onCancel={() => {
            setShowForm(false);
            setPrefill(null);
          }}
          initialCategory={prefill?.category}
          initialTitle={prefill?.title}
          initialContent={prefill?.content}
        />
      )}

      {/* 문의 목록 — 클라이언트 페이지네이션 */}
      {inquiries.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-secondary">
            <MessageCircleHeart size={24} className="text-foreground-muted" />
          </div>
          <p className="mt-3 text-sm font-medium text-foreground-secondary">
            아직 문의 내역이 없습니다
          </p>
          <p className="mt-1 text-xs text-foreground-muted">
            궁금하신 점이 있으시면 편하게 말씀해주세요.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {inquiries.slice((page - 1) * LIMIT, page * LIMIT).map((post) => {
            const isExpanded = expandedId === post.id;
            const isEditing = editingId === post.id;
            const hasAdminReply = detail?.comments?.some(
              (c) => c.is_admin_reply
            );

            return (
              <div
                key={post.id}
                className="overflow-hidden rounded-xl border border-border bg-surface transition-all"
              >
                {/* 행 */}
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : post.id)
                  }
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-secondary/40 sm:gap-4 sm:px-5 sm:py-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {post.title}
                      </span>
                      <CategoryBadge category={post.category} />
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      {hasAdminReply && isExpanded && (
                        <span className="flex items-center gap-0.5 rounded-md bg-primary-50 px-1.5 py-0.5 text-[10px] font-semibold text-primary-600">
                          <Shield size={10} />
                          답변 완료
                        </span>
                      )}
                      <span className="text-[11px] text-foreground-muted sm:text-xs">
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
                  <div className="border-t border-border bg-surface-secondary/30 px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
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
                          <Pencil size={11} />
                          수정
                        </button>
                        <button
                          onClick={() => setDeleteTargetId(post.id)}
                          className="flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground-secondary hover:border-red-200 hover:text-red-500"
                        >
                          <Trash2 size={11} />
                          삭제
                        </button>
                      </div>
                    )}

                    {/* 본문 */}
                    {isEditing ? (
                      <div className="space-y-3 rounded-lg bg-surface p-4">
                        <input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          maxLength={200}
                          className="w-full rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-200"
                        />
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={5}
                          className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-200"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded-lg border border-border px-4 py-1.5 text-xs font-medium text-foreground-secondary hover:bg-surface-secondary"
                          >
                            취소
                          </button>
                          <button
                            onClick={() => handleSaveEdit(post.id)}
                            disabled={saving || !editTitle.trim() || !editContent.trim()}
                            className="rounded-lg bg-primary-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-primary-600 disabled:opacity-50"
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

                    {/* 댓글 */}
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

      {/* 페이지네이션 */}
      {(() => {
        const totalPages = Math.ceil(inquiries.length / LIMIT);
        if (totalPages <= 1) return null;
        return (
          <div className="flex items-center justify-center gap-1 pt-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-surface-secondary hover:text-foreground disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                  page === p
                    ? "bg-foreground text-background"
                    : "text-foreground-secondary hover:bg-surface-secondary"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-surface-secondary hover:text-foreground disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        );
      })()}

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
