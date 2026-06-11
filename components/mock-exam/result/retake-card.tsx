"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  BookOpen,
  Timer,
  FileText,
  Loader2,
  AlertCircle,
  Play,
} from "lucide-react";
import { createSession } from "@/lib/actions/mock-exam";
import type { MockExamMode } from "@/lib/types/mock-exam";
import { TestModeConfirm } from "@/components/mock-exam/start/mode-selector";

interface RetakeCardProps {
  submissionId: number;
  /** 현재 결과 페이지가 보여주는 세션의 모드 (시각적 강조용, 옵셔널) */
  currentMode?: MockExamMode;
  /** 부모 페이지의 본문 폭과 정렬하기 위한 max-w 클래스. 기본 max-w-5xl */
  maxWidthClass?: string;
}

interface ModeOption {
  key: MockExamMode;
  label: string;
  desc: string;
  icon: typeof BookOpen;
  ring: string;
  iconBg: string;
  iconColor: string;
  border: string;
}

const MODES: ModeOption[] = [
  {
    key: "training",
    label: "훈련 모드",
    desc: "시간 무제한 · 문항별 즉시 평가",
    icon: BookOpen,
    ring: "ring-primary-100 border-primary-500 bg-primary-50/30",
    iconBg: "bg-primary-100",
    iconColor: "text-primary-600",
    border: "hover:border-primary-200",
  },
  {
    key: "test",
    label: "실전 모드",
    desc: "40분 제한 · 종합 평가",
    icon: Timer,
    ring: "ring-accent-100 border-accent-500 bg-accent-50/30",
    iconBg: "bg-accent-100",
    iconColor: "text-accent-600",
    border: "hover:border-accent-200",
  },
  {
    key: "transcript",
    label: "실전 감각 훈련",
    desc: "평가 없이 텍스트만 · 셀프 점검용",
    icon: FileText,
    ring: "ring-emerald-100 border-emerald-500 bg-emerald-50/30",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    border: "hover:border-emerald-200",
  },
];

/** createSession 에러에서 "(SESSION_ID)" 패턴을 추출 */
function extractActiveSessionId(msg: string): string | null {
  const m = msg.match(/\(([^)]+)\)/);
  return m ? m[1] : null;
}

export function RetakeCard({
  submissionId,
  currentMode,
  maxWidthClass = "max-w-5xl",
}: RetakeCardProps) {
  const router = useRouter();
  const [pendingMode, setPendingMode] = useState<MockExamMode | null>(null);
  const [showTestConfirm, setShowTestConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const startCreate = useCallback(
    async (mode: MockExamMode) => {
      setIsCreating(true);
      setError(null);
      setActiveSessionId(null);
      try {
        const res = await createSession({ submission_id: submissionId, mode });
        if (res.error || !res.data) {
          const msg = res.error || "재응시 세션 생성에 실패했습니다";
          setError(msg);
          const sid = extractActiveSessionId(msg);
          if (sid) setActiveSessionId(sid);
          setIsCreating(false);
          return;
        }
        router.push(`/mock-exam/session?id=${res.data.session_id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "오류가 발생했습니다");
        setIsCreating(false);
      }
    },
    [submissionId, router]
  );

  const handleSelect = useCallback(
    (mode: MockExamMode) => {
      if (isCreating) return;
      if (mode === "test") {
        setPendingMode(mode);
        setShowTestConfirm(true);
        return;
      }
      startCreate(mode);
    },
    [isCreating, startCreate]
  );

  const handleTestConfirm = useCallback(() => {
    setShowTestConfirm(false);
    if (pendingMode) startCreate(pendingMode);
  }, [pendingMode, startCreate]);

  const handleTestCancel = useCallback(() => {
    setShowTestConfirm(false);
    setPendingMode(null);
  }, []);

  return (
    <div className={`mx-auto mt-6 px-3 pb-8 sm:px-6 ${maxWidthClass}`}>
      <div className="rounded-2xl border border-border bg-surface p-4 sm:p-6">
        <div className="flex items-start gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100">
            <RefreshCw size={18} className="text-primary-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground sm:text-[15px]">
              이 기출로 다시 응시
            </h3>
            <p className="mt-0.5 text-xs text-foreground-secondary sm:text-sm">
              실전 감각 훈련으로 갈고닦은 뒤, 같은 문제로 다시 풀어 등급 개선을
              확인해보세요. 같은 기출은 횟수 제한 없이 재응시 가능합니다.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {MODES.map((m) => {
            const Icon = m.icon;
            const isCurrent = currentMode === m.key;
            const isLoading = isCreating && pendingMode === m.key;
            return (
              <button
                key={m.key}
                onClick={() => handleSelect(m.key)}
                disabled={isCreating}
                className={`relative rounded-xl border p-4 text-left transition-all ${
                  isLoading ? `ring-2 ${m.ring}` : `border-border bg-surface ${m.border}`
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {isCurrent && (
                  <span className="absolute right-2.5 top-2.5 rounded-full bg-foreground-muted/15 px-1.5 py-0.5 text-[10px] font-medium text-foreground-secondary">
                    현재 결과
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${m.iconBg}`}
                  >
                    <Icon size={16} className={m.iconColor} />
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {m.label}
                  </span>
                </div>
                <p className="mt-2 pl-10 text-xs text-foreground-secondary">
                  {m.desc}
                </p>
                {isLoading && (
                  <div className="mt-2 flex items-center gap-1.5 pl-10 text-xs text-primary-600">
                    <Loader2 size={12} className="animate-spin" />
                    시작 중...
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-600" />
              <div className="flex-1">
                <p className="text-sm text-amber-800">{error}</p>
                {activeSessionId && (
                  <button
                    onClick={() =>
                      router.push(`/mock-exam/session?id=${activeSessionId}`)
                    }
                    className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
                  >
                    <Play size={12} />
                    진행 중인 모의고사로 이동
                  </button>
                )}
                {!activeSessionId && error.includes("크레딧") && (
                  <button
                    onClick={() => router.push("/store")}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600"
                  >
                    스토어에서 충전하기
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <TestModeConfirm
        open={showTestConfirm}
        onConfirm={handleTestConfirm}
        onCancel={handleTestCancel}
        isLoading={isCreating}
      />
    </div>
  );
}
