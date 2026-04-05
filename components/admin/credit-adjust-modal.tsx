"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { CreditAdjustParams } from "@/lib/types/admin";

const CREDIT_TYPES = [
  { value: "balance_krw", label: "크레딧 잔액 (원)" },
] as const;

interface CreditAdjustModalProps {
  userId: string;
  userName: string;
  onSubmit: (params: CreditAdjustParams) => Promise<void>;
  onClose: () => void;
}

export function CreditAdjustModal({
  userId,
  userName,
  onSubmit,
  onClose,
}: CreditAdjustModalProps) {
  const [creditType, setCreditType] = useState<CreditAdjustParams["creditType"]>("mock_exam_credits");
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount === 0 || !reason.trim()) return;
    setLoading(true);
    try {
      await onSubmit({ userId, creditType, amount, reason });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">크레딧 조정</h3>
          <button onClick={onClose} className="text-foreground-muted hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <p className="mb-4 text-sm text-foreground-secondary">
          대상: <span className="font-medium text-foreground">{userName}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground-secondary">
              크레딧 유형
            </label>
            <select
              value={creditType}
              onChange={(e) => setCreditType(e.target.value as CreditAdjustParams["creditType"])}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              {CREDIT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground-secondary">
              수량 (양수: 추가, 음수: 차감)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              placeholder="예: 5 또는 -3"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground-secondary">
              사유 (필수)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              placeholder="크레딧 조정 사유를 입력하세요"
            />
          </div>

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
              disabled={loading || amount === 0 || !reason.trim()}
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
