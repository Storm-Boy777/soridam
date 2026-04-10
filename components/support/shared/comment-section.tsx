"use client";

import { useState } from "react";
import { Send, Shield, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createComment } from "@/lib/actions/support";
import type { SupportComment } from "@/lib/types/support";

interface CommentSectionProps {
  postId: number;
  comments: SupportComment[];
  isLoggedIn: boolean;
  /** 댓글 추가 후 호출할 리프레시 */
  onRefresh?: () => void;
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
      const result = await createComment({ post_id: postId, content: content.trim() });
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
    <div className="mt-4 border-t border-border pt-4">
      <h4 className="mb-3 text-xs font-semibold text-foreground-secondary">
        댓글 {comments.length > 0 && `(${comments.length})`}
      </h4>

      {/* 댓글 목록 */}
      {comments.length > 0 ? (
        <div className="space-y-3">
          {comments.map((c) => (
            <div
              key={c.id}
              className={`rounded-lg p-3 text-sm ${
                c.is_admin_reply
                  ? "border border-primary-200 bg-primary-50/50"
                  : "bg-surface-secondary"
              }`}
            >
              <div className="mb-1 flex items-center gap-1.5">
                {c.is_admin_reply && (
                  <Shield size={12} className="text-primary-500" />
                )}
                <span
                  className={`text-xs font-semibold ${
                    c.is_admin_reply
                      ? "text-primary-600"
                      : "text-foreground-secondary"
                  }`}
                >
                  {c.is_admin_reply
                    ? "관리자"
                    : c.profiles?.display_name || "사용자"}
                </span>
                <span className="text-[10px] text-foreground-muted">
                  {new Date(c.created_at).toLocaleDateString("ko-KR")}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-foreground">
                {c.content}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-2 text-xs text-foreground-muted">
          아직 댓글이 없습니다
        </p>
      )}

      {/* 댓글 입력 */}
      {isLoggedIn && (
        <div className="mt-3 flex gap-2">
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
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-200"
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || !content.trim()}
            className="shrink-0 rounded-lg bg-primary-500 px-3 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
          >
            <Send size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
