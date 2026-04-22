"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";

interface ActivityTimerProps {
  /** 프리셋 초 옵션 */
  presets?: number[];
  /** 완료 콜백 */
  onComplete?: () => void;
}

const DEFAULT_PRESETS = [30, 60, 120]; // 30초, 1분, 2분

export function ActivityTimer({ presets = DEFAULT_PRESETS, onComplete }: ActivityTimerProps) {
  const [duration, setDuration] = useState(presets[1] ?? 60);
  const [seconds, setSeconds] = useState(duration);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);

  // ref로 콜백 추적 (deps 불안정 방지)
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // isRunning 변경 시에만 interval 생성/해제
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            onCompleteRef.current?.();
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
    setSeconds(duration);
  }, [duration]);

  const selectPreset = useCallback((s: number) => {
    setDuration(s);
    setSeconds(s);
    setIsRunning(false);
  }, []);

  // 포맷
  const formatted = useMemo(() => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, [seconds]);

  // 프리셋 라벨
  const presetLabel = (s: number) => (s >= 60 ? `${s / 60}분` : `${s}초`);

  const progress = duration > 0 ? seconds / duration : 0;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* 프리셋 버튼 */}
      <div className="flex gap-1.5">
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => selectPreset(p)}
            disabled={isRunning}
            aria-label={`타이머 ${presetLabel(p)}로 설정`}
            aria-pressed={duration === p}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              isRunning ? "opacity-50 cursor-not-allowed" : ""
            } ${
              duration === p
                ? "bg-primary-500 text-white"
                : "bg-surface-secondary text-foreground-secondary hover:bg-primary-50 hover:text-primary-600"
            }`}
          >
            {presetLabel(p)}
          </button>
        ))}
      </div>

      {/* 원형 타이머 */}
      <div className="relative flex items-center justify-center">
        <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-surface-secondary" />
          <circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 42}`}
            strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress)}`}
            className={`transition-all duration-1000 ${seconds === 0 ? "text-red-500" : "text-primary-500"}`}
          />
        </svg>
        <span className={`absolute font-mono text-xl font-bold ${seconds === 0 ? "text-red-500 animate-pulse" : "text-foreground"}`}>
          {formatted}
        </span>
      </div>

      {/* 컨트롤 */}
      <div className="flex gap-2">
        <button
          onClick={toggle}
          className="flex items-center gap-1.5 rounded-full bg-primary-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-600 transition-colors"
          aria-label={isRunning ? "타이머 일시정지" : "타이머 시작"}
        >
          {isRunning ? <Pause size={14} /> : <Play size={14} />}
          {isRunning ? "일시정지" : "시작"}
        </button>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground-secondary hover:bg-surface-secondary transition-colors"
          aria-label="타이머 리셋"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
}
