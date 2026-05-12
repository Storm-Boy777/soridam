"use client";

/**
 * 오픽 스터디 — 세션 복기 (다시보기)
 *
 * 질문 번호 그리드 + 선택된 질문 상세 패널 (멤버별 답변 + 코치노트).
 * 실제 스터디 진행을 그대로 다시 들을 수 있게 한다.
 */

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  CheckCircle2,
  SkipForward,
  AlertCircle,
  Bot,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import type { SessionHistoryDetail, FeedbackResult } from "@/lib/types/opic-study";

type Question = SessionHistoryDetail["questions"][number];
type Answer = Question["answers"][number];

const COLOR_BG: Record<"a" | "b" | "c" | "d", string> = {
  a: "var(--bp-mb-a)",
  b: "var(--bp-mb-b)",
  c: "var(--bp-mb-c)",
  d: "var(--bp-mb-d)",
};

interface Props {
  questions: Question[];
}

export function SessionReplay({ questions }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = questions[activeIdx];

  if (!questions.length || !active) {
    return (
      <p style={{ margin: 0, color: "var(--bp-ink-3)", fontSize: 14 }}>
        복기할 답변이 없어요.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* 질문 번호 그리드 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.min(questions.length, 6)}, minmax(0, 1fr))`,
          gap: 8,
        }}
      >
        {questions.map((q, i) => {
          const isActive = i === activeIdx;
          return (
            <button
              key={`${q.number}-${q.question_id ?? "none"}`}
              onClick={() => setActiveIdx(i)}
              style={{
                padding: "10px 8px",
                borderRadius: 10,
                border: `2px solid ${isActive ? "var(--bp-tc)" : "var(--bp-line)"}`,
                background: isActive ? "var(--bp-tc)" : "var(--bp-surface-2)",
                color: isActive ? "#fff" : "var(--bp-ink-2)",
                fontWeight: 800,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: 14 }}>Q{q.number}</span>
              <span
                style={{
                  fontSize: 10,
                  opacity: isActive ? 0.9 : 0.65,
                  fontWeight: 600,
                }}
              >
                {statusShort(q.status)} · 답 {q.answer_count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 선택된 질문 상세 */}
      <QuestionDetail question={active} />
    </div>
  );
}

function statusShort(status: Question["status"]): string {
  if (status === "completed") return "완료";
  if (status === "skipped") return "패스";
  if (status === "mixed") return "혼합";
  return "대기";
}

/* ─── 질문 상세 ─── */

function QuestionDetail({ question }: { question: Question }) {
  // 답변자 우선, 패스 멤버는 뒤로
  const sortedAnswers = useMemo(() => {
    return [...question.answers].sort((a, b) => {
      if (a.skipped !== b.skipped) return a.skipped ? 1 : -1;
      return a.created_at.localeCompare(b.created_at);
    });
  }, [question.answers]);

  return (
    <section
      style={{
        background: "var(--bp-surface-2)",
        border: "1px solid var(--bp-line)",
        borderRadius: 14,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* 질문 본문 + 음성 */}
      <div
        style={{
          padding: "14px 16px",
          background: "var(--bp-surface)",
          borderRadius: 10,
          border: "1px solid var(--bp-line)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 8,
          }}
        >
          <span
            style={{
              background: "var(--bp-tc)",
              color: "#fff",
              borderRadius: 999,
              padding: "3px 9px",
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            Q{question.number}
          </span>
          {question.question_type_kor && (
            <span
              style={{
                background: "var(--bp-tc-tint, rgba(201,100,66,0.12))",
                color: "var(--bp-tc)",
                borderRadius: 999,
                padding: "3px 9px",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {question.question_type_kor}
            </span>
          )}
          {question.question_audio_url && (
            <AudioPlayer
              url={question.question_audio_url}
              compact
              label="질문 듣기"
            />
          )}
        </div>
        <p
          style={{
            margin: 0,
            color: "var(--bp-ink)",
            fontSize: 15,
            fontWeight: 700,
            lineHeight: 1.5,
          }}
        >
          {question.question_english || question.label}
        </p>
        {question.question_korean && (
          <p
            style={{
              margin: "6px 0 0",
              color: "var(--bp-ink-2)",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {question.question_korean}
          </p>
        )}
      </div>

      {/* 멤버별 답변 카드 */}
      {sortedAnswers.length === 0 ? (
        <p style={{ margin: 0, color: "var(--bp-ink-3)", fontSize: 14, textAlign: "center", padding: 20 }}>
          이 질문에는 답변 기록이 없어요.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {sortedAnswers.map((a) => (
            <AnswerCard key={a.user_id} answer={a} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ─── 멤버별 답변 카드 ─── */

function AnswerCard({ answer }: { answer: Answer }) {
  // 패스
  if (answer.skipped) {
    return (
      <div
        style={{
          padding: "14px 16px",
          background: "var(--bp-surface)",
          borderRadius: 12,
          border: "1px solid var(--bp-line)",
          opacity: 0.6,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <MemberAvatar color={answer.member_color} initial={answer.member_initial} />
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, color: "var(--bp-ink-2)", fontSize: 13, fontWeight: 700 }}>
            {answer.member_name}
          </p>
          <p style={{ margin: "2px 0 0", color: "var(--bp-ink-3)", fontSize: 12 }}>
            <SkipForward size={11} style={{ verticalAlign: "middle", marginRight: 4 }} />
            이 질문을 패스했어요
          </p>
        </div>
      </div>
    );
  }

  const fb = answer.feedback_result;
  const hasError = !!fb?.error;
  const hasCoaching = fb && !hasError && (fb.summary || fb.flow);

  return (
    <div
      style={{
        background: "var(--bp-surface)",
        border: "1px solid var(--bp-line)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* 멤버 헤더 + 답변 음성 */}
      <div
        style={{
          padding: "12px 14px",
          background: "var(--bp-surface-2)",
          borderBottom: hasCoaching || hasError ? "1px solid var(--bp-line)" : undefined,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <MemberAvatar color={answer.member_color} initial={answer.member_initial} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, color: "var(--bp-ink)", fontSize: 13, fontWeight: 800 }}>
            {answer.member_name}
          </p>
          {answer.transcript && (
            <p
              style={{
                margin: "2px 0 0",
                color: "var(--bp-ink-3)",
                fontSize: 11,
                lineHeight: 1.4,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              “{answer.transcript}”
            </p>
          )}
        </div>
        {answer.audio_signed_url && (
          <AudioPlayer url={answer.audio_signed_url} compact label="답변 듣기" />
        )}
      </div>

      {/* Transcript 전체 (펼치기) */}
      {answer.transcript && <TranscriptExpand text={answer.transcript} />}

      {/* AI 코치노트 또는 에러 */}
      {hasError && fb?.error && (
        <div
          style={{
            padding: "12px 14px",
            background: "rgba(220, 38, 38, 0.06)",
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            fontSize: 12,
          }}
        >
          <AlertCircle size={16} color="rgb(220, 38, 38)" style={{ marginTop: 1, flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, color: "rgb(185, 28, 28)", fontWeight: 700 }}>
              AI 코칭 생성 실패 ({fb.error.stage})
            </p>
            <p style={{ margin: "2px 0 0", color: "var(--bp-ink-2)" }}>
              {fb.error.message}
            </p>
          </div>
        </div>
      )}

      {hasCoaching && fb && <CoachNoteInline feedback={fb} />}
    </div>
  );
}

/* ─── Transcript 펼치기 ─── */

function TranscriptExpand({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  if (text.length <= 100) return null;
  return (
    <div style={{ padding: "8px 14px", borderBottom: "1px solid var(--bp-line)" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "transparent",
          border: 0,
          color: "var(--bp-ink-3)",
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
          padding: 0,
        }}
      >
        {open ? "▲ Transcript 접기" : "▼ Transcript 전체 보기"}
      </button>
      {open && (
        <p
          style={{
            margin: "6px 0 0",
            color: "var(--bp-ink-2)",
            fontSize: 12,
            lineHeight: 1.6,
            fontStyle: "italic",
          }}
        >
          “{text}”
        </p>
      )}
    </div>
  );
}

/* ─── 인라인 코치노트 (요약 + 표현 + 발음 + 토론거리 + 다음 발화자 팁) ─── */

export function CoachNoteInline({ feedback }: { feedback: FeedbackResult }) {
  return (
    <div
      style={{
        padding: "14px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        background: "var(--bp-surface)",
      }}
    >
      <SectionHeader icon={<Bot size={14} />} title="AI 코치노트" />

      {/* 한 줄 요약 */}
      {feedback.summary && (
        <div
          style={{
            background: "var(--bp-tc-tint, rgba(201,100,66,0.10))",
            border: "1px solid rgba(201,100,66,0.2)",
            borderRadius: 8,
            padding: "10px 12px",
          }}
        >
          <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: "var(--bp-tc)", letterSpacing: 0.5 }}>
            📋 한 줄 요약
          </p>
          <p style={{ margin: "4px 0 0", color: "var(--bp-ink)", fontSize: 13, lineHeight: 1.5 }}>
            {feedback.summary}
          </p>
        </div>
      )}

      {/* 답변 흐름 */}
      {feedback.flow && (feedback.flow.intro || feedback.flow.body || feedback.flow.conclusion) && (
        <div>
          <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 800, color: "var(--bp-ink-3)", letterSpacing: 0.5 }}>
            🗺 답변 흐름
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {feedback.flow.intro && <FlowItem label="도입" text={feedback.flow.intro} />}
            {feedback.flow.body && <FlowItem label="본론" text={feedback.flow.body} />}
            {feedback.flow.conclusion && <FlowItem label="결론" text={feedback.flow.conclusion} />}
          </div>
        </div>
      )}

      {/* 좋은 표현 */}
      {feedback.good_expressions && feedback.good_expressions.length > 0 && (
        <div>
          <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 800, color: "var(--bp-good, #4a8e60)", letterSpacing: 0.5 }}>
            ✓ 좋았던 표현
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {feedback.good_expressions.map((g, i) => (
              <ExpressionItem key={i} quote={g.quote} note={g.note} positive />
            ))}
          </div>
        </div>
      )}

      {/* 다듬을 표현 */}
      {feedback.refine_expressions && feedback.refine_expressions.length > 0 && (
        <div>
          <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 800, color: "var(--bp-tc)", letterSpacing: 0.5 }}>
            ⚠ 다듬으면 좋을 표현
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {feedback.refine_expressions.map((r, i) => (
              <div
                key={i}
                style={{
                  background: "var(--bp-surface-2)",
                  borderRadius: 8,
                  padding: 10,
                  border: "1px solid var(--bp-line)",
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                <p style={{ margin: 0, color: "var(--bp-ink-2)", fontStyle: "italic" }}>“{r.quote}”</p>
                <p style={{ margin: "4px 0 0", color: "var(--bp-ink-3)", fontSize: 11 }}>
                  · {r.issue}
                </p>
                <p style={{ margin: "4px 0 0", color: "var(--bp-tc)", fontWeight: 700 }}>
                  → {r.suggestion}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 발음 패턴 */}
      {feedback.pronunciation_patterns && feedback.pronunciation_patterns.length > 0 && (
        <div>
          <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 800, color: "var(--bp-ink-3)", letterSpacing: 0.5 }}>
            🎵 발음 패턴
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--bp-ink-2)", lineHeight: 1.6 }}>
            {feedback.pronunciation_patterns.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 토론거리 */}
      {feedback.discussion_hooks && feedback.discussion_hooks.length > 0 && (
        <div>
          <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 800, color: "var(--bp-ink-3)", letterSpacing: 0.5 }}>
            <MessageSquare size={11} style={{ verticalAlign: "middle", marginRight: 3 }} />
            토론거리
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--bp-ink-2)", lineHeight: 1.6 }}>
            {feedback.discussion_hooks.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 다음 발화자 팁 */}
      {feedback.next_speaker_tip && (feedback.next_speaker_tip.take || feedback.next_speaker_tip.enhance) && (
        <div
          style={{
            background: "var(--bp-surface-2)",
            borderRadius: 8,
            padding: "10px 12px",
            border: "1px solid var(--bp-line)",
          }}
        >
          <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 800, color: "var(--bp-ink-3)", letterSpacing: 0.5 }}>
            <Sparkles size={11} style={{ verticalAlign: "middle", marginRight: 3 }} />
            다음 발화자 팁
          </p>
          {feedback.next_speaker_tip.take && (
            <p style={{ margin: 0, fontSize: 12, color: "var(--bp-ink-2)", lineHeight: 1.5 }}>
              <strong style={{ color: "var(--bp-good, #4a8e60)" }}>가져갈 점:</strong>{" "}
              {feedback.next_speaker_tip.take}
            </p>
          )}
          {feedback.next_speaker_tip.enhance && (
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--bp-ink-2)", lineHeight: 1.5 }}>
              <strong style={{ color: "var(--bp-tc)" }}>보강할 점:</strong>{" "}
              {feedback.next_speaker_tip.enhance}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {icon}
      <span style={{ color: "var(--bp-ink-2)", fontSize: 13, fontWeight: 800 }}>{title}</span>
    </div>
  );
}

function FlowItem({ label, text }: { label: string; text: string }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
      <span
        style={{
          flexShrink: 0,
          background: "var(--bp-tc-tint, rgba(201,100,66,0.12))",
          color: "var(--bp-tc)",
          borderRadius: 4,
          padding: "1px 6px",
          fontSize: 10,
          fontWeight: 700,
        }}
      >
        {label}
      </span>
      <span style={{ flex: 1, fontSize: 12, color: "var(--bp-ink-2)", lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}

function ExpressionItem({
  quote,
  note,
  positive,
}: {
  quote: string;
  note: string;
  positive?: boolean;
}) {
  return (
    <div
      style={{
        background: positive ? "rgba(74,142,96,0.06)" : "var(--bp-surface-2)",
        border: `1px solid ${positive ? "rgba(74,142,96,0.2)" : "var(--bp-line)"}`,
        borderRadius: 8,
        padding: 10,
        fontSize: 12,
        lineHeight: 1.5,
      }}
    >
      <p style={{ margin: 0, color: "var(--bp-ink)", fontStyle: "italic", fontWeight: 600 }}>“{quote}”</p>
      <p style={{ margin: "4px 0 0", color: "var(--bp-ink-3)", fontSize: 11 }}>· {note}</p>
    </div>
  );
}

/* ─── 멤버 아바타 ─── */

function MemberAvatar({ color, initial }: { color: "a" | "b" | "c" | "d"; initial: string }) {
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 999,
        background: COLOR_BG[color],
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        fontWeight: 800,
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  );
}

/* ─── 오디오 플레이어 ─── */

export function AudioPlayer({
  url,
  compact = false,
  label,
}: {
  url: string;
  compact?: boolean;
  label?: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => setPlaying(false));
    else el.pause();
  }, []);

  // URL 변경 시 정리
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, [url]);

  const fmt = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  if (compact) {
    return (
      <button
        onClick={toggle}
        title={label}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "5px 10px",
          background: playing ? "var(--bp-tc)" : "var(--bp-surface-2)",
          color: playing ? "#fff" : "var(--bp-ink-2)",
          border: `1px solid ${playing ? "var(--bp-tc)" : "var(--bp-line)"}`,
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        {playing ? <Pause size={11} /> : <Play size={11} style={{ marginLeft: 1 }} />}
        <span>{fmt(current)}</span>
        <audio
          ref={audioRef}
          src={url}
          preload="metadata"
          onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration || 0)}
          onTimeUpdate={(e) => setCurrent((e.target as HTMLAudioElement).currentTime)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setCurrent(0);
            if (audioRef.current) audioRef.current.currentTime = 0;
          }}
        />
      </button>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        background: "var(--bp-surface-2)",
        border: "1px solid var(--bp-line)",
        borderRadius: 8,
      }}
    >
      <button
        onClick={toggle}
        style={{
          width: 32,
          height: 32,
          borderRadius: 999,
          background: "var(--bp-tc)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: 0,
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        {playing ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: 1 }} />}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--bp-ink-3)", letterSpacing: 0.5 }}>
            <Volume2 size={9} style={{ verticalAlign: "middle", marginRight: 3 }} />
            {label ?? "오디오"}
          </span>
          <span style={{ fontSize: 10, color: "var(--bp-ink-3)", fontVariantNumeric: "tabular-nums" }}>
            {fmt(current)} / {fmt(duration)}
          </span>
        </div>
        <div
          style={{
            height: 4,
            borderRadius: 999,
            background: "var(--bp-line)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: "var(--bp-tc)",
              transition: "width 0.1s",
            }}
          />
        </div>
      </div>
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration || 0)}
        onTimeUpdate={(e) => setCurrent((e.target as HTMLAudioElement).currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
          if (audioRef.current) audioRef.current.currentTime = 0;
        }}
      />
    </div>
  );
}

// CheckCircle2 미사용 import 회피
void CheckCircle2;
