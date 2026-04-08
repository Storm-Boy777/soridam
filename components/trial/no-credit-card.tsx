"use client";

import Link from "next/link";
import { AlertCircle, FlaskConical, Wallet } from "lucide-react";

interface NoCreditCardProps {
  type: "script" | "mock-exam" | "tutoring";
  credits?: number;
}

const CONFIG = {
  script: {
    label: "스크립트",
    trialHref: "/scripts/create?mode=trial",
  },
  "mock-exam": {
    label: "모의고사",
    trialHref: "/mock-exam/session?mode=trial",
  },
  tutoring: {
    label: "튜터링",
    trialHref: null,
  },
};

// 크레딧 부족 시 공통 안내 카드
export function NoCreditCard({ type, credits = 0 }: NoCreditCardProps) {
  const { label, trialHref } = CONFIG[type];

  return (
    <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 sm:p-5">
      {/* 크레딧 현황 */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-sm text-foreground-secondary">크레딧 잔액:</span>
        <span className="text-sm font-bold text-foreground">${(credits / 100).toFixed(2)}</span>
        {credits <= 0 && (
          <span className="text-xs text-accent-500">(크레딧이 부족합니다)</span>
        )}
      </div>

      {/* 체험판 + 충전 */}
      <div className={`mt-4 grid grid-cols-1 gap-2.5 ${trialHref ? "sm:grid-cols-2" : ""} sm:gap-3`}>
        {trialHref && (
          <Link
            href={trialHref}
            className="flex items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-secondary-200 bg-secondary-50/30 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-secondary-300 hover:bg-secondary-50/60"
          >
            <FlaskConical size={16} className="text-secondary-600" />
            체험판으로 체험하기
          </Link>
        )}
        <Link
          href="/store"
          className="flex items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-primary-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-600"
        >
          <Wallet size={16} />
          크레딧 충전하기
        </Link>
      </div>
    </div>
  );
}
