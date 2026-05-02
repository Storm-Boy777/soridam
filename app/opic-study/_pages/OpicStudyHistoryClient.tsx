"use client";

/**
 * 오픽 스터디 학습 기록 — 클라이언트 컴포넌트
 *
 * 그룹 선택기 + 세션 timeline.
 * 디자인 자체 컴포넌트 활용 (HfPhone + BP 토큰).
 */

import { useRouter } from "next/navigation";
import {
  HfPhone,
  HfBody,
  HfCard,
  MbDot,
  Pill,
  SectionH,
  Tag,
} from "../_components/bp";

const CATEGORY_LABEL: Record<string, string> = {
  general: "일반",
  roleplay: "롤플레이",
  advance: "어드밴스",
};

interface SessionDisplay {
  id: string;
  dateLabel: string;
  topic: string;
  category: string | null;
  totalAnswers: number;
  memberCount: number;
  status: string;
  memberHighlights?: Array<{
    user_id: string;
    name: string;
    initial: string;
    color: "a" | "b" | "c" | "d";
    strength: string | null;
    improvement: string | null;
  }>;
}

interface Props {
  groups: Array<{ id: string; name: string; targetLevel: string }>;
  sessions: SessionDisplay[];
  selectedGroupId: string;
}

export function OpicStudyHistoryClient({ groups, sessions, selectedGroupId }: Props) {
  const router = useRouter();

  return (
    <div style={{ minHeight: "100dvh", display: "flex" }}>
      <div className="bp-only-mobile" style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <HistoryMobile
          groups={groups}
          sessions={sessions}
          selectedGroupId={selectedGroupId}
          router={router}
        />
      </div>
      <div className="bp-only-pc" style={{ flex: 1, minHeight: 0 }}>
        <HistoryPc
          groups={groups}
          sessions={sessions}
          selectedGroupId={selectedGroupId}
          router={router}
        />
      </div>
    </div>
  );
}

type HistoryRouter = ReturnType<typeof useRouter>;
interface HistoryShellProps extends Props {
  router: HistoryRouter;
}

function HistoryMobile({
  groups,
  sessions,
  selectedGroupId,
  router,
}: HistoryShellProps) {
  return (
    <HfPhone liveMode>
        {/* 헤더 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 20px",
            borderBottom: "1px solid var(--bp-line)",
            background: "var(--bp-bg)",
            flex: "0 0 auto",
          }}
        >
          <button
            onClick={() => router.push("/opic-study")}
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
            <span className="t-h3">학습 기록</span>
            <span className="t-micro ink-3">
              {groups.length === 0 ? "참여한 스터디 없음" : `${groups.length}개 스터디`}
            </span>
          </div>
        </div>

        <HfBody padding="20px">
          {/* 빈 상태 */}
          {groups.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "80px 16px",
                color: "var(--bp-ink-3)",
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
              <div className="t-h2" style={{ marginBottom: 6, color: "var(--bp-ink)" }}>
                아직 학습 기록이 없어요
              </div>
              <p className="t-sm" style={{ margin: 0, lineHeight: 1.6 }}>
                참여 중인 스터디 그룹이 없습니다.
              </p>
            </div>
          )}

          {/* 그룹 선택기 (그룹 2개 이상일 때) */}
          {groups.length > 1 && (
            <div
              style={{
                display: "flex",
                gap: 6,
                overflowX: "auto",
                marginBottom: 16,
                paddingBottom: 4,
              }}
            >
              {groups.map((g) => {
                const active = g.id === selectedGroupId;
                return (
                  <button
                    key={g.id}
                    onClick={() =>
                      router.push(`/opic-study/history?group=${g.id}`)
                    }
                    className={`bp-pill ${active ? "tc" : ""}`}
                    style={{
                      flexShrink: 0,
                      cursor: "pointer",
                      border: "none",
                      fontSize: 12,
                    }}
                  >
                    {g.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* 세션 빈 상태 */}
          {groups.length > 0 && sessions.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "60px 16px",
                color: "var(--bp-ink-3)",
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>🌱</div>
              <div className="t-sm">
                아직 진행한 세션이 없어요. 첫 세션을 시작해보세요!
              </div>
            </div>
          )}

          {/* 세션 timeline */}
          {sessions.length > 0 && (
            <>
              <SectionH>세션 ({sessions.length})</SectionH>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {sessions.map((s) => (
                  <HfCard
                    key={s.id}
                    padding={14}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      cursor: "pointer",
                    }}
                    onClick={() =>
                      router.push(`/opic-study/session/${s.id}`)
                    }
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span
                        className="t-num t-xs ink-3"
                        style={{ minWidth: 32, textAlign: "center" }}
                      >
                        {s.dateLabel}
                      </span>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                          flex: 1,
                        }}
                      >
                        <div
                          style={{ display: "flex", alignItems: "center", gap: 6 }}
                        >
                          <span className="t-sm" style={{ fontWeight: 600 }}>
                            {s.topic}
                          </span>
                          {s.category && (
                            <Tag tone="neutral" style={{ fontSize: 10 }}>
                              {CATEGORY_LABEL[s.category] ?? s.category}
                            </Tag>
                          )}
                        </div>
                        <span className="t-xs ink-3">
                          {s.totalAnswers}개 답변 · 멤버 {s.memberCount}명
                        </span>
                      </div>
                      {s.status === "completed" && (
                        <Pill tone="live" style={{ fontSize: 10 }}>
                          완료
                        </Pill>
                      )}
                      {s.status === "active" && (
                        <Pill tone="tc" style={{ fontSize: 10 }}>
                          진행 중
                        </Pill>
                      )}
                      {s.status === "abandoned" && (
                        <span className="t-xs ink-3">중단</span>
                      )}
                    </div>
                    {/* 멤버 요약 */}
                    {s.memberHighlights && s.memberHighlights.length > 0 && (
                      <div
                        style={{
                          paddingTop: 8,
                          borderTop: "1px solid var(--bp-line)",
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        {s.memberHighlights.map((h) => (
                          <div
                            key={h.user_id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <MbDot
                              color={h.color}
                              initial={h.initial}
                              size={20}
                              fontSize={9}
                            />
                            <span
                              className="t-xs"
                              style={{ fontWeight: 500, minWidth: 40 }}
                            >
                              {h.name}
                            </span>
                            {h.strength && (
                              <span
                                className="t-xs"
                                style={{ color: "var(--bp-good)", flex: 1 }}
                              >
                                ✓ {h.strength.slice(0, 18)}
                              </span>
                            )}
                            {h.improvement && (
                              <span
                                className="t-xs"
                                style={{ color: "var(--bp-tc)" }}
                              >
                                ⚠ {h.improvement.slice(0, 12)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </HfCard>
                ))}
              </div>
            </>
          )}
        </HfBody>
      </HfPhone>
  );
}

function HistoryPc({
  groups,
  sessions,
  selectedGroupId,
  router,
}: HistoryShellProps) {
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
          gap: 14,
          padding: "12px 24px",
          boxSizing: "border-box",
        }}
      >
        <button
          onClick={() => router.push("/opic-study")}
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
            학습 기록
          </span>
          <span className="t-sm ink-3">
            {groups.length === 0 ? "참여한 스터디 없음" : `${groups.length}개 스터디`}
          </span>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          width: "100%",
          maxWidth: 720,
          margin: "0 auto",
          padding: "32px 32px 48px",
          boxSizing: "border-box",
        }}
      >
        {/* 빈 상태 */}
        {groups.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "100px 16px",
              color: "var(--bp-ink-3)",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 14 }}>📭</div>
            <div className="t-h1" style={{ marginBottom: 8, color: "var(--bp-ink)" }}>
              아직 학습 기록이 없어요
            </div>
            <p className="t-body" style={{ margin: 0, lineHeight: 1.6 }}>
              참여 중인 스터디 그룹이 없습니다.
            </p>
          </div>
        )}

        {/* 그룹 선택기 */}
        {groups.length > 1 && (
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 20,
            }}
          >
            {groups.map((g) => {
              const active = g.id === selectedGroupId;
              return (
                <button
                  key={g.id}
                  onClick={() =>
                    router.push(`/opic-study/history?group=${g.id}`)
                  }
                  className={`bp-pill ${active ? "tc" : ""}`}
                  style={{
                    cursor: "pointer",
                    border: "none",
                    fontSize: 13,
                    padding: "6px 12px",
                  }}
                >
                  {g.name}
                </button>
              );
            })}
          </div>
        )}

        {/* 빈 세션 */}
        {groups.length > 0 && sessions.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "80px 16px",
              color: "var(--bp-ink-3)",
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
            <p className="t-body" style={{ margin: 0 }}>
              아직 진행한 세션이 없어요. 첫 세션을 시작해보세요!
            </p>
          </div>
        )}

        {/* 세션 timeline */}
        {sessions.length > 0 && (
          <>
            <SectionH style={{ marginBottom: 14 }}>세션 ({sessions.length})</SectionH>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {sessions.map((s) => (
                <HfCard
                  key={s.id}
                  padding={18}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    router.push(`/opic-study/session/${s.id}`)
                  }
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span
                      className="t-num t-sm ink-3"
                      style={{
                        minWidth: 48,
                        textAlign: "center",
                        fontWeight: 600,
                      }}
                    >
                      {s.dateLabel}
                    </span>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        flex: 1,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span className="t-h3" style={{ fontWeight: 600 }}>
                          {s.topic}
                        </span>
                        {s.category && (
                          <Tag tone="neutral" style={{ fontSize: 10 }}>
                            {CATEGORY_LABEL[s.category] ?? s.category}
                          </Tag>
                        )}
                      </div>
                      <span className="t-sm ink-3">
                        {s.totalAnswers}개 답변 · 멤버 {s.memberCount}명
                      </span>
                    </div>
                    {s.status === "completed" && (
                      <Pill tone="live" style={{ fontSize: 11 }}>
                        완료
                      </Pill>
                    )}
                    {s.status === "active" && (
                      <Pill tone="tc" style={{ fontSize: 11 }}>
                        진행 중
                      </Pill>
                    )}
                    {s.status === "abandoned" && (
                      <span className="t-xs ink-3">중단</span>
                    )}
                  </div>
                  {/* 멤버 요약 */}
                  {s.memberHighlights && s.memberHighlights.length > 0 && (
                    <div
                      style={{
                        paddingTop: 12,
                        borderTop: "1px solid var(--bp-line)",
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        gap: 8,
                      }}
                    >
                      {s.memberHighlights.map((h) => (
                        <div
                          key={h.user_id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <MbDot
                            color={h.color}
                            initial={h.initial}
                            size={24}
                            fontSize={10}
                          />
                          <span
                            className="t-xs"
                            style={{ fontWeight: 600, minWidth: 60 }}
                          >
                            {h.name}
                          </span>
                          {h.strength && (
                            <span
                              className="t-xs"
                              style={{
                                color: "var(--bp-good)",
                                flex: 1,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              ✓ {h.strength}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </HfCard>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
