"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useShadowingStore } from "@/lib/stores/shadowing";
import { ShadowingStepNav } from "./shadowing-step-nav";
import { TrialBanner } from "@/components/trial/trial-banner";
import { TrialComplete } from "@/components/trial/trial-complete";

const StepLoadingFallback = () => <div className="animate-pulse h-64 rounded-xl bg-surface-secondary" />;
const StepListen = dynamic(() => import("./step-listen").then(m => ({ default: m.StepListen })), { loading: StepLoadingFallback });
const StepShadow = dynamic(() => import("./step-shadow").then(m => ({ default: m.StepShadow })), { loading: StepLoadingFallback });
const StepRecite = dynamic(() => import("./step-recite").then(m => ({ default: m.StepRecite })), { loading: StepLoadingFallback });
const StepSpeak = dynamic(() => import("./step-speak").then(m => ({ default: m.StepSpeak })), { loading: StepLoadingFallback });
import type { ShadowingData } from "@/lib/actions/scripts";
import type { ShadowingStep } from "@/lib/types/scripts";
import { SHADOWING_STEP_DESCRIPTIONS } from "@/lib/types/scripts";

interface ShadowingContentProps {
  data: ShadowingData;
  isTrialMode?: boolean;
}

const STEPS: ShadowingStep[] = ["listen", "shadow", "recite", "speak"];

export function ShadowingContent({ data, isTrialMode = false }: ShadowingContentProps) {
  const { currentStep, setStep, init, packageId } = useShadowingStore();

  // persist 수동 rehydration: 렌더 중 Zustand setState 방지
  useEffect(() => {
    useShadowingStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (packageId !== data.packageId) {
      init({
        packageId: data.packageId,
        scriptId: data.scriptId,
        sentences: data.sentences,
        audioUrl: data.wavUrl,
        questionText: data.questionText,
        questionKorean: data.questionKorean,
        questionAudioUrl: data.questionAudioUrl,
        keyExpressions: data.keyExpressions,
        structureSummary: data.structureSummary,
        keySentences: data.keySentences,
      });
    }
  }, [data, packageId, init]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      const num = parseInt(e.key);
      if (num >= 1 && num <= 4) {
        e.preventDefault();
        setStep(STEPS[num - 1]);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setStep]);

  const renderStepContent = () => {
    switch (currentStep) {
      case "listen":  return <StepListen />;
      case "shadow":  return <StepShadow />;
      case "recite":  return <StepRecite />;
      case "speak":   return isTrialMode ? <TrialComplete type="script" /> : <StepSpeak />;
    }
  };

  const stepDescription = currentStep === "speak" && isTrialMode
    ? "체험판에서는 발화 평가를 제공하지 않습니다."
    : SHADOWING_STEP_DESCRIPTIONS[currentStep];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* 고정 탭 네비게이션 */}
      <div className="shrink-0 border-b border-border bg-surface/80 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl">
          <ShadowingStepNav currentStep={currentStep} onStepChange={setStep} />
        </div>
      </div>

      {/* 스크롤 콘텐츠 영역 */}
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="mx-auto w-full max-w-5xl px-4 pb-8 pt-5 sm:px-6">
            {/* 체험판 배너 */}
            {isTrialMode && (
              <div className="mb-4">
                <TrialBanner />
              </div>
            )}

            {/* 단계 설명 */}
            <p className="mb-5 text-center text-xs text-foreground-muted">
              {stepDescription}
            </p>

            {/* 단계 콘텐츠 */}
            {renderStepContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
