"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MessageCircleHeart,
  Lock,
  ChevronDown,
  ChevronUp,
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
      <div className="py-20 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
          <Lock size={24} className="text-slate-300" />
        </div>
        <p className="mt-4 text-[15px] font-medium text-slate-500">
          로그인 후 이용할 수 있습니다
        </p>
        <p className="mt-1 text-[13px] text-slate-400">
          개발자에게 안전하게 이야기를 건넬 수 있어요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 안내 + 글쓰기 — 모바일 수직 배치 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-slate-500 sm:text-sm">
          개인적인 문의는 이곳에 남겨주세요.
        </p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-full bg-slate-800 px-5 py-2.5 text-[13px] font-medium text-white shadow-sm hover:bg-slate-700 sm:w-auto sm:text-sm"
        >
          <MessageCircleHeart size={14} />
          이야기 건네기
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
        <div className="py-20 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <MessageCircleHeart size={24} className="text-slate-300" />
          </div>
          <p className="mt-4 text-[15px] font-medium text-slate-500">
            아직 문의 내역이 없습니다
          </p>
          <p className="mt-1 text-[13px] text-slate-400">
            궁금하신 점이 있으시면 편하게 말씀해주세요.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {inquiries.map((post) => {
            const isExpanded = expandedId === post.id;
            const isEditing = editingId === post.id;
            const hasAdminReply = detail?.comments?.some(
              (c) => c.is_admin_reply
            );

            return (
              <div
                key={post.id}
                className="overflow-hidden rounded-2xl border border-slate-100 bg-white transition-all hover:border-slate-200"
              >
                {/* 행 — 터치 영역 최소 44px */}
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : post.id)
                  }
                  className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50/50 sm:gap-4 sm:px-5 sm:py-5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[15px] font-medium text-slate-800">
                        {post.title}
                      </span>
                      <CategoryBadge category={post.category} />
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      {hasAdminReply && isExpanded && (
                        <span className="flex items-center gap-0.5 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                          <Shield size={10} />
                          답변 완료
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400">
                        {formatTime(post.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {post.comment_count > 0 && (
                      <span className="text-[11px] text-slate-400">
                        답변 {post.comment_count}
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-slate-400" />
                    ) : (
                      <ChevronDown size={16} className="text-slate-400" />
                    )}
                  </div>
                </button>

                {/* 확장 영역 */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 px-5 pb-5 pt-4">
                    {/* 수정/삭제 버튼 */}
                    {!isEditing && (
                      <div className="mb-3 flex justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingId(post.id);
                            setEditTitle(post.title);
                            setEditContent(detail?.content || post.content);
                          }}
                          className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-700"
                        >
                          <Pencil size={11} />
                          수정
                        </button>
                        <button
                          onClick={() => setDeleteTargetId(post.id)}
                          className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-500 hover:border-rose-200 hover:text-rose-500"
                        >
                          <Trash2 size={11} />
                          삭제
                        </button>
                      </div>
                    )}

                    {/* 본문 */}
                    {isEditing ? (
                      <div className="space-y-3 rounded-xl bg-white p-4">
                        <input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          maxLength={200}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                        />
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={5}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded-full border border-slate-200 px-4 py-1.5 text-[12px] font-medium text-slate-500 hover:bg-slate-100"
                          >
                            취소
                          </button>
                          <button
                            onClick={() => handleSaveEdit(post.id)}
                            disabled={saving || !editTitle.trim() || !editContent.trim()}
                            className="rounded-full bg-slate-800 px-4 py-1.5 text-[12px] font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                          >
                            {saving ? "저장 중..." : "저장"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap rounded-xl bg-white p-4 text-[14px] leading-relaxed text-slate-700">
                        {detail?.content || post.content}
                      </p>
                    )}

                    {/* 댓글 */}
                    {!isEditing && (
                      <div className="mt-4 rounded-xl bg-white p-4">
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
