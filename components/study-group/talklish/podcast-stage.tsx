"use client";

// Talklish · 월요일 (Podcast) Stage — BP 슬라이드 덱
// 헤더 5도트 + 풀폭 슬라이드 + 푸터 멤버바.
// 큰 모니터에 띄우고 진행자가 키노트처럼 넘기는 흐름.
//
// 단축키: ← → 단계 이동 / R 룰렛 / F 헤더·푸터 숨김(영상·어휘 몰입).

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import {
  Volume2, Mic,
  ChevronLeft, ChevronRight, ChevronDown,
  Play, Eye, EyeOff,
  Users, Target, Clock, CheckCircle, Sparkles, Undo2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchPodcasts, fetchPanelMembers } from "@/lib/actions/study-group";
import type { PodcastRow, PanelMember, KeyExpression, DialogueLine } from "@/lib/types/study-group";
import { TLK, TLK_FONT } from "./tokens";
import { useSpeakerRoulette } from "./use-speaker-roulette";

/* ─── 데이터 정규화 (구버전 자료 호환) ──────────── */

function normalizeKeyExpression(raw: unknown): KeyExpression {
  const k = (raw ?? {}) as Record<string, unknown>;
  const hasLegacy = "english" in k && !("expression" in k);
  if (hasLegacy) {
    const example = typeof k.example === "string" ? k.example : "";
    return {
      expression: typeof k.english === "string" ? k.english : "",
      meaning_ko: typeof k.korean === "string" ? k.korean : "",
      meaning_en: "",
      examples: example ? [{ en: example, ko: "" }] : [],
      similar_expressions: [],
      speaking_prompt: "",
      level: "core",
    };
  }
  const examples = Array.isArray(k.examples)
    ? (k.examples as unknown[]).map((e) => {
        const ex = (e ?? {}) as Record<string, unknown>;
        return {
          en: typeof ex.en === "string" ? ex.en : "",
          ko: typeof ex.ko === "string" ? ex.ko : "",
        };
      })
    : [];
  const similar = Array.isArray(k.similar_expressions)
    ? (k.similar_expressions as unknown[]).filter((s): s is string => typeof s === "string")
    : [];
  return {
    expression: typeof k.expression === "string" ? k.expression : "",
    meaning_ko: typeof k.meaning_ko === "string" ? k.meaning_ko : "",
    meaning_en: typeof k.meaning_en === "string" ? k.meaning_en : "",
    examples,
    similar_expressions: similar,
    speaking_prompt: typeof k.speaking_prompt === "string" ? k.speaking_prompt : "",
    level: k.level === "stretch" ? "stretch" : "core",
  };
}

function normalizeEpisode(raw: PodcastRow): PodcastRow {
  return {
    ...raw,
    key_expressions: (raw.key_expressions ?? []).map(normalizeKeyExpression),
    todays_picks: Array.isArray(raw.todays_picks) ? raw.todays_picks : [],
    comprehension_questions: Array.isArray(raw.comprehension_questions) ? raw.comprehension_questions : [],
    discussion_questions: Array.isArray(raw.discussion_questions) ? raw.discussion_questions : [],
    listening_mission: typeof raw.listening_mission === "string" ? raw.listening_mission : "",
    dialogue_lines: Array.isArray(raw.dialogue_lines) ? raw.dialogue_lines : [],
  };
}

/* ─── 8단계 정의 (레거시 Talklish 흐름 확장) ─────
 *
 * Opening → 1차 청취 → 내용 공유 → 어휘·표현 → 역할극 → 토론 → 랩업 → Closing
 *
 * 60분 분배:
 *   0:  Opening      0–2분    (세션 정보 + 출석 — 큰 모니터용)
 *   1:  1차 청취      2–12분   (영상 듣기, 가라오케)
 *   2:  내용 공유    12–22분   (룰렛 + 들은 내용 나누기)
 *   3:  어휘·표현    22–37분   (플래시 카드)
 *   4:  역할극        37–47분   (짝 대화 — 표현 활용)
 *   5:  토론          47–55분   (AI 토론 질문)
 *   6:  랩업          55–58분   (오늘의 키프세이크)
 *   7:  Closing      58–60분   (마무리 + 세션 완료)
 */

const FLOW = [
  { id: 0, label: "Opening",         desc: "세션 정보 + 출석 확인",              range: "0–2"   },
  { id: 1, label: "1차 청취",        desc: "전체 분위기 파악, 모르는 단어 메모", range: "2–12"  },
  { id: 2, label: "내용 공유",       desc: "들은 내용 자유롭게 공유",            range: "12–22" },
  { id: 3, label: "어휘·표현 학습",  desc: "주요 표현 복기 + 다시 듣기",         range: "22–37" },
  { id: 4, label: "역할극",          desc: "짝과 함께 오늘 표현 활용",           range: "37–47" },
  { id: 5, label: "토론",            desc: "AI가 만든 질문으로 토론",            range: "47–55" },
  { id: 6, label: "랩업",            desc: "오늘 가져갈 표현 1개씩",             range: "55–58" },
  { id: 7, label: "Closing",         desc: "마무리 + 세션 완료",                 range: "58–60" },
] as const;

function phaseFromElapsed(s: number): number {
  if (s < 2 * 60) return 0;
  if (s < 12 * 60) return 1;
  if (s < 22 * 60) return 2;
  if (s < 37 * 60) return 3;
  if (s < 47 * 60) return 4;
  if (s < 55 * 60) return 5;
  if (s < 58 * 60) return 6;
  return 7;
}

/* ─── 메인 ─────────────────────────────────── */

interface Props {
  elapsed: number;
  absentIds: Set<string>;
  onToggleAttendance: (id: string) => void;
}

export function PodcastStage({ elapsed, absentIds, onToggleAttendance }: Props) {
  const { data: episodes = [] } = useQuery({
    queryKey: ["study-podcasts"],
    queryFn: fetchPodcasts,
    staleTime: 5 * 60 * 1000,
  });
  const { data: members = [] } = useQuery({
    queryKey: ["study-panel-members"],
    queryFn: fetchPanelMembers,
    staleTime: 5 * 60 * 1000,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phaseOverride, setPhaseOverride] = useState<number | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  // sub-step states (룰렛은 useSpeakerRoulette 훅에서 관리)
  const [vocabIdx, setVocabIdx] = useState(0);
  const [showVocabKo, setShowVocabKo] = useState(false);
  const [vocabExIdx, setVocabExIdx] = useState(0);
  const [showExKo, setShowExKo] = useState(false);
  const [activeQ, setActiveQ] = useState(0);
  const [keepsake, setKeepsake] = useState("");
  const [sessionCompleted, setSessionCompleted] = useState(false);

  const rawEpisode = episodes.find((e) => e.id === selectedId) ?? episodes[0] ?? null;
  const episode = useMemo(
    () => (rawEpisode ? normalizeEpisode(rawEpisode) : null),
    [rawEpisode]
  );

  const phaseAuto = phaseFromElapsed(elapsed);
  const phase = phaseOverride ?? phaseAuto;
  const flow = FLOW[phase];

  const presentMembers = useMemo(
    () => members.filter((m) => !absentIds.has(m.id)),
    [members, absentIds]
  );

  // 공통 발화자 룰렛 — 한 라운드 = 출석자 전원 한 번씩 (월·수·금 동일 동작)
  // hasSpun=false 일 때 speaker=undefined → 초기엔 아무도 안 뽑힌 상태
  const { activeSpeaker, hasSpun, spinning, spin } = useSpeakerRoulette({
    members,
    presentMembers,
  });

  const goPhase = useCallback((next: number) => {
    setPhaseOverride(Math.max(0, Math.min(FLOW.length - 1, next)));
  }, []);

  // 키보드 단축키
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target;
      if (t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowRight") { e.preventDefault(); goPhase(phase + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); goPhase(phase - 1); }
      else if (e.key === "r" || e.key === "R") { if (phase === 1 || phase === 3) { e.preventDefault(); spin(); } }
      else if (e.key === "f" || e.key === "F") { e.preventDefault(); setFocusMode((v) => !v); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, goPhase, spin]);

  if (!episode) {
    return (
      <div
        className="flex h-full items-center justify-center"
        style={{ background: TLK.bg, color: TLK.inkDim, fontFamily: TLK_FONT.ko }}
      >
        <div className="text-center">
          <p style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 22, color: TLK.inkDim }}>
            오늘의 자료가 아직 등록되지 않았어요
          </p>
          <p style={{ fontSize: 12, color: TLK.inkFaint, marginTop: 6 }}>
            관리자 → 스터디 콘텐츠 관리에서 팟캐스트를 추가해 주세요
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex h-full flex-col"
      style={{ background: TLK.bg, color: TLK.ink, fontFamily: TLK_FONT.ko }}
    >
      {/* ── 헤더: 자료 제목 + 5도트 + 자료 셀렉터 ── */}
      {!focusMode && (
        <header
          className="flex shrink-0 items-center gap-4 border-b px-6 py-3.5 sm:px-10"
          style={{ borderColor: TLK.rule, background: TLK.bg }}
        >
          <div className="min-w-0 max-w-md flex-1">
            <p
              className="truncate"
              style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 16, fontWeight: 500, color: TLK.ink }}
            >
              {episode.title}
            </p>
            <p
              style={{ fontFamily: TLK_FONT.sans, fontSize: 10.5, color: TLK.inkFaint, marginTop: 2, letterSpacing: 0.5 }}
            >
              {episode.source} · {episode.duration}
            </p>
          </div>

          {/* 도트 */}
          <div className="flex items-center gap-4">
            <p
              className="hidden sm:block"
              style={{ fontFamily: TLK_FONT.sans, fontSize: 10, fontWeight: 700, letterSpacing: 2, color: TLK.inkFaint, textTransform: "uppercase" }}
            >
              {String(phase + 1).padStart(2, "0")} / 05
            </p>
            <div className="flex items-center gap-1.5">
              {FLOW.map((f, i) => {
                const isActive = i === phase;
                const isPast = i < phase;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => goPhase(i)}
                    title={`${f.label} (${f.range}min)`}
                    aria-label={`${f.label}로 이동`}
                    style={{
                      width: isActive ? 28 : 8,
                      height: 8,
                      borderRadius: 999,
                      background: isActive ? TLK.accent : isPast ? TLK.inkFaint : TLK.rule,
                      border: 0,
                      cursor: "pointer",
                      transition: "all .25s",
                    }}
                  />
                );
              })}
            </div>
          </div>

          <div className="flex-1" />

          {/* 자료 셀렉터 */}
          {episodes.length > 1 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMenu((s) => !s)}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
                style={{
                  background: TLK.bg2,
                  border: `1px solid ${TLK.rule}`,
                  color: TLK.inkDim,
                  fontFamily: TLK_FONT.sans,
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                자료 변경
                <ChevronDown size={12} />
              </button>
              {showMenu && (
                <div
                  className="absolute right-0 top-full z-20 mt-1 max-h-80 w-72 overflow-y-auto rounded-xl shadow-xl"
                  style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}
                >
                  {episodes.map((ep) => (
                    <button
                      key={ep.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(ep.id);
                        setShowMenu(false);
                        setPhaseOverride(0);
                      }}
                      className="block w-full px-4 py-2.5 text-left transition-colors hover:bg-black/5"
                      style={{ background: "transparent", border: 0, cursor: "pointer" }}
                    >
                      <p
                        style={{
                          fontFamily: TLK_FONT.serif,
                          fontStyle: "italic",
                          fontSize: 14,
                          color: ep.id === episode.id ? TLK.accent : TLK.ink,
                          lineHeight: 1.3,
                        }}
                      >
                        {ep.title}
                      </p>
                      <p style={{ fontFamily: TLK_FONT.sans, fontSize: 10, color: TLK.inkFaint, marginTop: 2 }}>
                        {ep.source} · {ep.duration}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </header>
      )}

      {/* ── 본문: phase별 슬라이드 ── */}
      <main className="relative flex-1 overflow-hidden">
        <div
          key={`phase-${phase}-${episode.id}`}
          className="absolute inset-0 overflow-y-auto"
          style={{ animation: "tlk-fade .35s ease-out" }}
        >
          <div className="mx-auto h-full max-w-6xl px-6 py-6 sm:px-10 sm:py-10">
            {phase === 0 && (
              <OpeningSlide episode={episode} members={members} absentIds={absentIds} />
            )}
            {phase === 1 && <ListenSlide episode={episode} />}
            {phase === 2 && (
              <ShareSlide
                episode={episode}
                members={members}
                absentIds={absentIds}
                activeSpeaker={activeSpeaker}
                hasSpun={hasSpun}
                spinning={spinning}
                onSpin={spin}
              />
            )}
            {phase === 3 && (
              <VocabSlide
                episode={episode}
                idx={vocabIdx}
                onChangeIdx={(n) => {
                  setVocabIdx(n);
                  setShowVocabKo(false);
                  setVocabExIdx(0);
                  setShowExKo(false);
                }}
                showKo={showVocabKo}
                onToggleKo={() => setShowVocabKo((v) => !v)}
                exIdx={vocabExIdx}
                onChangeExIdx={(n) => {
                  setVocabExIdx(n);
                  setShowExKo(false);
                }}
                showExKo={showExKo}
                onToggleExKo={() => setShowExKo((v) => !v)}
              />
            )}
            {phase === 4 && (
              <RoleplaySlide episode={episode} members={members} absentIds={absentIds} />
            )}
            {phase === 5 && (
              <DiscussSlide
                episode={episode}
                activeQ={activeQ}
                onChangeQ={setActiveQ}
                members={members}
                absentIds={absentIds}
                activeSpeaker={activeSpeaker}
                hasSpun={hasSpun}
                spinning={spinning}
                onSpin={spin}
              />
            )}
            {phase === 6 && (
              <WrapupSlide episode={episode} keepsake={keepsake} onChangeKeepsake={setKeepsake} />
            )}
            {phase === 7 && (
              <ClosingSlide
                episode={episode}
                completed={sessionCompleted}
                onComplete={setSessionCompleted}
                keepsake={keepsake}
              />
            )}
          </div>
        </div>
      </main>

      {/* ── 푸터: 멤버 + 단계 라벨 + 이전/다음 ── */}
      {!focusMode && (
        <footer
          className="flex shrink-0 items-center gap-4 border-t px-6 py-3 sm:px-10"
          style={{ borderColor: TLK.rule, background: TLK.bg }}
        >
          <div className="flex flex-1 items-center gap-1.5 overflow-x-auto">
            {members.length === 0 ? (
              <p style={{ fontSize: 11, color: TLK.inkFaint, fontFamily: TLK_FONT.sans }}>
                패널 멤버를 등록해주세요
              </p>
            ) : (
              members.map((m) => {
                const absent = absentIds.has(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onToggleAttendance(m.id)}
                    title={absent ? `${m.name} 결석 (클릭 = 출석)` : `${m.name} 출석 (클릭 = 결석)`}
                    className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 transition-all"
                    style={{
                      background: absent ? "transparent" : TLK.paper,
                      border: `1px solid ${absent ? TLK.rule : m.color}55`,
                      opacity: absent ? 0.4 : 1,
                      filter: absent ? "grayscale(0.6)" : "none",
                      cursor: "pointer",
                    }}
                  >
                    <span className="text-lg leading-none">{m.emoji}</span>
                    <span
                      style={{
                        fontFamily: TLK_FONT.sans,
                        fontSize: 11,
                        fontWeight: 600,
                        color: TLK.ink,
                        textDecoration: absent ? "line-through" : "none",
                      }}
                    >
                      {m.name}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="hidden text-center sm:block" style={{ minWidth: 140 }}>
            <p
              style={{
                fontFamily: TLK_FONT.sans,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 2,
                color: TLK.inkFaint,
                textTransform: "uppercase",
              }}
            >
              {flow.range} min
            </p>
            <p
              style={{
                fontFamily: TLK_FONT.serif,
                fontStyle: "italic",
                fontSize: 15,
                fontWeight: 500,
                color: TLK.ink,
                marginTop: 1,
              }}
            >
              {flow.label}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goPhase(phase - 1)}
              disabled={phase === 0}
              aria-label="이전 단계"
              className="rounded-full p-2.5 transition-all disabled:opacity-30"
              style={{
                background: TLK.paper,
                border: `1px solid ${TLK.rule}`,
                color: TLK.inkDim,
                cursor: phase === 0 ? "not-allowed" : "pointer",
              }}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => goPhase(phase + 1)}
              disabled={phase === FLOW.length - 1}
              className="flex items-center gap-1.5 rounded-full px-4 py-2 transition-all disabled:opacity-30"
              style={{
                background: TLK.accent,
                color: "#fff",
                border: 0,
                fontFamily: TLK_FONT.sans,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.5,
                cursor: phase === FLOW.length - 1 ? "not-allowed" : "pointer",
              }}
            >
              다음
              <ChevronRight size={16} />
            </button>
          </div>
        </footer>
      )}

      {/* focus 모드 토글 (focusMode일 때만 표시) */}
      {focusMode && (
        <button
          type="button"
          onClick={() => setFocusMode(false)}
          className="fixed bottom-4 right-4 z-50 rounded-full px-4 py-2 shadow-lg"
          style={{
            background: TLK.ink,
            color: TLK.bg,
            border: 0,
            fontSize: 11,
            fontFamily: TLK_FONT.sans,
            fontWeight: 700,
            letterSpacing: 1.5,
            cursor: "pointer",
          }}
        >
          F · 헤더 보이기
        </button>
      )}

      <style>{`
        @keyframes tlk-fade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes tlk-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────
   슬라이드 1 · 1차 청취 (YouTube IFrame + 가라오케)
   ───────────────────────────────────────────── */

// YouTube IFrame Player API 타입 (최소)
type YTPlayer = {
  getCurrentTime: () => number;
  destroy: () => void;
};
type YTApi = {
  Player: new (
    id: string,
    opts: {
      videoId: string;
      playerVars?: Record<string, number | string>;
      events?: { onReady?: () => void };
    }
  ) => YTPlayer;
};
declare global {
  interface Window {
    YT?: YTApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const YT_API_SRC = "https://www.youtube.com/iframe_api";
const YT_SCRIPT_ID = "yt-iframe-api";

function loadYouTubeApi(): Promise<YTApi> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return;
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }
    const existing = document.getElementById(YT_SCRIPT_ID);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      if (window.YT) resolve(window.YT);
    };
    if (!existing) {
      const s = document.createElement("script");
      s.id = YT_SCRIPT_ID;
      s.src = YT_API_SRC;
      s.async = true;
      document.body.appendChild(s);
    }
  });
}

function ListenSlide({ episode }: { episode: PodcastRow }) {
  const ytId = extractYouTubeId(episode.url);
  const seg = episode.dialogue_segment;
  const lines = episode.dialogue_lines;
  const fmtSec = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const playerDivId = useMemo(() => `yt-player-${episode.id}`, [episode.id]);
  const playerRef = useRef<YTPlayer | null>(null);
  const [currentMs, setCurrentMs] = useState(0);
  const [showLyrics, setShowLyrics] = useState(true);

  // YouTube IFrame Player 초기화
  useEffect(() => {
    if (!ytId) return;
    let cancelled = false;
    loadYouTubeApi().then((YT) => {
      if (cancelled) return;
      // 같은 div에 player가 이미 있으면 정리
      playerRef.current?.destroy();
      playerRef.current = new YT.Player(playerDivId, {
        videoId: ytId,
        playerVars: {
          ...(seg ? { start: seg.start_sec, end: seg.end_sec } : {}),
          rel: 0,
          modestbranding: 1,
        },
      });
    });
    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {
        /* noop */
      }
      playerRef.current = null;
    };
  }, [ytId, playerDivId, seg?.start_sec, seg?.end_sec]);

  // currentTime 폴링 (180ms — 가라오케 자연스러움 + CPU 부담 균형)
  useEffect(() => {
    const id = setInterval(() => {
      const p = playerRef.current;
      if (!p?.getCurrentTime) return;
      try {
        setCurrentMs(p.getCurrentTime() * 1000);
      } catch {
        /* noop */
      }
    }, 180);
    return () => clearInterval(id);
  }, []);

  // 활성 라인 인덱스
  const activeIdx = useMemo(() => {
    for (let i = 0; i < lines.length; i++) {
      if (currentMs >= lines[i].start_ms && currentMs < lines[i].end_ms) return i;
    }
    return -1;
  }, [lines, currentMs]);

  // 활성 라인 자동 스크롤
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    if (activeIdx >= 0 && lineRefs.current[activeIdx]) {
      lineRefs.current[activeIdx]!.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeIdx]);

  return (
    <div className="flex h-full flex-col gap-4">
      {/* 듣기 미션 + Warm-up 칩 (상단) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {episode.listening_mission ? (
          <div
            className="rounded-full px-4 py-2"
            style={{ background: `${TLK.accent}14`, border: `1px solid ${TLK.accent}33` }}
          >
            <span
              style={{
                fontFamily: TLK_FONT.sans,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1.5,
                color: TLK.accent,
                textTransform: "uppercase",
                marginRight: 10,
              }}
            >
              듣기 미션
            </span>
            <span style={{ fontFamily: TLK_FONT.ko, fontSize: 14, color: TLK.ink }}>
              {episode.listening_mission}
            </span>
          </div>
        ) : (
          <span />
        )}
        {episode.warmup_question && (
          <div className="flex max-w-xl items-baseline gap-2">
            <span
              style={{
                fontFamily: TLK_FONT.sans,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1.5,
                color: TLK.inkFaint,
                textTransform: "uppercase",
              }}
            >
              Warm-up
            </span>
            <span style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 14, color: TLK.ink }}>
              “{episode.warmup_question}”
            </span>
          </div>
        )}
      </div>

      {/* 영상 */}
      <div
        className="mx-auto w-full max-w-4xl overflow-hidden rounded-2xl shadow-xl"
        style={{ aspectRatio: "16/9", background: "#000", border: `1px solid ${TLK.rule}` }}
      >
        {ytId ? (
          <div id={playerDivId} className="h-full w-full" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <a
              href={episode.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full px-6 py-3 text-sm font-semibold"
              style={{ background: TLK.accent, color: "#fff", fontFamily: TLK_FONT.sans }}
            >
              팟캐스트 열기 ↗
            </a>
          </div>
        )}
      </div>

      {/* 가라오케 카드 (영상 아래) */}
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {seg && (
              <div
                className="flex items-center gap-2 rounded-full px-3 py-1"
                style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}
              >
                <Play size={10} style={{ color: TLK.accent }} />
                <span style={{ fontFamily: TLK_FONT.sans, fontSize: 10, fontWeight: 700, color: TLK.accent }}>
                  대화 구간
                </span>
                <span style={{ fontFamily: TLK_FONT.mono, fontSize: 10, color: TLK.inkDim }}>
                  {fmtSec(seg.start_sec)} – {fmtSec(seg.end_sec)}
                </span>
              </div>
            )}
            {lines.length > 0 && activeIdx >= 0 && (
              <span style={{ fontFamily: TLK_FONT.mono, fontSize: 10, color: TLK.inkFaint }}>
                {String(activeIdx + 1).padStart(2, "0")} / {String(lines.length).padStart(2, "0")}
              </span>
            )}
          </div>
          {lines.length > 0 && (
            <button
              type="button"
              onClick={() => setShowLyrics((v) => !v)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1"
              style={{
                background: TLK.bg2,
                border: `1px solid ${TLK.rule}`,
                color: TLK.inkDim,
                fontFamily: TLK_FONT.sans,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1,
                cursor: "pointer",
              }}
            >
              {showLyrics ? <EyeOff size={11} /> : <Eye size={11} />}
              {showLyrics ? "자막 숨기기" : "자막 보기"}
            </button>
          )}
        </div>

        {showLyrics && lines.length > 0 ? (
          <div
            className="overflow-y-auto rounded-2xl px-4 py-3"
            style={{
              background: TLK.paper,
              border: `1px solid ${TLK.rule}`,
              maxHeight: 220,
            }}
          >
            {lines.map((line, i) => {
              const isActive = i === activeIdx;
              const isPast = i < activeIdx;
              return (
                <div
                  key={i}
                  ref={(el) => {
                    lineRefs.current[i] = el;
                  }}
                  className="rounded-lg px-3 py-2 transition-all"
                  style={{
                    background: isActive ? `${TLK.accent}14` : "transparent",
                    opacity: isActive ? 1 : isPast ? 0.45 : 0.7,
                  }}
                >
                  <p
                    style={{
                      fontFamily: TLK_FONT.serif,
                      fontStyle: "italic",
                      fontSize: isActive ? 22 : 16,
                      fontWeight: isActive ? 500 : 400,
                      color: TLK.ink,
                      lineHeight: 1.45,
                      transition: "all .25s",
                    }}
                  >
                    {isActive ? (
                      <KaraokeLine
                        text={line.text}
                        startMs={line.start_ms}
                        endMs={line.end_ms}
                        currentMs={currentMs}
                      />
                    ) : (
                      line.text
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        ) : showLyrics && lines.length === 0 ? (
          <div
            className="rounded-2xl px-4 py-3 text-center"
            style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}
          >
            <p style={{ fontFamily: TLK_FONT.sans, fontSize: 11, color: TLK.inkFaint }}>
              가라오케 자막이 아직 없습니다 — 자료를 다시 생성해 주세요
            </p>
          </div>
        ) : null}
      </div>

      {episode.description && (
        <p
          className="mx-auto max-w-3xl text-center"
          style={{
            fontFamily: TLK_FONT.serif,
            fontSize: 13,
            color: TLK.inkDim,
            fontStyle: "italic",
            lineHeight: 1.5,
          }}
        >
          {episode.description}
        </p>
      )}
    </div>
  );
}

// 활성 문장 내 단어별 가라오케 하이라이트 (쉐도잉 KaraokeText 패턴)
function KaraokeLine({
  text,
  startMs,
  endMs,
  currentMs,
}: {
  text: string;
  startMs: number;
  endMs: number;
  currentMs: number;
}) {
  const words = text.split(/\s+/).filter(Boolean);
  const duration = endMs - startMs;
  const inRange = currentMs >= startMs && currentMs <= endMs;
  const progress = inRange && duration > 0
    ? Math.max(0, Math.min(1, (currentMs - startMs) / duration))
    : 0;

  let highlighted = 0;
  if (inRange && progress > 0) {
    const lens = words.map((w) => w.length);
    const total = lens.reduce((a, b) => a + b, 0);
    let acc = 0;
    for (const len of lens) {
      acc += len;
      if (acc / total <= progress) highlighted++;
      else break;
    }
    if (progress > 0.02 && highlighted === 0) highlighted = 1;
  }

  return (
    <>
      {words.map((w, i) => (
        <span
          key={i}
          style={{
            color: i < highlighted ? TLK.accent : TLK.ink,
            transition: "color .15s",
          }}
        >
          {w}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}

/* ─────────────────────────────────────────────
   슬라이드 2 · 내용 공유 (룰렛 메인)
   ───────────────────────────────────────────── */

function ShareSlide({
  episode,
  members,
  absentIds,
  activeSpeaker,
  hasSpun,
  spinning,
  onSpin,
}: {
  episode: PodcastRow;
  members: PanelMember[];
  absentIds: Set<string>;
  activeSpeaker: number;
  hasSpun: boolean;
  spinning: boolean;
  onSpin: () => void;
}) {
  const speaker = hasSpun ? members[activeSpeaker] : undefined;
  const ytId = extractYouTubeId(episode.url);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-7">
      <p
        style={{
          fontFamily: TLK_FONT.sans,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 2.5,
          color: TLK.inkFaint,
          textTransform: "uppercase",
        }}
      >
        Whose turn?
      </p>

      <div
        className="flex flex-col items-center gap-4 rounded-3xl px-14 py-10"
        style={{ background: TLK.paper, border: `1px solid ${TLK.rule}`, minWidth: 320 }}
      >
        {speaker ? (
          <>
            <div
              className="flex h-32 w-32 items-center justify-center rounded-full text-7xl"
              style={{
                background: `${speaker.color}22`,
                border: `4px solid ${speaker.color}`,
                animation: spinning ? "tlk-spin .4s linear infinite" : undefined,
              }}
            >
              {speaker.emoji}
            </div>
            <p
              style={{
                fontFamily: TLK_FONT.serif,
                fontStyle: "italic",
                fontSize: 32,
                fontWeight: 500,
                color: TLK.ink,
              }}
            >
              {spinning ? "..." : speaker.name}
            </p>
            <p style={{ fontFamily: TLK_FONT.sans, fontSize: 13, color: TLK.inkDim }}>
              {spinning ? "고르는 중" : absentIds.has(speaker.id) ? "결석" : "What did you hear?"}
            </p>
          </>
        ) : members.length === 0 ? (
          <p
            style={{
              fontFamily: TLK_FONT.serif,
              fontStyle: "italic",
              fontSize: 22,
              color: TLK.inkFaint,
            }}
          >
            패널 멤버를 등록해 주세요
          </p>
        ) : (
          <>
            <div
              className="flex h-32 w-32 items-center justify-center rounded-full"
              style={{ background: TLK.bg2, border: `4px dashed ${TLK.rule}` }}
            >
              <span style={{ fontSize: 42, color: TLK.inkFaint }}>?</span>
            </div>
            <p
              style={{
                fontFamily: TLK_FONT.serif,
                fontStyle: "italic",
                fontSize: 22,
                fontWeight: 500,
                color: TLK.inkDim,
              }}
            >
              아직 발화자가 정해지지 않았어요
            </p>
            <p style={{ fontFamily: TLK_FONT.sans, fontSize: 12, color: TLK.inkFaint, textAlign: "center" }}>
              아래 PICK NEXT(R)로 첫 발화자를 뽑아주세요
            </p>
          </>
        )}
      </div>

      <div className="flex flex-col items-center gap-1.5">
        <button
          type="button"
          onClick={onSpin}
          disabled={spinning || members.length === 0}
          className="rounded-full px-8 py-3 transition-all disabled:opacity-40"
          style={{
            background: TLK.accent,
            color: "#fff",
            border: 0,
            fontFamily: TLK_FONT.sans,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 2,
            cursor: spinning ? "wait" : "pointer",
          }}
        >
          {spinning ? "SPIN…" : "🎲 PICK NEXT"}
        </button>
        <p style={{ fontFamily: TLK_FONT.sans, fontSize: 10, color: TLK.inkFaint, letterSpacing: 0.5 }}>
          단축키 R
        </p>
      </div>

      {ytId && (
        <div
          className="w-72 overflow-hidden rounded-xl"
          style={{ aspectRatio: "16/9", border: `1px solid ${TLK.rule}` }}
        >
          <iframe
            src={`https://www.youtube.com/embed/${ytId}`}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={episode.title}
          />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   슬라이드 3 · 어휘·표현 학습 (플래시카드)
   ───────────────────────────────────────────── */

function VocabSlide({
  episode,
  idx,
  onChangeIdx,
  showKo,
  onToggleKo,
  exIdx,
  onChangeExIdx,
  showExKo,
  onToggleExKo,
}: {
  episode: PodcastRow;
  idx: number;
  onChangeIdx: (n: number) => void;
  showKo: boolean;
  onToggleKo: () => void;
  exIdx: number;
  onChangeExIdx: (n: number) => void;
  showExKo: boolean;
  onToggleExKo: () => void;
}) {
  const cards = episode.key_expressions;
  if (cards.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p
          style={{
            color: TLK.inkFaint,
            fontFamily: TLK_FONT.serif,
            fontStyle: "italic",
            fontSize: 22,
          }}
        >
          등록된 표현이 없습니다
        </p>
      </div>
    );
  }
  const i = Math.min(idx, cards.length - 1);
  const card = cards[i];
  const e = card.examples.length > 0 ? Math.min(exIdx, card.examples.length - 1) : 0;

  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  return (
    <div className="flex h-full flex-col gap-5">
      {/* 카드 진행 도트 */}
      <div className="flex items-center justify-center gap-3">
        <p
          style={{
            fontFamily: TLK_FONT.sans,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1.5,
            color: TLK.inkFaint,
          }}
        >
          {String(i + 1).padStart(2, "0")} / {String(cards.length).padStart(2, "0")}
        </p>
        <div className="flex gap-1.5">
          {cards.map((_, n) => {
            const active = n === i;
            const past = n < i;
            return (
              <button
                key={n}
                type="button"
                onClick={() => onChangeIdx(n)}
                aria-label={`표현 ${n + 1}로 이동`}
                style={{
                  width: active ? 24 : 6,
                  height: 6,
                  borderRadius: 999,
                  background: active ? TLK.accent : past ? TLK.inkFaint : TLK.rule,
                  border: 0,
                  cursor: "pointer",
                  transition: "all .25s",
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div
          className="mx-auto max-w-3xl rounded-3xl px-10 py-10"
          style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <h2
                style={{
                  fontFamily: TLK_FONT.serif,
                  fontStyle: "italic",
                  fontSize: 48,
                  fontWeight: 500,
                  color: TLK.ink,
                  lineHeight: 1.15,
                }}
              >
                {card.expression || "(표현 정보 없음)"}
              </h2>
              {card.expression && (
                <button
                  type="button"
                  onClick={() => speak(card.expression)}
                  aria-label="발음 듣기"
                  className="rounded-xl p-3"
                  style={{ background: TLK.bg2, border: 0, cursor: "pointer" }}
                >
                  <Volume2 size={22} style={{ color: TLK.inkDim }} />
                </button>
              )}
            </div>
            <span
              className="shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase"
              style={{
                letterSpacing: 1,
                background: card.level === "stretch" ? `${TLK.accent}1f` : TLK.bg2,
                color: card.level === "stretch" ? TLK.accent : TLK.inkDim,
                fontFamily: TLK_FONT.sans,
              }}
            >
              {card.level === "stretch" ? "도전" : "필수"}
            </span>
          </div>

          {card.meaning_en && (
            <p
              style={{
                fontFamily: TLK_FONT.serif,
                fontSize: 18,
                color: TLK.inkDim,
                marginTop: 14,
                lineHeight: 1.5,
              }}
            >
              {card.meaning_en}
            </p>
          )}

          <div className="mt-4">
            {showKo ? (
              <p style={{ fontSize: 15, color: TLK.ink, fontFamily: TLK_FONT.ko, lineHeight: 1.5 }}>
                {card.meaning_ko || "(뜻 정보 없음)"}
              </p>
            ) : (
              <button
                type="button"
                onClick={onToggleKo}
                style={{
                  color: TLK.accent,
                  fontFamily: TLK_FONT.sans,
                  fontSize: 12,
                  fontWeight: 600,
                  background: "transparent",
                  border: 0,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                한국어 뜻 보기 →
              </button>
            )}
          </div>

          {card.examples.length > 0 && (
            <div
              className="mt-6 rounded-xl px-5 py-5"
              style={{ background: TLK.bg2, border: `1px solid ${TLK.rule}` }}
            >
              <div className="mb-3 flex items-center justify-between">
                <span
                  style={{
                    fontFamily: TLK_FONT.sans,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 1.5,
                    color: TLK.inkFaint,
                    textTransform: "uppercase",
                  }}
                >
                  Example {e + 1} / {card.examples.length}
                </span>
                {card.examples.length > 1 && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onChangeExIdx(Math.max(0, e - 1))}
                      aria-label="이전 예문"
                      style={{ color: TLK.inkDim, background: "transparent", border: 0, cursor: "pointer" }}
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeExIdx(Math.min(card.examples.length - 1, e + 1))}
                      aria-label="다음 예문"
                      style={{ color: TLK.inkDim, background: "transparent", border: 0, cursor: "pointer" }}
                    >
                      →
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-start justify-between gap-3">
                <p
                  style={{
                    fontFamily: TLK_FONT.serif,
                    fontSize: 19,
                    color: TLK.ink,
                    lineHeight: 1.5,
                  }}
                >
                  {card.examples[e].en}
                </p>
                <button
                  type="button"
                  onClick={() => speak(card.examples[e].en)}
                  aria-label="예문 듣기"
                  className="shrink-0 rounded-lg p-2"
                  style={{ background: TLK.paper, border: 0, cursor: "pointer" }}
                >
                  <Volume2 size={16} style={{ color: TLK.inkDim }} />
                </button>
              </div>
              {showExKo
                ? card.examples[e].ko && (
                    <p style={{ fontSize: 13, color: TLK.inkDim, marginTop: 8, fontFamily: TLK_FONT.ko }}>
                      {card.examples[e].ko}
                    </p>
                  )
                : card.examples[e].ko && (
                    <button
                      type="button"
                      onClick={onToggleExKo}
                      className="mt-2"
                      style={{
                        color: TLK.accent,
                        fontFamily: TLK_FONT.sans,
                        fontSize: 11,
                        fontWeight: 600,
                        background: "transparent",
                        border: 0,
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      해석 보기 →
                    </button>
                  )}
            </div>
          )}

          {card.similar_expressions.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span style={{ fontSize: 11, color: TLK.inkFaint, fontFamily: TLK_FONT.sans }}>
                유사 표현
              </span>
              {card.similar_expressions.map((s, n) => (
                <span
                  key={n}
                  className="rounded-lg px-2.5 py-1 text-xs"
                  style={{
                    background: TLK.bg2,
                    color: TLK.inkDim,
                    fontFamily: TLK_FONT.serif,
                    fontStyle: "italic",
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          {card.speaking_prompt && (
            <div
              className="mt-6 rounded-xl px-4 py-4"
              style={{ background: `${TLK.accent}0f`, border: `1px solid ${TLK.accent}33` }}
            >
              <div className="mb-1.5 flex items-center gap-1.5">
                <Mic size={13} style={{ color: TLK.accent }} />
                <span
                  style={{
                    fontFamily: TLK_FONT.sans,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 1.5,
                    color: TLK.accent,
                    textTransform: "uppercase",
                  }}
                >
                  말해보기
                </span>
              </div>
              <p style={{ fontSize: 14, color: TLK.ink, fontFamily: TLK_FONT.ko, lineHeight: 1.5 }}>
                {card.speaking_prompt}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => onChangeIdx(Math.max(0, i - 1))}
          disabled={i === 0}
          className="rounded-full px-4 py-2 transition-all disabled:opacity-30"
          style={{
            background: TLK.bg2,
            color: TLK.inkDim,
            border: `1px solid ${TLK.rule}`,
            cursor: i === 0 ? "not-allowed" : "pointer",
            fontFamily: TLK_FONT.sans,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          ← 이전 표현
        </button>
        <button
          type="button"
          onClick={() => onChangeIdx(Math.min(cards.length - 1, i + 1))}
          disabled={i === cards.length - 1}
          className="rounded-full px-5 py-2 transition-all disabled:opacity-30"
          style={{
            background: TLK.ink,
            color: "#fff",
            border: 0,
            cursor: i === cards.length - 1 ? "not-allowed" : "pointer",
            fontFamily: TLK_FONT.sans,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          다음 표현 →
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   슬라이드 4 · 토론
   ───────────────────────────────────────────── */

function DiscussSlide({
  episode,
  activeQ,
  onChangeQ,
  members,
  absentIds,
  activeSpeaker,
  hasSpun,
  spinning,
  onSpin,
}: {
  episode: PodcastRow;
  activeQ: number;
  onChangeQ: (i: number) => void;
  members: PanelMember[];
  absentIds: Set<string>;
  activeSpeaker: number;
  hasSpun: boolean;
  spinning: boolean;
  onSpin: () => void;
}) {
  const qs = episode.discussion_questions;
  if (qs.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p
          style={{
            color: TLK.inkFaint,
            fontFamily: TLK_FONT.serif,
            fontStyle: "italic",
            fontSize: 22,
          }}
        >
          등록된 토론 질문이 없습니다
        </p>
      </div>
    );
  }
  const idx = Math.min(activeQ, qs.length - 1);
  const speaker = hasSpun ? members[activeSpeaker] : undefined;

  return (
    <div className="flex h-full flex-col justify-center gap-7">
      <p
        className="text-center"
        style={{
          fontFamily: TLK_FONT.sans,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 2.5,
          color: TLK.inkFaint,
          textTransform: "uppercase",
        }}
      >
        Question {idx + 1} of {qs.length}
      </p>

      <div
        className="relative overflow-hidden rounded-3xl px-12 py-14"
        style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 28,
            right: 48,
            fontFamily: TLK_FONT.serif,
            fontSize: 160,
            fontStyle: "italic",
            fontWeight: 500,
            color: `${TLK.accent}1a`,
            lineHeight: 1,
            pointerEvents: "none",
          }}
        >
          {idx + 1}
        </div>
        <p
          style={{
            position: "relative",
            fontFamily: TLK_FONT.serif,
            fontSize: 38,
            fontStyle: "italic",
            fontWeight: 500,
            color: TLK.ink,
            lineHeight: 1.35,
            letterSpacing: -0.5,
          }}
        >
          “{qs[idx]}”
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            {members.map((m, i) => {
              const isActive = hasSpun && i === activeSpeaker && !spinning && !absentIds.has(m.id);
              const absent = absentIds.has(m.id);
              return (
                <div
                  key={m.id}
                  title={m.name}
                  className="flex h-10 w-10 items-center justify-center rounded-full"
                  style={{
                    background: isActive ? m.color : TLK.paper,
                    border: `2px solid ${isActive ? m.color : TLK.rule}`,
                    fontSize: 20,
                    opacity: absent ? 0.35 : 1,
                    transition: "all .25s",
                  }}
                >
                  {m.emoji}
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onSpin}
            disabled={spinning || members.length === 0}
            className="rounded-full px-4 py-2 transition-all disabled:opacity-40"
            style={{
              background: TLK.bg2,
              color: TLK.ink,
              border: `1px solid ${TLK.rule}`,
              fontFamily: TLK_FONT.sans,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1.5,
              cursor: spinning ? "wait" : "pointer",
            }}
          >
            {spinning ? "SPIN…" : "🎲 PICK · R"}
          </button>
          {speaker && !spinning && !absentIds.has(speaker.id) && (
            <span
              style={{
                fontFamily: TLK_FONT.serif,
                fontStyle: "italic",
                fontSize: 14,
                color: TLK.inkDim,
              }}
            >
              지금 차례 — <strong style={{ color: TLK.ink }}>{speaker.name}</strong>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {qs.map((_, i) => {
            const isActive = i === idx;
            const isPast = i < idx;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onChangeQ(i)}
                aria-label={`질문 ${i + 1}로 이동`}
                style={{
                  width: isActive ? 26 : 8,
                  height: 8,
                  borderRadius: 999,
                  background: isActive ? TLK.accent : isPast ? TLK.inkFaint : TLK.rule,
                  border: 0,
                  cursor: "pointer",
                  transition: "all .25s",
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="flex justify-center gap-3">
        <button
          type="button"
          onClick={() => onChangeQ(Math.max(0, idx - 1))}
          disabled={idx === 0}
          className="rounded-full px-4 py-2 transition-all disabled:opacity-30"
          style={{
            background: TLK.bg2,
            color: TLK.inkDim,
            border: `1px solid ${TLK.rule}`,
            cursor: idx === 0 ? "not-allowed" : "pointer",
            fontFamily: TLK_FONT.sans,
            fontSize: 12,
          }}
        >
          ← 이전 질문
        </button>
        <button
          type="button"
          onClick={() => onChangeQ(Math.min(qs.length - 1, idx + 1))}
          disabled={idx === qs.length - 1}
          className="rounded-full px-5 py-2 transition-all disabled:opacity-30"
          style={{
            background: TLK.ink,
            color: "#fff",
            border: 0,
            cursor: idx === qs.length - 1 ? "not-allowed" : "pointer",
            fontFamily: TLK_FONT.sans,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          다음 질문 →
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   슬라이드 5 · 랩업
   ───────────────────────────────────────────── */

function WrapupSlide({
  episode,
  keepsake,
  onChangeKeepsake,
}: {
  episode: PodcastRow;
  keepsake: string;
  onChangeKeepsake: (v: string) => void;
}) {
  return (
    <div className="flex h-full flex-col justify-center gap-8">
      {episode.todays_picks.length > 0 && (
        <div>
          <p
            className="mb-4 text-center"
            style={{
              fontFamily: TLK_FONT.sans,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 2.5,
              color: TLK.inkFaint,
              textTransform: "uppercase",
            }}
          >
            오늘의 핵심 표현
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {episode.todays_picks.map((p, i) => (
              <div
                key={i}
                className="rounded-2xl px-6 py-6 text-center"
                style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}
              >
                <p
                  style={{
                    fontFamily: TLK_FONT.mono,
                    fontSize: 11,
                    color: TLK.accent,
                    letterSpacing: 1,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </p>
                <p
                  style={{
                    fontFamily: TLK_FONT.serif,
                    fontStyle: "italic",
                    fontSize: 22,
                    fontWeight: 500,
                    color: TLK.ink,
                    marginTop: 8,
                    lineHeight: 1.3,
                  }}
                >
                  {p}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        className="mx-auto w-full max-w-2xl rounded-3xl px-8 py-8 text-center"
        style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}
      >
        <p
          style={{
            fontFamily: TLK_FONT.sans,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 2.5,
            color: TLK.inkFaint,
            textTransform: "uppercase",
          }}
        >
          Today&apos;s Keepsake
        </p>
        <p
          style={{
            fontFamily: TLK_FONT.serif,
            fontStyle: "italic",
            fontSize: 24,
            color: TLK.ink,
            marginTop: 8,
          }}
        >
          오늘 가져갈 표현 1개를 적어보세요
        </p>
        <textarea
          value={keepsake}
          onChange={(e) => onChangeKeepsake(e.target.value)}
          placeholder="예: I'll follow through on this."
          rows={3}
          aria-label="오늘의 키프세이크"
          className="mt-6 w-full resize-none rounded-xl px-5 py-3 text-base"
          style={{
            background: TLK.paperHi,
            border: `1px solid ${TLK.rule}`,
            color: TLK.ink,
            fontFamily: TLK_FONT.serif,
            fontStyle: "italic",
            outline: "none",
          }}
        />
        <p
          style={{
            marginTop: 10,
            fontSize: 12,
            color: TLK.inkFaint,
            fontFamily: TLK_FONT.sans,
          }}
        >
          돌아가면서 한 표현씩 짧게 공유해 주세요
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   슬라이드 0 · Opening (세션 정보 + 출석)
   ───────────────────────────────────────────── */

function OpeningSlide({
  episode,
  members,
  absentIds,
}: {
  episode: PodcastRow;
  members: PanelMember[];
  absentIds: Set<string>;
}) {
  const present = members.filter((m) => !absentIds.has(m.id));
  const today = new Date();
  const dateLabel = today.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  // 학습 목표 — episode.description을 첫 줄/문장 분리해서 항목화 (없으면 기본 4개)
  const fallbackObjectives = [
    "오늘의 영상 핵심을 영어로 다시 말해보기",
    "주요 표현 7~12개 손에 익히기",
    "짝과 함께 표현 한 번 이상 활용하기",
    "토론 질문에 한 번씩 발화하기",
  ];

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col justify-between py-8">
      {/* 상단 — 큰 제목 */}
      <div className="text-center">
        <p
          style={{
            fontFamily: TLK_FONT.sans,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 2.5,
            color: TLK.inkFaint,
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Today's Podcast Studio
        </p>
        <h1
          style={{
            fontFamily: TLK_FONT.serif,
            fontStyle: "italic",
            fontSize: 56,
            fontWeight: 500,
            color: TLK.ink,
            lineHeight: 1.1,
            letterSpacing: -1,
            marginBottom: 8,
          }}
        >
          {episode.title}
        </h1>
        <p style={{ fontFamily: TLK_FONT.sans, fontSize: 14, color: TLK.inkDim, letterSpacing: 0.5 }}>
          {episode.source} · {episode.duration} · {episode.difficulty} · {episode.topic}
        </p>
      </div>

      {/* 중앙 — 일정 + 출석 + 학습 목표 */}
      <div className="grid gap-5 md:grid-cols-3">
        {/* 일정 */}
        <div
          className="rounded-3xl p-7"
          style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}
        >
          <div className="mb-3 flex items-center gap-2">
            <Clock size={18} style={{ color: TLK.accent }} />
            <span
              style={{
                fontFamily: TLK_FONT.sans,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1.5,
                color: TLK.inkDim,
                textTransform: "uppercase",
              }}
            >
              일정
            </span>
          </div>
          <p
            style={{
              fontFamily: TLK_FONT.serif,
              fontStyle: "italic",
              fontSize: 18,
              color: TLK.ink,
              lineHeight: 1.4,
            }}
          >
            {dateLabel}
          </p>
          <p
            style={{
              fontFamily: TLK_FONT.sans,
              fontSize: 12,
              color: TLK.inkFaint,
              marginTop: 6,
            }}
          >
            60분 진행 · 매주 월요일
          </p>
        </div>

        {/* 출석 */}
        <div
          className="rounded-3xl p-7"
          style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}
        >
          <div className="mb-3 flex items-center gap-2">
            <Users size={18} style={{ color: TLK.accent2 }} />
            <span
              style={{
                fontFamily: TLK_FONT.sans,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1.5,
                color: TLK.inkDim,
                textTransform: "uppercase",
              }}
            >
              출석
            </span>
          </div>
          <p
            style={{
              fontFamily: TLK_FONT.serif,
              fontStyle: "italic",
              fontSize: 32,
              color: TLK.ink,
              lineHeight: 1,
            }}
          >
            <strong style={{ color: TLK.accent2 }}>{present.length}</strong>
            <span style={{ color: TLK.inkFaint, fontSize: 22 }}> / {members.length}</span>
          </p>
          <p
            style={{
              fontFamily: TLK_FONT.sans,
              fontSize: 11,
              color: TLK.inkFaint,
              marginTop: 6,
              letterSpacing: 0.5,
            }}
          >
            결석 {members.length - present.length}명 · 푸터에서 토글
          </p>
        </div>

        {/* 학습 목표 */}
        <div
          className="rounded-3xl p-7"
          style={{
            background: `${TLK.accent}0d`,
            border: `1px solid ${TLK.accent}44`,
          }}
        >
          <div className="mb-3 flex items-center gap-2">
            <Target size={18} style={{ color: TLK.accent }} />
            <span
              style={{
                fontFamily: TLK_FONT.sans,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1.5,
                color: TLK.accent,
                textTransform: "uppercase",
              }}
            >
              오늘의 목표
            </span>
          </div>
          <ul className="space-y-1.5">
            {fallbackObjectives.slice(0, 4).map((o, i) => (
              <li
                key={i}
                className="flex items-start gap-2"
                style={{ fontFamily: TLK_FONT.ko, fontSize: 12.5, color: TLK.ink, lineHeight: 1.55 }}
              >
                <span
                  style={{
                    fontFamily: TLK_FONT.mono,
                    fontSize: 11,
                    color: TLK.accent,
                    fontWeight: 700,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 하단 — 시작 안내 */}
      <div className="text-center">
        <p
          className="animate-pulse"
          style={{
            fontFamily: TLK_FONT.serif,
            fontStyle: "italic",
            fontSize: 22,
            color: TLK.inkDim,
          }}
        >
          준비되시면 다음 단계로 →
        </p>
        <p
          style={{
            marginTop: 8,
            fontSize: 11,
            color: TLK.inkFaint,
            fontFamily: TLK_FONT.sans,
            letterSpacing: 1.5,
          }}
        >
          단축키 → 또는 SPACE
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   슬라이드 4 · 역할극 (짝 대화)
   ───────────────────────────────────────────── */

function RoleplaySlide({
  episode,
  members,
  absentIds,
}: {
  episode: PodcastRow;
  members: PanelMember[];
  absentIds: Set<string>;
}) {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [showHints, setShowHints] = useState(true);

  // 시나리오 — 자료의 표현/주제에서 자동 생성 (최대 3개)
  const scenarios = useMemo(() => {
    const picks = episode.todays_picks;
    const topic = episode.topic || "오늘의 주제";

    const base = [
      {
        title: "Real-Talk",
        prompt: `방금 들은 영상의 ${topic}에 대해 짝과 영어로 1분간 이야기해보세요.`,
        roleA: "관심 있는 사람 — 질문을 던지는 쪽",
        roleB: "경험자 — 자기 경험을 풀어내는 쪽",
        useExpressions: picks.slice(0, 3),
      },
      {
        title: "Disagree Politely",
        prompt: "토론 질문 중 하나를 골라 짝과 의견이 살짝 다른 척 영어로 주고받으세요.",
        roleA: "동의하는 쪽 — 이유 3개",
        roleB: "동의 안 하는 쪽 — 다른 관점 제시",
        useExpressions: picks.slice(0, 3),
      },
      {
        title: "Quick Pitch",
        prompt: `친구에게 ${topic} 주제로 1분 안에 핵심을 영어로 설명해보세요. (짝이 영어로 질문 던짐)`,
        roleA: "설명하는 쪽 — 핵심 3개",
        roleB: "궁금한 쪽 — 후속 질문 2개",
        useExpressions: picks.slice(0, 3),
      },
    ];
    return base;
  }, [episode.todays_picks, episode.topic]);

  const present = members.filter((m) => !absentIds.has(m.id));
  // 짝 매칭 — 출석자 짝 만들기 (홀수면 마지막 한 명은 옵서버)
  const pairs = useMemo(() => {
    const out: Array<{ a: PanelMember; b: PanelMember | null }> = [];
    for (let i = 0; i < present.length; i += 2) {
      out.push({ a: present[i], b: present[i + 1] ?? null });
    }
    return out;
  }, [present]);

  const scenario = scenarios[scenarioIdx];

  return (
    <div className="flex h-full flex-col gap-5">
      {/* 헤더 — 시나리오 진행 + Hints 토글 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p
            style={{
              fontFamily: TLK_FONT.sans,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1.5,
              color: TLK.inkFaint,
              textTransform: "uppercase",
            }}
          >
            Scenario {scenarioIdx + 1} / {scenarios.length}
          </p>
          <div className="flex gap-1.5">
            {scenarios.map((_, n) => {
              const active = n === scenarioIdx;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setScenarioIdx(n)}
                  aria-label={`시나리오 ${n + 1}로 이동`}
                  style={{
                    width: active ? 24 : 6,
                    height: 6,
                    borderRadius: 999,
                    background: active ? TLK.accent : n < scenarioIdx ? TLK.inkFaint : TLK.rule,
                    border: 0,
                    cursor: "pointer",
                    transition: "all .25s",
                  }}
                />
              );
            })}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowHints((v) => !v)}
          className="flex items-center gap-1.5 rounded-full px-3 py-1"
          style={{
            background: TLK.bg2,
            border: `1px solid ${TLK.rule}`,
            color: TLK.inkDim,
            fontFamily: TLK_FONT.sans,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1,
            cursor: "pointer",
          }}
        >
          {showHints ? <EyeOff size={11} /> : <Eye size={11} />}
          {showHints ? "표현 숨기기" : "표현 보기"}
        </button>
      </div>

      {/* 본문 — 시나리오 카드 */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div
          className="mx-auto max-w-5xl rounded-3xl px-10 py-10"
          style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}
        >
          {/* 시나리오 타이틀 + 프롬프트 */}
          <h2
            style={{
              fontFamily: TLK_FONT.serif,
              fontStyle: "italic",
              fontSize: 42,
              fontWeight: 500,
              color: TLK.ink,
              lineHeight: 1.15,
              letterSpacing: -0.5,
              textAlign: "center",
            }}
          >
            {scenario.title}
          </h2>
          <p
            style={{
              fontFamily: TLK_FONT.ko,
              fontSize: 16,
              color: TLK.inkDim,
              lineHeight: 1.6,
              marginTop: 12,
              textAlign: "center",
              maxWidth: 640,
              marginInline: "auto",
            }}
          >
            {scenario.prompt}
          </p>

          {/* 역할 A / B */}
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            <RoleCard label="Role A" color={TLK.accent} text={scenario.roleA} />
            <RoleCard label="Role B" color={TLK.accent2} text={scenario.roleB} />
          </div>

          {/* 활용 표현 */}
          {showHints && scenario.useExpressions.length > 0 && (
            <div
              className="mt-6 rounded-xl px-5 py-4"
              style={{ background: TLK.bg2, border: `1px solid ${TLK.rule}` }}
            >
              <div className="mb-2 flex items-center gap-1.5">
                <Mic size={13} style={{ color: TLK.accent }} />
                <span
                  style={{
                    fontFamily: TLK_FONT.sans,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 1.5,
                    color: TLK.accent,
                    textTransform: "uppercase",
                  }}
                >
                  오늘의 표현 활용하기
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {scenario.useExpressions.map((s, n) => (
                  <span
                    key={n}
                    className="rounded-lg px-3 py-1.5"
                    style={{
                      background: TLK.paper,
                      color: TLK.ink,
                      fontFamily: TLK_FONT.serif,
                      fontStyle: "italic",
                      fontSize: 14,
                      border: `1px solid ${TLK.rule}`,
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 짝 매칭 — 출석자만 */}
        {pairs.length > 0 && (
          <div className="mx-auto mt-5 max-w-5xl">
            <p
              style={{
                fontFamily: TLK_FONT.sans,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 2,
                color: TLK.inkFaint,
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              오늘의 짝 — Pairs
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {pairs.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
                      style={{ background: `${p.a.color}22`, border: `2px solid ${p.a.color}` }}
                    >
                      {p.a.emoji}
                    </span>
                    <span
                      style={{
                        fontFamily: TLK_FONT.sans,
                        fontSize: 12,
                        fontWeight: 600,
                        color: TLK.ink,
                      }}
                    >
                      {p.a.name}
                    </span>
                  </div>
                  <span style={{ color: TLK.inkFaint, fontFamily: TLK_FONT.serif, fontStyle: "italic" }}>×</span>
                  {p.b ? (
                    <div className="flex items-center gap-1.5">
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
                        style={{ background: `${p.b.color}22`, border: `2px solid ${p.b.color}` }}
                      >
                        {p.b.emoji}
                      </span>
                      <span
                        style={{
                          fontFamily: TLK_FONT.sans,
                          fontSize: 12,
                          fontWeight: 600,
                          color: TLK.ink,
                        }}
                      >
                        {p.b.name}
                      </span>
                    </div>
                  ) : (
                    <span
                      style={{
                        fontFamily: TLK_FONT.sans,
                        fontSize: 11,
                        color: TLK.inkFaint,
                        fontStyle: "italic",
                      }}
                    >
                      옵서버 (다음 짝과 합류)
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RoleCard({ label, color, text }: { label: string; color: string; text: string }) {
  return (
    <div
      className="rounded-2xl px-6 py-5"
      style={{ background: TLK.paperHi, border: `2px solid ${color}33` }}
    >
      <div
        className="mb-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1"
        style={{ background: `${color}1a`, color }}
      >
        <Users size={12} />
        <span
          style={{
            fontFamily: TLK_FONT.sans,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1.5,
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
      </div>
      <p
        style={{
          fontFamily: TLK_FONT.ko,
          fontSize: 15,
          color: TLK.ink,
          lineHeight: 1.5,
        }}
      >
        {text}
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   슬라이드 7 · Closing (마무리 + 세션 완료)
   ───────────────────────────────────────────── */

function ClosingSlide({
  episode,
  completed,
  onComplete,
  keepsake,
}: {
  episode: PodcastRow;
  completed: boolean;
  onComplete: (c: boolean) => void;
  keepsake: string;
}) {
  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col items-center justify-center gap-7 py-8">
      {/* 상단 — Sparkles + 워드마크 */}
      <div className="text-center">
        <div
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full"
          style={{ background: `${TLK.accent}14`, border: `1px solid ${TLK.accent}44` }}
        >
          <Sparkles size={32} style={{ color: TLK.accent }} />
        </div>
        <h1
          style={{
            fontFamily: TLK_FONT.serif,
            fontStyle: "italic",
            fontSize: 64,
            fontWeight: 500,
            color: TLK.ink,
            lineHeight: 1,
            letterSpacing: -1.5,
          }}
        >
          Thank you.
        </h1>
        <p
          style={{
            fontFamily: TLK_FONT.ko,
            fontSize: 18,
            color: TLK.inkDim,
            marginTop: 10,
            lineHeight: 1.5,
          }}
        >
          오늘도 한 회차 굴리셨네요. 다음 주 월요일에 또 만나요.
        </p>
      </div>

      {/* 오늘의 에피소드 회상 */}
      <div
        className="w-full max-w-2xl rounded-2xl px-7 py-5 text-center"
        style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}
      >
        <p
          style={{
            fontFamily: TLK_FONT.sans,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 2,
            color: TLK.inkFaint,
            textTransform: "uppercase",
          }}
        >
          오늘의 스터디
        </p>
        <p
          style={{
            fontFamily: TLK_FONT.serif,
            fontStyle: "italic",
            fontSize: 22,
            color: TLK.ink,
            marginTop: 6,
            lineHeight: 1.3,
          }}
        >
          {episode.title}
        </p>
        {keepsake && (
          <div
            className="mt-4 rounded-xl px-4 py-3"
            style={{ background: TLK.bg2, border: `1px solid ${TLK.rule}` }}
          >
            <p
              style={{
                fontFamily: TLK_FONT.sans,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1.5,
                color: TLK.accent,
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              Today's Keepsake
            </p>
            <p
              style={{
                fontFamily: TLK_FONT.serif,
                fontStyle: "italic",
                fontSize: 16,
                color: TLK.ink,
                lineHeight: 1.5,
              }}
            >
              “{keepsake}”
            </p>
          </div>
        )}
      </div>

      {/* 세션 완료 버튼 */}
      <div className="text-center">
        {!completed ? (
          <>
            <p
              style={{
                fontFamily: TLK_FONT.ko,
                fontSize: 14,
                color: TLK.inkDim,
                marginBottom: 12,
              }}
            >
              이번 세션을 완료로 표시할까요?
            </p>
            <button
              type="button"
              onClick={() => onComplete(true)}
              className="inline-flex items-center gap-2 rounded-full px-7 py-3 shadow-lg transition-all hover:-translate-y-0.5"
              style={{
                background: TLK.accent,
                color: "#fff",
                border: 0,
                fontFamily: TLK_FONT.sans,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 1.5,
                cursor: "pointer",
              }}
            >
              <CheckCircle size={16} />
              세션 완료
            </button>
          </>
        ) : (
          <div
            className="inline-block rounded-2xl px-7 py-5"
            style={{
              background: `${TLK.accent2}14`,
              border: `2px solid ${TLK.accent2}55`,
            }}
          >
            <div className="mb-2 flex items-center justify-center gap-2">
              <CheckCircle size={22} style={{ color: TLK.accent2 }} />
              <p
                style={{
                  fontFamily: TLK_FONT.serif,
                  fontStyle: "italic",
                  fontSize: 22,
                  color: TLK.accent2,
                  fontWeight: 500,
                }}
              >
                완료되었습니다
              </p>
            </div>
            <button
              type="button"
              onClick={() => onComplete(false)}
              className="inline-flex items-center gap-1 transition-opacity hover:opacity-70"
              style={{
                background: "transparent",
                border: 0,
                color: TLK.inkFaint,
                fontFamily: TLK_FONT.sans,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 0.5,
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              <Undo2 size={11} />
              완료 취소
            </button>
          </div>
        )}
      </div>

      <p
        style={{
          marginTop: 8,
          fontFamily: TLK_FONT.serif,
          fontStyle: "italic",
          fontSize: 13,
          color: TLK.inkFaint,
        }}
      >
        See you next time 👋
      </p>
    </div>
  );
}

/* ─── 유틸 ────────────────────────────────── */

function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  return m ? m[1] : null;
}
