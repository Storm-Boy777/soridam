"use client";

import { useSearchParams } from "next/navigation";

// 체험판 모드 감지 훅 — ?mode=trial 파라미터 기반
export function useTrialMode() {
  const searchParams = useSearchParams();
  return searchParams.get("mode") === "trial";
}
