"use client";

/**
 * Step 6-6 — 4명 동시 비교 (BP 공유)
 *
 * 핵심: 순위 X · 함께 배우는 BP(Best Practice) 공유
 *
 * 모바일: 2x2 그리드 + 포커스 오버레이 (bottom sheet)
 * PC: 4컬럼 가로 배치
 *
 * 디자인: docs/디자인/opic/project/hf-step66.jsx
 */

import { useState } from "react";
import { Sparkles, Timer, Play } from "lucide-react";
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
  CoachBlock,
  MbDot,
  Pill,
  Tag,
  Quote,
  Insight,
  PcStepShell,
  PcStepBar,
} from "../_components/bp";
import {
  MOCK_MEMBERS_66,
  MOCK_INSIGHT_TEXT,
  MOCK_INSIGHT_TEXT_PC,
  type MemberAnswer,
} from "./_mock";

// ============================================================
// Step 6-6 모바일 (2x2 + 포커스 오버레이)
// ============================================================

interface Step66MobileProps {
  members?: MemberAnswer[];
  insightText?: string;
  onNext?: () => void;
}

// ============================================================
// Step 6-6 — 단일 컴포넌트 (PC 우선 + 반응형)
// ============================================================

interface Step66PcProps {
  members?: MemberAnswer[];
  insightText?: string;
  groupName?: string;
  onNext?: () => void;
  onReplay?: () => void;
  /** 실데이터 — 토픽 라벨 (브레드크럼) */
  topicLabel?: string;
  /** 실데이터 — 질문 라벨 (브레드크럼) */
  questionLabel?: string;
  /** 실데이터 — 콤보 진행도 ("콤보 1/3 진행 중") */
  comboProgress?: string;
  /** 실데이터 — 토론 타이머 라벨 (예: "4:32"), 표시 시점 */
  timerLabel?: string;
  /** 실데이터 — 타이머 만료 여부 */
  timerExpired?: boolean;
}

/** Step 6-6 — 4명 비교 (단일 컴포넌트, PC 우선 + 반응형) */
export function Step66({
  members = [],
  insightText,
  onNext,
  onReplay,
  comboProgress,
  timerLabel,
  timerExpired,
}: Step66PcProps) {
  const memberCols = Math.max(members.length, 1);

  return (
    <div className="bp-scope bp-shell">
      <PcStepBar now={6} total={6} />

      {/* 토론 타이머 + 함께 보기 pill (외곽 ImmersiveHeader 보조) */}
      {(timerLabel || true) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "10px 16px 0",
            flexWrap: "wrap",
          }}
        >
          {timerLabel && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 999,
                background: timerExpired
                  ? "rgba(201, 100, 66, 0.15)"
                  : "rgba(74, 184, 90, 0.12)",
                color: timerExpired ? "var(--bp-tc)" : "#2d7a3d",
                fontWeight: 600,
                fontSize: 13,
              }}
              title="토론 시간"
              aria-live="polite"
            >
              <Timer size={14} strokeWidth={1.8} aria-hidden="true" />
              {timerExpired ? (
                "토론 시간 종료"
              ) : (
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {timerLabel}
                </span>
              )}
            </span>
          )}
          <Pill tone="live">함께 보기</Pill>
        </div>
      )}

      {/* Insight strip — 실데이터 있을 때만 */}
      {insightText && (
        <div style={{ padding: "14px 16px 0" }}>
        <Insight>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                minWidth: 0,
              }}
            >
              <Sparkles
                size={20}
                strokeWidth={1.8}
                color="var(--bp-tc)"
                aria-hidden="true"
                style={{ flexShrink: 0 }}
              />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  minWidth: 0,
                }}
              >
                <span
                  className="t-h3"
                  style={{ textWrap: "balance" as const }}
                >
                  오늘 {members.length}명에게서 배운 점
                </span>
                <p
                  className="t-sm"
                  style={{
                    margin: 0,
                    color: "var(--bp-ink-2)",
                    lineHeight: 1.55,
                    textWrap: "pretty" as const,
                  }}
                >
                  {insightText}
                </p>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexShrink: 0,
              }}
            >
              <CoachAvatar size="sm" />
              <span className="t-xs ink-3">AI 스터디 코치 정리</span>
            </div>
          </div>
        </Insight>
        </div>
      )}

      {/* N columns — 모바일 1열, PC 멤버 수만큼 (--member-cols) */}
      <div
        className="bp-grid-members"
        style={{
          ["--member-cols" as string]: memberCols,
          flex: 1,
          padding: "16px",
          overflow: "auto",
        } as React.CSSProperties}
      >
        {members.map((m) => (
          <div key={m.key} className="bp-mb-col">
            <div className="bp-mb-col-h">
              <MbDot color={m.key} initial={m.initial} live />
              <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <span className="t-sm" style={{ fontWeight: 600 }}>
                  {m.name}
                </span>
                <span className="t-micro ink-3">{m.duration}</span>
              </div>
              <HfButton
                variant="ghost"
                size="sm"
                onClick={onReplay}
                aria-label={`${m.name} 답변 재생`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                <Play size={12} strokeWidth={2} aria-hidden="true" />
              </HfButton>
            </div>

            <div className="bp-mb-col-body">
              {/* Quote — 4줄 truncate (모바일 길이 제어) */}
              <div
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: "vertical" as const,
                  overflow: "hidden",
                  marginBottom: 10,
                }}
              >
                <Quote>{m.answer}</Quote>
              </div>

              {/* Wave */}
              <HfWave
                bars={28}
                height={20}
                amplitude={16}
                style={{ marginBottom: 12 }}
              />

              {/* BP */}
              <CoachBlock
                tone="good"
                label="이 점이 베스트"
                style={{ padding: "8px 10px", marginBottom: 6 }}
              >
                <span className="t-xs" style={{ lineHeight: 1.5 }}>
                  <b>{m.bp.tag}</b>
                  <br />
                  <span className="ink-2">{m.bp.note}</span>
                </span>
              </CoachBlock>

              {/* Polish */}
              <CoachBlock
                tone="polish"
                label="같이 배워볼 점"
                style={{ padding: "8px 10px" }}
              >
                <span className="t-xs ink-2" style={{ lineHeight: 1.5 }}>
                  {m.polish}
                </span>
              </CoachBlock>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="bp-shell-actions">
        <div className="bp-shell-actions-inner">
          <span
            className="bp-shell-helper"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {comboProgress ?? "콤보 1/3"} · 다른 멤버 답변에서 좋은 표현을 들어보세요
          </span>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <HfButton variant="secondary" size="sm" onClick={onReplay}>
              전체 다시 듣기
            </HfButton>
            <HfButton variant="primary" onClick={onNext}>
              다음 질문 →
            </HfButton>
          </div>
        </div>
      </div>
    </div>
  );
}

/** @deprecated Step66 단일 컴포넌트 사용 — 호환용 alias */
export const Step66Pc = Step66;
void PcStepShell;
