"use client";

import { useState } from "react";
import {
  BookOpen,
  Timer,
  Check,
  AlertTriangle,
  Lock,
} from "lucide-react";
import type { MockExamMode } from "@/lib/types/mock-exam";

// "trial"을 포함하는 확장 모드 타입
export type ExtendedMockExamMode = MockExamMode | "trial";

interface ModeSelectorProps {
  selectedMode: ExtendedMockExamMode | null;
  onSelect: (mode: ExtendedMockExamMode) => void;
  hasCredit?: boolean;
}

export function ModeSelector({ selectedMode, onSelect, hasCredit = true }: ModeSelectorProps) {
  return (
    <div>
      <p className="mb-3 text-sm font-medium text-foreground">
        모드를 선택하세요
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* 훈련 모드 */}
        <button
          onClick={() => hasCredit && onSelect("training")}
          className={`relative rounded-xl border p-5 text-left transition-all ${
            !hasCredit
              ? "cursor-not-allowed border-border bg-surface opacity-60"
              : selectedMode === "training"
                ? "border-primary-500 bg-primary-50/30 ring-2 ring-primary-100"
                : "border-border bg-surface hover:border-primary-200"
          }`}
        >
          {!hasCredit && (
            <div className="absolute right-3 top-3">
              <Lock size={14} className="text-foreground-muted" />
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100">
              <BookOpen size={16} className="text-primary-600" />
            </div>
            <span className="font-semibold text-foreground">훈련 모드</span>
          </div>
          <ul className="mt-3 space-y-1.5 pl-10">
            {[
              "시간 제한 없이 자유롭게 연습",
              "질문 텍스트 확인 가능",
              "문제 완료 후 개별 평가 즉시 확인",
              "72시간 내 이어하기 가능",
            ].map((text) => (
              <li
                key={text}
                className="flex items-start gap-1.5 text-xs text-foreground-secondary"
              >
                <Check size={12} className="mt-0.5 shrink-0 text-green-500" />
                {text}
              </li>
            ))}
          </ul>
        </button>

        {/* 실전 모드 */}
        <button
          onClick={() => hasCredit && onSelect("test")}
          className={`relative rounded-xl border p-5 text-left transition-all ${
            !hasCredit
              ? "cursor-not-allowed border-border bg-surface opacity-60"
              : selectedMode === "test"
                ? "border-accent-500 bg-accent-50/30 ring-2 ring-accent-100"
                : "border-border bg-surface hover:border-accent-200"
          }`}
        >
          {!hasCredit && (
            <div className="absolute right-3 top-3">
              <Lock size={14} className="text-foreground-muted" />
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-100">
              <Timer size={16} className="text-accent-600" />
            </div>
            <span className="font-semibold text-foreground">실전 모드</span>
          </div>
          <ul className="mt-3 space-y-1.5 pl-10">
            {[
              "실제 OPIc처럼 40분 제한",
              "질문 텍스트 보기 없음",
              "전체 완료 후에만 결과 확인",
              "90분 내 이어하기 가능",
            ].map((text) => (
              <li
                key={text}
                className="flex items-start gap-1.5 text-xs text-foreground-secondary"
              >
                <AlertTriangle
                  size={12}
                  className="mt-0.5 shrink-0 text-accent-500"
                />
                {text}
              </li>
            ))}
          </ul>
        </button>
      </div>

    </div>
  );
}

// ── 실전 모드 확인 다이얼로그 (UX 1-2) ──

interface TestModeConfirmProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

export function TestModeConfirm({
  open,
  onConfirm,
  onCancel,
  isLoading,
}: TestModeConfirmProps) {
  const [checks, setChecks] = useState([false, false, false, false]);

  const allChecked = checks.every(Boolean);

  const items = [
    "조용한 환경에서 진행합니다",
    "40분 동안 중단 없이 진행할 수 있습니다",
    "무응답(스킵) 5회 이상 시 정확한 등급 판정이 어렵습니다",
    "크레딧이 사용량에 따라 차감됩니다",
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-surface p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-foreground">
          실전 모드로 시작할까요?
        </h3>

        <div className="mt-4 space-y-3">
          {items.map((text, i) => (
            <label
              key={i}
              className="flex cursor-pointer items-start gap-3"
            >
              <input
                type="checkbox"
                checked={checks[i]}
                onChange={() => {
                  const next = [...checks];
                  next[i] = !next[i];
                  setChecks(next);
                }}
                className="mt-0.5 h-4 w-4 rounded border-border text-primary-500 accent-primary-500"
              />
              <span className="text-sm text-foreground-secondary">{text}</span>
            </label>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground-secondary hover:bg-surface-secondary"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={!allChecked || isLoading}
            className="flex-1 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
          >
            {isLoading ? "시작 중..." : "시작하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
