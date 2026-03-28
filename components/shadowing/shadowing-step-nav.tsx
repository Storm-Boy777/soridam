"use client";

import {
  Headphones,
  MessageSquare,
  BookOpen,
  Radio,
} from "lucide-react";
import type { ShadowingStep } from "@/lib/types/scripts";
import { SHADOWING_STEP_LABELS, SHADOWING_STEP_SHORT_LABELS } from "@/lib/types/scripts";

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

export function ShadowingStepNav({
  currentStep,
  onStepChange,
}: ShadowingStepNavProps) {
  return (
    <div className="flex">
      {STEPS.map((step, i) => {
        const Icon = STEP_ICONS[step];
        const isActive = step === currentStep;

        return (
          <button
            key={step}
            onClick={() => onStepChange(step)}
            className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-3 text-xs font-medium transition-colors sm:gap-2 sm:px-4 sm:text-sm ${
              isActive
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-foreground-muted hover:border-border hover:text-foreground-secondary"
            }`}
          >
            <Icon size={14} className="hidden sm:block" />
            <span className="whitespace-nowrap sm:hidden">{SHADOWING_STEP_SHORT_LABELS[step]}</span>
            <span className="hidden sm:inline">{SHADOWING_STEP_LABELS[step]}</span>
          </button>
        );
      })}
    </div>
  );
}
