"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { createPost } from "@/lib/actions/support";
import type { SupportCategory } from "@/lib/types/support";

const CATEGORIES: { id: SupportCategory; label: string; emoji: string }[] = [
  { id: "bug", label: "버그 신고", emoji: "🐛" },
  { id: "suggestion", label: "건의 사항", emoji: "💡" },
  { id: "question", label: "질문", emoji: "❓" },
];

interface FeedbackFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function FeedbackForm({ onSuccess, onCancel }: FeedbackFormProps) {
  const [category, setCategory] = useState<SupportCategory>("suggestion");
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
    <div className="rounded-xl border border-primary-200 bg-primary-50/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">피드백 작성</h3>
        <button
          onClick={onCancel}
          className="text-foreground-muted hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-3">
        {/* 카테고리 선택 */}
        <div className="flex gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all sm:text-sm ${
                category === c.id
                  ? "bg-primary-500 text-white"
                  : "bg-surface text-foreground-secondary hover:bg-surface-secondary"
              }`}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        {/* 제목 */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
          maxLength={100}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-200"
        />

        {/* 내용 */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="내용을 작성해주세요. 버그의 경우 재현 방법을 포함해주시면 도움이 됩니다."
          rows={5}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-200"
        />

        {/* 버튼 */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground-secondary hover:bg-surface-secondary"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !title.trim() || !content.trim()}
            className="rounded-lg bg-primary-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {submitting ? "등록 중..." : "등록하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
