"use client";

// Talklish · 수요일 (OPIc) Stage — 콤보 시뮬레이션
//
// 5단계 phase:
//   0: Intro        — 안내 + 출석
//   1: 콤보 선택      — 카테고리/토픽 → 4문항 콤보 미리보기 → 시작
//   2: 진행          — 질문별 sub-step (룰렛→답변→코치노트→토론→다음)
//   3: 회고          — 4문항 한눈에 + 멤버별 한 줄 회고
//   4: Closing       — 마무리 + 세션 완료
//
// 진행자 시점 — 큰 모니터에 띄워놓고 ←/→로 단계 이동. R로 룰렛.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Play, Pause, ArrowRight,
  Sparkles, Users, CheckCircle, Undo2, NotebookPen, Mic, MicOff,
  Loader2, AlertCircle, Square, Volume2,
  Coffee, Clapperboard, Lightbulb,
} from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { useQuestionPlayer } from "@/lib/hooks/use-question-player";
import { getTopicsByCategory } from "@/lib/queries/master-questions";
import {
  fetchPanelMembers,
  fetchTalklishCombos,
  fetchTalklishCompletedSigs,
  markTalklishComboCompleted,
  unmarkTalklishComboCompleted,
  getOrGenerateTalklishGuide,
  getOrCreateTodaySession,
  saveTalklishAnswer,
  getTalklishSessionAnswers,
  listTalklishSessions,
} from "@/lib/actions/study-group";
import type { TalklishCombo, TalklishComboQuestion, TalklishAnswer } from "@/lib/actions/study-group";
import type { PanelMember } from "@/lib/types/study-group";
import { QUESTION_TYPE_LABELS } from "@/lib/types/reviews";
import { useRecorder } from "@/lib/hooks/use-recorder";
import { TLK, TLK_FONT } from "./tokens";
import { SpeakerCard } from "./speaker-card";
import { useSpeakerRoulette } from "./use-speaker-roulette";

// ── AI 코칭 결과 타입 (talklish-coach EF 응답) ──
interface CoachingResult {
  transcript: string;
  coaching: {
    summary: string;
    good_points: Array<{ quote: string; note: string }>;
    improve_points: Array<{ quote: string; issue: string; suggestion: string }>;
    upgrade_points: Array<{ tip: string; example?: string }>;
    next_speaker_tip: string;
  };
  cost_usd?: number;
  duration_sec?: number;
}

type CoachState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "coaching" }
  | { status: "done"; result: CoachingResult }
  | { status: "failed"; message: string };

type Category = "일반" | "롤플레이" | "어드밴스";
const CATEGORIES: Category[] = ["일반", "롤플레이", "어드밴스"];

const FLOW = [
  { id: 0, label: "Intro",       desc: "스터디 안내 + 출석",         range: "0–3"   },
  { id: 1, label: "콤보 선택",   desc: "카테고리/토픽 → 콤보",       range: "3–10"  },
  { id: 2, label: "진행",        desc: "발화자 룰렛 + 답변 + AI 코칭", range: "10–48" },
  { id: 3, label: "정리",        desc: "멤버별 답변·코칭 돌아보기",   range: "48–55" },
  { id: 4, label: "Closing",     desc: "마무리 + 세션 완료",         range: "55–60" },
] as const;

interface Props {
  focusMode: boolean;  // Full 모드 — 진행바를 헤더 가운데로 (일반 모드는 우측)
  absentIds: Set<string>;
  onToggleAttendance: (memberId: string) => void;
}

export function OpicStage({ focusMode, absentIds, onToggleAttendance }: Props) {
  const [view, setView] = useState<"menu" | "study" | "history">("menu");
  const [phase, setPhase] = useState(0);
  const [category, setCategory] = useState<Category>("일반");
  const [topic, setTopic] = useState<string | null>(null);
  const [selectedSig, setSelectedSig] = useState<string | null>(null); // 선택된 콤보 시그니처
  const [qIdx, setQIdx] = useState(0);             // 콤보 내 질문 인덱스 (0~N-1)
  // (룰렛 state는 useSpeakerRoulette 훅에서 관리)
  const [coachResults, setCoachResults] = useState<Record<string, CoachingResult>>({}); // questionId → AI 결과
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const { data: topics = [] } = useQuery({
    queryKey: ["study-topics", category],
    queryFn: () => getTopicsByCategory(category),
    staleTime: Infinity,
  });
  // 시험후기 SSOT 기반 실제 출제 콤보 (/opic-study/explore와 동일 데이터)
  const { data: combos = [] } = useQuery({
    queryKey: ["talklish-combos", category, topic],
    queryFn: () => fetchTalklishCombos({ category, topic: topic! }),
    enabled: !!topic,
    staleTime: 5 * 60 * 1000,
  });
  const { data: members = [] } = useQuery({
    queryKey: ["study-panel-members"],
    queryFn: fetchPanelMembers,
    staleTime: 5 * 60 * 1000,
  });
  // 본인이 완료한 콤보 시그니처 Set — ComboPickerPhase 뱃지용
  const queryClient = useQueryClient();
  const { data: completedSigs = [] } = useQuery({
    queryKey: ["talklish-completed-sigs"],
    queryFn: fetchTalklishCompletedSigs,
    staleTime: 60 * 1000,
  });
  const completedSigSet = useMemo(() => new Set(completedSigs), [completedSigs]);

  const selectedCombo = useMemo(
    () => combos.find((c) => c.sig === selectedSig) ?? null,
    [combos, selectedSig],
  );
  const combo = selectedCombo?.questions ?? [];

  const presentMembers = useMemo(
    () => members.filter((m) => !absentIds.has(m.id)),
    [members, absentIds],
  );

  // 공통 발화자 룰렛 — 한 라운드 = 출석자 전원 한 번씩 (월·수·금 동일 동작)
  // hasSpun=false 일 때 speaker=undefined → 초기엔 아무도 안 뽑힌 상태
  const { activeSpeaker, hasSpun, speaker, spinning, spin, resetRound } = useSpeakerRoulette({
    members,
    presentMembers,
  });

  const goPhase = useCallback((next: number) => {
    setPhase(Math.max(0, Math.min(FLOW.length - 1, next)));
  }, []);

  // 키보드 단축키
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target;
      if (t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowRight") { e.preventDefault(); goPhase(phase + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); goPhase(phase - 1); }
      else if (e.key === "r" || e.key === "R") {
        if (phase === 2) { e.preventDefault(); spin(); }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, goPhase, spin]);

  // 수요일 진입 → 메뉴 (오늘의 스터디 / 히스토리)
  if (view === "menu") {
    return <WedMenu onStudy={() => setView("study")} onHistory={() => setView("history")} />;
  }
  if (view === "history") {
    return <HistoryView members={members} onBack={() => setView("menu")} />;
  }

  return (
    <div
      className="flex h-full flex-col"
      style={{ background: TLK.bg, color: TLK.ink, fontFamily: TLK_FONT.ko }}
    >
      {/* ── 헤더: phase 도트 ── */}
      <header
        className="relative flex shrink-0 items-center gap-4 border-b px-6 py-3.5 sm:px-10"
        style={{ borderColor: TLK.rule, background: TLK.bg }}
      >
        <div className="min-w-0 max-w-md flex-1">
          <p
            className="truncate"
            style={{
              fontFamily: TLK_FONT.serif,
              fontStyle: "italic",
              fontSize: 16,
              fontWeight: 500,
              color: TLK.ink,
            }}
          >
            {FLOW[phase].label}
          </p>
          <p style={{ fontFamily: TLK_FONT.sans, fontSize: 10.5, color: TLK.inkFaint, marginTop: 2, letterSpacing: 0.5 }}>
            {FLOW[phase].desc}
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
            {String(phase + 1).padStart(2, "0")} / 0{FLOW.length}
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
      </header>

      {/* ── 본문 ── */}
      <main className="relative flex-1 overflow-hidden">
        <div
          key={`opic-phase-${phase}`}
          className="absolute inset-0 overflow-y-auto"
          style={{ animation: "tlk-fade .35s ease-out" }}
        >
          <div className={`mx-auto h-full px-6 py-6 sm:px-10 sm:py-10 ${phase === 2 ? "max-w-[1800px]" : "max-w-6xl"}`}>
            {phase === 0 && <IntroPhase members={members} absentIds={absentIds} />}
            {phase === 1 && (
              <ComboPickerPhase
                category={category}
                topics={topics}
                topic={topic}
                combos={combos}
                selectedSig={selectedSig}
                completedSigSet={completedSigSet}
                onCategoryChange={(c) => { setCategory(c); setTopic(null); setSelectedSig(null); setQIdx(0); }}
                onTopicChange={(t) => { setTopic(t); setSelectedSig(null); setQIdx(0); }}
                onSelectCombo={(sig) => { setSelectedSig(sig); setQIdx(0); }}
                onStart={async () => {
                  // 진행 진입 시 오늘 세션 확보 (하루 1세션)
                  if (!sessionId) {
                    const res = await getOrCreateTodaySession();
                    if (res.success && res.data) setSessionId(res.data.id);
                  }
                  setQIdx(0);
                  setPhase(2);
                }}
              />
            )}
            {phase === 2 && (
              <RunPhase
                combo={combo}
                sig={selectedSig}
                qIdx={qIdx}
                setQIdx={setQIdx}
                members={members}
                absentIds={absentIds}
                onToggleAttendance={onToggleAttendance}
                activeSpeaker={activeSpeaker}
                speaker={speaker}
                hasSpun={hasSpun}
                spinning={spinning}
                onSpin={spin}
                coachResults={coachResults}
                onSaveCoachResult={(qid, result, audioPath) => {
                  // 질문 × 멤버 키로 저장 (한 질문을 출석 전원이 돌아가며 답변)
                  if (speaker) setCoachResults((p) => ({ ...p, [`${qid}__${speaker.id}`]: result }));
                  // DB 저장 — 발표자·세션이 있을 때 (룰렛 발표자 기준)
                  if (sessionId && speaker) {
                    const q = combo.find((x) => x.id === qid);
                    void saveTalklishAnswer({
                      session_id: sessionId,
                      panel_member_id: speaker.id,
                      user_id: speaker.user_id,
                      combo_sig: selectedSig ?? "",
                      category,
                      topic,
                      question_id: qid,
                      question_idx: combo.findIndex((x) => x.id === qid),
                      question_type: q?.question_type ?? null,
                      question_english: q?.question_english ?? null,
                      question_korean: q?.question_korean ?? null,
                      audio_url: audioPath,
                      transcript: result.transcript,
                      coaching: result.coaching,
                    });
                  }
                }}
                category={category}
                topic={topic}
                onGoRecap={() => setPhase(3)}
                onResetRound={resetRound}
              />
            )}
            {phase === 3 && (
              <RecapPhase sessionId={sessionId} members={members} />
            )}
            {phase === 4 && (
              <ClosingPhase
                combo={combo}
                completed={sessionCompleted}
                alreadyCompleted={selectedSig ? completedSigSet.has(selectedSig) : false}
                topic={topic}
                category={category}
                onComplete={async (c) => {
                  if (!selectedSig || !topic) {
                    toast.error("선택된 콤보 정보가 없어요");
                    return;
                  }
                  // optimistic — UI 즉시 반영, 실패 시 롤백
                  setSessionCompleted(c);
                  const res = c
                    ? await markTalklishComboCompleted({
                        combo_sig: selectedSig,
                        category,
                        topic,
                      })
                    : await unmarkTalklishComboCompleted(selectedSig);

                  if (!res.success) {
                    setSessionCompleted(!c);
                    toast.error(
                      c
                        ? `완료 표시 실패 — ${res.error ?? "다시 시도해 주세요"}`
                        : `완료 취소 실패 — ${res.error ?? "다시 시도해 주세요"}`
                    );
                    return;
                  }

                  toast.success(
                    c
                      ? `'${topic}' 콤보 완료 표시했어요 ✓`
                      : `'${topic}' 콤보 완료 취소했어요`
                  );
                  queryClient.invalidateQueries({ queryKey: ["talklish-completed-sigs"] });
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
                  title={absent ? `${m.name} 결석` : `${m.name} 출석`}
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
            {FLOW[phase].range} min
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
            {FLOW[phase].label}
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

/* ─── Phase 0 · Intro ─────────────────── */

/* ─── 세션 날짜 포맷 (YYYY-MM-DD → N월 N일) ─── */
function fmtSessionDate(d: string): string {
  const parts = d.split("-").map(Number);
  if (parts.length !== 3) return d;
  return `${parts[0]}년 ${parts[1]}월 ${parts[2]}일`;
}

/* ─── 수요일 진입 메뉴 — 오늘의 스터디 / 히스토리 ─── */
function WedMenu({ onStudy, onHistory }: { onStudy: () => void; onHistory: () => void }) {
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-9 px-6"
      style={{ background: TLK.bg, color: TLK.ink, fontFamily: TLK_FONT.ko }}
    >
      <div className="text-center">
        <h1 style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 42, fontWeight: 500, color: TLK.ink, lineHeight: 1.1 }}>
          Wednesday · OPIc
        </h1>
        <p style={{ fontFamily: TLK_FONT.ko, fontSize: 15, color: TLK.inkDim, marginTop: 8 }}>
          오늘 무엇을 할까요?
        </p>
      </div>
      <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={onStudy}
          className="flex flex-col items-start gap-3 rounded-3xl px-7 py-7 text-left transition-all hover:-translate-y-0.5"
          style={{ background: TLK.accent, color: "#fff", border: 0, cursor: "pointer" }}
        >
          <Sparkles size={26} />
          <span style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 24, fontWeight: 500 }}>오늘의 스터디</span>
          <span style={{ fontFamily: TLK_FONT.ko, fontSize: 13, opacity: 0.9, lineHeight: 1.5 }}>
            콤보 선택 → AI 가이드 → 발표·코칭 → 정리
          </span>
        </button>
        <button
          type="button"
          onClick={onHistory}
          className="flex flex-col items-start gap-3 rounded-3xl px-7 py-7 text-left transition-all hover:-translate-y-0.5"
          style={{ background: TLK.paper, color: TLK.ink, border: `1px solid ${TLK.rule}`, cursor: "pointer" }}
        >
          <NotebookPen size={26} style={{ color: TLK.accent }} />
          <span style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 24, fontWeight: 500 }}>스터디 히스토리</span>
          <span style={{ fontFamily: TLK_FONT.ko, fontSize: 13, color: TLK.inkDim, lineHeight: 1.5 }}>
            지난 세션 · 멤버별 발화 · AI 평가 다시 보기
          </span>
        </button>
      </div>
    </div>
  );
}

/* ─── 스터디 히스토리 — 세션 목록 → 멤버별 답변·코칭 ─── */
function HistoryView({ members, onBack }: { members: PanelMember[]; onBack: () => void }) {
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["talklish-sessions"],
    queryFn: listTalklishSessions,
    staleTime: 30 * 1000,
  });
  const [selId, setSelId] = useState<string | null>(null);
  const selSession = sessions.find((s) => s.id === selId) ?? null;

  return (
    <div className="flex h-full flex-col" style={{ background: TLK.bg, color: TLK.ink, fontFamily: TLK_FONT.ko }}>
      <header
        className="flex shrink-0 items-center gap-3 border-b px-6 py-3.5 sm:px-10"
        style={{ borderColor: TLK.rule, background: TLK.bg }}
      >
        <button
          type="button"
          onClick={selId ? () => setSelId(null) : onBack}
          className="flex items-center gap-1 rounded-full px-3 py-1.5"
          style={{ background: TLK.bg2, border: `1px solid ${TLK.rule}`, color: TLK.inkDim, fontFamily: TLK_FONT.sans, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
        >
          <ChevronLeft size={14} />
          {selId ? "목록" : "메뉴"}
        </button>
        <p style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 18, color: TLK.ink }}>
          {selSession ? fmtSessionDate(selSession.session_date) : "스터디 히스토리"}
        </p>
      </header>

      <main className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 overflow-y-auto">
          <div className="mx-auto flex h-full max-w-5xl flex-col px-6 py-6 sm:px-10">
            {selSession ? (
              <SessionAnswersView sessionId={selSession.id} members={members} />
            ) : isLoading ? (
              <div className="flex flex-1 items-center justify-center gap-2" style={{ color: TLK.inkDim }}>
                <Loader2 size={18} className="animate-spin" />
                <span style={{ fontFamily: TLK_FONT.ko, fontSize: 14 }}>불러오는 중…</span>
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-1 items-center justify-center">
                <p style={{ fontFamily: TLK_FONT.ko, fontSize: 14, color: TLK.inkFaint }}>아직 진행한 스터디가 없어요</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelId(s.id)}
                    className="flex items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left transition-all hover:-translate-y-0.5"
                    style={{ background: TLK.paper, border: `1px solid ${TLK.rule}`, cursor: "pointer" }}
                  >
                    <div className="min-w-0">
                      <p style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 18, color: TLK.ink }}>
                        {fmtSessionDate(s.session_date)}
                      </p>
                      <p style={{ fontFamily: TLK_FONT.ko, fontSize: 12.5, color: TLK.inkDim, marginTop: 2 }}>
                        {s.topics.length > 0 ? s.topics.join(" · ") : "주제 없음"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span style={{ fontFamily: TLK_FONT.sans, fontSize: 11, color: TLK.inkFaint }}>
                        콤보 {s.combo_count} · 답변 {s.answer_count}
                      </span>
                      <ChevronRight size={16} style={{ color: TLK.inkFaint }} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function IntroPhase({
  members,
  absentIds,
}: {
  members: PanelMember[];
  absentIds: Set<string>;
}) {
  const present = members.filter((m) => !absentIds.has(m.id));
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
        Wednesday · OPIc Mock Studio
      </p>
      <h1
        style={{
          fontFamily: TLK_FONT.serif,
          fontStyle: "italic",
          fontSize: 64,
          fontWeight: 500,
          color: TLK.ink,
          lineHeight: 1.1,
          letterSpacing: -1.5,
          textAlign: "center",
          maxWidth: 900,
        }}
      >
        오늘은 콤보 하나로<br />같이 시험을 풀어봐요.
      </h1>
      <p
        style={{
          fontFamily: TLK_FONT.ko,
          fontSize: 16,
          color: TLK.inkDim,
          lineHeight: 1.6,
          maxWidth: 700,
          textAlign: "center",
        }}
      >
        한 콤보의 질문들을 룰렛으로 돌려가며 답하고, 답변이 끝나면 AI가 코치 노트를 정리해줘요. 출석 멤버가 모두 돌아가며 같은 질문에 답한 뒤 다음 질문으로 넘어갑니다.
      </p>
      <div className="flex items-center gap-3 rounded-full px-5 py-3" style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}>
        <Users size={18} style={{ color: TLK.accent2 }} />
        <span style={{ fontFamily: TLK_FONT.sans, fontSize: 14, fontWeight: 600, color: TLK.ink }}>
          출석 <strong style={{ color: TLK.accent2 }}>{present.length}</strong> / {members.length}
        </span>
      </div>
      <p
        className="animate-pulse"
        style={{
          fontFamily: TLK_FONT.serif,
          fontStyle: "italic",
          fontSize: 18,
          color: TLK.inkFaint,
          marginTop: 8,
        }}
      >
        준비되시면 →
      </p>
    </div>
  );
}

/* ─── Phase 1 · 콤보 선택 (BM: /opic-study Step2/Step3) ───
 *
 * 1) 카테고리 큰 카드 3개 (일반/롤플레이/어드밴스 — 아이콘+문제번호+설명)
 * 2) 카테고리 선택 시 → 토픽 그리드 카드 자동 노출 (빈도 meta 포함)
 * 3) 토픽 선택 시 → 콤보 묶음 칩 + 4문항 미리보기 자동 노출
 */

const CATEGORY_META: Record<Category, { questions: string; desc: string }> = {
  "일반":     { questions: "2~10번 문제", desc: "일상·습관·선호" },
  "롤플레이": { questions: "11~13번 문제", desc: "상황극·문제해결" },
  "어드밴스": { questions: "14~15번 문제", desc: "비교·변화·의견" },
};

// 카테고리 아이콘 매핑 — /opic-study Step2와 동일 (Coffee/Clapperboard/Lightbulb)
const CATEGORY_ICON: Record<Category, React.ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: boolean }>> = {
  "일반": Coffee,
  "롤플레이": Clapperboard,
  "어드밴스": Lightbulb,
};

interface TopicMeta {
  topic: string;
  count: number;
  frequency: number;
  survey_type: string | null;
}

function ComboPickerPhase({
  category,
  topics,
  topic,
  combos,
  selectedSig,
  completedSigSet,
  onCategoryChange,
  onTopicChange,
  onSelectCombo,
  onStart,
}: {
  category: Category;
  topics: TopicMeta[];
  topic: string | null;
  combos: TalklishCombo[];
  selectedSig: string | null;
  completedSigSet: Set<string>;
  onCategoryChange: (c: Category) => void;
  onTopicChange: (t: string) => void;
  onSelectCombo: (sig: string) => void;
  onStart: () => void;
}) {
  const selectedCombo = combos.find((c) => c.sig === selectedSig) ?? null;
  const combo = selectedCombo?.questions ?? [];

  return (
    <div className="flex h-full flex-col gap-7">
      {/* ── 헤더 ── */}
      <div>
        <p
          style={{
            fontFamily: TLK_FONT.sans,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 2.5,
            color: TLK.inkFaint,
            textTransform: "uppercase",
          }}
        >
          Step 1 / 2 · Category
        </p>
        <h2
          style={{
            fontFamily: TLK_FONT.serif,
            fontStyle: "italic",
            fontSize: 36,
            fontWeight: 500,
            color: TLK.ink,
            lineHeight: 1.15,
            marginTop: 4,
            letterSpacing: -0.5,
          }}
        >
          어떤 카테고리로 시작할까요?
        </h2>
      </div>

      {/* ── 카테고리 카드 3개 ── */}
      <div className="grid gap-3 md:grid-cols-3">
        {CATEGORIES.map((c) => {
          const selected = category === c;
          const meta = CATEGORY_META[c];
          return (
            <button
              key={c}
              type="button"
              onClick={() => onCategoryChange(c)}
              className="relative flex flex-col items-start rounded-2xl px-5 py-5 text-left transition-all hover:-translate-y-0.5"
              style={{
                background: selected ? `${TLK.accent}0d` : TLK.paper,
                border: `1.5px solid ${selected ? TLK.accent : TLK.rule}`,
                boxShadow: selected ? `0 0 0 4px ${TLK.accent}1a` : "none",
                cursor: "pointer",
              }}
            >
              {/* 체크 */}
              {selected && (
                <span
                  aria-hidden="true"
                  className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full"
                  style={{
                    background: TLK.accent,
                    color: "#fff",
                    fontFamily: TLK_FONT.sans,
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  ✓
                </span>
              )}

              {/* 아이콘 — /opic-study Step2와 동일 (Lucide) */}
              <div
                className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  background: selected ? TLK.accent : TLK.bg2,
                  color: selected ? "#fff" : TLK.inkDim,
                }}
              >
                {(() => {
                  const Icon = CATEGORY_ICON[c];
                  return <Icon size={22} strokeWidth={1.6} aria-hidden />;
                })()}
              </div>

              {/* 이름 + 문제번호 */}
              <div className="mb-1.5 flex items-baseline gap-2">
                <span
                  style={{
                    fontFamily: TLK_FONT.serif,
                    fontStyle: "italic",
                    fontSize: 22,
                    fontWeight: 500,
                    color: TLK.ink,
                  }}
                >
                  {c}
                </span>
                <span
                  style={{
                    fontFamily: TLK_FONT.sans,
                    fontSize: 11,
                    color: TLK.inkFaint,
                    letterSpacing: 0.3,
                  }}
                >
                  {meta.questions}
                </span>
              </div>

              {/* 설명 */}
              <p
                style={{
                  fontFamily: TLK_FONT.ko,
                  fontSize: 13,
                  color: TLK.inkDim,
                  lineHeight: 1.55,
                  margin: 0,
                }}
              >
                {meta.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* ── 토픽 그리드 (카테고리 선택 후 자동 노출) ── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mb-4 flex items-baseline justify-between">
          <div>
            <p
              style={{
                fontFamily: TLK_FONT.sans,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 2.5,
                color: TLK.inkFaint,
                textTransform: "uppercase",
              }}
            >
              Step 2 / 2 · Topic
            </p>
            <h3
              style={{
                fontFamily: TLK_FONT.serif,
                fontStyle: "italic",
                fontSize: 22,
                fontWeight: 500,
                color: TLK.ink,
                lineHeight: 1.2,
                marginTop: 4,
                letterSpacing: -0.3,
              }}
            >
              오늘 어떤 주제로?
            </h3>
            <p
              style={{
                fontFamily: TLK_FONT.ko,
                fontSize: 12.5,
                color: TLK.inkFaint,
                marginTop: 4,
              }}
            >
              빈도 높은 주제일수록 시험에 자주 나와요.
            </p>
          </div>
        </div>

        {topics.length === 0 ? (
          <div
            className="flex items-center justify-center py-16"
            style={{ color: TLK.inkFaint }}
          >
            <p
              style={{
                fontFamily: TLK_FONT.serif,
                fontStyle: "italic",
                fontSize: 18,
              }}
            >
              해당 카테고리의 토픽을 불러오는 중…
            </p>
          </div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {topics.map((t) => {
              const selected = topic === t.topic;
              const freqLabel = t.frequency > 0 ? `빈도 ${t.frequency}회` : `질문 ${t.count}개`;
              return (
                <button
                  key={t.topic}
                  type="button"
                  onClick={() => onTopicChange(t.topic)}
                  className="flex flex-col rounded-xl px-3.5 py-3 text-left transition-all"
                  style={{
                    background: selected ? `${TLK.accent}0d` : TLK.paper,
                    border: `1.5px solid ${selected ? TLK.accent : TLK.rule}`,
                    boxShadow: selected ? `0 0 0 4px ${TLK.accent}14` : "none",
                    cursor: "pointer",
                  }}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span
                      style={{
                        fontFamily: TLK_FONT.sans,
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: TLK.ink,
                        lineHeight: 1.2,
                      }}
                    >
                      {t.topic}
                    </span>
                    {selected && (
                      <span
                        aria-hidden="true"
                        style={{
                          color: TLK.accent,
                          fontFamily: TLK_FONT.sans,
                          fontSize: 13,
                          fontWeight: 800,
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </div>
                  <span
                    style={{
                      fontFamily: TLK_FONT.sans,
                      fontSize: 11,
                      color: t.frequency > 0 ? TLK.accent : TLK.inkFaint,
                      letterSpacing: 0.3,
                      fontWeight: t.frequency > 0 ? 600 : 400,
                    }}
                  >
                    {freqLabel}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* 콤보 카드 리스트 (토픽 선택 시 자동 노출) — /opic-study/explore 패턴 */}
        {topic && combos.length > 0 && (
          <div className="mt-6">
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
              실제 출제 콤보 ({combos.length}개) — 빈도순
            </p>
            <div className="space-y-2.5">
              {combos.map((c, ci) => {
                const isSelected = selectedSig === c.sig;
                const isCompleted = completedSigSet.has(c.sig);
                return (
                  <button
                    key={c.sig}
                    type="button"
                    onClick={() => onSelectCombo(c.sig)}
                    className="w-full rounded-2xl px-5 py-4 text-left transition-all hover:-translate-y-0.5"
                    style={{
                      background: isSelected
                        ? `${TLK.accent}0d`
                        : isCompleted
                          ? `${TLK.accent2}08`
                          : TLK.paper,
                      border: `1.5px solid ${
                        isSelected ? TLK.accent : isCompleted ? `${TLK.accent2}66` : TLK.rule
                      }`,
                      boxShadow: isSelected ? `0 0 0 4px ${TLK.accent}14` : "none",
                      cursor: "pointer",
                    }}
                  >
                    {/* 헤더 — 콤보 번호 + 빈도 + 등장률 + 완료 뱃지 */}
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="flex h-7 w-7 items-center justify-center rounded-full"
                          style={{
                            background: isSelected ? TLK.accent : TLK.bg2,
                            color: isSelected ? "#fff" : TLK.inkDim,
                            fontFamily: TLK_FONT.sans,
                            fontSize: 11,
                            fontWeight: 800,
                          }}
                        >
                          {ci + 1}
                        </span>
                        <span
                          style={{
                            fontFamily: TLK_FONT.sans,
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: 1,
                            color: TLK.accent,
                            textTransform: "uppercase",
                          }}
                        >
                          {c.frequency}회 · {c.appearance_pct}%
                        </span>
                        <span style={{ fontFamily: TLK_FONT.sans, fontSize: 11, color: TLK.inkFaint }}>
                          ({c.total_in_category}개 중)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isCompleted && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
                            style={{
                              background: `${TLK.accent2}1f`,
                              color: TLK.accent2,
                              fontFamily: TLK_FONT.sans,
                              fontSize: 10,
                              fontWeight: 800,
                              letterSpacing: 1,
                              textTransform: "uppercase",
                            }}
                          >
                            <CheckCircle size={11} />
                            완료
                          </span>
                        )}
                        {isSelected && (
                          <span
                            aria-hidden="true"
                            style={{ color: TLK.accent, fontFamily: TLK_FONT.sans, fontSize: 14, fontWeight: 800 }}
                          >
                            ✓
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 콤보 안 질문 미리보기 */}
                    <div className="grid gap-2 md:grid-cols-2">
                      {c.questions.map((q, qi) => (
                        <div
                          key={q.id}
                          className="rounded-lg px-3 py-2"
                          style={{ background: TLK.bg2 }}
                        >
                          <div className="mb-1 flex items-center gap-1.5">
                            <span
                              style={{
                                fontFamily: TLK_FONT.mono,
                                fontSize: 10,
                                fontWeight: 700,
                                color: TLK.accent,
                              }}
                            >
                              Q{qi + 1}
                            </span>
                            <span
                              style={{
                                fontFamily: TLK_FONT.sans,
                                fontSize: 9,
                                fontWeight: 700,
                                letterSpacing: 0.8,
                                color: TLK.inkFaint,
                                textTransform: "uppercase",
                              }}
                            >
                              {q.question_type_kor ??
                                QUESTION_TYPE_LABELS[q.question_type as keyof typeof QUESTION_TYPE_LABELS] ??
                                q.question_type}
                            </span>
                          </div>
                          <p
                            className="line-clamp-2"
                            style={{
                              fontFamily: TLK_FONT.ko,
                              fontSize: 12,
                              color: TLK.ink,
                              lineHeight: 1.45,
                            }}
                          >
                            {q.question_short ?? q.question_korean ?? q.question_english}
                          </p>
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {topic && combos.length === 0 && (
          <div className="mt-10 text-center">
            <p
              style={{
                fontFamily: TLK_FONT.serif,
                fontStyle: "italic",
                fontSize: 18,
                color: TLK.inkFaint,
              }}
            >
              이 토픽 + 카테고리에 실제 출제된 콤보가 없어요
            </p>
            <p
              style={{
                fontFamily: TLK_FONT.sans,
                fontSize: 12,
                color: TLK.inkFaint,
                marginTop: 6,
              }}
            >
              시험후기가 더 쌓이면 표시됩니다. 다른 토픽을 골라보세요.
            </p>
          </div>
        )}
      </div>

      {/* 시작 버튼 */}
      {combo.length > 0 && (
        <div className="text-center">
          <button
            type="button"
            onClick={onStart}
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
            <Sparkles size={16} />
            이 콤보로 시작
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Phase 2 · 진행 ──────── */

function RunPhase({
  combo,
  qIdx,
  setQIdx,
  members,
  absentIds,
  onToggleAttendance,
  activeSpeaker,
  speaker,
  hasSpun,
  spinning,
  onSpin,
  coachResults,
  onSaveCoachResult,
  category,
  topic,
  onGoRecap,
  onResetRound,
  sig,
}: {
  combo: TalklishComboQuestion[];
  qIdx: number;
  setQIdx: (n: number) => void;
  members: PanelMember[];
  absentIds: Set<string>;
  onToggleAttendance: (id: string) => void;
  activeSpeaker: number;
  speaker: PanelMember | undefined;
  hasSpun: boolean;
  spinning: boolean;
  onSpin: () => void;
  coachResults: Record<string, CoachingResult>;
  onSaveCoachResult: (qid: string, result: CoachingResult, audioPath: string) => void;
  category: Category;
  topic: string | null;
  onGoRecap: () => void;
  onResetRound: () => void;
  sig: string | null;
}) {
  const q = combo[qIdx];
  const isLast = qIdx === combo.length - 1;

  // 질문 × 멤버 매트릭스 — 현재 질문에 출석 전원이 답변했는지
  const presentMembers = members.filter((m) => !absentIds.has(m.id));
  const answeredCount = q
    ? presentMembers.filter((m) => coachResults[`${q.id}__${m.id}`]).length
    : 0;
  const allAnswered = presentMembers.length > 0 && answeredCount >= presentMembers.length;

  // 현재 질문 가이드 — 가이드 phase에서 만든 캐시 재사용 (queryKey 공유)
  const { data: comboGuide } = useQuery({
    queryKey: ["talklish-guide", sig],
    queryFn: async () => {
      const res = await getOrGenerateTalklishGuide({
        sig: sig!,
        question_ids: combo.map((c) => c.id),
        topic: topic ?? "",
        category,
      });
      if (!res.success || !res.data) throw new Error(res.error || "가이드 로드 실패");
      return res.data;
    },
    enabled: !!sig,
    staleTime: Infinity,
  });
  const currentGuide =
    comboGuide?.questions.find((x) => x.question_idx === qIdx) ?? comboGuide?.questions[qIdx];

  if (!q) {
    return (
      <div className="flex h-full items-center justify-center">
        <p style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 22, color: TLK.inkFaint }}>
          콤보가 비어있어요 — 이전 단계로
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* 콤보 진행 표시 (3단 위 · 가운데) */}
      <div className="flex shrink-0 items-center justify-center gap-3">
        <span style={{ fontFamily: TLK_FONT.sans, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: TLK.inkFaint, textTransform: "uppercase" }}>
          Q {qIdx + 1} / {combo.length}
        </span>
        <div className="flex gap-1.5">
          {combo.map((_, n) => {
            const active = n === qIdx;
            const past = n < qIdx;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setQIdx(n)}
                aria-label={`질문 ${n + 1}로 이동`}
                style={{
                  width: active ? 24 : 8,
                  height: 8,
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

      <div className="grid min-h-0 flex-1 gap-6" style={{ gridTemplateColumns: "minmax(320px, 1fr) 1.6fr minmax(320px, 1fr)" }}>
      {/* 좌 — 현재 질문 답변 가이드 */}
      <div
        className="flex min-h-0 flex-col gap-3 rounded-2xl px-4 py-4"
        style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}
      >
        <div className="flex items-center gap-1.5">
          <Lightbulb size={15} style={{ color: TLK.accent }} />
          <span style={{ fontFamily: TLK_FONT.sans, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: TLK.inkFaint, textTransform: "uppercase" }}>
            답변 가이드
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {currentGuide ? (
            <div className="flex flex-col gap-3.5">
              {currentGuide.type_label && (
                <span className="self-start rounded-full px-2.5 py-0.5" style={{ background: TLK.bg2, color: TLK.inkDim, fontFamily: TLK_FONT.sans, fontSize: 11, fontWeight: 700 }}>
                  {currentGuide.type_label}
                </span>
              )}
              {currentGuide.answer_flow && currentGuide.answer_flow.length > 0 && (
                <div>
                  <p style={{ fontFamily: TLK_FONT.sans, fontSize: 9.5, fontWeight: 700, letterSpacing: 1, color: TLK.inkFaint, textTransform: "uppercase", marginBottom: 5 }}>
                    이렇게 답해요
                  </p>
                  <div className="flex flex-col gap-1">
                    {currentGuide.answer_flow.map((s, n) => (
                      <p key={n} style={{ fontFamily: TLK_FONT.ko, fontSize: 13, color: TLK.ink, lineHeight: 1.5 }}>
                        {n + 1}. {s}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              {currentGuide.vocab && currentGuide.vocab.length > 0 && (
                <div>
                  <p style={{ fontFamily: TLK_FONT.sans, fontSize: 9.5, fontWeight: 700, letterSpacing: 1, color: TLK.inkFaint, textTransform: "uppercase", marginBottom: 5 }}>
                    추천 표현
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {currentGuide.vocab.map((v, n) => (
                      <div key={n} className="flex flex-col">
                        <span style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 13.5, color: TLK.ink }}>
                          {v.en}
                        </span>
                        <span style={{ fontFamily: TLK_FONT.ko, fontSize: 11.5, color: TLK.inkDim }}>
                          {v.ko}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {currentGuide.example && (
                <div className="rounded-lg px-3 py-2.5" style={{ background: `${TLK.accent}0f`, border: `1px solid ${TLK.accent}26` }}>
                  <p style={{ fontFamily: TLK_FONT.sans, fontSize: 9.5, fontWeight: 700, letterSpacing: 1, color: TLK.accent, textTransform: "uppercase", marginBottom: 3 }}>
                    예시
                  </p>
                  <p style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 13, color: TLK.ink, lineHeight: 1.45 }}>
                    “{currentGuide.example}”
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p style={{ fontFamily: TLK_FONT.ko, fontSize: 12, color: TLK.inkFaint }}>
              가이드를 불러오는 중…
            </p>
          )}
        </div>
      </div>

      {/* 가운데 — 메인 콘텐츠 */}
      <div className="flex min-h-0 flex-col gap-4">
        {/* 질문 카드 */}
        <div
          className="rounded-2xl px-7 py-6"
          style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}
        >
          {q.question_type && (
            <p
              style={{
                fontFamily: TLK_FONT.sans,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1.5,
                color: TLK.accent,
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              {QUESTION_TYPE_LABELS[q.question_type as keyof typeof QUESTION_TYPE_LABELS] ?? q.question_type}
            </p>
          )}
          <p
            style={{
              fontFamily: TLK_FONT.serif,
              fontStyle: "italic",
              fontSize: 24,
              fontWeight: 500,
              color: TLK.ink,
              lineHeight: 1.4,
              letterSpacing: -0.3,
            }}
          >
            {q.question_english}
          </p>
          {q.question_korean && (
            <p
              style={{
                fontFamily: TLK_FONT.ko,
                fontSize: 13,
                color: TLK.inkDim,
                lineHeight: 1.55,
                marginTop: 8,
              }}
            >
              {q.question_korean}
            </p>
          )}
        </div>

        {/* 발화 흐름 — 발표자 선정 → 녹음 → 자동 코칭 → 코치노트 → 다음 (탭 없는 단일 흐름) */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <AnswerPanel
            key={`${q.id}-${speaker?.id ?? "none"}`}
            speaker={speaker}
            questionId={q.id}
            questionEnglish={q.question_english ?? ""}
            questionKorean={q.question_korean ?? undefined}
            questionType={q.question_type ?? undefined}
            category={category}
            topic={topic ?? undefined}
            questionAudioUrl={q.audio_url ?? undefined}
            initialResult={speaker ? coachResults[`${q.id}__${speaker.id}`] : undefined}
            onCoachingDone={(result, audioPath) => onSaveCoachResult(q.id, result, audioPath)}
            onNext={() => {
              if (allAnswered) {
                // 출석 전원 답변 완료 → 다음 질문 (마지막이면 회고)
                if (isLast) onGoRecap();
                else {
                  onResetRound();
                  setQIdx(qIdx + 1);
                }
              } else {
                // 아직 남은 멤버 → 룰렛으로 다음 발표자 (같은 질문)
                onSpin();
              }
            }}
            nextLabel={
              allAnswered
                ? isLast
                  ? "정리 화면으로"
                  : `다음 질문 (Q${qIdx + 2})`
                : "다음 발표자 뽑기"
            }
          />
        </div>
      </div>

      {/* 우 — SpeakerCard (룰렛) */}
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

function AnswerPanel({
  speaker,
  questionId,
  questionEnglish,
  questionKorean,
  questionType,
  category,
  topic,
  questionAudioUrl,
  initialResult,
  onCoachingDone,
  onNext,
  nextLabel,
}: {
  speaker: { name: string; emoji: string; color: string } | undefined;
  questionId: string;
  questionEnglish: string;
  questionKorean?: string;
  questionType?: string;
  category: Category;
  topic?: string;
  questionAudioUrl?: string;
  initialResult?: CoachingResult;
  onCoachingDone: (r: CoachingResult, audioPath: string) => void;
  onNext: () => void;
  nextLabel: string;
}) {
  const recorder = useRecorder({ maxDuration: 180, minDuration: 1 });
  // 재방문(부모 coachResults에 이미 결과 있음) 시 코치노트 바로 표시
  const [coachState, setCoachState] = useState<CoachState>(
    initialResult ? { status: "done", result: initialResult } : { status: "idle" }
  );

  // 질문 재생 → 끝나면 자동 녹음 시작 (모의고사 패턴 · 5초 다시듣기 윈도우)
  const autoStartRecording = useCallback(() => {
    if (recorder.state === "idle" && coachState.status === "idle") recorder.startRecording();
  }, [recorder, coachState.status]);
  const questionPlayer = useQuestionPlayer({ replayWindowSeconds: 5, onPlaybackEnded: autoStartRecording });
  const handleReplay = useCallback(() => {
    if (!questionPlayer.canReplay || questionPlayer.hasReplayed) return;
    if (recorder.state === "recording") recorder.reset(); // 다시 들으면 녹음 리셋 → 재생 후 자동 재시작
    questionPlayer.replay();
  }, [questionPlayer, recorder]);
  const supabaseRef = useRef<ReturnType<typeof createBrowserClient> | null>(null);
  const lastProcessedBlob = useRef<Blob | null>(null);

  // supabase client lazy 초기화
  if (!supabaseRef.current) {
    supabaseRef.current = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }

  // 녹음 종료 → Storage 업로드 + EF 호출
  useEffect(() => {
    const blob = recorder.audioBlob;
    if (!blob || blob === lastProcessedBlob.current) return;
    if (coachState.status === "uploading" || coachState.status === "coaching") return;

    lastProcessedBlob.current = blob;

    (async () => {
      const supabase = supabaseRef.current!;
      try {
        // 1) 인증 사용자
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) {
          setCoachState({ status: "failed", message: "로그인이 필요해요" });
          return;
        }

        // 2) Storage 업로드 ({user_id}/{ts}-{qid}.webm)
        setCoachState({ status: "uploading" });
        const filename = `${userId}/${Date.now()}-${questionId.slice(0, 8)}.webm`;
        const { error: upErr } = await supabase.storage
          .from("talklish-recordings")
          .upload(filename, blob, { contentType: "audio/webm", upsert: false });
        if (upErr) {
          setCoachState({ status: "failed", message: `업로드 실패: ${upErr.message}` });
          return;
        }

        // 3) EF 호출 (동기 — 30~60초)
        setCoachState({ status: "coaching" });
        const { data, error: efErr } = await supabase.functions.invoke("talklish-coach", {
          body: {
            audio_path: filename,
            speaker_name: speaker?.name ?? "멤버",
            question_english: questionEnglish,
            question_korean: questionKorean,
            question_type: questionType,
            category,
            topic,
          },
        });

        if (efErr || !data?.success) {
          setCoachState({
            status: "failed",
            message: data?.error || efErr?.message || "AI 코칭 생성 실패",
          });
          return;
        }

        const result = data.data as CoachingResult;
        onCoachingDone(result, filename);
        setCoachState({ status: "done", result });
      } catch (err) {
        setCoachState({
          status: "failed",
          message: err instanceof Error ? err.message : "알 수 없는 오류",
        });
      }
    })();
  }, [recorder.audioBlob, coachState.status, questionId, speaker?.name, questionEnglish, questionKorean, questionType, category, topic, onCoachingDone]);

  const isRecording = recorder.state === "recording";
  const isProcessing = coachState.status === "uploading" || coachState.status === "coaching";
  const isFailed = coachState.status === "failed";

  // 발화자 미선택 → 우측 룰렛 유도
  if (!speaker) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full"
          style={{ background: TLK.bg2, border: `3px dashed ${TLK.rule}` }}
        >
          <Users size={32} style={{ color: TLK.inkFaint }} />
        </div>
        <p
          style={{
            fontFamily: TLK_FONT.serif,
            fontStyle: "italic",
            fontSize: 22,
            color: TLK.inkDim,
            maxWidth: 480,
          }}
        >
          오른쪽 <strong style={{ color: TLK.accent }}>PICK NEXT</strong>로 발표자를 먼저 뽑아주세요.
        </p>
        <p style={{ fontFamily: TLK_FONT.sans, fontSize: 12, color: TLK.inkFaint }}>
          우측 카드의 PICK NEXT 버튼 (단축키 R)
        </p>
      </div>
    );
  }

  // 코칭 완료 → 코치 노트 펼침 + 다음 버튼 (탭 없이 자동 표시)
  if (coachState.status === "done") {
    const c = coachState.result.coaching;
    return (
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-center gap-2">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full text-xl"
            style={{ background: `${speaker.color}22`, border: `2px solid ${speaker.color}` }}
          >
            {speaker.emoji}
          </span>
          <p style={{ fontFamily: TLK_FONT.sans, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: TLK.accent, textTransform: "uppercase" }}>
            {speaker.name} 답변 · AI 코치 노트
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-4">
            {c.summary && (
              <div className="rounded-2xl px-5 py-4" style={{ background: `${TLK.accent}0d`, border: `1px solid ${TLK.accent}33` }}>
                <p style={{ fontFamily: TLK_FONT.sans, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: TLK.accent, textTransform: "uppercase", marginBottom: 4 }}>한 줄 요약</p>
                <p style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 19, color: TLK.ink, lineHeight: 1.45, fontWeight: 500 }}>{c.summary}</p>
              </div>
            )}
            {c.good_points?.length > 0 && (
              <div>
                <p style={{ fontFamily: TLK_FONT.sans, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: TLK.accent2, textTransform: "uppercase", marginBottom: 6 }}>잘한 점</p>
                <div className="space-y-2">
                  {c.good_points.map((p, i) => (
                    <div key={i} className="rounded-xl px-4 py-3" style={{ background: TLK.paper, border: `1px solid ${TLK.rule}`, borderLeft: `3px solid ${TLK.accent2}` }}>
                      <p style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 14, color: TLK.ink, lineHeight: 1.5 }}>“{p.quote}”</p>
                      <p style={{ fontFamily: TLK_FONT.ko, fontSize: 12.5, color: TLK.inkDim, marginTop: 4, lineHeight: 1.5 }}>{p.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {c.improve_points?.length > 0 && (
              <div>
                <p style={{ fontFamily: TLK_FONT.sans, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: TLK.accent, textTransform: "uppercase", marginBottom: 6 }}>보완할 점</p>
                <div className="space-y-2">
                  {c.improve_points.map((p, i) => (
                    <div key={i} className="rounded-xl px-4 py-3" style={{ background: TLK.paper, border: `1px solid ${TLK.rule}`, borderLeft: `3px solid ${TLK.accent}` }}>
                      <p style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 14, color: TLK.ink, lineHeight: 1.5 }}>“{p.quote}”</p>
                      <p style={{ fontFamily: TLK_FONT.ko, fontSize: 12.5, color: TLK.inkDim, marginTop: 4, lineHeight: 1.5 }}>{p.issue}</p>
                      <p style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 13, color: TLK.accent, marginTop: 6, lineHeight: 1.5, fontWeight: 500 }}>→ {p.suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {c.next_speaker_tip && (
              <div className="rounded-xl px-4 py-3" style={{ background: TLK.bg2, border: `1px solid ${TLK.rule}` }}>
                <div className="mb-1.5 flex items-center gap-1.5">
                  <Mic size={12} style={{ color: TLK.inkDim }} />
                  <span style={{ fontFamily: TLK_FONT.sans, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: TLK.inkDim, textTransform: "uppercase" }}>다음 발화자 팁</span>
                </div>
                <p style={{ fontFamily: TLK_FONT.ko, fontSize: 13, color: TLK.ink, lineHeight: 1.5 }}>{c.next_speaker_tip}</p>
              </div>
            )}
            {c.upgrade_points?.length > 0 && (
              <div>
                <div className="mb-1.5 flex items-center gap-1.5">
                  <Sparkles size={13} style={{ color: TLK.accent2 }} />
                  <span style={{ fontFamily: TLK_FONT.sans, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: TLK.accent2, textTransform: "uppercase" }}>한 단계 업그레이드</span>
                </div>
                <div className="flex flex-col gap-2">
                  {c.upgrade_points.map((u, i) => (
                    <div key={i}>
                      <p style={{ fontFamily: TLK_FONT.ko, fontSize: 13.5, color: TLK.ink, lineHeight: 1.5 }}>· {u.tip}</p>
                      {u.example && (
                        <p style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 13, color: TLK.accent2, lineHeight: 1.45, marginLeft: 12, marginTop: 2 }}>
                          “{u.example}”
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 justify-end">
          <button
            type="button"
            onClick={onNext}
            className="flex items-center gap-1.5 rounded-full px-6 py-2.5"
            style={{ background: TLK.ink, color: "#fff", border: 0, fontFamily: TLK_FONT.sans, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            {nextLabel}
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
      {/* 발화자 표시 */}
      {speaker && (
        <div className="flex items-center gap-3">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-full text-3xl"
            style={{ background: `${speaker.color}22`, border: `2px solid ${speaker.color}` }}
          >
            {speaker.emoji}
          </span>
          <p
            style={{
              fontFamily: TLK_FONT.serif,
              fontStyle: "italic",
              fontSize: 24,
              fontWeight: 500,
              color: TLK.ink,
            }}
          >
            {speaker.name} — your turn
          </p>
        </div>
      )}

      {/* 녹음 컨트롤 */}
      {!isFailed && (
        <div className="flex flex-col items-center gap-3">
          {/* 질문 듣고 시작 — 재생 끝나면 자동 녹음 (질문 오디오 있을 때) */}
          {!isRecording && !isProcessing && !questionPlayer.isPlaying && !questionPlayer.hasPlayed && questionAudioUrl && (
            <button
              type="button"
              onClick={() => questionPlayer.play(questionAudioUrl)}
              className="flex items-center gap-2 rounded-full px-7 py-4 shadow-lg transition-all hover:-translate-y-0.5"
              style={{ background: TLK.accent, color: "#fff", border: 0, fontFamily: TLK_FONT.sans, fontSize: 14, fontWeight: 700, letterSpacing: 1.5, cursor: "pointer" }}
            >
              <Volume2 size={18} />
              질문 듣고 답변 시작
            </button>
          )}
          {/* 질문 재생 중 */}
          {questionPlayer.isPlaying && (
            <div className="flex items-center gap-2" style={{ color: TLK.accent }}>
              <Loader2 size={20} className="animate-spin" />
              <span style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 18 }}>질문 재생 중…</span>
            </div>
          )}
          {/* 질문 오디오 없음 → 수동 녹음 시작 */}
          {!isRecording && !isProcessing && !questionAudioUrl && (
            <button
              type="button"
              onClick={() => recorder.startRecording()}
              className="flex items-center gap-2 rounded-full px-7 py-4 shadow-lg transition-all hover:-translate-y-0.5"
              style={{ background: TLK.accent, color: "#fff", border: 0, fontFamily: TLK_FONT.sans, fontSize: 14, fontWeight: 700, letterSpacing: 1.5, cursor: "pointer" }}
            >
              <Mic size={18} />
              녹음 시작
            </button>
          )}

          {isRecording && (
            <div className="flex flex-col items-center gap-3">
              {/* 마이크 아이콘 (고정 크기 — 흔들림 없음) */}
              <div
                className="flex h-24 w-24 items-center justify-center rounded-full"
                style={{ background: `${TLK.accent}22`, border: `3px solid ${TLK.accent}` }}
              >
                <Mic size={36} style={{ color: TLK.accent }} />
              </div>
              {/* 볼륨 바 (크기 고정 컨테이너 안에서 차오름) */}
              <div className="h-2 w-44 overflow-hidden rounded-full" style={{ background: TLK.bg2 }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, recorder.volume * 100)}%`,
                    background: TLK.accent,
                    transition: "width .08s linear",
                  }}
                />
              </div>
              <p
                style={{
                  fontFamily: TLK_FONT.mono,
                  fontSize: 18,
                  color: TLK.accent,
                  fontWeight: 700,
                  letterSpacing: 1,
                }}
              >
                {formatDuration(recorder.duration)} / 3:00
              </p>
              {/* 경고 문구 — 자리 고정(빈 줄 유지)으로 레이아웃 시프트 방지 */}
              <p style={{ fontFamily: TLK_FONT.sans, fontSize: 11, color: TLK.accent2, minHeight: 15, lineHeight: "15px" }}>
                {recorder.warningMessage ?? " "}
              </p>
              <button
                type="button"
                onClick={() => recorder.stopRecording()}
                className="flex items-center gap-2 rounded-full px-6 py-2.5 transition-all"
                style={{
                  background: TLK.ink,
                  color: "#fff",
                  border: 0,
                  fontFamily: TLK_FONT.sans,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 1.5,
                  cursor: "pointer",
                }}
              >
                <Square size={14} />
                녹음 종료
              </button>
              {questionPlayer.canReplay && !questionPlayer.hasReplayed && (
                <button
                  type="button"
                  onClick={handleReplay}
                  className="flex animate-pulse items-center gap-1.5 rounded-full px-4 py-1.5"
                  style={{ background: TLK.bg2, border: `1px solid ${TLK.accent}`, color: TLK.accent, fontFamily: TLK_FONT.sans, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  <Undo2 size={13} />
                  다시 듣기 ({questionPlayer.replayCountdown}초)
                </button>
              )}
            </div>
          )}

          {isProcessing && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={36} className="animate-spin" style={{ color: TLK.accent }} />
              <p
                style={{
                  fontFamily: TLK_FONT.serif,
                  fontStyle: "italic",
                  fontSize: 18,
                  color: TLK.ink,
                }}
              >
                {coachState.status === "uploading" ? "음성 업로드 중…" : "AI 코칭 생성 중… (10~30초)"}
              </p>
              <p style={{ fontFamily: TLK_FONT.sans, fontSize: 11, color: TLK.inkFaint, letterSpacing: 0.5 }}>
                답변 듣고 잘한 점·보완점·업그레이드 포인트를 정리하는 중입니다
              </p>
            </div>
          )}
        </div>
      )}

      {isFailed && (
        <div className="flex flex-col items-center gap-3">
          <AlertCircle size={36} style={{ color: TLK.accent }} />
          <p style={{ fontFamily: TLK_FONT.ko, fontSize: 14, color: TLK.ink, maxWidth: 500 }}>
            {coachState.message}
          </p>
          <button
            type="button"
            onClick={() => {
              lastProcessedBlob.current = null;
              setCoachState({ status: "idle" });
              recorder.reset();
            }}
            className="rounded-full px-5 py-2"
            style={{
              background: TLK.bg2,
              border: `1px solid ${TLK.rule}`,
              color: TLK.inkDim,
              fontFamily: TLK_FONT.sans,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1.5,
              cursor: "pointer",
            }}
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 마이크 거부 안내 */}
      {recorder.errorCode === "mic_denied" && (
        <div
          className="mt-2 flex items-start gap-2 rounded-xl px-3 py-2 text-left"
          style={{ background: `${TLK.accent}0d`, border: `1px solid ${TLK.accent}33` }}
        >
          <MicOff size={14} style={{ color: TLK.accent, marginTop: 2 }} />
          <p style={{ fontFamily: TLK_FONT.ko, fontSize: 12, color: TLK.inkDim, lineHeight: 1.5 }}>
            마이크 권한이 차단됐어요. 브라우저 주소창 옆 자물쇠 아이콘에서 마이크를 허용해주세요.
          </p>
        </div>
      )}
    </div>
  );
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* ─── 답변 음성 (private 버킷 signed URL, ref 기반 재생) ─── */
function AnswerAudio({ path }: { path: string | null }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const { data: url } = useQuery({
    queryKey: ["talklish-answer-audio", path],
    queryFn: async () => {
      if (!path) return null;
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const { data } = await supabase.storage
        .from("talklish-recordings")
        .createSignedUrl(path, 3600);
      return data?.signedUrl ?? null;
    },
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
  });
  if (!path) return null;
  return (
    <div className="flex items-center gap-2">
      <audio
        ref={ref}
        src={url ?? undefined}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      <button
        type="button"
        disabled={!url}
        onClick={() => {
          const el = ref.current;
          if (!el) return;
          if (el.paused) el.play();
          else el.pause();
        }}
        className="flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-40"
        style={{ background: TLK.accent, color: "#fff", border: 0, cursor: url ? "pointer" : "wait" }}
      >
        {playing ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <span style={{ fontFamily: TLK_FONT.sans, fontSize: 11, color: TLK.inkDim }}>답변 음성</span>
    </div>
  );
}

/* ─── 세션 멤버별 답변·코칭 뷰 (정리 phase + 히스토리 상세 공유) ─── */
function SessionAnswersView({
  sessionId,
  members,
}: {
  sessionId: string;
  members: PanelMember[];
}) {
  const { data: answers = [], isLoading } = useQuery({
    queryKey: ["talklish-session-answers", sessionId],
    queryFn: () => getTalklishSessionAnswers(sessionId),
    enabled: !!sessionId,
    staleTime: 30 * 1000,
  });

  const byMember = useMemo(() => {
    const m = new Map<string, TalklishAnswer[]>();
    for (const a of answers) {
      const arr = m.get(a.panel_member_id) ?? [];
      arr.push(a);
      m.set(a.panel_member_id, arr);
    }
    return m;
  }, [answers]);

  const answeredMembers = useMemo(
    () => members.filter((m) => byMember.has(m.id)),
    [members, byMember],
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const activeMemberId = activeId && byMember.has(activeId) ? activeId : answeredMembers[0]?.id ?? null;
  const activeAnswers = activeMemberId ? byMember.get(activeMemberId) ?? [] : [];

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2" style={{ color: TLK.inkDim }}>
        <Loader2 size={18} className="animate-spin" />
        <span style={{ fontFamily: TLK_FONT.ko, fontSize: 14 }}>불러오는 중…</span>
      </div>
    );
  }
  if (answeredMembers.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p style={{ fontFamily: TLK_FONT.ko, fontSize: 14, color: TLK.inkFaint }}>
          아직 저장된 답변이 없어요
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* 멤버 탭 */}
      <div className="flex flex-wrap gap-2">
        {answeredMembers.map((m) => {
          const active = m.id === activeMemberId;
          const cnt = byMember.get(m.id)?.length ?? 0;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setActiveId(m.id)}
              className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5"
              style={{
                background: active ? m.color : TLK.bg2,
                border: `1px solid ${active ? m.color : TLK.rule}`,
                color: active ? "#fff" : TLK.ink,
                cursor: "pointer",
                fontFamily: TLK_FONT.sans,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              <span>{m.emoji}</span>
              <span>{m.name}</span>
              <span style={{ opacity: 0.7, fontSize: 11 }}>{cnt}</span>
            </button>
          );
        })}
      </div>

      {/* 선택 멤버 답변들 */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4">
          {activeAnswers.map((a) => (
            <div key={a.id} className="rounded-2xl px-5 py-4" style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}>
              <div className="mb-1 flex items-center gap-2">
                <span style={{ fontFamily: TLK_FONT.mono, fontSize: 11, fontWeight: 700, color: TLK.accent }}>
                  Q{(a.question_idx ?? 0) + 1}
                </span>
                {a.question_type && (
                  <span className="rounded-full px-2 py-0.5" style={{ background: TLK.bg2, color: TLK.inkDim, fontFamily: TLK_FONT.sans, fontSize: 10.5, fontWeight: 700 }}>
                    {a.question_type}
                  </span>
                )}
              </div>
              {a.question_english && (
                <p style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 15, color: TLK.ink, lineHeight: 1.4 }}>
                  {a.question_english}
                </p>
              )}

              {a.audio_url && (
                <div className="mt-2.5">
                  <AnswerAudio path={a.audio_url} />
                </div>
              )}

              {a.transcript && (
                <div className="mt-3">
                  <p style={{ fontFamily: TLK_FONT.sans, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: TLK.inkFaint, textTransform: "uppercase", marginBottom: 4 }}>
                    발화 내용
                  </p>
                  <p style={{ fontFamily: TLK_FONT.serif, fontSize: 14, color: TLK.inkDim, lineHeight: 1.5 }}>
                    {a.transcript}
                  </p>
                </div>
              )}

              {a.coaching && (
                <div className="mt-3 flex flex-col gap-3 rounded-xl px-4 py-3.5" style={{ background: TLK.bg2 }}>
                  {a.coaching.summary && (
                    <p style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 15, fontWeight: 500, color: TLK.ink, lineHeight: 1.4 }}>
                      {a.coaching.summary}
                    </p>
                  )}
                  {a.coaching.good_points?.length > 0 && (
                    <div>
                      <p style={{ fontFamily: TLK_FONT.sans, fontSize: 10, fontWeight: 700, letterSpacing: 1, color: TLK.accent2, textTransform: "uppercase", marginBottom: 5 }}>
                        좋았던 점
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {a.coaching.good_points.map((g, n) => (
                          <div key={n} style={{ borderLeft: `2px solid ${TLK.accent2}`, paddingLeft: 9 }}>
                            {g.quote && (
                              <p style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 13, color: TLK.ink, lineHeight: 1.45 }}>“{g.quote}”</p>
                            )}
                            <p style={{ fontFamily: TLK_FONT.ko, fontSize: 12, color: TLK.inkDim, lineHeight: 1.45, marginTop: 1 }}>{g.note}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {a.coaching.improve_points?.length > 0 && (
                    <div>
                      <p style={{ fontFamily: TLK_FONT.sans, fontSize: 10, fontWeight: 700, letterSpacing: 1, color: TLK.accent, textTransform: "uppercase", marginBottom: 5 }}>
                        개선할 점
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {a.coaching.improve_points.map((g, n) => (
                          <div key={n} style={{ borderLeft: `2px solid ${TLK.accent}`, paddingLeft: 9 }}>
                            {g.quote && (
                              <p style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 13, color: TLK.ink, lineHeight: 1.45 }}>“{g.quote}”</p>
                            )}
                            {g.issue && (
                              <p style={{ fontFamily: TLK_FONT.ko, fontSize: 12, color: TLK.inkDim, lineHeight: 1.45, marginTop: 1 }}>{g.issue}</p>
                            )}
                            {g.suggestion && (
                              <p style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 12.5, color: TLK.accent, lineHeight: 1.45, marginTop: 2, fontWeight: 500 }}>→ {g.suggestion}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {a.coaching.upgrade_points?.length > 0 && (
                    <div>
                      <p style={{ fontFamily: TLK_FONT.sans, fontSize: 10, fontWeight: 700, letterSpacing: 1, color: TLK.accent2, textTransform: "uppercase", marginBottom: 5 }}>
                        한 단계 업그레이드
                      </p>
                      <div className="flex flex-col gap-2">
                        {a.coaching.upgrade_points.map((u, n) => (
                          <div key={n}>
                            <p style={{ fontFamily: TLK_FONT.ko, fontSize: 12.5, color: TLK.ink, lineHeight: 1.45 }}>· {u.tip}</p>
                            {u.example && (
                              <p style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 12.5, color: TLK.accent2, lineHeight: 1.45, marginLeft: 11, marginTop: 1 }}>“{u.example}”</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Phase 3 · 정리 (오늘의 정리 — 멤버별 답변·코칭) ─── */
function RecapPhase({
  sessionId,
  members,
}: {
  sessionId: string | null;
  members: PanelMember[];
}) {
  return (
    <div className="flex h-full flex-col gap-5">
      <div>
        <p style={{ fontFamily: TLK_FONT.sans, fontSize: 10, fontWeight: 700, letterSpacing: 2.5, color: TLK.inkFaint, textTransform: "uppercase" }}>
          Review
        </p>
        <h2 style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 36, fontWeight: 500, color: TLK.ink, lineHeight: 1.2, marginTop: 4, letterSpacing: -0.5 }}>
          오늘의 정리 · 멤버별 발화
        </h2>
      </div>
      {sessionId ? (
        <SessionAnswersView sessionId={sessionId} members={members} />
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <p style={{ fontFamily: TLK_FONT.ko, fontSize: 14, color: TLK.inkFaint }}>세션 정보가 없어요</p>
        </div>
      )}
    </div>
  );
}

/* ─── Phase 4 · Closing ──────────────── */

function ClosingPhase({
  combo,
  completed,
  alreadyCompleted,
  topic,
  category,
  onComplete,
}: {
  combo: TalklishComboQuestion[];
  completed: boolean;
  alreadyCompleted: boolean;
  topic: string | null;
  category: Category;
  onComplete: (c: boolean) => void;
}) {
  // 이번 세션 진입 시점에 이미 전역 완료 기록이 있으면 "이전에 함께 했던 콤보" 안내
  const showHistoryNotice = alreadyCompleted && !completed;

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col items-center justify-center gap-7 py-8">
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
            fontSize: 60,
            fontWeight: 500,
            color: TLK.ink,
            lineHeight: 1,
            letterSpacing: -1.5,
          }}
        >
          Combo cleared.
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
          오늘도 콤보 {combo.length}문항 무사히 풀어내셨네요. 다음 수요일에 또 만나요.
        </p>
      </div>

      {/* 이전에 완료된 콤보 안내 */}
      {showHistoryNotice && (
        <div
          className="flex items-start gap-3 rounded-2xl px-5 py-4"
          style={{
            background: `${TLK.accent2}10`,
            border: `1px solid ${TLK.accent2}55`,
            maxWidth: 560,
          }}
        >
          <CheckCircle size={18} style={{ color: TLK.accent2, flexShrink: 0, marginTop: 2 }} />
          <div>
            <p
              style={{
                fontFamily: TLK_FONT.sans,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1.5,
                color: TLK.accent2,
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              이전에 함께 했던 콤보예요
            </p>
            <p
              style={{
                fontFamily: TLK_FONT.ko,
                fontSize: 13,
                color: TLK.inkDim,
                lineHeight: 1.55,
              }}
            >
              {topic ? `'${topic}' (${category})` : "이 콤보"}는 우리 스터디에서 한 번 이상 다뤘던 콤보입니다.
              다시 한 번 짚어보는 것도 좋아요. "세션 완료"를 누르면 기록 시각만 갱신됩니다.
            </p>
          </div>
        </div>
      )}

      <div className="text-center">
        {!completed ? (
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
        ) : (
          <div
            className="inline-block rounded-2xl px-7 py-5"
            style={{ background: `${TLK.accent2}14`, border: `2px solid ${TLK.accent2}55` }}
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
    </div>
  );
}
