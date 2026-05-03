"use client";

/**
 * 오픽 스터디 — 비멤버 안내 페이지 (마케팅성)
 *
 * 대상: 소리담 회원이지만 study_group_members 행이 없는 사용자
 * 목적: 모듈 정체 이해 + 가치 인식 + 신청 채널 (현재 임시: 운영자 문의)
 *
 * 디자인: BP 디자인 시스템 (.bp-scope) 토큰 사용. 일반 반응형 컨테이너.
 */

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import {
  BatteryLow,
  Target,
  Clock,
  MessagesSquare,
  Mic,
  UserCheck,
  HeartHandshake,
} from "lucide-react";
import { MbDot } from "./bp";

interface Props {
  userName: string;
  todayLabel: string;
}

export function NonMemberLanding({ userName, todayLabel }: Props) {
  return (
    <div
      className="bp-scope"
      style={{
        minHeight: "100dvh",
        background: "var(--bp-bg)",
        color: "var(--bp-ink)",
        fontFamily: "var(--bp-font)",
      }}
    >
      <div
        style={{
          maxWidth: 860,
          margin: "0 auto",
          padding: "40px 20px 80px",
          display: "flex",
          flexDirection: "column",
          gap: 56,
        }}
      >
        {/* ────────────────────────────────────────────
            HERO
        ──────────────────────────────────────────── */}
        <Section
          style={{
            paddingTop: 24,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: 20,
          }}
        >
          {/* 인사 — 작게 */}
          <div
            style={{
              fontSize: 13,
              color: "var(--bp-ink-3)",
              letterSpacing: "0.02em",
            }}
          >
            {userName}님 ☕ 오늘은 {todayLabel}이에요
          </div>

          {/* 멤버 클러스터 — 시각적 후킹 */}
          <div style={{ display: "flex", gap: -8, marginBottom: 4 }}>
            <DotWrap offset={0}>
              <MbDot color="a" size={48} fontSize={13} initial="Jay" />
            </DotWrap>
            <DotWrap offset={-12}>
              <MbDot color="b" size={48} fontSize={13} initial="Mia" />
            </DotWrap>
            <DotWrap offset={-24}>
              <MbDot color="c" size={48} fontSize={13} initial="Leo" />
            </DotWrap>
            <DotWrap offset={-36}>
              <MbDot color="d" size={48} fontSize={13} initial="Ana" />
            </DotWrap>
          </div>

          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(28px, 5vw, 40px)",
                fontWeight: 800,
                lineHeight: 1.2,
                letterSpacing: "-0.025em",
              }}
            >
              혼자선 어렵던 오픽 준비,
              <br />
              <span style={{ color: "var(--bp-tc)" }}>
                같이 모여서 끝냅니다.
              </span>
            </h1>
            <p
              style={{
                margin: "16px auto 0",
                maxWidth: 560,
                fontSize: 15,
                lineHeight: 1.7,
                color: "var(--bp-ink-2)",
              }}
            >
              실제 OPIc 출제 콤보로 함께 답하고,
              <br />
              AI가 멤버 한 명 한 명에게 맞춤 코칭을 전합니다.
            </p>
          </div>
        </Section>

        {/* ────────────────────────────────────────────
            HOW IT WORKS — 3단계
        ──────────────────────────────────────────── */}
        <Section>
          <SectionLabel>어떻게 작동하나요</SectionLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            <StepCard
              num="1"
              title="콤보 선택"
              desc="그룹원이 함께 OPIc 기출 토픽·콤보를 고르면 자동으로 3문항이 추출돼요."
            />
            <StepCard
              num="2"
              title="함께 답변"
              desc="각자 마이크로 답변을 녹음. 끝나면 다른 멤버 답변도 한 자리에서 들을 수 있어요."
            />
            <StepCard
              num="3"
              title="코칭 + 토론"
              desc="개인별 AI 피드백과 그룹 전체 인사이트. 마지막은 자유 토론으로 마무리."
            />
          </div>
        </Section>

        {/* ────────────────────────────────────────────
            FOR WHO — 페르소나
        ──────────────────────────────────────────── */}
        <Section>
          <SectionLabel>이런 분께 추천해요</SectionLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            <PersonaCard
              icon={<BatteryLow size={26} strokeWidth={1.6} />}
              title="혼자선 동기 부여가 안 되는 분"
              desc="약속을 잡고 시간을 정해야 책상 앞에 앉게 되시나요? 그룹이 그 역할을 해드려요."
            />
            <PersonaCard
              icon={<Target size={26} strokeWidth={1.6} />}
              title="다른 사람 답변이 궁금한 분"
              desc="비슷한 등급 멤버들이 같은 질문에 어떻게 답하는지 들어보면, 표현이 폭발적으로 늘어요."
            />
            <PersonaCard
              icon={<Clock size={26} strokeWidth={1.6} />}
              title="실전 감각이 필요한 분"
              desc="혼자서는 시간 관리, 길이 조절이 잘 안 되시나요? 멤버 앞에서 답변하면 실전 그 자체."
            />
          </div>
        </Section>

        {/* ────────────────────────────────────────────
            WHY DIFFERENT — 차별점
        ──────────────────────────────────────────── */}
        <Section>
          <SectionLabel>다른 스터디와 뭐가 다른가요</SectionLabel>
          <div
            style={{
              padding: "20px 22px",
              background: "var(--bp-surface)",
              borderRadius: "var(--bp-radius-lg)",
              boxShadow: "var(--bp-shadow-sm)",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 14,
            }}
          >
            <Bullet
              icon={<MessagesSquare size={22} strokeWidth={1.6} />}
              title="멤버별 즉석 코칭"
              desc="규칙 기반이 아니라 답변 내용에 맞춰 멤버 한 명 한 명에게 코멘트가 제공돼요."
            />
            <Bullet
              icon={<Mic size={22} strokeWidth={1.6} />}
              title="실제 OPIc 출제 콤보"
              desc="시험에 자주 나오는 출제 콤보로 학습합니다."
            />
            <Bullet
              icon={<UserCheck size={22} strokeWidth={1.6} />}
              title="개인 목표 등급 반영"
              desc="멤버마다 본인 목표 등급으로 코칭. 그룹 평균에 맞추지 않아요."
            />
            <Bullet
              icon={<HeartHandshake size={22} strokeWidth={1.6} />}
              title="완전 무료"
              desc="결제도, 광고도 없어요. 부담 없이 시도해보세요."
            />
          </div>
        </Section>

        {/* ────────────────────────────────────────────
            CTA — 신청
        ──────────────────────────────────────────── */}
        <Section>
          <div
            style={{
              padding: "32px 28px",
              background: "var(--bp-tc)",
              color: "#fff",
              borderRadius: "var(--bp-radius-lg)",
              textAlign: "center",
              boxShadow: "var(--bp-shadow)",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 700,
                lineHeight: 1.3,
              }}
            >
              지금은 초대 멤버 한정으로 운영하고 있어요
            </h2>
            <p
              style={{
                margin: "12px auto 24px",
                maxWidth: 480,
                fontSize: 14,
                lineHeight: 1.7,
                opacity: 0.92,
              }}
            >
              모듈을 다듬는 중이라 소수 그룹부터 운영하고 있어요.
              <br />
              관심 있으시면 운영자에게 말씀해주세요. 다음 모집에 알려드릴게요.
            </p>
            <Link
              href="/support?tab=inquiry&prefill=opic-study"
              style={{
                display: "inline-block",
                padding: "13px 32px",
                borderRadius: 999,
                background: "#fff",
                color: "var(--bp-tc)",
                fontSize: 14,
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
              }}
            >
              운영자에게 문의하기 →
            </Link>
          </div>
        </Section>

      </div>
    </div>
  );
}

// ============================================================
// 내부 컴포넌트
// ============================================================

function Section({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <section
      style={{ display: "flex", flexDirection: "column", gap: 14, ...style }}
    >
      {children}
    </section>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.12em",
        color: "var(--bp-ink-3)",
        textTransform: "uppercase",
        marginBottom: 4,
      }}
    >
      {children}
    </div>
  );
}

function StepCard({
  num,
  title,
  desc,
}: {
  num: string;
  title: string;
  desc: string;
}) {
  return (
    <div
      style={{
        position: "relative",
        padding: "20px 18px",
        background: "var(--bp-surface)",
        borderRadius: "var(--bp-radius)",
        boxShadow: "var(--bp-shadow-sm)",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          background: "var(--bp-tc-tint)",
          color: "var(--bp-tc)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 700,
          marginBottom: 12,
        }}
      >
        {num}
      </div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: "var(--bp-ink)",
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 13,
          lineHeight: 1.6,
          color: "var(--bp-ink-2)",
        }}
      >
        {desc}
      </div>
    </div>
  );
}

function PersonaCard({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div
      style={{
        padding: "20px 18px",
        background: "var(--bp-surface-2)",
        borderRadius: "var(--bp-radius)",
      }}
    >
      <div style={{ color: "var(--bp-tc)", marginBottom: 12 }}>{icon}</div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "var(--bp-ink)",
          marginBottom: 6,
          lineHeight: 1.4,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 13,
          lineHeight: 1.6,
          color: "var(--bp-ink-2)",
        }}
      >
        {desc}
      </div>
    </div>
  );
}

function Bullet({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div style={{ color: "var(--bp-tc)", paddingTop: 2 }}>{icon}</div>
      <div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "var(--bp-ink)",
            marginBottom: 3,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.55,
            color: "var(--bp-ink-2)",
          }}
        >
          {desc}
        </div>
      </div>
    </div>
  );
}

function DotWrap({
  offset,
  children,
}: {
  offset: number;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        marginLeft: offset,
        borderRadius: 999,
        boxShadow: "0 0 0 3px var(--bp-bg)",
      }}
    >
      {children}
    </div>
  );
}
