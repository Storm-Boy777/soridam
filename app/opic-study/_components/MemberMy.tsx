"use client";

/**
 * 오픽 스터디 — 마이페이지
 *
 * 프로필 + 학습 통계 + 학습 이력 + 빠른 액션.
 * 디자인: max-width 1024 (멤버 홈/Lobby/History와 통일)
 */

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  History as HistoryIcon,
  Users,
  Settings,
  MessagesSquare,
  Calendar,
  Sparkles,
} from "lucide-react";

interface HistoryItem {
  name: string;
  date: string;
  done: boolean;
}

interface Props {
  userName: string;
  userInitial: string;
  /** "오픽 5월 집중 스터디 · 12회 함께함" 같은 라벨 */
  groupLabel: string;
  historyItems: HistoryItem[];
}

export function MemberMy({
  userName,
  userInitial,
  groupLabel,
  historyItems,
}: Props) {
  const router = useRouter();

  const totalSessions = historyItems.length;
  // 토픽별 빈도 (자주 학습한 카테고리)
  const topicFreq = historyItems.reduce<Record<string, number>>((acc, it) => {
    acc[it.name] = (acc[it.name] ?? 0) + 1;
    return acc;
  }, {});
  const topTopicEntry = Object.entries(topicFreq).sort(
    (a, b) => b[1] - a[1]
  )[0];
  const topTopic = topTopicEntry
    ? `${topTopicEntry[0]} (${topTopicEntry[1]}회)`
    : "─";

  return (
    <div
      className="bp-scope"
      style={{
        minHeight: "100dvh",
        background: "var(--bp-bg)",
        color: "var(--bp-ink)",
        fontFamily: "var(--bp-font)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          width: "100%",
          background: "var(--bp-bg)",
          borderBottom: "1px solid var(--bp-line)",
          padding: "14px 24px",
          flex: "0 0 auto",
        }}
      >
        <div
          style={{
            maxWidth: 1024,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <button
            onClick={() => router.push("/opic-study")}
            aria-label="뒤로"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "transparent",
              border: "none",
              color: "var(--bp-ink-2)",
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--bp-ink)",
            }}
          >
            마이페이지
          </span>
        </div>
      </div>

      {/* 본문 */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "28px 24px 80px",
        }}
      >
        <div
          style={{
            maxWidth: 1024,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {/* 프로필 카드 */}
          <div
            style={{
              padding: "32px 28px",
              background:
                "linear-gradient(135deg, var(--bp-surface) 0%, var(--bp-tc-tint) 100%)",
              borderRadius: "var(--bp-radius-lg)",
              boxShadow: "var(--bp-shadow)",
              display: "flex",
              alignItems: "center",
              gap: 20,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 999,
                background: "var(--bp-tc)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 30,
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              {userInitial}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: "var(--bp-ink)",
                  marginBottom: 4,
                }}
              >
                {userName}님
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--bp-ink-2)",
                  lineHeight: 1.5,
                }}
              >
                {groupLabel}
              </div>
            </div>
          </div>

          {/* 학습 통계 3개 */}
          <div>
            <SectionLabel>학습 통계</SectionLabel>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
              }}
            >
              <StatCard
                icon={<Calendar size={16} />}
                label="참여 세션"
                value={`${totalSessions}회`}
              />
              <StatCard
                icon={<MessagesSquare size={16} />}
                label="가장 자주 학습한 토픽"
                value={topTopic}
              />
              <StatCard
                icon={<Sparkles size={16} />}
                label="저장한 표현"
                value="─"
                note="V2 준비 중"
              />
            </div>
          </div>

          {/* 학습 이력 */}
          <div>
            <SectionLabel>학습 이력</SectionLabel>
            {historyItems.length === 0 ? (
              <div
                style={{
                  padding: "40px 20px",
                  background: "var(--bp-surface)",
                  borderRadius: "var(--bp-radius)",
                  boxShadow: "var(--bp-shadow-sm)",
                  textAlign: "center",
                  color: "var(--bp-ink-3)",
                  fontSize: 13,
                }}
              >
                아직 참여한 세션이 없어요. 첫 세션을 시작해보세요!
              </div>
            ) : (
              <div
                style={{
                  padding: "16px 18px",
                  background: "var(--bp-surface)",
                  borderRadius: "var(--bp-radius)",
                  boxShadow: "var(--bp-shadow-sm)",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {historyItems.map((it, idx) => (
                  <span
                    key={idx}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 12px",
                      borderRadius: 999,
                      background: "var(--bp-surface-2)",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--bp-ink-2)",
                    }}
                  >
                    <span
                      className="t-num"
                      style={{ color: "var(--bp-ink-3)", fontSize: 11 }}
                    >
                      {it.date}
                    </span>
                    <span style={{ color: "var(--bp-ink)" }}>{it.name}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 빠른 액션 */}
          <div>
            <SectionLabel>빠른 이동</SectionLabel>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 10,
              }}
            >
              <ActionCard
                href="/opic-study/history"
                icon={<HistoryIcon size={18} strokeWidth={1.6} />}
                title="지난 모임 이력"
                desc="이전 세션 답변과 코칭 다시 보기"
              />
              <ActionCard
                href="/opic-study"
                icon={<Users size={18} strokeWidth={1.6} />}
                title="스터디 홈"
                desc="오늘 모임 상태 확인"
              />
              <ActionCard
                href="/mypage"
                icon={<Settings size={18} strokeWidth={1.6} />}
                title="계정 설정"
                desc="목표 등급 · 시험일 · 알림"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 내부 컴포넌트
// ============================================================

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.12em",
        color: "var(--bp-ink-3)",
        textTransform: "uppercase",
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div
      style={{
        padding: "18px 20px",
        background: "var(--bp-surface)",
        borderRadius: "var(--bp-radius)",
        boxShadow: "var(--bp-shadow-sm)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "var(--bp-ink-3)",
          fontSize: 12,
          marginBottom: 8,
        }}
      >
        {icon}
        <span>{label}</span>
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: "var(--bp-ink)",
          lineHeight: 1.3,
        }}
      >
        {value}
      </div>
      {note && (
        <div
          style={{
            fontSize: 11,
            color: "var(--bp-ink-4)",
            marginTop: 4,
          }}
        >
          {note}
        </div>
      )}
    </div>
  );
}

function ActionCard({
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
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      style={{
        display: "flex",
        gap: 12,
        padding: "16px 18px",
        background: "var(--bp-surface)",
        borderRadius: "var(--bp-radius)",
        boxShadow: "var(--bp-shadow-sm)",
        border: "none",
        textAlign: "left",
        cursor: "pointer",
        alignItems: "center",
        fontFamily: "inherit",
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
    </button>
  );
}
