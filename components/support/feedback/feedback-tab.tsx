"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  ArrowUpDown,
  Heart,
  MessageSquare,
  Pin,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { getFeedbackPosts, toggleVote, getMyVotes, getPostDetail } from "@/lib/actions/support";
import { StatusBadge, CategoryBadge } from "../shared/status-badge";
import { CommentSection } from "../shared/comment-section";
import { FeedbackForm } from "./feedback-form";
import type {
  SupportPost,
  SupportCategory,
  FeedbackSort,
} from "@/lib/types/support";

interface FeedbackTabProps {
  initialData: { posts: SupportPost[]; total: number };
  isLoggedIn: boolean;
}

export function FeedbackTab({ initialData, isLoggedIn }: FeedbackTabProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<SupportCategory | "all">("all");
  const [sort, setSort] = useState<FeedbackSort>("latest");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [votedPosts, setVotedPosts] = useState<Set<number>>(new Set());
  const [votingId, setVotingId] = useState<number | null>(null);

  // 피드백 목록
  const { data, isLoading } = useQuery({
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

  // 내 투표 상태 로드
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

  // 상세 조회 (확장 시)
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

  // 공감 토글
  const handleVote = async (postId: number) => {
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
        if (result.data?.voted) {
          newSet.add(postId);
        } else {
          newSet.delete(postId);
        }
        setVotedPosts(newSet);
        queryClient.invalidateQueries({ queryKey: ["support-feedback"] });
      }
    } finally {
      setVotingId(null);
    }
  };

  // 글 작성 완료
  const handlePostCreated = () => {
    setShowForm(false);
    queryClient.invalidateQueries({ queryKey: ["support-feedback"] });
    toast.success("피드백이 등록되었습니다");
  };

  const categoryFilters: { id: SupportCategory | "all"; label: string }[] = [
    { id: "all", label: "전체" },
    { id: "bug", label: "🐛 버그" },
    { id: "suggestion", label: "💡 건의" },
    { id: "question", label: "❓ 질문" },
  ];

  return (
    <div className="space-y-4">
      {/* 필터 + 정렬 + 글쓰기 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* 카테고리 필터 */}
        <div className="flex gap-1.5">
          {categoryFilters.map((f) => (
            <button
              key={f.id}
              onClick={() => setCategory(f.id)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all sm:text-sm ${
                category === f.id
                  ? "bg-primary-500 text-white"
                  : "bg-surface-secondary text-foreground-secondary hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* 정렬 */}
          <button
            onClick={() =>
              setSort((s) => (s === "latest" ? "votes" : "latest"))
            }
            className="flex items-center gap-1 rounded-lg bg-surface-secondary px-2.5 py-1.5 text-xs font-medium text-foreground-secondary hover:text-foreground sm:text-sm"
          >
            <ArrowUpDown size={14} />
            {sort === "latest" ? "최신순" : "공감순"}
          </button>

          {/* 글쓰기 */}
          {isLoggedIn && (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-1 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600 sm:text-sm"
            >
              <Plus size={14} />
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

      {/* 목록 */}
      {data.posts.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex flex-col items-center py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-secondary">
              <MessageSquare size={24} className="text-foreground-muted" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground-secondary">
              아직 피드백이 없습니다
            </p>
            {isLoggedIn && (
              <p className="mt-1 text-xs text-foreground-muted">
                첫 번째 피드백을 남겨보세요!
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {data.posts.map((post) => {
            const isExpanded = expandedId === post.id;
            const isVoted = votedPosts.has(post.id);

            return (
              <div
                key={post.id}
                className="rounded-xl border border-border bg-surface transition-shadow hover:shadow-sm"
              >
                {/* 카드 헤더 */}
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : post.id)
                  }
                  className="flex w-full items-start gap-3 p-4 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                      {post.is_pinned && (
                        <Pin
                          size={12}
                          className="text-primary-500"
                          fill="currentColor"
                        />
                      )}
                      <CategoryBadge category={post.category} />
                      <StatusBadge status={post.status} />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground sm:text-base">
                      {post.title}
                    </h3>
                    <div className="mt-1 flex items-center gap-3 text-[10px] text-foreground-muted sm:text-xs">
                      <span>
                        {post.profiles?.display_name || "사용자"}
                      </span>
                      <span>
                        {new Date(post.created_at).toLocaleDateString(
                          "ko-KR"
                        )}
                      </span>
                    </div>
                  </div>

                  {/* 공감 + 댓글 수 + 확장 아이콘 */}
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="flex items-center gap-1 text-xs text-foreground-muted">
                      <Heart
                        size={14}
                        className={isVoted ? "fill-red-400 text-red-400" : ""}
                      />
                      {post.vote_count}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-foreground-muted">
                      <MessageSquare size={14} />
                      {post.comment_count}
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-foreground-muted" />
                    ) : (
                      <ChevronDown
                        size={16}
                        className="text-foreground-muted"
                      />
                    )}
                  </div>
                </button>

                {/* 확장 영역 */}
                {isExpanded && (
                  <div className="border-t border-border px-4 pb-4 pt-3">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                      {detail?.content || post.content}
                    </p>

                    {/* 공감 버튼 */}
                    <div className="mt-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVote(post.id);
                        }}
                        disabled={votingId === post.id}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                          isVoted
                            ? "bg-red-50 text-red-500"
                            : "bg-surface-secondary text-foreground-secondary hover:bg-red-50 hover:text-red-400"
                        }`}
                      >
                        <Heart
                          size={14}
                          className={isVoted ? "fill-current" : ""}
                        />
                        {isVoted ? "공감 취소" : "공감"}
                      </button>
                    </div>

                    {/* 댓글 */}
                    <CommentSection
                      postId={post.id}
                      comments={detail?.comments || []}
                      isLoggedIn={isLoggedIn}
                      onRefresh={() =>
                        queryClient.invalidateQueries({
                          queryKey: ["support-post-detail", post.id],
                        })
                      }
                    />
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
