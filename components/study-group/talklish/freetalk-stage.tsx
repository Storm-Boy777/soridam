"use client";

// Talklish · 금요일 (Free Talk) Stage
// 3컬럼 (좌:게임 메뉴 / 중:게임 진행 / 우:룰렛+타이머)

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shuffle, Play as PlayIcon, RotateCcw } from "lucide-react";
import { fetchFreetalkTopics, fetchGameCards, fetchPanelMembers, fetchTalklishGameSets } from "@/lib/actions/study-group";
import type {
  StoryStarter,
  TabooCard,
  WouldYouRatherCard,
  DebateTopic,
  SpinnerTopicData,
  RoleplayCardData,
} from "@/lib/types/study-group";
import { TLK, TLK_FONT } from "./tokens";
import { useSpeakerRoulette } from "./use-speaker-roulette";
import { SpeakerCard } from "./speaker-card";

type GameKey = "spinner" | "wyr" | "whoami" | "twolies" | "taboo" | "roleplay" | "hotseat" | "story" | "debate";

interface GameDef {
  key: GameKey;
  num: string;
  emoji: string;
  name: string;
  desc: string;
  rule: string;
}

const GAMES: GameDef[] = [
  {
    key: "spinner",
    num: "01",
    emoji: "🎯",
    name: "토픽 스피너",
    desc: "랜덤 주제 1분 발화 (+ JAM 모드)",
    rule: "버튼을 눌러 랜덤 주제를 뽑고, 발화자가 1분 동안 영어로 자유롭게 말합니다. JAM 모드를 켜면 끊김·반복·주제이탈 없이 도전!",
  },
  {
    key: "wyr",
    num: "02",
    emoji: "↔️",
    name: "Would You Rather",
    desc: "둘 중 하나 고르고 이유를 영어로",
    rule: "두 선택지 중 반드시 하나를 고르고, 그 이유를 영어로 설명합니다. '둘 다'는 금지! 다른 사람의 선택에도 질문해 봅니다.",
  },
  {
    key: "whoami",
    num: "03",
    emoji: "🔍",
    name: "스무고개",
    desc: "예/아니오 질문으로 정답 단어 맞히기",
    rule: "한 명만 정답 단어를 보고, 나머지는 예/아니오로 답할 수 있는 영어 질문을 던져 정답을 추측합니다. 평서문 말고 질문으로만!",
  },
  {
    key: "twolies",
    num: "04",
    emoji: "🎭",
    name: "Two Truths & a Lie",
    desc: "진실 2 + 거짓 1, 영어로만 질문해서 거짓 찾기",
    rule: "한 명이 자기에 대한 사실 2가지 + 거짓 1가지를 말하면, 나머지가 영어로만 질문해서 거짓을 맞춥니다.",
  },
  {
    key: "taboo",
    num: "05",
    emoji: "🚫",
    name: "Taboo",
    desc: "금지 단어 없이 목표 단어 설명하기",
    rule: "설명하는 사람만 화면을 보고, 목표 단어를 금지 단어 없이 영어로 설명합니다. 나머지는 잠깐 눈을 감고 듣다가 맞혀 봅니다.",
  },
  {
    key: "roleplay",
    num: "06",
    emoji: "🎬",
    name: "롤플레이",
    desc: "실제 상황 2인 역할극 + 감정 연기",
    rule: "상황 카드를 뽑아 두 명이 각자 역할을 맡아 영어로 연기합니다. 감탄·좌절·놀람 같은 감정 표현을 넣으면 OPIc 롤플레이에 그대로 직결돼요.",
  },
  {
    key: "hotseat",
    num: "07",
    emoji: "🔥",
    name: "핫시트",
    desc: "한 명이 의자에. 나머지가 영어로 90초간 질문 폭격",
    rule: "한 명이 핫시트(의자)에 앉고, 나머지가 90초 동안 영어로만 질문을 쏟아붓습니다. 핫시트는 영어로 즉답.",
  },
  {
    key: "story",
    num: "08",
    emoji: "📚",
    name: "한 문장 이어쓰기",
    desc: "한 사람이 한 문장씩 이어 붙여 즉흥 이야기 만들기",
    rule: "시작 문장이 주어지면, 한 사람이 한 문장씩 영어로 이어 붙여 즉흥 이야기를 완성합니다.",
  },
  {
    key: "debate",
    num: "09",
    emoji: "⚖️",
    name: "Debate",
    desc: "찬성·반대로 나눠 구조 있게 토론",
    rule: "주제와 배경을 확인하고 찬성·반대로 나뉩니다. 각 팀이 근거를 들어 주장하고, 자유 토론으로 마무리합니다. 고급 발화 연습용.",
  },
];

// 게임별 타이머 프리셋 (초)
const TIMER_PRESETS: Record<GameKey, number[]> = {
  spinner: [60, 90, 120],
  wyr: [60, 90, 120],
  whoami: [60, 120, 180],
  twolies: [60, 90, 180],
  taboo: [30, 60, 90],
  roleplay: [90, 120, 180],
  hotseat: [60, 90, 120],
  story: [60, 90, 180],
  debate: [120, 180, 300],
};

const DIFF_LABEL: Record<string, string> = { beginner: "초급", intermediate: "중급", advanced: "고급" };

interface Props {
  focusMode: boolean;  // Full 모드 — 헤더의 현재 게임 표시를 가운데로 (일반 모드는 우측)
  absentIds: Set<string>;
  onToggleAttendance: (memberId: string) => void;
}

type FridayPhase = "intro" | "games" | "closing";

export function FreetalkStage({ focusMode, absentIds, onToggleAttendance }: Props) {
  const [phase, setPhase] = useState<FridayPhase>("intro");
  const [game, setGame] = useState<GameKey>("spinner");
  // 룰렛 state는 useSpeakerRoulette 훅에서 관리
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null); // null = 기본(전체 풀)

  const { data: topics = [] } = useQuery({
    queryKey: ["study-freetalk"],
    queryFn: () => fetchFreetalkTopics(),
    staleTime: 5 * 60 * 1000,
  });
  const { data: storyCards = [] } = useQuery({
    queryKey: ["study-game-cards", "story-chain"],
    queryFn: () => fetchGameCards("story-chain"),
    staleTime: 5 * 60 * 1000,
  });
  const { data: tabooCards = [] } = useQuery({
    queryKey: ["study-game-cards", "taboo"],
    queryFn: () => fetchGameCards("taboo"),
    staleTime: 5 * 60 * 1000,
  });
  const { data: wyrCards = [] } = useQuery({
    queryKey: ["study-game-cards", "would-you-rather"],
    queryFn: () => fetchGameCards("would-you-rather"),
    staleTime: 5 * 60 * 1000,
  });
  const { data: debateCards = [] } = useQuery({
    queryKey: ["study-game-cards", "debate"],
    queryFn: () => fetchGameCards("debate"),
    staleTime: 5 * 60 * 1000,
  });
  const { data: members = [] } = useQuery({
    queryKey: ["study-panel-members"],
    queryFn: fetchPanelMembers,
    staleTime: 5 * 60 * 1000,
  });
  // AI 게임 세트 — 세트 선택자용 (없으면 기본 풀 사용)
  const { data: gameSets = [] } = useQuery({
    queryKey: ["talklish-gamesets"],
    queryFn: fetchTalklishGameSets,
    staleTime: 5 * 60 * 1000,
  });

  const presentMembers = useMemo(
    () => members.filter((m) => !absentIds.has(m.id)),
    [members, absentIds]
  );

  // 활성 세트 — 선택된 AI 세트 또는 기본(전체 카드 풀 + 하드코딩 롤플레이)
  const activeSet = useMemo(() => {
    const set = gameSets.find((s) => s.id === selectedSetId);
    if (set) {
      return {
        spinner_topics: set.spinner_topics ?? [],
        taboo: set.taboo ?? [],
        wyr: set.wyr ?? [],
        roleplay: set.roleplay ?? [],
        story: set.story ?? [],
        debate: set.debate ?? [],
      };
    }
    return {
      spinner_topics: topics as SpinnerTopicData[],
      taboo: tabooCards.map((c) => c.data as TabooCard),
      wyr: wyrCards.map((c) => c.data as WouldYouRatherCard),
      roleplay: ROLEPLAY_SCENARIOS,
      story: storyCards.map((c) => c.data as StoryStarter),
      debate: debateCards.map((c) => c.data as DebateTopic),
    };
  }, [gameSets, selectedSetId, topics, tabooCards, wyrCards, storyCards, debateCards]);

  // 공통 발화자 룰렛 — 한 라운드 = 출석자 전원 한 번씩 (월·수·금 동일 동작)
  const { activeSpeaker, hasSpun, spinning, spin } = useSpeakerRoulette({
    members,
    presentMembers,
    spinDelayMs: 1200,
  });

  // 키보드 단축키 — ← → 단계 이동 / R 룰렛(games) / F 좌·우 패널 숨김
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target;
      if (t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (phase === "intro") setPhase("games");
        else if (phase === "games") setPhase("closing");
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (phase === "closing") setPhase("games");
        else if (phase === "games") setPhase("intro");
      } else if (e.key === "r" || e.key === "R") {
        if (phase === "games") { e.preventDefault(); spin(); }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, spin]);

  const def = GAMES.find((g) => g.key === game)!;
  const presentCount = presentMembers.length;
  const totalCount = members.length;

  // ─── Intro / Closing phase는 별도 화면 ───
  if (phase === "intro") {
    return (
      <FridayIntro
        presentCount={presentCount}
        totalCount={totalCount}
        onStart={() => setPhase("games")}
      />
    );
  }
  if (phase === "closing") {
    return (
      <FridayClosing
        completed={sessionCompleted}
        onComplete={setSessionCompleted}
        onBackToGames={() => setPhase("games")}
      />
    );
  }

  return (
    <div
      className="flex h-full flex-col"
      style={{ background: TLK.bg, color: TLK.ink, fontFamily: TLK_FONT.ko }}
    >
      {/* ① 헤더 — 월·수 Stage와 동일 구조 (진행바 자리엔 현재 게임 이름) */}
      <header
        className="relative flex shrink-0 items-center gap-4 border-b px-6 py-3.5 sm:px-10"
        style={{ borderColor: TLK.rule, background: TLK.bg }}
      >
        <div className="min-w-0 max-w-md flex-1">
          <p
            className="truncate"
            style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 16, fontWeight: 500, color: TLK.ink }}
          >
            Free Talk
          </p>
          <p style={{ fontFamily: TLK_FONT.sans, fontSize: 10.5, color: TLK.inkFaint, marginTop: 2, letterSpacing: 0.5 }}>
            Friday Night
          </p>
        </div>

        {!focusMode && <div className="flex-1" />}

        {/* 현재 게임 — 일반 모드 우측 / Full 모드 가운데 (월·수 진행바 자리) */}
        <div
          className={
            focusMode
              ? "absolute left-1/2 flex -translate-x-1/2 items-center gap-2"
              : "flex items-center gap-2"
          }
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>{def.emoji}</span>
          <span style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 16, fontWeight: 500, color: TLK.ink }}>
            {def.name}
          </span>
        </div>
      </header>

      {/* ② 본문 — 3컬럼 (좌:게임 메뉴 / 중:게임 진행 / 우:룰렛) */}
      <div
        className="grid min-h-0 flex-1"
        style={{ gridTemplateColumns: "300px 1fr 340px" }}
      >
        {/* ─── 좌: 게임 메뉴 ─── */}
      <aside
        className="flex flex-col gap-5 overflow-y-auto px-6 py-6"
        style={{ background: TLK.bg2, borderRight: `1px solid ${TLK.ruleHi}` }}
      >
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
            Friday Night
          </p>
          <p
            style={{
              fontFamily: TLK_FONT.serif,
              fontStyle: "italic",
              fontSize: 22,
              fontWeight: 500,
              lineHeight: 1.2,
              color: TLK.ink,
              marginTop: 4,
            }}
          >
            Talklish
          </p>
          <p
            style={{
              fontFamily: TLK_FONT.sans,
              fontSize: 12,
              color: TLK.inkDim,
              marginTop: 6,
            }}
          >
            한 주를 가볍게 마무리하는 9가지 게임
          </p>
        </div>

        {/* 오늘의 세트 선택자 — AI 생성 세트가 있을 때만 (없으면 기본 풀) */}
        {gameSets.length > 0 && (
          <div>
            <p
              style={{
                fontFamily: TLK_FONT.sans,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 2.5,
                color: TLK.inkFaint,
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              오늘의 세트
            </p>
            <select
              aria-label="오늘의 세트"
              value={selectedSetId ?? ""}
              onChange={(e) => setSelectedSetId(e.target.value || null)}
              className="w-full rounded-lg px-2.5 py-2 text-sm outline-none"
              style={{ background: TLK.paper, border: `1px solid ${TLK.rule}`, color: TLK.ink, fontFamily: TLK_FONT.ko, cursor: "pointer" }}
            >
              <option value="">기본 — 전체 카드 풀</option>
              {gameSets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.theme} · {DIFF_LABEL[s.difficulty] ?? s.difficulty}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ height: 1, background: TLK.rule }} />

        <div className="flex flex-col gap-1.5">
          <p
            style={{
              fontFamily: TLK_FONT.sans,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 2.5,
              color: TLK.inkFaint,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Games
          </p>
          {GAMES.map((g) => {
            const active = game === g.key;
            return (
              <button
                key={g.key}
                onClick={() => setGame(g.key)}
                className="flex items-start gap-3 rounded-lg px-2 py-2.5 text-left transition-colors"
                style={{
                  background: active ? `${TLK.accent}15` : "transparent",
                  border: 0,
                  cursor: "pointer",
                }}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg"
                  style={{
                    background: active ? TLK.accent : TLK.paper,
                    border: `1px solid ${active ? TLK.accent : TLK.rule}`,
                  }}
                >
                  {g.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span
                      style={{
                        fontFamily: TLK_FONT.mono,
                        fontSize: 9,
                        color: TLK.inkFaint,
                      }}
                    >
                      {g.num}
                    </span>
                    <span
                      style={{
                        fontFamily: TLK_FONT.serif,
                        fontStyle: "italic",
                        fontSize: 14,
                        fontWeight: active ? 600 : 400,
                        color: active ? TLK.accent : TLK.ink,
                      }}
                    >
                      {g.name}
                    </span>
                  </div>
                  <p
                    style={{
                      fontFamily: TLK_FONT.sans,
                      fontSize: 11,
                      color: active ? TLK.inkDim : TLK.inkFaint,
                      marginTop: 2,
                      lineHeight: 1.5,
                    }}
                  >
                    {g.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ─── 중: 게임 메인 ─── */}
      <main className="overflow-y-auto px-10 py-8">
        <div className="mb-5 flex items-baseline gap-3">
          <span
            style={{
              fontFamily: TLK_FONT.mono,
              fontSize: 11,
              letterSpacing: 1,
              color: TLK.inkFaint,
            }}
          >
            GAME {def.num} · {def.emoji}
          </span>
          <h2
            style={{
              fontFamily: TLK_FONT.serif,
              fontStyle: "italic",
              fontSize: 28,
              fontWeight: 500,
              color: TLK.ink,
              letterSpacing: -0.5,
            }}
          >
            {def.name}
          </h2>
        </div>

        {/* 룰 카드 */}
        <div
          className="mb-6 rounded-xl px-6 py-5"
          style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}
        >
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
            How to play
          </p>
          <p
            style={{
              fontFamily: TLK_FONT.serif,
              fontSize: 18,
              color: TLK.ink,
              lineHeight: 1.55,
              marginTop: 8,
              fontStyle: "italic",
            }}
          >
            {def.rule}
          </p>
        </div>

        {/* 게임별 본문 — 활성 세트에서 콘텐츠 공급 */}
        {game === "spinner" && <SpinnerGame topics={activeSet.spinner_topics} />}
        {game === "wyr" && <WyrGame cards={activeSet.wyr} />}
        {game === "whoami" && <WhoAmIGame cards={activeSet.taboo} />}
        {game === "twolies" && <TwoLiesGame />}
        {game === "taboo" && <TabooGame cards={activeSet.taboo} />}
        {game === "roleplay" && <RoleplayGame scenarios={activeSet.roleplay} />}
        {game === "hotseat" && <HotseatGame />}
        {game === "story" && <StoryGame cards={activeSet.story} />}
        {game === "debate" && <DebateGame cards={activeSet.debate} />}
      </main>

      {/* ─── 우: 룰렛 + 타이머 ─── */}
      <aside
        className="flex flex-col gap-5 overflow-y-auto px-5 py-6"
        style={{ background: TLK.bg, borderLeft: `1px solid ${TLK.ruleHi}` }}
      >
        {/* 룰렛 */}
        <SpeakerCard
          members={members}
          absentIds={absentIds}
          activeSpeaker={activeSpeaker}
          hasSpun={hasSpun}
          spinning={spinning}
          onSpin={spin}
          onToggleAttendance={onToggleAttendance}
        />

        {/* 게임 타이머 (게임별 프리셋) */}
        <GameTimer presets={TIMER_PRESETS[game]} />
      </aside>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   게임별 본문
   ───────────────────────────────────────────── */

function SpinnerGame({ topics }: { topics: SpinnerTopicData[] }) {
  const [picked, setPicked] = useState<SpinnerTopicData | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [showKo, setShowKo] = useState(false);
  const [jam, setJam] = useState(false);  // Just a Minute 모드 — 끊김·반복·주제이탈 금지

  const spin = () => {
    if (spinning || topics.length === 0) return;
    setSpinning(true);
    setTimeout(() => {
      const next = topics[Math.floor(Math.random() * topics.length)];
      setPicked(next);
      setSpinning(false);
    }, 1000);
  };

  if (topics.length === 0) {
    return (
      <p style={{ color: TLK.inkFaint, fontSize: 13, fontFamily: TLK_FONT.sans }}>
        등록된 주제가 없어요. 관리자 페이지에서 추가해 주세요.
      </p>
    );
  }

  return (
    <div
      className="rounded-2xl px-10 py-12 text-center"
      style={{ background: TLK.paper, border: `1px solid ${jam ? TLK.accent : TLK.rule}` }}
    >
      {/* JAM 모드 토글 */}
      <div className="mb-5 flex justify-center">
        <button
          onClick={() => setJam((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold tracking-wide transition-colors"
          style={{
            background: jam ? TLK.accent : TLK.bg2,
            color: jam ? "#fff" : TLK.inkDim,
            border: `1px solid ${jam ? TLK.accent : TLK.rule}`,
            fontFamily: TLK_FONT.sans,
            cursor: "pointer",
          }}
        >
          ⏱️ JAM 모드 {jam ? "ON" : "OFF"}
        </button>
      </div>

      {/* JAM 규칙 — 끊김·반복·주제이탈 없이 60초 */}
      {jam && (
        <div
          className="mx-auto mb-6 max-w-md rounded-xl px-5 py-4 text-left"
          style={{ background: `${TLK.accent}0D`, border: `1px solid ${TLK.accent}33` }}
        >
          <p
            style={{
              fontFamily: TLK_FONT.sans,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 2,
              color: TLK.accent,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Just a Minute · 60초 룰
          </p>
          <ul className="flex flex-col gap-1.5" style={{ fontFamily: TLK_FONT.sans, fontSize: 13, color: TLK.ink }}>
            <li>🚫 <strong>Hesitation</strong> — um·ah 멈칫거리면 안 돼요</li>
            <li>🚫 <strong>Repetition</strong> — 같은 단어·표현 반복 금지 (주제어 제외)</li>
            <li>🚫 <strong>Deviation</strong> — 주제에서 벗어나면 안 돼요</li>
          </ul>
          <p style={{ marginTop: 8, fontSize: 11.5, color: TLK.inkDim, fontFamily: TLK_FONT.sans }}>
            듣는 사람은 위반을 발견하면 “챌린지!”를 외치고 남은 시간을 이어받아요. 우측 60초 타이머와 함께!
          </p>
        </div>
      )}

      {!picked ? (
        <p
          style={{
            fontFamily: TLK_FONT.serif,
            fontStyle: "italic",
            fontSize: 22,
            color: TLK.inkDim,
          }}
        >
          버튼을 눌러 첫 주제를 뽑아주세요
        </p>
      ) : (
        <>
          <p
            style={{
              fontFamily: TLK_FONT.serif,
              fontStyle: "italic",
              fontSize: 28,
              fontWeight: 500,
              color: TLK.ink,
              lineHeight: 1.4,
              letterSpacing: -0.3,
            }}
          >
            “{picked.english}”
          </p>
          {showKo && picked.korean && (
            <p
              style={{
                marginTop: 12,
                fontSize: 14,
                color: TLK.inkDim,
                fontFamily: TLK_FONT.ko,
              }}
            >
              {picked.korean}
            </p>
          )}
          {picked.follow_up && (
            <p
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: `1px dashed ${TLK.rule}`,
                fontSize: 13,
                color: TLK.inkFaint,
                fontStyle: "italic",
                fontFamily: TLK_FONT.serif,
              }}
            >
              ↳ {picked.follow_up}
            </p>
          )}
        </>
      )}

      <div className="mt-6 flex items-center justify-center gap-2">
        <button
          onClick={spin}
          disabled={spinning}
          className="flex items-center gap-1.5 rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{
            background: TLK.accent,
            color: "#fff",
            border: 0,
            fontFamily: TLK_FONT.sans,
            cursor: spinning ? "wait" : "pointer",
          }}
        >
          <Shuffle size={14} />
          {spinning ? "SPIN…" : picked ? "다른 주제" : "주제 뽑기"}
        </button>
        {picked && (
          <button
            onClick={() => setShowKo((v) => !v)}
            className="rounded-full px-3 py-2 text-xs font-medium"
            style={{
              background: TLK.bg2,
              color: TLK.inkDim,
              border: `1px solid ${TLK.rule}`,
              fontFamily: TLK_FONT.sans,
              cursor: "pointer",
            }}
          >
            한국어 {showKo ? "OFF" : "ON"}
          </button>
        )}
      </div>
    </div>
  );
}

function StoryGame({ cards }: { cards: StoryStarter[] }) {
  const [idx, setIdx] = useState(0);
  if (cards.length === 0) {
    return (
      <p style={{ color: TLK.inkFaint, fontSize: 13, fontFamily: TLK_FONT.sans }}>
        등록된 시작 문장이 없어요.
      </p>
    );
  }
  const data = cards[idx % cards.length];
  return (
    <div
      className="rounded-2xl px-10 py-12 text-center"
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
        Genre · {data.genre || "—"}
      </p>
      <p
        style={{
          fontFamily: TLK_FONT.serif,
          fontStyle: "italic",
          fontSize: 28,
          fontWeight: 500,
          color: TLK.ink,
          lineHeight: 1.4,
          letterSpacing: -0.3,
          marginTop: 12,
        }}
      >
        “{data.opening}”
      </p>
      <button
        onClick={() => setIdx((p) => p + 1)}
        className="mt-6 inline-flex items-center gap-1.5 rounded-full px-6 py-2.5 text-sm font-semibold"
        style={{
          background: TLK.accent,
          color: "#fff",
          border: 0,
          fontFamily: TLK_FONT.sans,
          cursor: "pointer",
        }}
      >
        <Shuffle size={14} />
        다음 시작 문장
      </button>
    </div>
  );
}

function WyrGame({ cards }: { cards: WouldYouRatherCard[] }) {
  const [idx, setIdx] = useState(0);
  const [spinning, setSpinning] = useState(false);

  if (cards.length === 0) {
    return (
      <p style={{ color: TLK.inkFaint, fontSize: 13, fontFamily: TLK_FONT.sans }}>
        등록된 질문이 없어요. 관리자 페이지에서 추가해 주세요.
      </p>
    );
  }

  const data = cards[idx % cards.length];
  const next = () => {
    if (spinning) return;
    setSpinning(true);
    setTimeout(() => {
      setIdx((p) => p + 1);
      setSpinning(false);
    }, 250);
  };

  const Option = ({ label, text, color }: { label: string; text: string; color: string }) => (
    <div
      className="flex flex-1 flex-col items-center justify-center rounded-2xl px-6 py-10 text-center"
      style={{ background: TLK.paper, border: `1.5px solid ${color}` }}
    >
      <span
        style={{
          fontFamily: TLK_FONT.mono,
          fontSize: 11,
          letterSpacing: 2,
          color,
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        {label}
      </span>
      <p
        style={{
          fontFamily: TLK_FONT.serif,
          fontStyle: "italic",
          fontSize: 22,
          fontWeight: 500,
          color: TLK.ink,
          lineHeight: 1.4,
          letterSpacing: -0.3,
          marginTop: 14,
        }}
      >
        {text}
      </p>
    </div>
  );

  return (
    <div>
      <div className="flex flex-col items-stretch gap-4 md:flex-row" style={{ opacity: spinning ? 0.4 : 1, transition: "opacity .2s" }}>
        <Option label="Option A" text={data.optionA} color={TLK.accent2} />
        <div className="flex items-center justify-center">
          <span
            style={{
              fontFamily: TLK_FONT.serif,
              fontStyle: "italic",
              fontSize: 18,
              color: TLK.inkFaint,
            }}
          >
            or
          </span>
        </div>
        <Option label="Option B" text={data.optionB} color={TLK.accent} />
      </div>
      <div className="mt-6 flex justify-center">
        <button
          onClick={next}
          disabled={spinning}
          className="inline-flex items-center gap-1.5 rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{ background: TLK.accent, color: "#fff", border: 0, fontFamily: TLK_FONT.sans, cursor: "pointer" }}
        >
          <Shuffle size={14} />
          다른 질문
        </button>
      </div>
    </div>
  );
}

function TabooGame({ cards }: { cards: TabooCard[] }) {
  const [idx, setIdx] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);

  if (cards.length === 0) {
    return (
      <p style={{ color: TLK.inkFaint, fontSize: 13, fontFamily: TLK_FONT.sans }}>
        등록된 카드가 없어요. 관리자 페이지에서 추가해 주세요.
      </p>
    );
  }

  const draw = () => {
    if (spinning) return;
    setSpinning(true);
    setTimeout(() => {
      setIdx(Math.floor(Math.random() * cards.length));
      setSpinning(false);
    }, 600);
  };

  const data = idx !== null ? cards[idx] : null;

  return (
    <div
      className="rounded-2xl px-10 py-12 text-center"
      style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}
    >
      {!data ? (
        <p style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 22, color: TLK.inkDim }}>
          버튼을 눌러 첫 카드를 뽑아주세요
        </p>
      ) : (
        <>
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
            Describe this — don&apos;t say it
          </p>
          <p
            style={{
              fontFamily: TLK_FONT.serif,
              fontStyle: "italic",
              fontSize: 44,
              fontWeight: 500,
              color: TLK.ink,
              lineHeight: 1.2,
              letterSpacing: -0.5,
              marginTop: 10,
            }}
          >
            {data.target}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span style={{ fontFamily: TLK_FONT.sans, fontSize: 11, color: TLK.inkFaint, marginRight: 4 }}>
              금지어
            </span>
            {data.forbidden.map((w, i) => (
              <span
                key={i}
                className="rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  background: `${TLK.accent}14`,
                  color: TLK.accent,
                  border: `1px solid ${TLK.accent}44`,
                  fontFamily: TLK_FONT.sans,
                  textDecoration: "line-through",
                }}
              >
                {w}
              </span>
            ))}
          </div>
        </>
      )}

      <div className="mt-7 flex justify-center">
        <button
          onClick={draw}
          disabled={spinning}
          className="inline-flex items-center gap-1.5 rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{
            background: TLK.accent,
            color: "#fff",
            border: 0,
            fontFamily: TLK_FONT.sans,
            cursor: spinning ? "wait" : "pointer",
          }}
        >
          <Shuffle size={14} />
          {spinning ? "DRAW…" : data ? "다른 카드" : "카드 뽑기"}
        </button>
      </div>
    </div>
  );
}

function DebateGame({ cards }: { cards: DebateTopic[] }) {
  const [idx, setIdx] = useState(0);
  const [showPoints, setShowPoints] = useState(false);

  if (cards.length === 0) {
    return (
      <p style={{ color: TLK.inkFaint, fontSize: 13, fontFamily: TLK_FONT.sans }}>
        등록된 토론 주제가 없어요. 관리자 페이지에서 추가해 주세요.
      </p>
    );
  }

  const data = cards[idx % cards.length];
  const nextTopic = () => {
    setIdx((p) => p + 1);
    setShowPoints(false);
  };

  return (
    <div>
      {/* 주제 + 배경 */}
      <div
        className="rounded-2xl px-8 py-8 text-center"
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
          Motion
        </p>
        <p
          style={{
            fontFamily: TLK_FONT.serif,
            fontStyle: "italic",
            fontSize: 28,
            fontWeight: 500,
            color: TLK.ink,
            lineHeight: 1.35,
            letterSpacing: -0.3,
            marginTop: 10,
          }}
        >
          “{data.topic}”
        </p>
        {data.context && (
          <p
            style={{
              marginTop: 12,
              fontSize: 13,
              color: TLK.inkDim,
              fontFamily: TLK_FONT.sans,
              lineHeight: 1.6,
              maxWidth: 560,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {data.context}
          </p>
        )}
      </div>

      {/* 찬반 근거 — 토글로 가렸다가 공개 (먼저 스스로 생각) */}
      {showPoints ? (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <PointColumn label="For · 찬성" color={TLK.accent2} points={data.proPoints} />
          <PointColumn label="Against · 반대" color={TLK.accent} points={data.conPoints} />
        </div>
      ) : (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => setShowPoints(true)}
            className="rounded-full px-5 py-2 text-xs font-semibold"
            style={{
              background: TLK.bg2,
              color: TLK.inkDim,
              border: `1px solid ${TLK.rule}`,
              fontFamily: TLK_FONT.sans,
              cursor: "pointer",
            }}
          >
            💡 찬반 근거 힌트 보기
          </button>
        </div>
      )}

      <div className="mt-5 flex justify-center">
        <button
          onClick={nextTopic}
          className="inline-flex items-center gap-1.5 rounded-full px-6 py-2.5 text-sm font-semibold"
          style={{ background: TLK.accent, color: "#fff", border: 0, fontFamily: TLK_FONT.sans, cursor: "pointer" }}
        >
          <Shuffle size={14} />
          다른 주제
        </button>
      </div>
    </div>
  );
}

function PointColumn({ label, color, points }: { label: string; color: string; points: string[] }) {
  return (
    <div className="rounded-2xl px-6 py-5" style={{ background: TLK.paper, border: `1.5px solid ${color}` }}>
      <p
        style={{
          fontFamily: TLK_FONT.sans,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1.5,
          color,
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        {label}
      </p>
      <ul className="flex flex-col gap-2">
        {points.map((p, i) => (
          <li
            key={i}
            className="flex items-start gap-2"
            style={{ fontFamily: TLK_FONT.sans, fontSize: 14, color: TLK.ink, lineHeight: 1.5 }}
          >
            <span style={{ color, fontWeight: 700 }}>·</span>
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

function WhoAmIGame({ cards }: { cards: TabooCard[] }) {
  const [idx, setIdx] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [spinning, setSpinning] = useState(false);

  if (cards.length === 0) {
    return (
      <p style={{ color: TLK.inkFaint, fontSize: 13, fontFamily: TLK_FONT.sans }}>
        등록된 단어가 없어요. 관리자 페이지에서 추가해 주세요.
      </p>
    );
  }

  const draw = () => {
    if (spinning) return;
    setSpinning(true);
    setRevealed(false);
    setTimeout(() => {
      setIdx(Math.floor(Math.random() * cards.length));
      setSpinning(false);
    }, 500);
  };

  const target = idx !== null ? cards[idx].target : null;

  return (
    <div
      className="rounded-2xl px-10 py-12 text-center"
      style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}
    >
      {!target ? (
        <p style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 22, color: TLK.inkDim }}>
          버튼을 눌러 정답 단어를 뽑아주세요
        </p>
      ) : (
        <>
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
            What am I?
          </p>
          <p
            style={{
              fontFamily: TLK_FONT.serif,
              fontStyle: "italic",
              fontSize: 44,
              fontWeight: 500,
              color: revealed ? TLK.ink : TLK.inkFaint,
              lineHeight: 1.2,
              letterSpacing: -0.5,
              marginTop: 10,
              filter: revealed ? "none" : "blur(11px)",
              transition: "filter .15s",
              userSelect: revealed ? "auto" : "none",
            }}
          >
            {target}
          </p>
          <p style={{ marginTop: 14, fontSize: 12.5, color: TLK.inkDim, fontFamily: TLK_FONT.sans }}>
            추측하는 사람은 <strong>예/아니오 질문만</strong> — “Is it ~?”, “Can you ~?”, “Do people use it ~?”
          </p>
        </>
      )}

      <div className="mt-7 flex items-center justify-center gap-2">
        <button
          onClick={draw}
          disabled={spinning}
          className="inline-flex items-center gap-1.5 rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{
            background: TLK.accent,
            color: "#fff",
            border: 0,
            fontFamily: TLK_FONT.sans,
            cursor: spinning ? "wait" : "pointer",
          }}
        >
          <Shuffle size={14} />
          {spinning ? "DRAW…" : target ? "다른 단어" : "단어 뽑기"}
        </button>
        {target && (
          <button
            onClick={() => setRevealed((v) => !v)}
            className="rounded-full px-3 py-2 text-xs font-medium"
            style={{
              background: TLK.bg2,
              color: TLK.inkDim,
              border: `1px solid ${TLK.rule}`,
              fontFamily: TLK_FONT.sans,
              cursor: "pointer",
            }}
          >
            {revealed ? "🙈 가리기" : "👁️ 정답 보기"}
          </button>
        )}
      </div>
    </div>
  );
}

// 기본 세트 롤플레이 — AI 세트가 없을 때(기본 풀) 쓰는 하드코딩 시나리오.
// 타입은 공용 RoleplayCardData (AI 세트와 동일 모양).
const ROLEPLAY_SCENARIOS: RoleplayCardData[] = [
  {
    emoji: "🍽️",
    title: "식당 컴플레인",
    situation: "You ordered your steak medium, but it arrived completely burnt. Call the server over and sort it out.",
    situation_ko: "미디엄으로 주문한 스테이크가 새까맣게 탄 채로 나왔어요. 종업원을 불러 해결하세요.",
    role_a: { name: "Customer · 손님", mission: "정중하지만 단호하게 문제를 설명하고, 재조리 또는 환불을 요청해요." },
    role_b: { name: "Server · 종업원", mission: "사과하고 해결책(재조리·할인·서비스)을 제시해 손님을 달래요." },
    phrases: [
      "Excuse me, I'm afraid there's a problem with my order.",
      "This really isn't what I asked for.",
      "Could you replace it, or take it off the bill?",
      "I'm so sorry about that — let me fix it right away.",
    ],
    emotion: "😤 약간의 짜증 → 🙂 누그러짐",
  },
  {
    emoji: "🏨",
    title: "호텔 체크인 문제",
    situation: "You booked a non-smoking double room, but the front desk only has a smoking single left. Sort it out at check-in.",
    situation_ko: "금연 더블룸을 예약했는데 프런트엔 흡연 싱글룸만 남았다고 해요. 체크인하며 해결하세요.",
    role_a: { name: "Guest · 투숙객", mission: "예약 내역을 근거로 약속한 방을 요구하고 대안을 협상해요." },
    role_b: { name: "Front desk · 직원", mission: "상황을 설명하고 업그레이드·할인 같은 대안을 제시해요." },
    phrases: [
      "I have a reservation under the name ~.",
      "I specifically booked a non-smoking room.",
      "Is there anything you can do for me?",
      "Let me see what I can offer you.",
    ],
    emotion: "😟 당황 → 😮 놀람(업그레이드 제안에)",
  },
  {
    emoji: "📦",
    title: "환불·교환",
    situation: "The wireless headphones you bought last week suddenly stopped working. Take them back to the store.",
    situation_ko: "지난주에 산 무선 헤드폰이 갑자기 고장 났어요. 매장에 가서 반품하세요.",
    role_a: { name: "Customer · 손님", mission: "문제를 설명하고 영수증을 제시하며 환불 또는 교환을 요구해요." },
    role_b: { name: "Store clerk · 점원", mission: "환불 정책을 확인하고 교환·수리·환불 중에서 안내해요." },
    phrases: [
      "I'd like to return these, please.",
      "They stopped working after just a few days.",
      "Do you have the receipt with you?",
      "Would you prefer a refund or an exchange?",
    ],
    emotion: "😑 불만 → 😌 만족",
  },
  {
    emoji: "🏥",
    title: "병원 진료",
    situation: "You've had a bad headache and trouble sleeping for a week. Describe your symptoms to the doctor.",
    situation_ko: "일주일째 심한 두통과 불면에 시달리고 있어요. 의사에게 증상을 설명하세요.",
    role_a: { name: "Patient · 환자", mission: "증상·기간·정도를 구체적으로 설명하고 궁금한 점을 물어봐요." },
    role_b: { name: "Doctor · 의사", mission: "추가 질문으로 상태를 파악하고 처방·생활 조언을 제시해요." },
    phrases: [
      "I've been having headaches for about a week.",
      "It seems to get worse in the morning.",
      "How long has this been going on?",
      "I'd recommend you ~ and get some rest.",
    ],
    emotion: "😣 불편함 호소 → 🙏 안심",
  },
  {
    emoji: "💼",
    title: "면접",
    situation: "You're interviewing for your dream job. Answer the interviewer's questions confidently.",
    situation_ko: "꿈꾸던 회사의 면접 자리예요. 면접관의 질문에 자신 있게 답하세요.",
    role_a: { name: "Candidate · 지원자", mission: "강점·경험·지원 동기를 자신 있게 어필해요." },
    role_b: { name: "Interviewer · 면접관", mission: "자기소개·강점/약점·미래 계획을 차례로 물어봐요." },
    phrases: [
      "Tell me a little about yourself.",
      "What would you say are your strengths and weaknesses?",
      "I'm really passionate about ~.",
      "Why do you want to work with us?",
    ],
    emotion: "😊 자신감(긴장 누르기)",
  },
  {
    emoji: "🗺️",
    title: "길 안내",
    situation: "A lost tourist asks you how to get to the nearest subway station. Give clear directions.",
    situation_ko: "길 잃은 관광객이 가장 가까운 지하철역 가는 길을 물어요. 명확하게 안내하세요.",
    role_a: { name: "Tourist · 관광객", mission: "길을 묻고, 잘 못 알아들으면 다시 되물어요." },
    role_b: { name: "Local · 현지인", mission: "방향·거리·랜드마크를 활용해 길을 안내해요." },
    phrases: [
      "Excuse me, how do I get to ~?",
      "Go straight and turn left at the corner.",
      "It's about a five-minute walk from here.",
      "Sorry, could you say that one more time?",
    ],
    emotion: "😅 헤맴 → 🙏 고마움",
  },
  {
    emoji: "📞",
    title: "약속 변경 전화",
    situation: "You can't make tonight's dinner with a friend. Call to cancel and reschedule.",
    situation_ko: "오늘 저녁 친구와의 약속에 못 가게 됐어요. 전화해서 취소하고 다시 잡으세요.",
    role_a: { name: "Caller · 거는 사람", mission: "사정을 설명하고 사과한 뒤 새로운 날짜를 제안해요." },
    role_b: { name: "Friend · 친구", mission: "아쉬움을 표현하면서 새 일정을 함께 조율해요." },
    phrases: [
      "Hey, something came up and I can't make it tonight.",
      "I'm really sorry for the short notice.",
      "Can we reschedule for another day?",
      "No worries — how about Friday instead?",
    ],
    emotion: "😔 미안함 → 😄 반가움",
  },
  {
    emoji: "🧳",
    title: "분실물 신고",
    situation: "You left your bag in a taxi. Call the taxi company to report it and get it back.",
    situation_ko: "택시에 가방을 두고 내렸어요. 택시 회사에 전화해 신고하고 찾으세요.",
    role_a: { name: "Passenger · 승객", mission: "분실 시간·장소와 가방 생김새를 설명하고 회수 방법을 물어요." },
    role_b: { name: "Staff · 직원", mission: "정보를 확인하고 처리 절차를 차분히 안내해요." },
    phrases: [
      "I think I left my bag in one of your taxis.",
      "It's a black backpack with a laptop inside.",
      "I got off around 8 p.m. near ~.",
      "Let me check with the driver for you.",
    ],
    emotion: "😰 다급함 → 😅 안도",
  },
];

function RoleplayGame({ scenarios }: { scenarios: RoleplayCardData[] }) {
  const [idx, setIdx] = useState(() => (scenarios.length ? Math.floor(Math.random() * scenarios.length) : 0));
  const [showPhrases, setShowPhrases] = useState(false);

  if (scenarios.length === 0) {
    return (
      <p style={{ color: TLK.inkFaint, fontSize: 13, fontFamily: TLK_FONT.sans }}>
        등록된 역할극 상황이 없어요.
      </p>
    );
  }

  const s = scenarios[idx % scenarios.length];
  const nextScenario = () => {
    setIdx((p) => p + 1);
    setShowPhrases(false);
  };

  const RoleCard = ({ label, role, color }: { label: string; role: { name: string; mission: string }; color: string }) => (
    <div className="flex-1 rounded-2xl px-6 py-5" style={{ background: TLK.paper, border: `1.5px solid ${color}` }}>
      <p
        style={{
          fontFamily: TLK_FONT.mono,
          fontSize: 10,
          letterSpacing: 1.5,
          color,
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: TLK_FONT.serif,
          fontStyle: "italic",
          fontSize: 20,
          fontWeight: 500,
          color: TLK.ink,
          marginTop: 6,
        }}
      >
        {role.name}
      </p>
      <p style={{ marginTop: 8, fontSize: 13.5, color: TLK.inkDim, fontFamily: TLK_FONT.sans, lineHeight: 1.55 }}>
        {role.mission}
      </p>
    </div>
  );

  return (
    <div>
      {/* 상황 카드 */}
      <div className="rounded-2xl px-8 py-7" style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}>
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
          Scenario {s.emoji} {s.title}
        </p>
        <p
          style={{
            fontFamily: TLK_FONT.serif,
            fontStyle: "italic",
            fontSize: 22,
            fontWeight: 500,
            color: TLK.ink,
            lineHeight: 1.45,
            letterSpacing: -0.3,
            marginTop: 10,
          }}
        >
          {s.situation}
        </p>
        <p style={{ marginTop: 8, fontSize: 13, color: TLK.inkDim, fontFamily: TLK_FONT.ko, lineHeight: 1.6 }}>
          {s.situation_ko}
        </p>
      </div>

      {/* 2인 역할 */}
      <div className="mt-4 flex flex-col gap-4 md:flex-row">
        <RoleCard label="Role A" role={s.role_a} color={TLK.accent2} />
        <RoleCard label="Role B" role={s.role_b} color={TLK.accent} />
      </div>

      {/* 감정 연기 미션 */}
      <div
        className="mt-4 flex items-center gap-2 rounded-xl px-4 py-3"
        style={{ background: `${TLK.gold}14`, border: `1px solid ${TLK.gold}44` }}
      >
        <span style={{ fontSize: 16 }}>🎭</span>
        <p style={{ fontSize: 13, color: TLK.ink, fontFamily: TLK_FONT.sans }}>
          <strong>감정 연기 미션</strong> — {s.emotion}
          <span style={{ color: TLK.inkDim }}> · OPIc 롤플레이는 리액션·감탄사가 점수를 가릅니다</span>
        </p>
      </div>

      {/* 유용 표현 토글 */}
      {showPhrases ? (
        <div className="mt-4 rounded-xl px-5 py-4" style={{ background: TLK.bg2, border: `1px solid ${TLK.rule}` }}>
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
            Useful phrases
          </p>
          <ul className="flex flex-col gap-1.5">
            {s.phrases.map((p, i) => (
              <li
                key={i}
                style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 15, color: TLK.ink, lineHeight: 1.5 }}
              >
                “{p}”
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => setShowPhrases(true)}
            className="rounded-full px-5 py-2 text-xs font-semibold"
            style={{ background: TLK.bg2, color: TLK.inkDim, border: `1px solid ${TLK.rule}`, fontFamily: TLK_FONT.sans, cursor: "pointer" }}
          >
            💬 유용한 표현 보기
          </button>
        </div>
      )}

      <div className="mt-5 flex justify-center">
        <button
          onClick={nextScenario}
          className="inline-flex items-center gap-1.5 rounded-full px-6 py-2.5 text-sm font-semibold"
          style={{ background: TLK.accent, color: "#fff", border: 0, fontFamily: TLK_FONT.sans, cursor: "pointer" }}
        >
          <Shuffle size={14} />
          다른 상황
        </button>
      </div>
    </div>
  );
}

function TwoLiesGame() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {[
        { num: "01", label: "Truth", color: TLK.accent2 },
        { num: "02", label: "Truth", color: TLK.accent2 },
        { num: "03", label: "Lie", color: TLK.accent },
      ].map((c, i) => (
        <div
          key={i}
          className="rounded-2xl px-6 py-10 text-center"
          style={{
            background: TLK.paper,
            border: `1.5px solid ${c.color}`,
          }}
        >
          <p
            style={{
              fontFamily: TLK_FONT.mono,
              fontSize: 11,
              color: TLK.inkFaint,
            }}
          >
            #{c.num}
          </p>
          <p
            style={{
              fontFamily: TLK_FONT.serif,
              fontStyle: "italic",
              fontSize: 32,
              fontWeight: 500,
              color: c.color,
              marginTop: 12,
              letterSpacing: -0.3,
            }}
          >
            {c.label}
          </p>
        </div>
      ))}
    </div>
  );
}

function HotseatGame() {
  return (
    <div
      className="rounded-2xl px-10 py-12 text-center"
      style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}
    >
      <p
        style={{
          fontFamily: TLK_FONT.serif,
          fontStyle: "italic",
          fontSize: 32,
          fontWeight: 500,
          color: TLK.ink,
          letterSpacing: -0.3,
        }}
      >
        90초 영어 폭격
      </p>
      <p
        style={{
          marginTop: 12,
          fontSize: 14,
          color: TLK.inkDim,
          fontFamily: TLK_FONT.sans,
        }}
      >
        우측 타이머의 90초 프리셋을 눌러 시작하세요.<br />
        핫시트는 한국어 사용 금지 — 모르면 솔직히 “I don't know”도 OK.
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   게임 타이머 (우측 컬럼)
   ───────────────────────────────────────────── */

function GameTimer({ presets }: { presets: number[] }) {
  const [target, setTarget] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          setRunning(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const pad = (n: number) => String(n).padStart(2, "0");
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;

  const start = (sec: number) => {
    setTarget(sec);
    setRemaining(sec);
    setRunning(true);
  };
  const reset = () => {
    setRunning(false);
    setRemaining(target ?? 0);
  };

  return (
    <div
      className="rounded-2xl p-4"
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
          marginBottom: 8,
        }}
      >
        Game Timer
      </p>

      <div
        className="text-center"
        style={{
          fontFamily: TLK_FONT.serif,
          fontSize: 36,
          fontWeight: 500,
          color: target ? TLK.ink : TLK.inkFaint,
          letterSpacing: -1,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.2,
        }}
      >
        {pad(mm)}
        <span style={{ color: TLK.accent }}>:</span>
        {pad(ss)}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {presets.map((sec) => (
          <button
            key={sec}
            onClick={() => start(sec)}
            className="rounded-full px-3 py-1 text-[10px] font-bold tracking-widest"
            style={{
              background: target === sec ? TLK.accent : TLK.bg2,
              color: target === sec ? "#fff" : TLK.inkDim,
              border: `1px solid ${target === sec ? TLK.accent : TLK.rule}`,
              fontFamily: TLK_FONT.sans,
              cursor: "pointer",
            }}
          >
            {Math.floor(sec / 60) > 0 ? `${Math.floor(sec / 60)}m` : ""}
            {sec % 60 > 0 ? `${sec % 60}s` : ""}
          </button>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <button
          onClick={() => setRunning((v) => !v)}
          disabled={!target}
          className="flex flex-1 items-center justify-center gap-1 rounded-full py-1.5 text-[10px] font-bold tracking-widest transition-opacity disabled:opacity-30"
          style={{
            background: TLK.bg2,
            color: TLK.inkDim,
            border: `1px solid ${TLK.rule}`,
            fontFamily: TLK_FONT.sans,
            cursor: "pointer",
          }}
        >
          <PlayIcon size={11} /> {running ? "PAUSE" : "START"}
        </button>
        <button
          onClick={reset}
          disabled={!target}
          className="flex items-center justify-center rounded-full px-2.5 py-1.5 transition-opacity disabled:opacity-30"
          style={{
            background: TLK.bg2,
            color: TLK.inkDim,
            border: `1px solid ${TLK.rule}`,
            cursor: "pointer",
          }}
          aria-label="reset"
        >
          <RotateCcw size={11} />
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Friday · Intro / Closing
   ───────────────────────────────────────────── */

function FridayIntro({
  presentCount,
  totalCount,
  onStart,
}: {
  presentCount: number;
  totalCount: number;
  onStart: () => void;
}) {
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-6 px-8"
      style={{ background: TLK.bg, color: TLK.ink, fontFamily: TLK_FONT.ko }}
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
        Friday · Free Talk Studio
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
        오늘은 가볍게,<br />말로 푸는 60분.
      </h1>
      <p
        style={{
          fontFamily: TLK_FONT.ko,
          fontSize: 16,
          color: TLK.inkDim,
          lineHeight: 1.6,
          maxWidth: 720,
          textAlign: "center",
        }}
      >
        토픽 스피너(JAM 모드)·Would You Rather·스무고개·Two Truths·Taboo·롤플레이·핫시트·이어쓰기·Debate까지 9가지 게임 중에서 골라가며 가볍게 즐겨봐요. 점수도 평가도 없어요. 그냥 입을 자주 여는 시간.
      </p>
      <div
        className="flex items-center gap-3 rounded-full px-5 py-3"
        style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}
      >
        <span style={{ fontSize: 14, fontFamily: TLK_FONT.sans, fontWeight: 600, color: TLK.ink }}>
          출석 <strong style={{ color: TLK.accent2 }}>{presentCount}</strong> / {totalCount}
        </span>
      </div>
      <button
        type="button"
        onClick={onStart}
        className="mt-2 inline-flex items-center gap-2 rounded-full px-7 py-3 shadow-lg transition-all hover:-translate-y-0.5"
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
        시작하기
        <PlayIcon size={14} />
      </button>
      <p
        style={{
          fontFamily: TLK_FONT.sans,
          fontSize: 11,
          color: TLK.inkFaint,
          letterSpacing: 1.5,
          marginTop: 4,
        }}
      >
        진행 중 우상단 "마무리 →" 버튼으로 클로징 화면으로 이동
      </p>
    </div>
  );
}

function FridayClosing({
  completed,
  onComplete,
  onBackToGames,
}: {
  completed: boolean;
  onComplete: (c: boolean) => void;
  onBackToGames: () => void;
}) {
  return (
    <div
      className="mx-auto flex h-full max-w-4xl flex-col items-center justify-center gap-7 px-8 py-8"
      style={{ background: TLK.bg, color: TLK.ink, fontFamily: TLK_FONT.ko }}
    >
      <h1
        style={{
          fontFamily: TLK_FONT.serif,
          fontStyle: "italic",
          fontSize: 60,
          fontWeight: 500,
          color: TLK.ink,
          lineHeight: 1,
          letterSpacing: -1.5,
          textAlign: "center",
        }}
      >
        See you,<br />next Friday.
      </h1>
      <p
        style={{
          fontFamily: TLK_FONT.ko,
          fontSize: 16,
          color: TLK.inkDim,
          lineHeight: 1.6,
          maxWidth: 600,
          textAlign: "center",
        }}
      >
        오늘 가장 재미있었던 표현 1개씩 마음에 담아가요. 다음 주에 또 만나요 👋
      </p>

      {!completed ? (
        <div className="flex flex-col items-center gap-3">
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
            세션 완료
          </button>
          <button
            type="button"
            onClick={onBackToGames}
            className="text-[11px] underline transition-opacity hover:opacity-70"
            style={{
              background: "transparent",
              border: 0,
              color: TLK.inkFaint,
              fontFamily: TLK_FONT.sans,
              cursor: "pointer",
              letterSpacing: 0.5,
            }}
          >
            ← 게임으로 돌아가기 (한 판 더!)
          </button>
        </div>
      ) : (
        <div
          className="inline-block rounded-2xl px-7 py-5 text-center"
          style={{ background: `${TLK.accent2}14`, border: `2px solid ${TLK.accent2}55` }}
        >
          <p
            style={{
              fontFamily: TLK_FONT.serif,
              fontStyle: "italic",
              fontSize: 22,
              color: TLK.accent2,
              fontWeight: 500,
            }}
          >
            완료되었습니다 ✓
          </p>
          <button
            type="button"
            onClick={() => onComplete(false)}
            className="mt-2 underline transition-opacity hover:opacity-70"
            style={{
              background: "transparent",
              border: 0,
              color: TLK.inkFaint,
              fontFamily: TLK_FONT.sans,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.5,
              cursor: "pointer",
            }}
          >
            완료 취소
          </button>
        </div>
      )}
    </div>
  );
}
