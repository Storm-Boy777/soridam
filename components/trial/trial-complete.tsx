"use client";

import Link from "next/link";
import {
  PartyPopper,
  CheckCircle2,
  CreditCard,
  Send,
  ArrowRight,
} from "lucide-react";

interface TrialCompleteProps {
  type: "script" | "mock-exam";
}

// 체험판 완료 CTA 카드
export function TrialComplete({ type }: TrialCompleteProps) {
  if (type === "script") {
    return (
      <div className="flex flex-col items-center justify-center py-8 sm:py-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 sm:h-16 sm:w-16">
          <PartyPopper size={28} className="text-primary-500 sm:hidden" />
          <PartyPopper size={32} className="hidden text-primary-500 sm:block" />
        </div>
        <h2 className="mt-3 text-base font-semibold text-foreground sm:mt-4 sm:text-lg">
          스크립트 체험이 완료되었습니다!
        </h2>
        <p className="mt-1.5 max-w-sm text-center text-xs text-foreground-secondary sm:mt-2 sm:text-sm">
          나만의 경험으로 만든 맞춤 스크립트를 직접 생성해보세요.
          <br />
          시험 후기를 제출하면 스크립트 크레딧을 받을 수 있어요.
        </p>

        <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
          <Link
            href="/reviews?tab=submit"
            className="flex items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-primary-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600"
          >
            <Send size={16} />
            후기 제출하고 크레딧 받기
          </Link>
          <Link
            href="/store"
            className="flex items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-border bg-surface px-5 py-2.5 text-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary"
          >
            <CreditCard size={16} />
            요금제 보기
          </Link>
        </div>

        <Link
          href="/scripts"
          className="mt-4 inline-flex items-center gap-1 text-xs text-foreground-muted hover:text-foreground-secondary"
        >
          스크립트 페이지로 돌아가기
          <ArrowRight size={12} />
        </Link>
      </div>
    );
  }

  // 모의고사 체험판 완료
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 sm:h-16 sm:w-16">
        <PartyPopper size={28} className="text-primary-500 sm:hidden" />
        <PartyPopper size={32} className="hidden text-primary-500 sm:block" />
      </div>
      <h2 className="mt-3 text-base font-semibold text-foreground sm:mt-4 sm:text-lg">
        모의고사 체험이 완료되었습니다!
      </h2>
      <p className="mt-2 max-w-sm text-center text-xs text-foreground-secondary sm:text-sm">
        체험판에서는 결과를 제공하지 않습니다.
        <br />
        실전 모의고사에서는 다음을 확인할 수 있습니다:
      </p>

      <div className="mt-4 w-full max-w-xs space-y-2">
        {[
          "예상 등급 판정 (NL ~ AL)",
          "FACT 4영역 상세 점수",
          "문항별 STT + 발음 분석 + 코칭 피드백",
          "성장 리포트 (이전 시험 비교 분석)",
        ].map((item) => (
          <div
            key={item}
            className="flex items-center gap-2 text-xs text-foreground-secondary sm:text-sm"
          >
            <CheckCircle2 size={14} className="shrink-0 text-primary-500" />
            {item}
          </div>
        ))}
      </div>

      <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
        <Link
          href="/store"
          className="flex items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-primary-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600"
        >
          <CreditCard size={16} />
          요금제 보기
        </Link>
      </div>

      <Link
        href="/mock-exam"
        className="mt-4 inline-flex items-center gap-1 text-xs text-foreground-muted hover:text-foreground-secondary"
      >
        모의고사 페이지로 돌아가기
        <ArrowRight size={12} />
      </Link>
    </div>
  );
}
