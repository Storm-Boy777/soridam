"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  Eye,
  Clock,
  ArrowLeftRight,
  Baby,
  Star,
  CalendarDays,
  Phone,
  Lightbulb,
  TrendingUp,
  Globe,
  BookOpen,
  List,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Play,
  Square,
  type LucideIcon,
} from "lucide-react";
import { ALL_PATTERNS } from "@/lib/data/patterns";
import { PATTERN_TYPES, type PatternType, type UniversalPattern } from "@/lib/types/patterns";
import { PatternCard } from "./pattern-card";

/* ── 탭 정의 ── */

interface PatternTab {
  id: PatternType;
  label: string;
  icon: LucideIcon;
}

const tabs: PatternTab[] = [
  { id: "description", label: "묘사", icon: Eye },
  { id: "routine", label: "루틴", icon: Clock },
  { id: "comparison", label: "비교", icon: ArrowLeftRight },
  { id: "past_childhood", label: "경험·처음", icon: Baby },
  { id: "past_special", label: "경험·특별", icon: Star },
  { id: "past_recent", label: "경험·최근", icon: CalendarDays },
  { id: "rp_11", label: "질문하기", icon: Phone },
  { id: "rp_12", label: "대안제시", icon: Lightbulb },
  { id: "adv_14", label: "비교·변화", icon: TrendingUp },
  { id: "adv_15", label: "사회이슈", icon: Globe },
];

/* ── Phase 색상 (브랜드 톤온톤) ── */

const PHASE_COLORS: Record<string, { badge: string; border: string }> = {
  green: {
    badge: "bg-primary-50 text-primary-600 border-primary-200",
    border: "border-l-primary-400",
  },
  blue: {
    badge: "bg-primary-100 text-primary-700 border-primary-300",
    border: "border-l-primary-500",
  },
  orange: {
    badge: "bg-primary-200 text-primary-700 border-primary-400",
    border: "border-l-primary-600",
  },
  red: {
    badge: "bg-primary-500 text-white border-primary-600",
    border: "border-l-primary-700",
  },
};

/* ── Phase 진행률 도트 (톤온톤) ── */

const PHASE_DOT_COLORS: Record<string, string> = {
  green: "bg-primary-400",
  blue: "bg-primary-500",
  orange: "bg-primary-600",
  red: "bg-primary-700",
};

/* ── 메인 컴포넌트 ── */

export function PatternsContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as PatternType | null;
  const initialTab =
    tabParam && PATTERN_TYPES.includes(tabParam) ? tabParam : "description";

  const [activeTab, setActiveTabState] = useState<PatternType>(initialTab);
  const [mode, setMode] = useState<"browse" | "study">("study");
  const [studyIndex, setStudyIndex] = useState(0);
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(
    new Set([1, 2, 3, 4])
  );
  const tabsRef = useRef<HTMLDivElement>(null);

  const setActiveTab = useCallback(
    (id: PatternType) => {
      setActiveTabState(id);
      setStudyIndex(0);
      setExpandedPhases(new Set([1, 2, 3, 4]));
      const url = new URL(window.location.href);
      url.searchParams.set("tab", id);
      window.history.replaceState(null, "", url.toString());
    },
    []
  );

  // 활성 탭이 보이도록 스크롤
  useEffect(() => {
    if (!tabsRef.current) return;
    const activeBtn = tabsRef.current.querySelector(
      `[data-tab="${activeTab}"]`
    );
    if (activeBtn) {
      activeBtn.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeTab]);

  const patternSet = ALL_PATTERNS[activeTab];

  // 전체 패턴 flat 리스트 (학습 모드용)
  const allPatterns = useMemo(() => {
    const list: { pattern: UniversalPattern; phaseColor: string; phaseNum: number; indexInPhase: number }[] = [];
    patternSet.phases.forEach((phase) => {
      phase.patterns.forEach((p, idx) => {
        list.push({
          pattern: p,
          phaseColor: phase.color,
          phaseNum: phase.phase,
          indexInPhase: idx,
        });
      });
    });
    return list;
  }, [patternSet]);

  const totalPatterns = allPatterns.length;

  // Phase 접기/펼치기
  const togglePhase = useCallback((phase: number) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phase)) next.delete(phase);
      else next.add(phase);
      return next;
    });
  }, []);

  // 학습 모드 네비게이션
  const goPrev = useCallback(() => {
    setStudyIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setStudyIndex((i) => Math.min(totalPatterns - 1, i + 1));
  }, [totalPatterns]);

  // 자동 재생
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const autoPlayRef = useRef<{ audio: HTMLAudioElement | null; sessionId: number }>({ audio: null, sessionId: 0 });
  const isAutoPlayingRef = useRef(false);
  const studyIndexRef = useRef(studyIndex);
  const prevStudyIndexRef = useRef(studyIndex);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");

  // ref 동기화
  useEffect(() => { isAutoPlayingRef.current = isAutoPlaying; }, [isAutoPlaying]);
  useEffect(() => {
    if (studyIndex > prevStudyIndexRef.current) setSlideDirection("right");
    else if (studyIndex < prevStudyIndexRef.current) setSlideDirection("left");
    prevStudyIndexRef.current = studyIndex;
    studyIndexRef.current = studyIndex;
  }, [studyIndex]);

  const stopAutoPlay = useCallback(() => {
    setIsAutoPlaying(false);
    autoPlayRef.current.sessionId++; // 이전 세션 무효화
    if (autoPlayRef.current.audio) {
      autoPlayRef.current.audio.pause();
      autoPlayRef.current.audio = null;
    }
  }, []);

  const startAutoPlay = useCallback((fromIndex?: number) => {
    // 기존 재생 완전 중지
    if (autoPlayRef.current.audio) {
      autoPlayRef.current.audio.pause();
      autoPlayRef.current.audio = null;
    }
    const mySession = ++autoPlayRef.current.sessionId; // 새 세션 ID 발급
    setIsAutoPlaying(true);

    const startIdx = fromIndex ?? studyIndex;

    const playSequence = async () => {
      for (let pi = startIdx; pi < allPatterns.length; pi++) {
        if (autoPlayRef.current.sessionId !== mySession) return;
        setStudyIndex(pi);

        const item = allPatterns[pi];
        for (let ei = 0; ei < item.pattern.examples.length; ei++) {
          if (autoPlayRef.current.sessionId !== mySession) return;

          const src = `/patterns-audio/${activeTab}/${item.pattern.id}_${ei}.mp3`;
          await new Promise<void>((resolve) => {
            if (autoPlayRef.current.sessionId !== mySession) { resolve(); return; }
            const audio = new Audio(src);
            autoPlayRef.current.audio = audio;
            audio.onended = () => resolve();
            audio.onerror = () => resolve();
            audio.play().catch(() => resolve());
          });

          // 예시 간 짧은 대기
          if (autoPlayRef.current.sessionId === mySession && ei < item.pattern.examples.length - 1) {
            await new Promise((r) => setTimeout(r, 500));
          }
        }

        // 패턴 간 대기
        if (autoPlayRef.current.sessionId === mySession && pi < allPatterns.length - 1) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
      if (autoPlayRef.current.sessionId === mySession) setIsAutoPlaying(false);
    };

    playSequence();
  }, [studyIndex, allPatterns, activeTab]);

  // 키보드 네비게이션 (학습 모드)
  useEffect(() => {
    if (mode !== "study") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        const newIdx = Math.max(0, studyIndexRef.current - 1);
        if (isAutoPlayingRef.current) {
          stopAutoPlay();
          setStudyIndex(newIdx);
          setTimeout(() => startAutoPlay(newIdx), 50);
        } else {
          setStudyIndex(newIdx);
        }
      }
      if (e.key === "ArrowRight") {
        const newIdx = Math.min(totalPatterns - 1, studyIndexRef.current + 1);
        if (isAutoPlayingRef.current) {
          stopAutoPlay();
          setStudyIndex(newIdx);
          setTimeout(() => startAutoPlay(newIdx), 50);
        } else {
          setStudyIndex(newIdx);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode, totalPatterns, stopAutoPlay, startAutoPlay]);

  // 학습 모드에서 현재 패턴이 어떤 Phase에 있는지
  const currentStudyItem = allPatterns[studyIndex];


  return (
    <div>
      {/* 탭 바 (가로 스크롤) */}
      <div
        ref={tabsRef}
        className="mb-4 flex overflow-x-auto border-b border-border max-lg:[scrollbar-width:none] max-lg:[&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              data-tab={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex shrink-0 items-center justify-center gap-1.5 px-3 py-3 text-xs font-medium transition-colors sm:px-4 ${
                active
                  ? "text-primary-600"
                  : "text-foreground-muted hover:text-foreground-secondary"
              }`}
            >
              <tab.icon className="h-3.5 w-3.5 shrink-0" />
              <span>{tab.label}</span>
              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* 유형 요약 + 모드 전환 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-foreground-secondary">
          <span className="font-semibold text-foreground">
            {patternSet.label}
          </span>
          <span className="text-foreground-muted">·</span>
          <span>{totalPatterns}개 패턴</span>
        </div>

        {/* 모드 전환 버튼 */}
        <div className="flex gap-1 rounded-lg bg-surface-secondary p-0.5">
          <button
            onClick={() => {
              setMode("study");
              setStudyIndex(0);
              stopAutoPlay();
            }}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
              mode === "study"
                ? "bg-surface text-foreground shadow-sm"
                : "text-foreground-secondary hover:text-foreground"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span className="max-sm:hidden">학습</span>
          </button>
          <button
            onClick={() => { setMode("browse"); stopAutoPlay(); }}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
              mode === "browse"
                ? "bg-surface text-foreground shadow-sm"
                : "text-foreground-secondary hover:text-foreground"
            }`}
          >
            <List className="h-3.5 w-3.5" />
            <span className="max-sm:hidden">열람</span>
          </button>
        </div>
      </div>

      {/* ─── 열람 모드 ─── */}
      {mode === "browse" && (
        <div className="space-y-8">
          {patternSet.phases.map((phase) => {
            const colors = PHASE_COLORS[phase.color] ?? PHASE_COLORS.green;
            const isExpanded = expandedPhases.has(phase.phase);

            return (
              <section key={phase.phase}>
                {/* Phase 헤더 (클릭으로 접기/펼치기) */}
                <button
                  onClick={() => togglePhase(phase.phase)}
                  className={`flex w-full items-center gap-3 rounded-xl border-l-4 bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-secondary ${colors.border}`}
                >
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${colors.badge}`}
                  >
                    Phase {phase.phase}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-foreground sm:text-base">
                        {phase.title}
                      </h2>
                      <span className="text-xs text-foreground-muted">
                        {phase.patterns.length}개
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-foreground-secondary">
                      {phase.description}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-foreground-muted" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-foreground-muted" />
                  )}
                </button>

                {/* 패턴 카드 리스트 */}
                {isExpanded && (
                  <div className="mt-3 space-y-3 rounded-xl bg-surface-secondary/40 p-3">
                    {phase.patterns.map((pattern, idx) => (
                      <PatternCard
                        key={pattern.id}
                        pattern={pattern}
                        number={idx + 1}
                        phaseColor={phase.color}
                        patternType={activeTab}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* ─── 학습 모드 ─── */}
      {mode === "study" && currentStudyItem && (
        <div>
          {/* 현재 위치 표시 */}
          <div className="mb-3 text-center sm:mb-4">
            <span className="text-xs font-bold text-foreground sm:text-sm">
              {patternSet.phases.find((p) => p.phase === currentStudyItem.phaseNum)?.title ?? ""}
            </span>
            <span className="mx-1.5 text-xs text-foreground-muted sm:mx-2 sm:text-sm">·</span>
            <span className="text-xs font-medium text-primary-600 sm:text-sm">
              {studyIndex + 1} / {totalPatterns}
            </span>
            <p className="mt-1 hidden text-xs text-foreground-muted sm:block">
              {patternSet.phases.find((p) => p.phase === currentStudyItem.phaseNum)?.description ?? ""}
            </p>
          </div>

          {/* 진행률 바 */}
          <div className="mb-3 h-1 overflow-hidden rounded-full bg-primary-100 sm:mb-4">
            <div
              className="h-full rounded-full bg-primary-500 transition-all duration-300"
              style={{ width: `${((studyIndex + 1) / totalPatterns) * 100}%` }}
            />
          </div>

          {/* 패턴 카드 */}
          <div
            key={`${activeTab}-${studyIndex}`}
            className={slideDirection === "right" ? "animate-[fadeInRight_250ms_ease-out]" : "animate-[fadeInLeft_250ms_ease-out]"}
          >
            <PatternCard
              pattern={currentStudyItem.pattern}
              number={currentStudyItem.indexInPhase + 1}
              phaseColor={currentStudyItem.phaseColor}
              patternType={activeTab}
              studyMode
            />
          </div>

          {/* Phase 진행률 도트 */}
          <div className="mt-4 flex items-center justify-center gap-1 overflow-x-auto max-md:justify-start max-md:px-2 max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden">
            {patternSet.phases.map((phase) => {
              const dotColor =
                PHASE_DOT_COLORS[phase.color] ?? PHASE_DOT_COLORS.green;
              let startIdx = 0;
              for (const p of patternSet.phases) {
                if (p.phase === phase.phase) break;
                startIdx += p.patterns.length;
              }

              return (
                <div key={phase.phase} className="flex items-center gap-0.5">
                  {phase.patterns.map((_, idx) => {
                    const globalIdx = startIdx + idx;
                    const isCurrent = globalIdx === studyIndex;
                    const isPast = globalIdx < studyIndex;
                    return (
                      <button
                        key={idx}
                        onClick={() => setStudyIndex(globalIdx)}
                        className={`rounded-full transition-all ${
                          isCurrent
                            ? `h-2.5 w-6 ${dotColor}`
                            : isPast
                              ? `h-2 w-2 ${dotColor} opacity-40`
                              : "h-2 w-2 bg-border"
                        }`}
                        aria-label={`패턴 ${globalIdx + 1}`}
                      />
                    );
                  })}
                  {phase.phase < patternSet.phases.length && (
                    <div className="mx-1 h-3 w-px bg-border" />
                  )}
                </div>
              );
            })}
          </div>

          {/* 네비게이션 버튼 */}
          <div className="mt-3 flex items-center justify-between sm:mt-4">
            <button
              onClick={() => {
                const newIdx = Math.max(0, studyIndex - 1);
                if (isAutoPlaying) {
                  stopAutoPlay();
                  setStudyIndex(newIdx);
                  setTimeout(() => startAutoPlay(newIdx), 50);
                } else {
                  goPrev();
                }
              }}
              disabled={studyIndex === 0}
              className="flex items-center gap-1 rounded-xl bg-surface-secondary px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-border disabled:opacity-30 disabled:hover:bg-surface-secondary"
            >
              <ChevronLeft className="h-4 w-4" />
              이전
            </button>

            {/* 자동 재생 버튼 */}
            <button
              onClick={isAutoPlaying ? stopAutoPlay : () => startAutoPlay()}
              className={`flex items-center justify-center rounded-full transition-all ${
                isAutoPlaying
                  ? "h-11 w-11 bg-primary-500 text-white shadow-primary"
                  : "h-11 w-11 bg-surface-secondary text-foreground-muted hover:bg-primary-50 hover:text-primary-500"
              }`}
              aria-label={isAutoPlaying ? "정지" : "전체 재생"}
            >
              {isAutoPlaying ? (
                <Square size={18} className="fill-current" />
              ) : (
                <Play size={20} className="ml-0.5 fill-current" />
              )}
            </button>

            <button
              onClick={() => {
                const newIdx = Math.min(totalPatterns - 1, studyIndex + 1);
                if (isAutoPlaying) {
                  stopAutoPlay();
                  setStudyIndex(newIdx);
                  setTimeout(() => startAutoPlay(newIdx), 50);
                } else {
                  goNext();
                }
              }}
              disabled={studyIndex === totalPatterns - 1}
              className="flex items-center gap-1 rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-medium text-white shadow-primary transition-colors hover:bg-primary-600 disabled:opacity-30 disabled:hover:bg-primary-500"
            >
              다음
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* 키보드 힌트 (PC) */}
          <p className="mt-3 text-center text-xs text-foreground-muted max-md:hidden">
            ← → 방향키로 이동할 수 있습니다
          </p>
        </div>
      )}
    </div>
  );
}
