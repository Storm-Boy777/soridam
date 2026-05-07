"use client";

/**
 * 오픽 스터디 — 학습 기록
 *
 * 그룹 탭 + 요약 통계 + 월별 timeline.
 * 디자인: max-width 1024 (멤버 홈/Lobby와 통일)
 */

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Archive,
  Calendar,
  ChevronRight,
  MessagesSquare,
  Users,
  Clock,
  PlayCircle,
} from "lucide-react";

const CATEGORY_LABEL: Record<string, string> = {
  general: "일반",
  roleplay: "롤플레이",
  advance: "어드밴스",
};

type MbColor = "a" | "b" | "c" | "d";

interface SessionDisplay {
  id: string;
  dateLabel: string;
  topic: string;
  category: string | null;
  totalAnswers: number;
  totalSkips: number;
  totalQuestions: number;
  participantCount: number;
  memberCount: number;
  status: string;
  memberHighlights?: Array<{
    user_id: string;
    name: string;
    initial: string;
    color: MbColor;
    strength: string | null;
    improvement: string | null;
  }>;
  // 정렬·그룹핑용 — 페이지에서 ISO 문자열로 넘김 (없으면 dateLabel 사용)
  endedAtIso?: string;
  startedAtIso?: string;
}

interface Props {
  groups: Array<{ id: string; name: string }>;
  sessions: SessionDisplay[];
  selectedGroupId: string;
}

const COLOR_BG: Record<MbColor, string> = {
  a: "var(--bp-mb-a)",
  b: "var(--bp-mb-b)",
  c: "var(--bp-mb-c)",
  d: "var(--bp-mb-d)",
};

export function MemberHistory({ groups, sessions, selectedGroupId }: Props) {
  const router = useRouter();
  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const activeSessions = useMemo(
    () => sessions.filter((s) => s.status === "active"),
    [sessions]
  );
  const learningSessions = useMemo(
    () =>
      sessions.filter(
        (s) => s.status === "completed" && s.totalAnswers + s.totalSkips > 0
      ),
    [sessions]
  );
  const hiddenEmptyCount = useMemo(
    () =>
      sessions.filter(
        (s) => s.status === "completed" && s.totalAnswers + s.totalSkips === 0
      ).length,
    [sessions]
  );

  // 통계 계산
  const stats = useMemo(() => {
    const totalAnswers = learningSessions.reduce((sum, s) => sum + s.totalAnswers, 0);
    const totalSkips = learningSessions.reduce((sum, s) => sum + s.totalSkips, 0);
    const peakParticipants = Math.max(
      0,
      ...learningSessions.map((s) => s.participantCount)
    );
    const lastSession = learningSessions[0] ?? activeSessions[0];
    return {
      totalSessions: learningSessions.length,
      totalAnswers,
      totalSkips,
      peakParticipants,
      lastDateLabel: lastSession?.dateLabel ?? "─",
    };
  }, [activeSessions, learningSessions]);

  // 월별 그룹핑 (dateLabel 우선; ISO 있으면 더 정확)
  const grouped = useMemo(() => groupByMonth(learningSessions), [learningSessions]);

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
      {/* 헤더 */}
      <div
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
            maxWidth: 1024,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <button
            onClick={() => router.push("/opic-study")}
            aria-label="뒤로"
            style={{
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
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span
              className="t-xs"
              style={{
                color: "var(--bp-ink-3)",
                fontWeight: 700,
                letterSpacing: "0.08em",
              }}
            >
              학습 기록
            </span>
            <span
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "var(--bp-ink)",
              }}
            >
              {groups.length === 0
                ? "참여한 스터디 없음"
                : selectedGroup?.name ?? `${groups.length}개 스터디`}
            </span>
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "28px 24px 80px",
        }}
      >
        <div
          style={{
            maxWidth: 1024,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {/* 빈 상태 */}
          {groups.length === 0 ? (
            <EmptyState
              title="아직 학습 기록이 없어요"
              desc="참여 중인 스터디 그룹이 없습니다."
            />
          ) : (
            <>
              {/* 그룹 탭 */}
              {groups.length > 1 && (
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    flexWrap: "wrap",
                  }}
                >
                  {groups.map((g) => {
                    const active = g.id === selectedGroupId;
                    return (
                      <button
                        key={g.id}
                        onClick={() =>
                          router.push(`/opic-study/history?group=${g.id}`)
                        }
                        style={{
                          padding: "8px 16px",
                          borderRadius: 999,
                          border: "1px solid",
                          borderColor: active
                            ? "var(--bp-tc)"
                            : "var(--bp-line)",
                          background: active ? "var(--bp-tc)" : "var(--bp-surface)",
                          color: active ? "#fff" : "var(--bp-ink-2)",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {g.name}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 요약 4개 카드 */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 12,
                }}
              >
                <StatCard
                  icon={<Calendar size={16} />}
                  label="학습 완료"
                  value={`${stats.totalSessions}회`}
                />
                <StatCard
                  icon={<MessagesSquare size={16} />}
                  label="음성 답변"
                  value={`${stats.totalAnswers}개`}
                />
                <StatCard
                  icon={<Archive size={16} />}
                  label="패스"
                  value={`${stats.totalSkips}개`}
                />
                <StatCard
                  icon={<Users size={16} />}
                  label="최다 참여"
                  value={stats.peakParticipants > 0 ? `${stats.peakParticipants}명` : "─"}
                />
                <StatCard
                  icon={<Clock size={16} />}
                  label="마지막 참여"
                  value={stats.lastDateLabel}
                />
              </div>

              {activeSessions.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <SectionLabel>진행 중인 스터디</SectionLabel>
                  {activeSessions.map((s) => (
                    <ActiveSessionBanner
                      key={s.id}
                      session={s}
                      onClick={() => router.push(`/opic-study/session/${s.id}`)}
                    />
                  ))}
                </div>
              )}

              {/* 빈 세션 */}
              {learningSessions.length === 0 ? (
                <EmptyState
                  title="아직 진행한 세션이 없어요"
                  desc="첫 세션을 시작해보세요!"
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 24,
                  }}
                >
                  {grouped.map(({ monthLabel, items }) => (
                    <section key={monthLabel}>
                      <SectionLabel>
                        {monthLabel} · {items.length}회
                      </SectionLabel>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                        }}
                      >
                        {items.map((s) => (
                          <SessionCard
                            key={s.id}
                            session={s}
                            onClick={() =>
                              router.push(`/opic-study/history/${s.id}`)
                            }
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                  {hiddenEmptyCount > 0 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "12px 14px",
                        borderRadius: 10,
                        background: "var(--bp-surface-2)",
                        color: "var(--bp-ink-3)",
                        fontSize: 12,
                      }}
                    >
                      <Archive size={14} strokeWidth={1.8} />
                      답변이나 패스가 없는 빈 세션 {hiddenEmptyCount}개는 기록에서 숨겼어요.
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 내부 컴포넌트
// ============================================================

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
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

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: "16px 18px",
        background: "var(--bp-surface)",
        borderRadius: "var(--bp-radius)",
        boxShadow: "var(--bp-shadow-sm)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "var(--bp-ink-3)",
          fontSize: 12,
          marginBottom: 8,
        }}
      >
        {icon}
        <span>{label}</span>
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: "var(--bp-ink)",
          fontFeatureSettings: '"tnum"',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ActiveSessionBanner({
  session,
  onClick,
}: {
  session: SessionDisplay;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "16px 18px",
        borderRadius: 12,
        border: "1px solid rgba(201, 100, 66, 0.28)",
        background: "var(--bp-tc-tint)",
        color: "var(--bp-ink)",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center",
        gap: 14,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          background: "var(--bp-tc)",
          color: "#fff",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <PlayCircle size={19} strokeWidth={1.9} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span
          style={{
            display: "block",
            fontSize: 14,
            fontWeight: 800,
            color: "var(--bp-ink)",
            marginBottom: 3,
          }}
        >
          {session.topic === "(미선택)" ? "아직 콤보 선택 전이에요" : `${session.topic} 콤보 진행 중`}
        </span>
        <span style={{ fontSize: 12, color: "var(--bp-ink-3)" }}>
          {session.dateLabel} · 참여 {session.participantCount}/{session.memberCount} · 답변 {session.totalAnswers} · 패스 {session.totalSkips}
        </span>
      </span>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 12,
          fontWeight: 700,
          color: "var(--bp-tc)",
          whiteSpace: "nowrap",
        }}
      >
        이어가기
        <ChevronRight size={14} strokeWidth={2} />
      </span>
    </button>
  );
}

function SessionCard({
  session,
  onClick,
}: {
  session: SessionDisplay;
  onClick: () => void;
}) {
  const highlights = session.memberHighlights?.slice(0, 4) ?? [];

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick();
      }}
      style={{
        padding: "18px 20px",
        background: "var(--bp-surface)",
        borderRadius: 12,
        border: "1px solid var(--bp-line)",
        boxShadow: "var(--bp-shadow-sm)",
        display: "grid",
        gridTemplateColumns: "64px 1fr auto",
        gap: 18,
        alignItems: "center",
        cursor: "pointer",
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
    >
      <div
        style={{
          fontSize: 15,
          fontWeight: 800,
          color: "var(--bp-ink-2)",
          fontFeatureSettings: '"tnum"',
        }}
      >
        {session.dateLabel}
      </div>

      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 6,
          }}
        >
          <span
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: "var(--bp-ink)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "100%",
            }}
          >
            {session.topic} 콤보
          </span>
          {session.category && (
            <span
              style={{
                padding: "2px 8px",
                borderRadius: 999,
                background: "var(--bp-surface-2)",
                color: "var(--bp-ink-3)",
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              {CATEGORY_LABEL[session.category] ?? session.category}
            </span>
          )}
          <StatusBadge status={session.status} />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            color: "var(--bp-ink-3)",
            fontSize: 12,
          }}
        >
          <span>{session.totalQuestions}문항</span>
          <span>답변 {session.totalAnswers}</span>
          <span>패스 {session.totalSkips}</span>
          <span>
            참여 {session.participantCount}/{session.memberCount}
          </span>
          {highlights.length > 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                minWidth: 0,
              }}
            >
              {highlights.map((h) => (
                <span
                  key={h.user_id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    color: "var(--bp-ink-2)",
                    fontWeight: 600,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 999,
                      background: COLOR_BG[h.color],
                      color: "#fff",
                      fontSize: 9,
                      fontWeight: 800,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {h.initial}
                  </span>
                  {h.name}
                </span>
              ))}
            </span>
          )}
        </div>
      </div>

      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: "var(--bp-ink-3)",
          fontSize: 12,
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        자세히
        <ChevronRight size={15} strokeWidth={2} />
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; bg: string; color: string }> = {
    completed: {
      label: "완료",
      bg: "var(--bp-good-tint)",
      color: "var(--bp-good)",
    },
    active: {
      label: "진행 중",
      bg: "var(--bp-tc-tint)",
      color: "var(--bp-tc)",
    },
    abandoned: {
      label: "중단",
      bg: "var(--bp-surface-2)",
      color: "var(--bp-ink-3)",
    },
  };
  const c = config[status] ?? config.abandoned;
  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        background: c.bg,
        color: c.color,
        fontSize: 11,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {c.label}
    </span>
  );
}

function EmptyState({
  title,
  desc,
}: {
  title: string;
  desc: string;
}) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "80px 20px",
        background: "var(--bp-surface)",
        borderRadius: "var(--bp-radius-lg)",
        boxShadow: "var(--bp-shadow-sm)",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 48,
          height: 48,
          borderRadius: 16,
          background: "var(--bp-tc-tint)",
          color: "var(--bp-tc)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
        }}
      >
        <Archive size={24} strokeWidth={1.8} />
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          marginBottom: 8,
          color: "var(--bp-ink)",
        }}
      >
        {title}
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 14,
          lineHeight: 1.6,
          color: "var(--bp-ink-3)",
        }}
      >
        {desc}
      </p>
    </div>
  );
}

// ============================================================
// 헬퍼 — 월별 그룹핑
// ============================================================

interface MonthGroup {
  monthLabel: string;
  items: SessionDisplay[];
}

function groupByMonth(sessions: SessionDisplay[]): MonthGroup[] {
  const map = new Map<string, SessionDisplay[]>();
  for (const s of sessions) {
    // dateLabel은 "M/D" 형태. ISO 우선, 없으면 dateLabel에서 월만 추출.
    let monthKey = "";
    const iso = s.endedAtIso ?? s.startedAtIso;
    if (iso) {
      const d = new Date(iso);
      monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    } else {
      const m = s.dateLabel.split("/")[0];
      monthKey = `month-${m}`;
    }
    const arr = map.get(monthKey) ?? [];
    arr.push(s);
    map.set(monthKey, arr);
  }

  return Array.from(map.entries()).map(([key, items]) => {
    let monthLabel = "";
    if (key.startsWith("month-")) {
      monthLabel = `${key.slice(6)}월`;
    } else {
      const [y, m] = key.split("-");
      monthLabel = `${y}년 ${parseInt(m, 10)}월`;
    }
    return { monthLabel, items };
  });
}
