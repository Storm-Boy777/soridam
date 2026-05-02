"use client";

/**
 * 진입 화면 — 홈 / 입장 대기 / 마이페이지
 *
 * 디자인: docs/디자인/opic/project/hf-extra.jsx
 */

import {
  HfPhone,
  HfStatusBar,
  HfBody,
  HfFooter,
  HfButton,
  HfCard,
  CoachAvatar,
  MbDot,
  MbStack,
  Pill,
  Tag,
  Quote,
  Insight,
  SectionH,
} from "../_components/bp";
import {
  MOCK_HOME_USER,
  MOCK_HOME_GROUPS,
  MOCK_LOBBY_MEMBERS,
  MOCK_MY_BPS,
  MOCK_MY_HISTORY,
  type BpQuote,
} from "./_mock";

// ============================================================
// 홈 — 다음 세션 + 내 그룹
// ============================================================

interface HomeProps {
  user?: typeof MOCK_HOME_USER;
  groups?: typeof MOCK_HOME_GROUPS;
  onEnter?: () => void;
  /** 실제 라우트에서 풀스크린으로 표시 (디자인 시안 모드 X) */
  liveMode?: boolean;
  /** 다음 세션 표시 여부 (그룹 0개일 때 false) */
  showNextSession?: boolean;
  /** 비-제어 액션 비활성화 (예: 활성 세션 없을 때 입장 버튼 비활성) */
  enterDisabled?: boolean;
  /** 다음 세션의 실제 멤버 수 (mock의 4명 대신) */
  nextSessionMemberCount?: number;
  /** 다음 세션 멤버 dots (최대 4개 표시). 없으면 색상만으로 N개 placeholder */
  nextSessionMembers?: Array<{ key: "a" | "b" | "c" | "d"; initial: string }>;
}

/**
 * 홈 — 모바일/PC 분기 wrapper
 *
 * - 모바일 (~767px): 기존 HfPhone 기반 폰 모양 시안
 * - PC (768px+): max-width 1024 + 좌측 다음 세션 / 우측 그룹 리스트 그리드
 */
export function Home(props: HomeProps) {
  return (
    <>
      <div
        className="bp-only-mobile"
        style={{ flex: 1, minHeight: 0, display: "flex" }}
      >
        <HomeMobile {...props} />
      </div>
      <div
        className="bp-only-pc"
        style={{ flex: 1, minHeight: 0 }}
      >
        <HomePc {...props} />
      </div>
    </>
  );
}

function HomeMobile({
  user = MOCK_HOME_USER,
  groups = MOCK_HOME_GROUPS,
  onEnter,
  liveMode = false,
  showNextSession = true,
  enterDisabled = false,
  nextSessionMemberCount,
  nextSessionMembers,
}: HomeProps) {
  return (
    <HfPhone liveMode={liveMode}>
      {!liveMode && <HfStatusBar />}

      {/* 헤더 (커스텀 — 사용자 인사) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          borderBottom: "1px solid var(--bp-line)",
          background: "var(--bp-bg)",
          flex: "0 0 auto",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span className="t-h2">안녕하세요, {user.name}</span>
          <span className="t-xs ink-3">{user.todayLabel}</span>
        </div>
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            background: "var(--bp-surface-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
          }}
        >
          👤
        </span>
      </div>

      <HfBody padding="20px">
        {/* 다음 세션 */}
        {showNextSession && (
          <Insight style={{ marginBottom: 20 }}>
            <span className="t-xs ink-3" style={{ marginBottom: 4, display: "block" }}>
              다음 세션
            </span>
            <div className="t-h2" style={{ marginBottom: 6 }}>
              {user.nextSessionTime}
            </div>
            <p className="t-sm" style={{ margin: "0 0 12px", color: "var(--bp-ink-2)" }}>
              {groups[0]?.name ?? "스터디"} · 멤버 {nextSessionMemberCount ?? 4}명
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <MbStack
                members={
                  nextSessionMembers && nextSessionMembers.length > 0
                    ? nextSessionMembers.slice(0, 4).map((m) => ({
                        color: m.key,
                        initial: m.initial,
                      }))
                    : [
                        { color: "a", initial: "A" },
                        { color: "b", initial: "B" },
                        { color: "c", initial: "C" },
                        { color: "d", initial: "D" },
                      ]
                }
              />
              <HfButton
                variant="tc"
                size="sm"
                onClick={onEnter}
                disabled={enterDisabled}
              >
                입장 →
              </HfButton>
            </div>
          </Insight>
        )}

        <SectionH>내 스터디</SectionH>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {groups.map((g, i) => (
            <HfCard
              key={i}
              padding={14}
              style={{ display: "flex", alignItems: "center", gap: 12 }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
                <span className="t-sm" style={{ fontWeight: 600 }}>
                  {g.name}
                </span>
                <span className="t-xs ink-3">{g.meta}</span>
              </div>
              {g.live && <Pill tone="live">진행 중</Pill>}
            </HfCard>
          ))}
        </div>

      </HfBody>
    </HfPhone>
  );
}

// ============================================================
// 홈 — PC (768px+)
// ============================================================

function HomePc({
  user = MOCK_HOME_USER,
  groups = MOCK_HOME_GROUPS,
  onEnter,
  showNextSession = true,
  enterDisabled = false,
  nextSessionMemberCount,
  nextSessionMembers,
}: HomeProps) {
  // V2: 베스트 표현은 마이페이지 BP 누적과 연동 예정. 지금은 placeholder.
  const recentBps: Array<{ from: string; tag: string; text: string }> = [];

  return (
    <div className="bp-scope bp-pc-shell">
      {/* Top header (full-width) */}
      <div
        style={{
          width: "100%",
          background: "var(--bp-bg)",
          borderBottom: "1px solid var(--bp-line)",
          flex: "0 0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 24px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span className="t-h2" style={{ fontWeight: 700 }}>
            안녕하세요, {user.name}
          </span>
          <span className="t-xs ink-3">{user.todayLabel}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              background: "var(--bp-surface-2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
            aria-label="내 계정"
          >
            👤
          </span>
        </div>
      </div>

      {/* 본문 */}
      <div
        className="bp-home-pc-content"
        style={{ flex: 1, overflowY: "auto" }}
      >
        {/* 인사이트: 다음 세션 (큰 카드) */}
        {showNextSession && (
          <Insight style={{ marginBottom: 24 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span className="t-xs ink-3">다음 세션</span>
                <div className="t-display" style={{ fontSize: 28 }}>
                  {user.nextSessionTime}
                </div>
                <p
                  className="t-sm"
                  style={{ margin: 0, color: "var(--bp-ink-2)" }}
                >
                  {groups[0]?.name ?? "스터디"} · 멤버{" "}
                  {nextSessionMemberCount ?? 4}명
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <MbStack
                  members={
                    nextSessionMembers && nextSessionMembers.length > 0
                      ? nextSessionMembers.slice(0, 4).map((m) => ({
                          color: m.key,
                          initial: m.initial,
                        }))
                      : [
                          { color: "a", initial: "A" },
                          { color: "b", initial: "B" },
                          { color: "c", initial: "C" },
                          { color: "d", initial: "D" },
                        ]
                  }
                />
                <HfButton
                  variant="tc"
                  size="lg"
                  onClick={onEnter}
                  disabled={enterDisabled}
                  style={{ minWidth: 140 }}
                >
                  입장 →
                </HfButton>
              </div>
            </div>
          </Insight>
        )}

        {/* 1.4fr / 1fr 듀얼 */}
        <div className="bp-home-pc-dual">
          {/* LEFT — 내 스터디 + 새 그룹 */}
          <div className="bp-home-pc-stack">
            <SectionH>내 스터디</SectionH>
            {groups.length === 0 ? (
              <HfCard
                padding={20}
                style={{ textAlign: "center", color: "var(--bp-ink-3)" }}
              >
                <span className="t-sm">아직 등록된 스터디가 없어요</span>
              </HfCard>
            ) : (
              groups.map((g, i) => (
                <HfCard
                  key={i}
                  padding={18}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <span className="t-h3" style={{ fontWeight: 600 }}>
                      {g.name}
                    </span>
                    <span className="t-xs ink-3">{g.meta}</span>
                  </div>
                  {g.live && <Pill tone="live">진행 중</Pill>}
                </HfCard>
              ))
            )}
          </div>

          {/* RIGHT — 최근 학습한 베스트 표현 */}
          <div className="bp-home-pc-stack">
            <SectionH>최근 학습한 베스트 표현</SectionH>
            {recentBps.length === 0 ? (
              <HfCard
                padding={20}
                style={{
                  textAlign: "center",
                  color: "var(--bp-ink-3)",
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>✨</div>
                <p className="t-sm" style={{ margin: 0, lineHeight: 1.55 }}>
                  세션을 진행하면서
                  <br />
                  베스트 표현이 모여요
                </p>
              </HfCard>
            ) : (
              recentBps.map((b, i) => (
                <HfCard key={i} padding={14}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <Tag tone="good" style={{ fontSize: 10 }}>
                      {b.tag}
                    </Tag>
                    <span className="t-xs ink-3">from {b.from}</span>
                  </div>
                  <Quote
                    style={{
                      background: "var(--bp-surface-2)",
                      padding: "8px 10px",
                      fontSize: 12,
                    }}
                  >
                    {b.text}
                  </Quote>
                </HfCard>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 입장 대기 (Lobby)
// ============================================================

export type LobbyMemberState = "me" | "in" | "wait";
export interface LobbyMember {
  key: "a" | "b" | "c" | "d";
  name: string;
  state: LobbyMemberState;
}

interface LobbyProps {
  groupName?: string;
  members?: LobbyMember[];
  onPreview?: () => void;
  onBack?: () => void;
  liveMode?: boolean;
}

/**
 * 입장 대기 — 모바일/PC 분기 wrapper
 */
export function Lobby(props: LobbyProps) {
  return (
    <>
      <div
        className="bp-only-mobile"
        style={{ flex: 1, minHeight: 0, display: "flex" }}
      >
        <LobbyMobile {...props} />
      </div>
      <div
        className="bp-only-pc"
        style={{ flex: 1, minHeight: 0 }}
      >
        <LobbyPc {...props} />
      </div>
    </>
  );
}

function LobbyMobile({
  groupName = "5월 오픽 AL 스터디",
  members = MOCK_LOBBY_MEMBERS,
  onPreview,
  onBack,
  liveMode = false,
}: LobbyProps) {
  const waitCount = members.filter((m) => m.state === "wait").length;

  return (
    <HfPhone liveMode={liveMode}>
      {!liveMode && <HfStatusBar />}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          borderBottom: "1px solid var(--bp-line)",
          background: "var(--bp-bg)",
          flex: "0 0 auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={onBack}
            style={{
              fontSize: 18,
              color: "var(--bp-ink-2)",
              cursor: "pointer",
              background: "transparent",
              border: "none",
              padding: 0,
            }}
            aria-label="뒤로"
          >
            ←
          </button>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span className="t-h3">입장 대기</span>
            <span className="t-micro ink-3">{groupName}</span>
          </div>
        </div>
        <Pill>대기실</Pill>
      </div>

      <HfBody padding="24px 20px">
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "var(--bp-tc-tint)",
              color: "var(--bp-tc)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              margin: "0 auto 12px",
            }}
          >
            ⏱
          </div>
          <div className="t-h1" style={{ marginBottom: 6 }}>
            곧 시작해요
          </div>
          <p className="t-sm ink-3" style={{ margin: 0 }}>
            {waitCount}명이 더 들어오면 시작됩니다
          </p>
        </div>

        <HfCard padding={16}>
          <SectionH>
            멤버 ({members.filter((m) => m.state !== "wait").length}/{members.length})
          </SectionH>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {members.map((m) => (
              <div
                key={m.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <MbDot
                  color={m.key}
                  initial={m.name[0]}
                  live={m.state !== "wait"}
                  size={32}
                  fontSize={12}
                  style={m.state === "wait" ? { opacity: 0.4 } : undefined}
                />
                <span
                  className="t-sm"
                  style={{
                    fontWeight: 500,
                    flex: 1,
                    color: m.state === "wait" ? "var(--bp-ink-3)" : "var(--bp-ink)",
                  }}
                >
                  {m.name}{" "}
                  {m.state === "me" && <span className="t-xs ink-3">(나)</span>}
                </span>
                {m.state === "in" && (
                  <Pill tone="live" style={{ fontSize: 10 }}>
                    입장
                  </Pill>
                )}
                {m.state === "wait" && (
                  <span className="t-xs ink-3">대기 중…</span>
                )}
                {m.state === "me" && (
                  <span
                    className="t-xs"
                    style={{ color: "var(--bp-tc)", fontWeight: 600 }}
                  >
                    준비됨
                  </span>
                )}
              </div>
            ))}
          </div>
        </HfCard>

        <HfCard
          padding={12}
          style={{
            marginTop: 16,
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            background: "var(--bp-surface-2)",
            boxShadow: "none",
          }}
        >
          <CoachAvatar size="sm" />
          <p
            className="t-xs"
            style={{
              margin: 0,
              lineHeight: 1.55,
              color: "var(--bp-ink-2)",
              flex: 1,
            }}
          >
            기다리는 동안 오늘 학습할 콤보를 미리 살펴보세요.
          </p>
        </HfCard>
      </HfBody>

      <HfFooter>
        <HfButton variant="secondary" size="lg" full onClick={onPreview}>
          콤보 미리보기
        </HfButton>
      </HfFooter>
    </HfPhone>
  );
}

// ============================================================
// 입장 대기 — PC (768px+)
// ============================================================

function LobbyPc({
  groupName = "5월 오픽 AL 스터디",
  members = MOCK_LOBBY_MEMBERS,
  onPreview,
  onBack,
}: LobbyProps) {
  const waitCount = members.filter((m) => m.state === "wait").length;
  const inCount = members.filter((m) => m.state !== "wait").length;

  return (
    <div className="bp-scope bp-pc-shell">
      {/* 상단 바 */}
      <div className="bp-pc-topbar">
        <div className="bp-pc-topbar-inner">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              onClick={onBack}
              style={{
                fontSize: 22,
                color: "var(--bp-ink-2)",
                cursor: "pointer",
                background: "transparent",
                border: "none",
                padding: 0,
                lineHeight: 1,
              }}
              aria-label="뒤로"
            >
              ←
            </button>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span className="t-h2" style={{ fontWeight: 700 }}>
                입장 대기
              </span>
              <span className="t-sm ink-3">{groupName}</span>
            </div>
          </div>
          <Pill>대기실</Pill>
        </div>
      </div>

      {/* 본문 */}
      <div className="bp-pc-body">
        <div className="bp-pc-container">
          <div className="bp-lobby-pc-grid">
            {/* Hero */}
            <div className="bp-lobby-pc-hero">
              <div className="bp-lobby-pc-hero-icon">⏱</div>
              <div className="t-h1" style={{ marginBottom: 8 }}>
                곧 시작해요
              </div>
              <p className="t-sm ink-3" style={{ margin: 0 }}>
                {waitCount > 0
                  ? `${waitCount}명이 더 들어오면 시작됩니다`
                  : "모두 입장했어요"}
              </p>

              <div className="bp-lobby-pc-notice">
                <CoachAvatar size="sm" />
                <p
                  className="t-sm"
                  style={{
                    margin: 0,
                    lineHeight: 1.55,
                    color: "var(--bp-ink-2)",
                    flex: 1,
                  }}
                >
                  기다리는 동안 오늘 학습할 콤보를 미리 살펴보세요.
                </p>
              </div>
            </div>

            {/* Members */}
            <div className="bp-lobby-pc-members">
              <SectionH>
                멤버 ({inCount}/{members.length})
              </SectionH>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                {members.map((m) => (
                  <div
                    key={m.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <MbDot
                      color={m.key}
                      initial={m.name[0]}
                      live={m.state !== "wait"}
                      size={36}
                      fontSize={14}
                      style={
                        m.state === "wait" ? { opacity: 0.4 } : undefined
                      }
                    />
                    <span
                      className="t-body"
                      style={{
                        flex: 1,
                        fontWeight: 500,
                        color:
                          m.state === "wait"
                            ? "var(--bp-ink-3)"
                            : "var(--bp-ink)",
                      }}
                    >
                      {m.name}{" "}
                      {m.state === "me" && (
                        <span className="t-xs ink-3">(나)</span>
                      )}
                    </span>
                    {m.state === "in" && (
                      <Pill tone="live" style={{ fontSize: 11 }}>
                        입장
                      </Pill>
                    )}
                    {m.state === "wait" && (
                      <span className="t-xs ink-3">대기 중…</span>
                    )}
                    {m.state === "me" && (
                      <span
                        className="t-xs"
                        style={{ color: "var(--bp-tc)", fontWeight: 600 }}
                      >
                        준비됨
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bp-pc-footer">
        <div
          className="bp-pc-footer-inner"
          style={{ display: "flex", justifyContent: "center" }}
        >
          <HfButton
            variant="secondary"
            size="lg"
            onClick={onPreview}
            style={{ minWidth: 280 }}
          >
            콤보 미리보기
          </HfButton>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 마이페이지 — BP 누적
// ============================================================

interface MyPageProps {
  userName?: string;
  userInitial?: string;
  groupLabel?: string;
  bps?: BpQuote[];
  history?: typeof MOCK_MY_HISTORY;
  liveMode?: boolean;
}

/** MyPage — 모바일/PC 분기 wrapper */
export function MyPage(props: MyPageProps) {
  return (
    <>
      <div className="bp-only-mobile" style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <MyPageMobile {...props} />
      </div>
      <div className="bp-only-pc" style={{ flex: 1, minHeight: 0 }}>
        <MyPagePc {...props} />
      </div>
    </>
  );
}

function MyPageMobile({
  userName = "Alice",
  userInitial = "A",
  groupLabel = "5월 오픽 AL 스터디 · 12회 함께함",
  bps = MOCK_MY_BPS,
  history = MOCK_MY_HISTORY,
  liveMode = false,
}: MyPageProps) {
  return (
    <HfPhone liveMode={liveMode}>
      {!liveMode && <HfStatusBar />}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          borderBottom: "1px solid var(--bp-line)",
          background: "var(--bp-bg)",
          flex: "0 0 auto",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span className="t-h2">내 학습</span>
          <span className="t-xs ink-3">함께 배운 발자취</span>
        </div>
        <span style={{ fontSize: 16, color: "var(--bp-ink-2)" }}>⚙</span>
      </div>

      <HfBody padding="20px">
        {/* Profile */}
        <HfCard
          variant="lift"
          padding={18}
          style={{ marginBottom: 20, textAlign: "center" }}
        >
          <MbDot
            color="a"
            initial={userInitial}
            size={56}
            fontSize={22}
            style={{ margin: "0 auto 10px", display: "flex" }}
          />
          <div className="t-h2" style={{ marginBottom: 4 }}>
            {userName}
          </div>
          <span className="t-xs ink-3">{groupLabel}</span>
        </HfCard>

        {/* BP collection */}
        <SectionH>내가 배운 베스트 표현</SectionH>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {bps.map((b, i) => (
            <HfCard key={i} padding={12}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <Tag tone="good" style={{ fontSize: 10 }}>
                  {b.tag}
                </Tag>
                <span className="t-xs ink-3">from {b.from}</span>
              </div>
              <Quote
                style={{
                  background: "var(--bp-surface-2)",
                  padding: "8px 10px",
                  fontSize: 12,
                }}
              >
                {b.text}
              </Quote>
            </HfCard>
          ))}
        </div>

        {/* History */}
        <SectionH>학습한 콤보</SectionH>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {history.map((h, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                background: "var(--bp-surface)",
                borderRadius: 10,
                boxShadow: "var(--bp-shadow-sm)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "var(--bp-good)",
                    color: "white",
                    fontSize: 9,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                  }}
                >
                  ✓
                </span>
                <span className="t-sm">{h.name}</span>
              </div>
              <span className="t-xs ink-3 t-num">{h.date}</span>
            </div>
          ))}
        </div>
      </HfBody>
    </HfPhone>
  );
}

function MyPagePc({
  userName = "Alice",
  userInitial = "A",
  groupLabel = "5월 오픽 AL 스터디 · 12회 함께함",
  bps = MOCK_MY_BPS,
  history = MOCK_MY_HISTORY,
}: MyPageProps) {
  return (
    <div className="bp-scope bp-pc-shell">
      {/* Top header */}
      <div
        style={{
          width: "100%",
          background: "var(--bp-bg)",
          borderBottom: "1px solid var(--bp-line)",
          flex: "0 0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 24px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span className="t-h2" style={{ fontWeight: 700 }}>
            내 학습
          </span>
          <span className="t-xs ink-3">함께 배운 발자취</span>
        </div>
        <span style={{ fontSize: 18, color: "var(--bp-ink-2)" }}>⚙</span>
      </div>

      <div className="bp-home-pc-content" style={{ flex: 1, overflowY: "auto" }}>
        {/* Profile (centered) */}
        <HfCard
          variant="lift"
          padding={24}
          style={{
            marginBottom: 28,
            textAlign: "center",
            maxWidth: 480,
            margin: "0 auto 28px",
          }}
        >
          <MbDot
            color="a"
            initial={userInitial}
            size={64}
            fontSize={26}
            style={{ margin: "0 auto 12px", display: "flex" }}
          />
          <div className="t-h1" style={{ marginBottom: 4 }}>
            {userName}
          </div>
          <span className="t-sm ink-3">{groupLabel}</span>
        </HfCard>

        {/* 1.4fr / 1fr — BPs + History */}
        <div className="bp-home-pc-dual">
          <div className="bp-home-pc-stack">
            <SectionH>내가 배운 베스트 표현</SectionH>
            {bps.length === 0 ? (
              <HfCard
                padding={20}
                style={{
                  textAlign: "center",
                  color: "var(--bp-ink-3)",
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>✨</div>
                <p className="t-sm" style={{ margin: 0 }}>
                  아직 모은 베스트 표현이 없어요
                </p>
              </HfCard>
            ) : (
              bps.map((b, i) => (
                <HfCard key={i} padding={14}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <Tag tone="good" style={{ fontSize: 10 }}>
                      {b.tag}
                    </Tag>
                    <span className="t-xs ink-3">from {b.from}</span>
                  </div>
                  <Quote
                    style={{
                      background: "var(--bp-surface-2)",
                      padding: "10px 12px",
                      fontSize: 13,
                    }}
                  >
                    {b.text}
                  </Quote>
                </HfCard>
              ))
            )}
          </div>

          <div className="bp-home-pc-stack">
            <SectionH>학습한 콤보</SectionH>
            {history.map((h, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  background: "var(--bp-surface)",
                  borderRadius: 10,
                  boxShadow: "var(--bp-shadow-sm)",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: "var(--bp-good)",
                      color: "white",
                      fontSize: 10,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                    }}
                  >
                    ✓
                  </span>
                  <span className="t-sm">{h.name}</span>
                </div>
                <span className="t-xs ink-3 t-num">{h.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
