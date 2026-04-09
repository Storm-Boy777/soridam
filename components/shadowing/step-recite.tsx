"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Timer,
  AlertCircle,
  MessageCircle,
  ChevronDown,
  Volume2,
  Eye,
  EyeOff,
  Layers,
} from "lucide-react";
import { ShadowingRecorder } from "./shadowing-recorder";
import { RecordingComparison } from "./recording-comparison";
import { useShadowingStore } from "@/lib/stores/shadowing";

const HINT_LABELS: Record<0 | 1 | 2, string> = {
  0: "숨김",
  1: "구조만",
  2: "힌트 포함",
};

const HINT_ICONS: Record<0 | 1 | 2, React.ElementType> = {
  0: EyeOff,
  1: Layers,
  2: Eye,
};

export function StepRecite() {
  const {
    questionText,
    questionKorean,
    questionAudioUrl,
    structureSummary,
    reciteTimer,
    reciteHintLevel,
    reciteRecordingDone,
    stepCompletions,
    setReciteTimer,
    setReciteHintLevel,
    setReciteRecordingDone,
    markStepComplete,
    isRecording,
    setRecording,
    setRecordingDuration,
  } = useShadowingStore();

  const timerCountRef = useRef(0);
  const [timerActive, setTimerActive] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [isPlayingQuestion, setIsPlayingQuestion] = useState(false);
  const questionAudioRef = useRef<HTMLAudioElement | null>(null);

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
      setReciteRecordingDone(true);

      // Step 완료 체크
      if (!stepCompletions.recite) {
        markStepComplete("recite");
      }
    },
    [setRecordingDuration, setReciteRecordingDone, stepCompletions.recite, markStepComplete]
  );

  const cycleHintLevel = useCallback(() => {
    const next = ((reciteHintLevel + 1) % 3) as 0 | 1 | 2;
    setReciteHintLevel(next);
  }, [reciteHintLevel, setReciteHintLevel]);

  function formatTime(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  const isOver2Min = reciteTimer >= 120;
  const HintIcon = HINT_ICONS[reciteHintLevel];

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

      {/* 2. 답변 구조 — 타임라인 */}
      {structureSummary && structureSummary.length > 0 && (
        <div className="overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface">
          <button
            onClick={cycleHintLevel}
            className="flex w-full items-center justify-between px-4 py-2.5 hover:bg-surface-secondary transition-colors"
          >
            <span className="text-xs font-semibold text-foreground-secondary">답변 흐름</span>
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-foreground-muted">
              <HintIcon size={12} />
              {HINT_LABELS[reciteHintLevel]}
            </span>
          </button>
          {reciteHintLevel > 0 && (
            <div className="border-t border-border px-5 py-4">
              <div className="relative">
                <div className="space-y-3">
                  {structureSummary.map((item, i) => (
                    <div key={i} className="relative flex items-start gap-3">
                      {/* 노드→다음 노드 연결선 (마지막 제외) */}
                      {i < structureSummary.length - 1 && (
                        <div className="absolute left-[5px] top-[18px] w-px bg-border" style={{ height: "calc(100% + 6px)" }} />
                      )}
                      {/* 타임라인 노드 — 뱃지 중앙과 수직 정렬 */}
                      <div className="relative z-10 mt-[7px] flex h-[11px] w-[11px] shrink-0 rounded-full border-2 border-primary-400 bg-surface" />

                      <div className="min-w-0 flex-1">
                        <span className="inline-block rounded-md bg-surface-secondary px-2 py-0.5 text-[11px] font-semibold text-foreground-secondary">
                          {item.tag}
                        </span>
                        {reciteHintLevel === 2 && (
                          <p className="mt-1 text-xs leading-relaxed text-foreground-muted">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. 녹음 비교 (녹음 완료 후) */}
      {recordingBlob && !isRecording && questionAudioUrl && (
        <RecordingComparison
          originalUrl={questionAudioUrl}
          recordingBlob={recordingBlob}
          originalLabel="질문 원본"
          recordingLabel="내 녹음"
        />
      )}

      {/* 5. 타이머 + 녹음 — 모바일: 하단 고정 / 데스크탑: 인라인 */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-surface px-5 py-3 sm:static sm:rounded-[var(--radius-xl)] sm:border sm:border-border sm:py-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
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
