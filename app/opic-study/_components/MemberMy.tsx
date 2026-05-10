"use client";

/**
 * 오픽 스터디 — 마이페이지
 *
 * 그룹 전체가 아니라 "나" 기준의 참여/답변/패스/코치노트 누적을 보여준다.
 */

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  ChevronRight,
  ClipboardList,
  History as HistoryIcon,
  Home,
  MessageSquareText,
  Settings,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import type { MyStudySummary, StudyGroupStatus } from "@/lib/types/opic-study";

const CATEGORY_LABEL: Record<string, string> = {
  general: "일반",
  roleplay: "롤플레이",
  advance: "어드밴스",
};

interface Props {
  userName: string;
  userInitial: string;
  targetGrade: string;
  group: {
    id: string;
    name: string;
    status: StudyGroupStatus;
    startDate: string;
    endDate: string;
  } | null;
  summary: MyStudySummary;
}

export function MemberMy({
  userName,
  userInitial,
  targetGrade,
  group,
  summary,
}: Props) {
  const router = useRouter();
  const hasGroup = !!group;
  const hasActivity = summary.stats.participated_sessions > 0;

  return (
    <div
      className="bp-scope"
      style={{
        minHeight: "100dvh",
        background: "var(--bp-bg)",
        color: "var(--bp-ink)",
        fontFamily: "var(--bp-font)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          width: "100%",
          background: "var(--bp-bg)",
          borderBottom: "1px solid var(--bp-line)",
          padding: "14px 24px",
          flex: "0 0 auto",
        }}
      >
        <div
          style={{
            maxWidth: 1040,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <button
            onClick={() => router.push("/opic-study")}
            aria-label="뒤로"
            style={iconButtonStyle}
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: "var(--bp-ink-3)",
                letterSpacing: "0.08em",
              }}
            >
              내 스터디
            </span>
            <span style={{ fontSize: 18, fontWeight: 800 }}>
              {hasGroup ? group.name : "참여한 스터디 없음"}
            </span>
          </div>
        </div>
      </header>

      <main
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "28px 24px 88px",
        }}
      >
        <div
          style={{
            maxWidth: 1040,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <ProfileHero
            userName={userName}
            userInitial={userInitial}
            targetGrade={targetGrade}
            group={group}
            lastDateLabel={summary.stats.last_date_label}
          />

          {summary.stats.active_session_id && (
            <button
              onClick={() =>
                router.push(`/opic-study/session/${summary.stats.active_session_id}`)
              }
              style={{
                width: "100%",
                padding: "15px 18px",
                borderRadius: 12,
                border: "1px solid rgba(201, 100, 66, 0.28)",
                background: "var(--bp-tc-tint)",
                color: "var(--bp-ink)",
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                gap: 12,
                alignItems: "center",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <Target size={18} color="var(--bp-tc)" />
              <span>
                <span style={{ display: "block", fontSize: 14, fontWeight: 850 }}>
                  진행 중인 스터디가 있어요
                </span>
                <span style={{ color: "var(--bp-ink-3)", fontSize: 12 }}>
                  이어서 답변하거나 현재 진행 상태를 확인할 수 있어요.
                </span>
              </span>
              <ChevronRight size={17} color="var(--bp-tc)" />
            </button>
          )}

          <section>
            <SectionLabel>내 학습 요약</SectionLabel>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 12,
              }}
            >
              <StatCard
                icon={<Calendar size={16} />}
                label="참여 세션"
                value={`${summary.stats.participated_sessions}회`}
              />
              <StatCard
                icon={<MessageSquareText size={16} />}
                label="내 답변"
                value={`${summary.stats.answer_count}개`}
              />
              <StatCard
                icon={<ClipboardList size={16} />}
                label="내 패스"
                value={`${summary.stats.skip_count}개`}
              />
              <StatCard
                icon={<Sparkles size={16} />}
                label="코치노트"
                value={`${summary.stats.coach_note_count}개`}
              />
            </div>
          </section>

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.15fr) minmax(280px, 0.85fr)",
              gap: 16,
            }}
            className="opic-my-main-grid"
          >
            <Panel>
              <SectionTitle icon={<BarChart3 size={18} />}>
                토픽별 참여
              </SectionTitle>
              {summary.topic_stats.length === 0 ? (
                <EmptyText>
                  아직 토픽별로 집계할 참여 기록이 없어요.
                </EmptyText>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {summary.topic_stats.slice(0, 6).map((topic) => {
                    const max = Math.max(
                      1,
                      ...summary.topic_stats.map((t) => t.session_count)
                    );
                    const pct = Math.max(12, Math.round((topic.session_count / max) * 100));
                    return (
                      <div key={topic.topic}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 10,
                            marginBottom: 6,
                            fontSize: 13,
                          }}
                        >
                          <span style={{ fontWeight: 800 }}>{topic.topic}</span>
                          <span style={{ color: "var(--bp-ink-3)" }}>
                            {topic.session_count}회 · 답변 {topic.answer_count} · 패스 {topic.skip_count}
                          </span>
                        </div>
                        <div
                          aria-hidden="true"
                          style={{
                            height: 8,
                            borderRadius: 999,
                            background: "var(--bp-surface-2)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${pct}%`,
                              height: "100%",
                              borderRadius: 999,
                              background: "var(--bp-tc)",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>

            <Panel>
              <SectionTitle icon={<Sparkles size={18} />}>
                다음에 의식할 것
              </SectionTitle>
              {summary.coach_notes.next_focus ? (
                <div>
                  <p
                    style={{
                      margin: "0 0 14px",
                      color: "var(--bp-ink)",
                      fontSize: 15,
                      lineHeight: 1.65,
                      fontWeight: 700,
                    }}
                  >
                    {summary.coach_notes.next_focus}
                  </p>
                  <CoachList title="자주 보인 강점" items={summary.coach_notes.strengths} />
                  <CoachList title="반복 개선 포인트" items={summary.coach_notes.improvements} />
                </div>
              ) : (
                <EmptyText>
                  코치노트가 쌓이면 다음 세션에서 의식할 포인트를 보여줄게요.
                </EmptyText>
              )}
            </Panel>
          </section>

          <section>
            <SectionLabel>최근 내 참여 세션</SectionLabel>
            {summary.recent_sessions.length === 0 ? (
              <EmptyBox>
                아직 내가 답변하거나 패스한 세션이 없어요. 첫 세션을 시작하면 여기에 기록이 쌓입니다.
              </EmptyBox>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {summary.recent_sessions.slice(0, 5).map((session) => (
                  <button
                    key={session.id}
                    onClick={() => router.push(`/opic-study/history/${session.id}`)}
                    style={{
                      width: "100%",
                      display: "grid",
                      gridTemplateColumns: "54px 1fr auto",
                      gap: 14,
                      alignItems: "center",
                      padding: "16px 18px",
                      borderRadius: 12,
                      border: "1px solid var(--bp-line)",
                      background: "var(--bp-surface)",
                      boxShadow: "var(--bp-shadow-sm)",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span
                      style={{
                        color: "var(--bp-ink-2)",
                        fontSize: 14,
                        fontWeight: 850,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {session.date_label}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                          marginBottom: 5,
                        }}
                      >
                        <span style={{ fontSize: 14, fontWeight: 850 }}>
                          {session.topic} 콤보
                        </span>
                        {session.category && (
                          <span style={tagStyle}>
                            {CATEGORY_LABEL[session.category] ?? session.category}
                          </span>
                        )}
                      </span>
                      <span style={{ color: "var(--bp-ink-3)", fontSize: 12 }}>
                        {session.total_questions}문항 · 답변 {session.answer_count} · 패스 {session.skip_count} · 코치노트 {session.coach_note_count}
                      </span>
                    </span>
                    <ChevronRight size={16} color="var(--bp-ink-3)" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionLabel>최근 코치노트</SectionLabel>
            {summary.coach_notes.recent.length === 0 ? (
              <EmptyBox>답변 후 코치노트가 생성되면 최근 피드백을 모아서 보여줄게요.</EmptyBox>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: 12,
                }}
              >
                {summary.coach_notes.recent.slice(0, 3).map((note) => (
                  <button
                    key={`${note.session_id}-${note.date_label}-${note.summary}`}
                    onClick={() => router.push(`/opic-study/history/${note.session_id}`)}
                    style={{
                      padding: 18,
                      borderRadius: 12,
                      border: "1px solid var(--bp-line)",
                      background: "var(--bp-surface)",
                      boxShadow: "var(--bp-shadow-sm)",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        color: "var(--bp-ink-3)",
                        fontSize: 12,
                        fontWeight: 700,
                        marginBottom: 8,
                      }}
                    >
                      {note.date_label} · {note.topic}
                    </div>
                    <p
                      style={{
                        margin: 0,
                        color: "var(--bp-ink)",
                        fontSize: 14,
                        fontWeight: 700,
                        lineHeight: 1.55,
                      }}
                    >
                      {note.summary}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionLabel>빠른 이동</SectionLabel>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 10,
              }}
            >
              <ActionCard
                href="/opic-study/history"
                icon={<HistoryIcon size={18} strokeWidth={1.7} />}
                title="전체 학습 기록"
                desc="그룹의 세션 기록과 내 참여 기록을 함께 보기"
              />
              <ActionCard
                href="/opic-study"
                icon={<Home size={18} strokeWidth={1.7} />}
                title="스터디 홈"
                desc="오늘 모임 상태와 입장 가능 여부 확인"
              />
              <ActionCard
                href="/mypage"
                icon={<Settings size={18} strokeWidth={1.7} />}
                title="계정 설정"
                desc="목표 등급과 기본 프로필 관리"
              />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function ProfileHero({
  userName,
  userInitial,
  targetGrade,
  group,
  lastDateLabel,
}: {
  userName: string;
  userInitial: string;
  targetGrade: string;
  group: Props["group"];
  lastDateLabel: string;
}) {
  return (
    <section
      style={{
        padding: "30px 28px",
        background:
          "linear-gradient(135deg, var(--bp-surface) 0%, var(--bp-tc-tint) 100%)",
        borderRadius: 16,
        border: "1px solid var(--bp-line)",
        boxShadow: "var(--bp-shadow)",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center",
        gap: 20,
      }}
      className="opic-my-hero"
    >
      <div
        aria-hidden="true"
        style={{
          width: 72,
          height: 72,
          borderRadius: 22,
          background: "var(--bp-tc)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 30,
          fontWeight: 850,
          flexShrink: 0,
        }}
      >
        {userInitial}
      </div>
      <div style={{ minWidth: 0 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 24,
            lineHeight: 1.25,
            fontWeight: 850,
            color: "var(--bp-ink)",
          }}
        >
          {userName}님
        </h1>
        <p
          style={{
            margin: "6px 0 0",
            color: "var(--bp-ink-2)",
            fontSize: 14,
            lineHeight: 1.55,
          }}
        >
          {group
            ? `${group.name} · ${formatPeriod(group.startDate, group.endDate)}`
            : "참여 중인 오픽 스터디가 없습니다."}
        </p>
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        <InfoPill label="목표" value={targetGrade} />
        <InfoPill label="최근 참여" value={lastDateLabel} />
      </div>
    </section>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: "17px 18px",
        background: "var(--bp-surface)",
        borderRadius: 12,
        border: "1px solid var(--bp-line)",
        boxShadow: "var(--bp-shadow-sm)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          color: "var(--bp-ink-3)",
          fontSize: 12,
          marginBottom: 8,
        }}
      >
        {icon}
        {label}
      </div>
      <div
        style={{
          color: "var(--bp-ink)",
          fontSize: 24,
          fontWeight: 850,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: 20,
        background: "var(--bp-surface)",
        borderRadius: 14,
        border: "1px solid var(--bp-line)",
        boxShadow: "var(--bp-shadow-sm)",
      }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: "0.12em",
        color: "var(--bp-ink-3)",
        textTransform: "uppercase",
        marginBottom: 12,
      }}
    >
      {children}
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

function CoachList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          color: "var(--bp-ink-3)",
          fontSize: 12,
          fontWeight: 800,
          marginBottom: 7,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((item) => (
          <div
            key={item}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              background: "var(--bp-surface-2)",
              color: "var(--bp-ink-2)",
              fontSize: 12,
              lineHeight: 1.45,
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionCard({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      style={{
        display: "flex",
        gap: 12,
        padding: "16px 18px",
        background: "var(--bp-surface)",
        borderRadius: 12,
        boxShadow: "var(--bp-shadow-sm)",
        border: "1px solid var(--bp-line)",
        textAlign: "left",
        cursor: "pointer",
        alignItems: "center",
        fontFamily: "inherit",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          background: "var(--bp-surface-2)",
          color: "var(--bp-tc)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 800,
            color: "var(--bp-ink)",
            marginBottom: 2,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--bp-ink-3)",
            lineHeight: 1.45,
          }}
        >
          {desc}
        </div>
      </div>
      <ChevronRight size={15} color="var(--bp-ink-3)" />
    </button>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        flexDirection: "column",
        gap: 2,
        minWidth: 74,
        padding: "8px 11px",
        borderRadius: 12,
        background: "rgba(255, 255, 255, 0.62)",
        border: "1px solid var(--bp-line)",
      }}
    >
      <span style={{ color: "var(--bp-ink-3)", fontSize: 10, fontWeight: 800 }}>
        {label}
      </span>
      <span style={{ color: "var(--bp-ink)", fontSize: 14, fontWeight: 850 }}>
        {value}
      </span>
    </span>
  );
}

function EmptyBox({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: "28px 20px",
        background: "var(--bp-surface)",
        borderRadius: 12,
        border: "1px solid var(--bp-line)",
        boxShadow: "var(--bp-shadow-sm)",
        color: "var(--bp-ink-3)",
        fontSize: 13,
        lineHeight: 1.6,
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}

function EmptyText({ children }: { children: ReactNode }) {
  return (
    <p style={{ margin: 0, color: "var(--bp-ink-3)", fontSize: 13, lineHeight: 1.6 }}>
      {children}
    </p>
  );
}

function formatPeriod(startDate: string, endDate: string) {
  return `${formatDate(startDate)}-${formatDate(endDate)}`;
}

function formatDate(date: string) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const iconButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 32,
  height: 32,
  borderRadius: 8,
  background: "transparent",
  border: "none",
  color: "var(--bp-ink-2)",
  cursor: "pointer",
};

const tagStyle: React.CSSProperties = {
  padding: "2px 8px",
  borderRadius: 999,
  background: "var(--bp-surface-2)",
  color: "var(--bp-ink-3)",
  fontSize: 10,
  fontWeight: 800,
};
