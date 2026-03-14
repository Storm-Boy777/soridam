"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface TrialContextValue {
  isTrialMode: boolean;
  guideStep: number;
  setGuideStep: (step: number) => void;
  isFirstTrial: boolean;
}

const TrialContext = createContext<TrialContextValue>({
  isTrialMode: false,
  guideStep: 0,
  setGuideStep: () => {},
  isFirstTrial: true,
});

export function useTrialContext() {
  return useContext(TrialContext);
}

interface TrialProviderProps {
  children: ReactNode;
  isTrialMode: boolean;
  isFirstTrial?: boolean;
}

// 체험판 상태 관리 Provider
export function TrialProvider({ children, isTrialMode, isFirstTrial = true }: TrialProviderProps) {
  const [guideStep, setGuideStep] = useState(0);

  return (
    <TrialContext.Provider value={{ isTrialMode, guideStep, setGuideStep, isFirstTrial }}>
      {children}
    </TrialContext.Provider>
  );
}
