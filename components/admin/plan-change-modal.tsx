"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { PlanChangeParams } from "@/lib/types/admin";

const PLAN_DEFAULTS = {
  free: { mockExam: 0, script: 0, tutoring: 0, months: 0 },
  basic: { mockExam: 3, script: 15, tutoring: 0, months: 1 },
  premium: { mockExam: 10, script: 50, tutoring: 3, months: 2 },
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
  const [plan, setPlan] = useState<"free" | "basic" | "premium">(
    (currentPlan as "free" | "basic" | "premium") || "free"
  );
  const defaults = PLAN_DEFAULTS[plan];
  const [mockExamCredits, setMockExamCredits] = useState(defaults.mockExam);
  const [scriptCredits, setScriptCredits] = useState(defaults.script);
  const [expiresInMonths, setExpiresInMonths] = useState(defaults.months);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const isFree = plan === "free";

  // 플랜 선택 변경 시 기본값 자동 세팅
  const handlePlanChange = (newPlan: "free" | "basic" | "premium") => {
    setPlan(newPlan);
    const d = PLAN_DEFAULTS[newPlan];
    setMockExamCredits(d.mockExam);
    setScriptCredits(d.script);
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
        mockExamCredits: isFree ? 0 : mockExamCredits,
        scriptCredits: isFree ? 0 : scriptCredits,
        expiresInMonths: isFree ? 0 : expiresInMonths,
        reason,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  // 플랜별 라벨/색상
  const planOptions = [
    { value: "free" as const, label: "Free", color: "bg-gray-100 text-gray-700 border-gray-300" },
    { value: "basic" as const, label: "베이직", color: "bg-blue-50 text-blue-700 border-blue-400" },
    { value: "premium" as const, label: "프리미엄", color: "bg-purple-50 text-purple-700 border-purple-400" },
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
          {/* 플랜 선택 라디오 */}
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

          {/* 플랜 크레딧 입력 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground-secondary">
                모의고사 크레딧
              </label>
              <input
                type="number"
                min={0}
                value={isFree ? 0 : mockExamCredits}
                onChange={(e) => setMockExamCredits(Number(e.target.value))}
                disabled={isFree}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-40"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground-secondary">
                스크립트 크레딧
              </label>
              <input
                type="number"
                min={0}
                value={isFree ? 0 : scriptCredits}
                onChange={(e) => setScriptCredits(Number(e.target.value))}
                disabled={isFree}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-40"
              />
            </div>
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
            {isFree && (
              <p className="mt-1 text-xs text-foreground-muted">
                Free 플랜은 크레딧 0, 기간 없음으로 설정됩니다.
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
