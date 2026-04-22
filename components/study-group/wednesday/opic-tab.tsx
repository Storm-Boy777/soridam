"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Shuffle, ChevronLeft, ChevronRight, RotateCcw, Play, Pause, Volume2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getQuestionsByTopic, getTopicsByCategory } from "@/lib/queries/master-questions";
import { QUESTION_TYPE_LABELS, QUESTION_TYPE_COLORS } from "@/lib/types/reviews";
import { ActivityTimer } from "../activity-timer";

/* ── 카테고리 ── */

const categories = [
  { id: "일반" as const, label: "일반" },
  { id: "롤플레이" as const, label: "롤플레이" },
  { id: "어드밴스" as const, label: "어드밴스" },
];

type Category = "일반" | "롤플레이" | "어드밴스";

/* ── 메인 컴포넌트 ── */

export function OpicTab() {
  const [selectedCategory, setSelectedCategory] = useState<Category>("일반");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRandom, setIsRandom] = useState(false);

  // ── 오디오 재생 상태 ──
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0); // 0~1
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrent, setAudioCurrent] = useState(0);

  // 카테고리별 토픽 목록 조회 (클라이언트)
  const { data: topics = [], isLoading: isTopicsLoading, error: topicsError } = useQuery({
    queryKey: ["study-topics", selectedCategory],
    queryFn: () => getTopicsByCategory(selectedCategory),
    staleTime: Infinity,
    retry: 2,
  });

  // 선택된 토픽의 질문 목록 조회
  const { data: questions = [], isLoading: isQuestionsLoading, error: questionsError } = useQuery({
    queryKey: ["study-questions", selectedTopic, selectedCategory],
    queryFn: () => getQuestionsByTopic(selectedTopic!, selectedCategory),
    enabled: !!selectedTopic,
    staleTime: Infinity,
    retry: 2,
  });

  // 랜덤 섞기
  const displayQuestions = useMemo(() => {
    if (!isRandom) return questions;
    return [...questions].sort(() => Math.random() - 0.5);
  }, [questions, isRandom]);

  const currentQuestion = displayQuestions[currentIndex];
  const audioUrl = (currentQuestion as { audio_url?: string | null } | undefined)?.audio_url ?? null;

  // 질문이 바뀌면 이전 오디오 정지 + 상태 초기화
  useEffect(() => {
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
    setIsPlaying(false);
    setAudioProgress(0);
    setAudioCurrent(0);
    setAudioDuration(0);
  }, [currentQuestion?.id]);

  // 언마운트 시 정리
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const handleToggleAudio = useCallback(() => {
    const el = audioRef.current;
    if (!el || !audioUrl) return;
    if (el.paused) {
      el.play().catch(() => setIsPlaying(false));
    } else {
      el.pause();
    }
  }, [audioUrl]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current;
    if (!el || !audioDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    el.currentTime = ratio * audioDuration;
  }, [audioDuration]);

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleCategoryChange = useCallback((cat: Category) => {
    setSelectedCategory(cat);
    setSelectedTopic(null);
    setCurrentIndex(0);
  }, []);

  const handleTopicSelect = useCallback((topic: string) => {
    setSelectedTopic(topic);
    setCurrentIndex(0);
  }, []);

  const nextQuestion = useCallback(() => {
    setCurrentIndex((p) => Math.min(displayQuestions.length - 1, p + 1));
  }, [displayQuestions.length]);

  const prevQuestion = useCallback(() => {
    setCurrentIndex((p) => Math.max(0, p - 1));
  }, []);

  const randomQuestion = useCallback(() => {
    if (displayQuestions.length <= 1) return;
    let next: number;
    do {
      next = Math.floor(Math.random() * displayQuestions.length);
    } while (next === currentIndex);
    setCurrentIndex(next);
  }, [displayQuestions.length, currentIndex]);

  // 에러 상태
  if (topicsError || questionsError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50/30 p-6 text-center">
        <p className="text-sm font-medium text-red-700">데이터 로딩 중 문제가 발생했어요.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 rounded-full bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
        >
          새로고침
        </button>
      </div>
    );
  }

  // 토픽 미선택 → 선택 화면
  if (!selectedTopic) {
    return (
      <div className="space-y-6">
        {/* 안내 */}
        <div className="rounded-xl border border-primary-100 bg-primary-50/50 p-4">
          <p className="text-sm text-primary-700">
            <strong>진행 방법:</strong> 카테고리와 토픽을 선택하면 관련 질문이 표시됩니다.
            돌아가며 영어로 답변하고 피드백을 나누세요!
          </p>
        </div>

        {/* 카테고리 탭 */}
        <div className="flex gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                selectedCategory === cat.id
                  ? "bg-primary-500 text-white"
                  : "bg-surface-secondary text-foreground-secondary hover:bg-primary-50 hover:text-primary-600"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* 토픽 그리드 */}
        {isTopicsLoading ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl border border-border bg-surface" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {topics.map((t) => (
              <button
                key={t.topic}
                onClick={() => handleTopicSelect(t.topic)}
                className="rounded-xl border border-border bg-surface p-3 text-left transition-all hover:border-primary-200 hover:bg-primary-50/30"
              >
                <p className="text-sm font-semibold text-foreground">{t.topic}</p>
                <p className="mt-0.5 text-xs text-foreground-muted">질문 {t.count}개</p>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 질문 로딩 중
  if (isQuestionsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  // 질문 표시 화면
  return (
    <div className="space-y-6">
      {/* 상단: 토픽 + 돌아가기 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedTopic(null)}
            className="flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground-secondary transition-colors"
          >
            <ChevronLeft size={16} /> 토픽 선택
          </button>
          <span className="text-sm font-medium text-foreground">{selectedTopic}</span>
          <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-xs text-foreground-muted">
            {selectedCategory}
          </span>
        </div>
        <button
          onClick={() => setIsRandom(!isRandom)}
          className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            isRandom
              ? "bg-primary-500 text-white"
              : "bg-surface-secondary text-foreground-secondary hover:bg-primary-50"
          }`}
        >
          <Shuffle size={12} /> {isRandom ? "랜덤 ON" : "순서대로"}
        </button>
      </div>

      {/* 질문 카드 (대형) */}
      {currentQuestion && (
        <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
          {/* 상단 메타 */}
          <div className="mb-6 flex items-center justify-between">
            <span className="text-sm text-foreground-muted">
              {currentIndex + 1} / {displayQuestions.length}
            </span>
            {currentQuestion.question_type_eng && (
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${QUESTION_TYPE_COLORS[currentQuestion.question_type_eng] || "bg-gray-50 text-gray-700"}`}>
                {QUESTION_TYPE_LABELS[currentQuestion.question_type_eng] || currentQuestion.question_type_eng}
              </span>
            )}
          </div>

          {/* 질문 텍스트 */}
          <p className="text-center text-xl font-semibold leading-relaxed text-foreground sm:text-2xl">
            {currentQuestion.question_english}
          </p>
          <p className="mt-3 text-center text-sm text-foreground-secondary">
            {currentQuestion.question_korean}
          </p>

          {/* 오디오 플레이어 (옵션 B: 큰 재생 버튼 + 진행률 바, 자유 반복) */}
          {audioUrl && (
            <div className="mt-6 rounded-xl border border-border bg-surface-secondary/60 px-4 py-3 sm:px-5 sm:py-4">
              <div className="flex items-center gap-3 sm:gap-4">
                {/* 큰 재생/일시정지 버튼 */}
                <button
                  onClick={handleToggleAudio}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white shadow-md transition-all hover:bg-primary-600 active:scale-95 sm:h-12 sm:w-12"
                  aria-label={isPlaying ? "일시정지" : "재생"}
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                </button>

                {/* 진행률 바 + 시간 */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-foreground-muted sm:text-xs">
                    <Volume2 size={12} className="text-primary-500" />
                    <span>질문 오디오</span>
                    <span className="ml-auto font-mono tabular-nums">
                      {fmtTime(audioCurrent)} / {fmtTime(audioDuration)}
                    </span>
                  </div>
                  <div
                    onClick={handleSeek}
                    className="mt-1.5 h-2 cursor-pointer overflow-hidden rounded-full bg-border/70"
                  >
                    <div
                      className="h-full rounded-full bg-primary-500 transition-[width] duration-100"
                      style={{ width: `${Math.round(audioProgress * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* 숨겨진 audio 엘리먼트 */}
              <audio
                ref={audioRef}
                src={audioUrl}
                preload="metadata"
                onLoadedMetadata={(e) => setAudioDuration((e.target as HTMLAudioElement).duration || 0)}
                onTimeUpdate={(e) => {
                  const t = (e.target as HTMLAudioElement).currentTime;
                  const d = (e.target as HTMLAudioElement).duration || 0;
                  setAudioCurrent(t);
                  setAudioProgress(d > 0 ? t / d : 0);
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => {
                  setIsPlaying(false);
                  setAudioProgress(0);
                  setAudioCurrent(0);
                  // 자유 반복: 끝나면 처음으로 되돌림 (다시 누르면 0부터 재생)
                  if (audioRef.current) audioRef.current.currentTime = 0;
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* 질문 네비게이션 */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={prevQuestion}
          disabled={currentIndex === 0}
          className="rounded-full border border-border p-2.5 text-foreground-secondary hover:bg-surface-secondary disabled:opacity-30 transition-colors"
          aria-label="이전 질문"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={randomQuestion}
          className="rounded-full border border-border p-2.5 text-foreground-secondary hover:bg-primary-50 hover:text-primary-600 transition-colors"
          aria-label="랜덤 질문"
        >
          <Shuffle size={20} />
        </button>
        <button
          onClick={() => setCurrentIndex(0)}
          className="rounded-full border border-border p-2.5 text-foreground-secondary hover:bg-surface-secondary transition-colors"
          aria-label="처음으로"
        >
          <RotateCcw size={18} />
        </button>
        <button
          onClick={nextQuestion}
          disabled={currentIndex === displayQuestions.length - 1}
          className="rounded-full border border-border p-2.5 text-foreground-secondary hover:bg-surface-secondary disabled:opacity-30 transition-colors"
          aria-label="다음 질문"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* 타이머 */}
      <div className="flex justify-center">
        <ActivityTimer presets={[30, 60, 120]} />
      </div>
    </div>
  );
}
