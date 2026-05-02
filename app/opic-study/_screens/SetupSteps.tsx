"use client";

/**
 * Step 1~5 — 세션 셋업 (모드 → 카테고리 → 주제 → 콤보 → 코치 가이드)
 *
 * 디자인: docs/디자인/opic/project/hf-step1.jsx + hf-front.jsx
 */

import { useState } from "react";
import {
  HfPhone,
  HfStatusBar,
  HfHeader,
  HfStepBar,
  HfBody,
  HfFooter,
  HfButton,
  HfCard,
  ModeCard,
  MbDot,
  MbStack,
  CoachAvatar,
  Pill,
  Tag,
  Insight,
  SectionH,
  PcStepShell,
} from "../_components/bp";
import {
  MOCK_GROUP,
  MOCK_MEMBERS_BASE,
  MOCK_CATEGORIES,
  MOCK_TOPICS,
  MOCK_COMBOS,
  MOCK_GUIDE_INTRO,
  MOCK_GUIDE_POINTS,
  type CategoryItem,
  type ComboItem,
} from "./_mock";

// ============================================================
// Step 1 · 모드 선택
// ============================================================

interface Step1Props {
  groupName?: string;
  memberCount?: number;
  onStart?: (mode: "online" | "offline") => void;
  liveMode?: boolean;
}

/** Step 1 — 모바일/PC 분기 wrapper */
export function Step1(props: Step1Props) {
  return (
    <>
      <div className="bp-only-mobile" style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <Step1Mobile {...props} />
      </div>
      <div className="bp-only-pc" style={{ flex: 1, minHeight: 0 }}>
        <Step1Pc {...props} />
      </div>
    </>
  );
}

function Step1Mobile({
  groupName = MOCK_GROUP.name,
  memberCount = MOCK_GROUP.memberCount,
  onStart,
  liveMode = false,
}: Step1Props) {
  const [mode, setMode] = useState<"online" | "offline">("online");

  return (
    <HfPhone liveMode={liveMode}>
      {!liveMode && <HfStatusBar />}
      <HfHeader
        title={groupName}
        sub={`멤버 ${memberCount}명 · 세션 룸`}
        onBack={() => undefined}
      />

      <HfBody padding="24px 20px 0">
        <HfStepBar now={1} className="bp-step-bar-pad-zero" />
        <div style={{ height: 24 }} />

        <h1 className="t-display" style={{ margin: 0, marginBottom: 6 }}>
          오늘 어떻게
          <br />
          모일까요?
        </h1>
        <p className="t-body ink-3" style={{ margin: 0, marginBottom: 24 }}>
          학습 중에도 언제든 바꿀 수 있어요.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <ModeCard
            selected={mode === "online"}
            onClick={() => setMode("online")}
            icon="📡"
            title="온라인"
            desc="화상으로 모여서 함께 답변하고 코칭을 받아요"
            pills={
              <>
                <Pill>화상 통화</Pill>
                <Pill>실시간 동기화</Pill>
              </>
            }
          />
          <ModeCard
            selected={mode === "offline"}
            onClick={() => setMode("offline")}
            icon="👥"
            title="오프라인"
            desc="한 공간에 모여서 함께 답변하고 코칭을 받아요"
            pills={
              <>
                <Pill>대면 모임</Pill>
                <Pill>한 화면 공유</Pill>
              </>
            }
          />
        </div>

        <HfCard
          padding={14}
          style={{
            marginTop: 20,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <MbStack
            members={MOCK_MEMBERS_BASE.map((m) => ({
              color: m.key,
              initial: m.initial,
              live: true,
            }))}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
            <span className="t-sm" style={{ fontWeight: 600 }}>
              {memberCount}명 모두 준비 완료
            </span>
            <span className="t-xs ink-3">
              {MOCK_MEMBERS_BASE.map((m) => m.name).join(" · ")}
            </span>
          </div>
        </HfCard>
      </HfBody>

      <HfFooter>
        <HfButton variant="primary" size="lg" full onClick={() => onStart?.(mode)}>
          시작하기
        </HfButton>
      </HfFooter>
    </HfPhone>
  );
}

function Step1Pc({
  groupName = MOCK_GROUP.name,
  memberCount = MOCK_GROUP.memberCount,
  onStart,
}: Step1Props) {
  const [mode, setMode] = useState<"online" | "offline">("online");

  return (
    <PcStepShell
      crumb={[groupName, "세션 룸"]}
      stepNow={1}
    >
      <div
        className="bp-pc-content"
        style={{ justifyContent: "center", maxWidth: 880 }}
      >
        <h1 className="t-display" style={{ margin: "0 0 8px", fontSize: 36 }}>
          오늘 어떻게 모일까요?
        </h1>
        <p className="t-body ink-3" style={{ margin: "0 0 32px" }}>
          학습 중에도 언제든 바꿀 수 있어요.
        </p>

        <div className="bp-pc-grid-2">
          {[
            {
              key: "online" as const,
              icon: "📡",
              name: "온라인",
              desc: "화상으로 모여서 함께 답변하고 코칭을 받아요",
              tags: ["화상 통화", "실시간 동기화"],
            },
            {
              key: "offline" as const,
              icon: "👥",
              name: "오프라인",
              desc: "한 공간에 모여서 함께 답변하고 코칭을 받아요",
              tags: ["대면 모임", "한 화면 공유"],
            },
          ].map((m) => {
            const selected = mode === m.key;
            return (
              <div
                key={m.key}
                className={`bp-mode-card ${selected ? "selected" : ""}`}
                onClick={() => setMode(m.key)}
                role="button"
                tabIndex={0}
                style={{ padding: 28 }}
              >
                <div className="check">✓</div>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    background: selected
                      ? "var(--bp-tc)"
                      : "var(--bp-surface-2)",
                    color: selected ? "white" : "var(--bp-ink-2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 26,
                    marginBottom: 16,
                    transition: "all 0.15s",
                  }}
                >
                  {m.icon}
                </div>
                <div className="t-h1" style={{ marginBottom: 6 }}>
                  {m.name}
                </div>
                <p
                  className="t-body ink-3"
                  style={{ margin: "0 0 12px", lineHeight: 1.5 }}
                >
                  {m.desc}
                </p>
                <div style={{ display: "flex", gap: 6 }}>
                  {m.tags.map((t) => (
                    <Pill key={t}>{t}</Pill>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* 멤버 준비 스트립 + 시작하기 버튼 (인라인) */}
        <HfCard
          padding={16}
          style={{
            marginTop: 24,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <MbStack
            members={MOCK_MEMBERS_BASE.map((m) => ({
              color: m.key,
              initial: m.initial,
              live: true,
            }))}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              flex: 1,
            }}
          >
            <span className="t-sm" style={{ fontWeight: 600 }}>
              {memberCount}명 모두 준비 완료
            </span>
            <span className="t-xs ink-3">
              {MOCK_MEMBERS_BASE.map((m) => m.name).join(" · ")}
            </span>
          </div>
          <HfButton
            variant="primary"
            size="lg"
            onClick={() => onStart?.(mode)}
            style={{ minWidth: 140 }}
          >
            시작하기 →
          </HfButton>
        </HfCard>
      </div>
    </PcStepShell>
  );
}

// ============================================================
// Step 2 · 카테고리
// ============================================================

interface Step2Props {
  categories?: CategoryItem[];
  onNext?: (categoryKey: string) => void;
  liveMode?: boolean;
  groupName?: string;
}

/** Step 2 — 모바일/PC 분기 wrapper */
export function Step2(props: Step2Props) {
  return (
    <>
      <div className="bp-only-mobile" style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <Step2Mobile {...props} />
      </div>
      <div className="bp-only-pc" style={{ flex: 1, minHeight: 0 }}>
        <Step2Pc {...props} />
      </div>
    </>
  );
}

function Step2Mobile({
  categories = MOCK_CATEGORIES,
  onNext,
  liveMode = false,
}: Step2Props) {
  const [sel, setSel] = useState<string>("general");

  return (
    <HfPhone liveMode={liveMode}>
      {!liveMode && <HfStatusBar />}
      <HfHeader title="카테고리" sub="오늘 어떤 결로 갈까요?" onBack={() => undefined} />
      <HfStepBar now={2} />

      <HfBody padding="20px">
        <h1 className="t-h1" style={{ margin: "0 0 6px" }}>
          어떤 카테고리로 모일까요?
        </h1>
        <p className="t-sm ink-3" style={{ margin: "0 0 20px" }}>
          처음이면 일반 주제부터 시작하는 걸 추천해요.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {categories.map((c) => (
            <ModeCard
              key={c.key}
              selected={sel === c.key}
              onClick={() => setSel(c.key)}
              icon={c.icon}
              title={c.name}
              desc={c.desc}
              rightTag={c.tag ? <Pill tone="tc">{c.tag}</Pill> : null}
            />
          ))}
        </div>
      </HfBody>

      <HfFooter>
        <HfButton variant="primary" size="lg" full onClick={() => onNext?.(sel)}>
          다음 →
        </HfButton>
      </HfFooter>
    </HfPhone>
  );
}

function Step2Pc({ categories = MOCK_CATEGORIES, onNext, groupName = MOCK_GROUP.name }: Step2Props) {
  const [sel, setSel] = useState<string>("general");

  return (
    <PcStepShell
      onBack={() => undefined}
      crumb={[groupName, "카테고리"]}
      stepNow={2}
    >
      <div className="bp-pc-content">
        <h1
          className="t-display"
          style={{ margin: "0 0 8px", fontSize: 32 }}
        >
          어떤 카테고리로 모일까요?
        </h1>
        <p className="t-body ink-3" style={{ margin: "0 0 28px" }}>
          처음이면 일반 주제부터 시작하는 걸 추천해요.
        </p>

        <div className="bp-pc-grid-3">
          {categories.map((c) => {
            const selected = sel === c.key;
            return (
              <div
                key={c.key}
                className={`bp-mode-card ${selected ? "selected" : ""}`}
                onClick={() => setSel(c.key)}
                role="button"
                tabIndex={0}
                style={{ padding: 24 }}
              >
                <div className="check">✓</div>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: selected
                      ? "var(--bp-tc)"
                      : "var(--bp-surface-2)",
                    color: selected ? "white" : "var(--bp-ink-2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    marginBottom: 14,
                    transition: "all 0.15s",
                  }}
                >
                  {c.icon}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 6,
                  }}
                >
                  <span className="t-h2">{c.name}</span>
                  {c.tag && <Pill tone="tc">{c.tag}</Pill>}
                </div>
                <p
                  className="t-sm ink-3"
                  style={{ margin: 0, lineHeight: 1.55 }}
                >
                  {c.desc}
                </p>
              </div>
            );
          })}
        </div>

        <div className="bp-pc-actions">
          <HfButton
            variant="primary"
            size="lg"
            onClick={() => onNext?.(sel)}
            style={{ minWidth: 160 }}
          >
            다음 →
          </HfButton>
        </div>
      </div>
    </PcStepShell>
  );
}

// ============================================================
// Step 3 · 주제
// ============================================================

interface Step3Props {
  category?: string;
  /** 외부에서 전달된 토픽 목록 (실제 데이터). 없으면 mock 사용 */
  topics?: typeof MOCK_TOPICS;
  loading?: boolean;
  /** 선택된 topic의 key 또는 name. 실제 라우트에서는 한글 topic name */
  onNext?: (topicKey: string) => void;
  liveMode?: boolean;
  groupName?: string;
}

/** Step 3 — 모바일/PC 분기 wrapper */
export function Step3(props: Step3Props) {
  return (
    <>
      <div className="bp-only-mobile" style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <Step3Mobile {...props} />
      </div>
      <div className="bp-only-pc" style={{ flex: 1, minHeight: 0 }}>
        <Step3Pc {...props} />
      </div>
    </>
  );
}

function Step3Mobile({
  category: _category,
  topics = MOCK_TOPICS,
  loading = false,
  onNext,
  liveMode = false,
}: Step3Props) {
  const [sel, setSel] = useState<string>(topics[0]?.key ?? "");

  return (
    <HfPhone liveMode={liveMode}>
      {!liveMode && <HfStatusBar />}
      <HfHeader title="주제 선택" sub="자주 출제되는 순" onBack={() => undefined} />
      <HfStepBar now={3} />

      <HfBody padding="20px">
        <h1 className="t-h1" style={{ margin: "0 0 6px" }}>
          오늘 어떤 주제로?
        </h1>
        <p className="t-sm ink-3" style={{ margin: "0 0 16px" }}>
          최근에 안 한 주제일수록 좋아요.
        </p>

        {/* search (시각용) */}
        <div
          style={{
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 14,
            background: "var(--bp-surface-2)",
            borderRadius: "var(--bp-radius)",
          }}
        >
          <span style={{ color: "var(--bp-ink-3)", fontSize: 14 }}>🔍</span>
          <span className="t-sm ink-3">주제 검색…</span>
        </div>

        {/* 빈 상태 */}
        {!loading && topics.length === 0 && (
          <div
            style={{
              padding: "32px 16px",
              textAlign: "center",
              color: "var(--bp-ink-3)",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>🌱</div>
            <p className="t-sm" style={{ margin: 0 }}>
              아직 출제된 주제가 없어요.
            </p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {topics.map((t) => {
            const selected = sel === t.key;
            return (
              <div
                key={t.key}
                onClick={() => setSel(t.key)}
                style={{
                  padding: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  cursor: "pointer",
                  borderRadius: "var(--bp-radius)",
                  border: selected ? "1.5px solid var(--bp-tc)" : "1.5px solid transparent",
                  background: selected ? "var(--bp-tc-tint)" : "var(--bp-surface)",
                  boxShadow: selected
                    ? "0 0 0 4px rgba(201,100,66,0.08)"
                    : "var(--bp-shadow-sm)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    flex: 1,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="t-sm" style={{ fontWeight: 600 }}>
                      {t.name}
                    </span>
                    {t.recent && <Pill style={{ fontSize: 10 }}>최근 학습</Pill>}
                  </div>
                  <span className="t-xs ink-3">{t.meta}</span>
                </div>
                {selected && (
                  <span style={{ color: "var(--bp-tc)", fontWeight: 700 }}>✓</span>
                )}
              </div>
            );
          })}
        </div>
      </HfBody>

      <HfFooter>
        <HfButton variant="primary" size="lg" full onClick={() => onNext?.(sel)}>
          다음 →
        </HfButton>
      </HfFooter>
    </HfPhone>
  );
}

function Step3Pc({
  category: _category,
  topics = MOCK_TOPICS,
  loading = false,
  onNext,
  groupName = MOCK_GROUP.name,
}: Step3Props) {
  const [sel, setSel] = useState<string>(topics[0]?.key ?? "");

  return (
    <PcStepShell
      onBack={() => undefined}
      crumb={[groupName, "카테고리", "주제 선택"]}
      stepNow={3}
    >
      <div className="bp-pc-content tight">
        <h1 className="t-h1" style={{ margin: "0 0 6px" }}>
          오늘 어떤 주제로?
        </h1>
        <p className="t-sm ink-3" style={{ margin: "0 0 18px" }}>
          최근에 안 한 주제일수록 좋아요.
        </p>

        {/* 검색 (시각용) */}
        <HfCard
          padding={"12px 16px"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 16,
            background: "var(--bp-surface-2)",
            boxShadow: "none",
          }}
        >
          <span style={{ color: "var(--bp-ink-3)" }}>🔍</span>
          <span className="t-sm ink-3">주제 검색…</span>
        </HfCard>

        {/* 빈 상태 */}
        {!loading && topics.length === 0 && (
          <div
            style={{
              padding: "60px 16px",
              textAlign: "center",
              color: "var(--bp-ink-3)",
              flex: 1,
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
            <p className="t-body" style={{ margin: 0 }}>
              아직 출제된 주제가 없어요.
            </p>
          </div>
        )}

        <div
          className="bp-pc-grid-4"
          style={{ flex: 1, alignContent: "start" }}
        >
          {topics.map((t) => {
            const selected = sel === t.key;
            return (
              <HfCard
                key={t.key}
                onClick={() => setSel(t.key)}
                padding={16}
                style={{
                  cursor: "pointer",
                  border: selected
                    ? "1.5px solid var(--bp-tc)"
                    : "1.5px solid transparent",
                  background: selected
                    ? "var(--bp-tc-tint)"
                    : "var(--bp-surface)",
                  boxShadow: selected
                    ? "0 0 0 4px rgba(201,100,66,0.08)"
                    : "var(--bp-shadow-sm)",
                  transition: "all 0.15s",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <span className="t-h3">{t.name}</span>
                  {selected && (
                    <span
                      style={{ color: "var(--bp-tc)", fontWeight: 700 }}
                    >
                      ✓
                    </span>
                  )}
                </div>
                <div
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <span className="t-xs ink-3">{t.meta}</span>
                  {t.recent && (
                    <Pill style={{ fontSize: 10 }}>최근 학습</Pill>
                  )}
                </div>
              </HfCard>
            );
          })}
        </div>

        <div className="bp-pc-actions">
          <HfButton
            variant="primary"
            size="lg"
            onClick={() => onNext?.(sel)}
            style={{ minWidth: 160 }}
            disabled={!sel || topics.length === 0}
          >
            다음 →
          </HfButton>
        </div>
      </div>
    </PcStepShell>
  );
}

// ============================================================
// Step 4 · 콤보
// ============================================================

interface Step4Props {
  topic?: string;
  /** 외부에서 전달된 콤보 목록. 없으면 mock */
  combos?: ComboItem[];
  loading?: boolean;
  /** 선택된 콤보 객체 전달 (sig + qids 포함) */
  onNext?: (combo: ComboItem) => void;
  liveMode?: boolean;
  groupName?: string;
}

/** Step 4 — 모바일/PC 분기 wrapper */
export function Step4(props: Step4Props) {
  return (
    <>
      <div className="bp-only-mobile" style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <Step4Mobile {...props} />
      </div>
      <div className="bp-only-pc" style={{ flex: 1, minHeight: 0 }}>
        <Step4Pc {...props} />
      </div>
    </>
  );
}

function Step4Mobile({
  topic = "음악",
  combos = MOCK_COMBOS,
  loading = false,
  onNext,
  liveMode = false,
}: Step4Props) {
  const [sel, setSel] = useState<string>(combos[0]?.key ?? "");

  return (
    <HfPhone liveMode={liveMode}>
      {!liveMode && <HfStatusBar />}
      <HfHeader
        title="콤보 선택"
        sub={`${topic} · 3개 질문 묶음`}
        onBack={() => undefined}
      />
      <HfStepBar now={4} />

      <HfBody padding="20px">
        <h1 className="t-h1" style={{ margin: "0 0 6px" }}>
          어떤 콤보로?
        </h1>
        <p className="t-sm ink-3" style={{ margin: "0 0 16px" }}>
          콤보 = 함께 출제되는 3개 질문 묶음이에요.
        </p>

        {/* 빈 상태 */}
        {!loading && combos.length === 0 && (
          <div
            style={{
              padding: "32px 16px",
              textAlign: "center",
              color: "var(--bp-ink-3)",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>🌱</div>
            <p className="t-sm" style={{ margin: 0 }}>
              이 토픽으로 출제된 콤보가 아직 없어요.
            </p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {combos.map((c, idx) => {
            const selected = sel === c.key;
            return (
              <div
                key={c.key}
                onClick={() => setSel(c.key)}
                style={{
                  padding: 16,
                  cursor: "pointer",
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
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="t-h3">콤보 {idx + 1}</span>
                    <Pill tone="tc" style={{ fontSize: 10 }}>
                      {c.tag}
                    </Pill>
                  </div>
                  {c.learned && <Pill style={{ fontSize: 10 }}>이미 학습</Pill>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {c.questions.map((q: string, i: number) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "flex-start",
                      }}
                    >
                      <span
                        className="t-num t-xs"
                        style={{ color: "var(--bp-ink-3)", minWidth: 14 }}
                      >
                        Q{i + 1}
                      </span>
                      <span
                        className="t-sm"
                        style={{ color: "var(--bp-ink-2)", lineHeight: 1.5 }}
                      >
                        {q}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </HfBody>

      <HfFooter>
        <HfButton
          variant="primary"
          size="lg"
          full
          onClick={() => {
            const found = combos.find((c) => c.key === sel);
            if (found) onNext?.(found);
          }}
          disabled={!sel || combos.length === 0}
        >
          이 콤보로 시작 →
        </HfButton>
      </HfFooter>
    </HfPhone>
  );
}

function Step4Pc({
  topic = "음악",
  combos = MOCK_COMBOS,
  loading = false,
  onNext,
  groupName = MOCK_GROUP.name,
}: Step4Props) {
  const [sel, setSel] = useState<string>(combos[0]?.key ?? "");

  return (
    <PcStepShell
      onBack={() => undefined}
      crumb={[groupName, topic, "콤보 선택"]}
      stepNow={4}
    >
      <div className="bp-pc-content tight">
        <h1 className="t-h1" style={{ margin: "0 0 6px" }}>
          어떤 콤보로?
        </h1>
        <p className="t-sm ink-3" style={{ margin: "0 0 18px" }}>
          콤보 = 함께 출제되는 3개 질문 묶음이에요.
        </p>

        {/* 빈 상태 */}
        {!loading && combos.length === 0 && (
          <div
            style={{
              padding: "60px 16px",
              textAlign: "center",
              color: "var(--bp-ink-3)",
              flex: 1,
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
            <p className="t-body" style={{ margin: 0 }}>
              이 토픽으로 출제된 콤보가 아직 없어요.
            </p>
          </div>
        )}

        <div className="bp-pc-grid-3">
          {combos.map((c, idx) => {
            const selected = sel === c.key;
            return (
              <HfCard
                key={c.key}
                onClick={() => setSel(c.key)}
                padding={20}
                style={{
                  cursor: "pointer",
                  border: selected
                    ? "1.5px solid var(--bp-tc)"
                    : "1.5px solid transparent",
                  background: selected
                    ? "var(--bp-tc-tint)"
                    : "var(--bp-surface)",
                  boxShadow: selected
                    ? "0 0 0 4px rgba(201,100,66,0.08)"
                    : "var(--bp-shadow-sm)",
                  transition: "all 0.15s",
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
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span className="t-h2">
                      {c.frequency && c.frequency >= 3 ? "🔥 " : c.frequency === 2 ? "⭐ " : ""}
                      콤보 {idx + 1}
                    </span>
                    <Pill tone="tc" style={{ fontSize: 10 }}>
                      {c.tag}
                    </Pill>
                  </div>
                  {c.learned && (
                    <Pill style={{ fontSize: 10 }}>이미 학습</Pill>
                  )}
                </div>

                {/* 빈도 정보 (실데이터일 때만) */}
                {c.frequency !== undefined && c.appearancePct !== undefined && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 12,
                    }}
                  >
                    <span
                      className="t-num t-xs"
                      style={{
                        color: "var(--bp-tc)",
                        fontWeight: 600,
                      }}
                    >
                      {c.frequency}회 출제
                    </span>
                    <span className="t-xs ink-3">
                      ({c.appearancePct.toFixed(0)}%)
                    </span>
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {c.questions.map((q: string, i: number) => {
                    const meta = c.questionMeta?.[i];
                    return (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "flex-start",
                        }}
                      >
                        <span
                          className="t-num t-xs"
                          style={{
                            color: "var(--bp-ink-3)",
                            minWidth: 18,
                          }}
                        >
                          Q{i + 1}
                        </span>
                        <span
                          className="t-sm"
                          style={{
                            color: "var(--bp-ink-2)",
                            lineHeight: 1.5,
                            flex: 1,
                          }}
                        >
                          {q}
                        </span>
                        {meta && (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-end",
                              gap: 2,
                              flexShrink: 0,
                            }}
                          >
                            <span
                              className="t-num t-xs"
                              style={{
                                color: "var(--bp-ink-3)",
                                fontWeight: 600,
                              }}
                            >
                              {meta.appearancePct.toFixed(0)}%
                            </span>
                            {meta.studiedByUser && (
                              <span
                                className="t-xs"
                                style={{
                                  color: "var(--bp-good)",
                                  fontWeight: 600,
                                }}
                              >
                                ✓ 학습
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </HfCard>
            );
          })}
        </div>

        <div className="bp-pc-actions">
          <HfButton
            variant="primary"
            size="lg"
            onClick={() => {
              const found = combos.find((c) => c.key === sel);
              if (found) onNext?.(found);
            }}
            disabled={!sel || combos.length === 0}
            style={{ minWidth: 200 }}
          >
            이 콤보로 시작 →
          </HfButton>
        </div>
      </div>
    </PcStepShell>
  );
}

// ============================================================
// Step 5 · AI 스터디 코치 가이드
// ============================================================

interface Step5Props {
  topic?: string;
  level?: string;
  appearancePct?: number;
  points?: typeof MOCK_GUIDE_POINTS;
  /** 외부에서 전달된 가이드 텍스트 (선택) */
  guideText?: string | null;
  onStart?: () => void;
  liveMode?: boolean;
  groupName?: string;
}

/** Step 5 — 모바일/PC 분기 wrapper */
export function Step5(props: Step5Props) {
  return (
    <>
      <div className="bp-only-mobile" style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <Step5Mobile {...props} />
      </div>
      <div className="bp-only-pc" style={{ flex: 1, minHeight: 0 }}>
        <Step5Pc {...props} />
      </div>
    </>
  );
}

function Step5Mobile({
  topic = "음악",
  level = MOCK_GROUP.level,
  appearancePct = MOCK_GUIDE_INTRO.appearancePct,
  points = MOCK_GUIDE_POINTS,
  guideText,
  onStart,
  liveMode = false,
}: Step5Props) {
  return (
    <HfPhone liveMode={liveMode}>
      {!liveMode && <HfStatusBar />}
      <HfHeader
        title="시작 전 가이드"
        sub={`${topic} 콤보 · ${level}`}
        onBack={() => undefined}
      />
      <HfStepBar now={5} />

      <HfBody padding="24px 20px 20px">
        {/* Coach intro */}
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <CoachAvatar size="lg" />
          <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
            <span className="t-h3">AI 스터디 코치</span>
            <span className="t-xs ink-3">오늘의 학습 인트로</span>
          </div>
        </div>

        {/* Combo summary */}
        <Insight style={{ marginBottom: 16 }}>
          <span className="t-xs ink-3" style={{ marginBottom: 4, display: "block" }}>
            오늘의 콤보
          </span>
          <div className="t-h2" style={{ marginBottom: 8 }}>
            {topic} · {level}
          </div>
          <p
            className="t-sm"
            style={{ margin: 0, lineHeight: 1.6, color: "var(--bp-ink)", whiteSpace: "pre-wrap" }}
          >
            {guideText ? (
              guideText
            ) : (
              <>
                이 콤보는 일반 주제 자리에서 <b>{appearancePct}% 확률</b>로 등장하는 정형화된 패턴이에요.
              </>
            )}
          </p>
        </Insight>

        {/* Today's points */}
        <SectionH>오늘 함께 배울 포인트</SectionH>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
          {points.map((p, i) => (
            <HfCard
              key={i}
              padding={14}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <span
                className="t-num"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 8,
                  background: "var(--bp-tc-tint)",
                  color: "var(--bp-tc)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                <Tag tone="good" style={{ fontSize: 10, alignSelf: "flex-start" }}>
                  {p.tag}
                </Tag>
                <span
                  className="t-sm"
                  style={{ lineHeight: 1.55, color: "var(--bp-ink)" }}
                >
                  {p.text}
                </span>
              </div>
            </HfCard>
          ))}
        </div>

        {/* Member ready strip */}
        <HfCard
          padding={12}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "var(--bp-surface-2)",
            boxShadow: "none",
          }}
        >
          <MbStack
            members={MOCK_MEMBERS_BASE.map((m) => ({
              color: m.key,
              initial: m.initial,
              live: true,
            }))}
          />
          <span className="t-xs ink-3" style={{ flex: 1 }}>
            {MOCK_GROUP.memberCount}명 모두 준비됐어요
          </span>
        </HfCard>
      </HfBody>

      <HfFooter>
        <HfButton variant="primary" size="lg" full onClick={onStart}>
          시작할게요 →
        </HfButton>
      </HfFooter>
    </HfPhone>
  );
}

function Step5Pc({
  topic = "음악",
  level = MOCK_GROUP.level,
  appearancePct = MOCK_GUIDE_INTRO.appearancePct,
  points = MOCK_GUIDE_POINTS,
  guideText,
  onStart,
  groupName = MOCK_GROUP.name,
}: Step5Props) {
  // 콤보 질문 mock (실제로는 props로 받아야 하지만, 디자인 시안에 맞춰 placeholder)
  const comboQuestions = [
    "좋아하는 음악 묘사",
    "음악 듣는 습관",
    "기억에 남는 공연 경험",
  ];

  return (
    <PcStepShell
      onBack={() => undefined}
      crumb={[groupName, `${topic} 콤보`, "시작 전 가이드"]}
      stepNow={5}
    >
      <div
        className="bp-pc-content tight"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.4fr",
          gap: 24,
        }}
      >
        {/* LEFT — 콤보 정보 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              display: "flex",
              gap: 14,
              alignItems: "center",
            }}
          >
            <CoachAvatar size="lg" />
            <div
              style={{ display: "flex", flexDirection: "column", gap: 2 }}
            >
              <span className="t-h3">AI 스터디 코치</span>
              <span className="t-xs ink-3">오늘의 학습 인트로</span>
            </div>
          </div>

          <Insight>
            <span
              className="t-xs ink-3"
              style={{ marginBottom: 4, display: "block" }}
            >
              오늘의 콤보
            </span>
            <div className="t-h1" style={{ marginBottom: 10 }}>
              {topic} · {level}
            </div>
            <p
              className="t-body"
              style={{
                margin: 0,
                lineHeight: 1.6,
                color: "var(--bp-ink)",
                whiteSpace: "pre-wrap",
              }}
            >
              {guideText ? (
                guideText
              ) : (
                <>
                  이 콤보는 일반 주제 자리에서{" "}
                  <b>{appearancePct}% 확률</b>로 등장하는 정형화된 패턴이에요.
                </>
              )}
            </p>
          </Insight>

          <HfCard
            padding={16}
            style={{
              background: "var(--bp-surface-2)",
              boxShadow: "none",
            }}
          >
            <SectionH>3개 질문</SectionH>
            <div
              style={{ display: "flex", flexDirection: "column", gap: 6 }}
            >
              {comboQuestions.map((q, i) => (
                <div
                  key={i}
                  style={{ display: "flex", gap: 8 }}
                >
                  <span
                    className="t-num t-xs ink-3"
                    style={{ minWidth: 20 }}
                  >
                    Q{i + 1}
                  </span>
                  <span className="t-sm">{q}</span>
                </div>
              ))}
            </div>
          </HfCard>
        </div>

        {/* RIGHT — 포인트 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SectionH>오늘 함께 배울 포인트</SectionH>
          {points.map((p, i) => (
            <HfCard
              key={i}
              padding={18}
              style={{
                display: "flex",
                gap: 14,
                alignItems: "flex-start",
              }}
            >
              <span
                className="t-num"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: "var(--bp-tc-tint)",
                  color: "var(--bp-tc)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </span>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  flex: 1,
                }}
              >
                <Tag
                  tone="good"
                  style={{ fontSize: 10, alignSelf: "flex-start" }}
                >
                  {p.tag}
                </Tag>
                <span
                  className="t-body"
                  style={{
                    lineHeight: 1.55,
                    color: "var(--bp-ink)",
                    fontWeight: 500,
                  }}
                >
                  {p.text}
                </span>
              </div>
            </HfCard>
          ))}

          <div className="bp-pc-actions" style={{ marginTop: 8 }}>
            <HfButton
              variant="primary"
              size="lg"
              onClick={onStart}
              style={{ minWidth: 180 }}
            >
              시작할게요 →
            </HfButton>
          </div>
        </div>
      </div>
    </PcStepShell>
  );
}
// 미사용 import 무시
void MbDot;
