"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ListenTrack } from "@/lib/actions/scripts";
import { useListenSettings } from "@/lib/stores/listen";
import type { ListenSettingsState } from "@/lib/stores/listen";
import { ListenSettings } from "./listen-settings";
import { ListenPlayer } from "./listen-player";
import { Headphones, Check, ListChecks, Settings, X } from "lucide-react";
import { QUESTION_TYPE_LABELS } from "@/lib/types/reviews";

// ── 세그먼트: 한 트랙은 1~2개 세그먼트(질문/답변)로 재생됨 ──
type SegKind = "question" | "answer";
interface Segment {
  kind: SegKind;
  url: string;
  gapBefore: number; // 생각 간격(초). 0이면 없음
}

export interface CurrentSubtitle {
  en: string | null;
  ko: string | null;
}

function buildSegments(
  track: ListenTrack,
  contentMode: ListenSettingsState["contentMode"],
  thinkGap: boolean,
  thinkGapSec: number,
): Segment[] {
  const answer: Segment = { kind: "answer", url: track.answerAudioUrl, gapBefore: 0 };
  const hasQ = !!track.questionAudioUrl;

  if (contentMode === "answer") return [answer];
  if (contentMode === "question") {
    return hasQ ? [{ kind: "question", url: track.questionAudioUrl!, gapBefore: 0 }] : [];
  }
  // qa: 질문 → (생각 간격) → 답변. 질문 음성 없으면 답변만.
  if (!hasQ) return [answer];
  return [
    { kind: "question", url: track.questionAudioUrl!, gapBefore: 0 },
    { kind: "answer", url: track.answerAudioUrl, gapBefore: thinkGap ? thinkGapSec : 0 },
  ];
}

function buildQueue(tracks: ListenTrack[], s: ListenSettingsState): ListenTrack[] {
  let list = tracks.filter((t) => t.answerAudioUrl);

  if (s.filterMode === "type" && s.selectedType) {
    list = list.filter((t) => t.questionType === s.selectedType);
  } else if (s.filterMode === "topic" && s.selectedTopic) {
    list = list.filter(
      (t) =>
        t.topic === s.selectedTopic &&
        (!s.selectedCategory || t.category === s.selectedCategory),
    );
  }

  // 질문만 모드: 질문 음성 있는 것 + 같은 질문 중복 제거
  if (s.contentMode === "question") {
    const seen = new Set<string>();
    list = list.filter((t) => {
      if (!t.questionAudioUrl) return false;
      if (seen.has(t.questionId)) return false;
      seen.add(t.questionId);
      return true;
    });
  }

  // question_id(코드) 오름차순 정렬
  list = [...list].sort((a, b) => (a.questionId || "").localeCompare(b.questionId || ""));

  if (s.shuffle) {
    // Fisher–Yates
    list = [...list];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
  }
  return list;
}

export function ListenContent({ tracks }: { tracks: ListenTrack[] }) {
  const settings = useListenSettings();
  const { contentMode, thinkGap, thinkGapSec, speed, repeat, shuffle } = settings;

  // persist 수동 rehydration
  useEffect(() => {
    useListenSettings.persist.rehydrate();
  }, []);

  // ── 재생 큐 ──
  const queue = useMemo(
    () => buildQueue(tracks, settings),
    // 큐를 결정하는 설정만 의존
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      tracks,
      settings.filterMode,
      settings.selectedType,
      settings.selectedCategory,
      settings.selectedTopic,
      settings.contentMode,
      settings.shuffle,
    ],
  );

  // ── 엔진 상태 ──
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const gapTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onEndedRef = useRef<() => void>(() => {});
  const speedRef = useRef(speed);
  const autoPlayNextRef = useRef(false);
  const playSegmentRef = useRef<(i: number, s: number) => void>(() => {});

  const [index, setIndex] = useState(0);
  const [segIndex, setSegIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [gapLeft, setGapLeft] = useState(0);

  // 설정 모달
  const [settingsOpen, setSettingsOpen] = useState(false);

  // ── 선택(체크) 상태 — 확정(selectedIds)만 재생에 반영, 편집은 draftIds ──
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [draftIds, setDraftIds] = useState<Set<string>>(() => new Set());

  // 실제 재생 큐: 확정 선택이 있으면 부분집합, 없으면 전체
  const activeQueue = useMemo(
    () => (selectedIds.size > 0 ? queue.filter((t) => selectedIds.has(t.scriptId)) : queue),
    [queue, selectedIds],
  );

  const currentTrack: ListenTrack | null = activeQueue[index] ?? null;
  const segments = useMemo(
    () => (currentTrack ? buildSegments(currentTrack, contentMode, thinkGap, thinkGapSec) : []),
    [currentTrack, contentMode, thinkGap, thinkGapSec],
  );
  const currentSeg = segments[segIndex] ?? null;
  const segKind: SegKind | null = gapLeft > 0 ? null : currentSeg?.kind ?? null;

  // gap 타이머만 정지 (gapLeft 유지 — 일시정지용)
  const stopGapTimer = useCallback(() => {
    if (gapTimerRef.current) {
      clearInterval(gapTimerRef.current);
      gapTimerRef.current = null;
    }
  }, []);

  // gap 완전 초기화 (트랙 전환/리셋용)
  const clearGap = useCallback(() => {
    stopGapTimer();
    setGapLeft(0);
  }, [stopGapTimer]);

  const startAudio = useCallback((url: string) => {
    const a = audioRef.current;
    if (!a) return;
    if (a.src !== url) a.src = url;
    a.currentTime = 0;
    a.playbackRate = speedRef.current; // 최신 속도(클로저 stale 방지)
    a.play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false)); // 자동재생 차단 시
  }, []);

  // 생각 간격 카운트다운 → 0이면 해당 세그 재생 (재개 시에도 재사용)
  const runGap = useCallback(
    (seconds: number, url: string) => {
      stopGapTimer();
      audioRef.current?.pause();
      setIsPlaying(true);
      setGapLeft(seconds);
      let left = seconds;
      gapTimerRef.current = setInterval(() => {
        left -= 1;
        setGapLeft(left);
        if (left <= 0) {
          stopGapTimer();
          startAudio(url);
        }
      }, 1000);
    },
    [stopGapTimer, startAudio],
  );

  // 특정 (트랙 i, 세그 s) 재생
  const playSegment = useCallback(
    (i: number, s: number) => {
      clearGap();
      const track = activeQueue[i];
      if (!track) {
        setIsPlaying(false);
        return;
      }
      const segs = buildSegments(track, contentMode, thinkGap, thinkGapSec);
      if (segs.length === 0) {
        // 재생할 게 없으면(예: 질문만인데 질문 음성 없음) 다음 트랙으로
        if (i + 1 < activeQueue.length) playSegment(i + 1, 0);
        else setIsPlaying(false);
        return;
      }
      const safeS = Math.min(Math.max(s, 0), segs.length - 1);
      const segment = segs[safeS];
      setIndex(i);
      setSegIndex(safeS);
      setTime(0);

      if (segment.gapBefore > 0) {
        runGap(segment.gapBefore, segment.url); // 생각 간격 후 재생
      } else {
        setGapLeft(0);
        startAudio(segment.url);
      }
    },
    [activeQueue, contentMode, thinkGap, thinkGapSec, clearGap, startAudio, runGap],
  );

  // 다음 트랙 (반복 정책 반영)
  const advanceTrack = useCallback(
    (fromIndex: number) => {
      if (repeat === "one") {
        playSegment(fromIndex, 0);
        return;
      }
      let next = fromIndex + 1;
      if (next >= activeQueue.length) {
        if (repeat === "all") next = 0;
        else {
          setIsPlaying(false);
          return;
        }
      }
      playSegment(next, 0);
    },
    [activeQueue.length, repeat, playSegment],
  );

  // 세그먼트 종료 핸들러 + 자동재생용 playSegment 참조를 매 렌더 후 최신화
  useEffect(() => {
    playSegmentRef.current = playSegment;
    onEndedRef.current = () => {
      const segs = currentTrack
        ? buildSegments(currentTrack, contentMode, thinkGap, thinkGapSec)
        : [];
      if (segIndex < segs.length - 1) {
        playSegment(index, segIndex + 1);
      } else {
        advanceTrack(index);
      }
    };
  });

  // ── 오디오 엘리먼트 (1회 생성) ──
  useEffect(() => {
    const a = new Audio();
    a.preload = "auto";
    audioRef.current = a;

    const onTime = () => setTime(a.currentTime);
    const onMeta = () => setDuration(a.duration || 0);
    const onEnded = () => onEndedRef.current();
    const onPlay = () => setIsPlaying(true);
    const onPauseEv = () => {
      // 트랙 종료가 아닌 일시정지일 때만 false (ended는 별도 처리)
      if (!a.ended) setIsPlaying(false);
    };

    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnded);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPauseEv);

    return () => {
      a.pause();
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPauseEv);
      if (gapTimerRef.current) clearInterval(gapTimerRef.current);
      audioRef.current = null;
    };
  }, []);

  // 속도 변경 즉시 반영 (+ 최신 속도 ref 갱신)
  useEffect(() => {
    speedRef.current = speed;
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  // 필터/내용 변경(원본 큐 변경) → 선택 초기화 (이미 비어있으면 no-op)
  useEffect(() => {
    setSelectedIds((prev) => (prev.size === 0 ? prev : new Set()));
    setDraftIds((prev) => (prev.size === 0 ? prev : new Set()));
    setSelectionMode(false);
  }, [queue]);

  // 재생 큐 변경(필터/선택 변경) → 처음부터 정지 (+ 선택 재생 커밋 시 자동재생)
  useEffect(() => {
    audioRef.current?.pause();
    if (gapTimerRef.current) {
      clearInterval(gapTimerRef.current);
      gapTimerRef.current = null;
    }
    setGapLeft(0);
    setIsPlaying(false);
    setIndex(0);
    setSegIndex(0);
    setTime(0);
    if (autoPlayNextRef.current) {
      autoPlayNextRef.current = false;
      playSegmentRef.current(0, 0); // 오디오는 이전 상호작용으로 unlock된 상태
    }
  }, [activeQueue]);

  // ── 컨트롤 ──
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      audioRef.current?.pause();
      stopGapTimer(); // gapLeft 유지 → 재개 시 이어서
      setIsPlaying(false);
      return;
    }
    // 생각 간격 중 일시정지였다면 남은 시간부터 재개
    if (gapLeft > 0 && currentSeg) {
      runGap(gapLeft, currentSeg.url);
      return;
    }
    const a = audioRef.current;
    if (a && a.src && !a.ended && a.currentTime > 0) {
      a.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      playSegment(index, segIndex);
    }
  }, [isPlaying, gapLeft, currentSeg, index, segIndex, playSegment, runGap, stopGapTimer]);

  const next = useCallback(() => {
    if (activeQueue.length === 0) return;
    playSegment((index + 1) % activeQueue.length, 0);
  }, [activeQueue.length, index, playSegment]);

  const prev = useCallback(() => {
    if (activeQueue.length === 0) return;
    const a = audioRef.current;
    // 3초 이상 재생됐으면 현재 곡 처음으로
    if (a && segIndex === 0 && a.currentTime > 3 && gapLeft === 0) {
      a.currentTime = 0;
      return;
    }
    playSegment((index - 1 + activeQueue.length) % activeQueue.length, 0);
  }, [activeQueue.length, index, segIndex, gapLeft, playSegment]);

  const jumpTo = useCallback((i: number) => playSegment(i, 0), [playSegment]);

  // ── 선택 핸들러 ──
  const enterSelection = useCallback(() => {
    setDraftIds(new Set(selectedIds));
    setSelectionMode(true);
  }, [selectedIds]);

  const cancelSelection = useCallback(() => setSelectionMode(false), []);

  const toggleDraft = useCallback((scriptId: string) => {
    setDraftIds((prev) => {
      const n = new Set(prev);
      if (n.has(scriptId)) n.delete(scriptId);
      else n.add(scriptId);
      return n;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setDraftIds((prev) =>
      prev.size === queue.length ? new Set() : new Set(queue.map((t) => t.scriptId)),
    );
  }, [queue]);

  const commitSelection = useCallback(() => {
    if (draftIds.size === 0) return;
    autoPlayNextRef.current = true; // 커밋 후 자동 재생
    setSelectedIds(new Set(draftIds));
    setSelectionMode(false);
  }, [draftIds]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const seek = useCallback((t: number) => {
    const a = audioRef.current;
    if (a && gapLeft === 0) {
      a.currentTime = t;
      setTime(t);
    }
  }, [gapLeft]);

  // ── 현재 자막 ──
  const subtitle: CurrentSubtitle = useMemo(() => {
    if (!currentTrack || !segKind) return { en: null, ko: null };
    if (segKind === "question") {
      return { en: currentTrack.questionEnglish, ko: currentTrack.questionKorean };
    }
    // answer: 타임스탬프로 현재 문장 찾기
    const sents = currentTrack.sentences || [];
    if (sents.length === 0) return { en: null, ko: null };
    let cur = sents.find((s) => time >= s.start && time <= s.end);
    if (!cur) {
      // 가장 가까운(직전) 문장
      cur = [...sents].reverse().find((s) => time >= s.start) || sents[0];
    }
    return { en: cur.english, ko: cur.korean };
  }, [currentTrack, segKind, time]);

  // ── 빈 상태 ──
  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[var(--radius-xl)] border border-border bg-surface py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-secondary">
          <Headphones size={24} className="text-foreground-muted" />
        </div>
        <p className="mt-3 text-sm font-medium text-foreground-secondary">들을 수 있는 스크립트가 없습니다</p>
        <p className="mt-1 text-xs text-foreground-muted">
          스크립트를 확정하고 음성 패키지를 만들면 여기서 플레이리스트처럼 들을 수 있어요
        </p>
      </div>
    );
  }

  // 현재 설정 요약 (요약 바에 표시)
  const filterSummary =
    settings.filterMode === "type"
      ? `유형: ${settings.selectedType ? QUESTION_TYPE_LABELS[settings.selectedType] || settings.selectedType : "전체"}`
      : settings.filterMode === "topic"
        ? `주제: ${settings.selectedTopic || "전체"}`
        : "전체";
  const contentSummary =
    contentMode === "answer" ? "답변만" : contentMode === "qa" ? (thinkGap ? "질문→답변·생각 간격" : "질문→답변") : "질문만";

  return (
    <div className="space-y-4 pb-28 sm:pb-24">
      {/* 설정 요약 바 — 탭하면 모달 */}
      <button
        onClick={() => setSettingsOpen(true)}
        className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-xl)] border border-border bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-secondary/50"
      >
        <div className="min-w-0">
          <p className="text-[11px] text-foreground-muted">재생 설정</p>
          <p className="truncate text-sm font-medium text-foreground">
            {filterSummary} · {contentSummary}
          </p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-foreground-secondary">
          <Settings size={17} />
        </span>
      </button>

      {/* 플레이어 (now playing + 컨트롤 + 자막) — 네비바(h-16=64px) 아래에 고정 */}
      <div className="sticky top-16 z-20">
        <ListenPlayer
          track={currentTrack}
          segKind={segKind}
          gapLeft={gapLeft}
          isPlaying={isPlaying}
          time={time}
          duration={duration}
          subtitle={subtitle}
          onToggle={togglePlay}
          onNext={next}
          onPrev={prev}
          onSeek={seek}
        />
      </div>

      {/* 재생목록 */}
      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface">
        {/* 헤더 — 일반 / 선택 모드 */}
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          {selectionMode ? (
            <>
              <button
                onClick={toggleSelectAll}
                className="text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                {draftIds.size === queue.length && queue.length > 0 ? "전체 해제" : "전체 선택"}
              </button>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-foreground-muted">{draftIds.size}곡 선택</span>
                <button
                  onClick={cancelSelection}
                  className="rounded-full px-2.5 py-1 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary"
                >
                  취소
                </button>
                <button
                  onClick={commitSelection}
                  disabled={draftIds.size === 0}
                  className="rounded-full bg-primary-500 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-40"
                >
                  선택 재생
                </button>
              </div>
            </>
          ) : (
            <>
              <span className="text-xs font-semibold text-foreground-secondary">
                재생목록 <span className="text-foreground-muted">{activeQueue.length}곡</span>
                {selectedIds.size > 0 && <span className="ml-1 text-primary-600">· 선택 재생 중</span>}
              </span>
              <div className="flex items-center gap-2">
                {selectedIds.size > 0 && (
                  <button
                    onClick={clearSelection}
                    className="text-xs text-foreground-muted transition-colors hover:text-foreground-secondary"
                  >
                    전체 보기
                  </button>
                )}
                <button
                  onClick={enterSelection}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary"
                >
                  <ListChecks size={13} /> 선택
                </button>
              </div>
            </>
          )}
        </div>

        {/* 목록 */}
        {(selectionMode ? queue : activeQueue).length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-foreground-secondary">
            선택한 조건에 맞는 곡이 없어요
          </p>
        ) : selectionMode ? (
          <ul className="divide-y divide-border/50">
            {queue.map((t, i) => {
              const checked = draftIds.has(t.scriptId);
              return (
                <li key={`${t.scriptId}-${i}`}>
                  <button
                    onClick={() => toggleDraft(t.scriptId)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-secondary/60"
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        checked ? "border-primary-500 bg-primary-500 text-white" : "border-border bg-surface"
                      }`}
                    >
                      {checked && <Check size={11} strokeWidth={3} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {t.topic || "주제 없음"}
                      </span>
                      <p className="truncate text-[11px] text-foreground-muted">
                        {t.questionShort || t.questionEnglish || ""}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <ul className="divide-y divide-border/50">
            {activeQueue.map((t, i) => {
              const active = i === index;
              return (
                <li key={`${t.scriptId}-${i}`}>
                  <button
                    onClick={() => jumpTo(i)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      active ? "bg-primary-50/60" : "hover:bg-surface-secondary/60"
                    }`}
                  >
                    <span className={`w-5 shrink-0 text-center text-xs tabular-nums ${active ? "text-primary-600" : "text-foreground-muted"}`}>
                      {active && isPlaying ? "♪" : i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {t.topic || "주제 없음"}
                      </span>
                      <p className="truncate text-[11px] text-foreground-muted">
                        {t.questionShort || t.questionEnglish || ""}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 설정 모달 */}
      {settingsOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSettingsOpen(false)}
          />
          <div className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-surface p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings size={18} className="text-primary-500" />
                <h2 className="text-base font-bold text-foreground">재생 설정</h2>
              </div>
              <button
                onClick={() => setSettingsOpen(false)}
                className="p-1 text-foreground-muted transition-colors hover:text-foreground-secondary"
                aria-label="닫기"
              >
                <X size={20} />
              </button>
            </div>
            <div className="mt-4">
              <ListenSettings tracks={tracks} queueCount={queue.length} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
