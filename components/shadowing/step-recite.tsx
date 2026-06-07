"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Timer,
  AlertCircle,
  Eye,
  EyeOff,
  Layers,
  RotateCcw,
} from "lucide-react";
import { ShadowingRecorder } from "./shadowing-recorder";
import { RecordingComparison } from "./recording-comparison";
import { QuestionCard } from "./question-card";
import { useShadowingStore, type ReciteSelfRating } from "@/lib/stores/shadowing";

// 녹음 후 자기평가 선택지 + 체화 체감별 피드백
const SELF_RATINGS: { key: ReciteSelfRating; emoji: string; label: string }[] = [
  { key: "easy", emoji: "🙌", label: "막힘없이" },
  { key: "recalled", emoji: "🙂", label: "떠올리며" },
  { key: "hard", emoji: "😅", label: "아직 어려워요" },
];

const SELF_RATING_FEEDBACK: Record<ReciteSelfRating, string> = {
  easy: "완전히 입에 붙었네요! 모의고사로 실전 감각까지 점검해보세요.",
  recalled: "잘 해냈어요. 한 번 더 반복하면 더 자연스러워져요.",
  hard: "아직 버벅인다면 감각이 덜 익은 거예요. 따라 말하기로 한 번 더 다져볼까요?",
};

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
    audioUrl,
    structureSummary,
    reciteTimer,
    reciteHintLevel,
    reciteRecordingDone,
    reciteSelfRating,
    stepCompletions,
    setReciteTimer,
    setReciteHintLevel,
    setReciteRecordingDone,
    setReciteSelfRating,
    markStepComplete,
    setStep,
    isRecording,
    setRecording,
    setRecordingDuration,
  } = useShadowingStore();

  const timerCountRef = useRef(0);
  const [timerActive, setTimerActive] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
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
      setReciteSelfRating(null); // 새 녹음마다 자기평가 새로 받기

      // Step 완료 체크
      if (!stepCompletions.recite) {
        markStepComplete("recite");
      }
    },
    [setRecordingDuration, setReciteRecordingDone, setReciteSelfRating, stepCompletions.recite, markStepComplete]
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
      {questionText && <QuestionCard english={questionText} korean={questionKorean} audioUrl={questionAudioUrl} />}

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

      {/* 3. 녹음 비교 (녹음 완료 후) — 정답 스크립트 전체 음성과 비교 */}
      {recordingBlob && !isRecording && audioUrl && (
        <RecordingComparison
          originalUrl={audioUrl}
          recordingBlob={recordingBlob}
          originalLabel="정답 스크립트"
          recordingLabel="내 녹음"
        />
      )}

      {/* 4. 자기평가 — 체화 체감을 스스로 인식 + 약하면 복습 유도 */}
      {recordingBlob && !isRecording && (
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 sm:p-5">
          <p className="text-xs font-semibold text-foreground-secondary">이번 답변, 어땠나요?</p>
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            {SELF_RATINGS.map(({ key, emoji, label }) => {
              const selected = reciteSelfRating === key;
              return (
                <button
                  key={key}
                  onClick={() => setReciteSelfRating(key)}
                  className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-[11px] font-medium transition-colors ${
                    selected
                      ? "border-primary-400 bg-primary-50 text-primary-700"
                      : "border-border bg-surface-secondary/40 text-foreground-secondary hover:border-primary-200 hover:bg-primary-50/40"
                  }`}
                >
                  <span className="text-base leading-none">{emoji}</span>
                  {label}
                </button>
              );
            })}
          </div>
          {reciteSelfRating && (
            <div className="mt-3 rounded-lg bg-surface-secondary/60 px-3 py-2.5">
              <p className="text-xs leading-relaxed text-foreground-secondary">
                {SELF_RATING_FEEDBACK[reciteSelfRating]}
              </p>
              {reciteSelfRating === "hard" && (
                <button
                  onClick={() => setStep("shadow")}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-primary-600"
                >
                  <RotateCcw size={12} />
                  따라 말하기로 복습
                </button>
              )}
            </div>
          )}
        </div>
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
