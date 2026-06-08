"use client";

import type { ListenTrack } from "@/lib/actions/scripts";
import type { CurrentSubtitle } from "./listen-content";
import { useListenSettings } from "@/lib/stores/listen";
import { QUESTION_TYPE_LABELS, QUESTION_TYPE_COLORS } from "@/lib/types/reviews";
import { TrackArtwork, gradientFor } from "./track-artwork";
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
    <div className="relative overflow-hidden rounded-[var(--radius-2xl)] border border-border bg-surface p-5 shadow-[var(--shadow-card)] transition-shadow sm:p-6">
      {/* 앰비언트 헤일로 — 현재 곡 커버색이 카드 상단에 6%만 번짐(곡 전환 시 부드럽게 전환) */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 h-2/5 ${gradientFor(track?.questionType ?? null)} opacity-[0.06] blur-2xl transition-colors duration-500`}
      />

      <div className="relative z-10">
        {/* 아트워크 */}
        <div className="mb-5 mt-1">
          <TrackArtwork
            track={track}
            isPlaying={isPlaying}
            inGap={inGap}
            gapLeft={gapLeft}
            size="hero"
          />
        </div>

        {/* 제목 + 부제 (가운데) */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <h2 className="max-w-full truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {track?.topic || "재생할 곡을 선택하세요"}
            </h2>
            {typeLabel && (
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  QUESTION_TYPE_COLORS[track!.questionType!] || "bg-surface-secondary text-foreground-secondary"
                }`}
              >
                {typeLabel}
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-sm text-foreground-secondary">
            {track?.questionShort || track?.questionEnglish || " "}
          </p>
        </div>

        {/* 상태 라벨 + 진행 바 */}
        <p className="mt-4 text-center text-[11px] font-medium text-foreground-muted">
          {inGap ? <span className="text-amber-600">생각 중</span> : segText}
        </p>
        <div className="mt-1.5 flex h-6 items-center gap-2">
          <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-foreground-muted">{fmt(time)}</span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(time, duration || 0)}
            onChange={(e) => onSeek(Number(e.target.value))}
            disabled={inGap || !duration}
            aria-label="재생 위치"
            style={{
              background: duration
                ? `linear-gradient(to right, var(--color-primary-500) ${progress}%, var(--color-border) ${progress}%)`
                : undefined,
            }}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-surface-secondary accent-primary-500 transition-[height] duration-150 hover:h-2.5 focus:h-2.5 disabled:cursor-not-allowed disabled:opacity-60 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-500"
          />
          <span className="w-10 shrink-0 text-[11px] tabular-nums text-foreground-muted">{fmt(duration)}</span>
        </div>

        {/* 메인 컨트롤 — 큰 원형 재생 버튼이 핵심 */}
        <div className="mt-5 grid grid-cols-5 items-center justify-items-center">
          <button
            onClick={() => update({ shuffle: !s.shuffle })}
            aria-pressed={s.shuffle}
            aria-label="셔플"
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
              s.shuffle ? "text-primary-600" : "text-foreground-muted hover:text-foreground-secondary"
            }`}
          >
            <Shuffle size={18} />
          </button>
          <button
            onClick={onPrev}
            aria-label="이전"
            className="flex h-11 w-11 items-center justify-center rounded-full text-foreground-secondary transition-colors hover:bg-surface-secondary"
          >
            <SkipBack size={22} />
          </button>
          <button
            onClick={onToggle}
            aria-label={isPlaying ? "일시정지" : "재생"}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-500 text-white shadow-[var(--shadow-primary)] transition-all hover:bg-primary-600 active:scale-95"
          >
            {isPlaying ? <Pause size={26} /> : <Play size={26} className="ml-0.5" />}
          </button>
          <button
            onClick={onNext}
            aria-label="다음"
            className="flex h-11 w-11 items-center justify-center rounded-full text-foreground-secondary transition-colors hover:bg-surface-secondary"
          >
            <SkipForward size={22} />
          </button>
          <button
            onClick={cycleRepeat}
            aria-label="반복"
            title={s.repeat === "off" ? "반복 끄기" : s.repeat === "all" ? "전체 반복" : "한 곡 반복"}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
              s.repeat !== "off" ? "text-primary-600" : "text-foreground-muted hover:text-foreground-secondary"
            }`}
          >
            {s.repeat === "one" ? <Repeat1 size={18} /> : <Repeat size={18} />}
          </button>
        </div>

        {/* 보조 옵션: 속도 / 자막 / EN·KR — 고정 높이 슬롯(토글해도 안 움직임) */}
        <div className="mt-5 flex h-9 items-center justify-center gap-2 border-t border-border/60 pt-4">
          <button
            onClick={cycleSpeed}
            className="w-12 rounded-full border border-border px-2.5 py-1 text-center text-[11px] font-medium tabular-nums text-foreground-secondary transition-colors hover:bg-surface-secondary"
          >
            {s.speed.toFixed(2).replace(/0$/, "")}x
          </button>

          <button
            onClick={() => update({ subtitleOn: !s.subtitleOn })}
            aria-pressed={s.subtitleOn}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
              s.subtitleOn
                ? "border-primary-300 bg-primary-50 text-primary-700"
                : "border-border text-foreground-secondary hover:bg-surface-secondary"
            }`}
          >
            <Captions size={13} /> 자막
          </button>

          {/* EN/KR — 항상 DOM에 두고 opacity로 토글 → 폭 reflow 없음(layout shift 0) */}
          <div
            className={`inline-flex overflow-hidden rounded-full border border-border transition-opacity ${
              s.subtitleOn ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            aria-hidden={!s.subtitleOn}
          >
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
        </div>

        {/* 자막(가사) — 항상 고정 높이 슬롯으로 렌더(켜고 꺼도 아래가 안 밀림) */}
        <div className="mt-4 flex h-14 items-center justify-center overflow-hidden rounded-[var(--radius-lg)] bg-surface-secondary/50 px-3 text-center">
          {s.subtitleOn ? (
            <p className={`line-clamp-2 text-sm leading-snug ${inGap ? "text-amber-600" : "text-foreground"}`}>
              {subLine || "—"}
              {inGap && <span className="ml-1 tabular-nums text-amber-500">{gapLeft}</span>}
            </p>
          ) : (
            <p className="text-[11px] text-foreground-muted">자막이 꺼져 있어요</p>
          )}
        </div>
      </div>
    </div>
  );
}
