"use client";

import {
  Headphones,
  MessageSquare,
  BookOpen,
  Radio,
  Check,
} from "lucide-react";
import { motion } from "framer-motion";
import type { ShadowingStep } from "@/lib/types/scripts";
import { SHADOWING_STEP_LABELS, SHADOWING_STEP_SHORT_LABELS } from "@/lib/types/scripts";
import { useShadowingStore } from "@/lib/stores/shadowing";
import { StepProgressRing } from "./step-progress-ring";

const STEP_ICONS: Record<ShadowingStep, React.ElementType> = {
  listen: Headphones,
  shadow: MessageSquare,
  recite: BookOpen,
  speak: Radio,
};

const STEPS: ShadowingStep[] = ["listen", "shadow", "recite", "speak"];

interface ShadowingStepNavProps {
  currentStep: ShadowingStep;
  onStepChange: (step: ShadowingStep) => void;
}

// Step별 진행률 계산 (0~1)
function useStepProgress(): Record<ShadowingStep, number> {
  const {
    sentences,
    listenedSentences,
    shadowPlayCounts,
    reciteRecordingDone,
    speakResult,
  } = useShadowingStore();

  const total = sentences.length || 1;

  // Step 1: 청취한 문장 비율
  const listenProgress = Math.min(1, listenedSentences.length / total);

  // Step 2: 3회 이상 재생한 문장 비율
  const masteredCount = Object.values(shadowPlayCounts).filter((c) => c >= 3).length;
  const shadowProgress = Math.min(1, masteredCount / total);

  // Step 3: 녹음 완료 = 1
  const reciteProgress = reciteRecordingDone ? 1 : 0;

  // Step 4: 평가 완료 = 1
  const speakProgress = speakResult ? 1 : 0;

  return {
    listen: listenProgress,
    shadow: shadowProgress,
    recite: reciteProgress,
    speak: speakProgress,
  };
}

export function ShadowingStepNav({
  currentStep,
  onStepChange,
}: ShadowingStepNavProps) {
  const progress = useStepProgress();

  return (
    <div className="relative flex">
      {STEPS.map((step) => {
        const Icon = STEP_ICONS[step];
        const isActive = step === currentStep;
        const stepProgress = progress[step];
        // 완료 = 진행률 100%로 판단 (persist된 stepCompletions에 의존하지 않음)
        const isComplete = stepProgress >= 1;

        return (
          <button
            key={step}
            onClick={() => onStepChange(step)}
            className={`relative flex flex-1 flex-col items-center justify-center gap-1 px-2 py-3 text-xs font-medium transition-colors sm:flex-row sm:gap-2 sm:px-4 sm:text-sm ${
              isActive
                ? "text-primary-600"
                : "text-foreground-muted hover:text-foreground-secondary"
            }`}
          >
            {/* 슬라이딩 인디케이터 */}
            {isActive && (
              <motion.div
                layoutId="step-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}

            {/* 아이콘 + 진행률 링 — 데스크탑에서만 표시 */}
            <div className="relative hidden h-[22px] w-[22px] items-center justify-center sm:flex">
              {/* 진행률 링 — 미완료 + 진행 중인 경우만 표시 */}
              {!isComplete && stepProgress > 0 && stepProgress < 1 && (
                <div className="absolute inset-0">
                  <StepProgressRing progress={stepProgress} size={22} strokeWidth={1.5} />
                </div>
              )}

              {/* 완료 체크 뱃지 */}
              {isComplete ? (
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500">
                  <Check size={10} className="text-white" strokeWidth={3} />
                </div>
              ) : (
                <Icon size={14} />
              )}
            </div>

            {/* 모바일: 텍스트 + 완료 체크 */}
            <span className="whitespace-nowrap sm:hidden">
              {isComplete ? (
                <span className="flex items-center gap-0.5">
                  <Check size={10} className="text-green-500" strokeWidth={3} />
                  {SHADOWING_STEP_SHORT_LABELS[step]}
                </span>
              ) : (
                SHADOWING_STEP_SHORT_LABELS[step]
              )}
            </span>
            <span className="hidden sm:inline">{SHADOWING_STEP_LABELS[step]}</span>
          </button>
        );
      })}
    </div>
  );
}
