"use client";

import { useState } from "react";
import { Send, Shield } from "lucide-react";
import { toast } from "sonner";
import { createComment } from "@/lib/actions/support";
import type { SupportComment } from "@/lib/types/support";

interface CommentSectionProps {
  postId: number;
  comments: SupportComment[];
  isLoggedIn: boolean;
  onRefresh?: () => void;
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

export function CommentSection({
  postId,
  comments,
  isLoggedIn,
  onRefresh,
}: CommentSectionProps) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const result = await createComment({
        post_id: postId,
        content: content.trim(),
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        setContent("");
        toast.success("댓글이 등록되었습니다");
        onRefresh?.();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h4 className="mb-3 text-sm font-semibold text-foreground">
        댓글{comments.length > 0 ? ` ${comments.length}` : ""}
      </h4>

      {/* 댓글 목록 */}
      {comments.length > 0 ? (
        <div className="space-y-2.5">
          {comments.map((c) => {
            const name = c.is_admin_reply
              ? "관리자"
              : c.profiles?.display_name || "사용자";
            const initial = name[0].toUpperCase();

            return (
              <div key={c.id} className="flex gap-2.5">
                {/* 아바타 */}
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    c.is_admin_reply
                      ? "bg-primary-500 text-white"
                      : "bg-surface-secondary text-foreground-muted"
                  }`}
                >
                  {c.is_admin_reply ? (
                    <Shield size={12} />
                  ) : (
                    initial
                  )}
                </div>

                {/* 내용 */}
                <div
                  className={`min-w-0 flex-1 rounded-lg px-3 py-2.5 ${
                    c.is_admin_reply
                      ? "border border-primary-200 bg-primary-50/40"
                      : "bg-surface-secondary"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs font-semibold ${
                        c.is_admin_reply
                          ? "text-primary-600"
                          : "text-foreground"
                      }`}
                    >
                      {name}
                    </span>
                    <span className="text-[10px] text-foreground-muted">
                      {formatTime(c.created_at)}
                    </span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-foreground">
                    {c.content}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="py-2 text-center text-xs text-foreground-muted">
          아직 댓글이 없습니다. 첫 댓글을 남겨보세요.
        </p>
      )}

      {/* 댓글 입력 */}
      {isLoggedIn && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-surface p-1.5 focus-within:border-primary-300 focus-within:ring-1 focus-within:ring-primary-200">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="댓글을 입력하세요..."
            className="flex-1 bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-foreground-muted"
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || !content.trim()}
            className="shrink-0 rounded-md bg-primary-500 p-2 text-white transition-colors hover:bg-primary-600 disabled:opacity-40"
          >
            <Send size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
