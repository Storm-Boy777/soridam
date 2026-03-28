"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Timer,
  AlertCircle,
  MessageCircle,
  ChevronDown,
  Volume2,
} from "lucide-react";
import { ShadowingRecorder } from "./shadowing-recorder";
import { useShadowingStore } from "@/lib/stores/shadowing";

export function StepRecite() {
  const {
    questionText,
    questionKorean,
    questionAudioUrl,
    structureSummary,
    reciteTimer,
    setReciteTimer,
    isRecording,
    setRecording,
    setRecordingDuration,
  } = useShadowingStore();

  const timerCountRef = useRef(0);
  const [timerActive, setTimerActive] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [isPlayingQuestion, setIsPlayingQuestion] = useState(false);
  const questionAudioRef = useRef<HTMLAudioElement | null>(null);

  // 답변 구조 카드 (기본: 오픈)
  const [isStructureOpen, setIsStructureOpen] = useState(true);

  const toggleQuestionAudio = useCallback(() => {
    if (!questionAudioUrl) return;
    if (!questionAudioRef.current) {
      questionAudioRef.current = new Audio(questionAudioUrl);
      questionAudioRef.current.onended = () => setIsPlayingQuestion(false);
    }
    if (isPlayingQuestion) {
      questionAudioRef.current.pause();
      questionAudioRef.current.currentTime = 0;
      setIsPlayingQuestion(false);
    } else {
      questionAudioRef.current.currentTime = 0;
      questionAudioRef.current.play().catch(() => {});
      setIsPlayingQuestion(true);
    }
  }, [questionAudioUrl, isPlayingQuestion]);

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
    <div className="space-y-4 pb-20 sm:pb-0">

      {/* 1. 질문 카드 */}
      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-primary-200">
        <div className="flex items-center justify-between border-b border-primary-100 bg-primary-50 px-4 py-2">
          <div className="flex items-center gap-1.5">
            <MessageCircle size={13} className="text-primary-500" />
            <span className="text-xs font-semibold text-primary-600">질문</span>
          </div>
          {questionAudioUrl && (
            <button
              onClick={toggleQuestionAudio}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                isPlayingQuestion
                  ? "bg-primary-500 text-white"
                  : "text-primary-500 hover:bg-primary-100"
              }`}
            >
              <Volume2 size={12} />
              {isPlayingQuestion ? "정지" : "듣기"}
            </button>
          )}
        </div>
        <div className="bg-primary-50/30 px-5 py-4 text-left">
          <p className="text-[13px] font-medium leading-relaxed text-foreground sm:text-[15px]">
            {questionText || "질문 없음"}
          </p>
          {questionKorean && (
            <p className="mt-3 border-t border-primary-100 pt-3 text-xs leading-relaxed text-foreground-muted">
              {questionKorean}
            </p>
          )}
        </div>
      </div>

      {/* 2. 답변 구조 — 기본 오픈, 접기 가능 */}
      {structureSummary && structureSummary.length > 0 && (
        <div className="overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface">
          <button
            onClick={() => setIsStructureOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-2.5 hover:bg-surface-secondary transition-colors"
          >
            <span className="text-xs font-semibold text-foreground-secondary">답변 구조</span>
            <ChevronDown
              size={14}
              className={`text-foreground-muted transition-transform duration-200 ${isStructureOpen ? "rotate-180" : ""}`}
            />
          </button>
          {isStructureOpen && (
            <div className="divide-y divide-border/60 border-t border-border">
              {structureSummary.map((item, i) => (
                <div key={i} className="flex flex-col gap-1 px-4 py-3 sm:grid sm:grid-cols-[7rem_1fr] sm:items-start sm:gap-x-3">
                  <span className="shrink-0 self-start rounded-md bg-surface-secondary px-2 py-0.5 text-[11px] font-semibold text-foreground-secondary text-center sm:w-full">
                    {item.tag}
                  </span>
                  <p className="text-xs leading-relaxed text-foreground-secondary sm:text-[13px]">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. 타이머 + 녹음 — 모바일: 하단 고정 / 데스크탑: 답변 구조 다음 인라인 */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-surface px-5 py-3 sm:static sm:rounded-[var(--radius-xl)] sm:border sm:border-border sm:py-5">
        <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-center sm:gap-0">
          <div className="flex items-center gap-1.5 sm:mb-4 sm:gap-2">
            <Timer
              size={14}
              className={isOver2Min ? "text-red-500" : "text-foreground-muted"}
              aria-hidden
            />
            <span
              className={`text-2xl font-bold tabular-nums sm:text-3xl ${
                isOver2Min ? "text-red-500" : "text-foreground"
              }`}
            >
              {formatTime(reciteTimer)}
            </span>
            {isOver2Min ? (
              <span className="flex items-center gap-0.5 text-xs text-red-500">
                <AlertCircle size={10} />
                초과
              </span>
            ) : (
              <span className="text-xs text-foreground-muted">/ 2분</span>
            )}
          </div>
          <ShadowingRecorder
            compact
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
      </div>

    </div>
  );
}
