"use client";

import type { ListenTrack } from "@/lib/actions/scripts";
import type { CurrentSubtitle } from "./listen-content";
import { useListenSettings } from "@/lib/stores/listen";
import { QUESTION_TYPE_LABELS, QUESTION_TYPE_COLORS } from "@/lib/types/reviews";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Captions,
} from "lucide-react";

const SPEEDS = [0.8, 1.0, 1.25];

function fmt(sec: number): string {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ListenPlayer({
  track,
  segKind,
  gapLeft,
  isPlaying,
  time,
  duration,
  subtitle,
  onToggle,
  onNext,
  onPrev,
  onSeek,
}: {
  track: ListenTrack | null;
  segKind: "question" | "answer" | null;
  gapLeft: number;
  isPlaying: boolean;
  time: number;
  duration: number;
  subtitle: CurrentSubtitle;
  onToggle: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (t: number) => void;
}) {
  const s = useListenSettings();
  const { update } = s;

  const typeLabel = track?.questionType && QUESTION_TYPE_LABELS[track.questionType];
  const inGap = gapLeft > 0;

  const segText = inGap ? "생각 중" : segKind === "question" ? "질문" : segKind === "answer" ? "답변" : "—";

  const cycleSpeed = () => {
    const i = SPEEDS.indexOf(s.speed);
    update({ speed: SPEEDS[(i + 1) % SPEEDS.length] ?? 1.0 });
  };
  const cycleRepeat = () => {
    const order = ["off", "all", "one"] as const;
    const i = order.indexOf(s.repeat);
    update({ repeat: order[(i + 1) % order.length] });
  };

  const subLine = inGap
    ? "🤔 떠올려 보세요"
    : s.subtitleLang === "ko"
      ? subtitle.ko
      : subtitle.en;

  const progress = duration > 0 ? (time / duration) * 100 : 0;

  return (
    <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 shadow-sm sm:p-5">
      {/* now playing */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-foreground">
              {track?.topic || "재생할 곡을 선택하세요"}
            </span>
            {typeLabel && (
              <span
                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                  QUESTION_TYPE_COLORS[track!.questionType!] || "bg-surface-secondary text-foreground-secondary"
                }`}
              >
                {typeLabel}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[11px] text-foreground-muted">
            {track?.questionShort || track?.questionEnglish || ""}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
            inGap ? "bg-amber-50 text-amber-600" : "bg-surface-secondary text-foreground-secondary"
          }`}
        >
          {segText}
        </span>
      </div>

      {/* 진행 바 */}
      <div className="mt-3 flex items-center gap-2">
        <span className="w-9 shrink-0 text-right text-[10px] tabular-nums text-foreground-muted">{fmt(time)}</span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(time, duration || 0)}
          onChange={(e) => onSeek(Number(e.target.value))}
          disabled={inGap || !duration}
          className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-surface-secondary accent-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="재생 위치"
          style={{
            background: duration
              ? `linear-gradient(to right, var(--color-primary-500) ${progress}%, var(--color-border) ${progress}%)`
              : undefined,
          }}
        />
        <span className="w-9 shrink-0 text-[10px] tabular-nums text-foreground-muted">{fmt(duration)}</span>
      </div>

      {/* 컨트롤 */}
      <div className="mt-3 flex items-center justify-between">
        {/* 셔플 */}
        <button
          onClick={() => update({ shuffle: !s.shuffle })}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
            s.shuffle ? "text-primary-600" : "text-foreground-muted hover:text-foreground-secondary"
          }`}
          aria-label="셔플"
          aria-pressed={s.shuffle}
        >
          <Shuffle size={16} />
        </button>

        {/* 이전 / 재생 / 다음 */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground-secondary transition-colors hover:bg-surface-secondary"
            aria-label="이전"
          >
            <SkipBack size={18} />
          </button>
          <button
            onClick={onToggle}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-500 text-white shadow-md transition-colors hover:bg-primary-600 active:scale-95"
            aria-label={isPlaying ? "일시정지" : "재생"}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
          </button>
          <button
            onClick={onNext}
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground-secondary transition-colors hover:bg-surface-secondary"
            aria-label="다음"
          >
            <SkipForward size={18} />
          </button>
        </div>

        {/* 반복 */}
        <button
          onClick={cycleRepeat}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
            s.repeat !== "off" ? "text-primary-600" : "text-foreground-muted hover:text-foreground-secondary"
          }`}
          aria-label="반복"
          title={s.repeat === "off" ? "반복 끄기" : s.repeat === "all" ? "전체 반복" : "한 곡 반복"}
        >
          {s.repeat === "one" ? <Repeat1 size={16} /> : <Repeat size={16} />}
        </button>
      </div>

      {/* 보조 옵션: 속도 / 자막 */}
      <div className="mt-3 flex items-center justify-center gap-2 border-t border-border/60 pt-3">
        <button
          onClick={cycleSpeed}
          className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary"
        >
          {s.speed.toFixed(2).replace(/0$/, "")}x
        </button>

        <button
          onClick={() => update({ subtitleOn: !s.subtitleOn })}
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
            s.subtitleOn
              ? "border-primary-300 bg-primary-50 text-primary-700"
              : "border-border text-foreground-secondary hover:bg-surface-secondary"
          }`}
          aria-pressed={s.subtitleOn}
        >
          <Captions size={13} /> 자막
        </button>

        {s.subtitleOn && (
          <div className="inline-flex overflow-hidden rounded-full border border-border">
            {(["en", "ko"] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => update({ subtitleLang: lang })}
                className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  s.subtitleLang === lang ? "bg-primary-500 text-white" : "text-foreground-muted hover:bg-surface-secondary"
                }`}
              >
                {lang === "en" ? "EN" : "KR"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 자막(가사) — 컨트롤·옵션 아래. 고정 높이 + 2줄 클램프로 문장 길이가 달라도 높이 불변 */}
      {s.subtitleOn && (
        <div className="mt-3 flex h-14 items-center justify-center overflow-hidden rounded-lg bg-surface-secondary/50 px-3 text-center">
          <p className={`line-clamp-2 text-sm leading-snug ${inGap ? "text-amber-600" : "text-foreground"}`}>
            {subLine || "—"}
            {inGap && <span className="ml-1 tabular-nums text-amber-500">{gapLeft}</span>}
          </p>
        </div>
      )}
    </div>
  );
}
