"use client";

import { useEffect } from "react";
import { useShadowingStore } from "@/lib/stores/shadowing";
import { ShadowingStepNav } from "./shadowing-step-nav";
import { StepListen } from "./step-listen";
import { StepShadow } from "./step-shadow";
import { StepRecite } from "./step-recite";
import { StepSpeak } from "./step-speak";
import { TrialBanner } from "@/components/trial/trial-banner";
import { TrialComplete } from "@/components/trial/trial-complete";
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

  // 데이터 초기화 (패키지가 다르면 리셋)
  useEffect(() => {
    if (packageId !== data.packageId) {
      init({
        packageId: data.packageId,
        scriptId: data.scriptId,
        sentences: data.sentences,
        audioUrl: data.wavUrl,
        questionText: data.questionText,
        questionKorean: data.questionKorean,
        keyExpressions: data.keyExpressions,
      });
    }
  }, [data, packageId, init]);

  // 키보드 단축키
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
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setStep]);

  // Step 4 체험판: 실전 녹음 대신 완료 CTA
  const renderStepContent = () => {
    switch (currentStep) {
      case "listen":
        return <StepListen />;
      case "shadow":
        return <StepShadow />;
      case "recite":
        return <StepRecite />;
      case "speak":
        return isTrialMode ? <TrialComplete type="script" /> : <StepSpeak />;
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
      {/* 체험판 배너 */}
      {isTrialMode && (
        <div className="mb-4">
          <TrialBanner />
        </div>
      )}

      {/* Step 네비게이션 */}
      <ShadowingStepNav currentStep={currentStep} onStepChange={setStep} />

      {/* Step 설명 */}
      <p className="mt-3 text-center text-xs text-foreground-muted">
        {currentStep === "speak" && isTrialMode
          ? "체험판에서는 AI 평가를 제공하지 않습니다."
          : SHADOWING_STEP_DESCRIPTIONS[currentStep]}
      </p>

      {/* Step 콘텐츠 */}
      <div className="mt-5">
        {renderStepContent()}
      </div>

      {/* 키보드 단축키 힌트 */}
      <div className="mt-6 flex justify-center">
        <p className="text-xs text-foreground-muted/60">
          키보드 1~4로 단계 전환 가능
        </p>
      </div>
    </div>
  );
}
