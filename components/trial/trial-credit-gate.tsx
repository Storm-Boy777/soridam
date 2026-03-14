"use client";

import { X, FlaskConical, Send, CreditCard } from "lucide-react";
import Link from "next/link";

interface TrialCreditGateProps {
  open: boolean;
  onClose: () => void;
  // 어떤 크레딧이 부족한지 (모의고사 or 스크립트)
  type: "mock-exam" | "script";
}

// 크레딧 부족 시 체험판/후기/요금제 3가지 CTA 모달
export function TrialCreditGate({ open, onClose, type }: TrialCreditGateProps) {
  if (!open) return null;

  const title = type === "mock-exam" ? "모의고사" : "스크립트";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-sm rounded-xl bg-surface p-6 shadow-lg">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-foreground-muted hover:bg-surface-secondary"
        >
          <X size={16} />
        </button>

        <h3 className="text-lg font-semibold text-foreground">
          {title} 크레딧이 부족합니다
        </h3>
        <p className="mt-1 text-sm text-foreground-secondary">
          아래 방법으로 {title}를 이용할 수 있습니다.
        </p>

        <div className="mt-5 space-y-3">
          {/* 체험판 */}
          <Link
            href={type === "mock-exam" ? "/mock-exam/session?mode=trial" : "/scripts/create?mode=trial"}
            onClick={onClose}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-secondary-300 hover:bg-secondary-50/30"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary-100">
              <FlaskConical size={18} className="text-secondary-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">체험판으로 체험하기</p>
              <p className="text-xs text-foreground-muted">샘플 데이터로 기능을 미리 경험</p>
            </div>
          </Link>

          {/* 후기 제출 */}
          <Link
            href="/reviews?tab=submit"
            onClick={onClose}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary-300 hover:bg-primary-50/30"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100">
              <Send size={18} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">후기 제출로 크레딧 받기</p>
              <p className="text-xs text-foreground-muted">시험 후기를 제출하면 스크립트 크레딧 지급</p>
            </div>
          </Link>

          {/* 요금제 */}
          <Link
            href="/store"
            onClick={onClose}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary-300 hover:bg-primary-50/30"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-100">
              <CreditCard size={18} className="text-accent-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">요금제 구매하기</p>
              <p className="text-xs text-foreground-muted">크레딧을 구매하여 바로 이용</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
