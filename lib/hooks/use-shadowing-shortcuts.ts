"use client";

import { useEffect } from "react";
import { useShadowingStore, type DisplayMode, type TextHintLevel } from "@/lib/stores/shadowing";
import type { ShadowingStep } from "@/lib/types/scripts";

const DISPLAY_MODES: DisplayMode[] = ["both", "english", "korean"];
const HINT_LEVELS: TextHintLevel[] = ["both", "english", "korean"];
const STEPS: ShadowingStep[] = ["listen", "shadow", "recite"];

interface ShortcutCallbacks {
  // Step 1 전용
  onTogglePlay?: () => void;
  // Step 2 전용
  onToggleSentencePlay?: () => void;
  onPrevSentence?: () => void;
  onNextSentence?: () => void;
  onRestartSentence?: () => void;
  // Step 3/4 전용
  onToggleRecording?: () => void;
}

export function useShadowingShortcuts(callbacks: ShortcutCallbacks = {}) {
  const store = useShadowingStore();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // input/textarea 내에서는 비활성
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const { currentStep } = store;

      // 숫자 키: Step 전환
      const num = parseInt(e.key);
      if (num >= 1 && num <= STEPS.length) {
        e.preventDefault();
        store.setStep(STEPS[num - 1]);
        return;
      }

      switch (e.key) {
        case " ": // Space: 재생/일시정지 or 녹음 시작/중지
          e.preventDefault();
          if (currentStep === "listen") {
            callbacks.onTogglePlay?.();
          } else if (currentStep === "shadow") {
            callbacks.onToggleSentencePlay?.();
          } else if (currentStep === "recite") {
            callbacks.onToggleRecording?.();
          }
          break;

        case "ArrowLeft":
          e.preventDefault();
          if (currentStep === "listen") {
            // -5초
            const audio = document.querySelector("audio");
            if (audio) audio.currentTime = Math.max(audio.currentTime - 5, 0);
          } else if (currentStep === "shadow") {
            callbacks.onPrevSentence?.();
          }
          break;

        case "ArrowRight":
          e.preventDefault();
          if (currentStep === "listen") {
            // +5초
            const audio = document.querySelector("audio");
            if (audio) audio.currentTime = Math.min(audio.currentTime + 5, audio.duration);
          } else if (currentStep === "shadow") {
            callbacks.onNextSentence?.();
          }
          break;

        case "r":
        case "R":
          e.preventDefault();
          if (currentStep === "listen") {
            store.toggleRepeat();
          } else if (currentStep === "shadow") {
            callbacks.onRestartSentence?.();
          }
          break;

        case "t":
        case "T":
          e.preventDefault();
          if (currentStep === "listen") {
            const idx = DISPLAY_MODES.indexOf(store.displayMode);
            store.setDisplayMode(DISPLAY_MODES[(idx + 1) % DISPLAY_MODES.length]);
          } else if (currentStep === "shadow") {
            const idx = HINT_LEVELS.indexOf(store.shadowHintLevel);
            store.setShadowHintLevel(HINT_LEVELS[(idx + 1) % HINT_LEVELS.length]);
          }
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [store, callbacks]);
}
