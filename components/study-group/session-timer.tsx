"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Clock, Play, Pause, RotateCcw } from "lucide-react";

interface SessionTimerProps {
  /** 타이머 지속 시간 (분). 기본 60분 */
  durationMinutes?: number;
}

export function SessionTimer({ durationMinutes = 60 }: SessionTimerProps) {
  const totalSeconds = durationMinutes * 60;
  const [seconds, setSeconds] = useState(totalSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // isRunning 변경 시에만 interval 생성/해제
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]);

  const toggle = useCallback(() => setIsRunning((prev) => !prev), []);
  const reset = useCallback(() => {
    setIsRunning(false);
    setSeconds(totalSeconds);
  }, [totalSeconds]);

  // 포맷: HH:MM:SS 또는 MM:SS
  const formatted = useMemo(() => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const mm = m.toString().padStart(2, "0");
    const ss = s.toString().padStart(2, "0");
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  }, [seconds]);

  // 색상 (남은 시간 기준)
  const colorClass =
    seconds === 0
      ? "text-red-500"
      : seconds <= 120
        ? "text-red-500"
        : seconds <= 300
          ? "text-orange-500"
          : seconds <= 600
            ? "text-yellow-600"
            : "text-primary-600";

  const progress = seconds / totalSeconds;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5">
      {/* 진행률 바 */}
      <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-surface-secondary sm:block">
        <div
          className="h-full rounded-full bg-primary-500 transition-all duration-1000"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* 시간 표시 */}
      <div className={`flex items-center gap-1.5 font-mono text-lg font-semibold ${colorClass}`}>
        <Clock size={16} />
        <span>{formatted}</span>
      </div>

      {/* 컨트롤 */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggle}
          className="rounded-lg p-1.5 text-foreground-secondary hover:bg-surface-secondary hover:text-foreground transition-colors"
          aria-label={isRunning ? "타이머 일시정지" : "타이머 시작"}
          aria-pressed={isRunning}
        >
          {isRunning ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          onClick={reset}
          className="rounded-lg p-1.5 text-foreground-secondary hover:bg-surface-secondary hover:text-foreground transition-colors"
          aria-label="타이머 리셋"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* 종료 표시 */}
      {seconds === 0 && (
        <span className="text-xs font-medium text-red-500 animate-pulse">시간 종료!</span>
      )}
    </div>
  );
}
