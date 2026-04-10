"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Pencil,
  Trash2,
  ArrowUpDown,
  Heart,
  MessageSquare,
  Pin,
  ChevronRight,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  getFeedbackPosts,
  toggleVote,
  getMyVotes,
  getPostDetail,
  updatePost,
  deleteMyPost,
} from "@/lib/actions/support";
import { StatusBadge, CategoryBadge } from "../shared/status-badge";
import { CommentSection } from "../shared/comment-section";
import { FeedbackForm } from "./feedback-form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type {
  SupportPost,
  SupportCategory,
  FeedbackSort,
} from "@/lib/types/support";

interface FeedbackTabProps {
  initialData: { posts: SupportPost[]; total: number };
  isLoggedIn: boolean;
  userId: string | null;
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

export function FeedbackTab({ initialData, isLoggedIn, userId }: FeedbackTabProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<SupportCategory | "all">("all");
  const [sort, setSort] = useState<FeedbackSort>("latest");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [votedPosts, setVotedPosts] = useState<Set<number>>(new Set());
  const [votingId, setVotingId] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data } = useQuery({
    queryKey: ["support-feedback", category, sort],
    queryFn: async () => {
      const result = await getFeedbackPosts({
        category: category === "all" ? undefined : category,
        sort,
        page: 1,
        limit: 50,
      });
      return result.data || { posts: [], total: 0 };
    },
    initialData,
    staleTime: 30_000,
  });

  useQuery({
    queryKey: ["support-my-votes", category, sort],
    queryFn: async () => {
      if (!isLoggedIn || data.posts.length === 0) return [];
      const result = await getMyVotes(data.posts.map((p) => p.id));
      if (result.data) setVotedPosts(new Set(result.data));
      return result.data || [];
    },
    enabled: isLoggedIn && data.posts.length > 0,
    staleTime: 60_000,
  });

  const { data: detail } = useQuery({
    queryKey: ["support-post-detail", selectedId],
    queryFn: async () => {
      if (!selectedId) return null;
      const result = await getPostDetail(selectedId);
      return result.data || null;
    },
    enabled: !!selectedId,
    staleTime: 30_000,
  });

  const selectedPost = data.posts.find((p) => p.id === selectedId);

  const handleVote = async (postId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!isLoggedIn) {
      toast.error("로그인이 필요합니다");
      return;
    }
    setVotingId(postId);
    try {
      const result = await toggleVote(postId);
      if (result.error) {
        toast.error(result.error);
      } else {
        const newSet = new Set(votedPosts);
        if (result.data?.voted) newSet.add(postId);
        else newSet.delete(postId);
        setVotedPosts(newSet);
        queryClient.invalidateQueries({ queryKey: ["support-feedback"] });
      }
    } finally {
      setVotingId(null);
    }
  };

  const handlePostCreated = () => {
    setShowForm(false);
    queryClient.invalidateQueries({ queryKey: ["support-feedback"] });
    toast.success("글이 등록되었습니다");
  };

  const categoryFilters: { id: SupportCategory | "all"; label: string }[] = [
    { id: "all", label: "전체" },
    { id: "bug", label: "🐛 버그" },
    { id: "suggestion", label: "💡 건의" },
    { id: "question", label: "❓ 질문" },
  ];

  // 수정 저장
  const handleSaveEdit = async () => {
    if (!selectedId || !editTitle.trim() || !editContent.trim()) return;
    setSaving(true);
    try {
      const result = await updatePost(selectedId, {
        title: editTitle.trim(),
        content: editContent.trim(),
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("수정되었습니다");
        setEditing(false);
        queryClient.invalidateQueries({ queryKey: ["support-feedback"] });
        queryClient.invalidateQueries({ queryKey: ["support-post-detail", selectedId] });
      }
    } finally {
      setSaving(false);
    }
  };

  // 삭제
  const handleDeleteConfirm = async () => {
    if (!selectedId) return;
    setDeleting(true);
    try {
      const result = await deleteMyPost(selectedId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("삭제되었습니다");
        setSelectedId(null);
        queryClient.invalidateQueries({ queryKey: ["support-feedback"] });
      }
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // ── 상세 보기 (선택된 글) ──
  if (selectedId && selectedPost) {
    const isVoted = votedPosts.has(selectedId);
    const isOwner = userId && selectedPost.user_id === userId;

    return (
      <div className="space-y-4">
        {/* 뒤로가기 */}
        <button
          onClick={() => { setSelectedId(null); setEditing(false); }}
          className="flex items-center gap-1 text-sm text-foreground-secondary hover:text-foreground"
        >
          <ChevronRight size={14} className="rotate-180" />
          목록으로
        </button>

        {/* 글 카드 */}
        <div className="rounded-xl border border-border bg-surface">
          {/* 헤더 */}
          <div className="px-5 py-4 sm:px-6 sm:py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CategoryBadge category={selectedPost.category} />
                <StatusBadge status={selectedPost.status} />
                {selectedPost.is_pinned && (
                  <Pin size={12} className="text-primary-500" fill="currentColor" />
                )}
              </div>
              {isOwner && !editing && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setEditing(true);
                      setEditTitle(selectedPost.title);
                      setEditContent(detail?.content || selectedPost.content);
                    }}
                    className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground-secondary hover:text-foreground"
                  >
                    <Pencil size={12} />
                    수정
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground-secondary hover:border-red-200 hover:text-red-500"
                  >
                    <Trash2 size={12} />
                    삭제
                  </button>
                </div>
              )}
            </div>

            {editing ? (
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={200}
                className="mt-2 w-full rounded-lg border border-border bg-surface-secondary px-3 py-2 text-lg font-bold outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-200"
              />
            ) : (
              <h2 className="mt-2 text-lg font-bold text-foreground sm:text-xl">
                {selectedPost.title}
              </h2>
            )}
            <div className="mt-1.5 flex items-center gap-2 text-xs text-foreground-muted">
              <span className="font-medium text-foreground-secondary">
                {selectedPost.profiles?.display_name || "사용자"}
              </span>
              <span>·</span>
              <span>{formatTime(selectedPost.created_at)}</span>
            </div>
          </div>

          {/* 본문 */}
          <div className="border-t border-border px-5 py-4 sm:px-6 sm:py-5">
            {editing ? (
              <div className="space-y-3">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={6}
                  className="w-full rounded-lg border border-border bg-surface-secondary px-3 py-2 text-sm outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-200"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setEditing(false)}
                    className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground-secondary hover:bg-surface-secondary"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={saving || !editTitle.trim() || !editContent.trim()}
                    className="rounded-full bg-primary-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-primary-600 disabled:opacity-50"
                  >
                    {saving ? "저장 중..." : "저장"}
                  </button>
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground sm:text-[15px]">
                {detail?.content || selectedPost.content}
              </p>
            )}
          </div>

          {/* 액션 바 */}
          {!editing && (
            <div className="flex items-center gap-3 border-t border-border px-5 py-3 sm:px-6">
              <button
                onClick={(e) => handleVote(selectedId, e)}
                disabled={votingId === selectedId}
                className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                  isVoted
                    ? "border-red-200 bg-red-50 text-red-500"
                    : "border-border text-foreground-secondary hover:border-red-200 hover:text-red-400"
                }`}
              >
                <Heart size={13} className={isVoted ? "fill-current" : ""} />
                공감 {selectedPost.vote_count}
              </button>
              <span className="flex items-center gap-1 text-xs text-foreground-muted">
                <MessageSquare size={13} />
                댓글 {selectedPost.comment_count}
              </span>
            </div>
          )}
        </div>

        {/* 댓글 섹션 */}
        {!editing && (
          <div className="rounded-xl border border-border bg-surface px-5 py-4 sm:px-6 sm:py-5">
            <CommentSection
              postId={selectedId}
              comments={detail?.comments || []}
              isLoggedIn={isLoggedIn}
              onRefresh={() => {
                queryClient.invalidateQueries({
                  queryKey: ["support-post-detail", selectedId],
                });
                queryClient.invalidateQueries({
                  queryKey: ["support-feedback"],
                });
              }}
            />
          </div>
        )}

        <ConfirmDialog
          open={showDeleteConfirm}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteConfirm(false)}
          title="이 글을 삭제하시겠습니까?"
          description="댓글도 함께 삭제되며, 되돌릴 수 없습니다."
          confirmLabel="삭제"
          cancelLabel="취소"
          variant="danger"
          isLoading={deleting}
        />
      </div>
    );
  }

  // ── 목록 보기 ──
  return (
    <div className="space-y-4">
      {/* 툴바 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1.5">
          {categoryFilters.map((f) => (
            <button
              key={f.id}
              onClick={() => setCategory(f.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all sm:text-sm ${
                category === f.id
                  ? "bg-foreground text-white"
                  : "bg-surface-secondary text-foreground-secondary hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setSort((s) => (s === "latest" ? "votes" : "latest"))
            }
            className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground-secondary hover:text-foreground sm:text-sm"
          >
            <ArrowUpDown size={13} />
            {sort === "latest" ? "최신순" : "공감순"}
          </button>

          {isLoggedIn && (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-1.5 rounded-full bg-primary-500 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-primary-600 sm:text-sm"
            >
              <Pencil size={13} />
              글쓰기
            </button>
          )}
        </div>
      </div>

      {/* 글쓰기 폼 */}
      {showForm && (
        <FeedbackForm
          onSuccess={handlePostCreated}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* 게시물 목록 */}
      {data.posts.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface px-6 py-16">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-secondary">
              <MessageSquare size={28} className="text-foreground-muted" />
            </div>
            <p className="mt-4 text-sm font-semibold text-foreground">
              아직 등록된 글이 없습니다
            </p>
            <p className="mt-1 text-xs text-foreground-muted">
              {isLoggedIn
                ? "첫 번째 글을 작성해 보세요!"
                : "로그인하고 소통에 참여하세요."}
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          {/* 테이블 헤더 */}
          <div className="hidden border-b border-border bg-surface-secondary/50 px-5 py-2.5 sm:flex">
            <span className="w-16 text-center text-[11px] font-semibold text-foreground-muted">
              공감
            </span>
            <span className="flex-1 text-[11px] font-semibold text-foreground-muted">
              제목
            </span>
            <span className="w-20 text-center text-[11px] font-semibold text-foreground-muted">
              상태
            </span>
            <span className="w-16 text-center text-[11px] font-semibold text-foreground-muted">
              댓글
            </span>
          </div>

          {/* 행 */}
          {data.posts.map((post, idx) => {
            const isVoted = votedPosts.has(post.id);

            return (
              <div
                key={post.id}
                className={`group flex items-center px-5 py-3.5 transition-colors hover:bg-surface-secondary/40 ${
                  idx > 0 ? "border-t border-border" : ""
                }`}
              >
                {/* 공감 */}
                <button
                  onClick={(e) => handleVote(post.id, e)}
                  disabled={votingId === post.id}
                  className={`flex w-16 shrink-0 flex-col items-center gap-0.5 rounded-lg py-1 transition-colors ${
                    isVoted
                      ? "text-red-500"
                      : "text-foreground-muted hover:text-red-400"
                  }`}
                >
                  <Heart
                    size={15}
                    className={isVoted ? "fill-current" : ""}
                  />
                  <span className="text-[11px] font-bold">
                    {post.vote_count}
                  </span>
                </button>

                {/* 제목 + 메타 */}
                <button
                  onClick={() => setSelectedId(post.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center gap-1.5">
                    {post.is_pinned && (
                      <Pin
                        size={11}
                        className="shrink-0 text-primary-500"
                        fill="currentColor"
                      />
                    )}
                    <span className="truncate text-sm font-semibold text-foreground group-hover:text-primary-600">
                      {post.title}
                    </span>
                    <CategoryBadge category={post.category} />
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-foreground-muted">
                    <span>
                      {post.profiles?.display_name || "사용자"}
                    </span>
                    <span>·</span>
                    <span>{formatTime(post.created_at)}</span>
                  </div>
                </button>

                {/* 상태 */}
                <div className="hidden w-20 justify-center sm:flex">
                  <StatusBadge status={post.status} />
                </div>

                {/* 댓글 수 */}
                <div className="w-16 shrink-0 text-center">
                  {post.comment_count > 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs text-foreground-muted">
                      <MessageSquare size={12} />
                      {post.comment_count}
                    </span>
                  ) : (
                    <span className="text-xs text-foreground-muted/40">
                      —
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {data.total > 0 && (
        <p className="text-center text-xs text-foreground-muted">
          총 {data.total}건
        </p>
      )}
    </div>
  );
}
