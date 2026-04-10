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
      <h4 className="text-[13px] font-semibold text-slate-800">
        댓글{comments.length > 0 ? ` ${comments.length}` : ""}
      </h4>

      {/* 댓글 목록 */}
      {comments.length > 0 ? (
        <div className="mt-3 divide-y divide-slate-100">
          {comments.map((c) => {
            const name = c.is_admin_reply
              ? "소리담 개발자"
              : c.profiles?.display_name || "사용자";
            const initial = name[0].toUpperCase();

            return (
              <div key={c.id} className="flex gap-3 py-3.5 first:pt-0">
                {/* 아바타 */}
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    c.is_admin_reply
                      ? "bg-blue-500 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {c.is_admin_reply ? <Shield size={11} /> : initial}
                </div>

                {/* 내용 */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[12px] font-semibold ${
                        c.is_admin_reply
                          ? "text-blue-600"
                          : "text-slate-700"
                      }`}
                    >
                      {name}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {formatTime(c.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-600">
                    {c.content}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="py-6 text-center text-[13px] text-slate-400">
          아직 댓글이 없습니다. 첫 댓글을 남겨보세요.
        </p>
      )}

      {/* 댓글 입력 */}
      {isLoggedIn && (
        <div className="mt-4 flex items-end gap-2 rounded-xl border border-slate-200 bg-white p-2 transition-all focus-within:border-slate-400 focus-within:ring-4 focus-within:ring-slate-200/50">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="댓글을 입력하세요..."
            rows={1}
            className="flex-1 resize-none bg-transparent px-2 py-2 text-[13px] text-slate-700 outline-none placeholder:text-slate-400 sm:text-sm"
            style={{ maxHeight: "120px", overflowY: "auto" }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || !content.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-white shadow-sm transition-colors hover:bg-slate-700 disabled:opacity-40"
          >
            <Send size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
