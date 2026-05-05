"use client";

/**
 * Step 7 (종료) + 엣지케이스 (마이크/재접속)
 *
 * 디자인: docs/디자인/opic/project/hf-loop.jsx (Step 7) + hf-extra.jsx (Edge)
 */

import { Sprout, Sparkles, Mic, ArrowLeft } from "lucide-react";
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
  Pill,
  Tag,
  Hl,
  Insight,
  Quote,
  SectionH,
  PcStepShell,
  PcStepBar,
} from "../_components/bp";
import { goHome } from "@/lib/opic-study/nav";
import {
  MOCK_STEP7,
  MOCK_MIC_STEPS,
  MOCK_RECONNECT_MEMBERS,
} from "./_mock";

// ============================================================
// Step 7 · 종료 / 인사이트
// ============================================================

interface Step7Props {
  data?: typeof MOCK_STEP7;
  onHome?: () => void;
  onNextCombo?: () => void;
}

interface Step7PcExtraProps {
  /** 실데이터 그룹명 (브레드크럼) — ImmersiveHeader에서 처리 */
  groupName?: string;
  /** 실데이터 토픽 라벨 (브레드크럼) */
  topicLabel?: string;
}

/** Step 7 — 종료/인사이트 (단일 컴포넌트, PC 우선 + 반응형) */
export function Step7({
  data,
  onHome,
  onNextCombo,
}: Step7Props & Step7PcExtraProps) {
  if (!data) return null;
  const memberCols = Math.max(data.memberNotes.length, 1);

  return (
    <div className="bp-scope bp-shell">
      <PcStepBar now={6} total={6} />

      <div className="bp-shell-content">
        {/* Hero */}
        <div style={{ textAlign: "center", padding: "8px 0 24px" }}>
          <div
            aria-hidden="true"
            style={{
              width: 88,
              height: 88,
              borderRadius: "50%",
              background:
                "linear-gradient(140deg, var(--bp-tc-tint) 0%, var(--bp-surface-2) 100%)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
              boxShadow: "0 8px 24px rgba(201,100,66,0.12)",
            }}
          >
            <Sprout size={42} strokeWidth={1.6} color="var(--bp-tc)" />
          </div>
          <div
            className="t-display"
            style={{
              marginBottom: 6,
              fontWeight: 700,
              textWrap: "balance" as const,
            }}
          >
            {data.title}
          </div>
          <p
            className="t-body ink-3"
            style={{ margin: 0, textWrap: "pretty" as const }}
          >
            {data.subtitle}
          </p>
        </div>

        {/* Today's BP + Coach note — 모바일 stack, PC 1.2fr/1fr */}
        <div className="bp-grid-feedback" style={{ marginBottom: 16 }}>
          <Insight>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 10,
              }}
            >
              <Sparkles
                size={18}
                strokeWidth={1.8}
                color="var(--bp-tc)"
                aria-hidden="true"
              />
              <span className="t-h2">오늘의 베스트 표현</span>
            </div>
            <Quote
              style={{
                background: "rgba(255,255,255,0.6)",
                fontSize: 15,
                padding: "14px 16px",
              }}
            >
              {data.bestExpression}
            </Quote>
            <span
              className="t-xs ink-3"
              style={{ marginLeft: 14, display: "block", marginTop: 6 }}
            >
              — {data.bestFrom}
            </span>
          </Insight>

          <HfCard variant="lift" padding={20}>
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                marginBottom: 12,
              }}
            >
              <CoachAvatar />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  flex: 1,
                }}
              >
                <span className="t-sm" style={{ fontWeight: 600 }}>
                  AI 스터디 코치
                </span>
                <span className="t-xs ink-3">오늘의 마무리</span>
              </div>
            </div>
            <p
              className="t-body"
              style={{ margin: 0, lineHeight: 1.6 }}
            >
              오늘은 <Hl>&ldquo;{data.coachNote.keyword}&rdquo;</Hl>으로 도입을
              시작하는 패턴을 함께 배웠어요. 다음 세션에서는{" "}
              <b>{data.coachNote.detailKeyword}</b>을 하나씩 더 넣는 연습을
              해볼까요?
            </p>
          </HfCard>
        </div>

        {/* Members — 모바일 1열, PC 멤버 수만큼 */}
        <HfCard padding={20} style={{ marginBottom: 16 }}>
          <SectionH style={{ marginBottom: 14 }}>오늘 함께한 멤버</SectionH>
          <div
            className="bp-grid-members"
            style={{ ["--member-cols" as string]: memberCols } as React.CSSProperties}
          >
            {data.memberNotes.map((m) => (
              <HfCard
                key={m.key}
                variant="flat"
                padding={14}
                style={{ textAlign: "center" }}
              >
                <MbDot
                  color={m.key}
                  initial={m.name[0]}
                  size={36}
                  fontSize={13}
                  style={{ margin: "0 auto 8px", display: "flex" }}
                />
                <div
                  className="t-sm"
                  style={{ fontWeight: 600, marginBottom: 6 }}
                >
                  {m.name}
                </div>
                <Tag tone="good" style={{ fontSize: 10 }}>
                  오늘 베스트 · {m.note}
                </Tag>
              </HfCard>
            ))}
          </div>
        </HfCard>

        {/* Next combo — 실데이터 추천 있을 때만 */}
        {data.nextRecommend?.name && (
          <HfCard
            variant="flat"
            padding={16}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <span className="t-xs ink-3">다음 추천 콤보</span>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 0,
                flex: 1,
                minWidth: 120,
              }}
            >
              <span className="t-sm" style={{ fontWeight: 600 }}>
                {data.nextRecommend.name}
              </span>
              {data.nextRecommend.meta && (
                <span className="t-xs ink-3">
                  {data.nextRecommend.meta}
                </span>
              )}
            </div>
            <HfButton variant="secondary" size="sm">
              살펴보기
            </HfButton>
          </HfCard>
        )}
      </div>

      {/* Actions */}
      <div className="bp-shell-actions">
        <div className="bp-shell-actions-inner" style={{ gap: 10 }}>
          <HfButton
            variant="secondary"
            size="lg"
            onClick={onHome}
            style={{ minWidth: 140 }}
          >
            홈으로
          </HfButton>
          <HfButton
            variant="primary"
            size="lg"
            onClick={onNextCombo}
            style={{ minWidth: 200 }}
          >
            이어서 다음 콤보 →
          </HfButton>
        </div>
      </div>
    </div>
  );
}

/** @deprecated Step7 단일 컴포넌트 사용 — 호환용 alias */
export const Step7Pc = Step7;

void PcStepShell;

// ============================================================
// EdgeMic · 마이크 권한 거부
// ============================================================

interface EdgeMicProps {
  steps?: string[];
  onOpenSettings?: () => void;
  onLeave?: () => void;
}

/** EdgeMic — 마이크 권한 거부 (단일 컴포넌트, PC 우선 + 반응형) */
export function EdgeMic({
  steps = MOCK_MIC_STEPS,
  onOpenSettings,
  onLeave,
}: EdgeMicProps) {
  return (
    <div className="bp-scope bp-shell">
      <div
        className="bp-shell-content"
        style={{
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            maxWidth: 520,
            width: "100%",
            padding: "32px 24px",
            background: "var(--bp-surface)",
            borderRadius: "var(--bp-radius-lg)",
            boxShadow: "var(--bp-shadow)",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "var(--bp-polish-tint)",
              color: "var(--bp-tc)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto",
            }}
          >
            <Mic size={32} strokeWidth={1.6} />
          </div>

          <div>
            <div
              className="t-h1"
              style={{
                marginBottom: 8,
                textWrap: "balance" as const,
              }}
            >
              마이크 사용을 허용해주세요
            </div>
            <p
              className="t-body ink-3"
              style={{
                margin: 0,
                lineHeight: 1.6,
                textWrap: "pretty" as const,
              }}
            >
              답변을 녹음하려면 마이크가 필요해요. 설정에서 권한을 허용한 다음
              다시 시도해주세요.
            </p>
          </div>

          <MicSteps steps={steps} />
        </div>
      </div>

      <div className="bp-shell-actions">
        <div className="bp-shell-actions-inner">
          <HfButton
            variant="ghost"
            size="lg"
            onClick={onLeave}
            style={{ minWidth: 140 }}
          >
            스터디 나가기
          </HfButton>
          <HfButton
            variant="primary"
            size="lg"
            onClick={onOpenSettings}
            style={{ minWidth: 200 }}
          >
            설정 열기
          </HfButton>
        </div>
      </div>
    </div>
  );
}

function MicSteps({ steps }: { steps: string[] }) {
  return (
    <HfCard
      padding={16}
      style={{
        background: "var(--bp-surface-2)",
        boxShadow: "none",
        textAlign: "left",
      }}
    >
      <SectionH>설정 방법</SectionH>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {steps.map((t, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
            }}
          >
            <span
              className="t-num"
              aria-hidden="true"
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "var(--bp-surface)",
                color: "var(--bp-ink)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {i + 1}
            </span>
            <span className="t-sm">{t}</span>
          </div>
        ))}
      </div>
    </HfCard>
  );
}

// ============================================================
// EdgeReconnect · 멤버 재접속 중
// ============================================================

interface EdgeReconnectProps {
  members?: typeof MOCK_RECONNECT_MEMBERS;
  disconnectedName?: string;
  disconnectedKey?: "a" | "b" | "c" | "d";
  elapsedSec?: number;
  onWait?: () => void;
  onContinue?: () => void;
}

export function EdgeReconnect({
  members = MOCK_RECONNECT_MEMBERS,
  disconnectedName = "Carol",
  disconnectedKey = "c",
  elapsedSec = 15,
  onWait,
  onContinue,
}: EdgeReconnectProps) {
  const liveCount = members.filter((m) => m.state === "in").length;

  return (
    <HfPhone>
      <HfStatusBar />

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
          <span className="t-h3">Q1 · 답변 중</span>
          <span className="t-micro ink-3">음악 콤보</span>
        </div>
        <Pill
          style={{
            background: "var(--bp-polish-tint)",
            color: "var(--bp-tc)",
          }}
        >
          연결 끊김
        </Pill>
      </div>

      <HfBody padding="20px">
        {/* 끊김 알림 */}
        <HfCard
          padding={16}
          style={{
            marginBottom: 16,
            border: "1.5px solid var(--bp-tc)",
            background: "var(--bp-polish-tint)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              marginBottom: 8,
            }}
          >
            <MbDot
              color={disconnectedKey}
              initial={disconnectedName[0]}
              size={28}
              fontSize={11}
              style={{ opacity: 0.5 }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
              <span className="t-sm" style={{ fontWeight: 600 }}>
                {disconnectedName}이 잠시 끊겼어요
              </span>
              <span className="t-xs ink-3">자동으로 재접속을 시도하고 있어요</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 10 }}>
            <HfWave
              bars={12}
              height={16}
              amplitude={10}
              color="tc"
              style={{ flex: 1, opacity: 0.6 }}
            />
            <span className="t-xs ink-3 t-num">{elapsedSec}초째…</span>
          </div>
        </HfCard>

        {/* 멤버 상태 */}
        <HfCard padding={14}>
          <SectionH>지금 멤버</SectionH>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {members.map((m) => (
              <div
                key={m.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  opacity: m.state === "out" ? 0.5 : 1,
                }}
              >
                <MbDot
                  color={m.key}
                  initial={m.name[0]}
                  live={m.state === "in"}
                  size={28}
                  fontSize={11}
                />
                <span className="t-sm" style={{ fontWeight: 500, flex: 1 }}>
                  {m.name}
                </span>
                {m.state === "in" && (
                  <span
                    className="t-xs"
                    style={{ color: "var(--bp-good)", fontWeight: 500 }}
                  >
                    ● 연결됨
                  </span>
                )}
                {m.state === "out" && (
                  <span className="t-xs ink-3">재접속 중…</span>
                )}
              </div>
            ))}
          </div>
        </HfCard>

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
            30초 안에 돌아오지 않으면 {disconnectedName}을 빼고 진행할게요.
          </p>
        </HfCard>
      </HfBody>

      <HfFooter>
        <div style={{ display: "flex", gap: 8 }}>
          <HfButton variant="secondary" style={{ flex: 1 }} onClick={onWait}>
            잠시 대기
          </HfButton>
          <HfButton variant="primary" style={{ flex: 1 }} onClick={onContinue}>
            {liveCount}명으로 진행
          </HfButton>
        </div>
      </HfFooter>
    </HfPhone>
  );
}
