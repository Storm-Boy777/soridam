"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  MessageSquare,
  Lock,
  Shield,
  Pin,
  PinOff,
  Trash2,
  Send,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  getAdminPosts,
  togglePinPost,
  deletePost,
  createAdminReply,
  deleteComment,
} from "@/lib/actions/admin/support";
import { getPostDetail } from "@/lib/actions/support";
import {
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  type SupportCategory,
} from "@/lib/types/support";

type AdminTab = "feedback" | "inquiry";

export default function AdminSupportPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<AdminTab>("feedback");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replying, setReplying] = useState(false);
  const [deletePostId, setDeletePostId] = useState<number | null>(null);
  const [deleteCommentId, setDeleteCommentId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 확장 게시물 변경 시 답변 입력 초기화
  useEffect(() => {
    setReplyContent("");
  }, [expandedId]);

  const visibility = tab === "feedback" ? "public" : "private";

  // 게시물 목록
  const { data, isLoading } = useQuery({
    queryKey: ["admin-support", tab],
    queryFn: () => getAdminPosts({ visibility, limit: 100 }),
    staleTime: 15_000,
  });

  // 상세 조회
  const { data: detail } = useQuery({
    queryKey: ["support-post-detail", expandedId],
    queryFn: async () => {
      if (!expandedId) return null;
      const result = await getPostDetail(expandedId);
      return result.data || null;
    },
    enabled: !!expandedId,
    staleTime: 15_000,
  });

  const posts = data?.data || [];

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-support"] });
    if (expandedId) {
      queryClient.invalidateQueries({
        queryKey: ["support-post-detail", expandedId],
      });
    }
  };

  // 고정 토글
  const handleTogglePin = async (postId: number, currentPinned: boolean) => {
    const result = await togglePinPost(postId, !currentPinned);
    if (result.success) {
      toast.success(currentPinned ? "고정 해제됨" : "고정됨");
      refresh();
    } else {
      toast.error(result.error || "고정 변경 실패");
    }
  };

  // 게시물 삭제 확인
  const handleDeletePostConfirm = async () => {
    if (!deletePostId) return;
    setDeleting(true);
    try {
      const result = await deletePost(deletePostId);
      if (result.success) {
        toast.success("삭제됨");
        setExpandedId(null);
        refresh();
      } else {
        toast.error(result.error || "삭제 실패");
      }
    } finally {
      setDeleting(false);
      setDeletePostId(null);
    }
  };

  // 관리자 답변
  const handleReply = async (postId: number) => {
    if (!replyContent.trim()) return;
    setReplying(true);
    try {
      const result = await createAdminReply({
        post_id: postId,
        content: replyContent.trim(),
      });
      if (result.success) {
        toast.success("답변이 등록되었습니다");
        setReplyContent("");
        refresh();
      } else {
        toast.error(result.error || "답변 실패");
      }
    } finally {
      setReplying(false);
    }
  };

  // 댓글 삭제 확인
  const handleDeleteCommentConfirm = async () => {
    if (!deleteCommentId) return;
    setDeleting(true);
    try {
      const result = await deleteComment(deleteCommentId);
      if (result.success) {
        toast.success("댓글 삭제됨");
        refresh();
      } else {
        toast.error(result.error || "삭제 실패");
      }
    } finally {
      setDeleting(false);
      setDeleteCommentId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">소통함 관리</h1>

      {/* 서브 탭 */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setTab("feedback");
            setExpandedId(null);
          }}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${
            tab === "feedback"
              ? "bg-primary-500 text-white"
              : "bg-surface-secondary text-foreground-secondary hover:text-foreground"
          }`}
        >
          <MessageSquare size={14} />
          피드백 보드
        </button>
        <button
          onClick={() => {
            setTab("inquiry");
            setExpandedId(null);
          }}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${
            tab === "inquiry"
              ? "bg-primary-500 text-white"
              : "bg-surface-secondary text-foreground-secondary hover:text-foreground"
          }`}
        >
          <Lock size={14} />
          1:1 문의
        </button>
      </div>

      {/* 게시물 목록 */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg bg-surface-secondary"
            />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <p className="py-8 text-center text-sm text-foreground-muted">
          게시물이 없습니다
        </p>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => {
            const isExpanded = expandedId === post.id;
            return (
              <div
                key={post.id}
                className="rounded-xl border border-border bg-surface"
              >
                {/* 헤더 */}
                <div className="flex items-start gap-3 p-3">
                  <button
                    onClick={() =>
                      setExpandedId(isExpanded ? null : post.id)
                    }
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      {post.is_pinned && (
                        <Pin
                          size={12}
                          className="text-primary-500"
                          fill="currentColor"
                        />
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${CATEGORY_COLORS[post.category as SupportCategory]}`}
                      >
                        {CATEGORY_LABELS[post.category as SupportCategory]}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {post.title}
                    </h3>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-foreground-muted">
                      <span>
                        {post.profiles?.display_name || "사용자"}
                      </span>
                      <span>
                        {new Date(post.created_at).toLocaleDateString(
                          "ko-KR"
                        )}
                      </span>
                      {post.vote_count > 0 && (
                        <span>공감 {post.vote_count}</span>
                      )}
                      {post.comment_count > 0 && (
                        <span>댓글 {post.comment_count}</span>
                      )}
                    </div>
                  </button>

                  {/* 액션 버튼 */}
                  <div className="flex shrink-0 items-center gap-1">
                    {tab === "feedback" && (
                      <button
                        onClick={() =>
                          handleTogglePin(post.id, post.is_pinned)
                        }
                        className="rounded-md p-1 hover:bg-surface-secondary"
                        title={post.is_pinned ? "고정 해제" : "고정"}
                      >
                        {post.is_pinned ? (
                          <PinOff size={14} />
                        ) : (
                          <Pin size={14} />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => setDeletePostId(post.id)}
                      className="rounded-md p-1 hover:bg-red-50 hover:text-red-500"
                      title="삭제"
                    >
                      <Trash2 size={14} />
                    </button>
                    {isExpanded ? (
                      <ChevronUp
                        size={14}
                        className="text-foreground-muted"
                      />
                    ) : (
                      <ChevronDown
                        size={14}
                        className="text-foreground-muted"
                      />
                    )}
                  </div>
                </div>

                {/* 확장 영역 */}
                {isExpanded && (
                  <div className="border-t border-border p-3">
                    {/* 글 내용 */}
                    <p className="mb-3 whitespace-pre-wrap text-sm text-foreground">
                      {detail?.content || post.content}
                    </p>

                    {/* 댓글 */}
                    {detail?.comments && detail.comments.length > 0 && (
                      <div className="mb-3 space-y-2">
                        <h4 className="text-xs font-semibold text-foreground-secondary">
                          댓글 ({detail.comments.length})
                        </h4>
                        {detail.comments.map((c) => (
                          <div
                            key={c.id}
                            className={`flex items-start gap-2 rounded-lg p-2 text-sm ${
                              c.is_admin_reply
                                ? "border border-primary-200 bg-primary-50/50"
                                : "bg-surface-secondary"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1">
                                {c.is_admin_reply && (
                                  <Shield
                                    size={10}
                                    className="text-primary-500"
                                  />
                                )}
                                <span className="text-[10px] font-semibold text-foreground-secondary">
                                  {c.is_admin_reply
                                    ? "관리자"
                                    : c.profiles?.display_name || "사용자"}
                                </span>
                                <span className="text-[10px] text-foreground-muted">
                                  {new Date(
                                    c.created_at
                                  ).toLocaleDateString("ko-KR")}
                                </span>
                              </div>
                              <p className="mt-0.5 whitespace-pre-wrap text-foreground">
                                {c.content}
                              </p>
                            </div>
                            <button
                              onClick={() => setDeleteCommentId(c.id)}
                              className="shrink-0 rounded p-0.5 hover:bg-red-50 hover:text-red-500"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 관리자 답변 */}
                    <div className="flex items-end gap-2 rounded-lg border border-border bg-surface p-2 transition-all focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-400/10">
                      <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleReply(post.id);
                          }
                        }}
                        placeholder="관리자 답변 입력... (Shift+Enter로 줄바꿈)"
                        rows={1}
                        className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-foreground outline-none placeholder:text-foreground-muted"
                        style={{ maxHeight: "120px", overflowY: "auto" }}
                        onInput={(e) => {
                          const el = e.currentTarget;
                          el.style.height = "auto";
                          el.style.height = Math.min(el.scrollHeight, 120) + "px";
                        }}
                      />
                      <button
                        onClick={() => handleReply(post.id)}
                        disabled={replying || !replyContent.trim()}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-500 text-white shadow-sm hover:bg-primary-600 disabled:opacity-40"
                      >
                        <Send size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 게시물 삭제 모달 */}
      <ConfirmDialog
        open={!!deletePostId}
        onConfirm={handleDeletePostConfirm}
        onCancel={() => setDeletePostId(null)}
        title="이 게시물을 삭제하시겠습니까?"
        description="댓글도 함께 삭제되며, 되돌릴 수 없습니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        variant="danger"
        isLoading={deleting}
      />

      {/* 댓글 삭제 모달 */}
      <ConfirmDialog
        open={!!deleteCommentId}
        onConfirm={handleDeleteCommentConfirm}
        onCancel={() => setDeleteCommentId(null)}
        title="이 댓글을 삭제하시겠습니까?"
        description="삭제된 댓글은 되돌릴 수 없습니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        variant="danger"
        isLoading={deleting}
      />
    </div>
  );
}
