"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { Languages, CaseSensitive, Type, Star, ChevronDown, Repeat1 } from "lucide-react";
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
    questionText,
    questionKorean,
    audioUrl,
    setDisplayMode,
    seekTo,
    setRepeatTarget,
    markSentenceListened,
    markStepComplete,
  } = useShadowingStore();
  const activeIndex = useActiveSentenceIndex();
  const sentenceRefs = useRef<(HTMLDivElement | null)[]>([]);
  const prevActiveRef = useRef(-1);
  // 오디오 요소 단일 ref — PC/모바일 플레이어 모두 이 ref를 공유
  const sharedAudioRef = useRef<HTMLAudioElement>(null);

  // 핵심 문장 영어 텍스트 Set (빠른 검색)
  const keySentenceTexts = useMemo(
    () => new Set(keySentences?.map((ks) => ks.english.toLowerCase().trim()) ?? []),
    [keySentences],
  );

  // 청취 추적: 문장 끝을 지날 때 listened 마킹
  useEffect(() => {
    if (activeIndex >= 0 && activeIndex !== prevActiveRef.current) {
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

  // 청취 진행률
  const listenProgress = sentences.length > 0
    ? Math.round((listenedSentences.length / sentences.length) * 100)
    : 0;

  return (
    <div className="space-y-4 pb-20 sm:pb-0">
      {/* 오디오 요소 1개만 렌더링 — PC/모바일 플레이어가 공유 */}
      {audioUrl && <audio ref={sharedAudioRef} src={audioUrl} preload="auto" />}

      {/* 질문 표시 */}
      {questionText && <QuestionCard english={questionText} korean={questionKorean} />}

      {/* 오디오 플레이어 — PC: 문장 위 sticky */}
      <div className="hidden sm:sticky sm:top-0 sm:z-10 sm:block sm:rounded-[var(--radius-xl)] sm:border sm:border-border sm:bg-surface/95 sm:px-4 sm:py-3 sm:shadow-sm sm:backdrop-blur-sm">
        <ShadowingPlayer showSpeedControl compact noAudio externalAudioRef={sharedAudioRef} />
      </div>

      {/* 스크립트 텍스트 카드 */}
      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface">
        {/* 카드 헤더: 청취 진행률 바 + 표시 모드 토글 */}
        <div className="border-b border-border px-4 py-2.5 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-semibold text-foreground-secondary">
                {listenedSentences.length}/{sentences.length}
              </span>
              {/* 미니 진행률 바 */}
              <div className="hidden h-1 w-20 overflow-hidden rounded-full bg-surface-secondary sm:block">
                <div
                  className="h-full rounded-full bg-primary-500 transition-all duration-300"
                  style={{ width: `${listenProgress}%` }}
                />
              </div>
              <span className="text-[10px] text-foreground-muted">문장 청취</span>
            </div>
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
        </div>

        {/* 문장 목록 */}
        <div className="divide-y divide-border/50 px-3 sm:px-5">
          {sentences.map((sent, i) => {
            const isActive = i === activeIndex;
            const isListened = listenedSentences.includes(i);
            const isRepeating = repeatTargetIndex === i;
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
                className={`cursor-pointer rounded-lg px-2 py-3 transition-all sm:px-3 sm:py-3.5 ${
                  isRepeating
                    ? "bg-primary-50 ring-1 ring-primary-300/60"
                    : isActive
                      ? "bg-primary-50"
                      : "hover:bg-surface-secondary/60"
                } ${!isListened && !isActive && !isRepeating ? "opacity-50" : ""}`}
              >
                <div className="flex items-start gap-2">
                  {/* 문장 번호 또는 반복 아이콘 — 텍스트 첫 줄과 동일 라인 */}
                  {isRepeating ? (
                    <span className="mt-[3px] shrink-0 text-primary-500 sm:mt-1">
                      <Repeat1 size={12} />
                    </span>
                  ) : (
                    <span className="mt-[3px] shrink-0 text-[10px] font-medium tabular-nums text-foreground-muted sm:mt-1">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  )}

                  <div className={`min-w-0 flex-1 ${displayMode === "both" ? "md:grid md:grid-cols-[3fr_2fr] md:gap-4" : ""}`}>
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
                        {isActive ? (
                          <KaraokeText
                            text={sent.english}
                            start={sent.start}
                            end={sent.end}
                            currentTime={currentTime}
                          />
                        ) : (
                          sent.english
                        )}
                      </p>
                    )}
                    {(displayMode === "both" || displayMode === "korean") && (
                      <p
                        className={`text-[11px] leading-relaxed sm:text-xs ${
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

      {/* 오디오 플레이어 — 모바일: 하단 고정 */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-surface px-4 py-[18px] sm:hidden">
        <ShadowingPlayer showSpeedControl compact noAudio externalAudioRef={sharedAudioRef} />
      </div>
    </div>
  );
}

// ── 질문 카드: 한국어 토글 ──

function QuestionCard({ english, korean }: { english: string; korean: string | null }) {
  const [showKorean, setShowKorean] = useState(false);

  return (
    <div className="rounded-[var(--radius-xl)] border border-border bg-surface px-4 py-3 sm:px-5">
      <p className="text-[13px] font-medium leading-relaxed text-foreground sm:text-sm">
        <span className="mr-1 text-primary-500">Q.</span>{english}
      </p>
      {korean && (
        <>
          <div className="mt-2.5 flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <button
              onClick={() => setShowKorean(!showKorean)}
              className={`flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                showKorean
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-foreground-muted hover:text-foreground-secondary"
              }`}
            >
              <Type size={12} />
              한글
            </button>
          </div>
          {showKorean && (
            <p className="mt-2 text-[11px] leading-relaxed text-foreground-muted sm:text-xs">
              {korean}
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ── 가라오케 텍스트: 단어별 진행 하이라이트 ──

function KaraokeText({
  text,
  start,
  end,
  currentTime,
}: {
  text: string;
  start: number;
  end: number;
  currentTime: number;
}) {
  const words = text.split(" ");
  const duration = end - start;
  const isInRange = currentTime >= start && currentTime <= end;
  const progress = isInRange && duration > 0
    ? Math.max(0, Math.min(1, (currentTime - start) / duration))
    : 0;

  let highlightedCount = 0;
  if (isInRange && progress > 0) {
    const charLengths = words.map((w) => w.length);
    const totalChars = charLengths.reduce((a, b) => a + b, 0);
    let accumulated = 0;
    for (const len of charLengths) {
      accumulated += len;
      if (accumulated / totalChars <= progress) highlightedCount++;
      else break;
    }
    if (progress > 0.02 && highlightedCount === 0) highlightedCount = 1;
  }

  return (
    <>
      {words.map((word, i) => (
        <span
          key={i}
          className={`transition-colors duration-150 ${
            i < highlightedCount ? "text-primary-500" : ""
          }`}
        >
          {word}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}
