"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Languages,
  CaseSensitive,
  Type,
  RefreshCw,
} from "lucide-react";
import { ShadowingPlayer } from "./shadowing-player";
import { useShadowingStore, type TextHintLevel } from "@/lib/stores/shadowing";

const LANG_OPTIONS: { mode: TextHintLevel; label: string; icon: React.ElementType }[] = [
  { mode: "both", icon: Languages, label: "영/한" },
  { mode: "english", icon: CaseSensitive, label: "영어" },
  { mode: "korean", icon: Type, label: "한글" },
];

export function StepShadow() {
  const {
    sentences,
    shadowIndex,
    shadowHintLevel,
    currentTime,
    setShadowIndex,
    setShadowHintLevel,
  } = useShadowingStore();

  // 문장별 반복 재생 횟수 (로컬 상태 — 완료 개념 없음)
  const [playCounts, setPlayCounts] = useState<Record<number, number>>({});

  // 모바일 여부 — audio 요소 중복 방지
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const currentSentence = shadowIndex >= 0 && shadowIndex < sentences.length
    ? sentences[shadowIndex]
    : null;

  const playCount = playCounts[shadowIndex] ?? 0;

  const handleSentenceEnd = useCallback(() => {
    setPlayCounts((prev) => ({
      ...prev,
      [shadowIndex]: (prev[shadowIndex] ?? 0) + 1,
    }));
  }, [shadowIndex]);

  const goPrev = useCallback(() => {
    if (shadowIndex > 0) setShadowIndex(shadowIndex - 1);
  }, [shadowIndex, setShadowIndex]);

  const goNext = useCallback(() => {
    if (shadowIndex < sentences.length - 1) setShadowIndex(shadowIndex + 1);
  }, [shadowIndex, sentences.length, setShadowIndex]);

  if (!currentSentence) return null;

  // 가라오케: 현재 문장 재생 진행도를 단어 수로 선형 분할
  const words = currentSentence.english.split(" ");
  const isActiveSentence =
    currentTime >= currentSentence.start && currentTime <= currentSentence.end;
  const senProgress = isActiveSentence && currentSentence.duration > 0
    ? Math.max(0, Math.min(1, (currentTime - currentSentence.start) / currentSentence.duration))
    : 0;
  const highlightedCount = isActiveSentence
    ? Math.ceil(senProgress * words.length)
    : 0;

  return (
    <div className="space-y-3 pb-[220px] sm:pb-0">
      {/* 문장 카드 */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface">
        {/* 카드 헤더: 문장 번호 + 반복 횟수 + 언어 토글 */}
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-foreground-muted">
              {shadowIndex + 1} / {sentences.length}
            </span>
            {playCount > 0 && (
              <span className="flex items-center gap-0.5 text-[11px] text-foreground-muted/70">
                <RefreshCw size={10} />
                {playCount}회
              </span>
            )}
          </div>
          <div className="inline-flex rounded-lg border border-border bg-surface-secondary p-0.5">
            {LANG_OPTIONS.map(({ mode, label, icon: Icon }) => (
              <button
                key={mode}
                onClick={() => setShadowHintLevel(mode)}
                className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                  shadowHintLevel === mode
                    ? "bg-surface text-foreground shadow-sm"
                    : "text-foreground-muted hover:text-foreground-secondary"
                }`}
              >
                <Icon size={12} aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 현재 문장 — 가라오케 */}
        <div className="p-5 text-center">
          {(shadowHintLevel === "both" || shadowHintLevel === "english") && (
            <p className="text-lg font-medium leading-relaxed sm:text-xl">
              {words.map((word, i) => (
                <span
                  key={i}
                  className={`transition-colors duration-150 ${
                    i < highlightedCount ? "text-primary-500" : "text-foreground"
                  }`}
                >
                  {word}
                  {i < words.length - 1 ? " " : ""}
                </span>
              ))}
            </p>
          )}
          {(shadowHintLevel === "both" || shadowHintLevel === "korean") && (
            <p
              className={`text-xs leading-relaxed text-foreground-muted ${
                shadowHintLevel === "both"
                  ? "mt-2"
                  : "text-lg font-medium text-foreground sm:text-xl"
              }`}
            >
              {currentSentence.korean}
            </p>
          )}
        </div>

        {/* 오디오 플레이어 — 데스크탑 전용 (영역 구분선 포함) */}
        {!isMobile && (
          <div className="border-t border-border px-4 py-3 sm:px-5">
            <ShadowingPlayer
              sentenceMode
              sentenceIndex={shadowIndex}
              onSentenceEnd={handleSentenceEnd}
            />
          </div>
        )}

        {/* 문장 탐색 — 데스크탑 전용 */}
        <div className="hidden items-center justify-center gap-4 border-t border-border px-4 py-2 sm:flex">
          <button
            onClick={goPrev}
            disabled={shadowIndex === 0}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary disabled:opacity-30"
          >
            <ChevronLeft size={16} />
            이전
          </button>
          <button
            onClick={goNext}
            disabled={shadowIndex >= sentences.length - 1}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary disabled:opacity-30"
          >
            다음
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* 모바일 고정 재생 바 (이전/다음 바 위) */}
      {isMobile && (
        <div className="fixed bottom-[68px] left-0 right-0 z-20 border-t border-border bg-surface px-4 py-3">
          <ShadowingPlayer
            sentenceMode
            sentenceIndex={shadowIndex}
            onSentenceEnd={handleSentenceEnd}
          />
        </div>
      )}

      {/* 모바일 고정 하단 바: 이전/다음 (1행) */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-surface px-5 py-3 sm:hidden">
        <div className="flex items-center justify-between">
          <button
            onClick={goPrev}
            disabled={shadowIndex === 0}
            className="inline-flex h-11 items-center gap-1 rounded-lg px-4 text-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary disabled:opacity-30"
          >
            <ChevronLeft size={16} />
            이전
          </button>
          <span className="text-xs text-foreground-muted">
            {shadowIndex + 1} / {sentences.length}
          </span>
          <button
            onClick={goNext}
            disabled={shadowIndex >= sentences.length - 1}
            className="inline-flex h-11 items-center gap-1 rounded-lg px-4 text-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary disabled:opacity-30"
          >
            다음
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
