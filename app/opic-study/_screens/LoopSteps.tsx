"use client";

/**
 * Step 6-1 ~ 6-3 — 질문 루프
 *  - 6-1: 발화자 선정
 *  - 6-2 (Self): 답변 녹음 (본인)
 *  - 6-2 (Other): 답변 청취 + 메모 (타인)
 *  - 6-3: AI 코칭 생성 중
 *
 * 디자인: docs/디자인/opic/project/hf-loop.jsx
 */

import { useState, useEffect } from "react";
import {
  Mic,
  Headphones,
  Sparkles,
  SkipForward,
  X,
} from "lucide-react";
import {
  HfPhone,
  HfStatusBar,
  HfHeader,
  HfBody,
  HfFooter,
  HfButton,
  HfCard,
  HfWave,
  CoachAvatar,
  MbDot,
  MbStack,
  Pill,
  SectionH,
  PcStepShell,
} from "../_components/bp";
import { goHome } from "@/lib/opic-study/nav";
import { onCardKey } from "@/lib/opic-study/keyboard";
import { useSessionFrame } from "../_components/session-frame-context";
import {
  MOCK_QUESTION_Q1,
  MOCK_NOTE_DEFAULT,
  MOCK_PROCESS_STEPS,
  type ProcessStep,
} from "./_mock";

// ============================================================
// Step 6-1 · 발화자 선정
// ============================================================

interface Step61Props {
  question?: typeof MOCK_QUESTION_Q1;
  onStart?: (speakerKey: string) => void;
}

/** Step 6-1 — 모바일/PC 분기 wrapper */
export function Step61(props: Step61Props) {
  return (
    <>
      <div className="bp-only-mobile" style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <Step61Mobile {...props} />
      </div>
      <div className="bp-only-pc" style={{ flex: 1, minHeight: 0 }}>
        <Step61Pc {...props} />
      </div>
    </>
  );
}

const STEP61_MEMBERS = [
  { key: "a" as const, name: "Alice", sub: "나" },
  { key: "b" as const, name: "Bob", sub: "대기 중" },
  { key: "c" as const, name: "Carol", sub: "대기 중" },
  { key: "d" as const, name: "Dan", sub: "대기 중" },
];

function Step61Mobile({ question = MOCK_QUESTION_Q1, onStart }: Step61Props) {
  const [speaker, setSpeaker] = useState<string | null>(null);
  const members = STEP61_MEMBERS;

  return (
    <HfPhone>
      <HfStatusBar />
      <HfHeader
        title={`Q${question.num} · 누가 먼저?`}
        sub={`음악 콤보 · ${question.num}/${question.total} 질문`}
        onBack={goHome}
      />

      <HfBody padding="20px">
        {/* 질문 카드 */}
        <HfCard
          padding={16}
          style={{
            marginBottom: 16,
            background: "var(--bp-surface-2)",
            boxShadow: "none",
          }}
        >
          <SectionH>이번 질문</SectionH>
          <p
            className="t-body"
            style={{ margin: 0, lineHeight: 1.6, color: "var(--bp-ink)" }}
          >
            {question.english}
          </p>
        </HfCard>

        {/* 안내 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <span className="t-h3">먼저 답변할 사람</span>
          <span className="t-xs ink-3">먼저 누른 사람이 답변해요</span>
        </div>

        {/* 멤버 카드들 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {members.map((m) => {
            const isMe = m.sub === "나";
            const selected = speaker === m.key;
            return (
              <div
                key={m.key}
                onClick={() => isMe && setSpeaker(m.key)}
                style={{
                  padding: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  cursor: isMe ? "pointer" : "default",
                  borderRadius: "var(--bp-radius)",
                  border: selected
                    ? "1.5px solid var(--bp-tc)"
                    : "1.5px solid transparent",
                  background: selected ? "var(--bp-tc-tint)" : "var(--bp-surface)",
                  boxShadow: selected
                    ? "0 0 0 4px rgba(201,100,66,0.08)"
                    : "var(--bp-shadow-sm)",
                }}
              >
                <MbDot color={m.key} initial={m.name[0]} live size={36} fontSize={13} />
                <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
                  <span className="t-sm" style={{ fontWeight: 600 }}>
                    {m.name}
                  </span>
                  <span className="t-xs ink-3">{m.sub}</span>
                </div>
                {isMe && !selected && (
                  <HfButton variant="tc" size="sm">
                    내가 답변
                  </HfButton>
                )}
                {selected && (
                  <span
                    style={{ color: "var(--bp-tc)", fontWeight: 600, fontSize: 13 }}
                  >
                    ✓ 선택됨
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* 코치 안내 */}
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
            한 명이 답변하는 동안 나머지는 들으면서 표현을 메모해두세요.
          </p>
        </HfCard>
      </HfBody>

      <HfFooter>
        <HfButton
          variant="primary"
          size="lg"
          full
          disabled={!speaker}
          onClick={() => speaker && onStart?.(speaker)}
        >
          {speaker ? "답변 시작 →" : "답변자를 선택해주세요"}
        </HfButton>
      </HfFooter>
    </HfPhone>
  );
}

interface Step61PcProps extends Step61Props {
  /** 실데이터 — 그룹명 + 토픽명 (없으면 mock 사용) */
  groupName?: string;
  topicLabel?: string;
  /** 실데이터 — 멤버 list (없으면 mock 4명 사용) */
  realMembers?: Array<{
    key: "a" | "b" | "c" | "d";
    name: string;
    isMe: boolean;
    userId?: string;
  }>;
  /** 실데이터 질문 텍스트 (없으면 mock 사용) */
  questionText?: string;
}

export function Step61Pc({
  question = MOCK_QUESTION_Q1,
  onStart,
  groupName = "5월 오픽 AL 스터디",
  topicLabel = "음악 콤보",
  realMembers,
  questionText,
}: Step61PcProps) {
  const [speaker, setSpeaker] = useState<string | null>(null);
  const ctx = useSessionFrame();

  // 실데이터 우선, 없으면 mock
  const members = realMembers && realMembers.length > 0
    ? realMembers.map((m) => {
        const isOnline =
          (m.userId && ctx?.onlineUserIds.has(m.userId)) || m.isMe;
        return {
          key: m.key,
          name: m.name,
          sub: m.isMe ? "나" : isOnline ? "입장 중" : "미입장",
          isOnline,
          isMe: m.isMe,
        };
      })
    : STEP61_MEMBERS.map((m) => ({ ...m, isOnline: true, isMe: false }));

  const displayQuestion = questionText ?? question.english;

  return (
    <PcStepShell
      crumb={[groupName, topicLabel, `Q${question.num} · 누가 먼저?`]}
    >
      <div className="bp-pc-content" style={{ padding: "32px 64px" }}>
        {/* 질문 카드 */}
        <HfCard
          padding={20}
          style={{
            marginBottom: 24,
            background: "var(--bp-surface-2)",
            boxShadow: "none",
          }}
        >
          <SectionH>이번 질문 · Q{question.num}</SectionH>
          <p
            className="t-h2"
            style={{ margin: 0, lineHeight: 1.5, fontWeight: 500 }}
          >
            {displayQuestion}
          </p>
        </HfCard>

        {/* 안내 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <span className="t-h2">먼저 답변할 사람</span>
          <span className="t-sm ink-3">먼저 누른 사람이 답변해요</span>
        </div>

        {/* 멤버 수 동적 그리드 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(Math.max(members.length, 1), 4)}, minmax(0, 1fr))`,
            gap: 14,
          }}
        >
          {members.map((m) => {
            const isMe = m.sub === "나";
            const selected = speaker === m.key;
            const interactive = isMe && m.isOnline;
            return (
              <HfCard
                key={m.key}
                onClick={interactive ? () => setSpeaker(m.key) : undefined}
                onKeyDown={
                  interactive ? onCardKey(() => setSpeaker(m.key)) : undefined
                }
                role={interactive ? "button" : undefined}
                tabIndex={interactive ? 0 : undefined}
                aria-pressed={interactive ? selected : undefined}
                aria-disabled={!interactive ? true : undefined}
                aria-label={
                  interactive
                    ? `내가 먼저 답변하기${selected ? " (선택됨)" : ""}`
                    : `${m.name} — ${m.sub}`
                }
                padding={20}
                style={{
                  cursor: interactive ? "pointer" : "default",
                  textAlign: "center",
                  border: selected
                    ? "1.5px solid var(--bp-tc)"
                    : "1.5px solid transparent",
                  background: selected
                    ? "var(--bp-tc-tint)"
                    : "var(--bp-surface)",
                  boxShadow: selected
                    ? "0 0 0 4px rgba(201,100,66,0.08)"
                    : "var(--bp-shadow-sm)",
                  transition:
                    "border-color 0.15s, background 0.15s, box-shadow 0.15s, opacity 0.15s",
                  opacity: m.isOnline ? 1 : 0.65,
                }}
              >
                <MbDot
                  color={m.key}
                  initial={m.name[0]}
                  live={m.isOnline}
                  dim={!m.isOnline}
                  size={56}
                  fontSize={22}
                  style={{ margin: "0 auto 12px", display: "flex" }}
                />
                <div className="t-h3" style={{ marginBottom: 4 }}>
                  {m.name}
                </div>
                <span className="t-xs ink-3">{m.sub}</span>
                {isMe && !selected && m.isOnline && (
                  <HfButton
                    variant="tc"
                    size="sm"
                    style={{ marginTop: 12, width: "100%" }}
                    tabIndex={-1}
                  >
                    내가 답변
                  </HfButton>
                )}
                {selected && (
                  <div
                    aria-hidden="true"
                    style={{
                      color: "var(--bp-tc)",
                      fontWeight: 600,
                      fontSize: 13,
                      marginTop: 12,
                    }}
                  >
                    ✓ 선택됨
                  </div>
                )}
              </HfCard>
            );
          })}
        </div>

        {/* 코치 안내 + 시작 버튼 */}
        <HfCard
          padding={14}
          style={{
            marginTop: 20,
            display: "flex",
            gap: 12,
            alignItems: "center",
            background: "var(--bp-surface-2)",
            boxShadow: "none",
          }}
        >
          <CoachAvatar size="sm" />
          <p
            className="t-sm"
            style={{
              margin: 0,
              color: "var(--bp-ink-2)",
              flex: 1,
              lineHeight: 1.55,
            }}
          >
            한 명이 답변하는 동안 나머지는 들으면서 표현을 메모해두세요.
          </p>
          <HfButton
            variant="primary"
            disabled={!speaker}
            style={{ minWidth: 160, opacity: speaker ? 1 : 0.4 }}
            onClick={() => speaker && onStart?.(speaker)}
          >
            {speaker ? "답변 시작 →" : "대기 중"}
          </HfButton>
        </HfCard>
      </div>
    </PcStepShell>
  );
}

// ============================================================
// Step 6-2 (Self) · 답변 녹음 (본인)
// ============================================================

interface Step62SelfProps {
  question?: typeof MOCK_QUESTION_Q1;
  duration?: string;
  onRetry?: () => void;
  onComplete?: () => void;
}

/** Step 6-2 (Self) — 모바일/PC 분기 wrapper */
export function Step62Self(props: Step62SelfProps) {
  return (
    <>
      <div className="bp-only-mobile" style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <Step62SelfMobile {...props} />
      </div>
      <div className="bp-only-pc" style={{ flex: 1, minHeight: 0 }}>
        <Step62Pc question={props.question} duration={props.duration} speakerKey="a" speakerName="나" />
      </div>
    </>
  );
}

function Step62SelfMobile({
  question = MOCK_QUESTION_Q1,
  duration = "0:23",
  onRetry,
  onComplete,
}: Step62SelfProps) {
  return (
    <HfPhone>
      <HfStatusBar />
      <HfHeader
        title={`Q${question.num} · 답변 중`}
        sub="당신이 답변할 차례예요"
        onBack={goHome}
        right={
          <span
            className="bp-pill"
            style={{
              background: "rgba(201,100,66,0.12)",
              color: "var(--bp-tc)",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                background: "var(--bp-tc)",
                borderRadius: "50%",
                display: "inline-block",
                animation: "bp-pulse 1.2s infinite",
              }}
            />
            녹음 중
          </span>
        }
      />

      <HfBody padding="24px 20px">
        {/* 질문 카드 */}
        <HfCard padding={18} style={{ marginBottom: 20 }}>
          <SectionH>질문</SectionH>
          <p className="t-body" style={{ margin: 0, lineHeight: 1.6 }}>
            {question.englishLong}
          </p>
        </HfCard>

        {/* 타이머 + 웨이브 */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 24,
          }}
        >
          {/* Big timer */}
          <div
            className="t-num"
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: "var(--bp-ink)",
              letterSpacing: "-0.02em",
            }}
          >
            {duration}
          </div>

          {/* Live wave */}
          <HfWave bars={32} height={56} amplitude={44} color="tc" gap={3} />

          <span className="t-sm ink-3">권장 답변 길이 · 40~60초</span>
        </div>

        {/* 액션 */}
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <HfButton variant="secondary" style={{ flex: 1 }} onClick={onRetry}>
            다시 시작
          </HfButton>
          <HfButton variant="primary" style={{ flex: 2 }} onClick={onComplete}>
            답변 완료 →
          </HfButton>
        </div>
      </HfBody>
    </HfPhone>
  );
}

// ============================================================
// Step 6-2 (Other) · 답변 청취 + 메모 (타인)
// ============================================================

interface Step62OtherProps {
  question?: typeof MOCK_QUESTION_Q1;
  speakerName?: string;
  speakerKey?: "a" | "b" | "c" | "d";
  duration?: string;
  defaultNote?: string;
  /** 실데이터 — 멤버 list (없으면 mock 3명) */
  realMembers?: Array<{ key: "a" | "b" | "c" | "d"; name: string; userId: string }>;
  /** 실데이터 — 본인 user_id (입장 판정 시 본인은 항상 online 처리) */
  currentUserId?: string;
  /** 실데이터 — 그룹명/토픽명/질문 텍스트 (PC crumb 용) */
  groupName?: string;
  topicLabel?: string;
  questionText?: string;
}

/** Step 6-2 (Other) — 모바일/PC 분기 wrapper */
export function Step62Other(props: Step62OtherProps) {
  return (
    <>
      <div className="bp-only-mobile" style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <Step62OtherMobile {...props} />
      </div>
      <div className="bp-only-pc" style={{ flex: 1, minHeight: 0 }}>
        <Step62Pc
          question={props.question}
          duration={props.duration}
          speakerKey={props.speakerKey ?? "a"}
          speakerName={props.speakerName ?? "Alice"}
          defaultNote={props.defaultNote}
          realMembers={props.realMembers}
          currentUserId={props.currentUserId}
          groupName={props.groupName}
          topicLabel={props.topicLabel}
          questionText={props.questionText}
        />
      </div>
    </>
  );
}

function Step62OtherMobile({
  question = MOCK_QUESTION_Q1,
  speakerName = "Alice",
  speakerKey = "a",
  duration = "0:23",
  defaultNote = MOCK_NOTE_DEFAULT,
  realMembers,
  currentUserId,
}: Step62OtherProps) {
  const ctx = useSessionFrame();
  // 발화자 외 listening 멤버 (본인 포함)
  const listenMembers = realMembers
    ? realMembers
        .filter((m) => m.key !== speakerKey)
        .map((m) => {
          const isMe = !!currentUserId && m.userId === currentUserId;
          const isOnline = isMe || (ctx?.onlineUserIds.has(m.userId) ?? false);
          return {
            color: m.key,
            initial: m.name[0] ?? "?",
            live: isOnline,
            dim: !isOnline,
          };
        })
    : null;
  return (
    <HfPhone>
      <HfStatusBar />
      <HfHeader
        title={`Q${question.num} · 듣는 중`}
        sub={`${speakerName}의 답변`}
        onBack={goHome}
      />

      <HfBody padding="20px">
        {/* 질문 (작게) */}
        <HfCard
          padding={14}
          style={{
            marginBottom: 16,
            background: "var(--bp-surface-2)",
            boxShadow: "none",
          }}
        >
          <p
            className="t-sm"
            style={{ margin: 0, lineHeight: 1.55, color: "var(--bp-ink-2)" }}
          >
            {question.english}
          </p>
        </HfCard>

        {/* 발화자 hero */}
        <HfCard
          variant="lift"
          padding={24}
          style={{ textAlign: "center", marginBottom: 16 }}
        >
          <MbDot
            color={speakerKey}
            initial={speakerName[0]}
            live
            size={64}
            fontSize={24}
            style={{ margin: "0 auto", display: "flex" }}
          />
          <div className="t-h2" style={{ marginTop: 12 }}>
            {speakerName}
          </div>
          <span
            className="bp-pill"
            style={{
              marginTop: 6,
              background: "rgba(201,100,66,0.12)",
              color: "var(--bp-tc)",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                background: "var(--bp-tc)",
                borderRadius: "50%",
                display: "inline-block",
              }}
            />
            답변 중
          </span>

          <HfWave
            bars={28}
            height={36}
            amplitude={28}
            color="tc"
            style={{ marginTop: 18, justifyContent: "center" }}
          />
          <div className="t-num t-xs ink-3" style={{ marginTop: 10 }}>
            {duration}
          </div>
        </HfCard>

        {/* 메모장 */}
        <HfCard padding={14}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <SectionH style={{ marginBottom: 0 }}>메모</SectionH>
            <span className="t-xs ink-3">나만 보여요</span>
          </div>
          <textarea
            placeholder="좋은 표현이 들리면 적어두세요…"
            defaultValue={defaultNote}
            style={{
              width: "100%",
              minHeight: 80,
              border: "none",
              outline: "none",
              fontFamily: "var(--bp-font)",
              fontSize: 13,
              lineHeight: 1.55,
              background: "transparent",
              color: "var(--bp-ink)",
              resize: "none",
            }}
          />
        </HfCard>

        {/* 다른 멤버 듣는 중 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 16,
            padding: "0 4px",
          }}
        >
          <span className="t-xs ink-3" style={{ flexShrink: 0 }}>
            듣는 중
          </span>
          <MbStack
            members={
              listenMembers && listenMembers.length > 0
                ? listenMembers
                : [
                    { color: "b", initial: "B", live: true },
                    { color: "c", initial: "C", live: true },
                    { color: "d", initial: "D", live: true },
                  ]
            }
          />
        </div>
      </HfBody>
    </HfPhone>
  );
}

// ============================================================
// Step 6-2 PC — 4 화상 타일 + 메모 사이드 (Self/Other 공통)
// ============================================================

interface Step62PcProps {
  question?: typeof MOCK_QUESTION_Q1;
  duration?: string;
  speakerKey: "a" | "b" | "c" | "d";
  speakerName: string;
  defaultNote?: string;
  /** 실데이터 — 그룹명/토픽명 (없으면 mock) */
  groupName?: string;
  topicLabel?: string;
  /** 실데이터 — 멤버 list (없으면 mock 4명). userId 있으면 dim 판정 */
  realMembers?: Array<{
    key: "a" | "b" | "c" | "d";
    name: string;
    userId?: string;
  }>;
  /** 실데이터 — 본인 user_id (입장 판정 시 본인은 항상 online 처리) */
  currentUserId?: string;
  /** 실데이터 질문 텍스트 */
  questionText?: string;
  /** 본인이 발화자일 때 — "건너뛰기" 콜백 */
  onSkip?: () => void;
}

const STEP62_PC_MEMBERS: Array<{
  key: "a" | "b" | "c" | "d";
  name: string;
  userId?: string;
}> = [
  { key: "a", name: "Alice" },
  { key: "b", name: "Bob" },
  { key: "c", name: "Carol" },
  { key: "d", name: "Dan" },
];

export function Step62Pc({
  question = MOCK_QUESTION_Q1,
  duration = "0:23",
  speakerKey,
  speakerName,
  defaultNote = MOCK_NOTE_DEFAULT,
  groupName = "5월 오픽 AL 스터디",
  topicLabel = "음악 콤보",
  realMembers,
  currentUserId,
  questionText,
  onSkip,
}: Step62PcProps) {
  const ctx = useSessionFrame();
  const members = realMembers && realMembers.length > 0 ? realMembers : STEP62_PC_MEMBERS;
  const displayQuestion = questionText ?? question.english;
  return (
    <PcStepShell
      crumb={[
        groupName,
        topicLabel,
        `Q${question.num} · 답변 중`,
      ]}
      right={
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 12px",
              borderRadius: 999,
              background: "rgba(201,100,66,0.12)",
              color: "var(--bp-tc)",
              fontWeight: 600,
              fontSize: 12,
            }}
            aria-live="polite"
          >
            <span
              aria-hidden="true"
              style={{
                width: 7,
                height: 7,
                background: "var(--bp-tc)",
                borderRadius: "50%",
                animation: "bp-pulse 1.4s ease-in-out infinite",
              }}
            />
            녹음 중
            <span
              style={{
                fontVariantNumeric: "tabular-nums",
                marginLeft: 2,
              }}
            >
              {duration}
            </span>
          </span>
          {onSkip && (
            <button
              onClick={onSkip}
              aria-label="이번 답변 건너뛰기"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: 600,
                background: "transparent",
                border: "1px solid var(--bp-line-strong)",
                color: "var(--bp-ink-2)",
                borderRadius: 999,
                cursor: "pointer",
              }}
            >
              <SkipForward size={13} strokeWidth={1.8} aria-hidden="true" />
              건너뛰기
            </button>
          )}
        </div>
      }
    >
      <div
        className="bp-pc-content"
        style={{
          padding: "20px 24px",
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: 16,
          overflow: "hidden",
        }}
      >
        {/* MAIN — 질문 + 동적 타일 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            overflow: "hidden",
          }}
        >
          <HfCard
            padding={14}
            style={{
              background: "var(--bp-surface-2)",
              boxShadow: "none",
            }}
          >
            <SectionH>Q{question.num}</SectionH>
            <p
              className="t-body"
              style={{ margin: 0, lineHeight: 1.5 }}
            >
              {displayQuestion}
            </p>
          </HfCard>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                members.length === 1
                  ? "1fr"
                  : members.length === 4
                    ? "1fr 1fr"
                    : `repeat(${members.length}, minmax(0, 1fr))`,
              gridTemplateRows:
                members.length === 4 ? "1fr 1fr" : undefined,
              gap: 10,
              flex: 1,
            }}
          >
            {members.map((m) => {
              const speaking = m.key === speakerKey;
              const displayName = speaking ? speakerName : m.name;
              // userId 있을 때만 입장 판정 (본인은 항상 online). userId 없으면 mock 처리 — 항상 online
              const isOnline = m.userId
                ? m.userId === currentUserId ||
                  (ctx?.onlineUserIds.has(m.userId) ?? false)
                : true;
              // 발화자 X + 미입장 = dim
              const dim = !speaking && !isOnline;
              return (
                <HfCard
                  key={m.key}
                  padding={0}
                  style={{
                    overflow: "hidden",
                    position: "relative",
                    border: speaking
                      ? "2px solid var(--bp-tc)"
                      : "1px solid var(--bp-line)",
                    background: speaking
                      ? "var(--bp-tc-tint)"
                      : "var(--bp-surface-2)",
                    minHeight: 200,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: speaking ? 16 : 10,
                    padding: "28px 18px 48px",
                    opacity: speaking ? 1 : isOnline ? 1 : 0.6,
                  }}
                >
                  {speaking ? (
                    <>
                      {/* 발화자 — dot + 큰 시간 + 큰 웨이브 */}
                      <MbDot
                        color={m.key}
                        initial={displayName[0]}
                        live
                        size={68}
                        fontSize={26}
                      />
                      <div
                        style={{
                          fontSize: 28,
                          fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                          color: "var(--bp-tc)",
                          letterSpacing: "-0.02em",
                          lineHeight: 1,
                        }}
                      >
                        {duration}
                      </div>
                      <HfWave
                        bars={36}
                        height={32}
                        amplitude={26}
                        color="tc"
                        style={{ width: "100%", justifyContent: "center" }}
                      />
                    </>
                  ) : (
                    <>
                      {/* 청취자 — dot + 듣는 중 라벨 */}
                      <MbDot
                        color={m.key}
                        initial={displayName[0]}
                        live={isOnline}
                        dim={dim}
                        size={56}
                        fontSize={22}
                      />
                      {isOnline && (
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 11,
                            color: "var(--bp-ink-3)",
                            fontWeight: 500,
                          }}
                        >
                          <Headphones
                            size={13}
                            strokeWidth={1.6}
                            aria-hidden="true"
                          />
                          듣는 중
                        </div>
                      )}
                    </>
                  )}
                  {/* 하단 라벨 */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: 10,
                      left: 14,
                      right: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <span
                      className="t-sm"
                      style={{
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        minWidth: 0,
                      }}
                    >
                      {displayName}
                    </span>
                    {speaking && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: "var(--bp-tc)",
                          color: "white",
                          fontSize: 10,
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        <Mic size={10} strokeWidth={2} aria-hidden="true" />
                        답변 중
                      </span>
                    )}
                    {!speaking && !isOnline && (
                      <span
                        className="t-xs ink-3"
                        style={{ fontSize: 10, flexShrink: 0 }}
                      >
                        미입장
                      </span>
                    )}
                  </div>
                </HfCard>
              );
            })}
          </div>
        </div>

        {/* SIDE — 메모 */}
        <HfCard
          padding={18}
          style={{
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <SectionH style={{ marginBottom: 0 }}>메모</SectionH>
            <span className="t-xs ink-3">나만 보여요</span>
          </div>
          <textarea
            placeholder="좋은 표현이 들리면 적어두세요…"
            defaultValue={defaultNote}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontFamily: "var(--bp-font)",
              fontSize: 13,
              lineHeight: 1.6,
              background: "transparent",
              color: "var(--bp-ink)",
              resize: "none",
              padding: 0,
              minHeight: 200,
            }}
          />
          <HfCard
            padding={12}
            style={{
              marginTop: 12,
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
              마음에 드는 표현 메모해두면 다음에 활용할 수 있어요.
            </p>
          </HfCard>
        </HfCard>
      </div>
    </PcStepShell>
  );
}

// ============================================================
// Step 6-3 · AI 코칭 생성 중
// ============================================================

interface Step63Props {
  steps?: ProcessStep[];
  estimatedSec?: number;
  /** 실데이터 — crumb */
  groupName?: string;
  topicLabel?: string;
  questionLabel?: string;
  /** "N명의 답변" 동적 */
  memberCount?: number;
}

/** Step 6-3 — 모바일/PC 분기 wrapper */
export function Step63(props: Step63Props) {
  return (
    <>
      <div className="bp-only-mobile" style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <Step63Mobile {...props} />
      </div>
      <div className="bp-only-pc" style={{ flex: 1, minHeight: 0 }}>
        <Step63Pc {...props} />
      </div>
    </>
  );
}

function Step63Mobile({
  steps = MOCK_PROCESS_STEPS,
  estimatedSec = 8,
}: Step63Props) {
  return (
    <HfPhone>
      <HfStatusBar />
      <HfHeader
        title="Q1 · 코치가 듣는 중"
        sub="잠시만요"
        onBack={goHome}
        right={null}
      />

      <HfBody padding="24px 20px">
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
          }}
        >
          {/* Animated avatar */}
          <div style={{ position: "relative" }}>
            <CoachAvatar size="xl" />
            <div
              className="bp-pulse-ring"
              style={{
                position: "absolute",
                inset: -8,
                borderRadius: "50%",
                border: "2px solid var(--bp-tc)",
                opacity: 0.3,
              }}
            />
            <div
              className="bp-pulse-ring"
              style={{
                position: "absolute",
                inset: -16,
                borderRadius: "50%",
                border: "1px solid var(--bp-tc)",
                opacity: 0.15,
                animationDelay: "0.4s",
              }}
            />
          </div>

          <div style={{ textAlign: "center", maxWidth: 280 }}>
            <div className="t-h1" style={{ marginBottom: 6 }}>
              코치가 듣고 있어요
            </div>
            <p className="t-sm ink-3" style={{ margin: 0, lineHeight: 1.55 }}>
              4명의 답변을 함께 살펴보고 있어요.
              <br />
              잠시만 기다려주세요.
            </p>
          </div>

          {/* Progress steps */}
          <HfCard padding={16} style={{ width: "100%", marginTop: 10 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {steps.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background:
                        s.state === "done"
                          ? "var(--bp-good)"
                          : s.state === "doing"
                          ? "var(--bp-tc)"
                          : "var(--bp-line-strong)",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    {s.state === "done" ? "✓" : ""}
                  </span>
                  <span
                    className="t-sm"
                    style={{
                      color: s.state === "wait" ? "var(--bp-ink-3)" : "var(--bp-ink)",
                      fontWeight: s.state === "doing" ? 600 : 400,
                    }}
                  >
                    {s.label}
                  </span>
                  {s.state === "doing" && (
                    <div style={{ display: "flex", gap: 3, marginLeft: "auto" }}>
                      <span
                        className="bp-bounce-dot"
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: "50%",
                          background: "var(--bp-tc)",
                        }}
                      />
                      <span
                        className="bp-bounce-dot"
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: "50%",
                          background: "var(--bp-tc)",
                          animationDelay: "0.2s",
                        }}
                      />
                      <span
                        className="bp-bounce-dot"
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: "50%",
                          background: "var(--bp-tc)",
                          animationDelay: "0.4s",
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </HfCard>

          <div className="t-xs ink-3" style={{ marginTop: 10 }}>
            약 {estimatedSec}초 소요
          </div>
        </div>
      </HfBody>
    </HfPhone>
  );
}

export function Step63Pc({
  steps = MOCK_PROCESS_STEPS,
  estimatedSec = 8,
  groupName = "5월 오픽 AL 스터디",
  topicLabel = "음악 콤보",
  questionLabel = "Q1 · 코치가 듣는 중",
  memberCount = 4,
}: Step63Props) {
  // 진행률 계산 — done/total
  const totalSteps = steps.length;
  const doneSteps = steps.filter((s) => s.state === "done").length;
  const progressPct = totalSteps > 0 ? (doneSteps / totalSteps) * 100 : 0;

  return (
    <PcStepShell crumb={[groupName, topicLabel, questionLabel]} right={null}>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          padding: "48px 64px",
          maxWidth: 720,
          margin: "0 auto",
        }}
      >
        {/* Animated avatar — 펄스 + 큰 페르소나 */}
        <div style={{ position: "relative" }} aria-hidden="true">
          <CoachAvatar size="xl" />
          <div
            className="bp-pulse-ring"
            style={{
              position: "absolute",
              inset: -12,
              borderRadius: "50%",
              border: "2px solid var(--bp-tc)",
              opacity: 0.3,
            }}
          />
          <div
            className="bp-pulse-ring"
            style={{
              position: "absolute",
              inset: -24,
              borderRadius: "50%",
              border: "1px solid var(--bp-tc)",
              opacity: 0.15,
              animationDelay: "0.4s",
            }}
          />
        </div>

        <div
          style={{ textAlign: "center", maxWidth: 480 }}
          aria-live="polite"
        >
          <div
            className="t-display"
            style={{ marginBottom: 8, textWrap: "balance" as const }}
          >
            코치가 듣고 있어요
          </div>
          <p
            className="t-body ink-3"
            style={{ margin: 0, lineHeight: 1.6, textWrap: "pretty" as const }}
          >
            {memberCount}명의 답변을 함께 살펴보고 있어요. 잠시만 기다려주세요.
          </p>
        </div>

        {/* 진행률 바 — countdown 시각화 */}
        <div
          style={{
            width: "100%",
            maxWidth: 480,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div
            style={{
              height: 4,
              borderRadius: 999,
              background: "var(--bp-line)",
              overflow: "hidden",
            }}
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="코칭 생성 진행률"
          >
            <div
              style={{
                width: `${progressPct}%`,
                height: "100%",
                background:
                  "linear-gradient(90deg, var(--bp-tc) 0%, var(--bp-tip, var(--bp-tc)) 100%)",
                transition: "width 0.4s ease",
              }}
            />
          </div>

          {/* Progress steps */}
          <HfCard padding={20} style={{ width: "100%" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {steps.map((s, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background:
                        s.state === "done"
                          ? "var(--bp-good)"
                          : s.state === "doing"
                            ? "var(--bp-tc)"
                            : "var(--bp-line-strong)",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {s.state === "done" ? "✓" : ""}
                  </span>
                  <span
                    className="t-body"
                    style={{
                      color:
                        s.state === "wait"
                          ? "var(--bp-ink-3)"
                          : "var(--bp-ink)",
                      fontWeight: s.state === "doing" ? 600 : 500,
                    }}
                  >
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </HfCard>
        </div>

        <div
          className="t-sm ink-3"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          약 {estimatedSec}초 소요
        </div>
      </div>
    </PcStepShell>
  );
}

// 미사용 import
void Pill;
void Sparkles;
void X;
