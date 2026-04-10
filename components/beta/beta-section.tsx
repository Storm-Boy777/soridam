"use client";

// 대시보드 베타 배너 — beta 플랜 사용자에게만 표시

import { Sparkles } from "lucide-react";

interface BetaSectionProps {
  planExpiresAt: string | null;
  balanceCents: number;
}

export function BetaSection({ planExpiresAt, balanceCents }: BetaSectionProps) {
  const balanceUsd = (balanceCents / 100).toFixed(2);
  const expiryText = planExpiresAt
    ? new Date(planExpiresAt).toLocaleDateString("ko-KR")
    : null;

  return (
    <div className="rounded-[var(--radius-xl)] border border-primary-200 bg-gradient-to-r from-primary-50 to-secondary-50 p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Sparkles size={18} className="text-primary-500" />
        <span className="rounded-full bg-primary-500 px-2.5 py-0.5 text-xs font-bold text-white">
          BETA
        </span>
        <span className="text-sm font-semibold text-foreground">베타 테스터</span>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-foreground-muted">현재 크레딧</p>
          <p className="text-lg font-bold text-foreground">${balanceUsd}</p>
        </div>
        {expiryText && (
          <div className="text-right">
            <p className="text-xs text-foreground-muted">만료일</p>
            <p className="text-sm font-medium text-foreground">{expiryText}</p>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-foreground-secondary">
        서비스를 자유롭게 테스트하고 피드백을 남겨주세요.
      </p>
    </div>
  );
}
