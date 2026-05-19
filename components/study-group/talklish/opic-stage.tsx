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
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft, ChevronRight, Play, Pause, ArrowRight,
  Sparkles, Users, CheckCircle, Undo2, NotebookPen, Mic, MicOff, MessagesSquare,
  Loader2, AlertCircle, Square,
} from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { getQuestionsByTopic, getTopicsByCategory } from "@/lib/queries/master-questions";
import { fetchPanelMembers } from "@/lib/actions/study-group";
import { QUESTION_TYPE_LABELS } from "@/lib/types/reviews";
import { useRecorder } from "@/lib/hooks/use-recorder";
import { TLK, TLK_FONT } from "./tokens";
import { SpeakerCard } from "./speaker-card";

// ── AI 코칭 결과 타입 (talklish-coach EF 응답) ──
interface CoachingResult {
  transcript: string;
  coaching: {
    summary: string;
    good_points: Array<{ quote: string; note: string }>;
    improve_points: Array<{ quote: string; issue: string; suggestion: string }>;
    discussion_hooks: string[];
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
  { id: 0, label: "Intro",       desc: "스터디 안내 + 출석",        range: "0–3"   },
  { id: 1, label: "콤보 선택",   desc: "카테고리/토픽 → 4문항",     range: "3–8"   },
  { id: 2, label: "진행",        desc: "발화자 룰렛 + 답변 + 토론", range: "8–48"  },
  { id: 3, label: "회고",        desc: "4문항 한눈에 짚기",         range: "48–55" },
  { id: 4, label: "Closing",     desc: "마무리 + 세션 완료",        range: "55–60" },
] as const;

interface Props {
  absentIds: Set<string>;
  onToggleAttendance: (memberId: string) => void;
}

export function OpicStage({ absentIds, onToggleAttendance }: Props) {
  const [phase, setPhase] = useState(0);
  const [category, setCategory] = useState<Category>("일반");
  const [topic, setTopic] = useState<string | null>(null);
  const [comboStart, setComboStart] = useState(0); // 콤보 시작 인덱스 (4문항씩)
  const [qIdx, setQIdx] = useState(0);             // 콤보 내 질문 인덱스 (0~3)
  const [subStep, setSubStep] = useState<SubStep>("speaker");
  const [activeSpeaker, setActiveSpeaker] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [coachNotes, setCoachNotes] = useState<Record<string, string>>({}); // questionId → note (진행자 수동)
  const [coachResults, setCoachResults] = useState<Record<string, CoachingResult>>({}); // questionId → AI 결과
  const [memberRecaps, setMemberRecaps] = useState<Record<string, string>>({}); // memberId → recap
  const [sessionCompleted, setSessionCompleted] = useState(false);

  const { data: topics = [] } = useQuery({
    queryKey: ["study-topics", category],
    queryFn: () => getTopicsByCategory(category),
    staleTime: Infinity,
  });
  const { data: questions = [] } = useQuery({
    queryKey: ["study-questions", topic, category],
    queryFn: () => getQuestionsByTopic(topic!, category),
    enabled: !!topic,
    staleTime: Infinity,
  });
  const { data: members = [] } = useQuery({
    queryKey: ["study-panel-members"],
    queryFn: fetchPanelMembers,
    staleTime: 5 * 60 * 1000,
  });

  const combo = useMemo(
    () => questions.slice(comboStart, comboStart + 4),
    [questions, comboStart],
  );
  const currentQ = combo[qIdx];

  const presentMembers = useMemo(
    () => members.filter((m) => !absentIds.has(m.id)),
    [members, absentIds],
  );

  const spin = useCallback(() => {
    if (spinning || presentMembers.length === 0) return;
    setSpinning(true);
    setTimeout(() => {
      const picked = presentMembers[Math.floor(Math.random() * presentMembers.length)];
      const idx = members.findIndex((m) => m.id === picked.id);
      setActiveSpeaker(idx >= 0 ? idx : 0);
      setSpinning(false);
    }, 1100);
  }, [spinning, presentMembers, members]);

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

  return (
    <div
      className="flex h-full flex-col"
      style={{ background: TLK.bg, color: TLK.ink, fontFamily: TLK_FONT.ko }}
    >
      {/* ── 헤더: phase 도트 ── */}
      <header
        className="flex shrink-0 items-center gap-4 border-b px-6 py-3.5 sm:px-10"
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

        <div className="flex items-center gap-4">
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

        <div className="flex-1" />
      </header>

      {/* ── 본문 ── */}
      <main className="relative flex-1 overflow-hidden">
        <div
          key={`opic-phase-${phase}`}
          className="absolute inset-0 overflow-y-auto"
          style={{ animation: "tlk-fade .35s ease-out" }}
        >
          <div className="mx-auto h-full max-w-6xl px-6 py-6 sm:px-10 sm:py-10">
            {phase === 0 && <IntroPhase members={members} absentIds={absentIds} />}
            {phase === 1 && (
              <ComboPickerPhase
                category={category}
                topics={topics}
                topic={topic}
                comboStart={comboStart}
                questions={questions}
                onCategoryChange={(c) => { setCategory(c); setTopic(null); setComboStart(0); setQIdx(0); }}
                onTopicChange={(t) => { setTopic(t); setComboStart(0); setQIdx(0); }}
                onComboStartChange={(n) => { setComboStart(n); setQIdx(0); }}
                onStart={() => { setPhase(2); setQIdx(0); setSubStep("speaker"); }}
              />
            )}
            {phase === 2 && (
              <RunPhase
                combo={combo}
                qIdx={qIdx}
                setQIdx={(n) => { setQIdx(n); setSubStep("speaker"); }}
                subStep={subStep}
                setSubStep={setSubStep}
                members={members}
                absentIds={absentIds}
                onToggleAttendance={onToggleAttendance}
                activeSpeaker={activeSpeaker}
                spinning={spinning}
                onSpin={spin}
                coachNotes={coachNotes}
                onChangeCoachNote={(qid, note) => setCoachNotes((p) => ({ ...p, [qid]: note }))}
                coachResults={coachResults}
                onSaveCoachResult={(qid, result) => setCoachResults((p) => ({ ...p, [qid]: result }))}
                category={category}
                topic={topic}
                onGoRecap={() => setPhase(3)}
              />
            )}
            {phase === 3 && (
              <RecapPhase
                combo={combo}
                coachNotes={coachNotes}
                members={members}
                absentIds={absentIds}
                memberRecaps={memberRecaps}
                onChangeRecap={(mid, val) => setMemberRecaps((p) => ({ ...p, [mid]: val }))}
              />
            )}
            {phase === 4 && (
              <ClosingPhase
                combo={combo}
                completed={sessionCompleted}
                onComplete={setSessionCompleted}
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

/* ─── Sub Step ────────────────────────── */
type SubStep = "speaker" | "answer" | "coach" | "discuss";

/* ─── Phase 0 · Intro ─────────────────── */

function IntroPhase({
  members,
  absentIds,
}: {
  members: { id: string; name: string; emoji: string; color: string }[];
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
        한 토픽의 4문항을 룰렛으로 돌려가며 답하고, 답변 끝나면 진행자가 코치 노트를 짧게 정리해요. 그 노트를 발판으로 전원이 한 문장씩 토론합니다.
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
        준비되시면 → 또는 SPACE
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
  comboStart,
  questions,
  onCategoryChange,
  onTopicChange,
  onComboStartChange,
  onStart,
}: {
  category: Category;
  topics: TopicMeta[];
  topic: string | null;
  comboStart: number;
  questions: { id: string; question_korean?: string | null; question_english?: string | null; question_type_eng?: string | null }[];
  onCategoryChange: (c: Category) => void;
  onTopicChange: (t: string) => void;
  onComboStartChange: (n: number) => void;
  onStart: () => void;
}) {
  const combo = questions.slice(comboStart, comboStart + 4);
  const comboCount = Math.max(1, Math.ceil(questions.length / 4));

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

              {/* 아이콘 */}
              <div
                className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  background: selected ? TLK.accent : TLK.bg2,
                  color: selected ? "#fff" : TLK.inkDim,
                  fontFamily: TLK_FONT.serif,
                  fontStyle: "italic",
                  fontSize: 22,
                  fontWeight: 600,
                }}
              >
                {c === "일반" ? "G" : c === "롤플레이" ? "R" : "A"}
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

        {/* 콤보 묶음 (토픽 선택 + 5문항 이상일 때 노출) */}
        {topic && questions.length > 4 && (
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
              콤보 묶음 ({comboCount}개)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: comboCount }).map((_, i) => {
                const active = comboStart === i * 4;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onComboStartChange(i * 4)}
                    className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
                    style={{
                      background: active ? TLK.accent2 : TLK.paper,
                      color: active ? "#fff" : TLK.inkDim,
                      border: `1px solid ${active ? TLK.accent2 : TLK.rule}`,
                      fontFamily: TLK_FONT.sans,
                      cursor: "pointer",
                    }}
                  >
                    콤보 {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 콤보 4문항 미리보기 (토픽 선택 후) */}
        {topic && combo.length > 0 && (
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
              이 콤보 ({combo.length}문항)
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {combo.map((q, i) => (
                <div
                  key={q.id}
                  className="rounded-2xl px-5 py-4"
                  style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-full"
                      style={{
                        background: TLK.accent,
                        color: "#fff",
                        fontFamily: TLK_FONT.sans,
                        fontSize: 11,
                        fontWeight: 800,
                      }}
                    >
                      {i + 1}
                    </span>
                    {q.question_type_eng && (
                      <span
                        style={{
                          fontFamily: TLK_FONT.sans,
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: 1,
                          color: TLK.inkFaint,
                          textTransform: "uppercase",
                        }}
                      >
                        {QUESTION_TYPE_LABELS[q.question_type_eng as keyof typeof QUESTION_TYPE_LABELS] ?? q.question_type_eng}
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      fontFamily: TLK_FONT.serif,
                      fontStyle: "italic",
                      fontSize: 16,
                      color: TLK.ink,
                      lineHeight: 1.4,
                    }}
                  >
                    {q.question_english}
                  </p>
                  {q.question_korean && (
                    <p
                      style={{
                        fontFamily: TLK_FONT.ko,
                        fontSize: 12,
                        color: TLK.inkDim,
                        lineHeight: 1.5,
                        marginTop: 6,
                      }}
                    >
                      {q.question_korean}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {topic && combo.length === 0 && (
          <div className="mt-10 text-center">
            <p
              style={{
                fontFamily: TLK_FONT.serif,
                fontStyle: "italic",
                fontSize: 18,
                color: TLK.inkFaint,
              }}
            >
              이 토픽에 해당하는 질문이 없어요
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

/* ─── Phase 2 · 진행 (sub-step) ──────── */

const SUBS: { key: SubStep; label: string; icon: typeof Mic }[] = [
  { key: "speaker", label: "발화자 룰렛", icon: Users },
  { key: "answer",  label: "답변",        icon: Mic },
  { key: "coach",   label: "코치 노트",   icon: NotebookPen },
  { key: "discuss", label: "토론",        icon: MessagesSquare },
];

function RunPhase({
  combo,
  qIdx,
  setQIdx,
  subStep,
  setSubStep,
  members,
  absentIds,
  onToggleAttendance,
  activeSpeaker,
  spinning,
  onSpin,
  coachNotes,
  onChangeCoachNote,
  coachResults,
  onSaveCoachResult,
  category,
  topic,
  onGoRecap,
}: {
  combo: { id: string; question_korean?: string | null; question_english?: string | null; question_type_eng?: string | null; audio_url?: string | null }[];
  qIdx: number;
  setQIdx: (n: number) => void;
  subStep: SubStep;
  setSubStep: (s: SubStep) => void;
  members: { id: string; name: string; emoji: string; color: string }[];
  absentIds: Set<string>;
  onToggleAttendance: (id: string) => void;
  activeSpeaker: number;
  spinning: boolean;
  onSpin: () => void;
  coachNotes: Record<string, string>;
  onChangeCoachNote: (qid: string, v: string) => void;
  coachResults: Record<string, CoachingResult>;
  onSaveCoachResult: (qid: string, result: CoachingResult) => void;
  category: Category;
  topic: string | null;
  onGoRecap: () => void;
}) {
  const q = combo[qIdx];
  const isLast = qIdx === combo.length - 1;
  const speaker = members[activeSpeaker];
  const subIdx = SUBS.findIndex((s) => s.key === subStep);

  const goNextSub = useCallback(() => {
    if (subIdx < SUBS.length - 1) setSubStep(SUBS[subIdx + 1].key);
    else {
      // 마지막 sub-step "토론" 끝 → 다음 질문 / 회고로
      if (isLast) onGoRecap();
      else setQIdx(qIdx + 1);
    }
  }, [subIdx, isLast, onGoRecap, qIdx, setQIdx, setSubStep]);

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
    <div className="grid h-full gap-5" style={{ gridTemplateColumns: "1fr 320px" }}>
      {/* 좌 — 메인 콘텐츠 */}
      <div className="flex min-h-0 flex-col gap-4">
        {/* 콤보 진행 표시 */}
        <div className="flex items-center gap-3">
          <span
            style={{
              fontFamily: TLK_FONT.sans,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1.5,
              color: TLK.inkFaint,
              textTransform: "uppercase",
            }}
          >
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
                  onClick={() => { setQIdx(n); setSubStep("speaker"); }}
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

        {/* 질문 카드 */}
        <div
          className="rounded-2xl px-7 py-6"
          style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}
        >
          {q.question_type_eng && (
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
              {QUESTION_TYPE_LABELS[q.question_type_eng as keyof typeof QUESTION_TYPE_LABELS] ?? q.question_type_eng}
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
          {q.audio_url && <AudioRow url={q.audio_url} />}
        </div>

        {/* Sub-step 탭 */}
        <div className="flex gap-1.5">
          {SUBS.map((s, i) => {
            const active = s.key === subStep;
            const past = i < subIdx;
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSubStep(s.key)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2"
                style={{
                  background: active ? TLK.ink : past ? TLK.paper : TLK.bg2,
                  color: active ? "#fff" : past ? TLK.inkDim : TLK.inkFaint,
                  border: `1px solid ${active ? TLK.ink : TLK.rule}`,
                  fontFamily: TLK_FONT.sans,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  cursor: "pointer",
                  transition: "all .25s",
                }}
              >
                <Icon size={12} />
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sub-step 본문 */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {subStep === "speaker" && (
            <SpeakerPick speaker={speaker} spinning={spinning} />
          )}
          {subStep === "answer" && (
            <AnswerPanel
              speaker={speaker}
              questionId={q.id}
              questionEnglish={q.question_english ?? ""}
              questionKorean={q.question_korean ?? undefined}
              questionType={q.question_type_eng ?? undefined}
              category={category}
              topic={topic ?? undefined}
              hasResult={!!coachResults[q.id]}
              onCoachingDone={(result) => onSaveCoachResult(q.id, result)}
              onAdvanceToCoach={() => setSubStep("coach")}
            />
          )}
          {subStep === "coach" && (
            <CoachNotePanel
              note={coachNotes[q.id] ?? ""}
              onChange={(v) => onChangeCoachNote(q.id, v)}
              speaker={speaker}
              result={coachResults[q.id]}
            />
          )}
          {subStep === "discuss" && (
            <DiscussPanel coachNote={coachNotes[q.id] ?? ""} result={coachResults[q.id]} />
          )}
        </div>

        {/* Sub-step 다음 버튼 */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={goNextSub}
            className="flex items-center gap-1.5 rounded-full px-5 py-2"
            style={{
              background: TLK.accent,
              color: "#fff",
              border: 0,
              fontFamily: TLK_FONT.sans,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.5,
              cursor: "pointer",
            }}
          >
            {subIdx < SUBS.length - 1
              ? `다음: ${SUBS[subIdx + 1].label}`
              : isLast
              ? "회고로 →"
              : `다음 질문 (Q${qIdx + 2}) →`}
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* 우 — SpeakerCard (룰렛) */}
      <SpeakerCard
        members={members}
        absentIds={absentIds}
        activeSpeaker={activeSpeaker}
        spinning={spinning}
        onSpin={onSpin}
        onToggleAttendance={onToggleAttendance}
      />
    </div>
  );
}

function AudioRow({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="mt-4 flex items-center gap-3">
      <audio
        src={url}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        id="opic-q-audio"
      />
      <button
        type="button"
        onClick={() => {
          const el = document.getElementById("opic-q-audio") as HTMLAudioElement | null;
          if (!el) return;
          if (el.paused) el.play();
          else el.pause();
        }}
        aria-label={playing ? "일시정지" : "듣기"}
        className="flex h-10 w-10 items-center justify-center rounded-full"
        style={{ background: TLK.accent, color: "#fff", border: 0, cursor: "pointer" }}
      >
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <span style={{ fontFamily: TLK_FONT.sans, fontSize: 12, color: TLK.inkDim }}>
        질문 음성 재생
      </span>
    </div>
  );
}

function SpeakerPick({ speaker, spinning }: { speaker: { name: string; emoji: string; color: string } | undefined; spinning: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6">
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
        Who's up?
      </p>
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
              fontSize: 36,
              fontWeight: 500,
              color: TLK.ink,
            }}
          >
            {spinning ? "..." : speaker.name}
          </p>
          <p style={{ fontFamily: TLK_FONT.sans, fontSize: 13, color: TLK.inkDim }}>
            오른쪽 PICK NEXT(또는 R)로 다시 뽑을 수 있어요
          </p>
        </>
      ) : (
        <p
          style={{
            fontFamily: TLK_FONT.serif,
            fontStyle: "italic",
            fontSize: 18,
            color: TLK.inkFaint,
          }}
        >
          출석 멤버가 없어요
        </p>
      )}
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
  hasResult,
  onCoachingDone,
  onAdvanceToCoach,
}: {
  speaker: { name: string; emoji: string; color: string } | undefined;
  questionId: string;
  questionEnglish: string;
  questionKorean?: string;
  questionType?: string;
  category: Category;
  topic?: string;
  hasResult: boolean;
  onCoachingDone: (r: CoachingResult) => void;
  onAdvanceToCoach: () => void;
}) {
  const recorder = useRecorder({ maxDuration: 180, minDuration: 1 });
  // hasResult가 true면 이미 코칭 결과가 있으니 done. 단 result 실데이터는 부모 prop으로만 알 수 있어
  // 화면에서는 "코칭 노트 보기" 버튼만 노출 (CoachNotePanel이 실제 result 렌더링)
  const [coachState, setCoachState] = useState<CoachState>(
    hasResult ? { status: "done", result: { transcript: "", coaching: { summary: "", good_points: [], improve_points: [], discussion_hooks: [], next_speaker_tip: "" } } } : { status: "idle" }
  );
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
        onCoachingDone(result);
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
  const isDone = coachState.status === "done";
  const isFailed = coachState.status === "failed";

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
      {!isDone && !isFailed && (
        <div className="flex flex-col items-center gap-3">
          {!isRecording && !isProcessing && (
            <button
              type="button"
              onClick={() => recorder.startRecording()}
              className="flex items-center gap-2 rounded-full px-7 py-4 shadow-lg transition-all hover:-translate-y-0.5"
              style={{
                background: TLK.accent,
                color: "#fff",
                border: 0,
                fontFamily: TLK_FONT.sans,
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: 1.5,
                cursor: "pointer",
              }}
            >
              <Mic size={18} />
              녹음 시작
            </button>
          )}

          {isRecording && (
            <div className="flex flex-col items-center gap-3">
              {/* 볼륨 인디케이터 */}
              <div
                className="flex h-24 w-24 items-center justify-center rounded-full"
                style={{
                  background: `${TLK.accent}22`,
                  border: `3px solid ${TLK.accent}`,
                  transform: `scale(${1 + recorder.volume * 0.4})`,
                  transition: "transform .1s",
                }}
              >
                <Mic size={36} style={{ color: TLK.accent }} />
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
              {recorder.warningMessage && (
                <p style={{ fontFamily: TLK_FONT.sans, fontSize: 11, color: TLK.accent2 }}>
                  {recorder.warningMessage}
                </p>
              )}
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
                답변 듣고 잘한 점·보완점·토론 거리를 정리하는 중입니다
              </p>
            </div>
          )}
        </div>
      )}

      {/* 완료 → 코치 노트로 자동 안내 */}
      {isDone && (
        <div className="flex flex-col items-center gap-3">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: `${TLK.accent2}1f`, border: `2px solid ${TLK.accent2}` }}
          >
            <CheckCircle size={32} style={{ color: TLK.accent2 }} />
          </div>
          <p
            style={{
              fontFamily: TLK_FONT.serif,
              fontStyle: "italic",
              fontSize: 22,
              color: TLK.ink,
            }}
          >
            코칭 노트가 준비됐어요
          </p>
          <button
            type="button"
            onClick={onAdvanceToCoach}
            className="inline-flex items-center gap-1.5 rounded-full px-5 py-2"
            style={{
              background: TLK.accent,
              color: "#fff",
              border: 0,
              fontFamily: TLK_FONT.sans,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 1,
              cursor: "pointer",
            }}
          >
            코치 노트 보기
            <ArrowRight size={14} />
          </button>
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

function CoachNotePanel({
  note,
  onChange,
  speaker,
  result,
}: {
  note: string;
  onChange: (v: string) => void;
  speaker: { name: string; emoji: string; color: string } | undefined;
  result?: CoachingResult;
}) {
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      <div className="flex items-center gap-2">
        <NotebookPen size={16} style={{ color: TLK.accent }} />
        <p
          style={{
            fontFamily: TLK_FONT.sans,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1.5,
            color: TLK.accent,
            textTransform: "uppercase",
          }}
        >
          {speaker?.name ? `${speaker.name} 답변 — AI 코치 노트` : "AI 코치 노트"}
        </p>
      </div>

      {result ? (
        <>
          {/* AI 요약 */}
          <div
            className="rounded-2xl px-5 py-4"
            style={{ background: `${TLK.accent}0d`, border: `1px solid ${TLK.accent}33` }}
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
              한 줄 요약
            </p>
            <p
              style={{
                fontFamily: TLK_FONT.serif,
                fontStyle: "italic",
                fontSize: 19,
                color: TLK.ink,
                lineHeight: 1.45,
                fontWeight: 500,
              }}
            >
              {result.coaching.summary}
            </p>
          </div>

          {/* 잘한 점 */}
          {result.coaching.good_points?.length > 0 && (
            <div>
              <p
                style={{
                  fontFamily: TLK_FONT.sans,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 1.5,
                  color: TLK.accent2,
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                잘한 점
              </p>
              <div className="space-y-2">
                {result.coaching.good_points.map((p, i) => (
                  <div
                    key={i}
                    className="rounded-xl px-4 py-3"
                    style={{ background: TLK.paper, border: `1px solid ${TLK.rule}`, borderLeft: `3px solid ${TLK.accent2}` }}
                  >
                    <p
                      style={{
                        fontFamily: TLK_FONT.serif,
                        fontStyle: "italic",
                        fontSize: 14,
                        color: TLK.ink,
                        lineHeight: 1.5,
                      }}
                    >
                      “{p.quote}”
                    </p>
                    <p style={{ fontFamily: TLK_FONT.ko, fontSize: 12.5, color: TLK.inkDim, marginTop: 4, lineHeight: 1.5 }}>
                      {p.note}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 보완할 점 */}
          {result.coaching.improve_points?.length > 0 && (
            <div>
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
                보완할 점
              </p>
              <div className="space-y-2">
                {result.coaching.improve_points.map((p, i) => (
                  <div
                    key={i}
                    className="rounded-xl px-4 py-3"
                    style={{ background: TLK.paper, border: `1px solid ${TLK.rule}`, borderLeft: `3px solid ${TLK.accent}` }}
                  >
                    <p
                      style={{
                        fontFamily: TLK_FONT.serif,
                        fontStyle: "italic",
                        fontSize: 14,
                        color: TLK.ink,
                        lineHeight: 1.5,
                      }}
                    >
                      “{p.quote}”
                    </p>
                    <p style={{ fontFamily: TLK_FONT.ko, fontSize: 12.5, color: TLK.inkDim, marginTop: 4, lineHeight: 1.5 }}>
                      {p.issue}
                    </p>
                    <p
                      style={{
                        fontFamily: TLK_FONT.serif,
                        fontStyle: "italic",
                        fontSize: 13,
                        color: TLK.accent,
                        marginTop: 6,
                        lineHeight: 1.5,
                        fontWeight: 500,
                      }}
                    >
                      → {p.suggestion}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 다음 발화자 팁 */}
          {result.coaching.next_speaker_tip && (
            <div
              className="rounded-xl px-4 py-3"
              style={{ background: TLK.bg2, border: `1px solid ${TLK.rule}` }}
            >
              <div className="mb-1.5 flex items-center gap-1.5">
                <Mic size={12} style={{ color: TLK.inkDim }} />
                <span
                  style={{
                    fontFamily: TLK_FONT.sans,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 1.5,
                    color: TLK.inkDim,
                    textTransform: "uppercase",
                  }}
                >
                  다음 발화자 한 마디
                </span>
              </div>
              <p style={{ fontFamily: TLK_FONT.ko, fontSize: 13, color: TLK.ink, lineHeight: 1.55 }}>
                {result.coaching.next_speaker_tip}
              </p>
            </div>
          )}

          {/* 진행자 추가 메모 (보완) */}
          <div>
            <p
              style={{
                fontFamily: TLK_FONT.sans,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1.5,
                color: TLK.inkFaint,
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              진행자 추가 메모 (선택)
            </p>
            <textarea
              value={note}
              onChange={(e) => onChange(e.target.value)}
              placeholder="AI가 놓친 부분이나 진행자만의 코칭 한 줄..."
              rows={3}
              aria-label="진행자 추가 메모"
              className="w-full resize-none rounded-xl px-4 py-3"
              style={{
                background: TLK.paperHi,
                border: `1px solid ${TLK.rule}`,
                color: TLK.ink,
                fontFamily: TLK_FONT.serif,
                fontSize: 14,
                lineHeight: 1.5,
                outline: "none",
              }}
            />
          </div>
        </>
      ) : (
        // AI 결과 없음 — 수동 메모 풀모드
        <>
          <div
            className="rounded-xl px-3 py-2"
            style={{ background: TLK.bg2, border: `1px dashed ${TLK.rule}` }}
          >
            <p style={{ fontFamily: TLK_FONT.sans, fontSize: 11, color: TLK.inkDim, lineHeight: 1.5 }}>
              AI 코칭이 아직 생성되지 않았어요. 답변 단계로 돌아가 녹음하거나, 진행자가 직접 메모를 작성하세요.
            </p>
          </div>
          <textarea
            value={note}
            onChange={(e) => onChange(e.target.value)}
            placeholder="잘한 점 1개 + 보완할 점 1개를 짧게 정리해보세요. 예) 핵심 표현 'I'd rather' 잘 활용 / Linker(however) 한 번 더"
            rows={8}
            aria-label="코치 노트"
            className="w-full flex-1 resize-none rounded-xl px-4 py-3"
            style={{
              background: TLK.paperHi,
              border: `1px solid ${TLK.rule}`,
              color: TLK.ink,
              fontFamily: TLK_FONT.serif,
              fontSize: 15,
              lineHeight: 1.55,
              outline: "none",
            }}
          />
        </>
      )}
    </div>
  );
}

function DiscussPanel({
  coachNote,
  result,
}: {
  coachNote: string;
  result?: CoachingResult;
}) {
  // AI 토론 거리 우선, 없으면 fallback
  const hooks = result?.coaching.discussion_hooks ?? [
    "이 표현을 자기 답변에도 가져다 쓸 수 있을까?",
    "보완점 1가지에 대해 다른 멤버는 어떻게 풀어내는지 짧게 공유",
    "오늘의 키프레이즈 후보 하나 고르기",
  ];

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      <div className="flex items-center gap-2">
        <MessagesSquare size={16} style={{ color: TLK.accent2 }} />
        <p
          style={{
            fontFamily: TLK_FONT.sans,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1.5,
            color: TLK.accent2,
            textTransform: "uppercase",
          }}
        >
          토론 — 코치 노트가 발판
        </p>
      </div>

      {/* AI 한 줄 요약 (있을 때) */}
      {result?.coaching.summary && (
        <div
          className="rounded-xl px-4 py-3"
          style={{ background: `${TLK.accent}0d`, border: `1px solid ${TLK.accent}33` }}
        >
          <p
            style={{
              fontFamily: TLK_FONT.serif,
              fontStyle: "italic",
              fontSize: 16,
              color: TLK.ink,
              lineHeight: 1.5,
            }}
          >
            {result.coaching.summary}
          </p>
        </div>
      )}

      {/* 진행자 메모 (수동 입력이 있을 때만) */}
      {coachNote && (
        <div
          className="rounded-xl px-4 py-3"
          style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}
        >
          <p
            style={{
              fontFamily: TLK_FONT.sans,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1.5,
              color: TLK.inkFaint,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            진행자 메모
          </p>
          <p
            style={{
              fontFamily: TLK_FONT.serif,
              fontSize: 15,
              color: TLK.ink,
              lineHeight: 1.55,
              whiteSpace: "pre-wrap",
            }}
          >
            {coachNote}
          </p>
        </div>
      )}

      {/* 토론 거리 */}
      <div>
        <p
          style={{
            fontFamily: TLK_FONT.sans,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1.5,
            color: TLK.inkFaint,
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          {result ? "AI 토론 거리" : "토론 거리 (기본)"}
        </p>
        <ul className="space-y-2">
          {hooks.map((p, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-xl px-4 py-3"
              style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}
            >
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: TLK.accent2,
                  color: "#fff",
                  fontFamily: TLK_FONT.sans,
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                {i + 1}
              </span>
              <span
                style={{
                  fontFamily: TLK_FONT.ko,
                  fontSize: 14,
                  color: TLK.ink,
                  lineHeight: 1.55,
                }}
              >
                {p}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ─── Phase 3 · 회고 ─────────────────── */

function RecapPhase({
  combo,
  coachNotes,
  members,
  absentIds,
  memberRecaps,
  onChangeRecap,
}: {
  combo: { id: string; question_english?: string | null }[];
  coachNotes: Record<string, string>;
  members: { id: string; name: string; emoji: string; color: string }[];
  absentIds: Set<string>;
  memberRecaps: Record<string, string>;
  onChangeRecap: (mid: string, v: string) => void;
}) {
  const present = members.filter((m) => !absentIds.has(m.id));
  return (
    <div className="flex h-full flex-col gap-5">
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
          Recap
        </p>
        <h2
          style={{
            fontFamily: TLK_FONT.serif,
            fontStyle: "italic",
            fontSize: 36,
            fontWeight: 500,
            color: TLK.ink,
            lineHeight: 1.2,
            marginTop: 4,
            letterSpacing: -0.5,
          }}
        >
          4문항 한눈에 짚어보기
        </h2>
      </div>

      {/* 4문항 노트 그리드 */}
      <div className="grid gap-3 md:grid-cols-2">
        {combo.map((q, i) => (
          <div
            key={q.id}
            className="rounded-2xl px-5 py-4"
            style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}
          >
            <div className="mb-2 flex items-center gap-2">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full"
                style={{
                  background: TLK.accent,
                  color: "#fff",
                  fontFamily: TLK_FONT.sans,
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                {i + 1}
              </span>
              <p
                className="flex-1 truncate"
                style={{
                  fontFamily: TLK_FONT.serif,
                  fontStyle: "italic",
                  fontSize: 14,
                  color: TLK.ink,
                }}
              >
                {q.question_english}
              </p>
            </div>
            <p
              style={{
                fontFamily: TLK_FONT.ko,
                fontSize: 12.5,
                color: coachNotes[q.id] ? TLK.inkDim : TLK.inkFaint,
                lineHeight: 1.55,
                whiteSpace: "pre-wrap",
                fontStyle: coachNotes[q.id] ? "normal" : "italic",
              }}
            >
              {coachNotes[q.id] || "(코치 노트 없음)"}
            </p>
          </div>
        ))}
      </div>

      {/* 멤버별 한 줄 회고 */}
      <div>
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
          멤버별 한 줄 회고
        </p>
        <div className="grid gap-2 md:grid-cols-2">
          {present.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
                style={{ background: `${m.color}22`, border: `2px solid ${m.color}` }}
              >
                {m.emoji}
              </span>
              <input
                value={memberRecaps[m.id] ?? ""}
                onChange={(e) => onChangeRecap(m.id, e.target.value)}
                placeholder={`${m.name}이(가) 가져갈 한 줄`}
                aria-label={`${m.name} 회고`}
                className="flex-1 rounded-lg px-3 py-2 text-sm"
                style={{
                  background: TLK.paperHi,
                  border: `1px solid ${TLK.rule}`,
                  color: TLK.ink,
                  fontFamily: TLK_FONT.ko,
                  outline: "none",
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Phase 4 · Closing ──────────────── */

function ClosingPhase({
  combo,
  completed,
  onComplete,
}: {
  combo: { id: string; question_english?: string | null }[];
  completed: boolean;
  onComplete: (c: boolean) => void;
}) {
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
