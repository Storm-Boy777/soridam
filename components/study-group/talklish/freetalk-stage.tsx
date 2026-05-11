"use client";

// Talklish · 금요일 (Free Talk) Stage
// 3컬럼 (좌:게임 메뉴 / 중:게임 진행 / 우:룰렛+타이머)

import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shuffle, Play as PlayIcon, RotateCcw } from "lucide-react";
import { fetchFreetalkTopics, fetchGameCards, fetchPanelMembers } from "@/lib/actions/study-group";
import type { FreetalkRow, GameCardRow, StoryStarter } from "@/lib/types/study-group";
import { TLK, TLK_FONT } from "./tokens";
import { SpeakerCard } from "./speaker-card";

type GameKey = "spinner" | "chain" | "twolies" | "hotseat" | "story";

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
    desc: "랜덤 주제 1개 → 1분 자유 발화",
    rule: "버튼을 눌러 랜덤 주제를 뽑고, 발화자가 1분 동안 영어로 자유롭게 말합니다.",
  },
  {
    key: "chain",
    num: "02",
    emoji: "🔗",
    name: "워드 체인",
    desc: "끝 단어로 이어가기. 막히면 패스 1회",
    rule: "한 사람이 단어를 말하면, 다음 사람이 그 끝 단어로 새 단어를 잇습니다. 막히면 패스(1회).",
  },
  {
    key: "twolies",
    num: "03",
    emoji: "🎭",
    name: "Two Truths & a Lie",
    desc: "진실 2 + 거짓 1, 영어로만 질문해서 거짓 찾기",
    rule: "한 명이 자기에 대한 사실 2가지 + 거짓 1가지를 말하면, 나머지가 영어로만 질문해서 거짓을 맞춥니다.",
  },
  {
    key: "hotseat",
    num: "04",
    emoji: "🔥",
    name: "핫시트",
    desc: "한 명이 의자에. 나머지가 영어로 90초간 질문 폭격",
    rule: "한 명이 핫시트(의자)에 앉고, 나머지가 90초 동안 영어로만 질문을 쏟아붓습니다. 핫시트는 영어로 즉답.",
  },
  {
    key: "story",
    num: "05",
    emoji: "📚",
    name: "한 문장 이어쓰기",
    desc: "한 사람이 한 문장씩 이어 붙여 즉흥 이야기 만들기",
    rule: "시작 문장이 주어지면, 한 사람이 한 문장씩 영어로 이어 붙여 즉흥 이야기를 완성합니다.",
  },
];

interface Props {
  absentIds: Set<string>;
  onToggleAttendance: (memberId: string) => void;
}

export function FreetalkStage({ absentIds, onToggleAttendance }: Props) {
  const [game, setGame] = useState<GameKey>("spinner");
  const [activeSpeaker, setActiveSpeaker] = useState(0);
  const [spinning, setSpinning] = useState(false);

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
  const { data: members = [] } = useQuery({
    queryKey: ["study-panel-members"],
    queryFn: fetchPanelMembers,
    staleTime: 5 * 60 * 1000,
  });

  const presentMembers = useMemo(
    () => members.filter((m) => !absentIds.has(m.id)),
    [members, absentIds]
  );

  const spin = useCallback(() => {
    if (spinning || presentMembers.length === 0) return;
    setSpinning(true);
    setTimeout(() => {
      const picked = presentMembers[Math.floor(Math.random() * presentMembers.length)];
      const idx = members.findIndex((m) => m.id === picked.id);
      setActiveSpeaker(idx >= 0 ? idx : 0);
      setSpinning(false);
    }, 1200);
  }, [members, presentMembers, spinning]);

  const def = GAMES.find((g) => g.key === game)!;

  return (
    <div
      className="grid h-full min-h-0"
      style={{
        gridTemplateColumns: "300px 1fr 340px",
        background: TLK.bg,
        color: TLK.ink,
        fontFamily: TLK_FONT.ko,
      }}
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
            한 주를 가볍게 마무리하는 5가지 게임
          </p>
        </div>

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

        {/* 게임별 본문 */}
        {game === "spinner" && <SpinnerGame topics={topics} />}
        {game === "story" && <StoryGame cards={storyCards} />}
        {game === "chain" && <ChainGame />}
        {game === "twolies" && <TwoLiesGame />}
        {game === "hotseat" && <HotseatGame />}
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
          spinning={spinning}
          onSpin={spin}
          onToggleAttendance={onToggleAttendance}
        />

        {/* 게임 타이머 (간단 60/90초 프리셋) */}
        <GameTimer
          presets={
            game === "spinner"
              ? [60, 90, 120]
              : game === "hotseat"
                ? [60, 90, 120]
                : [60, 90, 180]
          }
        />
      </aside>
    </div>
  );
}

/* ─────────────────────────────────────────────
   게임별 본문
   ───────────────────────────────────────────── */

function SpinnerGame({ topics }: { topics: FreetalkRow[] }) {
  const [picked, setPicked] = useState<FreetalkRow | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [showKo, setShowKo] = useState(false);

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
      style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}
    >
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

function StoryGame({ cards }: { cards: GameCardRow[] }) {
  const [idx, setIdx] = useState(0);
  if (cards.length === 0) {
    return (
      <p style={{ color: TLK.inkFaint, fontSize: 13, fontFamily: TLK_FONT.sans }}>
        등록된 시작 문장이 없어요.
      </p>
    );
  }
  const card = cards[idx % cards.length];
  const data = card.data as StoryStarter;
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

function ChainGame() {
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
          marginBottom: 12,
        }}
      >
        Example
      </p>
      <p
        style={{
          fontFamily: TLK_FONT.serif,
          fontStyle: "italic",
          fontSize: 26,
          fontWeight: 500,
          color: TLK.ink,
          lineHeight: 1.5,
        }}
      >
        apple → e<span style={{ color: TLK.accent }}>lephant</span> → t<span style={{ color: TLK.accent }}>iger</span>{" "}
        → r<span style={{ color: TLK.accent }}>ainbow</span> → …
      </p>
      <p
        style={{
          marginTop: 16,
          fontSize: 13,
          color: TLK.inkDim,
          fontFamily: TLK_FONT.sans,
        }}
      >
        반복·이미 나온 단어는 금지. 막히면 1회 패스 가능.
      </p>
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
