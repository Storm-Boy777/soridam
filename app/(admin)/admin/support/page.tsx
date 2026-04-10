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

  // 삭제
  const handleDelete = async (postId: number) => {
    if (!confirm("이 게시물을 삭제하시겠습니까? 댓글도 함께 삭제됩니다."))
      return;
    const result = await deletePost(postId);
    if (result.success) {
      toast.success("삭제됨");
      setExpandedId(null);
      refresh();
    } else {
      toast.error(result.error || "삭제 실패");
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

  // 댓글 삭제
  const handleDeleteComment = async (commentId: number) => {
    if (!confirm("이 댓글을 삭제하시겠습니까?")) return;
    const result = await deleteComment(commentId);
    if (result.success) {
      toast.success("댓글 삭제됨");
      refresh();
    } else {
      toast.error(result.error || "삭제 실패");
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
                      onClick={() => handleDelete(post.id)}
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
                              <p className="mt-0.5 text-foreground">
                                {c.content}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteComment(c.id)}
                              className="shrink-0 rounded p-0.5 hover:bg-red-50 hover:text-red-500"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 관리자 답변 */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleReply(post.id);
                          }
                        }}
                        placeholder="관리자 답변 입력..."
                        className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-primary-300"
                      />
                      <button
                        onClick={() => handleReply(post.id)}
                        disabled={replying || !replyContent.trim()}
                        className="flex items-center gap-1 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600 disabled:opacity-50"
                      >
                        <Shield size={12} />
                        <Send size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
