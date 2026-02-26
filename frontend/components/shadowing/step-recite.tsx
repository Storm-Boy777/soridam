"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Eye, EyeOff, Timer, AlertCircle } from "lucide-react";
import { ShadowingRecorder } from "./shadowing-recorder";
import { useShadowingStore } from "@/lib/stores/shadowing";

export function StepRecite() {
  const {
    questionText,
    questionKorean,
    sentences,
    reciteTimer,
    recitePeekCount,
    reciteShowPeek,
    setReciteTimer,
    incrementPeekCount,
    togglePeek,
    isRecording,
    setRecording,
    setRecordingDuration,
  } = useShadowingStore();

  // 타이머 (OPIc 기준 2분)
  const timerCountRef = useRef(0);
  const [timerActive, setTimerActive] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);

  // ref 기반 타이머 (stale closure 방지)
  useEffect(() => {
    if (!timerActive) return;
    timerCountRef.current = 0;
    setReciteTimer(0);
    const interval = setInterval(() => {
      timerCountRef.current += 1;
      setReciteTimer(timerCountRef.current);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, setReciteTimer]);

  // peek 토글
  const handlePeek = useCallback(() => {
    if (!reciteShowPeek) incrementPeekCount();
    togglePeek();
  }, [reciteShowPeek, incrementPeekCount, togglePeek]);

  const handleRecordingComplete = useCallback(
    (blob: Blob, duration: number) => {
      setRecordingBlob(blob);
      setRecordingDuration(duration);
      setTimerActive(false);
    },
    [setRecordingDuration]
  );

  function formatTime(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  const isOver2Min = reciteTimer >= 120;

  return (
    <div className="space-y-5">
      {/* 안내 */}
      <div className="text-center">
        <p className="text-sm text-foreground-secondary">
          음성 없이 <span className="font-medium text-primary-600">스스로 읽어</span>보세요.
          OPIc 실전처럼 <span className="font-medium">2분 이내</span>를 목표로!
        </p>
      </div>

      {/* 질문 표시 */}
      <div className="rounded-[var(--radius-xl)] border border-primary-200 bg-primary-50/30 p-4 text-center">
        <p className="text-xs font-medium text-primary-600">질문</p>
        <p className="mt-1 text-sm font-medium text-foreground">
          {questionText || "질문 없음"}
        </p>
        {questionKorean && (
          <p className="mt-1 text-xs text-foreground-muted">{questionKorean}</p>
        )}
      </div>

      {/* 타이머 */}
      <div className="flex items-center justify-center gap-2">
        <Timer
          size={18}
          className={isOver2Min ? "text-red-500" : "text-foreground-secondary"}
        />
        <span
          className={`text-2xl font-bold tabular-nums ${
            isOver2Min ? "text-red-500" : "text-foreground"
          }`}
        >
          {formatTime(reciteTimer)}
        </span>
        {isOver2Min && (
          <span className="flex items-center gap-1 text-xs text-red-500">
            <AlertCircle size={12} />
            2분 초과
          </span>
        )}
      </div>

      {/* Peek 버튼 (힌트) */}
      <div className="flex justify-center">
        <button
          onClick={handlePeek}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
            reciteShowPeek
              ? "border-amber-300 bg-amber-50 text-amber-700"
              : "border-border bg-surface text-foreground-secondary hover:bg-surface-secondary"
          }`}
        >
          {reciteShowPeek ? <EyeOff size={14} /> : <Eye size={14} />}
          {reciteShowPeek ? "힌트 숨기기" : `힌트 보기 (${recitePeekCount}회 사용)`}
        </button>
      </div>

      {/* 힌트 텍스트 (peek) */}
      {reciteShowPeek && (
        <div className="rounded-[var(--radius-xl)] border border-amber-200 bg-amber-50/50 p-4">
          <div className="space-y-2">
            {sentences.map((sent, i) => (
              <p
                key={i}
                className="text-sm leading-relaxed text-foreground-secondary"
              >
                {sent.english}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* 녹음 */}
      <ShadowingRecorder
        isRecording={isRecording}
        onRecordingChange={(recording) => {
          setRecording(recording);
          if (recording && !timerActive) {
            setTimerActive(true);
            setReciteTimer(0);
          }
        }}
        onRecordingComplete={handleRecordingComplete}
        showPlayback
      />
    </div>
  );
}
