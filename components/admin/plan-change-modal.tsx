"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { PlanChangeParams } from "@/lib/types/admin";

const PLAN_DEFAULTS: Record<string, { balanceCents: number; months: number }> = {
  free: { balanceCents: 0,    months: 0 },
  beta: { balanceCents: 1000, months: 1 },
};

interface PlanChangeModalProps {
  userId: string;
  userName: string;
  currentPlan: string;
  onSubmit: (params: PlanChangeParams) => Promise<void>;
  onClose: () => void;
}

export function PlanChangeModal({
  userId,
  userName,
  currentPlan,
  onSubmit,
  onClose,
}: PlanChangeModalProps) {
  const [plan, setPlan] = useState<"free" | "beta">(
    currentPlan === "beta" ? "beta" : "free"
  );
  const defaults = PLAN_DEFAULTS[plan];
  const [balanceCents, setBalanceCents] = useState(defaults.balanceCents);
  const [expiresInMonths, setExpiresInMonths] = useState(defaults.months);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const isFree = plan === "free";

  // 플랜 선택 변경 시 기본값 자동 세팅
  const handlePlanChange = (newPlan: "free" | "beta") => {
    setPlan(newPlan);
    const d = PLAN_DEFAULTS[newPlan];
    setBalanceCents(d.balanceCents);
    setExpiresInMonths(d.months);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setLoading(true);
    try {
      await onSubmit({
        userId,
        plan,
        balanceCents: isFree ? 0 : balanceCents,
        expiresInMonths: isFree ? 0 : expiresInMonths,
        reason,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const planOptions = [
    { value: "free" as const, label: "Free", color: "bg-gray-100 text-gray-700 border-gray-300" },
    { value: "beta" as const, label: "Beta", color: "bg-primary-50 text-primary-700 border-primary-400" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-auto mt-20 w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-lg">
        {/* 헤더 */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">플랜 변경</h3>
          <button onClick={onClose} className="text-foreground-muted hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        {/* 대상 + 현재 플랜 */}
        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="text-foreground-secondary">
            대상: <span className="font-medium text-foreground">{userName}</span>
          </span>
          <span className="rounded-md bg-surface-secondary px-2 py-0.5 text-xs text-foreground-muted">
            현재: {currentPlan}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 플랜 선택 */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground-secondary">
              변경할 플랜
            </label>
            <div className="flex gap-2">
              {planOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handlePlanChange(opt.value)}
                  className={`flex-1 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors ${
                    plan === opt.value
                      ? opt.color
                      : "border-border bg-background text-foreground-muted hover:bg-surface-secondary"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 크레딧 충전 금액 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground-secondary">
              크레딧 충전 금액 (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground-muted">$</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={isFree ? "0.00" : (balanceCents / 100).toFixed(2)}
                onChange={(e) =>
                  setBalanceCents(Math.round(parseFloat(e.target.value || "0") * 100))
                }
                disabled={isFree}
                className="w-full rounded-lg border border-border bg-background py-2 pl-7 pr-3 text-sm text-foreground disabled:opacity-40"
                placeholder="0.00"
              />
            </div>
            {isFree ? (
              <p className="mt-1 text-xs text-foreground-muted">
                Free 플랜 전환 시 크레딧 충전 없이 플랜만 변경됩니다.
              </p>
            ) : (
              <p className="mt-1 text-xs text-foreground-muted">
                기존 잔액에 추가 충전됩니다.
              </p>
            )}
          </div>

          {/* 유효 기간 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground-secondary">
              유효 기간 (개월)
            </label>
            <input
              type="number"
              min={0}
              value={isFree ? 0 : expiresInMonths}
              onChange={(e) => setExpiresInMonths(Number(e.target.value))}
              disabled={isFree}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-40"
              placeholder="예: 1"
            />
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
              placeholder="플랜 변경 사유를 입력하세요"
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
              disabled={loading || !reason.trim()}
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
