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
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all">
      {/* 헤더 */}
      <div className="flex items-center justify-between bg-slate-50 px-5 py-3.5">
        <h3 className="text-[14px] font-semibold text-slate-800">
          이야기 남기기
        </h3>
        <button
          onClick={onCancel}
          className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-4 p-4 sm:space-y-5 sm:p-5">
        {/* 카테고리 선택 — 터치 최적화 태그 */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`min-h-[36px] rounded-full px-4 py-1.5 text-[13px] font-medium transition-all sm:text-sm ${
                category === c.id
                  ? "bg-slate-800 text-white shadow-sm"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
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
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[14px] text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-200/50"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="여기에 이야기를 적어주세요. 버그의 경우 재현 방법을 포함해주시면 큰 도움이 됩니다."
            rows={5}
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] leading-relaxed text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-200/50"
          />
        </div>

        {/* 액션 버튼 — 모바일: 전체 너비, SM+: 우측 정렬 */}
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            onClick={onCancel}
            className="min-h-[44px] rounded-xl px-4 py-2 text-[13px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 sm:min-h-0 sm:text-sm"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !title.trim() || !content.trim()}
            className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-slate-800 px-5 py-2.5 text-[13px] font-medium text-white shadow-sm transition-all hover:bg-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-400/20 disabled:opacity-50 disabled:hover:bg-slate-800 sm:min-h-0 sm:text-sm"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {submitting ? "등록 중..." : "이야기 남기기"}
          </button>
        </div>
      </div>
    </div>
  );
}
