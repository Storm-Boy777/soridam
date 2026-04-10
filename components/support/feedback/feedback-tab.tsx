"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PenLine,
  Trash2,
  ArrowUpDown,
  Heart,
  MessageSquare,
  Pin,
  ChevronLeft,
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
    toast.success("이야기가 등록되었습니다");
  };

  const categoryFilters: { id: SupportCategory | "all"; label: string }[] = [
    { id: "all", label: "전체" },
    { id: "question", label: "응원/인사" },
    { id: "suggestion", label: "기능건의" },
    { id: "bug", label: "버그제보" },
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
          className="group flex items-center gap-1.5 text-[13px] text-slate-400 transition-colors hover:text-slate-700"
        >
          <ChevronLeft size={15} className="transition-transform group-hover:-translate-x-0.5" />
          목록으로
        </button>

        {/* 글 본문 */}
        <article>
          {/* 제목 영역 */}
          <div className="pb-5">
            <div className="flex items-start justify-between gap-4">
              {editing ? (
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  maxLength={200}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xl font-semibold text-slate-800 outline-none transition-all focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-200/50"
                />
              ) : (
                <h2 className="text-xl font-semibold leading-snug tracking-tight text-slate-800 sm:text-2xl">
                  {selectedPost.title}
                </h2>
              )}
              {isOwner && !editing && (
                <div className="flex shrink-0 items-center gap-2 pt-1.5">
                  <button
                    onClick={() => {
                      setEditing(true);
                      setEditTitle(selectedPost.title);
                      setEditContent(detail?.content || selectedPost.content);
                    }}
                    className="text-[11px] text-slate-400 transition-colors hover:text-slate-700"
                  >
                    수정
                  </button>
                  <span className="text-slate-200">|</span>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-[11px] text-slate-400 transition-colors hover:text-rose-500"
                  >
                    삭제
                  </button>
                </div>
              )}
            </div>

            {/* 메타 정보 */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-slate-400">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">
                {(selectedPost.profiles?.display_name || "?")[0]}
              </div>
              <span className="font-medium text-slate-600">
                {selectedPost.profiles?.display_name || "익명"}
              </span>
              <span className="h-0.5 w-0.5 rounded-full bg-slate-300" />
              <span>{formatTime(selectedPost.created_at)}</span>
              <span className="h-0.5 w-0.5 rounded-full bg-slate-300" />
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${CATEGORY_COLORS[selectedPost.category]}`}>
                {CATEGORY_LABELS[selectedPost.category]}
              </span>
            </div>
          </div>

          {/* 본문 컨텐츠 */}
          <div className="border-t border-slate-100 pt-6">
            {editing ? (
              <div className="space-y-4">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={8}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] leading-[1.8] text-slate-700 outline-none transition-all focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-200/50"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setEditing(false)}
                    className="rounded-xl px-4 py-2 text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-700"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={saving || !editTitle.trim() || !editContent.trim()}
                    className="rounded-xl bg-slate-800 px-5 py-2 text-[13px] font-medium text-white shadow-sm hover:bg-slate-700 disabled:opacity-50"
                  >
                    {saving ? "저장 중..." : "저장"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-[14px] leading-[1.9] text-slate-700 sm:text-[15px]">
                {detail?.content || selectedPost.content}
              </div>
            )}
          </div>

          {/* 공감 바 */}
          {!editing && (
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={(e) => handleVote(selectedId, e)}
                disabled={votingId === selectedId}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-medium transition-all ${
                  isVoted
                    ? "bg-rose-50 text-rose-500 ring-1 ring-rose-200"
                    : "bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-400"
                }`}
              >
                <Heart size={13} className={isVoted ? "fill-current" : ""} />
                공감 {selectedPost.vote_count > 0 ? selectedPost.vote_count : ""}
              </button>
              <span className="flex items-center gap-1 text-[12px] text-slate-400">
                <MessageSquare size={12} />
                {selectedPost.comment_count}
              </span>
            </div>
          )}
        </article>

        {/* 댓글 섹션 */}
        {!editing && (
          <div className="border-t border-slate-100 pt-6">
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
    <div className="space-y-5">
      {/* 툴바 — 모바일: 카테고리 위, 액션 아래 / SM+: 한 줄 */}
      <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
        {/* 카테고리 필터 — 터치 최적화 (최소 44px) */}
        <div className="flex flex-wrap gap-1.5">
          {categoryFilters.map((f) => (
            <button
              key={f.id}
              onClick={() => setCategory(f.id)}
              className={`min-h-[36px] rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-all sm:min-h-0 sm:text-[13px] ${
                category === f.id
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSort((s) => (s === "latest" ? "votes" : "latest"))}
            className="flex min-h-[36px] items-center gap-1 text-[12px] text-slate-400 transition-colors hover:text-slate-700 sm:text-[13px]"
          >
            <ArrowUpDown size={13} />
            {sort === "latest" ? "최신순" : "공감순"}
          </button>

          {isLoggedIn && (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex min-h-[44px] items-center gap-1.5 rounded-full bg-slate-800 px-5 py-2.5 text-[13px] font-medium text-white shadow-sm transition-all hover:bg-slate-700 sm:text-sm"
            >
              <PenLine size={14} />
              이야기 남기기
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
        <div className="py-20 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <Heart size={24} className="text-slate-300" />
          </div>
          <p className="mt-4 text-[15px] font-medium text-slate-500">
            첫 번째 목소리를 남겨주세요
          </p>
          <p className="mx-auto mt-1.5 max-w-[280px] text-[13px] leading-relaxed text-slate-400">
            {isLoggedIn
              ? "여러분이 들려주시는 작은 성장의 기쁨이 소리담을 움직이는 가장 큰 원동력입니다."
              : "로그인하고 소통에 참여하세요."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.posts.map((post) => {
            const isVoted = votedPosts.has(post.id);

            return (
              <div
                key={post.id}
                onClick={() => setSelectedId(post.id)}
                className="group cursor-pointer rounded-2xl border border-slate-100 bg-white px-4 py-4 transition-all hover:border-slate-200 hover:shadow-sm sm:px-5 sm:py-5"
              >
                {/* 태그 + 메타 */}
                <div className="flex items-center gap-2 text-[11px] sm:text-[12px]">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium sm:text-[11px] ${CATEGORY_COLORS[post.category]}`}>
                    {CATEGORY_LABELS[post.category]}
                  </span>
                  {post.is_pinned && (
                    <Pin size={11} className="text-primary-500" fill="currentColor" />
                  )}
                  <span className="text-slate-400">{formatTime(post.created_at)}</span>
                </div>

                {/* 제목 */}
                <h3 className="mt-2 text-[15px] font-medium leading-snug text-slate-800 transition-colors group-hover:text-primary-600 sm:text-base">
                  {post.title}
                </h3>

                {/* 하단: 작성자 + 공감/댓글 */}
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 sm:text-[12px]">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                      {(post.profiles?.display_name || "?")[0]}
                    </div>
                    <span className="font-medium text-slate-500">
                      {post.profiles?.display_name || "익명"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 sm:text-[12px]">
                    {post.vote_count > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleVote(post.id, e); }}
                        disabled={votingId === post.id}
                        className={`flex min-h-[32px] min-w-[32px] items-center justify-center gap-1 rounded-full transition-colors ${
                          isVoted ? "text-rose-500" : "hover:text-rose-400"
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
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {data.total > 0 && (
        <p className="pt-2 text-center text-[11px] text-slate-300">
          {data.total}건의 이야기
        </p>
      )}
    </div>
  );
}
