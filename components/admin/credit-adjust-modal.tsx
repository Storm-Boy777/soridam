"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { CreditAdjustParams } from "@/lib/types/admin";

interface CreditAdjustModalProps {
  userId: string;
  userName: string;
  currentBalanceCents: number;
  onSubmit: (params: CreditAdjustParams) => Promise<void>;
  onClose: () => void;
}

export function CreditAdjustModal({
  userId,
  userName,
  currentBalanceCents,
  onSubmit,
  onClose,
}: CreditAdjustModalProps) {
  const [amountUsd, setAmountUsd] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const amountCents = Math.round(parseFloat(amountUsd || "0") * 100);
  const previewCents = currentBalanceCents + amountCents;

  const formatUsd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amountCents === 0 || !reason.trim()) return;
    setLoading(true);
    try {
      await onSubmit({ userId, amountCents, reason });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl">
        {/* 헤더 */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">잔액 조정</h3>
          <button onClick={onClose} className="text-foreground-muted hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        {/* 대상 + 현재 잔액 */}
        <div className="mb-4 space-y-1 rounded-lg bg-surface-secondary px-4 py-3">
          <p className="text-sm text-foreground-secondary">
            대상: <span className="font-medium text-foreground">{userName}</span>
          </p>
          <p className="text-sm text-foreground-secondary">
            현재 잔액: <span className="font-semibold text-foreground">{formatUsd(currentBalanceCents)}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 조정 금액 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground-secondary">
              조정 금액 (USD)
              <span className="ml-1 text-xs font-normal text-foreground-muted">양수: 충전 / 음수: 차감</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground-muted">$</span>
              <input
                type="number"
                step="0.01"
                value={amountUsd}
                onChange={(e) => setAmountUsd(e.target.value)}
                className="w-full rounded-lg border border-border bg-background py-2 pl-7 pr-3 text-sm text-foreground"
                placeholder="예: 5.00 또는 -2.50"
              />
            </div>
            {/* 조정 후 잔액 미리보기 */}
            {amountCents !== 0 && (
              <p className="mt-1.5 text-xs text-foreground-muted">
                조정 후 잔액:{" "}
                <span className={`font-semibold ${previewCents < 0 ? "text-red-600" : "text-foreground"}`}>
                  {formatUsd(previewCents)}
                </span>
                {previewCents < 0 && (
                  <span className="ml-1 text-red-500">(음수 잔액 — 주의)</span>
                )}
              </p>
            )}
          </div>

          {/* 사유 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground-secondary">
              사유 (필수)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              placeholder="예: 서비스 오류 보상, 테스트 목적 충전"
            />
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm text-foreground-secondary hover:bg-surface-secondary"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading || amountCents === 0 || !reason.trim()}
              className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
            >
              {loading ? "처리 중..." : "적용"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
