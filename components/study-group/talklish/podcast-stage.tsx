"use client";

// Talklish · 월요일 (Podcast) Stage — BP 슬라이드 덱
// 헤더 5도트 + 풀폭 슬라이드 + 푸터 멤버바.
// 큰 모니터에 띄우고 진행자가 키노트처럼 넘기는 흐름.
//
// 단축키: ← → 단계 이동 / R 룰렛 / F 헤더·푸터 숨김(영상·어휘 몰입).

import { useMemo, useState, useEffect, useCallback, useRef, type MouseEvent } from "react";
import {
  Volume2, Mic,
  ChevronLeft, ChevronRight, ChevronDown,
  Play, Pause, RotateCcw, Headphones, MessageCircle,
  Eye, EyeOff,
  Users, Target, Clock, CheckCircle, Sparkles, Undo2,
  type LucideIcon,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchPodcasts,
  fetchPanelMembers,
  fetchTalklishCompletedPodcasts,
  markTalklishPodcastCompleted,
  unmarkTalklishPodcastCompleted,
} from "@/lib/actions/study-group";
import type { PodcastRow, PanelMember, KeyExpression, DialogueLine, DiscussionQuestion } from "@/lib/types/study-group";
import { TLK, TLK_FONT } from "./tokens";
import { useSpeakerRoulette } from "./use-speaker-roulette";
import { SpeakerCard } from "./speaker-card";

/* ─── 데이터 정규화 (구버전 자료 호환) ──────────── */

function normalizeKeyExpression(raw: unknown): KeyExpression {
  const k = (raw ?? {}) as Record<string, unknown>;
  const hasLegacy = "english" in k && !("expression" in k);
  if (hasLegacy) {
    const example = typeof k.example === "string" ? k.example : "";
    return {
      expression: typeof k.english === "string" ? k.english : "",
      pronunciation: "",
      part_of_speech: "",
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
  const relatedVocab = Array.isArray(k.related_vocab)
    ? (k.related_vocab as unknown[])
        .map((r) => {
          const rv = (r ?? {}) as Record<string, unknown>;
          return {
            word: typeof rv.word === "string" ? rv.word : "",
            meaning_ko: typeof rv.meaning_ko === "string" ? rv.meaning_ko : "",
            relation: typeof rv.relation === "string" ? rv.relation : "관련어",
          };
        })
        .filter((rv) => rv.word)
    : [];
  const exprType =
    k.type === "phrase" ? "phrase" : k.type === "pattern" ? "pattern" : k.type === "word" ? "word" : undefined;
  return {
    expression: typeof k.expression === "string" ? k.expression : "",
    type: exprType,
    related_vocab: relatedVocab,
    pronunciation: typeof k.pronunciation === "string" ? k.pronunciation : "",
    part_of_speech: typeof k.part_of_speech === "string" ? k.part_of_speech : "",
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

/* ─── 7단계 정의 (레거시 Talklish 흐름 확장) ─────
 *
 * Opening → 1차 청취(듣기) → 어휘·표현(표현 익히기) → 2차 청취(다시 듣기) → 토론 → 랩업 → Closing
 *
 * 60분 분배:
 *   0:  Opening      0–2분    (세션 정보 + 출석 — 큰 모니터용)
 *   1:  1차 청취      2–16분   (자막 없이 듣기 + 발화자 룰렛 내용 공유)
 *   2:  어휘·표현    16–35분   (주요 표현 학습 — 플래시 카드)
 *   3:  2차 청취     35–45분   (가라오케 자막 보며 다시 듣기 — 얼마나 더 들리는지)
 *   4:  토론          45–55분   (AI 토론 질문)
 *   5:  랩업          55–58분   (오늘의 키프세이크)
 *   6:  Closing      58–60분   (마무리 + 세션 완료)
 */

const FLOW = [
  { id: 0, label: "Opening",         desc: "세션 정보 + 출석 확인",              range: "0–2"   },
  { id: 1, label: "1차 청취",        desc: "자막 없이 듣고 들은 내용 나누기",     range: "2–16"  },
  { id: 2, label: "어휘·표현 학습",  desc: "주요 표현 복기 (플래시 카드)",        range: "16–35" },
  { id: 3, label: "2차 청취",        desc: "표현 익히고 다시 듣기 (가라오케)",    range: "35–45" },
  { id: 4, label: "토론",            desc: "AI가 만든 질문으로 토론",            range: "45–55" },
  { id: 5, label: "랩업",            desc: "오늘 가져갈 표현 1개씩",             range: "55–58" },
  { id: 6, label: "Closing",         desc: "마무리 + 세션 완료",                 range: "58–60" },
] as const;

function phaseFromElapsed(s: number): number {
  if (s < 2 * 60) return 0;
  if (s < 16 * 60) return 1;
  if (s < 35 * 60) return 2;
  if (s < 45 * 60) return 3;
  if (s < 55 * 60) return 4;
  if (s < 58 * 60) return 5;
  return 6;
}

/** 완료 일시(ISO) → "M/D" 짧은 표기 (자료 드롭다운 뱃지용) */
function fmtDoneDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/* ─── 메인 ─────────────────────────────────── */

interface Props {
  elapsed: number;
  focusMode: boolean;  // Full 모드 — 진행바를 헤더 가운데로 (일반 모드는 우측)
  absentIds: Set<string>;
  onToggleAttendance: (id: string) => void;
}

export function PodcastStage({ elapsed, focusMode, absentIds, onToggleAttendance }: Props) {
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
  // 전역 완료 자료 — podcast_id → completed_at (그룹 공통, 095 테이블)
  const { data: completedPodcasts = {} } = useQuery({
    queryKey: ["talklish-completed-podcasts"],
    queryFn: fetchTalklishCompletedPodcasts,
    staleTime: 60 * 1000,
  });
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phaseOverride, setPhaseOverride] = useState<number | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  // sub-step states (룰렛은 useSpeakerRoulette 훅에서 관리)
  const [vocabIdx, setVocabIdx] = useState(0);
  const [showVocabKo, setShowVocabKo] = useState(false);
  const [vocabExIdx, setVocabExIdx] = useState(0);
  const [showExKo, setShowExKo] = useState(false);
  const [activeQ, setActiveQ] = useState(0);
  const [showDiscussKo, setShowDiscussKo] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  // 자동 선택: 명시 선택 > 아직 안 한(미완료) 첫 자료 > 첫 자료 (전부 완료 시)
  const rawEpisode =
    episodes.find((e) => e.id === selectedId) ??
    episodes.find((e) => !completedPodcasts[e.id]) ??
    episodes[0] ??
    null;
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
      else if (e.key === "r" || e.key === "R") { if (phase === 1 || phase === 4) { e.preventDefault(); spin(); } }
      // 어휘·표현 학습(phase 2) — A/D 표현 이동, Q/E 예문 이동
      else if ((e.key === "a" || e.key === "A") && phase === 2) {
        e.preventDefault();
        setVocabIdx((p) => Math.max(0, p - 1));
        setShowVocabKo(false); setVocabExIdx(0); setShowExKo(false);
      } else if ((e.key === "d" || e.key === "D") && phase === 2) {
        e.preventDefault();
        const len = episode?.key_expressions.length ?? 0;
        setVocabIdx((p) => Math.min(len - 1, p + 1));
        setShowVocabKo(false); setVocabExIdx(0); setShowExKo(false);
      } else if ((e.key === "q" || e.key === "Q") && phase === 2) {
        e.preventDefault();
        setVocabExIdx((p) => Math.max(0, p - 1));
        setShowExKo(false);
      } else if ((e.key === "e" || e.key === "E") && phase === 2) {
        e.preventDefault();
        const exLen = episode?.key_expressions[vocabIdx]?.examples.length ?? 0;
        setVocabExIdx((p) => Math.min(exLen - 1, p + 1));
        setShowExKo(false);
      }
      // 토론(phase 4) — A/D 질문 이동, K 한글 번역 토글
      else if ((e.key === "a" || e.key === "A") && phase === 4) {
        e.preventDefault();
        setActiveQ((p) => Math.max(0, p - 1));
      } else if ((e.key === "d" || e.key === "D") && phase === 4) {
        e.preventDefault();
        const qlen = episode?.discussion_questions.length ?? 0;
        setActiveQ((p) => Math.min(qlen - 1, p + 1));
      } else if ((e.key === "k" || e.key === "K") && phase === 4) {
        e.preventDefault();
        setShowDiscussKo((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, goPhase, spin, episode, vocabIdx]);

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
        <header
          className="relative flex shrink-0 items-center gap-4 border-b px-6 py-3.5 sm:px-10"
          style={{ borderColor: TLK.rule, background: TLK.bg }}
        >
          <div className="min-w-0 max-w-md flex-1">
            <p
              className="truncate"
              style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 16, fontWeight: 500, color: TLK.ink }}
            >
              {episode.dialogue_title || episode.title}
            </p>
            <p
              style={{ fontFamily: TLK_FONT.sans, fontSize: 10.5, color: TLK.inkFaint, marginTop: 2, letterSpacing: 0.5 }}
            >
              {episode.source} · {episode.duration}
            </p>
          </div>

          {!focusMode && <div className="flex-1" />}

          {/* 진행바 — 일반 모드 우측 / Full 모드 가운데 */}
          <div
            className={
              focusMode
                ? "absolute left-1/2 flex -translate-x-1/2 items-center gap-4"
                : "flex items-center gap-4"
            }
          >
            <p
              className="hidden sm:block"
              style={{ fontFamily: TLK_FONT.sans, fontSize: 10, fontWeight: 700, letterSpacing: 2, color: TLK.inkFaint, textTransform: "uppercase" }}
            >
              {String(phase + 1).padStart(2, "0")} / {String(FLOW.length).padStart(2, "0")}
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
                  className="absolute right-0 top-full z-20 mt-1 max-h-96 w-80 overflow-y-auto rounded-xl shadow-xl"
                  style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}
                >
                  {(() => {
                    const undone = episodes.filter((ep) => !completedPodcasts[ep.id]);
                    const done = episodes.filter((ep) => completedPodcasts[ep.id]);
                    const renderItem = (ep: PodcastRow, isDone: boolean) => (
                      <button
                        key={ep.id}
                        type="button"
                        onClick={() => {
                          setSelectedId(ep.id);
                          setShowMenu(false);
                          setPhaseOverride(0);
                        }}
                        className="flex w-full items-start justify-between gap-2 px-4 py-2.5 text-left transition-colors hover:bg-black/5"
                        style={{ background: "transparent", border: 0, cursor: "pointer", opacity: isDone ? 0.5 : 1 }}
                      >
                        <span className="min-w-0">
                          <span
                            className="block truncate"
                            style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 14, color: ep.id === episode.id ? TLK.accent : TLK.ink, lineHeight: 1.3 }}
                          >
                            {ep.dialogue_title || ep.title}
                          </span>
                          <span className="block" style={{ fontFamily: TLK_FONT.sans, fontSize: 10, color: TLK.inkFaint, marginTop: 2 }}>
                            {ep.source} · {ep.duration}
                          </span>
                        </span>
                        {isDone && (
                          <span
                            className="shrink-0 whitespace-nowrap"
                            style={{ fontFamily: TLK_FONT.sans, fontSize: 9.5, fontWeight: 700, color: TLK.inkFaint, marginTop: 3 }}
                          >
                            {fmtDoneDate(completedPodcasts[ep.id])} 완료
                          </span>
                        )}
                      </button>
                    );
                    return (
                      <>
                        <p
                          className="px-4 pb-1 pt-2.5"
                          style={{ fontFamily: TLK_FONT.sans, fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: TLK.inkFaint, textTransform: "uppercase" }}
                        >
                          아직 안 한 주제 · {undone.length}
                        </p>
                        {undone.length === 0 ? (
                          <p className="px-4 py-2" style={{ fontFamily: TLK_FONT.sans, fontSize: 11, color: TLK.inkFaint }}>
                            모든 자료를 완료했어요 🎉
                          </p>
                        ) : (
                          undone.map((ep) => renderItem(ep, false))
                        )}
                        {done.length > 0 && (
                          <>
                            <div className="mx-4 my-1.5" style={{ borderTop: `1px solid ${TLK.rule}` }} />
                            <p
                              className="px-4 pb-1"
                              style={{ fontFamily: TLK_FONT.sans, fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: TLK.inkFaint, textTransform: "uppercase" }}
                            >
                              ✓ 완료한 주제 · {done.length}
                            </p>
                            {done.map((ep) => renderItem(ep, true))}
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </header>

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
            {phase === 1 && (
              <ListenFirstSlide
                episode={episode}
                members={members}
                absentIds={absentIds}
                activeSpeaker={activeSpeaker}
                hasSpun={hasSpun}
                spinning={spinning}
                onSpin={spin}
                onToggleAttendance={onToggleAttendance}
              />
            )}
            {phase === 2 && (
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
            {phase === 3 && <ListenAgainSlide episode={episode} />}
            {phase === 4 && (
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
                onToggleAttendance={onToggleAttendance}
                showKo={showDiscussKo}
                onToggleKo={() => setShowDiscussKo((v) => !v)}
              />
            )}
            {phase === 5 && <WrapupSlide episode={episode} />}
            {phase === 6 && (
              <ClosingSlide
                episode={episode}
                completed={sessionCompleted}
                onComplete={(c) => {
                  setSessionCompleted(c);
                  // 그룹 공통 완료 기록 — 완료(true)면 mark, 취소(false)면 unmark
                  const fn = c ? markTalklishPodcastCompleted : unmarkTalklishPodcastCompleted;
                  void fn(episode.id).then(() =>
                    queryClient.invalidateQueries({ queryKey: ["talklish-completed-podcasts"] })
                  );
                }}
              />
            )}
          </div>
        </div>
      </main>

      {/* ── 푸터: 멤버 + 단계 라벨 + 이전/다음 ── */}
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

      <style>{`
        @keyframes tlk-fade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes tlk-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────
   공유 오디오 플레이어 — 레거시 DialoguePlayer/DialogueSegmentSlideWithKaraoke BM
   재생/일시정지 + 다시듣기 + 시간 + 진행바. 1차·2차 청취가 함께 사용.
   ───────────────────────────────────────────── */

function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrentTime(a.currentTime);
    const onDur = () => setDuration(Number.isFinite(a.duration) ? a.duration : 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onDur);
    a.addEventListener("durationchange", onDur);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onDur);
      a.removeEventListener("durationchange", onDur);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
    };
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) void a.play();
    else a.pause();
  };
  const restart = () => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = 0;
    void a.play();
  };
  const seekTo = (t: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = t;
    void a.play();
  };

  return { audioRef, currentTime, duration, isPlaying, toggle, restart, seekTo };
}

function AudioPlayerBar({
  currentTime,
  duration,
  isPlaying,
  onToggle,
  onRestart,
  onSeek,
  size = "md",
}: {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onToggle: () => void;
  onRestart: () => void;
  onSeek?: (t: number) => void;
  size?: "md" | "lg";
}) {
  const fmt = (t: number) => {
    if (!Number.isFinite(t)) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };
  const pct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const big = size === "lg";
  const onBarClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!onSeek || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    onSeek(ratio * duration);
  };
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={onToggle}
        aria-label={isPlaying ? "일시정지" : "재생"}
        className="flex items-center justify-center rounded-full transition-all"
        style={{ width: big ? 72 : 50, height: big ? 72 : 50, background: TLK.accent, color: "#fff", border: 0, cursor: "pointer" }}
      >
        {isPlaying ? <Pause size={big ? 28 : 20} /> : <Play size={big ? 28 : 20} style={{ marginLeft: 2 }} />}
      </button>
      <button
        type="button"
        onClick={onRestart}
        aria-label="처음부터 다시 듣기"
        className="flex items-center justify-center rounded-full transition-all"
        style={{ width: big ? 52 : 40, height: big ? 52 : 40, background: TLK.bg2, color: TLK.inkDim, border: `1px solid ${TLK.rule}`, cursor: "pointer" }}
      >
        <RotateCcw size={big ? 22 : 16} />
      </button>
      <div className="flex flex-1 items-center gap-3">
        <span style={{ fontFamily: TLK_FONT.mono, fontSize: big ? 14 : 12, color: TLK.inkDim, minWidth: big ? 48 : 40, textAlign: "right" }}>
          {fmt(currentTime)}
        </span>
        <div
          onClick={onBarClick}
          className="relative h-2 flex-1 overflow-hidden rounded-full"
          style={{ background: TLK.bg2, cursor: onSeek ? "pointer" : "default" }}
        >
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: TLK.accent, transition: "width .1s linear" }} />
        </div>
        <span style={{ fontFamily: TLK_FONT.mono, fontSize: big ? 14 : 12, color: TLK.inkDim, minWidth: big ? 48 : 40 }}>
          {fmt(duration)}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   슬라이드 1 · 1차 청취 (Listen First — 자막 없이 오디오만 + 발화자 룰렛 내용 공유)
   레거시 ListeningModeSlide BM. 들은 내용을 룰렛으로 발화자 뽑아 나눈다.
   ───────────────────────────────────────────── */

/** 토론 질문 정규화 — 구버전 string도 {en, ko}로 안전 변환 */
function normalizeDQ(q: string | DiscussionQuestion): DiscussionQuestion {
  if (typeof q === "string") return { en: q, ko: "" };
  return { en: q.en ?? "", ko: q.ko ?? "" };
}

/* 공통 슬라이드 헤더 — 아이콘 + 영문 제목(serif italic) + 한글 부제 */
function SlideHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="text-center">
      <div className="mb-1.5 flex items-center justify-center gap-2.5">
        <Icon size={20} style={{ color: TLK.accent }} />
        <h1 style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 40, fontWeight: 500, color: TLK.ink, lineHeight: 1 }}>
          {title}
        </h1>
      </div>
      <p style={{ fontFamily: TLK_FONT.ko, fontSize: 16, color: TLK.inkDim }}>
        {subtitle}
      </p>
    </div>
  );
}

function ListenFirstSlide({
  episode,
  members,
  absentIds,
  activeSpeaker,
  hasSpun,
  spinning,
  onSpin,
  onToggleAttendance,
}: {
  episode: PodcastRow;
  members: PanelMember[];
  absentIds: Set<string>;
  activeSpeaker: number;
  hasSpun: boolean;
  spinning: boolean;
  onSpin: () => void;
  onToggleAttendance: (memberId: string) => void;
}) {
  const { audioRef, currentTime, duration, isPlaying, toggle, restart } = useAudioPlayer();
  const hasAudio = !!episode.audio_url;

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col gap-5">
      {/* 헤더 */}
      <SlideHeader
        icon={Headphones}
        title="Listen First"
        subtitle="자막 없이 먼저 들어보세요 · 들은 내용을 자유롭게 나눠요"
      />

      {/* 듣기 미션 */}
      {episode.listening_mission && (
        <div className="mx-auto rounded-full px-4 py-2" style={{ background: `${TLK.accent}14`, border: `1px solid ${TLK.accent}33` }}>
          <span style={{ fontFamily: TLK_FONT.sans, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: TLK.accent, textTransform: "uppercase", marginRight: 10 }}>
            듣기 미션
          </span>
          <span style={{ fontFamily: TLK_FONT.ko, fontSize: 17, color: TLK.ink }}>{episode.listening_mission}</span>
        </div>
      )}

      {/* 대화 오디오 (자막 없음) */}
      <div className="rounded-3xl p-8" style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}>
        {hasAudio ? (
          <>
            <audio ref={audioRef} src={episode.audio_url ?? undefined} />
            <div className="mb-6 flex flex-col items-center gap-2 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: `${TLK.accent}14`, border: `1px solid ${TLK.accent}33` }}>
                <Volume2 size={26} style={{ color: TLK.accent }} />
              </span>
              <p style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 24, color: TLK.ink }}>대화 오디오</p>
              <p style={{ fontFamily: TLK_FONT.sans, fontSize: 13, color: TLK.inkFaint }}>스크립트 없이 흐름과 분위기에 집중</p>
            </div>
            <AudioPlayerBar
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              onToggle={toggle}
              onRestart={restart}
              size="lg"
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 24, color: TLK.inkDim }}>오디오가 아직 없어요</p>
            <p style={{ fontFamily: TLK_FONT.ko, fontSize: 14, color: TLK.inkFaint, marginTop: 6 }}>
              스터디 준비에서 오디오 추출을 먼저 해주세요
            </p>
          </div>
        )}
      </div>

      {/* 발화자 PICK — 들은 내용 나누기 (수요일 SpeakerCard 재사용, 작게) */}
      <div>
        <div className="mb-2 flex items-center gap-1.5">
          <MessageCircle size={15} style={{ color: TLK.accent2 }} />
          <span style={{ fontFamily: TLK_FONT.sans, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: TLK.inkFaint, textTransform: "uppercase" }}>
            들은 내용 나누기 · Whose turn?
          </span>
        </div>
        <SpeakerCard
          members={members}
          absentIds={absentIds}
          activeSpeaker={activeSpeaker}
          hasSpun={hasSpun}
          spinning={spinning}
          onSpin={onSpin}
          onToggleAttendance={onToggleAttendance}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   슬라이드 2 · 2차 청취 (가라오케 — 레거시 DialogueSegmentSlideWithKaraoke BM)
   커스텀 오디오 플레이어 + dialogue_timestamps 화자별 세그먼트 하이라이트 + 번역 + 클릭 seek
   ───────────────────────────────────────────── */

function ListenAgainSlide({ episode }: { episode: PodcastRow }) {
  const segments = episode.dialogue_timestamps ?? [];
  const hasData = !!episode.audio_url && segments.length > 0;
  const { audioRef, currentTime, duration, isPlaying, toggle, restart, seekTo } = useAudioPlayer();
  const [showKo, setShowKo] = useState(true);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  // 화자별 색상 (등장 순서)
  const speakers = useMemo(
    () => [...new Set(segments.map((s) => s.speaker).filter(Boolean))],
    [segments]
  );
  const palette = [TLK.accent, TLK.accent2, TLK.gold, "#7A5A8C", "#4A6B8C"];
  const colorOf = (sp: string) => palette[Math.max(0, speakers.indexOf(sp)) % palette.length];

  const activeIdx = useMemo(
    () => segments.findIndex((s) => currentTime >= s.start && currentTime <= s.end),
    [segments, currentTime]
  );

  useEffect(() => {
    if (activeIdx >= 0) lineRefs.current[activeIdx]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeIdx]);

  if (!hasData) {
    return (
      <div className="flex h-full items-center justify-center" style={{ fontFamily: TLK_FONT.ko }}>
        <div className="text-center">
          <p style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 22, color: TLK.inkDim }}>
            2차 청취 자료가 아직 없어요
          </p>
          <p style={{ fontSize: 12, color: TLK.inkFaint, marginTop: 6 }}>
            스터디 준비에서 오디오 추출 + 가라오케 자막을 먼저 만들어 주세요
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* 헤더 + 번역 토글 */}
      <div className="relative">
        <SlideHeader
          icon={Headphones}
          title="Listen Again"
          subtitle="어휘·표현을 익히고 다시 들어보세요 · 얼마나 더 잘 들리나요?"
        />
        <button
          type="button"
          onClick={() => setShowKo((v) => !v)}
          className="absolute right-0 top-0 flex items-center gap-1.5 rounded-full px-3 py-1"
          style={{ background: TLK.bg2, border: `1px solid ${TLK.rule}`, color: TLK.inkDim, fontFamily: TLK_FONT.sans, fontSize: 12, fontWeight: 700, letterSpacing: 1, cursor: "pointer" }}
        >
          {showKo ? <EyeOff size={13} /> : <Eye size={13} />}
          {showKo ? "한글자막 숨기기" : "한글자막 보기"}
        </button>
      </div>

      {/* 커스텀 오디오 플레이어 (레거시 BM) */}
      <div className="mx-auto w-full max-w-5xl rounded-2xl px-5 py-4" style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}>
        <audio ref={audioRef} src={episode.audio_url ?? undefined} />
        <AudioPlayerBar
          currentTime={currentTime}
          duration={duration}
          isPlaying={isPlaying}
          onToggle={toggle}
          onRestart={restart}
          onSeek={seekTo}
        />
      </div>

      {/* 화자별 가라오케 자막 — 높이 고정 (화면 커져도 일정) */}
      <div className="relative mx-auto h-[600px] w-full max-w-5xl shrink-0">
        <div
          className="absolute inset-0 overflow-y-auto rounded-2xl px-4 py-3"
          style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}
        >
          {segments.map((s, i) => {
            const active = i === activeIdx;
            const color = colorOf(s.speaker);
            return (
              <div
                key={i}
                ref={(el) => { lineRefs.current[i] = el; }}
                onClick={() => seekTo(s.start)}
                className="cursor-pointer rounded-xl px-4 py-3 transition-all"
                style={{
                  background: active ? `${color}14` : "transparent",
                  opacity: active ? 1 : 0.55,
                  borderLeft: `3px solid ${active ? color : "transparent"}`,
                  marginBottom: 4,
                }}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold"
                    style={{ background: `${color}22`, color }}
                  >
                    {s.speaker.charAt(0) || "?"}
                  </span>
                  <span style={{ fontFamily: TLK_FONT.sans, fontSize: 13, fontWeight: 700, color }}>
                    {s.speaker}
                  </span>
                </div>
                <p
                  style={{
                    fontFamily: TLK_FONT.serif,
                    fontStyle: "italic",
                    fontSize: active ? 26 : 20,
                    color: TLK.ink,
                    lineHeight: 1.45,
                    transition: "all .2s",
                  }}
                >
                  {s.text}
                </p>
                {showKo && s.translation && (
                  <p style={{ fontFamily: TLK_FONT.ko, fontSize: 16, color: TLK.inkDim, marginTop: 4 }}>
                    {s.translation}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-center" style={{ fontFamily: TLK_FONT.sans, fontSize: 12, color: TLK.inkFaint }}>
        💡 자막을 클릭하면 그 부분부터 재생돼요
      </p>
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
      <SlideHeader
        icon={Sparkles}
        title="Key Expressions"
        subtitle="오늘의 핵심 어휘·표현을 익혀요 · 예문으로 입에 붙이기"
      />
      {/* 카드 진행 도트 */}
      <div className="flex items-center justify-center gap-3">
        <p
          style={{
            fontFamily: TLK_FONT.sans,
            fontSize: 13,
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
          className="mx-auto max-w-5xl rounded-3xl px-10 py-10"
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
            <div className="flex shrink-0 items-center gap-1.5">
              {card.type && (
                <span
                  className="rounded-full px-3 py-1 text-[12px] font-bold"
                  style={{
                    letterSpacing: 0.5,
                    background: card.type === "pattern" ? `${TLK.accent2}1f` : TLK.bg2,
                    color: card.type === "pattern" ? TLK.accent2 : TLK.inkDim,
                    fontFamily: TLK_FONT.sans,
                  }}
                >
                  {card.type === "word" ? "단어" : card.type === "phrase" ? "표현" : "회화 패턴"}
                </span>
              )}
              <span
                className="rounded-full px-3 py-1 text-[12px] font-bold uppercase"
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
          </div>

          {(card.pronunciation || card.part_of_speech) && (
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              {card.pronunciation && (
                <span
                  style={{
                    fontFamily: TLK_FONT.mono,
                    fontSize: 17,
                    color: TLK.inkDim,
                    letterSpacing: 0.3,
                  }}
                >
                  {card.pronunciation}
                </span>
              )}
              {card.part_of_speech && (
                <span
                  className="rounded-md px-2 py-0.5 text-[13px] font-semibold"
                  style={{
                    background: TLK.bg2,
                    color: TLK.inkDim,
                    fontFamily: TLK_FONT.sans,
                    fontStyle: "italic",
                  }}
                >
                  {card.part_of_speech}
                </span>
              )}
            </div>
          )}

          {card.meaning_en && (
            <p
              style={{
                fontFamily: TLK_FONT.serif,
                fontSize: 21,
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
              <p style={{ fontSize: 18, color: TLK.ink, fontFamily: TLK_FONT.ko, lineHeight: 1.5 }}>
                {card.meaning_ko || "(뜻 정보 없음)"}
              </p>
            ) : (
              <button
                type="button"
                onClick={onToggleKo}
                style={{
                  color: TLK.accent,
                  fontFamily: TLK_FONT.sans,
                  fontSize: 14,
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
                    fontSize: 12,
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
                      aria-label="이전 예문 (Q)"
                      style={{ color: TLK.inkDim, background: "transparent", border: 0, cursor: "pointer", fontFamily: TLK_FONT.sans, fontSize: 13, fontWeight: 700 }}
                    >
                      (Q) ←
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeExIdx(Math.min(card.examples.length - 1, e + 1))}
                      aria-label="다음 예문 (E)"
                      style={{ color: TLK.inkDim, background: "transparent", border: 0, cursor: "pointer", fontFamily: TLK_FONT.sans, fontSize: 13, fontWeight: 700 }}
                    >
                      → (E)
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-start justify-between gap-3">
                <p
                  style={{
                    fontFamily: TLK_FONT.serif,
                    fontSize: 23,
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
                  <Volume2 size={18} style={{ color: TLK.inkDim }} />
                </button>
              </div>
              {showExKo
                ? card.examples[e].ko && (
                    <p style={{ fontSize: 16, color: TLK.inkDim, marginTop: 8, fontFamily: TLK_FONT.ko }}>
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
                        fontSize: 13,
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
              <span style={{ fontSize: 13, color: TLK.inkFaint, fontFamily: TLK_FONT.sans }}>
                유사 표현
              </span>
              {card.similar_expressions.map((s, n) => (
                <span
                  key={n}
                  className="rounded-lg px-2.5 py-1 text-sm"
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

          {card.related_vocab && card.related_vocab.length > 0 && (
            <div className="mt-4">
              <p style={{ fontSize: 13, color: TLK.inkFaint, fontFamily: TLK_FONT.sans, marginBottom: 6 }}>
                함께 알아두기
              </p>
              <div className="flex flex-col gap-1.5">
                {card.related_vocab.map((rv, n) => (
                  <div key={n} className="flex items-baseline gap-2">
                    <span
                      className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold"
                      style={{ background: TLK.bg2, color: TLK.inkFaint, fontFamily: TLK_FONT.sans }}
                    >
                      {rv.relation}
                    </span>
                    <span style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 16, color: TLK.ink }}>
                      {rv.word}
                    </span>
                    <span style={{ fontFamily: TLK_FONT.ko, fontSize: 15, color: TLK.inkDim }}>
                      {rv.meaning_ko}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {card.speaking_prompt && (
            <div
              className="mt-6 rounded-xl px-4 py-4"
              style={{ background: `${TLK.accent}0f`, border: `1px solid ${TLK.accent}33` }}
            >
              <div className="mb-1.5 flex items-center gap-1.5">
                <Mic size={15} style={{ color: TLK.accent }} />
                <span
                  style={{
                    fontFamily: TLK_FONT.sans,
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: 1.5,
                    color: TLK.accent,
                    textTransform: "uppercase",
                  }}
                >
                  말해보기
                </span>
              </div>
              <p style={{ fontSize: 17, color: TLK.ink, fontFamily: TLK_FONT.ko, lineHeight: 1.5 }}>
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
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          ← 이전 표현 (A)
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
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          다음 표현 (D) →
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
  onToggleAttendance,
  showKo,
  onToggleKo,
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
  onToggleAttendance: (memberId: string) => void;
  showKo: boolean;
  onToggleKo: () => void;
}) {
  const qs = episode.discussion_questions.map(normalizeDQ);
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

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-7">
      <div className="relative">
        <SlideHeader
          icon={MessageCircle}
          title="Discussion"
          subtitle="들은 내용을 주제로 자유롭게 토론해요 · 룰렛으로 발표자를 뽑아요"
        />
        <button
          type="button"
          onClick={onToggleKo}
          className="absolute right-0 top-0 flex items-center gap-1.5 rounded-full px-3 py-1"
          style={{ background: TLK.bg2, border: `1px solid ${TLK.rule}`, color: TLK.inkDim, fontFamily: TLK_FONT.sans, fontSize: 12, fontWeight: 700, letterSpacing: 1, cursor: "pointer" }}
        >
          {showKo ? <EyeOff size={13} /> : <Eye size={13} />}
          {showKo ? "한글 숨기기 (K)" : "한글 보기 (K)"}
        </button>
      </div>
      <p
        className="text-center"
        style={{
          fontFamily: TLK_FONT.sans,
          fontSize: 13,
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
            fontSize: 42,
            fontStyle: "italic",
            fontWeight: 500,
            color: TLK.ink,
            lineHeight: 1.35,
            letterSpacing: -0.5,
          }}
        >
          “{qs[idx].en}”
        </p>
        {showKo && qs[idx].ko && (
          <p
            style={{
              position: "relative",
              fontFamily: TLK_FONT.ko,
              fontSize: 18,
              color: TLK.inkFaint,
              lineHeight: 1.5,
              marginTop: 14,
            }}
          >
            {qs[idx].ko}
          </p>
        )}
      </div>

      {/* 질문 네비게이션 — 이전/다음 + 도트 (질문 카드 바로 아래) */}
      <div className="flex items-center justify-center gap-4">
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
            fontSize: 14,
          }}
        >
          ← 이전 질문
        </button>
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
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          다음 질문 →
        </button>
      </div>

      {/* 발화자 PICK — 2페이지(Listen First)와 동일한 SpeakerCard */}
      <div>
        <div className="mb-2 flex items-center gap-1.5">
          <MessageCircle size={15} style={{ color: TLK.accent2 }} />
          <span style={{ fontFamily: TLK_FONT.sans, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: TLK.inkFaint, textTransform: "uppercase" }}>
            토론 발표자 · Whose turn?
          </span>
        </div>
        <SpeakerCard
          members={members}
          absentIds={absentIds}
          activeSpeaker={activeSpeaker}
          hasSpun={hasSpun}
          spinning={spinning}
          onSpin={onSpin}
          onToggleAttendance={onToggleAttendance}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   슬라이드 5 · 랩업
   ───────────────────────────────────────────── */

function WrapupSlide({ episode }: { episode: PodcastRow }) {
  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-6">
      <SlideHeader
        icon={CheckCircle}
        title="Wrap-up"
        subtitle="오늘 익힌 표현을 한눈에 복습하고 마무리해요"
      />

      {/* 오늘의 핵심 표현 — 엄선 강조 */}
      {episode.todays_picks.length > 0 && (
        <div>
          <p
            className="mb-3 text-center"
            style={{ fontFamily: TLK_FONT.sans, fontSize: 13, fontWeight: 700, letterSpacing: 2.5, color: TLK.inkFaint, textTransform: "uppercase" }}
          >
            오늘의 핵심 표현
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {episode.todays_picks.map((p, i) => (
              <div
                key={i}
                className="rounded-2xl px-6 py-5 text-center"
                style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}
              >
                <p style={{ fontFamily: TLK_FONT.mono, fontSize: 13, color: TLK.accent, letterSpacing: 1 }}>
                  {String(i + 1).padStart(2, "0")}
                </p>
                <p
                  style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 26, fontWeight: 500, color: TLK.ink, marginTop: 6, lineHeight: 1.3 }}
                >
                  {p}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 오늘 익힌 표현 전체 복습 */}
      {episode.key_expressions.length > 0 && (
        <div className="flex min-h-0 flex-1 flex-col">
          <p
            className="mb-3 text-center"
            style={{ fontFamily: TLK_FONT.sans, fontSize: 13, fontWeight: 700, letterSpacing: 2.5, color: TLK.inkFaint, textTransform: "uppercase" }}
          >
            오늘 익힌 표현 {episode.key_expressions.length}개
          </p>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="grid gap-2.5 sm:grid-cols-2">
              {episode.key_expressions.map((k, i) => (
                <div
                  key={i}
                  className="flex items-baseline gap-3 rounded-xl px-4 py-3"
                  style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}
                >
                  <span style={{ fontFamily: TLK_FONT.mono, fontSize: 12, color: TLK.inkFaint, flexShrink: 0 }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <p style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 18, color: TLK.ink, lineHeight: 1.35 }}>
                      {k.expression}
                    </p>
                    {k.meaning_ko && (
                      <p style={{ fontFamily: TLK_FONT.ko, fontSize: 14, color: TLK.inkDim, marginTop: 2 }}>
                        {k.meaning_ko}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 마무리 활동 — 말하기 (적기 X) */}
      <div
        className="shrink-0 rounded-2xl px-6 py-5 text-center"
        style={{ background: `${TLK.accent}0f`, border: `1px solid ${TLK.accent}33` }}
      >
        <div className="mb-1.5 flex items-center justify-center gap-2">
          <Mic size={16} style={{ color: TLK.accent }} />
          <span style={{ fontFamily: TLK_FONT.sans, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: TLK.accent, textTransform: "uppercase" }}>
            오늘의 마무리
          </span>
        </div>
        <p style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 22, color: TLK.ink, lineHeight: 1.4 }}>
          돌아가며 오늘 가장 기억에 남는 표현을 하나씩 말해보세요
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
          {episode.dialogue_title || episode.title}
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
          단축키 →
        </p>
      </div>
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
}: {
  episode: PodcastRow;
  completed: boolean;
  onComplete: (c: boolean) => void;
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
          오늘도 한 회차 무사히 마치셨네요. 다음 주 월요일에 또 만나요.
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
          {episode.dialogue_title || episode.title}
        </p>
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
