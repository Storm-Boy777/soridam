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

export function Step64Mobile({
  questionLabel = "Q1 · 코칭",
  comboLabel = "음악 콤보 · 1/3 질문",
  data = MOCK_COACH_TRANSCRIPT,
  coaching = MOCK_COACHING,
  onReplay,
  onNext,
}: Step64MobileProps) {
  const [tab, setTab] = useState<"coach" | "transcript">("coach");

  return (
    <HfPhone>
      <HfStatusBar />
      <HfHeader
        title={questionLabel}
        sub={comboLabel}
        right={<MbDot color="a" initial="A" live size={26} fontSize={10} />}
      />

      <HfTabs
        items={[
          { key: "coach", label: "코치 노트" },
          { key: "transcript", label: "내 답변" },
        ]}
        active={tab}
        onChange={(k) => setTab(k as "coach" | "transcript")}
      />

      <HfBody padding="20px">
        {tab === "coach" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Coach intro */}
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <CoachAvatar size="lg" />
              <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                <span className="t-h3">AI 스터디 코치</span>
                <span className="t-xs ink-3">방금 도착 · 25초 분량</span>
              </div>
            </div>

            <p className="t-body" style={{ margin: 0, color: "var(--bp-ink)" }}>
              {coaching.intro.split("\"I'm really into...\"").map((part, i, arr) => (
                <span key={i}>
                  {part}
                  {i < arr.length - 1 && <Hl>"I'm really into..."</Hl>}
                </span>
              ))}
            </p>

            <CoachBlock tone="good">
              도입부 connector가 자연스러워요.{" "}
              <Hl tone="good">"I'm really into..."</Hl> 구문은 묘사 답변에서 가장 좋아하는 시작 방식 중 하나예요.
            </CoachBlock>

            <CoachBlock tone="polish">
              <Hl tone="polish">"go to concerts"</Hl> 부분에서 한 번 멈추셨어요. 다음번엔 <b>"I love going to concerts"</b>처럼 동사 형태를 살짝 바꿔보면 더 자연스러워요.
            </CoachBlock>

            <CoachBlock tone="tip">
              AL 등급에서는 <b>구체적인 예시 한 가지</b>를 더 넣으면 좋아요. 예: "Kendrick Lamar의 'HUMBLE.'을 자주 들어요" 같은 디테일이요.
            </CoachBlock>

            <div style={{ display: "flex", gap: 8 }}>
              <HfButton variant="secondary" style={{ flex: 1 }} onClick={onReplay}>
                다시 듣기
              </HfButton>
              <HfButton variant="primary" style={{ flex: 1 }} onClick={onNext}>
                다음 질문
              </HfButton>
            </div>
          </div>
        )}

        {tab === "transcript" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <HfCard padding={14}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <SectionH style={{ marginBottom: 0 }}>내 답변</SectionH>
                <span className="t-xs ink-3 t-num">{data.duration}</span>
              </div>
              <Transcript data={data} size="md" />
            </HfCard>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 4px",
              }}
            >
              <HfButton variant="ghost" size="sm">▶ 재생</HfButton>
              <HfWave bars={32} amplitude={18} style={{ flex: 1 }} />
            </div>

            <div className="t-xs ink-3" style={{ padding: "0 4px", lineHeight: 1.6 }}>
              <Hl tone="good">잘한 부분</Hl>{" "}
              <Hl tone="polish">다듬을 부분</Hl>
            </div>
          </div>
        )}
      </HfBody>
    </HfPhone>
  );
}

// ============================================================
// Step 6-4 PC
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

export function Step64Pc({
  data = MOCK_COACH_TRANSCRIPT,
  coaching = MOCK_COACHING,
  groupName = "5월 오픽 AL 스터디",
  onReplay,
  onNext,
  topicLabel = "음악 콤보",
  questionLabel,
  comboProgress = "콤보 1/3 진행 중",
  realMembers,
  questionText,
  realTranscript,
  realDuration,
  feedbackText,
  strengths,
  improvements,
  tips,
}: Step64PcProps) {
  const displayQuestion = questionText ?? data.question;
  const displayDuration = realDuration ?? data.duration;
  const displayQuestionLabel = questionLabel ?? `${data.questionLabel ?? "Q1"} · 묘사`;
  const displayMembers = realMembers && realMembers.length > 0
    ? realMembers
    : [
        { key: "a" as const, initial: "A", live: true },
        { key: "b" as const, initial: "B", live: true },
        { key: "c" as const, initial: "C", live: true },
        { key: "d" as const, initial: "D", live: true },
      ];

  return (
    <PcStepShell
      crumb={[groupName, topicLabel, displayQuestionLabel]}
      right={
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Pill tone="live">함께 보기</Pill>
          <MbStack
            members={displayMembers.map((m) => ({
              color: m.key,
              initial: m.initial,
              live: m.live ?? true,
            }))}
          />
          <span
            className="t-sm ink-3"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {comboProgress}
          </span>
        </div>
      }
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          flex: 1,
          padding: "16px 20px",
          overflow: "hidden",
        }}
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
              {data.questionLabel}
            </SectionH>
            <span className="t-xs ink-3 t-num">{displayDuration}</span>
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
              <Transcript data={data} size="lg" />
            )}
          </div>

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
            <span
              className="t-xs ink-3 t-num"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              0:12 / {data.duration}
            </span>
          </div>
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
                  <span className="t-xs ink-3">코칭 도착</span>
                </div>
                <p
                  className="t-body"
                  style={{ margin: 0, color: "var(--bp-ink)", lineHeight: 1.6 }}
                >
                  {feedbackText ?? (
                    <>
                      도입이 자연스러웠어요. <Hl>&ldquo;I&rsquo;m really into...&rdquo;</Hl> 같은 표현이 시작을 부드럽게 만들어줬어요. 한 가지만 같이 다듬어볼까요?
                    </>
                  )}
                </p>
              </div>
            </div>
          </HfCard>

          {/* 3-block coaching */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              flex: 1,
              overflow: "auto",
            }}
          >
            {strengths && strengths.length > 0 ? (
              strengths.map((s, i) => (
                <CoachBlock key={`s-${i}`} tone="good">
                  {s}
                </CoachBlock>
              ))
            ) : (
              <CoachBlock tone="good">
                도입부 connector가 자연스러워요.{" "}
                <Hl tone="good">&ldquo;I&rsquo;m really into...&rdquo;</Hl> 구문은 묘사 답변에서 가장 좋아하는 시작 방식 중 하나예요.
              </CoachBlock>
            )}
            {improvements && improvements.length > 0 ? (
              improvements.map((s, i) => (
                <CoachBlock key={`i-${i}`} tone="polish">
                  {s}
                </CoachBlock>
              ))
            ) : (
              <CoachBlock tone="polish">
                <Hl tone="polish">&ldquo;go to concerts&rdquo;</Hl> 부분에서 한 번 멈추셨어요. 다음번엔 <b>&ldquo;I love going to concerts&rdquo;</b>처럼 동사 형태를 살짝 바꿔보면 더 자연스러워요.
              </CoachBlock>
            )}
            {tips && tips.length > 0 ? (
              tips.map((s, i) => (
                <CoachBlock key={`t-${i}`} tone="tip">
                  {s}
                </CoachBlock>
              ))
            ) : (
              <CoachBlock tone="tip">
                AL 등급에서는 <b>구체적인 예시 한 가지</b>를 더 넣으면 좋아요. 예: &ldquo;Kendrick Lamar의 &lsquo;HUMBLE.&rsquo;을 자주 들어요&rdquo; 같은 디테일이요.
              </CoachBlock>
            )}
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
    </PcStepShell>
  );
}

/** Step 6-4 — 모바일/PC 분기 wrapper (preview/세션에서 함께 사용) */
export function Step64(props: Step64PcProps & Step64MobileProps) {
  return (
    <>
      <div className="bp-only-mobile" style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <Step64Mobile {...props} />
      </div>
      <div className="bp-only-pc" style={{ flex: 1, minHeight: 0 }}>
        <Step64Pc {...props} />
      </div>
    </>
  );
}

// 미사용 변수 무시 (coaching prop은 향후 동적 데이터 연결용)
void MOCK_COACHING;
