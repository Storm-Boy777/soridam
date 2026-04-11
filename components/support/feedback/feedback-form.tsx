"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createPost } from "@/lib/actions/support";
import type { SupportCategory } from "@/lib/types/support";

const CATEGORIES: { id: SupportCategory; label: string }[] = [
  { id: "question", label: "응원/인사" },
  { id: "suggestion", label: "기능건의" },
  { id: "bug", label: "버그제보" },
];

interface FeedbackFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function FeedbackForm({ onSuccess, onCancel }: FeedbackFormProps) {
  const [category, setCategory] = useState<SupportCategory>("question");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("제목과 내용을 입력해주세요");
      return;
    }
    setSubmitting(true);
    try {
      const result = await createPost({
        category,
        title: title.trim(),
        content: content.trim(),
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        onSuccess();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      {/* 헤더 */}
      <div className="flex items-center justify-between bg-surface-secondary/30 px-4 py-3 sm:px-5">
        <h3 className="text-sm font-semibold text-foreground">
          이야기 남기기
        </h3>
        <button
          onClick={onCancel}
          className="rounded-full p-1 text-foreground-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {/* 카테고리 선택 */}
        <div className="flex items-center gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                category === c.id
                  ? "bg-foreground text-background"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* 입력 필드 */}
        <div className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="어떤 이야기를 하고 싶으신가요?"
            maxLength={100}
            className="w-full rounded-lg border border-border/50 bg-surface-secondary/30 px-3 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-foreground-muted focus:border-primary-400 focus:bg-surface focus:ring-2 focus:ring-primary-400/10"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="여기에 이야기를 적어주세요. 버그의 경우 재현 방법을 포함해주시면 큰 도움이 됩니다."
            rows={5}
            className="w-full resize-none rounded-lg border border-border/50 bg-surface-secondary/30 px-3 py-2.5 text-sm leading-relaxed text-foreground outline-none transition-all placeholder:text-foreground-muted focus:border-primary-400 focus:bg-surface focus:ring-2 focus:ring-primary-400/10"
          />
        </div>

        {/* 액션 버튼 */}
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:items-center sm:justify-end">
          <button
            onClick={onCancel}
            className="min-h-[44px] rounded-lg px-4 py-2 text-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary hover:text-foreground sm:min-h-0"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !title.trim() || !content.trim()}
            className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg bg-primary-500 px-5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-primary-600 disabled:opacity-50 sm:min-h-0"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {submitting ? "등록 중..." : "이야기 남기기"}
          </button>
        </div>
      </div>
    </div>
  );
}
