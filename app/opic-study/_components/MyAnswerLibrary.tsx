"use client";

/**
 * 오픽 스터디 마이페이지 — 내 답변 라이브러리
 *
 * 본인이 답변한 음성/transcript/코치노트를 토픽별로 다시 듣고 볼 수 있게.
 * 토픽 필터 칩 + 답변 카드 (음성 + transcript + 아코디언 코치노트) + 페이지네이션.
 */

import { useState, useMemo } from "react";
import { Library, ChevronDown, ChevronUp, AlertCircle, Bot, ChevronRight } from "lucide-react";
import { AudioPlayer, CoachNoteInline } from "./SessionReplay";
import type { MyStudySummary } from "@/lib/types/opic-study";

type MyAnswer = MyStudySummary["my_answers"][number];

const PAGE_SIZE = 8;

interface Props {
  answers: MyAnswer[];
}

export function MyAnswerLibrary({ answers }: Props) {
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // 토픽 칩 목록 (개수 포함)
  const topicChips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of answers) {
      counts.set(a.topic, (counts.get(a.topic) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count);
  }, [answers]);

  // 필터 적용
  const filtered = useMemo(() => {
    if (!topicFilter) return answers;
    return answers.filter((a) => a.topic === topicFilter);
  }, [answers, topicFilter]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  if (answers.length === 0) {
    return (
      <section
        style={{
          background: "var(--bp-surface)",
          border: "1px solid var(--bp-line)",
          borderRadius: 14,
          padding: 22,
          boxShadow: "var(--bp-shadow-sm)",
        }}
      >
        <SectionTitle>내 답변 모음</SectionTitle>
        <div
          style={{
            padding: "32px 16px",
            textAlign: "center",
            color: "var(--bp-ink-3)",
            fontSize: 14,
          }}
        >
          <Library size={36} style={{ marginBottom: 10, opacity: 0.4 }} />
          <p style={{ margin: 0 }}>아직 답변 기록이 없어요.</p>
          <p style={{ margin: "4px 0 0", fontSize: 12 }}>
            스터디에 참여하면 답변을 모아 다시 들을 수 있어요.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      style={{
        background: "var(--bp-surface)",
        border: "1px solid var(--bp-line)",
        borderRadius: 14,
        padding: 22,
        boxShadow: "var(--bp-shadow-sm)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <SectionTitle>내 답변 모음 · {answers.length}개</SectionTitle>
      </div>

      {/* 토픽 필터 칩 */}
      {topicChips.length > 1 && (
        <div
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            paddingBottom: 8,
            marginBottom: 12,
            WebkitOverflowScrolling: "touch",
          }}
        >
          <Chip
            label="전체"
            count={answers.length}
            active={topicFilter === null}
            onClick={() => {
              setTopicFilter(null);
              setVisibleCount(PAGE_SIZE);
            }}
          />
          {topicChips.map(({ topic, count }) => (
            <Chip
              key={topic}
              label={topic}
              count={count}
              active={topicFilter === topic}
              onClick={() => {
                setTopicFilter(topic);
                setVisibleCount(PAGE_SIZE);
              }}
            />
          ))}
        </div>
      )}

      {/* 답변 카드 리스트 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {visible.map((a, i) => (
          <MyAnswerCard key={`${a.session_id}-${a.question_idx}-${i}`} answer={a} />
        ))}
      </div>

      {/* 페이지네이션 */}
      {hasMore && (
        <button
          onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
          style={{
            marginTop: 12,
            width: "100%",
            padding: "10px 12px",
            background: "var(--bp-surface-2)",
            border: "1px solid var(--bp-line)",
            borderRadius: 10,
            color: "var(--bp-ink-2)",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <ChevronDown size={14} />
          더 보기 ({filtered.length - visibleCount}개 남음)
        </button>
      )}

      {!hasMore && filtered.length > PAGE_SIZE && (
        <button
          onClick={() => setVisibleCount(PAGE_SIZE)}
          style={{
            marginTop: 12,
            width: "100%",
            padding: "8px 12px",
            background: "transparent",
            border: 0,
            color: "var(--bp-ink-3)",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          접기
        </button>
      )}
    </section>
  );
}

/* ─── 토픽 필터 칩 ─── */

function Chip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "6px 12px",
        background: active ? "var(--bp-tc)" : "var(--bp-surface-2)",
        color: active ? "#fff" : "var(--bp-ink-2)",
        border: `1px solid ${active ? "var(--bp-tc)" : "var(--bp-line)"}`,
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      <span>{label}</span>
      <span
        style={{
          fontSize: 10,
          opacity: 0.8,
          fontWeight: 600,
        }}
      >
        {count}
      </span>
    </button>
  );
}

/* ─── 답변 카드 (헤더 + 음성 + transcript + 아코디언 코치노트) ─── */

function MyAnswerCard({ answer }: { answer: MyAnswer }) {
  const [coachOpen, setCoachOpen] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  const fb = answer.feedback_result;
  const hasError = !!fb?.error;
  const hasCoaching = fb && !hasError && (fb.summary || fb.flow);

  return (
    <div
      style={{
        background: "var(--bp-surface-2)",
        border: "1px solid var(--bp-line)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* 헤더 — 토픽 / 날짜 / Q번호 + 음성 */}
      <div
        style={{
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
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
            {answer.topic}
          </span>
          {answer.question_type_kor && (
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
              {answer.question_type_kor}
            </span>
          )}
          <span style={{ fontSize: 11, color: "var(--bp-ink-3)", fontWeight: 600 }}>
            {answer.date_label} · Q{answer.question_idx + 1}
          </span>
          <a
            href={`/opic-study/history/${answer.session_id}`}
            style={{
              marginLeft: "auto",
              fontSize: 11,
              color: "var(--bp-ink-3)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 2,
            }}
            title="세션 전체 보기"
          >
            세션 보기
            <ChevronRight size={11} />
          </a>
        </div>

        {/* 질문 */}
        {(answer.question_english || answer.question_korean) && (
          <div>
            {answer.question_english && (
              <p style={{ margin: 0, color: "var(--bp-ink)", fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>
                {answer.question_english}
              </p>
            )}
            {answer.question_korean && (
              <p style={{ margin: "3px 0 0", color: "var(--bp-ink-3)", fontSize: 11, lineHeight: 1.5 }}>
                {answer.question_korean}
              </p>
            )}
          </div>
        )}

        {/* 답변 음성 플레이어 (큰) */}
        {answer.audio_signed_url && (
          <AudioPlayer url={answer.audio_signed_url} label="내 답변 음성" />
        )}
      </div>

      {/* Transcript */}
      {answer.transcript && (
        <div
          style={{
            padding: "10px 14px",
            borderTop: "1px solid var(--bp-line)",
            background: "var(--bp-surface)",
          }}
        >
          <button
            onClick={() => setTranscriptOpen((v) => !v)}
            style={{
              background: "transparent",
              border: 0,
              color: "var(--bp-ink-3)",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              padding: 0,
              display: "flex",
              alignItems: "center",
              gap: 4,
              marginBottom: transcriptOpen ? 6 : 0,
            }}
          >
            {transcriptOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            Transcript {transcriptOpen ? "접기" : "보기"}
          </button>
          {transcriptOpen && (
            <p
              style={{
                margin: 0,
                color: "var(--bp-ink-2)",
                fontSize: 12,
                lineHeight: 1.6,
                fontStyle: "italic",
              }}
            >
              “{answer.transcript}”
            </p>
          )}
        </div>
      )}

      {/* AI 코치노트 (아코디언) 또는 에러 */}
      {hasError && fb?.error && (
        <div
          style={{
            padding: "10px 14px",
            borderTop: "1px solid var(--bp-line)",
            background: "rgba(220, 38, 38, 0.06)",
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          <AlertCircle size={14} color="rgb(220, 38, 38)" style={{ marginTop: 2, flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 11 }}>
            <p style={{ margin: 0, color: "rgb(185, 28, 28)", fontWeight: 700 }}>
              AI 코칭 생성 실패 ({fb.error.stage})
            </p>
            <p style={{ margin: "2px 0 0", color: "var(--bp-ink-2)" }}>{fb.error.message}</p>
          </div>
        </div>
      )}

      {hasCoaching && fb && (
        <div style={{ borderTop: "1px solid var(--bp-line)" }}>
          <button
            onClick={() => setCoachOpen((v) => !v)}
            style={{
              width: "100%",
              padding: "10px 14px",
              background: coachOpen ? "var(--bp-tc-tint, rgba(201,100,66,0.08))" : "var(--bp-surface)",
              border: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 800,
                color: "var(--bp-tc)",
              }}
            >
              <Bot size={13} />
              AI 코치노트 {coachOpen ? "접기" : "펼치기"}
            </span>
            {coachOpen ? (
              <ChevronUp size={13} color="var(--bp-tc)" />
            ) : (
              <ChevronDown size={13} color="var(--bp-tc)" />
            )}
          </button>
          {coachOpen && <CoachNoteInline feedback={fb} />}
        </div>
      )}
    </div>
  );
}

/* ─── 섹션 타이틀 (MemberMy 스타일 흉내) ─── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        margin: 0,
        display: "flex",
        alignItems: "center",
        gap: 8,
        color: "var(--bp-ink)",
        fontSize: 15,
        fontWeight: 800,
      }}
    >
      <Library size={16} color="var(--bp-tc)" />
      {children}
    </h2>
  );
}
