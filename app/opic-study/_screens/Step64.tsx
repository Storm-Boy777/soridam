"use client";

/**
 * Step 6-4 — AI 코칭 카드
 *
 * 모바일: 탭 (코치 노트 / 내 답변)
 * PC: 듀얼 컬럼 (좌: 전사 + 웨이브, 우: 코치 노트)
 *
 * 디자인: docs/디자인/opic/project/hf-step64.jsx
 */

import { useState } from "react";
import { Play, Sparkles } from "lucide-react";
import {
  HfPhone,
  HfStatusBar,
  HfHeader,
  HfBody,
  HfButton,
  HfCard,
  HfTabs,
  HfWave,
  CoachAvatar,
  CoachBlock,
  MbDot,
  MbStack,
  Pill,
  Hl,
  SectionH,
  PcStepShell,
  PcStepBar,
} from "../_components/bp";
import {
  MOCK_COACH_TRANSCRIPT,
  MOCK_COACHING,
  type AnswerData,
} from "./_mock";

// ============================================================
// Transcript (segment별 하이라이트)
// ============================================================

function Transcript({
  data = MOCK_COACH_TRANSCRIPT,
  size = "lg",
}: {
  data?: AnswerData;
  size?: "lg" | "md";
}) {
  return (
    <div
      className="t-body"
      style={{ lineHeight: 1.75, fontSize: size === "lg" ? 14 : 13 }}
    >
      {data.segments.map((s, i) => {
        if (s.tone === "good") return <Hl key={i} tone="good">{s.text}</Hl>;
        if (s.tone === "polish") return <Hl key={i} tone="polish">{s.text}</Hl>;
        return <span key={i}>{s.text}</span>;
      })}
    </div>
  );
}

// ============================================================
// Step 6-4 모바일
// ============================================================

interface Step64MobileProps {
  questionLabel?: string;
  comboLabel?: string;
  data?: AnswerData;
  coaching?: typeof MOCK_COACHING;
  onReplay?: () => void;
  onNext?: () => void;
}

// ============================================================
// Step 6-4 — 단일 컴포넌트
// ============================================================

interface Step64PcProps {
  data?: AnswerData;
  coaching?: typeof MOCK_COACHING;
  groupName?: string;
  onReplay?: () => void;
  onNext?: () => void;
  /** 실데이터 — 토픽 라벨 (예: "음악 콤보 · Q1 묘사") */
  topicLabel?: string;
  /** 실데이터 — 질문 라벨/유형 (예: "Q1 · 묘사") */
  questionLabel?: string;
  /** 실데이터 — 콤보 진행도 ("콤보 1/3 진행 중") */
  comboProgress?: string;
  /** 실데이터 — 멤버 dots 표시용 */
  realMembers?: Array<{ key: "a" | "b" | "c" | "d"; initial: string; live?: boolean }>;
  /** 실데이터 — 질문 텍스트 */
  questionText?: string;
  /** 실데이터 — 전사 (없으면 mock segments) */
  realTranscript?: string;
  /** 실데이터 — 음성 길이 */
  realDuration?: string;
  /** 실데이터 — AI 코치 한 줄 요약 (feedback_text) */
  feedbackText?: string;
  /** 실데이터 — 강점 list */
  strengths?: string[];
  /** 실데이터 — 다듬을 부분 list */
  improvements?: string[];
  /** 실데이터 — 팁 list */
  tips?: string[];
}

/** Step 6-4 — AI 코칭 카드 (단일 컴포넌트, PC 우선 + 반응형) */
export function Step64({
  data,
  questionLabel,
  onReplay,
  onNext,
  realMembers,
  questionText,
  realTranscript,
  realDuration,
  feedbackText,
  strengths,
  improvements,
  tips,
}: Step64PcProps) {
  const displayQuestion = questionText ?? data?.question ?? "";
  const displayDuration = realDuration ?? data?.duration ?? "";
  const displayQuestionLabel = questionLabel ?? data?.questionLabel ?? "";
  const displayMembers = realMembers ?? [];

  return (
    <div className="bp-scope bp-shell">
      <PcStepBar now={5} total={6} />

      <div className="bp-shell-content">
        {/* 멤버 정보 바 (외곽 ImmersiveHeader 보조) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 14,
            flexWrap: "wrap",
          }}
        >
          <Pill tone="live">함께 보기</Pill>
          <MbStack
            members={displayMembers.map((m) => ({
              color: m.key,
              initial: m.initial,
              live: m.live ?? true,
            }))}
          />
        </div>

        <div
          className="bp-grid-feedback"
          style={{ flex: 1, minHeight: 0 }}
        >
        {/* LEFT — 전사 */}
        <HfCard
          variant="lift"
          padding={24}
          style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <SectionH style={{ marginBottom: 0 }}>
              {displayQuestionLabel}
            </SectionH>
            {displayDuration && (
              <span className="t-xs ink-3 t-num">{displayDuration}</span>
            )}
          </div>
          <p
            className="t-body ink-2"
            style={{ margin: 0, marginBottom: 18, lineHeight: 1.55 }}
          >
            {displayQuestion}
          </p>
          <div
            style={{
              height: 1,
              background: "var(--bp-line)",
              margin: "0 -24px 18px",
            }}
          />

          <SectionH>내 답변</SectionH>
          <div style={{ flex: 1, overflow: "auto" }}>
            {realTranscript ? (
              <p
                className="t-body"
                style={{ margin: 0, lineHeight: 1.75, fontSize: 14 }}
              >
                {realTranscript}
              </p>
            ) : (
              <p
                className="t-sm ink-3"
                style={{ margin: 0, lineHeight: 1.6 }}
              >
                전사가 아직 도착하지 않았어요.
              </p>
            )}
          </div>

          {realTranscript && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 16,
                paddingTop: 16,
                borderTop: "1px solid var(--bp-line)",
              }}
            >
              <HfButton
                variant="ghost"
                size="sm"
                onClick={onReplay}
                aria-label="답변 재생"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  padding: 0,
                }}
              >
                <Play size={14} strokeWidth={2} aria-hidden="true" />
              </HfButton>
              <HfWave bars={60} height={28} amplitude={22} style={{ flex: 1 }} />
              {displayDuration && (
                <span
                  className="t-xs ink-3 t-num"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {displayDuration}
                </span>
              )}
            </div>
          )}
        </HfCard>

        {/* RIGHT — 코치 노트 */}
        <div
          style={{ display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" }}
        >
          {/* Coach intro */}
          <HfCard variant="lift" padding={18}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <CoachAvatar size="lg" />
              <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    className="t-h3"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Sparkles
                      size={14}
                      strokeWidth={1.8}
                      color="var(--bp-tc)"
                      aria-hidden="true"
                    />
                    AI 스터디 코치
                  </span>
                  {feedbackText && (
                    <span className="t-xs ink-3">코칭 도착</span>
                  )}
                </div>
                <p
                  className="t-body"
                  style={{
                    margin: 0,
                    color: feedbackText ? "var(--bp-ink)" : "var(--bp-ink-3)",
                    lineHeight: 1.6,
                  }}
                >
                  {feedbackText ?? "코칭 한 줄 평을 정리하고 있어요."}
                </p>
              </div>
            </div>
          </HfCard>

          {/* 3-block coaching — 실데이터만 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              flex: 1,
              overflow: "auto",
            }}
          >
            {strengths?.map((s, i) => (
              <CoachBlock key={`s-${i}`} tone="good">
                {s}
              </CoachBlock>
            ))}
            {improvements?.map((s, i) => (
              <CoachBlock key={`i-${i}`} tone="polish">
                {s}
              </CoachBlock>
            ))}
            {tips?.map((s, i) => (
              <CoachBlock key={`t-${i}`} tone="tip">
                {s}
              </CoachBlock>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <HfButton variant="secondary" style={{ flex: 1 }} onClick={onReplay}>
              다시 듣기
            </HfButton>
            <HfButton variant="primary" style={{ flex: 2 }} onClick={onNext}>
              다음 질문 →
            </HfButton>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

/** @deprecated Step64 단일 컴포넌트 사용 — 호환용 alias */
export const Step64Pc = Step64;

// 미사용 변수 무시 (coaching prop은 향후 동적 데이터 연결용)
void MOCK_COACHING;
void PcStepShell;
