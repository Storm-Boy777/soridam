"use client";

// Talklish · 수요일 (OPIc) Stage
// 3컬럼 (좌:카테고리+토픽 / 중:질문 카드+오디오 / 우:룰렛+진행)

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Play, Pause } from "lucide-react";
import { getQuestionsByTopic, getTopicsByCategory } from "@/lib/queries/master-questions";
import { fetchPanelMembers } from "@/lib/actions/study-group";
import { QUESTION_TYPE_LABELS } from "@/lib/types/reviews";
import { TLK, TLK_FONT } from "./tokens";
import { SpeakerCard } from "./speaker-card";

type Category = "일반" | "롤플레이" | "어드밴스";

const CATEGORIES: Category[] = ["일반", "롤플레이", "어드밴스"];

interface Props {
  absentIds: Set<string>;
  onToggleAttendance: (memberId: string) => void;
}

export function OpicStage({ absentIds, onToggleAttendance }: Props) {
  const [category, setCategory] = useState<Category>("일반");
  const [topic, setTopic] = useState<string | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [activeSpeaker, setActiveSpeaker] = useState(0);
  const [spinning, setSpinning] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

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

  const currentQ = questions[qIndex];
  const audioUrl = (currentQ as { audio_url?: string | null } | undefined)?.audio_url ?? null;

  // 질문 변경 시 오디오 초기화
  useEffect(() => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    setPlaying(false);
    setProgress(0);
  }, [currentQ?.id]);

  const handleCategoryChange = useCallback((c: Category) => {
    setCategory(c);
    setTopic(null);
    setQIndex(0);
  }, []);

  const handleTopicSelect = useCallback((t: string) => {
    setTopic(t);
    setQIndex(0);
  }, []);

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el || !audioUrl) return;
    if (el.paused) el.play().catch(() => setPlaying(false));
    else el.pause();
  }, [audioUrl]);

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
      {/* ─── 좌: 카테고리 + 토픽 ─── */}
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
            Today · OPIc
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
            기출 콤보 학습
          </p>
          <p
            style={{
              fontFamily: TLK_FONT.sans,
              fontSize: 12,
              color: TLK.inkDim,
              marginTop: 6,
            }}
          >
            돌아가며 영어로 답변하고 피드백을 주고받아요
          </p>
        </div>

        <div style={{ height: 1, background: TLK.rule }} />

        {/* 카테고리 탭 */}
        <div>
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
            Category
          </p>
          <div className="flex gap-1">
            {CATEGORIES.map((c) => {
              const active = category === c;
              return (
                <button
                  key={c}
                  onClick={() => handleCategoryChange(c)}
                  className="flex-1 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors"
                  style={{
                    background: active ? TLK.accent : TLK.paper,
                    color: active ? "#fff" : TLK.inkDim,
                    border: `1px solid ${active ? TLK.accent : TLK.rule}`,
                    fontFamily: TLK_FONT.sans,
                    cursor: "pointer",
                  }}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* 토픽 리스트 */}
        <div>
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
            Topic · {topics.length}
          </p>
          <div className="flex flex-col gap-1">
            {topics.map((t) => {
              const active = topic === t.topic;
              return (
                <button
                  key={t.topic}
                  onClick={() => handleTopicSelect(t.topic)}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-left transition-colors"
                  style={{
                    background: active ? `${TLK.accent}15` : "transparent",
                    border: 0,
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      fontFamily: TLK_FONT.serif,
                      fontStyle: "italic",
                      fontSize: 14,
                      fontWeight: active ? 600 : 400,
                      color: active ? TLK.accent : TLK.ink,
                    }}
                  >
                    {t.topic}
                  </span>
                  <span
                    style={{
                      fontFamily: TLK_FONT.mono,
                      fontSize: 10,
                      color: TLK.inkFaint,
                    }}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
            {topics.length === 0 && (
              <p style={{ fontSize: 11, color: TLK.inkFaint, fontFamily: TLK_FONT.sans }}>
                토픽이 없어요.
              </p>
            )}
          </div>
        </div>
      </aside>

      {/* ─── 중: 질문 카드 ─── */}
      <main className="overflow-y-auto px-10 py-8">
        {!topic ? (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <p
                style={{
                  fontFamily: TLK_FONT.serif,
                  fontStyle: "italic",
                  fontSize: 28,
                  color: TLK.inkDim,
                }}
              >
                좌측에서 토픽을 골라주세요
              </p>
              <p style={{ marginTop: 8, fontSize: 13, color: TLK.inkFaint, fontFamily: TLK_FONT.sans }}>
                돌아가며 영어로 답변하고 서로 피드백을 주고받습니다.
              </p>
            </div>
          </div>
        ) : !currentQ ? (
          <div style={{ color: TLK.inkFaint }}>질문을 불러오는 중…</div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-baseline gap-3">
              <span
                style={{
                  fontFamily: TLK_FONT.mono,
                  fontSize: 11,
                  letterSpacing: 1,
                  color: TLK.inkFaint,
                }}
              >
                {String(qIndex + 1).padStart(2, "0")} / {String(questions.length).padStart(2, "0")}
              </span>
              {currentQ.question_type_eng && (
                <span
                  className="rounded-full px-2.5 py-0.5"
                  style={{
                    background: `${TLK.accent2}18`,
                    color: TLK.accent2,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 1,
                    fontFamily: TLK_FONT.sans,
                  }}
                >
                  {QUESTION_TYPE_LABELS[currentQ.question_type_eng] || currentQ.question_type_eng}
                </span>
              )}
              <span
                style={{
                  fontFamily: TLK_FONT.serif,
                  fontStyle: "italic",
                  fontSize: 22,
                  fontWeight: 500,
                  color: TLK.ink,
                  letterSpacing: -0.3,
                }}
              >
                {topic}
              </span>
            </div>

            {/* 질문 카드 */}
            <div
              className="relative rounded-2xl px-10 py-12"
              style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}
            >
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  top: 24,
                  right: 32,
                  fontFamily: TLK_FONT.serif,
                  fontStyle: "italic",
                  fontSize: 88,
                  fontWeight: 500,
                  color: `${TLK.accent}1A`,
                  lineHeight: 1,
                }}
              >
                {qIndex + 1}
              </div>

              <p
                style={{
                  fontFamily: TLK_FONT.serif,
                  fontStyle: "italic",
                  fontSize: 30,
                  fontWeight: 500,
                  color: TLK.ink,
                  lineHeight: 1.4,
                  letterSpacing: -0.3,
                }}
              >
                “{currentQ.question_english}”
              </p>
              {currentQ.question_korean && (
                <p
                  style={{
                    marginTop: 14,
                    paddingTop: 14,
                    borderTop: `1px solid ${TLK.rule}`,
                    fontSize: 14,
                    color: TLK.inkDim,
                    fontFamily: TLK_FONT.ko,
                    lineHeight: 1.6,
                  }}
                >
                  {currentQ.question_korean}
                </p>
              )}

              {/* 오디오 플레이어 */}
              {audioUrl && (
                <div
                  className="mt-6 flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{ background: TLK.bg2, border: `1px solid ${TLK.rule}` }}
                >
                  <button
                    onClick={togglePlay}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-90 active:scale-95"
                    style={{
                      background: TLK.accent,
                      color: "#fff",
                      border: 0,
                      cursor: "pointer",
                    }}
                    aria-label={playing ? "일시정지" : "재생"}
                  >
                    {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div
                      style={{
                        fontFamily: TLK_FONT.sans,
                        fontSize: 10,
                        letterSpacing: 1.5,
                        color: TLK.inkFaint,
                        textTransform: "uppercase",
                      }}
                    >
                      Question Audio
                    </div>
                    <div
                      className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full"
                      style={{ background: TLK.rule }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.round(progress * 100)}%`,
                          background: TLK.accent,
                          transition: "width .1s",
                        }}
                      />
                    </div>
                  </div>
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    preload="metadata"
                    onTimeUpdate={(e) => {
                      const el = e.target as HTMLAudioElement;
                      const d = el.duration || 0;
                      setProgress(d > 0 ? el.currentTime / d : 0);
                    }}
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    onEnded={() => {
                      setPlaying(false);
                      setProgress(0);
                      if (audioRef.current) audioRef.current.currentTime = 0;
                    }}
                  />
                </div>
              )}
            </div>

            {/* 질문 네비 */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQIndex((p) => Math.max(0, p - 1))}
                disabled={qIndex === 0}
                className="rounded-full px-4 py-1.5 text-xs font-bold transition-opacity disabled:opacity-30"
                style={{
                  background: TLK.bg2,
                  color: TLK.inkDim,
                  border: `1px solid ${TLK.rule}`,
                  fontFamily: TLK_FONT.sans,
                  cursor: "pointer",
                }}
              >
                ← Prev
              </button>
              <button
                onClick={() => setQIndex(Math.floor(Math.random() * questions.length))}
                className="rounded-full px-4 py-1.5 text-xs font-bold transition-opacity"
                style={{
                  background: TLK.bg2,
                  color: TLK.inkDim,
                  border: `1px solid ${TLK.rule}`,
                  fontFamily: TLK_FONT.sans,
                  cursor: "pointer",
                }}
              >
                Shuffle
              </button>
              <button
                onClick={() => setQIndex((p) => Math.min(questions.length - 1, p + 1))}
                disabled={qIndex === questions.length - 1}
                className="rounded-full px-4 py-1.5 text-xs font-bold transition-opacity disabled:opacity-30"
                style={{
                  background: TLK.accent,
                  color: "#fff",
                  border: 0,
                  fontFamily: TLK_FONT.sans,
                  cursor: "pointer",
                }}
              >
                Next →
              </button>
            </div>

            {/* Q 점프 네비 (10개씩 행) */}
            {questions.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {questions.map((_, i) => {
                  const active = i === qIndex;
                  return (
                    <button
                      key={i}
                      onClick={() => setQIndex(i)}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold transition-colors"
                      style={{
                        background: active ? TLK.accent : "transparent",
                        color: active ? "#fff" : TLK.inkFaint,
                        border: `1px solid ${active ? TLK.accent : TLK.rule}`,
                        fontFamily: TLK_FONT.sans,
                        cursor: "pointer",
                      }}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ─── 우: 룰렛 + 진행 ─── */}
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

        {/* 진행 메타 */}
        {topic && questions.length > 0 && (
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
              Progress
            </p>
            <div className="flex items-baseline gap-2">
              <span
                style={{
                  fontFamily: TLK_FONT.serif,
                  fontStyle: "italic",
                  fontSize: 36,
                  color: TLK.ink,
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1,
                }}
              >
                {qIndex + 1}
              </span>
              <span
                style={{
                  fontFamily: TLK_FONT.sans,
                  fontSize: 14,
                  color: TLK.inkFaint,
                }}
              >
                / {questions.length}
              </span>
            </div>
            <div
              className="mt-3 h-1.5 w-full overflow-hidden rounded-full"
              style={{ background: TLK.rule }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${((qIndex + 1) / questions.length) * 100}%`,
                  background: TLK.accent,
                  transition: "width .3s",
                }}
              />
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

// 미사용 import 회피
void useMemo;
