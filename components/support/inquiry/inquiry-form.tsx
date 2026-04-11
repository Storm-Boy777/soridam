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
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="px-4 py-3 sm:px-5 sm:py-4">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            무엇이든 편하게 말씀해주세요
          </h3>
          <button
            onClick={onCancel}
            className="rounded-full p-1 text-foreground-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>
        <p className="text-xs text-foreground-secondary">
          계정 문제, 민감한 버그, 혹은 개인적인 제안 모두 환영합니다.
        </p>
      </div>

      <div className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
        {/* 카테고리 */}
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

        {/* 제목 */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="문의 제목을 입력하세요"
          maxLength={100}
          className="w-full rounded-lg border border-border/50 bg-surface-secondary/30 px-3 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-foreground-muted focus:border-primary-400 focus:bg-surface focus:ring-2 focus:ring-primary-400/10"
        />

        {/* 내용 */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="여기에 이야기를 적어주세요..."
          rows={5}
          className="w-full resize-none rounded-lg border border-border/50 bg-surface-secondary/30 px-3 py-2.5 text-sm leading-relaxed text-foreground outline-none transition-all placeholder:text-foreground-muted focus:border-primary-400 focus:bg-surface focus:ring-2 focus:ring-primary-400/10"
        />

        {/* 버튼 */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !title.trim() || !content.trim()}
          className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg bg-primary-500 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-primary-600 disabled:opacity-50"
        >
          {submitting && <Loader2 size={14} className="animate-spin" />}
          {submitting ? "전달 중..." : "개발자에게 이야기 건네기"}
        </button>

        {/* 보안 안내 */}
        <p className="flex items-center justify-center gap-1 text-[11px] text-foreground-muted">
          <Lock size={11} />
          이 공간에 남겨주신 이야기는 개발자만 안전하게 읽을 수 있습니다.
        </p>
      </div>
    </div>
  );
}
