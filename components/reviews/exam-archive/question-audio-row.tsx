"use client";

// 기출 보관함 — 한 질문 한 줄 (Q번호 + 유형 + 한글 요약 + 영어 원문 + 음성 ▶)
// /reviews 디자인 (인디고 블루 + Tailwind) 버전.

import { Play, Pause } from "lucide-react";
import { useQuestionPlayer } from "@/lib/hooks/use-question-player";

interface Props {
  questionNumber: number;
  typeLabel?: string | null;
  korean: string | null;
  english: string;
  audioUrl: string | null;
  onClickGuide?: () => void;
}

export function QuestionAudioRow({
  questionNumber,
  typeLabel,
  korean,
  english,
  audioUrl,
  onClickGuide,
}: Props) {
  const { isPlaying, play, reset, playbackProgress } = useQuestionPlayer();

  const handleAudioToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioUrl) return;
    if (isPlaying) reset();
    else play(audioUrl);
  };

  return (
    <div className="flex flex-col gap-2 py-3">
      {/* 헤더 — Q번호 + 유형 + 한글 요약 + 가이드 */}
      <div className="flex flex-wrap items-start gap-2.5">
        <span className="inline-flex h-6 min-w-[34px] shrink-0 items-center justify-center rounded-md bg-surface-secondary px-2 text-xs font-bold tabular-nums text-foreground-secondary">
          Q{questionNumber}
        </span>
        {typeLabel && (
          <span className="inline-flex items-center rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-bold text-primary-600">
            {typeLabel}
          </span>
        )}
        {korean && (
          <span className="min-w-0 flex-1 text-sm font-semibold leading-relaxed text-foreground">
            {korean}
          </span>
        )}
        {onClickGuide && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClickGuide();
            }}
            className="shrink-0 rounded-full border border-primary-500 px-2.5 py-1 text-[11px] font-bold text-primary-600 hover:bg-primary-50"
          >
            가이드 →
          </button>
        )}
      </div>

      {/* 영어 원문 + 음성 통합 박스 (우상단 ▶) */}
      <div
        role={audioUrl ? "button" : undefined}
        tabIndex={audioUrl ? 0 : undefined}
        onClick={audioUrl ? handleAudioToggle : undefined}
        onKeyDown={
          audioUrl
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleAudioToggle(e as unknown as React.MouseEvent);
                }
              }
            : undefined
        }
        aria-label={audioUrl ? (isPlaying ? "재생 일시정지" : "영어로 듣기") : undefined}
        className={`relative overflow-hidden rounded-lg text-sm italic leading-relaxed text-foreground transition-colors ${
          audioUrl ? "cursor-pointer" : "cursor-default"
        } ${isPlaying ? "bg-primary-50" : "bg-surface-secondary"} ${
          audioUrl ? "py-3 pl-3.5 pr-12" : "px-3 py-2.5"
        }`}
      >
        “{english}”

        {audioUrl && (
          <button
            type="button"
            onClick={handleAudioToggle}
            aria-label={isPlaying ? "일시정지" : "영어로 듣기"}
            title={isPlaying ? "일시정지" : "영어로 듣기"}
            className={`absolute right-2 top-2 inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border border-primary-500 transition-colors ${
              isPlaying
                ? "bg-primary-500 text-white shadow-[0_0_0_4px_rgba(58,91,199,0.15)]"
                : "bg-white text-primary-600 hover:bg-primary-50"
            }`}
          >
            {isPlaying ? (
              <Pause size={12} strokeWidth={2.2} fill="currentColor" />
            ) : (
              <Play size={12} strokeWidth={2.2} fill="currentColor" />
            )}
          </button>
        )}

        {audioUrl && isPlaying && (
          <div
            aria-hidden="true"
            className="absolute bottom-0 left-0 right-0 h-[3px] bg-border"
          >
            <div
              className="h-full bg-primary-500 transition-[width] duration-100 ease-linear"
              style={{ width: `${playbackProgress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
