"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Clock } from "lucide-react";
import type { MockExamMode } from "@/lib/types/mock-exam";

interface SessionTimerProps {
  mode: MockExamMode;
  startedAt: string;
  onTimeExpired?: () => void;  // 40분 경과 시 콜백 (실전 모드)
}

export function SessionTimer({ mode, startedAt, onTimeExpired }: SessionTimerProps) {
  const isTraining = mode === "training";
  const hasTriggeredRef = useRef(false);

  const [seconds, setSeconds] = useState(() => {
    const start = new Date(startedAt).getTime();
    const elapsed = Math.floor((Date.now() - start) / 1000);
    return isTraining ? elapsed : Math.max(2400 - elapsed, 0);
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (isTraining) return prev + 1;
        const next = prev - 1;
        // 40분 경과 트리거 (1회만)
        if (next <= 0 && !hasTriggeredRef.current) {
          hasTriggeredRef.current = true;
          onTimeExpired?.();
        }
        return next; // 음수 허용 (초과 시간 표시)
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTraining, onTimeExpired]);

  // 포맷
  const formatted = useMemo(() => {
    const abs = Math.abs(seconds);
    const m = Math.floor(abs / 60);
    const s = abs % 60;
    const prefix = seconds < 0 ? "-" : "";
    return `${prefix}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, [seconds]);

  // 색상 (실전 모드)
  const colorClass = isTraining
    ? "text-foreground-secondary"
    : seconds <= 0
      ? "text-red-500"
      : seconds <= 300
        ? "text-orange-500"
        : seconds <= 600
          ? "text-yellow-600"
          : "text-green-600";

  return (
    <div className={`flex items-center gap-1.5 font-mono text-sm ${colorClass}`}>
      <Clock size={14} />
      <span>{formatted}</span>
    </div>
  );
}
