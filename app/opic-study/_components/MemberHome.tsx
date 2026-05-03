"use client";

/**
 * 오픽 스터디 — 멤버 홈
 *
 * 5가지 상태 분기 + 운영 가이드 + 학습 + 그룹 카드 + 빠른 이동.
 * 카운트다운은 1초 인터벌로 클라이언트에서 계산.
 */

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createBrowserClient } from "@supabase/ssr";
import {
  Mic,
  MessagesSquare,
  Sparkles,
  ChevronDown,
  ChevronUp,
  History,
  User,
  Headphones,
  Lightbulb,
  Calendar,
} from "lucide-react";
import {
  HfPhone,
  HfBody,
  HfButton,
  Pill,
  MbStack,
} from "./bp";
import {
  getCurrentSessionState,
  getModeForDate,
  formatRemaining,
  formatDday,
  formatKstDateLabel,
  formatKstTime,
  type OpicStudySchedule,
  type SessionState,
  type WeekDayStatus,
  type MeetingMode,
} from "@/lib/opic-study/schedule";
import { createSession, getActiveSession } from "@/lib/actions/opic-study";

// ============================================================
// Types
// ============================================================

type MbColor = "a" | "b" | "c" | "d";

export interface MemberHomeUser {
  name: string;
  initial: string;
  todayLabel: string;
}

export interface MemberHomeGroup {
  id: string;
  name: string;
  meta: string;
  live: boolean;
}

export interface MemberHomeProps {
  user: MemberHomeUser;
  groups: MemberHomeGroup[];
  schedule: OpicStudySchedule;
  activeGroupId?: string;
  hasActiveSession: boolean;
  nextSessionMembers?: Array<{ key: MbColor; initial: string; userId: string }>;
  nextSessionMemberCount?: number;
  /** 활성 세션 ID — presence channel 식별용 (없으면 listen X) */
  activeSessionId: string | null;
  /** 현재 사용자 ID — presence track 시 본인만 제외하기 위해 */
  currentUserId: string;
  learnStats?: {
    lastParticipationDaysAgo?: number | null;
    totalAnswers?: number | null;
    examDday?: number | null;
  };
}

// ============================================================
// Main
// ============================================================

export function MemberHome(props: MemberHomeProps) {
  const [sessionState, setSessionState] = useState<SessionState>(() =>
    getCurrentSessionState(props.schedule, new Date(), {
      hasActiveSession: props.hasActiveSession,
    })
  );

  // Realtime presence — 활성 세션의 lobby/세션 룸에 입장한 멤버 추적
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const id = setInterval(() => {
      setSessionState(
        getCurrentSessionState(props.schedule, new Date(), {
          hasActiveSession: props.hasActiveSession,
        })
      );
    }, 1000);
    return () => clearInterval(id);
  }, [props.schedule, props.hasActiveSession]);

  // 활성 세션의 presence channel을 listen (track X — 멤버 홈은 입장 X)
  useEffect(() => {
    if (!props.activeSessionId) {
      setOnlineUserIds(new Set());
      return;
    }
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const ch = supabase.channel(
      `opic-study-presence:${props.activeSessionId}`,
      { config: { presence: { key: `home-${props.currentUserId}` } } }
    );

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      // home-{id} 키는 멤버 홈 listener라 제외
      const ids = Object.keys(state).filter((k) => !k.startsWith("home-"));
      setOnlineUserIds(new Set(ids));
    }).subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [props.activeSessionId, props.currentUserId]);

  return (
    <>
      <div className="bp-only-mobile">
        <MemberHomeMobile
          {...props}
          sessionState={sessionState}
          onlineUserIds={onlineUserIds}
        />
      </div>
      <div className="bp-only-pc">
        <MemberHomePc
          {...props}
          sessionState={sessionState}
          onlineUserIds={onlineUserIds}
        />
      </div>
    </>
  );
}

// ============================================================
// Mobile
// ============================================================

function MemberHomeMobile(
  props: MemberHomeProps & {
    sessionState: SessionState;
    onlineUserIds: Set<string>;
  }
) {
  return (
    <div
      className="bp-scope"
      style={{
        background: "var(--bp-bg)",
        color: "var(--bp-ink)",
        fontFamily: "var(--bp-font)",
      }}
    >
      <Header user={props.user} compact />
      <div
        style={{
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <SessionCard {...props} />
        <OnboardingGuide schedule={props.schedule} />
        <WeekStrip thisWeek={props.sessionState.thisWeek} />
        {props.learnStats && <LearnStatsRow stats={props.learnStats} />}
        <GroupCardSection
          groups={props.groups}
          members={props.nextSessionMembers}
        />
        <QuickLinks />
      </div>
    </div>
  );
}

// ============================================================
// PC (max-width 1024 — 비율 유지)
// ============================================================

function MemberHomePc(
  props: MemberHomeProps & {
    sessionState: SessionState;
    onlineUserIds: Set<string>;
  }
) {
  return (
    <div
      className="bp-scope"
      style={{
        background: "var(--bp-bg)",
        color: "var(--bp-ink)",
        fontFamily: "var(--bp-font)",
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          width: "100%",
          background: "var(--bp-bg)",
          borderBottom: "1px solid var(--bp-line)",
          padding: "16px 28px",
        }}
      >
        <div
          style={{
            maxWidth: 1024,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span className="t-h2" style={{ fontWeight: 700 }}>
              안녕하세요, {props.user.name}님 ☕
            </span>
            <span className="t-xs ink-3">{props.user.todayLabel}</span>
          </div>
        </div>
      </div>

      {/* 본문 — 자연 스크롤 (외곽 layout이 처리) */}
      <div style={{ padding: "28px 28px 80px" }}>
        <div
          style={{
            maxWidth: 1024,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 28,
          }}
        >
          <SessionCard {...props} wide />
          <OnboardingGuide schedule={props.schedule} />

          {/* 이번 주 + 학습 — 가로 2단 (높이 동일) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: props.learnStats ? "1.4fr 1fr" : "1fr",
              gap: 16,
              alignItems: "stretch",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <SectionLabel>이번 주 일정</SectionLabel>
              <div style={{ flex: 1, display: "flex" }}>
                <div style={{ width: "100%" }}>
                  <WeekStrip thisWeek={props.sessionState.thisWeek} fillHeight />
                </div>
              </div>
            </div>
            {props.learnStats && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <SectionLabel>내 학습</SectionLabel>
                <div style={{ flex: 1, display: "flex" }}>
                  <div style={{ width: "100%" }}>
                    <LearnStatsRow stats={props.learnStats} fillHeight />
                  </div>
                </div>
              </div>
            )}
          </div>

          <GroupCardSection
            groups={props.groups}
            members={props.nextSessionMembers}
          />
          <QuickLinks />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 헤더 (모바일 전용 — PC는 wrapper 안에서 직접 처리)
// ============================================================

function Header({ user, compact = false }: { user: MemberHomeUser; compact?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: compact ? "14px 20px" : "16px 24px",
        borderBottom: "1px solid var(--bp-line)",
        background: "var(--bp-bg)",
        flex: "0 0 auto",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span className="t-h2" style={{ fontWeight: 700 }}>
          안녕하세요, {user.name}님 ☕
        </span>
        <span className="t-xs ink-3">{user.todayLabel}</span>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.12em",
        color: "var(--bp-ink-3)",
        textTransform: "uppercase",
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}

// ============================================================
// SessionCard — 5상태 분기 (강화)
// ============================================================

function SessionCard({
  sessionState,
  schedule,
  groups,
  activeGroupId,
  nextSessionMembers,
  nextSessionMemberCount,
  onlineUserIds,
  wide = false,
}: MemberHomeProps & {
  sessionState: SessionState;
  onlineUserIds: Set<string>;
  wide?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const todayMode = getModeForDate(schedule);
  const joinedCount = onlineUserIds.size;

  const handleEnter = () => {
    if (!activeGroupId) return;
    startTransition(async () => {
      const activeRes = await getActiveSession(activeGroupId);
      if (activeRes.data) {
        // 활성 세션 — step에 따라 분기
        // mode_select(=lobby 단계): 멤버 모이는 자리에 합류
        // 그 외: 이미 진행 중 → 세션 룸 직진
        if (activeRes.data.step === "mode_select") {
          router.push(`/opic-study/lobby/${activeRes.data.id}`);
        } else {
          router.push(`/opic-study/session/${activeRes.data.id}`);
        }
        return;
      }
      // 활성 세션 X — 새로 만들면 자동으로 mode_select(lobby) 단계로 시작
      const createRes = await createSession(activeGroupId);
      if (createRes.error) {
        toast.error(createRes.error);
        return;
      }
      if (createRes.data?.session_id) {
        router.push(`/opic-study/lobby/${createRes.data.session_id}`);
      }
    });
  };

  const memberCount = nextSessionMemberCount ?? 0;
  const groupName = groups[0]?.name ?? "스터디";
  // 입장한 멤버는 점등 + 정상 opacity, 미입장은 dimmed
  const memberStack =
    nextSessionMembers && nextSessionMembers.length > 0 ? (
      <div
        style={{ display: "inline-flex", alignItems: "center" }}
        className="bp-mb-stack"
      >
        {nextSessionMembers.slice(0, 4).map((m) => {
          const joined = onlineUserIds.has(m.userId);
          return (
            <span
              key={m.userId}
              className={`bp-mb-dot ${joined ? m.key : ""} ${joined ? "live" : ""}`}
              style={
                joined
                  ? undefined
                  : {
                      background: "var(--bp-ink-4)",
                      color: "#fff",
                      transition: "background 0.2s",
                    }
              }
            >
              {m.initial}
            </span>
          );
        })}
      </div>
    ) : null;

  // ──── A. LIVE ──────────────────────────────────
  if (sessionState.kind === "live") {
    const remaining = sessionState.liveRemainingMs ?? 0;
    const liveTitle =
      joinedCount === 0
        ? "오늘 모임이 열렸어요"
        : joinedCount === 1
          ? "한 분이 먼저 와 계세요"
          : `지금 ${joinedCount}명 함께 모여 있어요`;
    return (
      <div
        style={{
          position: "relative",
          padding: wide ? "32px 36px" : "24px 22px",
          background:
            "linear-gradient(135deg, var(--bp-tc-tint) 0%, var(--bp-tc-soft) 100%)",
          borderRadius: "var(--bp-radius-lg)",
          boxShadow: "var(--bp-shadow)",
          overflow: "hidden",
        }}
      >
        {/* 배경 장식 — 흐릿한 원 */}
        <div
          style={{
            position: "absolute",
            right: -40,
            top: -40,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "var(--bp-tc)",
            opacity: 0.08,
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: wide ? "row" : "column",
            justifyContent: "space-between",
            alignItems: wide ? "center" : "flex-start",
            gap: wide ? 20 : 18,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
            <div
              style={{
                display: "inline-flex",
                alignSelf: "flex-start",
                alignItems: "center",
                gap: 6,
                padding: "5px 10px",
                borderRadius: 999,
                background: "var(--bp-tc)",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#fff",
                  animation: "bp-pulse 1.5s ease-in-out infinite",
                }}
              />
              LIVE · 진행 중
            </div>
            <div
              style={{
                fontSize: wide ? 30 : 24,
                fontWeight: 800,
                lineHeight: 1.2,
                color: "var(--bp-ink)",
              }}
            >
              {liveTitle}
            </div>
            <div
              className="t-sm"
              style={{
                color: "var(--bp-ink-2)",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span>
                {groupName} · {joinedCount}명 입장
                <span style={{ color: "var(--bp-ink-3)" }}>
                  {" "}/ 그룹 {memberCount}명
                </span>
              </span>
              <ModeBadge mode={todayMode} />
            </div>

            {/* 큰 카운트다운 */}
            <div
              style={{
                marginTop: 4,
                display: "flex",
                alignItems: "baseline",
                gap: 8,
              }}
            >
              <span
                style={{
                  fontSize: wide ? 32 : 26,
                  fontWeight: 800,
                  fontFeatureSettings: '"tnum"',
                  color: "var(--bp-tc)",
                  lineHeight: 1,
                }}
              >
                {formatRemaining(remaining)}
              </span>
              <span className="t-xs" style={{ color: "var(--bp-ink-3)" }}>
                남음
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 14,
              width: wide ? undefined : "100%",
            }}
          >
            {memberStack}
            <HfButton
              variant="tc"
              size="lg"
              onClick={handleEnter}
              disabled={pending || !activeGroupId}
              style={wide ? { minWidth: 180 } : { width: "100%" }}
            >
              {pending ? "잠시만…" : "입장하기 →"}
            </HfButton>
          </div>
        </div>
      </div>
    );
  }

  // ──── A-2. LIVE_OVERTIME (마무리 중) ────────────
  if (sessionState.kind === "live_overtime") {
    const remaining = sessionState.liveRemainingMs ?? 0;
    return (
      <div
        style={{
          position: "relative",
          padding: wide ? "32px 36px" : "24px 22px",
          background: "var(--bp-surface)",
          borderRadius: "var(--bp-radius-lg)",
          boxShadow: "var(--bp-shadow)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: wide ? "row" : "column",
            justifyContent: "space-between",
            alignItems: wide ? "center" : "flex-start",
            gap: wide ? 20 : 18,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
            <div
              style={{
                display: "inline-flex",
                alignSelf: "flex-start",
                alignItems: "center",
                gap: 6,
                padding: "5px 10px",
                borderRadius: 999,
                background: "var(--bp-tip-tint)",
                color: "var(--bp-tip)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              ⏳ 마무리 중
            </div>
            <div
              style={{
                fontSize: wide ? 30 : 24,
                fontWeight: 800,
                lineHeight: 1.2,
                color: "var(--bp-ink)",
              }}
            >
              아직 함께 마무리하고 있어요
            </div>
            <div
              className="t-sm"
              style={{
                color: "var(--bp-ink-2)",
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span>
                {groupName} · {joinedCount}명 마무리 중
                <span style={{ color: "var(--bp-ink-3)" }}>
                  {" "}/ 그룹 {memberCount}명
                </span>{" "}
                · 정리 시간 {formatRemaining(remaining)} 남음
              </span>
              <ModeBadge mode={todayMode} />
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 14,
              width: wide ? undefined : "100%",
            }}
          >
            {memberStack}
            <HfButton
              variant="tc"
              size="lg"
              onClick={handleEnter}
              disabled={pending || !activeGroupId}
              style={wide ? { minWidth: 180 } : { width: "100%" }}
            >
              {pending ? "잠시만…" : "입장하기 →"}
            </HfButton>
          </div>
        </div>
      </div>
    );
  }

  // ──── A-3. READY (활성 세션 X + 운영 시간 안) ───
  if (sessionState.kind === "ready") {
    const endLabel = sessionState.nextSessionEnd
      ? formatKstTime(sessionState.nextSessionEnd)
      : "";
    return (
      <NeutralCard wide={wide}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <Pill tone="default" style={{ alignSelf: "flex-start" }}>
            오늘 모임
          </Pill>
          <div
            style={{
              fontSize: wide ? 30 : 24,
              fontWeight: 800,
              color: "var(--bp-ink)",
            }}
          >
            오늘 모임이 열렸어요
          </div>
          <div
            className="t-sm"
            style={{
              color: "var(--bp-ink-2)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span>
              {groupName} · {endLabel}까지 진행
            </span>
            <ModeBadge mode={todayMode} />
          </div>
          <div
            className="t-xs"
            style={{ color: "var(--bp-ink-3)", marginTop: 2 }}
          >
            아직 아무도 입장하지 않았어요. 첫 입장자가 되어 멤버를 기다려보세요.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: wide ? "flex-end" : "flex-start",
            gap: 14,
          }}
        >
          {memberStack}
          <HfButton
            variant="tc"
            size="lg"
            onClick={handleEnter}
            disabled={pending || !activeGroupId}
            style={wide ? { minWidth: 180 } : { width: "100%" }}
          >
            {pending ? "잠시만…" : "입장하기 →"}
          </HfButton>
        </div>
      </NeutralCard>
    );
  }

  // ──── B-1. TODAY_SOON (시작 30분 전 ~ 시작) ─────
  if (sessionState.kind === "today_soon") {
    const startLabel = sessionState.nextSessionStart
      ? formatKstTime(sessionState.nextSessionStart)
      : "";
    const remaining = sessionState.nextRemainingMs ?? 0;
    return (
      <NeutralCard wide={wide}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <Pill tone="default" style={{ alignSelf: "flex-start" }}>
            오늘 모임
          </Pill>
          <div
            style={{
              fontSize: wide ? 30 : 24,
              fontWeight: 800,
              color: "var(--bp-ink)",
            }}
          >
            곧 시작해요 · 모일 시간이에요
          </div>
          <div
            className="t-sm"
            style={{
              color: "var(--bp-ink-2)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span>
              {groupName} · {startLabel} 시작 · 멤버 {memberCount}명
            </span>
            <ModeBadge mode={todayMode} />
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: wide ? 20 : 16,
              fontWeight: 700,
              color: "var(--bp-tc)",
              fontFeatureSettings: '"tnum"',
            }}
          >
            {formatRemaining(remaining)} 후 시작
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: wide ? "flex-end" : "flex-start",
            gap: 14,
          }}
        >
          {memberStack}
          <HfButton
            variant="tc"
            size="lg"
            onClick={handleEnter}
            disabled={pending || !activeGroupId}
            style={wide ? { minWidth: 180 } : { width: "100%" }}
          >
            {pending ? "잠시만…" : "입장하기 →"}
          </HfButton>
        </div>
      </NeutralCard>
    );
  }

  // ──── B-2. TODAY_BEFORE (시작 30분 이상 전) ─────
  if (sessionState.kind === "today_before") {
    const startLabel = sessionState.nextSessionStart
      ? formatKstTime(sessionState.nextSessionStart)
      : "";
    const remaining = sessionState.nextRemainingMs ?? 0;
    return (
      <NeutralCard wide={wide}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <Pill tone="default" style={{ alignSelf: "flex-start" }}>
            오늘 모임
          </Pill>
          <div
            style={{
              fontSize: wide ? 30 : 24,
              fontWeight: 800,
              color: "var(--bp-ink)",
            }}
          >
            오늘 {startLabel}에 모여요
          </div>
          <div
            className="t-sm"
            style={{
              color: "var(--bp-ink-2)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span>{groupName} · 멤버 {memberCount}명</span>
            <ModeBadge mode={todayMode} />
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: wide ? 18 : 15,
              fontWeight: 600,
              color: "var(--bp-ink-3)",
              fontFeatureSettings: '"tnum"',
            }}
          >
            {formatRemaining(remaining)} 후 시작 · 30분 전부터 입장 가능
          </div>
        </div>
      </NeutralCard>
    );
  }

  // ──── C. TODAY_AFTER ──────────────────────────
  if (sessionState.kind === "today_after") {
    const next = sessionState.nextSessionStart;
    const nextLabel = next
      ? `${formatKstDateLabel(next)} ${formatKstTime(next)}`
      : "";
    return (
      <NeutralCard wide={wide}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <Pill tone="default" style={{ alignSelf: "flex-start" }}>
            오늘 종료
          </Pill>
          <div
            style={{
              fontSize: wide ? 30 : 24,
              fontWeight: 800,
              color: "var(--bp-ink)",
            }}
          >
            오늘 모임은 끝났어요 · 다음에 또 만나요
          </div>
          <div className="t-sm" style={{ color: "var(--bp-ink-2)" }}>
            다음 모임 · {nextLabel}
          </div>
        </div>
      </NeutralCard>
    );
  }

  // ──── D. WEEKEND ──────────────────────────────
  if (sessionState.kind === "weekend") {
    const next = sessionState.nextSessionStart;
    const nextLabel = next
      ? `${formatKstDateLabel(next)} ${formatKstTime(next)}`
      : "";
    const dday =
      next && sessionState.nextRemainingMs !== null
        ? formatDday(next.getTime(), Date.now())
        : "";
    return (
      <NeutralCard wide={wide}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="t-xs ink-3">{dday}</span>
          <div
            style={{
              fontSize: wide ? 30 : 24,
              fontWeight: 800,
              color: "var(--bp-ink)",
            }}
          >
            오늘은 쉬어가는 날이에요
          </div>
          <div className="t-sm" style={{ color: "var(--bp-ink-2)" }}>
            다음 모임 · {nextLabel}
          </div>
        </div>
      </NeutralCard>
    );
  }

  // ──── E. BEFORE_FIRST ──────────────────────────
  const first = sessionState.nextSessionStart;
  const firstLabel = first
    ? `${formatKstDateLabel(first)} ${formatKstTime(first)}`
    : "";
  const ddayE =
    first && sessionState.nextRemainingMs !== null
      ? formatDday(first.getTime(), Date.now())
      : "";
  return (
    <div
      style={{
        position: "relative",
        padding: wide ? "32px 36px" : "24px 22px",
        background:
          "linear-gradient(135deg, var(--bp-surface) 0%, var(--bp-tc-tint) 100%)",
        borderRadius: "var(--bp-radius-lg)",
        boxShadow: "var(--bp-shadow)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: -40,
          top: -40,
          width: 200,
          height: 200,
          borderRadius: "50%",
          background: "var(--bp-tc)",
          opacity: 0.06,
        }}
      />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 10 }}>
        <span className="t-xs" style={{ color: "var(--bp-tc)", fontWeight: 700, letterSpacing: "0.08em" }}>
          첫 스터디까지
        </span>
        <div
          style={{
            fontSize: wide ? 30 : 24,
            fontWeight: 800,
            color: "var(--bp-ink)",
            lineHeight: 1.2,
          }}
        >
          첫 모임을 기다리고 있어요
        </div>
        <div className="t-sm" style={{ color: "var(--bp-ink-2)" }}>
          {firstLabel} 시작 · {groupName} ·{" "}
          <span
            style={{
              color: "var(--bp-tc)",
              fontWeight: 700,
              fontFeatureSettings: '"tnum"',
            }}
          >
            {ddayE}
          </span>
        </div>
      </div>
    </div>
  );
}

function ModeBadge({ mode }: { mode: MeetingMode }) {
  const online = mode === "online";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 8px",
        borderRadius: 999,
        background: "var(--bp-surface-2)",
        color: "var(--bp-ink-2)",
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {online ? "🌐 온라인" : "🏢 오프라인"}
    </span>
  );
}

function NeutralCard({
  children,
  wide,
}: {
  children: React.ReactNode;
  wide: boolean;
}) {
  return (
    <div
      style={{
        padding: wide ? "32px 36px" : "24px 22px",
        background: "var(--bp-surface)",
        borderRadius: "var(--bp-radius-lg)",
        boxShadow: "var(--bp-shadow)",
        display: "flex",
        flexDirection: wide ? "row" : "column",
        justifyContent: "space-between",
        alignItems: wide ? "center" : "flex-start",
        gap: wide ? 20 : 18,
      }}
    >
      {children}
    </div>
  );
}

// ============================================================
// OnboardingGuide — 운영 가이드 (3단계 + 시간/규칙)
// ============================================================

function OnboardingGuide({ schedule }: { schedule: OpicStudySchedule }) {
  const [open, setOpen] = useState(true);

  const dayShort = ["일", "월", "화", "수", "목", "금", "토"];
  const dayList = schedule.days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => dayShort[d])
    .join("·");

  return (
    <section
      style={{
        background: "var(--bp-surface)",
        borderRadius: "var(--bp-radius-lg)",
        boxShadow: "var(--bp-shadow-sm)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "16px 20px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--bp-ink)",
          fontFamily: "inherit",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Sparkles size={18} style={{ color: "var(--bp-tc)" }} />
          <span style={{ fontSize: 15, fontWeight: 700 }}>
            처음이신가요? 스터디는 이렇게 진행돼요
          </span>
        </div>
        {open ? (
          <ChevronUp size={18} style={{ color: "var(--bp-ink-3)" }} />
        ) : (
          <ChevronDown size={18} style={{ color: "var(--bp-ink-3)" }} />
        )}
      </button>

      {open && (
        <div
          style={{
            padding: "0 20px 22px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          {/* 3단계 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 10,
            }}
          >
            <Step
              num="1"
              icon={<MessagesSquare size={18} strokeWidth={1.6} />}
              title="디스코드 음성 합류"
              desc="멤버끼리 인사 + 대화는 디스코드에서. 자유롭게 음성 채팅하세요."
            />
            <Step
              num="2"
              icon={<Mic size={18} strokeWidth={1.6} />}
              title="한 명씩 답변, 함께 듣기"
              desc="답변자는 자기 마이크로 녹음, 나머지는 디스코드로 함께 들어요. 다른 사람 답변이 그대로 인사이트가 됩니다."
            />
            <Step
              num="3"
              icon={<Sparkles size={18} strokeWidth={1.6} />}
              title="AI 코칭 + 토론"
              desc="멤버별 답변 코칭이 나오면, 디스코드에서 함께 인사이트 토론으로 마무리."
            />
          </div>

          {/* 운영 안내 */}
          <div
            style={{
              padding: "14px 16px",
              background: "var(--bp-surface-2)",
              borderRadius: "var(--bp-radius)",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 10,
              fontSize: 13,
              color: "var(--bp-ink-2)",
              lineHeight: 1.6,
            }}
          >
            <Tip
              icon={<Calendar size={14} />}
              text={`매주 ${dayList} ${schedule.start_time}~${schedule.end_time}`}
            />
            <Tip
              icon={<Headphones size={14} />}
              text="다른 멤버 답변도 함께 들으며 배워요"
            />
            <Tip
              icon={<Lightbulb size={14} />}
              text="끝나면 다 같이 인사이트 토론"
            />
          </div>
        </div>
      )}
    </section>
  );
}

function Step({
  num,
  icon,
  title,
  desc,
}: {
  num: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div
      style={{
        padding: "16px 14px",
        background: "var(--bp-surface-2)",
        borderRadius: "var(--bp-radius)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: 999,
            background: "var(--bp-tc-tint)",
            color: "var(--bp-tc)",
            fontSize: 11,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {num}
        </span>
        <span style={{ color: "var(--bp-tc)" }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--bp-ink)" }}>
          {title}
        </span>
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.55, color: "var(--bp-ink-2)" }}>
        {desc}
      </div>
    </div>
  );
}

function Tip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ color: "var(--bp-ink-3)" }}>{icon}</span>
      <span>{text}</span>
    </div>
  );
}

// ============================================================
// WeekStrip — 7일 (운영일 강조, 비운영일은 점만)
// ============================================================

function WeekStrip({
  thisWeek,
  fillHeight = false,
}: {
  thisWeek: WeekDayStatus[];
  fillHeight?: boolean;
}) {
  const labelMap = ["일", "월", "화", "수", "목", "금", "토"];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: 8,
        padding: "16px 18px",
        background: "var(--bp-surface)",
        borderRadius: "var(--bp-radius)",
        boxShadow: "var(--bp-shadow-sm)",
        height: fillHeight ? "100%" : undefined,
        alignItems: fillHeight ? "center" : undefined,
        boxSizing: "border-box",
      }}
    >
      {thisWeek.map((d) => (
        <DayDot key={d.dateKst} label={labelMap[d.dayOfWeek]} status={d.status} />
      ))}
    </div>
  );
}

function DayDot({
  label,
  status,
}: {
  label: string;
  status: WeekDayStatus["status"];
}) {
  if (status === "off") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          opacity: 0.4,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 4,
              height: 4,
              borderRadius: 999,
              background: "var(--bp-ink-4)",
            }}
          />
        </div>
        <span className="t-xs" style={{ color: "var(--bp-ink-4)", fontWeight: 500 }}>
          {label}
        </span>
      </div>
    );
  }

  const config = {
    done: {
      ring: "var(--bp-ink-4)",
      fill: "var(--bp-ink-4)",
      label: "var(--bp-ink-3)",
      icon: "✓",
    },
    live: {
      ring: "var(--bp-tc)",
      fill: "var(--bp-tc)",
      label: "var(--bp-tc)",
      icon: "●",
    },
    today: {
      ring: "var(--bp-tc)",
      fill: "transparent",
      label: "var(--bp-ink)",
      icon: "",
    },
    upcoming: {
      ring: "var(--bp-line)",
      fill: "transparent",
      label: "var(--bp-ink-3)",
      icon: "",
    },
    off: {
      ring: "transparent",
      fill: "transparent",
      label: "var(--bp-ink-4)",
      icon: "",
    },
  }[status];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 999,
          border: `2px solid ${config.ring}`,
          background: config.fill,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 700,
          color: status === "done" || status === "live" ? "#fff" : config.label,
        }}
      >
        {config.icon}
      </div>
      <span className="t-xs" style={{ color: config.label, fontWeight: 600 }}>
        {label}
      </span>
    </div>
  );
}

// ============================================================
// LearnStatsRow — 3개 항목 항상 표시 (없으면 ─)
// ============================================================

function LearnStatsRow({
  stats,
  fillHeight = false,
}: {
  stats: NonNullable<MemberHomeProps["learnStats"]>;
  fillHeight?: boolean;
}) {
  const items = [
    {
      label: "마지막 참여",
      value:
        stats.lastParticipationDaysAgo === undefined ||
        stats.lastParticipationDaysAgo === null
          ? "─"
          : stats.lastParticipationDaysAgo === 0
            ? "오늘"
            : `${stats.lastParticipationDaysAgo}일 전`,
    },
    {
      label: "누적 답변",
      value:
        stats.totalAnswers === undefined || stats.totalAnswers === null
          ? "─"
          : `${stats.totalAnswers}개`,
    },
    {
      label: "시험까지",
      value:
        stats.examDday === undefined || stats.examDday === null
          ? "─"
          : stats.examDday === 0
            ? "D-day"
            : stats.examDday > 0
              ? `D-${stats.examDday}`
              : `D+${-stats.examDday}`,
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 10,
        padding: "16px 18px",
        background: "var(--bp-surface)",
        borderRadius: "var(--bp-radius)",
        boxShadow: "var(--bp-shadow-sm)",
        height: fillHeight ? "100%" : undefined,
        alignItems: fillHeight ? "center" : undefined,
        boxSizing: "border-box",
      }}
    >
      {items.map((it) => (
        <div
          key={it.label}
          style={{ display: "flex", flexDirection: "column", gap: 4 }}
        >
          <span className="t-xs ink-3">{it.label}</span>
          <span
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "var(--bp-ink)",
              fontFeatureSettings: '"tnum"',
            }}
          >
            {it.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// GroupCardSection — 내 스터디 그룹
// ============================================================

function GroupCardSection({
  groups,
  members,
}: {
  groups: MemberHomeGroup[];
  members?: Array<{ key: MbColor; initial: string }>;
}) {
  if (groups.length === 0) return null;

  return (
    <section>
      <SectionLabel>내 스터디 그룹</SectionLabel>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {groups.map((g, idx) => (
          <div
            key={g.id}
            style={{
              padding: "18px 20px",
              background: "var(--bp-surface)",
              borderRadius: "var(--bp-radius)",
              boxShadow: "var(--bp-shadow-sm)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--bp-ink)",
                  }}
                >
                  {g.name}
                </span>
                {g.live && <Pill tone="live">활성</Pill>}
              </div>
              {idx === 0 && members && members.length > 0 && (
                <MbStack
                  members={members.slice(0, 4).map((m) => ({
                    color: m.key,
                    initial: m.initial,
                  }))}
                />
              )}
            </div>
            <div
              className="t-sm"
              style={{ color: "var(--bp-ink-2)", lineHeight: 1.5 }}
            >
              {g.meta}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================
// QuickLinks — 카드형
// ============================================================

function QuickLinks() {
  return (
    <section>
      <SectionLabel>빠른 이동</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 10,
        }}
      >
        <QuickLinkCard
          href="/opic-study/history"
          icon={<History size={18} strokeWidth={1.6} />}
          title="지난 모임 이력"
          desc="이전 세션 답변과 코칭 다시 보기"
        />
        <QuickLinkCard
          href="/opic-study/my"
          icon={<User size={18} strokeWidth={1.6} />}
          title="마이페이지"
          desc="내 답변 모음과 학습 통계"
        />
      </div>
    </section>
  );
}

function QuickLinkCard({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        gap: 12,
        padding: "16px 18px",
        background: "var(--bp-surface)",
        borderRadius: "var(--bp-radius)",
        boxShadow: "var(--bp-shadow-sm)",
        textDecoration: "none",
        alignItems: "center",
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 999,
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
            fontWeight: 700,
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
    </Link>
  );
}
