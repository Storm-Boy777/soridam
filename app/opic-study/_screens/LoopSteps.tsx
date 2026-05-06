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
  AlertCircle,
  RefreshCw,
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
  PcStepBar,
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

interface Step61PcProps extends Step61Props {
  /** 실데이터 — 그룹명 + 토픽명 (PC ImmersiveHeader가 처리) */
  groupName?: string;
  topicLabel?: string;
  /** 실데이터 — 멤버 list */
  realMembers?: Array<{
    key: "a" | "b" | "c" | "d";
    name: string;
    isMe: boolean;
    userId?: string;
  }>;
  /** 실데이터 질문 텍스트 */
  questionText?: string;
}

/** Step 6-1 — 발화자 선정 (단일 컴포넌트, PC 우선 + 반응형) */
export function Step61({
  question,
  onStart,
  realMembers,
  questionText,
}: Step61PcProps) {
  const [speaker, setSpeaker] = useState<string | null>(null);
  const ctx = useSessionFrame();

  // 실데이터 — 입장 멤버만 표시 (미입장 멤버는 답변 불가능 → 숨김)
  const members = (realMembers ?? [])
    .map((m) => {
      const isOnline =
        (m.userId && ctx?.onlineUserIds.has(m.userId)) || m.isMe;
      return {
        key: m.key,
        userId: m.userId,
        name: m.name,
        sub: m.isMe ? "나" : "입장 중",
        isOnline,
        isMe: m.isMe,
      };
    })
    .filter((m) => m.isOnline);

  const displayQuestion = questionText ?? "";
  const memberCols = Math.min(Math.max(members.length, 1), 4);

  return (
    <div className="bp-scope bp-shell">
      <PcStepBar now={5} total={6} />

      <div className="bp-shell-content">
        {/* 질문 카드 */}
        <HfCard
          padding={20}
          style={{
            marginBottom: 20,
            background: "var(--bp-surface-2)",
            boxShadow: "none",
          }}
        >
          <SectionH>
            이번 질문{question?.num ? ` · Q${question.num}` : ""}
          </SectionH>
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
            flexWrap: "wrap",
            gap: 4,
          }}
        >
          <span className="t-h2">먼저 답변할 사람</span>
          <span className="t-sm ink-3">먼저 누른 사람이 답변해요</span>
        </div>

        {/* 멤버 그리드 — 모바일 1열, PC 동적 (--member-cols) */}
        <div
          className="bp-grid-members"
          style={{ "--member-cols": memberCols } as React.CSSProperties}
        >
          {members.map((m, idx) => {
            const isMe = m.isMe;
            const selected = speaker === m.key;
            const interactive = isMe && m.isOnline;
            return (
              <HfCard
                key={m.userId ?? `${m.key}-${idx}`}
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

        {/* 코치 안내 */}
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
            한 명이 답변하는 동안 나머지는 함께 들어요.
          </p>
        </HfCard>
      </div>

      <div className="bp-shell-actions">
        <div className="bp-shell-actions-inner">
          <HfButton
            variant="primary"
            size="lg"
            disabled={!speaker}
            onClick={() => speaker && onStart?.(speaker)}
            style={{ minWidth: 200 }}
          >
            {speaker ? "답변 시작 →" : "답변자를 선택해주세요"}
          </HfButton>
        </div>
      </div>
    </div>
  );
}

/** @deprecated Step61 단일 컴포넌트 사용 — 호환용 alias */
export const Step61Pc = Step61;


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
  /** 본인이 발화자일 때 — "답변 완료" 콜백 (Self 시점 시 우측 컬럼 큰 버튼 표시) */
  onComplete?: () => void;
  /** 답변 제출 중 (버튼 disabled + 라벨 변경) */
  submitting?: boolean;
  /** 본인이 발화자인지 — true면 헤더 "내 답변 녹음 중", false면 "{speakerName} 답변 중" */
  isSelf?: boolean;
  /** 마이크 권한 등 녹음 에러 — Self 시점에 inline 안내 + 다시 시도 버튼 표시 */
  recorderError?: string | null;
  /** 권한 거부 시 다시 시도 콜백 */
  onRetry?: () => void;
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

/**
 * Step 6-2 — 답변 녹음/청취 (재설계 v2)
 *
 * 디자인 원칙 (모의고사 + Discord/Slack BM):
 * - 발화자 = 메인 시각 (큰 카드 풀폭, 큰 아바타+ring+시간+wave)
 * - 청취자 = 보조 압축 행 (가로 dot + 이름)
 * - 메모 = 사이드 (PC) / stack 하단 (모바일)
 * - 본인 발화 시 footer = 큰 CTA (다시 시작 + 답변 완료)
 */
export function Step62({
  question,
  duration = "0:00",
  speakerKey,
  speakerName,
  defaultNote = "",
  realMembers,
  currentUserId,
  questionText,
  onSkip,
  onComplete,
  submitting = false,
  isSelf,
  recorderError,
  onRetry,
}: Step62PcProps) {
  const selfMode = isSelf ?? !!onComplete;
  const showError = selfMode && !!recorderError;
  const ctx = useSessionFrame();
  const members = realMembers ?? [];
  const displayQuestion = questionText ?? question?.english ?? "";

  // 발화자 / 청취자 분리 — 청취자는 입장 멤버만 표시 (Step61과 일관)
  const speaker = members.find((m) => m.key === speakerKey);
  const listeners = members.filter((m) => m.key !== speakerKey);
  const onlineListeners = listeners.filter((m) => {
    if (!m.userId) return false; // 실데이터 없으면 제외
    return m.userId === currentUserId || (ctx?.onlineUserIds.has(m.userId) ?? false);
  });
  const displayName = selfMode ? "나" : speakerName ?? speaker?.name ?? "발화자";
  const speakerColor = speaker?.key ?? speakerKey ?? "a";

  return (
    <div className="bp-scope bp-shell">
      <PcStepBar now={5} total={6} />

      <div
        className="bp-shell-content"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          overflow: "hidden",
        }}
      >
        {/* 질문 카드 (압축) */}
        <HfCard
          padding={14}
          style={{
            background: "var(--bp-surface-2)",
            boxShadow: "none",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 6,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                display: "inline-block",
                padding: "2px 10px",
                borderRadius: 999,
                background: "var(--bp-tc)",
                color: "white",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              Q{question?.num ?? "?"}
            </span>
            {question?.type && (
              <span
                className="t-xs ink-3"
                style={{ fontWeight: 600 }}
              >
                {question.type}
              </span>
            )}
            {question?.num && question?.total && (
              <span
                className="t-xs ink-3"
                style={{ marginLeft: "auto" }}
              >
                {question.num} / {question.total}
              </span>
            )}
          </div>
          <p
            className="t-body"
            style={{ margin: 0, lineHeight: 1.55, color: "var(--bp-ink)" }}
          >
            {displayQuestion}
          </p>
        </HfCard>

        {/* 메인 영역 — 발화자 메인 + 청취자 행 (단일 컬럼, 메모 제거) */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              minHeight: 0,
              minWidth: 0,
              flex: 1,
            }}
          >
            {/* 발화자 메인 카드 — 큰 시각 위계 */}
            <HfCard
              padding={0}
              style={{
                position: "relative",
                flex: 1,
                minHeight: 280,
                background:
                  "linear-gradient(140deg, var(--bp-tc-tint) 0%, var(--bp-surface) 100%)",
                border: "2px solid var(--bp-tc)",
                borderRadius: "var(--bp-radius-lg)",
                boxShadow: "var(--bp-shadow)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 18,
                padding: "32px 24px",
                overflow: "hidden",
              }}
            >
              {/* 좌상단 라벨 */}
              <span
                className="t-xs"
                style={{
                  position: "absolute",
                  top: 14,
                  left: 16,
                  color: "var(--bp-ink-3)",
                  fontWeight: 600,
                }}
              >
                {selfMode ? "내 답변" : `${displayName}의 답변`}
              </span>

              {/* 우상단 답변 중 배지 */}
              <span
                style={{
                  position: "absolute",
                  top: 14,
                  right: 16,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 11px",
                  borderRadius: 999,
                  background: showError ? "var(--bp-ink-3)" : "var(--bp-tc)",
                  color: "white",
                  fontSize: 11,
                  fontWeight: 600,
                  boxShadow: showError
                    ? "none"
                    : "0 0 0 4px rgba(201,100,66,0.15)",
                }}
              >
                {showError ? (
                  <>
                    <AlertCircle
                      size={11}
                      strokeWidth={2.4}
                      aria-hidden="true"
                    />
                    권한 필요
                  </>
                ) : (
                  <>
                    <span
                      aria-hidden="true"
                      style={{
                        width: 6,
                        height: 6,
                        background: "white",
                        borderRadius: "50%",
                        animation: "bp-pulse 1.2s infinite",
                      }}
                    />
                    답변 중
                  </>
                )}
              </span>

              {/* 큰 아바타 + 펄스 ring */}
              <div
                style={{ position: "relative", flexShrink: 0 }}
                aria-hidden="true"
              >
                <MbDot
                  color={speakerColor}
                  initial={displayName[0]}
                  live={!showError}
                  size={88}
                  fontSize={36}
                />
                {!showError && (
                  <>
                    <div
                      className="bp-pulse-ring"
                      style={{
                        position: "absolute",
                        inset: -8,
                        borderRadius: "50%",
                        border: "2px solid var(--bp-tc)",
                        opacity: 0.4,
                      }}
                    />
                    <div
                      className="bp-pulse-ring"
                      style={{
                        position: "absolute",
                        inset: -16,
                        borderRadius: "50%",
                        border: "1px solid var(--bp-tc)",
                        opacity: 0.18,
                        animationDelay: "0.4s",
                      }}
                    />
                  </>
                )}
              </div>

              {/* 큰 시간 */}
              <div
                style={{
                  fontSize: 56,
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                  color: showError ? "var(--bp-ink-3)" : "var(--bp-tc)",
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                }}
              >
                {showError ? "—" : duration}
              </div>

              {/* 큰 wave */}
              {!showError && (
                <HfWave
                  bars={48}
                  height={48}
                  amplitude={40}
                  color="tc"
                  style={{
                    width: "min(440px, 80%)",
                    justifyContent: "center",
                  }}
                />
              )}

              {/* 발화자 이름 */}
              <span
                className="t-h3"
                style={{
                  fontWeight: 600,
                  color: showError ? "var(--bp-ink-3)" : "var(--bp-ink)",
                  fontStyle: showError ? "italic" : undefined,
                }}
              >
                {displayName}
              </span>

              {/* 권한 거부 inline 안내 */}
              {showError && (
                <p
                  role="alert"
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: "var(--bp-tc)",
                    textAlign: "center",
                    maxWidth: 360,
                    lineHeight: 1.55,
                    fontWeight: 500,
                  }}
                >
                  {recorderError}
                </p>
              )}
            </HfCard>

            {/* 청취자 압축 행 — 입장한 멤버만 (없으면 카드 자체 숨김) */}
            {onlineListeners.length > 0 && (
              <HfCard
                padding={14}
                style={{
                  flexShrink: 0,
                  background: "var(--bp-surface-2)",
                  boxShadow: "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  <Headphones
                    size={14}
                    strokeWidth={1.8}
                    color="var(--bp-ink-3)"
                    aria-hidden="true"
                  />
                  <span
                    className="t-xs ink-3"
                    style={{ fontWeight: 600 }}
                  >
                    청취자 {onlineListeners.length}명
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 14,
                    flexWrap: "wrap",
                  }}
                >
                  {onlineListeners.map((m, idx) => (
                    <div
                      key={m.userId ?? `${m.key}-${idx}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <MbDot
                        color={m.key}
                        initial={m.name[0]}
                        live
                        size={28}
                        fontSize={11}
                      />
                      <span className="t-sm" style={{ fontWeight: 500 }}>
                        {m.name}
                      </span>
                    </div>
                  ))}
                </div>
              </HfCard>
            )}
          </div>
        </div>
      </div>

      {/* footer — 본인 발화 시 큰 CTA */}
      {selfMode && (
        <div className="bp-shell-actions">
          <div className="bp-shell-actions-inner">
            {showError && onRetry ? (
              <>
                <span
                  className="bp-shell-helper"
                  style={{ color: "var(--bp-tc)", fontWeight: 500 }}
                >
                  마이크 권한을 허용한 뒤 다시 시도해주세요
                </span>
                <HfButton
                  variant="primary"
                  size="lg"
                  onClick={onRetry}
                  style={{
                    minWidth: 200,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <RefreshCw
                    size={14}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                  다시 시도
                </HfButton>
              </>
            ) : (
              <>
                <span className="bp-shell-helper">
                  녹음이 끝나면 답변 완료를 눌러주세요
                </span>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexShrink: 0,
                  }}
                >
                  {onSkip && (
                    <HfButton
                      variant="ghost"
                      size="lg"
                      onClick={onSkip}
                      disabled={submitting}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <SkipForward
                        size={13}
                        strokeWidth={1.8}
                        aria-hidden="true"
                      />
                      건너뛰기
                    </HfButton>
                  )}
                  {onComplete && (
                    <HfButton
                      variant="primary"
                      size="lg"
                      onClick={onComplete}
                      disabled={submitting}
                      style={{ minWidth: 220 }}
                    >
                      {submitting ? "제출 중…" : "답변 완료 →"}
                    </HfButton>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** @deprecated Step62 단일 컴포넌트 사용 — 호환용 alias */
export const Step62Pc = Step62;

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
  /** 답변자 멤버 list (dot 행 표시용) */
  answeredMembers?: Array<{
    key: "a" | "b" | "c" | "d";
    initial: string;
    name?: string;
  }>;
}

/** Step 6-3 — 코치가 듣는 중 (단일 컴포넌트, 반응형) */
export function Step63({
  steps = MOCK_PROCESS_STEPS,
  estimatedSec = 8,
  memberCount = 4,
  answeredMembers,
}: Step63Props) {
  // 진행률 계산
  const totalSteps = steps.length;
  const doneSteps = steps.filter((s) => s.state === "done").length;
  const progressPct = totalSteps > 0 ? (doneSteps / totalSteps) * 100 : 0;

  return (
    <div className="bp-scope bp-shell">
      <PcStepBar now={5} total={6} />

      <div
        className="bp-shell-content"
        style={{
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          textAlign: "center",
        }}
      >
        {/* Animated avatar — 펄스 */}
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
          style={{ maxWidth: 480, width: "100%" }}
          aria-live="polite"
        >
          <div
            className="t-h1"
            style={{ marginBottom: 8, textWrap: "balance" as const }}
          >
            코치가 듣고 있어요
          </div>
          <p
            className="t-body ink-3"
            style={{ margin: 0, lineHeight: 1.6 }}
          >
            {memberCount}명의 답변을 함께 살펴보고 있어요. 잠시만 기다려주세요.
          </p>
        </div>

        {/* 답변자 dot 행 — 누가 답변했는지 시각화 */}
        {answeredMembers && answeredMembers.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              flexWrap: "wrap",
              maxWidth: 480,
              width: "100%",
            }}
          >
            {answeredMembers.map((m) => (
              <div
                key={m.key}
                style={{
                  display: "inline-flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <MbDot
                  color={m.key}
                  initial={m.initial}
                  live
                  size={36}
                  fontSize={14}
                />
                {m.name && (
                  <span
                    className="t-xs ink-3"
                    style={{ fontSize: 10, fontWeight: 500 }}
                  >
                    {m.name}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 진행률 바 + 진행 단계 */}
        <div
          style={{
            width: "100%",
            maxWidth: 480,
            display: "flex",
            flexDirection: "column",
            gap: 12,
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

          <HfCard padding={16} style={{ width: "100%" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {steps.map((s, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 20,
                      height: 20,
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
                      flexShrink: 0,
                    }}
                  >
                    {s.state === "done" ? "✓" : ""}
                  </span>
                  <span
                    className="t-sm"
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
                  {s.state === "doing" && (
                    <div
                      style={{
                        display: "flex",
                        gap: 3,
                        marginLeft: "auto",
                      }}
                      aria-hidden="true"
                    >
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
        </div>

        <div
          className="t-sm ink-3"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          약 {estimatedSec}초 소요
        </div>
      </div>
    </div>
  );
}

/** @deprecated Step63 단일 컴포넌트 사용 — 호환용 alias */
export const Step63Pc = Step63;

// 미사용 import
void Pill;
void Sparkles;
void X;
