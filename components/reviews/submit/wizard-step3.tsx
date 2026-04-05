"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, Loader2, Send, Gift } from "lucide-react";
import { step3Schema, type Step3Input } from "@/lib/validations/reviews";
import { completeSubmission } from "@/lib/actions/reviews";

export interface CreditResult {
  creditGranted: boolean;
  nextCreditDate: string | null;
}

interface WizardStep3Props {
  submissionId: number;
  onComplete: (creditResult: CreditResult) => void;
  onBack: () => void;
}

export function WizardStep3({ submissionId, onComplete, onBack }: WizardStep3Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Step3Input>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      submission_id: submissionId,
      one_line_review: "",
      tips: "",
    },
  });

  const reviewLength = watch("one_line_review")?.length || 0;
  const tipsLength = watch("tips")?.length || 0;

  const onSubmit = async (data: Step3Input) => {
    setSubmitting(true);
    setError(null);

    const result = await completeSubmission({
      submission_id: submissionId,
      one_line_review: data.one_line_review,
      tips: data.tips || "",
    });

    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    onComplete({
      creditGranted: result.data?.creditGranted ?? false,
      nextCreditDate: result.data?.nextCreditDate ?? null,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">


      {/* 한줄 후기 */}
      <div>
        <label className="mb-1 block text-[13px] font-medium text-foreground sm:text-sm">
          한줄 후기 <span className="text-accent-500">*</span>
        </label>
        <p className="mb-1.5 text-[11px] text-foreground-muted sm:mb-2 sm:text-xs">
          이번 시험에 대한 한줄 감상을 남겨주세요
        </p>
        <div className="relative">
          <input
            type="text"
            maxLength={100}
            {...register("one_line_review")}
            placeholder="예: 롤플레이가 생각보다 어려웠어요"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary-500 focus:outline-none sm:rounded-[var(--radius-md)] sm:py-2.5"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-foreground-muted">
            {reviewLength}/100
          </span>
        </div>
        {errors.one_line_review && (
          <p className="mt-1 text-xs text-accent-500">{errors.one_line_review.message}</p>
        )}
      </div>

      {/* 팁/조언 */}
      <div>
        <label className="mb-1 block text-[13px] font-medium text-foreground sm:text-sm">
          팁/조언 <span className="text-foreground-muted">(선택)</span>
        </label>
        <p className="mb-1.5 text-[11px] text-foreground-muted sm:mb-2 sm:text-xs">
          다음 응시자에게 도움이 될 팁이 있다면 공유해주세요
        </p>
        <div className="relative">
          <textarea
            maxLength={300}
            rows={3}
            {...register("tips")}
            placeholder="예: 서베이를 잘 선택하면 원하는 주제를 유도할 수 있어요"
            className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary-500 focus:outline-none sm:rounded-[var(--radius-md)] sm:py-2.5"
          />
          <span className="absolute bottom-2 right-3 text-xs text-foreground-muted">
            {tipsLength}/300
          </span>
        </div>
        {errors.tips && (
          <p className="mt-1 text-xs text-accent-500">{errors.tips.message}</p>
        )}
      </div>

      {/* 에러 */}
      {error && (
        <div className="rounded-lg bg-accent-50 p-2.5 text-[13px] text-accent-600 sm:rounded-[var(--radius-md)] sm:p-3 sm:text-sm">
          {error}
        </div>
      )}

      {/* 버튼 */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-[13px] font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary sm:rounded-[var(--radius-lg)] sm:px-4 sm:py-2.5 sm:text-sm"
        >
          <ChevronLeft size={14} className="sm:hidden" />
          <ChevronLeft size={16} className="hidden sm:block" />
          이전 단계
        </button>

        <div className="flex-1" />

        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-50 sm:rounded-[var(--radius-lg)] sm:px-5 sm:py-3 sm:text-sm"
        >
          {submitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
          후기 완료하기
        </button>
      </div>
    </form>
  );
}
