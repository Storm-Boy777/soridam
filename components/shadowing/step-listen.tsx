"use client";

import { useEffect, useRef, useMemo } from "react";
import { Languages, CaseSensitive, Type, Star } from "lucide-react";
import { ShadowingPlayer, useActiveSentenceIndex } from "./shadowing-player";
import { useShadowingStore, type DisplayMode } from "@/lib/stores/shadowing";

const DISPLAY_MODES: { mode: DisplayMode; icon: React.ElementType; label: string }[] = [
  { mode: "both", icon: Languages, label: "영/한" },
  { mode: "english", icon: CaseSensitive, label: "영어" },
  { mode: "korean", icon: Type, label: "한글" },
];

export function StepListen() {
  const {
    sentences,
    displayMode,
    repeatTargetIndex,
    listenedSentences,
    keySentences,
    currentTime,
    stepCompletions,
    setDisplayMode,
    seekTo,
    setRepeatTarget,
    markSentenceListened,
    markStepComplete,
  } = useShadowingStore();
  const activeIndex = useActiveSentenceIndex();
  const sentenceRefs = useRef<(HTMLDivElement | null)[]>([]);
  const prevActiveRef = useRef(-1);

  // 핵심 문장 영어 텍스트 Set (빠른 검색)
  const keySentenceTexts = useMemo(
    () => new Set(keySentences?.map((ks) => ks.english.toLowerCase().trim()) ?? []),
    [keySentences],
  );

  // 청취 추적: 문장 끝을 지날 때 listened 마킹
  useEffect(() => {
    if (activeIndex >= 0 && activeIndex !== prevActiveRef.current) {
      // 이전 문장을 완전히 지나갔으면 청취 완료
      if (prevActiveRef.current >= 0) {
        markSentenceListened(prevActiveRef.current);
      }
      prevActiveRef.current = activeIndex;
    }
  }, [activeIndex, markSentenceListened]);

  // 마지막 문장이 끝날 때도 체크 (오디오 종료 시)
  useEffect(() => {
    if (sentences.length > 0) {
      const lastSent = sentences[sentences.length - 1];
      if (currentTime >= lastSent.end - 0.1 && prevActiveRef.current === sentences.length - 1) {
        markSentenceListened(sentences.length - 1);
      }
    }
  }, [currentTime, sentences, markSentenceListened]);

  // Step 완료 체크: 80% 이상 청취
  useEffect(() => {
    if (
      !stepCompletions.listen &&
      sentences.length > 0 &&
      listenedSentences.length >= sentences.length * 0.8
    ) {
      markStepComplete("listen");
    }
  }, [listenedSentences.length, sentences.length, stepCompletions.listen, markStepComplete]);

  // 3번째 문장부터 활성 문장이 화면 중앙으로 스크롤
  useEffect(() => {
    if (activeIndex >= 2 && sentenceRefs.current[activeIndex]) {
      sentenceRefs.current[activeIndex]!.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeIndex]);

  return (
    <div className="space-y-3 pb-20 sm:pb-0">

      {/* 오디오 플레이어 — PC: 문장 위 sticky / 모바일: 하단 고정 */}
      <div className="hidden sm:sticky sm:top-0 sm:z-10 sm:block sm:rounded-[var(--radius-xl)] sm:border sm:border-border sm:bg-surface sm:px-4 sm:py-3">
        <ShadowingPlayer showSpeedControl compact />
      </div>

      {/* 스크립트 텍스트 카드 */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface">
        {/* 카드 헤더: 청취 진행률 + 표시 모드 토글 */}
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <span className="text-[11px] font-medium text-foreground-muted">
            {listenedSentences.length}/{sentences.length} 문장 청취
          </span>
          <div className="inline-flex rounded-lg border border-border bg-surface-secondary p-0.5">
            {DISPLAY_MODES.map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setDisplayMode(mode)}
                className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                  displayMode === mode
                    ? "bg-surface text-foreground shadow-sm"
                    : "text-foreground-muted hover:text-foreground-secondary"
                }`}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 문장 목록 */}
        {displayMode === "both" && (
          <div className="hidden border-b border-border px-4 py-2 md:grid md:grid-cols-2 md:gap-4 sm:px-6">
            <span className="pl-7 text-[11px] font-bold uppercase tracking-wider text-primary-500">English Script</span>
            <span className="pl-4 text-[11px] font-bold tracking-wider text-foreground-muted">한국어 스크립트</span>
          </div>
        )}
        <div className="space-y-1 p-4 sm:p-6">
          {sentences.map((sent, i) => {
            const isActive = i === activeIndex;
            const isListened = listenedSentences.includes(i);
            const isKeySentence = keySentenceTexts.has(
              sent.english.toLowerCase().trim()
            );

            return (
              <div
                key={i}
                ref={(el) => { sentenceRefs.current[i] = el; }}
                onClick={() => {
                  seekTo(sent.start);
                  if (repeatTargetIndex != null) setRepeatTarget(i);
                }}
                className={`cursor-pointer rounded-lg p-2.5 transition-colors hover:bg-primary-50/50 ${
                  isActive
                    ? "bg-primary-50 ring-1 ring-primary-200"
                    : ""
                } ${isListened && !isActive ? "border-l-2 border-green-400/60" : ""}`}
              >
                <div className="flex items-start gap-2">
                  {/* 문장 번호 */}
                  <span className="mt-0.5 shrink-0 text-[10px] tabular-nums text-foreground-muted/50">
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <div className={`min-w-0 flex-1 ${displayMode === "both" ? "md:grid md:grid-cols-2 md:gap-4" : ""}`}>
                    {(displayMode === "both" || displayMode === "english") && (
                      <p
                        className={`text-[13px] leading-relaxed sm:text-[15px] ${
                          isActive
                            ? "font-medium text-foreground"
                            : "text-foreground-secondary"
                        }`}
                      >
                        {isKeySentence && (
                          <Star size={11} className="mr-1 inline text-amber-400" fill="currentColor" />
                        )}
                        {sent.english}
                      </p>
                    )}
                    {(displayMode === "both" || displayMode === "korean") && (
                      <p
                        className={`text-xs leading-relaxed sm:text-sm ${
                          displayMode === "both"
                            ? "mt-1 border-l-2 border-primary-100 pl-2 md:mt-0 md:border-l md:border-border md:pl-4 md:border-primary-100/0"
                            : ""
                        } ${
                          isActive
                            ? "text-foreground-secondary"
                            : "text-foreground-muted"
                        }`}
                      >
                        {sent.korean}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 오디오 플레이어 — 모바일: 하단 고정 (UI만, audio 요소는 PC 플레이어에서 관리) */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-surface px-4 py-[18px] sm:hidden">
        <ShadowingPlayer showSpeedControl compact noAudio />
      </div>
    </div>
  );
}
