"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { PartyPopper, Target, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useShadowingStore } from "@/lib/stores/shadowing";
import { ShadowingStepNav } from "./shadowing-step-nav";
import { ScriptSwitcher, NextTrainingCards } from "./script-navigator";
import { TrialBanner } from "@/components/trial/trial-banner";
import { TrialComplete } from "@/components/trial/trial-complete";

const StepLoadingFallback = () => <div className="animate-pulse h-64 rounded-xl bg-surface-secondary" />;
const StepListen = dynamic(() => import("./step-listen").then(m => ({ default: m.StepListen })), { loading: StepLoadingFallback });
const StepShadow = dynamic(() => import("./step-shadow").then(m => ({ default: m.StepShadow })), { loading: StepLoadingFallback });
const StepRecite = dynamic(() => import("./step-recite").then(m => ({ default: m.StepRecite })), { loading: StepLoadingFallback });
import type { ShadowingData } from "@/lib/actions/scripts";
import type { ScriptListItem } from "@/lib/types/scripts";
import { SHADOWING_STEP_DESCRIPTIONS } from "@/lib/types/scripts";

interface ShadowingContentProps {
  data: ShadowingData;
  scriptList?: ScriptListItem[];
  isTrialMode?: boolean;
}

// 진행 상태에 따른 동적 가이드 메시지
function useStepGuideMessage(): string {
  const {
    currentStep,
    sentences,
    listenedSentences,
    shadowPlayCounts,
  } = useShadowingStore();

  return useMemo(() => {
    const total = sentences.length;

    if (currentStep === "listen") {
      const heard = listenedSentences.length;
      if (heard === 0) return SHADOWING_STEP_DESCRIPTIONS.listen;
      if (heard >= total * 0.8) return "모든 문장을 들었습니다 — 따라 말하기로 넘어가 보세요";
      return `잘 듣고 계세요! ${heard}/${total} 문장 청취 완료`;
    }

    if (currentStep === "shadow") {
      const mastered = Object.values(shadowPlayCounts).filter((c) => c >= 3).length;
      if (mastered === 0) return SHADOWING_STEP_DESCRIPTIONS.shadow;
      if (mastered >= total) return "모든 문장 연습 완료! 통째로 체화로 넘어가 보세요";
      return `${mastered}/${total} 문장 연습 중 — 3번 이상 반복해보세요`;
    }

    return SHADOWING_STEP_DESCRIPTIONS.recite;
  }, [currentStep, sentences.length, listenedSentences.length, shadowPlayCounts]);
}

export function ShadowingContent({ data, scriptList = [], isTrialMode = false }: ShadowingContentProps) {
  const router = useRouter();
  const { currentStep, setStep, init, packageId, stepCompletions } = useShadowingStore();

  // 인페이지 전환: 페이지를 나가지 않고 다른 질문 훈련으로 이동 (URL만 교체 → 서버 데이터 재조회)
  const switchTo = useCallback(
    (pkgId: string, scrId: string) => {
      router.replace(`/scripts/shadowing?packageId=${pkgId}&scriptId=${scrId}`, { scroll: false });
    },
    [router],
  );

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

  // 단계 축소(speak 제거) 이전에 persist된 잘못된 currentStep 보정
  useEffect(() => {
    const cs = currentStep as string;
    if (cs !== "listen" && cs !== "shadow" && cs !== "recite") {
      setStep("recite");
    }
  }, [currentStep, setStep]);

  const stepDescription = useStepGuideMessage();

  const renderStepContent = () => {
    switch (currentStep) {
      case "listen":  return <StepListen />;
      case "shadow":  return <StepShadow />;
      case "recite":  return <StepRecite />;
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* 고정 탭 네비게이션 (+ 인페이지 질문 전환기) */}
      {/* relative z-30: backdrop-blur가 만든 stacking context를 콘텐츠 위로 올려 드롭다운이 가려지지 않게 */}
      <div className="relative z-30 shrink-0 border-b border-border bg-surface/80 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl">
          {!isTrialMode && (
            <ScriptSwitcher
              list={scriptList}
              currentScriptId={data.scriptId}
              currentTopic={data.topic}
              currentCategory={data.category}
              onSwitch={switchTo}
            />
          )}
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

            {/* 단계 설명 — 동적 */}
            <p className="mb-5 text-center text-xs text-foreground-muted">
              {stepDescription}
            </p>

            {/* 단계 콘텐츠 — 전환 애니메이션 */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>

            {/* 체화 완료 후 — 실전(모의고사) 핸드오프 + 다음 훈련 */}
            {currentStep === "recite" && stepCompletions.recite && (
              isTrialMode ? (
                <TrialComplete type="script" />
              ) : (
                <div className="mt-6 space-y-4">
                  <div className="rounded-[var(--radius-xl)] border border-primary-200 bg-primary-50/40 p-4 sm:p-5">
                    <div className="flex items-center gap-2">
                      <PartyPopper size={16} className="text-primary-500" />
                      <h3 className="text-sm font-semibold text-foreground">통째로 체화 완료!</h3>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-foreground-secondary">
                      이 스크립트를 입에 붙였어요. 실제 시험처럼 평가받고 싶다면 모의고사에서 실력을 확인해보세요.
                    </p>
                    <Link
                      href="/mock-exam"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-primary-600"
                    >
                      <Target size={14} />
                      모의고사로 실전 평가받기
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                  <NextTrainingCards
                    list={scriptList}
                    currentScriptId={data.scriptId}
                    currentTopic={data.topic}
                    currentCategory={data.category}
                    onSwitch={switchTo}
                  />
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
