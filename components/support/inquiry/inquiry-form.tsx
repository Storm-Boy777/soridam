"use client";

import { useState } from "react";
import { X, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createPost } from "@/lib/actions/support";
import type { SupportCategory } from "@/lib/types/support";

const CATEGORIES: { id: SupportCategory; label: string }[] = [
  { id: "other", label: "기타 문의" },
  { id: "refund", label: "환불 요청" },
  { id: "account", label: "계정 문제" },
];

interface InquiryFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function InquiryForm({ onSuccess, onCancel }: InquiryFormProps) {
  const [category, setCategory] = useState<SupportCategory>("other");
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
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-sm">
      <div className="px-5 py-4 sm:px-7 sm:py-5">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-slate-800">
            무엇이든 편하게 말씀해주세요
          </h3>
          <button
            onClick={onCancel}
            className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
          >
            <X size={16} />
          </button>
        </div>
        <p className="text-[13px] text-slate-500">
          계정 문제, 민감한 버그, 혹은 개인적인 제안 모두 환영합니다.
        </p>
      </div>

      <div className="space-y-4 px-5 pb-5 sm:px-7 sm:pb-7">
        {/* 카테고리 */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`min-h-[36px] rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-all sm:text-[13px] ${
                category === c.id
                  ? "bg-slate-800 text-white shadow-sm"
                  : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100 hover:text-slate-700"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* 제목 */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="문의 제목을 입력하세요"
          maxLength={100}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[14px] text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-200/50"
        />

        {/* 내용 */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="여기에 이야기를 적어주세요..."
          rows={5}
          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] leading-relaxed text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-200/50"
        />

        {/* 버튼 */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !title.trim() || !content.trim()}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-800 py-3.5 text-[14px] font-medium text-white shadow-sm transition-all hover:bg-slate-700 disabled:opacity-50 disabled:hover:bg-slate-800"
        >
          {submitting && <Loader2 size={14} className="animate-spin" />}
          {submitting ? "전달 중..." : "개발자에게 이야기 건네기"}
        </button>

        {/* 보안 안내 */}
        <p className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
          <Lock size={11} />
          이 공간에 남겨주신 이야기는 개발자만 안전하게 읽을 수 있습니다.
        </p>
      </div>
    </div>
  );
}
