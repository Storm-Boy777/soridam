"use client";

// Talklish · 월요일 (Podcast) Stage
// 3컬럼 (좌:흐름 / 중:메인 / 우:룰렛+어휘) + Phase-aware

import { useMemo, useState } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { fetchPodcasts, fetchPanelMembers } from "@/lib/actions/study-group";
import type { PodcastRow, PanelMember } from "@/lib/types/study-group";
import { TLK, TLK_FONT } from "./tokens";
import { SpeakerCard } from "./speaker-card";

const FLOW = [
  { id: 0, t: "0–10",  label: "1차 청취",        desc: "전체 분위기 파악, 모르는 단어 메모" },
  { id: 1, t: "10–20", label: "내용 공유",        desc: "한 명씩 들은 내용 자유롭게 공유" },
  { id: 2, t: "20–35", label: "어휘·표현 학습",   desc: "주요 표현 복기 + 다시 듣기" },
  { id: 3, t: "35–55", label: "토론",             desc: "AI가 만든 질문으로 토론" },
  { id: 4, t: "55–60", label: "랩업",             desc: "오늘 가져갈 표현 1개씩" },
] as const;

// elapsed(초) → phase id
function phaseFromElapsed(s: number): number {
  if (s < 10 * 60) return 0;
  if (s < 20 * 60) return 1;
  if (s < 35 * 60) return 2;
  if (s < 55 * 60) return 3;
  return 4;
}

interface Props {
  elapsed: number; // 초
  absentIds: Set<string>;
  onToggleAttendance: (memberId: string) => void;
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
  const [activeQ, setActiveQ] = useState(0);
  const [activeSpeaker, setActiveSpeaker] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [keepsake, setKeepsake] = useState("");

  const episode: PodcastRow | null =
    episodes.find((e) => e.id === selectedId) ?? episodes[0] ?? null;
  const phaseAuto = phaseFromElapsed(elapsed);
  const phase = phaseOverride ?? phaseAuto;
  const flow = FLOW[phase];

  const presentMembers = useMemo(
    () => members.filter((m) => !absentIds.has(m.id)),
    [members, absentIds]
  );

  function spin() {
    if (spinning || presentMembers.length === 0) return;
    setSpinning(true);
    setTimeout(() => {
      const picked = presentMembers[Math.floor(Math.random() * presentMembers.length)];
      const idx = members.findIndex((m) => m.id === picked.id);
      setActiveSpeaker(idx >= 0 ? idx : 0);
      setSpinning(false);
    }, 1200);
  }

  if (!episode) {
    return (
      <div
        className="flex h-full items-center justify-center px-12 py-16 text-center"
        style={{ fontFamily: TLK_FONT.ko, color: TLK.inkDim, background: TLK.bg }}
      >
        <div>
          <p style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 22, color: TLK.ink }}>
            오늘의 에피소드가 비어있어요
          </p>
          <p className="mt-2 text-sm">관리자 페이지에서 팟캐스트를 등록해주세요.</p>
        </div>
      </div>
    );
  }

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
      {/* ─── 좌 컬럼: 흐름 타임라인 ─── */}
      <aside
        className="flex flex-col gap-5 overflow-y-auto px-6 py-6"
        style={{
          background: TLK.bg2,
          borderRight: `1px solid ${TLK.ruleHi}`,
        }}
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
            Today
          </p>
          <p
            style={{
              fontFamily: TLK_FONT.serif,
              fontSize: 22,
              fontStyle: "italic",
              fontWeight: 500,
              lineHeight: 1.2,
              color: TLK.ink,
              marginTop: 4,
            }}
          >
            {episode.title}
          </p>
          <p
            style={{
              fontFamily: TLK_FONT.sans,
              fontSize: 12,
              color: TLK.inkDim,
              marginTop: 6,
            }}
          >
            {episode.source} · {episode.duration}
          </p>
        </div>

        {/* 에피소드 셀렉터 */}
        {episodes.length > 1 && (
          <select
            value={episode.id}
            onChange={(e) => {
              setSelectedId(e.target.value);
              setPhaseOverride(null);
            }}
            className="w-full rounded-lg px-3 py-2 text-xs"
            style={{
              border: `1px solid ${TLK.rule}`,
              background: TLK.paper,
              color: TLK.ink,
              fontFamily: TLK_FONT.sans,
            }}
          >
            {episodes.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        )}

        <div style={{ height: 1, background: TLK.rule }} />

        {/* 흐름 타임라인 */}
        <div className="flex flex-col gap-0.5">
          <p
            style={{
              fontFamily: TLK_FONT.sans,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 2.5,
              color: TLK.inkFaint,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Flow
          </p>
          {FLOW.map((f, i) => {
            const isActive = phase === i;
            const isPast = phase > i;
            return (
              <button
                key={f.id}
                onClick={() => setPhaseOverride(i)}
                className="flex items-start gap-3 rounded-lg px-2 py-2.5 text-left transition-colors"
                style={{
                  background: isActive ? `${TLK.accent}10` : "transparent",
                  cursor: "pointer",
                  border: 0,
                }}
              >
                <div
                  className="mt-1 flex h-3 w-3 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: isActive ? TLK.accent : isPast ? TLK.inkFaint : "transparent",
                    border: `1.5px solid ${isActive ? TLK.accent : isPast ? TLK.inkFaint : TLK.rule}`,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span
                      style={{
                        fontFamily: TLK_FONT.mono,
                        fontSize: 10,
                        color: isActive ? TLK.accent : TLK.inkFaint,
                      }}
                    >
                      {f.t}
                    </span>
                    <span
                      style={{
                        fontFamily: TLK_FONT.serif,
                        fontStyle: "italic",
                        fontSize: 14,
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? TLK.ink : isPast ? TLK.inkDim : TLK.inkFaint,
                      }}
                    >
                      {f.label}
                    </span>
                  </div>
                  <p
                    style={{
                      fontFamily: TLK_FONT.sans,
                      fontSize: 11,
                      color: isActive ? TLK.inkDim : TLK.inkFaint,
                      marginTop: 2,
                      lineHeight: 1.5,
                    }}
                  >
                    {f.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ─── 중앙: phase-aware 메인 ─── */}
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
            STAGE {phase + 1}/5 · {flow.t}min
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
            {flow.label}
          </h2>
        </div>

        {/* phase 0: 영상 풀사이즈 */}
        {phase === 0 && <VideoHero episode={episode} />}

        {/* phase 1: 내용 공유 (룰렛 + 영상 미니) */}
        {phase === 1 && (
          <ShareView
            episode={episode}
            members={members}
            activeSpeaker={activeSpeaker}
            spinning={spinning}
            onSpin={spin}
          />
        )}

        {/* phase 2: 어휘 학습 (어휘 풀카드) */}
        {phase === 2 && <VocabBoard episode={episode} />}

        {/* phase 3: 토론 (질문 카드 + Q1~Qn) */}
        {phase === 3 && (
          <DiscussionView
            episode={episode}
            activeQ={activeQ}
            onChangeQ={setActiveQ}
          />
        )}

        {/* phase 4: 랩업 */}
        {phase === 4 && <Wrapup keepsake={keepsake} setKeepsake={setKeepsake} />}
      </main>

      {/* ─── 우 컬럼: 룰렛 + 어휘 사이드 ─── */}
      <aside
        className="flex flex-col gap-5 overflow-y-auto px-5 py-6"
        style={{
          background: TLK.bg,
          borderLeft: `1px solid ${TLK.ruleHi}`,
        }}
      >
        {/* 룰렛 (발화자 선택) */}
        <SpeakerCard
          members={members}
          absentIds={absentIds}
          activeSpeaker={activeSpeaker}
          spinning={spinning}
          onSpin={spin}
          onToggleAttendance={onToggleAttendance}
        />

        {/* 어휘 미니 (phase ≠ 2일 때만) */}
        {phase !== 2 && episode.key_expressions.length > 0 && (
          <div
            className="rounded-2xl p-4"
            style={{
              background: TLK.paper,
              border: `1px solid ${TLK.rule}`,
            }}
          >
            <p
              style={{
                fontFamily: TLK_FONT.sans,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 2,
                color: TLK.inkFaint,
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              Vocab · {episode.key_expressions.length}
            </p>
            <div className="flex flex-col gap-2.5">
              {episode.key_expressions.slice(0, 5).map((v, i) => (
                <div key={i} className="flex items-baseline gap-2">
                  <span
                    style={{
                      fontFamily: TLK_FONT.mono,
                      fontSize: 9,
                      color: TLK.inkFaint,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div
                      style={{
                        fontFamily: TLK_FONT.serif,
                        fontStyle: "italic",
                        fontSize: 14,
                        color: TLK.ink,
                      }}
                    >
                      {v.english}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: TLK.inkDim,
                        fontFamily: TLK_FONT.ko,
                      }}
                    >
                      {v.korean}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Phase별 메인 영역 컴포넌트
   ───────────────────────────────────────────── */

function VideoHero({ episode }: { episode: PodcastRow }) {
  const ytId = extractYouTubeId(episode.url);
  return (
    <div className="space-y-4">
      <div
        className="relative w-full overflow-hidden rounded-2xl"
        style={{ aspectRatio: "16/9", background: "#000", border: `1px solid ${TLK.rule}` }}
      >
        {ytId ? (
          <iframe
            src={`https://www.youtube.com/embed/${ytId}`}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={episode.title}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <a
              href={episode.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full px-6 py-3 text-sm font-semibold transition-colors"
              style={{ background: TLK.accent, color: "#fff", fontFamily: TLK_FONT.sans }}
            >
              팟캐스트 열기 ↗
            </a>
          </div>
        )}
      </div>
      {episode.description && (
        <p
          style={{
            fontFamily: TLK_FONT.serif,
            fontSize: 16,
            color: TLK.inkDim,
            lineHeight: 1.6,
            fontStyle: "italic",
          }}
        >
          {episode.description}
        </p>
      )}
      {episode.warmup_question && (
        <div
          className="rounded-xl p-4"
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
              marginBottom: 6,
            }}
          >
            Warm-up
          </p>
          <p style={{ fontFamily: TLK_FONT.serif, fontSize: 18, color: TLK.ink, fontStyle: "italic" }}>
            “{episode.warmup_question}”
          </p>
        </div>
      )}
    </div>
  );
}

function ShareView({
  episode,
  members,
  activeSpeaker,
  spinning,
  onSpin,
}: {
  episode: PodcastRow;
  members: PanelMember[];
  activeSpeaker: number;
  spinning: boolean;
  onSpin: () => void;
}) {
  const speaker = members[activeSpeaker];
  return (
    <div className="space-y-5">
      {/* 룰렛 큰 카드 */}
      <div
        className="rounded-2xl p-8 text-center"
        style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}
      >
        {speaker ? (
          <>
            <div
              className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full text-5xl"
              style={{
                background: `${speaker.color}20`,
                border: `3px solid ${speaker.color}`,
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
                color: TLK.ink,
                fontWeight: 500,
              }}
            >
              {spinning ? "…" : speaker.name}
            </p>
            <p style={{ fontSize: 13, color: TLK.inkDim, marginTop: 4, fontFamily: TLK_FONT.sans }}>
              지금 들은 내용을 자유롭게 공유해 주세요
            </p>
          </>
        ) : (
          <p style={{ fontSize: 14, color: TLK.inkFaint, fontFamily: TLK_FONT.sans }}>
            관리자 페이지에서 패널 멤버를 등록해 주세요.
          </p>
        )}
        <button
          onClick={onSpin}
          disabled={spinning || members.length === 0}
          className="mt-6 rounded-full px-8 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{
            background: TLK.accent,
            color: "#fff",
            fontFamily: TLK_FONT.sans,
            cursor: spinning ? "wait" : "pointer",
            border: 0,
          }}
        >
          {spinning ? "SPINNING…" : "다음 발화자 뽑기"}
        </button>
      </div>

      {/* 영상 미니 */}
      {extractYouTubeId(episode.url) && (
        <div
          className="overflow-hidden rounded-xl"
          style={{ aspectRatio: "16/9", maxWidth: 360, border: `1px solid ${TLK.rule}` }}
        >
          <iframe
            src={`https://www.youtube.com/embed/${extractYouTubeId(episode.url)}`}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={episode.title}
          />
        </div>
      )}

      <style>{`@keyframes tlk-spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}

function VocabBoard({ episode }: { episode: PodcastRow }) {
  const [showKo, setShowKo] = useState(true);
  if (episode.key_expressions.length === 0) {
    return <p style={{ color: TLK.inkFaint }}>등록된 표현이 없습니다.</p>;
  }
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowKo((v) => !v)}
          className="rounded-full px-3 py-1.5 text-xs font-medium"
          style={{
            background: showKo ? TLK.accent : TLK.bg2,
            color: showKo ? "#fff" : TLK.inkDim,
            border: `1px solid ${showKo ? TLK.accent : TLK.rule}`,
            fontFamily: TLK_FONT.sans,
          }}
        >
          한국어 {showKo ? "ON" : "OFF"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {episode.key_expressions.map((v, i) => (
          <div
            key={i}
            className="rounded-xl p-4"
            style={{
              background: TLK.paper,
              border: `1px solid ${TLK.rule}`,
            }}
          >
            <div className="mb-1 flex items-center justify-between">
              <span
                style={{
                  fontFamily: TLK_FONT.mono,
                  fontSize: 10,
                  color: TLK.inkFaint,
                  letterSpacing: 1,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
            <p
              style={{
                fontFamily: TLK_FONT.serif,
                fontSize: 22,
                fontWeight: 500,
                color: TLK.ink,
                fontStyle: "italic",
                lineHeight: 1.3,
              }}
            >
              {v.english}
            </p>
            {showKo && (
              <p
                style={{
                  fontSize: 13,
                  color: TLK.inkDim,
                  marginTop: 4,
                  fontFamily: TLK_FONT.ko,
                }}
              >
                {v.korean}
              </p>
            )}
            {v.example && (
              <p
                style={{
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: `1px solid ${TLK.rule}`,
                  fontSize: 13,
                  color: TLK.inkDim,
                  fontStyle: "italic",
                  fontFamily: TLK_FONT.serif,
                }}
              >
                “{v.example}”
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DiscussionView({
  episode,
  activeQ,
  onChangeQ,
}: {
  episode: PodcastRow;
  activeQ: number;
  onChangeQ: (i: number) => void;
}) {
  const qs = episode.discussion_questions;
  if (qs.length === 0) return <p style={{ color: TLK.inkFaint }}>등록된 토론 질문이 없습니다.</p>;
  const idx = Math.min(activeQ, qs.length - 1);
  return (
    <div className="space-y-5">
      <div
        className="relative rounded-2xl px-10 py-12"
        style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}
      >
        <div
          className="mb-4 flex items-baseline gap-3"
        >
          <span
            style={{
              fontFamily: TLK_FONT.sans,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 2.5,
              color: TLK.accent,
              textTransform: "uppercase",
            }}
          >
            Discussion
          </span>
          <span style={{ fontSize: 11, color: TLK.inkFaint, fontFamily: TLK_FONT.sans }}>
            Question {idx + 1} of {qs.length}
          </span>
        </div>
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 28,
            right: 36,
            fontFamily: TLK_FONT.serif,
            fontSize: 96,
            fontStyle: "italic",
            fontWeight: 500,
            color: `${TLK.accent}25`,
            lineHeight: 1,
          }}
        >
          {idx + 1}
        </div>
        <p
          style={{
            fontFamily: TLK_FONT.serif,
            fontSize: 32,
            fontStyle: "italic",
            fontWeight: 500,
            color: TLK.ink,
            lineHeight: 1.35,
            letterSpacing: -0.3,
          }}
        >
          “{qs[idx]}”
        </p>
      </div>

      {/* Q 네비 */}
      <div className="flex flex-wrap gap-2">
        {qs.map((_, i) => {
          const active = i === idx;
          return (
            <button
              key={i}
              onClick={() => onChangeQ(i)}
              className="rounded-full px-3.5 py-1.5 text-xs font-bold transition-all"
              style={{
                background: active ? TLK.accent : TLK.bg2,
                color: active ? "#fff" : TLK.inkDim,
                border: `1px solid ${active ? TLK.accent : TLK.rule}`,
                fontFamily: TLK_FONT.sans,
                cursor: "pointer",
              }}
            >
              Q{i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Wrapup({
  keepsake,
  setKeepsake,
}: {
  keepsake: string;
  setKeepsake: (v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div
        className="rounded-2xl p-8 text-center"
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
          Today's Keepsake
        </p>
        <p
          style={{
            fontFamily: TLK_FONT.serif,
            fontStyle: "italic",
            fontSize: 24,
            color: TLK.ink,
            marginTop: 6,
          }}
        >
          오늘 가져갈 표현 1개를 적어보세요
        </p>
        <textarea
          value={keepsake}
          onChange={(e) => setKeepsake(e.target.value)}
          placeholder="예: I'll follow through on this."
          rows={3}
          className="mt-6 w-full resize-none rounded-xl px-4 py-3 text-base"
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
            marginTop: 8,
            fontSize: 11,
            color: TLK.inkFaint,
            fontFamily: TLK_FONT.sans,
          }}
        >
          돌아가면서 이번 주에 써볼 한 표현을 짧게 공유해주세요.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   유틸
   ───────────────────────────────────────────── */
function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// 미사용 import 회피
void Image;
