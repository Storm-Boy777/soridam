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

export function Step66Mobile({
  members = MOCK_MEMBERS_66,
  insightText = MOCK_INSIGHT_TEXT,
  onNext,
}: Step66MobileProps) {
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  const focused = focusedIdx !== null ? members[focusedIdx] : null;

  return (
    <HfPhone>
      <HfStatusBar />
      <HfHeader title="함께 보기" sub="Q1 · 4명의 답변" />

      <HfBody padding="20px">
        {/* Insight strip */}
        <Insight style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 14 }}>✨</span>
            <span className="t-h3">오늘 4명에게서 배운 점</span>
          </div>
          <p
            className="t-sm"
            style={{ margin: 0, lineHeight: 1.55, color: "var(--bp-ink)" }}
            dangerouslySetInnerHTML={{
              __html: insightText
                .replace(/"into \/ hooked on"/g, '<b>"into / hooked on"</b>')
                .replace(/몰입 표현/g, "<b>몰입 표현</b>"),
            }}
          />
        </Insight>

        {/* 2x2 grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          {members.map((m, i) => (
            <HfCard
              key={m.key}
              padding={12}
              style={{ cursor: "pointer" }}
              onClick={() => setFocusedIdx(i)}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <MbDot color={m.key} initial={m.initial} size={24} fontSize={10} />
                <span className="t-sm" style={{ fontWeight: 600 }}>
                  {m.name}
                </span>
              </div>
              <p
                className="t-xs"
                style={{
                  margin: 0,
                  lineHeight: 1.5,
                  color: "var(--bp-ink-2)",
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical" as const,
                  overflow: "hidden",
                }}
              >
                {m.answer}
              </p>
              <div
                style={{
                  marginTop: 8,
                  paddingTop: 8,
                  borderTop: "1px solid var(--bp-line)",
                }}
              >
                <Tag tone="good" style={{ fontSize: 10 }}>
                  BP · {m.bp.tag}
                </Tag>
              </div>
            </HfCard>
          ))}
        </div>

        {/* Coach footer */}
        <HfCard
          padding={14}
          style={{
            marginTop: 16,
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
          }}
        >
          <CoachAvatar />
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
            <span className="t-xs" style={{ fontWeight: 600 }}>
              AI 스터디 코치
            </span>
            <p
              className="t-xs"
              style={{ margin: 0, lineHeight: 1.55, color: "var(--bp-ink-2)" }}
            >
              네 명의 답변을 모두 들어보고, 마음에 드는 표현 하나씩 골라 다음 답변에 써보세요.
            </p>
          </div>
        </HfCard>
      </HfBody>

      <HfFooter>
        <HfButton variant="primary" size="lg" full onClick={onNext}>
          다음 질문 →
        </HfButton>
      </HfFooter>

      {/* Focus overlay (bottom sheet) */}
      {focused && focusedIdx !== null && (
        <div
          onClick={() => setFocusedIdx(null)}
          className="bp-fade-in"
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(31,27,22,0.4)",
            display: "flex",
            alignItems: "flex-end",
            zIndex: 10,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bp-bg)",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              width: "100%",
              maxHeight: "80%",
              overflow: "auto",
            }}
          >
            <div
              style={{
                width: 40,
                height: 4,
                background: "var(--bp-line-strong)",
                borderRadius: 2,
                margin: "0 auto 16px",
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <MbDot color={focused.key} initial={focused.initial} />
              <span className="t-h2">{focused.name}</span>
            </div>
            <Quote style={{ marginBottom: 14 }}>{focused.answer}</Quote>
            <CoachBlock tone="good" label="이 점이 베스트" style={{ marginBottom: 10 }}>
              <b>{focused.bp.tag}</b> — {focused.bp.note}
            </CoachBlock>
            <CoachBlock tone="polish" label="같이 배워볼 점">
              {focused.polish}을 다음 답변에 의식해보면 좋아요.
            </CoachBlock>
            <HfButton
              variant="ghost"
              full
              style={{ marginTop: 12 }}
              onClick={() => setFocusedIdx(null)}
            >
              닫기
            </HfButton>
          </div>
        </div>
      )}
    </HfPhone>
  );
}

// ============================================================
// Step 6-6 PC (4컬럼)
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
}

export function Step66Pc({
  members = MOCK_MEMBERS_66,
  insightText = MOCK_INSIGHT_TEXT_PC,
  groupName = "5월 오픽 AL 스터디",
  onNext,
  onReplay,
  topicLabel = "음악 콤보",
  questionLabel = "Q1 · 함께 보기",
  comboProgress,
}: Step66PcProps) {
  void comboProgress;
  return (
    <PcStepShell
      crumb={[groupName, topicLabel, questionLabel]}
      right={
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Pill tone="live">실시간</Pill>
          <HfButton variant="primary" size="sm" onClick={onNext}>
            다음 질문 →
          </HfButton>
        </div>
      }
    >

      {/* Insight strip */}
      <div style={{ padding: "14px 20px 0" }}>
        <Insight>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>✨</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span className="t-h3">오늘 {members.length}명에게서 배운 점</span>
                <p
                  className="t-sm"
                  style={{ margin: 0, color: "var(--bp-ink-2)" }}
                  dangerouslySetInnerHTML={{
                    __html: insightText
                      .replace(/"into \/ hooked on \/ love"/g, '<b>"into / hooked on / love"</b>')
                      .replace(/몰입 표현/g, "<b>몰입 표현</b>"),
                  }}
                />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CoachAvatar size="sm" />
              <span className="t-xs ink-3">AI 스터디 코치 정리</span>
            </div>
          </div>
        </Insight>
      </div>

      {/* N columns (멤버 수에 맞춰 동적) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.max(members.length, 1)}, minmax(0, 1fr))`,
          gap: 12,
          flex: 1,
          padding: "16px 20px",
          overflow: "hidden",
        }}
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
              <HfButton variant="ghost" size="sm" onClick={onReplay}>
                ▶
              </HfButton>
            </div>

            <div className="bp-mb-col-body">
              {/* Quote */}
              <Quote style={{ marginBottom: 12 }}>{m.answer}</Quote>

              {/* Wave */}
              <HfWave
                bars={28}
                height={20}
                amplitude={16}
                style={{ marginBottom: 14 }}
              />

              {/* BP */}
              <CoachBlock
                tone="good"
                label="이 점이 베스트"
                style={{ padding: "10px 12px", marginBottom: 8 }}
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
                style={{ padding: "10px 12px" }}
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
      <div
        style={{
          padding: "12px 20px 16px",
          borderTop: "1px solid var(--bp-line)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span className="t-xs ink-3">
          콤보 1/3 · 다음 질문에서 마음에 든 표현 한 가지씩 써보세요
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <HfButton variant="secondary" size="sm" onClick={onReplay}>
            전체 다시 듣기
          </HfButton>
          <HfButton variant="primary" size="sm" onClick={onNext}>
            다음 질문 →
          </HfButton>
        </div>
      </div>
    </PcStepShell>
  );
}

/** Step 6-6 — 모바일/PC 분기 wrapper */
export function Step66(props: Step66PcProps & Step66MobileProps) {
  return (
    <>
      <div className="bp-only-mobile" style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <Step66Mobile {...props} />
      </div>
      <div className="bp-only-pc" style={{ flex: 1, minHeight: 0 }}>
        <Step66Pc {...props} />
      </div>
    </>
  );
}
