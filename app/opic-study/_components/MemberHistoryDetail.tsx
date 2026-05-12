"use client";

/**
 * 오픽 스터디 — 학습 기록 상세
 *
 * 완료 세션을 읽기 전용으로 복기하는 화면.
 */

import { useRouter } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Globe,
  ListChecks,
  UsersRound,
} from "lucide-react";
import type { SessionHistoryDetail } from "@/lib/types/opic-study";
import { SessionReplay } from "./SessionReplay";

const CATEGORY_LABEL: Record<string, string> = {
  general: "일반",
  roleplay: "롤플레이",
  advance: "어드밴스",
};

const COLOR_BG: Record<"a" | "b" | "c" | "d", string> = {
  a: "var(--bp-mb-a)",
  b: "var(--bp-mb-b)",
  c: "var(--bp-mb-c)",
  d: "var(--bp-mb-d)",
};

interface Props {
  detail: SessionHistoryDetail;
}

export function MemberHistoryDetail({ detail }: Props) {
  const router = useRouter();
  const dateLabel = formatDate(detail.ended_at ?? detail.started_at);
  const topic = detail.selected_topic ?? "미선택";
  const category = detail.selected_category
    ? CATEGORY_LABEL[detail.selected_category] ?? detail.selected_category
    : null;

  return (
    <div
      className="bp-scope"
      style={{
        minHeight: "100dvh",
        background: "var(--bp-bg)",
        color: "var(--bp-ink)",
        fontFamily: "var(--bp-font)",
      }}
    >
      <header
        style={{
          borderBottom: "1px solid var(--bp-line)",
          background: "var(--bp-bg)",
          padding: "14px 24px",
        }}
      >
        <div
          style={{
            maxWidth: 1040,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <button
            onClick={() => router.push("/opic-study/history")}
            aria-label="학습 기록으로 돌아가기"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              border: "none",
              background: "transparent",
              color: "var(--bp-ink-2)",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={18} />
            학습 기록
          </button>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "var(--bp-ink-3)",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {detail.online_mode ? (
              <Globe size={14} strokeWidth={1.8} />
            ) : (
              <Building2 size={14} strokeWidth={1.8} />
            )}
            {detail.online_mode ? "온라인" : "오프라인"}
          </span>
        </div>
      </header>

      <div style={{ padding: "40px 24px 96px" }}>
        <div
          style={{
            maxWidth: 1040,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 22,
          }}
        >
          <section style={{ textAlign: "center", padding: "10px 0 18px" }}>
            <div
              aria-hidden="true"
              style={{
                width: 76,
                height: 76,
                borderRadius: 22,
                background: "var(--bp-tc-tint)",
                color: "var(--bp-tc)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <CheckCircle2 size={34} strokeWidth={1.8} />
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: 34,
                lineHeight: 1.2,
                fontWeight: 850,
                color: "var(--bp-ink)",
              }}
            >
              {topic} 콤보 기록
            </h1>
            <p
              style={{
                margin: "10px 0 0",
                color: "var(--bp-ink-3)",
                fontSize: 15,
              }}
            >
              {detail.group_name} · {dateLabel}
              {category ? ` · ${category}` : ""}
            </p>
          </section>

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 12,
            }}
          >
            <Stat label="문항" value={`${detail.stats.total_questions}개`} />
            <Stat label="답변" value={`${detail.stats.answer_count}개`} />
            <Stat label="패스" value={`${detail.stats.skip_count}개`} />
            <Stat
              label="참여"
              value={`${detail.stats.participant_count}/${detail.stats.group_member_count}명`}
            />
            <Stat label="코치노트" value={`${detail.stats.coach_note_count}개`} />
          </section>

          <section
            style={{
              background: "var(--bp-surface)",
              border: "1px solid var(--bp-line)",
              borderRadius: 14,
              padding: 22,
              boxShadow: "var(--bp-shadow-sm)",
            }}
          >
            <SectionTitle icon={<ListChecks size={18} />}>
              세션 복기 — 다시 듣고 코칭 보기
            </SectionTitle>
            <SessionReplay questions={detail.questions} />
          </section>

          <section
            style={{
              background: "var(--bp-surface)",
              border: "1px solid var(--bp-line)",
              borderRadius: 14,
              padding: 22,
              boxShadow: "var(--bp-shadow-sm)",
            }}
          >
            <SectionTitle icon={<UsersRound size={18} />}>참여 멤버</SectionTitle>
            {detail.members.length === 0 ? (
              <p style={{ margin: 0, color: "var(--bp-ink-3)", fontSize: 14 }}>
                이 세션에는 답변이나 패스 기록이 없어요.
              </p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 12,
                }}
              >
                {detail.members.map((m) => (
                  <div
                    key={m.user_id}
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      border: "1px solid var(--bp-line)",
                      background: "var(--bp-surface-2)",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 999,
                        background: COLOR_BG[m.color],
                        color: "#fff",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 850,
                        fontSize: 13,
                        flexShrink: 0,
                      }}
                    >
                      {m.initial}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span
                        style={{
                          display: "block",
                          color: "var(--bp-ink)",
                          fontSize: 14,
                          fontWeight: 800,
                          marginBottom: 2,
                        }}
                      >
                        {m.name}
                      </span>
                      <span style={{ color: "var(--bp-ink-3)", fontSize: 12 }}>
                        답변 {m.answered_count} · 패스 {m.skipped_count} · 코치노트 {m.coach_note_count}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 10,
              flexWrap: "wrap",
              paddingTop: 6,
            }}
          >
            <button
              onClick={() => router.push("/opic-study/history")}
              style={buttonStyle("secondary")}
            >
              목록으로
            </button>
            <button onClick={() => router.push("/opic-study")} style={buttonStyle("primary")}>
              홈으로
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        color: "var(--bp-ink)",
        fontSize: 16,
        fontWeight: 850,
        marginBottom: 16,
      }}
    >
      <span style={{ color: "var(--bp-tc)", display: "inline-flex" }}>{icon}</span>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: "15px 16px",
        borderRadius: 12,
        background: "var(--bp-surface)",
        border: "1px solid var(--bp-line)",
        boxShadow: "var(--bp-shadow-sm)",
      }}
    >
      <div style={{ color: "var(--bp-ink-3)", fontSize: 12, marginBottom: 6 }}>
        {label}
      </div>
      <div
        style={{
          color: "var(--bp-ink)",
          fontSize: 22,
          fontWeight: 850,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function StatusTag({
  status,
}: {
  status: SessionHistoryDetail["questions"][number]["status"];
}) {
  const map = {
    completed: { label: "완료", bg: "var(--bp-good-tint)", color: "var(--bp-good)" },
    skipped: { label: "전원 패스", bg: "var(--bp-surface)", color: "var(--bp-ink-3)" },
    mixed: { label: "일부 패스", bg: "var(--bp-tip-tint)", color: "var(--bp-tip)" },
    waiting: { label: "미완료", bg: "var(--bp-surface)", color: "var(--bp-ink-3)" },
  }[status];

  return (
    <span
      style={{
        padding: "4px 9px",
        borderRadius: 999,
        background: map.bg,
        color: map.color,
        fontSize: 11,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {map.label}
    </span>
  );
}

function buttonStyle(variant: "primary" | "secondary"): CSSProperties {
  const primary = variant === "primary";
  return {
    minWidth: 136,
    height: 46,
    borderRadius: 12,
    border: primary ? "none" : "1px solid var(--bp-line)",
    background: primary ? "var(--bp-ink)" : "var(--bp-surface)",
    color: primary ? "#fff" : "var(--bp-ink)",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: primary ? "var(--bp-shadow-sm)" : "none",
  };
}

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}
