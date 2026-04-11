"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PenLine,
  ArrowUpDown,
  Heart,
  MessageSquare,
  Pin,
  ChevronLeft,
  ChevronRight,
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
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/types/support";
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
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [votedPosts, setVotedPosts] = useState<Set<number>>(new Set());
  const [votingId, setVotingId] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const LIMIT = 5;

  const { data = { posts: [], total: 0 } } = useQuery({
    queryKey: ["support-feedback", category, sort, page],
    queryFn: async () => {
      const result = await getFeedbackPosts({
        category: category === "all" ? undefined : category,
        sort,
        page,
        limit: LIMIT,
      });
      return result.data || { posts: [], total: 0 };
    },
    initialData: page === 1 ? initialData : undefined,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const totalPages = Math.ceil((data.total || 0) / LIMIT);

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
    toast.success("이야기가 등록되었습니다");
  };

  const categoryFilters: { id: SupportCategory | "all"; label: string; shortLabel: string }[] = [
    { id: "all", label: "전체", shortLabel: "전체" },
    { id: "question", label: "응원/인사", shortLabel: "응원" },
    { id: "suggestion", label: "기능건의", shortLabel: "기능" },
    { id: "bug", label: "버그제보", shortLabel: "버그" },
  ];

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

  // ── 상세 보기 ──
  if (selectedId && selectedPost) {
    const isVoted = votedPosts.has(selectedId);
    const isOwner = userId && selectedPost.user_id === userId;

    return (
      <div className="space-y-5">
        {/* 뒤로가기 */}
        <button
          onClick={() => { setSelectedId(null); setEditing(false); }}
          className="group flex items-center gap-1.5 text-xs text-foreground-muted transition-colors hover:text-foreground"
        >
          <ChevronLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
          목록으로
        </button>

        {/* 글 본문 */}
        <article>
          {/* 제목 영역 */}
          <div className="pb-4">
            <div className="flex items-start justify-between gap-4">
              {editing ? (
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  maxLength={200}
                  className="w-full rounded-lg border border-border bg-surface-secondary/30 px-3 py-2 text-lg font-semibold text-foreground outline-none transition-all focus:border-primary-400 focus:bg-surface focus:ring-2 focus:ring-primary-400/10"
                />
              ) : (
                <h2 className="text-lg font-semibold leading-snug text-foreground sm:text-xl">
                  {selectedPost.title}
                </h2>
              )}
              {isOwner && !editing && (
                <div className="flex shrink-0 items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      setEditing(true);
                      setEditTitle(selectedPost.title);
                      setEditContent(detail?.content || selectedPost.content);
                    }}
                    className="text-xs text-foreground-muted transition-colors hover:text-foreground"
                  >
                    수정
                  </button>
                  <span className="text-border">|</span>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-xs text-foreground-muted transition-colors hover:text-red-500"
                  >
                    삭제
                  </button>
                </div>
              )}
            </div>

            {/* 메타 정보 + 공감 */}
            <div className="mt-2.5 flex items-center justify-between text-xs text-foreground-muted">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-500/8 text-[11px] font-bold text-primary-600">
                  {(selectedPost.profiles?.display_name || "?")[0]}
                </div>
                <span className="font-medium text-foreground-secondary">
                  {selectedPost.profiles?.display_name || "익명"}
                </span>
                <span className="h-0.5 w-0.5 rounded-full bg-foreground-muted/30" />
                <span>{formatTime(selectedPost.created_at)}</span>
                <span className="h-0.5 w-0.5 rounded-full bg-foreground-muted/30" />
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium sm:text-[11px] ${CATEGORY_COLORS[selectedPost.category]}`}>
                  {CATEGORY_LABELS[selectedPost.category]}
                </span>
              </div>
              {!editing && (
                <button
                  onClick={(e) => handleVote(selectedId, e)}
                  disabled={votingId === selectedId}
                  className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    isVoted
                      ? "bg-red-500/8 text-red-500 ring-1 ring-red-500/20"
                      : "bg-surface-secondary text-foreground-muted hover:bg-red-500/5 hover:text-red-400"
                  }`}
                >
                  <Heart size={12} className={isVoted ? "fill-current" : ""} />
                  공감 {selectedPost.vote_count > 0 ? selectedPost.vote_count : ""}
                </button>
              )}
            </div>
          </div>

          {/* 본문 컨텐츠 */}
          <div className="border-t border-border/50 pt-5">
            {editing ? (
              <div className="space-y-3">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={8}
                  className="w-full resize-none rounded-lg border border-border bg-surface-secondary/30 px-3 py-2.5 text-sm leading-relaxed text-foreground outline-none transition-all focus:border-primary-400 focus:bg-surface focus:ring-2 focus:ring-primary-400/10"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setEditing(false)}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-foreground-secondary transition-colors hover:text-foreground"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={saving || !editTitle.trim() || !editContent.trim()}
                    className="rounded-lg bg-primary-500 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-600 disabled:opacity-50"
                  >
                    {saving ? "저장 중..." : "저장"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85 sm:text-[15px] sm:leading-[1.8]">
                {detail?.content || selectedPost.content}
              </div>
            )}
          </div>

        </article>

        {/* 댓글 섹션 */}
        {!editing && (
          <div className="border-t border-border/50 pt-5">
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
      {/* 툴바 — 컴팩트 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {categoryFilters.map((f) => (
            <button
              key={f.id}
              onClick={() => { setCategory(f.id); setPage(1); }}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-all ${
                category === f.id
                  ? "bg-foreground text-background"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              <span className="sm:hidden">{f.shortLabel}</span>
              <span className="hidden sm:inline">{f.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setSort((s) => (s === "latest" ? "votes" : "latest")); setPage(1); }}
            className="flex shrink-0 items-center gap-1 text-xs text-foreground-muted transition-colors hover:text-foreground"
          >
            <ArrowUpDown size={12} />
            <span className="hidden sm:inline">{sort === "latest" ? "최신순" : "공감순"}</span>
          </button>

          {isLoggedIn && (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex shrink-0 items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background shadow-sm transition-all hover:bg-foreground/90 sm:gap-1.5 sm:px-4"
            >
              <PenLine size={12} />
              <span className="sm:hidden">글쓰기</span>
              <span className="hidden sm:inline">이야기 남기기</span>
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

      {/* 게시물 목록 — 카드 형태 */}
      {data.posts.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-secondary">
            <Heart size={24} className="text-foreground-muted" />
          </div>
          <p className="mt-3 text-sm font-medium text-foreground-secondary">
            첫 번째 목소리를 남겨주세요
          </p>
          <p className="mx-auto mt-1 max-w-[280px] text-xs leading-relaxed text-foreground-muted">
            {isLoggedIn
              ? "여러분이 들려주시는 작은 성장의 기쁨이 소리담을 움직이는 가장 큰 원동력입니다."
              : "로그인하고 소통에 참여하세요."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.posts.map((post) => {
            const isVoted = votedPosts.has(post.id);

            return (
              <div
                key={post.id}
                onClick={() => setSelectedId(post.id)}
                className="group cursor-pointer rounded-xl border border-border bg-surface p-4 transition-all hover:border-border hover:shadow-sm sm:p-5"
              >
                {/* 제목 + 태그 (한 줄) */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    {post.is_pinned && (
                      <Pin size={12} className="shrink-0 text-primary-500" fill="currentColor" />
                    )}
                    <h3 className="truncate text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary-600 sm:text-base">
                      {post.title}
                    </h3>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium sm:text-xs ${CATEGORY_COLORS[post.category]}`}>
                    {CATEGORY_LABELS[post.category]}
                  </span>
                </div>

                {/* 하단: 작성자 + 공감/댓글 */}
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-500/8 text-[10px] font-bold text-primary-600">
                      {(post.profiles?.display_name || "?")[0]}
                    </div>
                    <span className="font-medium">
                      {post.profiles?.display_name || "익명"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-foreground-muted">
                    {post.vote_count > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleVote(post.id, e); }}
                        disabled={votingId === post.id}
                        className={`flex min-h-[32px] min-w-[32px] items-center justify-center gap-1 rounded-full transition-colors ${
                          isVoted ? "text-red-500" : "hover:text-red-400"
                        }`}
                      >
                        <Heart size={12} className={isVoted ? "fill-current" : ""} />
                        {post.vote_count}
                      </button>
                    )}
                    {post.comment_count > 0 && (
                      <span className="flex items-center gap-1">
                        <MessageSquare size={12} />
                        {post.comment_count}
                      </span>
                    )}
                    <span className="text-[11px] sm:text-xs">{formatTime(post.created_at)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
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
      )}
    </div>
  );
}
