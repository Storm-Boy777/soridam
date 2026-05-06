"use client";

/**
 * Step 1~5 — 세션 셋업 (모드 → 카테고리 → 주제 → 콤보 → 코치 가이드)
 *
 * 디자인: docs/디자인/opic/project/hf-step1.jsx + hf-front.jsx
 */

import { useEffect, useState, type ReactNode } from "react";
import {
  Coffee,
  Clapperboard,
  Lightbulb,
  Sprout,
  Flame,
  Star,
  Sparkles,
  Mic,
  Layers,
  Pen,
} from "lucide-react";
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
  CoachBlock,
  Pill,
  Tag,
  Quote,
  Insight,
  SectionH,
  PcStepShell,
  PcStepBar,
  Hl,
} from "../_components/bp";
import type { ApproachItem } from "@/lib/types/opic-study";
import { goHome } from "@/lib/opic-study/nav";
import { onCardKey } from "@/lib/opic-study/keyboard";
import { useSessionFrame } from "../_components/session-frame-context";

// ============================================================
// 카테고리 아이콘 매핑 (Lucide — scripts/create BM, AI 티 없게)
// ============================================================
const CATEGORY_ICON_MAP: Record<string, ReactNode> = {
  general: <Coffee size={22} strokeWidth={1.6} aria-hidden="true" />,
  rp: <Clapperboard size={22} strokeWidth={1.6} aria-hidden="true" />,
  adv: <Lightbulb size={22} strokeWidth={1.6} aria-hidden="true" />,
};
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

const STEP1_MODES = [
  {
    key: "online" as const,
    icon: "📡",
    title: "온라인",
    desc: "화상으로 모여서 함께 답변하고 코칭을 받아요",
    tags: ["화상 통화", "실시간 동기화"],
  },
  {
    key: "offline" as const,
    icon: "👥",
    title: "오프라인",
    desc: "한 공간에 모여서 함께 답변하고 코칭을 받아요",
    tags: ["대면 모임", "한 화면 공유"],
  },
];

/** Step 1 — 모드 선택 (단일 컴포넌트, PC 우선 + 반응형) */
export function Step1({
  memberCount = 0,
  onStart,
}: Step1Props) {
  const [mode, setMode] = useState<"online" | "offline">("online");
  const ctx = useSessionFrame();

  // 실데이터 — ctx.members
  const memberDots = ctx?.members.length
    ? ctx.members.map((m) => ({
        color: m.key,
        initial: m.initial,
        dim: !ctx.onlineUserIds.has(m.userId),
      }))
    : [];
  const ctxMemberCount = ctx?.members.length ?? 0;
  const joinedCount = ctx?.onlineUserIds.size ?? 0;
  const memberNamesLabel = ctx?.members.length
    ? ctx.members.map((m) => m.name).join(" · ")
    : "";

  return (
    <div className="bp-scope bp-shell">
      <PcStepBar now={1} total={6} />

      <div className="bp-shell-content">
        <h1
          className="t-display"
          style={{ margin: "0 0 8px", fontWeight: 700 }}
        >
          오늘 어떻게 모일까요?
        </h1>
        <p className="t-body ink-3" style={{ margin: "0 0 28px" }}>
          학습 중에도 언제든 바꿀 수 있어요.
        </p>

        {/* 모드 카드 — 모바일 1열, PC 2열 */}
        <div className="bp-grid-mode">
          {STEP1_MODES.map((m) => {
            const selected = mode === m.key;
            return (
              <div
                key={m.key}
                className={`bp-mode-card ${selected ? "selected" : ""}`}
                onClick={() => setMode(m.key)}
                onKeyDown={onCardKey(() => setMode(m.key))}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                aria-label={`${m.title} — ${m.desc}`}
                style={{ padding: 20 }}
              >
                <div className="check" aria-hidden="true">
                  ✓
                </div>
                <div
                  aria-hidden="true"
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
                    marginBottom: 14,
                    transition:
                      "border-color 0.15s, background 0.15s, box-shadow 0.15s, color 0.15s",
                  }}
                >
                  {m.icon}
                </div>
                <div className="t-h2" style={{ marginBottom: 6 }}>
                  {m.title}
                </div>
                <p
                  className="t-sm ink-3"
                  style={{ margin: "0 0 12px", lineHeight: 1.5 }}
                >
                  {m.desc}
                </p>
                <div
                  style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
                >
                  {m.tags.map((t) => (
                    <Pill key={t}>{t}</Pill>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* 멤버 준비 스트립 */}
        <HfCard
          padding={14}
          style={{
            marginTop: 20,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <MbStack members={memberDots} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              flex: 1,
              minWidth: 0,
            }}
          >
            <span className="t-sm" style={{ fontWeight: 600 }}>
              {ctxMemberCount > 0
                ? `${joinedCount}명 입장 / ${ctxMemberCount}명`
                : `${memberCount}명 모두 준비 완료`}
            </span>
            <span
              className="t-xs ink-3"
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {memberNamesLabel}
            </span>
          </div>
        </HfCard>
      </div>

      <div className="bp-shell-actions">
        <div className="bp-shell-actions-inner">
          <HfButton
            variant="primary"
            size="lg"
            onClick={() => onStart?.(mode)}
            style={{ minWidth: 200 }}
          >
            시작하기 →
          </HfButton>
        </div>
      </div>
    </div>
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
      <HfHeader title="카테고리" sub="오늘 어떤 결로 갈까요?" onBack={goHome} />
      <HfStepBar now={2} />

      <HfBody padding="20px">
        <h1 className="t-h1" style={{ margin: "0 0 20px" }}>
          어떤 카테고리로 시작할까요?
        </h1>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {categories.map((c) => {
            const selected = sel === c.key;
            return (
              <div
                key={c.key}
                onClick={() => setSel(c.key)}
                onKeyDown={onCardKey(() => setSel(c.key))}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                aria-label={`${c.name} — ${c.desc}${c.questions ? `, ${c.questions}` : ""}`}
                style={{
                  padding: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  cursor: "pointer",
                  borderRadius: "var(--bp-radius)",
                  border: selected
                    ? "1.5px solid var(--bp-tc)"
                    : "1.5px solid transparent",
                  background: selected
                    ? "var(--bp-tc-tint)"
                    : "var(--bp-surface)",
                  boxShadow: selected
                    ? "0 0 0 4px rgba(201,100,66,0.08)"
                    : "var(--bp-shadow-sm)",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: selected
                      ? "var(--bp-tc)"
                      : "var(--bp-surface-2)",
                    color: selected ? "white" : "var(--bp-ink-2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                >
                  {CATEGORY_ICON_MAP[c.key] ?? null}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 2,
                    }}
                  >
                    <span className="t-sm" style={{ fontWeight: 600 }}>
                      {c.name}
                    </span>
                    {c.questions && (
                      <span className="t-xs ink-3">· {c.questions}</span>
                    )}
                  </div>
                  <p
                    className="t-xs ink-3"
                    style={{ margin: 0, lineHeight: 1.5 }}
                  >
                    {c.stat ?? c.desc}
                  </p>
                </div>
                {selected && (
                  <span
                    style={{ color: "var(--bp-tc)", fontWeight: 700 }}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
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

function Step2Pc({ categories = MOCK_CATEGORIES, onNext, groupName = MOCK_GROUP.name }: Step2Props) {
  const [sel, setSel] = useState<string>("general");

  return (
    <PcStepShell
      onBack={goHome}
      crumb={[groupName, "카테고리"]}
      stepNow={2}
      right={null}
    >
      <div className="bp-pc-content">
        <h1
          className="t-display"
          style={{ margin: "0 0 28px", fontSize: 32 }}
        >
          어떤 카테고리로 시작할까요?
        </h1>

        <div className="bp-pc-grid-3">
          {categories.map((c) => {
            const selected = sel === c.key;
            return (
              <div
                key={c.key}
                className={`bp-mode-card ${selected ? "selected" : ""}`}
                onClick={() => setSel(c.key)}
                onKeyDown={onCardKey(() => setSel(c.key))}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                aria-label={`${c.name} — ${c.desc}${c.questions ? `, ${c.questions}` : ""}`}
                style={{ padding: 24 }}
              >
                <div className="check" aria-hidden="true">
                  ✓
                </div>
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
                    marginBottom: 14,
                    transition:
                      "border-color 0.15s, background 0.15s, box-shadow 0.15s, color 0.15s",
                  }}
                >
                  {CATEGORY_ICON_MAP[c.key] ?? null}
                </div>
                <div
                  style={{
                    marginBottom: 4,
                    display: "flex",
                    alignItems: "baseline",
                    gap: 8,
                  }}
                >
                  <span className="t-h2">{c.name}</span>
                  {c.questions && (
                    <span className="t-xs ink-3">{c.questions}</span>
                  )}
                </div>
                <p
                  className="t-sm ink-3"
                  style={{ margin: 0, lineHeight: 1.55 }}
                >
                  {c.desc}
                </p>
                {c.stat && (
                  <p
                    className="t-xs"
                    style={{
                      margin: "8px 0 0",
                      lineHeight: 1.5,
                      color: "var(--bp-tc)",
                      fontWeight: 600,
                    }}
                  >
                    {c.stat}
                  </p>
                )}
              </div>
            );
          })}
        </div>

      </div>
      <div className="bp-pc-actions">
        <div
          className="bp-pc-actions-inner"
          style={{ alignItems: "center", gap: 14 }}
        >
          <span className="t-xs ink-3" aria-live="polite">
            먼저 누른 사람이 카테고리를 정해요
          </span>
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
  /** ← 뒤로 버튼 override. 미전달 시 goHome (홈으로) */
  onBack?: () => void;
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
  onBack,
  liveMode = false,
}: Step3Props) {
  const [sel, setSel] = useState<string>(topics[0]?.key ?? "");

  return (
    <HfPhone liveMode={liveMode}>
      {!liveMode && <HfStatusBar />}
      <HfHeader
        title="주제 선택"
        sub="자주 출제되는 순"
        onBack={onBack ?? goHome}
      />
      <HfStepBar now={2} />

      <HfBody padding="20px">
        <h1 className="t-h1" style={{ margin: "0 0 6px" }}>
          오늘 어떤 주제로?
        </h1>
        <p className="t-sm ink-3" style={{ margin: "0 0 16px" }}>
          최근에 안 한 주제일수록 좋아요.
        </p>

        {/* 로딩 */}
        {loading && topics.length === 0 && (
          <div
            style={{
              padding: "32px 16px",
              textAlign: "center",
              color: "var(--bp-ink-3)",
            }}
          >
            <p className="t-sm" style={{ margin: 0 }}>
              주제를 불러오고 있어요…
            </p>
          </div>
        )}

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
  onBack,
  groupName = MOCK_GROUP.name,
}: Step3Props) {
  const [sel, setSel] = useState<string>(topics[0]?.key ?? "");

  return (
    <PcStepShell
      onBack={onBack ?? goHome}
      crumb={[groupName, "카테고리·주제"]}
      stepNow={2}
      right={null}
    >
      <div className="bp-pc-content tight">
        <h1 className="t-h1" style={{ margin: "0 0 6px" }}>
          오늘 어떤 주제로?
        </h1>
        <p className="t-sm ink-3" style={{ margin: "0 0 18px" }}>
          최근에 안 한 주제일수록 좋아요.
        </p>

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
            <Sprout
              size={40}
              strokeWidth={1.4}
              color="var(--bp-ink-3)"
              aria-hidden="true"
              style={{ marginBottom: 12 }}
            />
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
                onKeyDown={onCardKey(() => setSel(t.key))}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                aria-label={`${t.name}${t.meta ? `, ${t.meta}` : ""}${t.recent ? ", 최근 학습" : ""}`}
                padding={12}
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
                  transition:
                    "border-color 0.15s, background 0.15s, box-shadow 0.15s",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <span
                    className="t-sm"
                    style={{ fontWeight: 600 }}
                  >
                    {t.name}
                  </span>
                  {selected && (
                    <span
                      aria-hidden="true"
                      style={{ color: "var(--bp-tc)", fontWeight: 700 }}
                    >
                      ✓
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    className="t-xs ink-3"
                    style={{ lineHeight: 1.3 }}
                  >
                    {t.meta}
                  </span>
                  {t.recent && (
                    <Pill style={{ fontSize: 10 }}>최근 학습</Pill>
                  )}
                </div>
              </HfCard>
            );
          })}
        </div>

      </div>
      <div className="bp-pc-actions">
        <div
          className="bp-pc-actions-inner"
          style={{ alignItems: "center", gap: 14 }}
        >
          <span className="t-xs ink-3" aria-live="polite">
            먼저 누른 사람이 주제를 정해요
          </span>
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
// CategoryTopicStep · 카테고리 + 주제 통합 (PC 진보적 노출, 모바일 분기)
//   scripts/create BM — 카테고리 카드 → 주제 그리드 단일 화면
// ============================================================

interface CategoryTopicStepProps {
  /** session.step — "category_select" 또는 "topic_select" */
  step: "category_select" | "topic_select";
  /** 서버 동기화된 선택 카테고리 (다른 멤버가 정한 경우도 반영) */
  selectedCategoryKey?: string | null;
  categories?: CategoryItem[];
  topics?: typeof MOCK_TOPICS;
  topicsLoading?: boolean;
  onSelectCategory?: (key: string) => void;
  onSelectTopic?: (topicKey: string) => void;
  onBackToCategory?: () => void;
  liveMode?: boolean;
  groupName?: string;
}

/**
 * CategoryTopicStep — 단일 컴포넌트 (PC 우선 + 모바일 반응형)
 *
 * 표준화 (Phase 1):
 * - 기존 CategoryTopicMobile + CategoryTopicPc 분리 → 단일 함수로 통합
 * - .bp-only-mobile / .bp-only-pc 분기 wrapper 제거
 * - .bp-shell-* 표준 CSS 클래스 사용 (모바일 default, PC에서 padding/그리드 확장)
 * - 상태/핸들러는 1회만 작성 → drift 위험 제거
 *
 * BP 디자인 시스템(테라코타 톤)은 그대로 유지.
 */
export function CategoryTopicStep({
  selectedCategoryKey,
  categories = MOCK_CATEGORIES,
  topics,
  topicsLoading = false,
  onSelectCategory,
  onSelectTopic,
}: CategoryTopicStepProps) {
  const [draftCategory, setDraftCategory] = useState<string | null>(
    selectedCategoryKey ?? null
  );
  const [draftTopic, setDraftTopic] = useState<string>("");

  // 서버 selectedCategoryKey 변경 시 동기화 (다른 멤버 변경 대응)
  useEffect(() => {
    if (selectedCategoryKey && draftCategory !== selectedCategoryKey) {
      setDraftCategory(selectedCategoryKey);
      setDraftTopic("");
    }
  }, [selectedCategoryKey, draftCategory]);

  // 토픽 후보 도착 시 첫 번째 자동 하이라이트
  const firstTopicKey = topics?.[0]?.key;
  useEffect(() => {
    if (firstTopicKey && !draftTopic) {
      setDraftTopic(firstTopicKey);
    }
  }, [firstTopicKey, draftTopic]);

  const handleCategoryClick = (key: string) => {
    if (draftCategory === key && selectedCategoryKey === key) return;
    setDraftCategory(key);
    setDraftTopic("");
    onSelectCategory?.(key); // 즉시 서버 동기화 (last-write-wins)
  };

  const handleStart = () => {
    if (!draftTopic) return;
    onSelectTopic?.(draftTopic);
  };

  const showTopics = !!draftCategory;
  const ctaDisabled = !draftTopic || (topics?.length ?? 0) === 0;

  return (
    <div className="bp-scope bp-shell">
      {/* 단계 표시 */}
      <PcStepBar now={2} total={6} />

      {/* 본문 */}
      <div className="bp-shell-content">
        <h1
          className="t-display"
          style={{ margin: "0 0 28px", fontWeight: 700 }}
        >
          어떤 카테고리로 시작할까요?
        </h1>

        {/* ① 카테고리 — scripts/create 컴팩트 정사각형 카드 */}
        <SectionH style={{ marginBottom: 12 }}>카테고리</SectionH>
        <div
          className="bp-grid-cat"
          style={{ marginBottom: showTopics ? 28 : 12 }}
        >
          {categories.map((c) => {
            const selected = draftCategory === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => handleCategoryClick(c.key)}
                onKeyDown={onCardKey(() => handleCategoryClick(c.key))}
                aria-pressed={selected}
                aria-label={`${c.name} — ${c.desc}${c.questions ? `, ${c.questions}` : ""}${c.stat ? `, ${c.stat}` : ""}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  padding: "14px 12px",
                  borderRadius: "var(--bp-radius-lg)",
                  cursor: "pointer",
                  textAlign: "center",
                  border: selected
                    ? "2px solid var(--bp-tc)"
                    : "1px solid var(--bp-line)",
                  background: selected
                    ? "var(--bp-tc-tint)"
                    : "var(--bp-surface)",
                  boxShadow: selected
                    ? "0 0 0 4px rgba(201,100,66,0.08)"
                    : "none",
                  transition:
                    "border-color 0.15s, background 0.15s, box-shadow 0.15s",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    color: selected ? "var(--bp-tc)" : "var(--bp-ink-3)",
                    display: "inline-flex",
                  }}
                >
                  {CATEGORY_ICON_MAP[c.key] ?? null}
                </span>
                <span
                  className="t-sm"
                  style={{
                    fontWeight: 700,
                    color: selected ? "var(--bp-tc)" : "var(--bp-ink)",
                  }}
                >
                  {c.name}
                </span>
                {c.questions && (
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--bp-ink-3)",
                      lineHeight: 1.3,
                    }}
                  >
                    {c.questions}
                  </span>
                )}
                {c.stat && (
                  <span
                    style={{
                      fontSize: 11,
                      color: selected ? "var(--bp-tc)" : "var(--bp-ink-3)",
                      fontWeight: 600,
                      lineHeight: 1.3,
                      marginTop: 2,
                    }}
                  >
                    {c.stat}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ② 주제 — 카테고리 클릭 즉시 노출 (progressive disclosure) */}
        {showTopics && (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <SectionH style={{ marginBottom: 0 }}>주제 선택</SectionH>
              {topics && topics.length > 0 && (
                <span className="t-xs ink-3">
                  {topics.length}개 주제 · 자주 출제되는 순
                </span>
              )}
            </div>

            {/* 로딩 — topics === undefined 시 표시 */}
            {(topicsLoading || !topics) && (
              <div
                style={{
                  padding: "60px 16px",
                  textAlign: "center",
                  color: "var(--bp-ink-3)",
                }}
              >
                <p className="t-sm" style={{ margin: 0 }}>
                  주제를 불러오고 있어요…
                </p>
              </div>
            )}

            {/* 빈 상태 */}
            {!topicsLoading && topics && topics.length === 0 && (
              <div
                style={{
                  padding: "60px 16px",
                  textAlign: "center",
                  color: "var(--bp-ink-3)",
                }}
              >
                <Sprout
                  size={40}
                  strokeWidth={1.4}
                  color="var(--bp-ink-3)"
                  aria-hidden="true"
                  style={{ marginBottom: 12 }}
                />
                <p className="t-body" style={{ margin: 0 }}>
                  아직 출제된 주제가 없어요.
                </p>
              </div>
            )}

            {/* 토픽 그리드 — 모바일 2열, PC 4열, XL 5열 (CSS 반응형) */}
            {topics && topics.length > 0 && (
              <div className="bp-grid-topic">
                {topics.map((t) => {
                  const selected = draftTopic === t.key;
                  return (
                    <HfCard
                      key={t.key}
                      onClick={() => setDraftTopic(t.key)}
                      onKeyDown={onCardKey(() => setDraftTopic(t.key))}
                      role="button"
                      tabIndex={0}
                      aria-pressed={selected}
                      aria-label={`${t.name}${t.meta ? `, ${t.meta}` : ""}${t.recent ? ", 최근 학습" : ""}`}
                      padding={12}
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
                        transition:
                          "border-color 0.15s, background 0.15s, box-shadow 0.15s",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 4,
                        }}
                      >
                        <span
                          className="t-sm"
                          style={{ fontWeight: 600 }}
                        >
                          {t.name}
                        </span>
                        {selected && (
                          <span
                            aria-hidden="true"
                            style={{
                              color: "var(--bp-tc)",
                              fontWeight: 700,
                            }}
                          >
                            ✓
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          className="t-xs ink-3"
                          style={{ lineHeight: 1.3 }}
                        >
                          {t.meta}
                        </span>
                        {t.recent && (
                          <Pill style={{ fontSize: 10 }}>최근 학습</Pill>
                        )}
                      </div>
                    </HfCard>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* footer — 풀폭 외곽 + max-w 1040 inner (CSS 반응형)
       * 모바일: 버튼 풀폭 stretch (CSS default), PC: helper + 버튼 가로 정렬 (CSS PC rule) */}
      <div className="bp-shell-actions">
        <div className="bp-shell-actions-inner">
          {/* 모바일에선 helper 텍스트 숨김 (액션바 공간 절약) */}
          <span className="t-xs ink-3 bp-pc-only" aria-live="polite">
            먼저 누른 사람이 주제를 정해요
          </span>
          <HfButton
            variant="primary"
            size="lg"
            onClick={handleStart}
            disabled={ctaDisabled}
            style={{ minWidth: 200 }}
          >
            이 주제로 시작 →
          </HfButton>
        </div>
      </div>
    </div>
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
  /** ← 뒤로 버튼 override. 미전달 시 goHome (홈으로) */
  onBack?: () => void;
  liveMode?: boolean;
  groupName?: string;
}

/** Step 4 — 콤보 (단일 컴포넌트, PC 우선 + 반응형) */
export function Step4({
  topic = "음악",
  combos = MOCK_COMBOS,
  loading = false,
  onNext,
}: Step4Props) {
  const [sel, setSel] = useState<string>(combos[0]?.key ?? "");

  // combos가 바뀌면 첫 항목 자동 하이라이트
  useEffect(() => {
    if (combos.length > 0 && !combos.find((c) => c.key === sel)) {
      setSel(combos[0].key);
    }
  }, [combos, sel]);

  void topic;

  return (
    <div className="bp-scope bp-shell">
      <PcStepBar now={3} total={6} />

      <div className="bp-shell-content">
        <h1
          className="t-display"
          style={{ margin: "0 0 28px", fontWeight: 700 }}
        >
          오늘은 어떤 콤보를 학습 할까요?
        </h1>

        {/* SectionH — Step 2 (카테고리·주제) 와 동일 패턴 */}
        {combos.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <SectionH style={{ marginBottom: 0 }}>콤보 선택</SectionH>
            <span className="t-xs ink-3">
              {combos.length}개 콤보 · 자주 출제되는 순
            </span>
          </div>
        )}

        {/* 로딩 */}
        {loading && combos.length === 0 && (
          <div
            style={{
              padding: "60px 16px",
              textAlign: "center",
              color: "var(--bp-ink-3)",
              flex: 1,
            }}
          >
            <p className="t-body" style={{ margin: 0 }}>
              콤보를 불러오고 있어요…
            </p>
          </div>
        )}

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
            <Sprout
              size={40}
              strokeWidth={1.4}
              color="var(--bp-ink-3)"
              aria-hidden="true"
              style={{ marginBottom: 12 }}
            />
            <p className="t-body" style={{ margin: 0 }}>
              이 토픽으로 출제된 콤보가 아직 없어요.
            </p>
          </div>
        )}

        {/* 콤보 카드 — 모바일 1열, PC 2열 */}
        {combos.length > 0 && (
          <div className="bp-grid-combo">
            {combos.map((c, idx) => {
              const selected = sel === c.key;
              const freqIcon =
                c.frequency && c.frequency >= 3 ? (
                  <Flame
                    size={16}
                    strokeWidth={1.8}
                    color="var(--bp-tc)"
                    aria-label="자주 출제"
                  />
                ) : c.frequency === 2 ? (
                  <Star
                    size={16}
                    strokeWidth={1.8}
                    color="var(--bp-tc)"
                    aria-label="중간 빈도"
                  />
                ) : null;
              return (
                <HfCard
                  key={c.key}
                  onClick={() => setSel(c.key)}
                  onKeyDown={onCardKey(() => setSel(c.key))}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selected}
                  aria-label={`콤보 ${idx + 1} (${c.tag}${c.frequency ? `, ${c.frequency}회 출제` : ""}${c.learned ? ", 이미 학습" : ""})`}
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
                    transition:
                      "border-color 0.15s, background 0.15s, box-shadow 0.15s",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 12,
                      flexWrap: "wrap",
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      {freqIcon}
                      <span className="t-h2">콤보 {idx + 1}</span>
                      <Pill tone="tc" style={{ fontSize: 10 }}>
                        {c.tag}
                      </Pill>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      {c.learned && (
                        <Pill style={{ fontSize: 10 }}>이미 학습</Pill>
                      )}
                      {/* 선택 ✓ checkmark — Step 2 (CategoryTopicStep) 패턴 일치 */}
                      {selected && (
                        <span
                          aria-hidden="true"
                          style={{
                            color: "var(--bp-tc)",
                            fontWeight: 700,
                            fontSize: 16,
                            lineHeight: 1,
                          }}
                        >
                          ✓
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 빈도 정보 (실데이터일 때만) — 한글은 Pretendard 유지, 숫자만 tabular-nums */}
                  {c.frequency !== undefined &&
                    c.appearancePct !== undefined && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 12,
                        }}
                      >
                        <span
                          className="t-xs"
                          style={{
                            color: "var(--bp-tc)",
                            fontWeight: 600,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {c.frequency}회 출제
                        </span>
                        <span
                          className="t-xs ink-3"
                          style={{ fontVariantNumeric: "tabular-nums" }}
                        >
                          ({c.appearancePct.toFixed(0)}%)
                        </span>
                      </div>
                    )}

                  {/* 질문 — Step5/explore 와 동일 패턴
                   *   상단: [Q번호] [유형] [한국어 요약] (+ 우측 빈도/학습 인디케이터)
                   *   하단: 영어 원문 (Quote 박스 — italic) */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                    }}
                  >
                    {c.questions.map((q, i) => {
                      const isObj = typeof q !== "string";
                      const english = isObj ? q.english : q;
                      const short = isObj ? q.short : undefined;
                      const typeLabel = isObj ? q.typeLabel : undefined;
                      const appearancePct = isObj
                        ? q.appearancePct
                        : c.questionMeta?.[i]?.appearancePct;
                      const studiedByUser = isObj
                        ? q.studiedByUser
                        : c.questionMeta?.[i]?.studiedByUser;
                      return (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                          }}
                        >
                          {/* Header row — Q + 유형 태그 + 한국어 요약 inline */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              className="t-xs"
                              style={{
                                minWidth: 32,
                                height: 22,
                                borderRadius: 6,
                                background: "var(--bp-surface-2)",
                                color: "var(--bp-ink-2)",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 800,
                                fontVariantNumeric: "tabular-nums",
                                flexShrink: 0,
                                fontSize: 11,
                              }}
                              aria-hidden="true"
                            >
                              Q{i + 1}
                            </span>
                            {typeLabel && (
                              <Tag tone="good" style={{ fontSize: 10 }}>
                                {typeLabel}
                              </Tag>
                            )}
                            {short && (
                              <span
                                className="t-sm"
                                style={{
                                  flex: 1,
                                  minWidth: 0,
                                  lineHeight: 1.5,
                                  color: "var(--bp-ink)",
                                  fontWeight: 600,
                                }}
                              >
                                {short}
                              </span>
                            )}
                            {(appearancePct !== undefined || studiedByUser) && (
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "flex-end",
                                  gap: 2,
                                  flexShrink: 0,
                                }}
                              >
                                {appearancePct !== undefined && (
                                  <span
                                    className="t-xs"
                                    style={{
                                      color: "var(--bp-ink-3)",
                                      fontWeight: 600,
                                      fontVariantNumeric: "tabular-nums",
                                    }}
                                  >
                                    {appearancePct.toFixed(0)}%
                                  </span>
                                )}
                                {studiedByUser && (
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

                          {/* 영어 원문 (Quote 박스 — italic, Step5/explore와 동일) */}
                          <Quote>{english}</Quote>
                        </div>
                      );
                    })}
                  </div>
                </HfCard>
              );
            })}
          </div>
        )}
      </div>

      <div className="bp-shell-actions">
        <div className="bp-shell-actions-inner">
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
    </div>
  );
}


// ============================================================
// Step 5 · AI 스터디 코치 가이드 (v2 — 등급 비특정, 한글 전용)
// ============================================================

interface Step5Props {
  topic?: string;
  /** AI 코치 한 줄 인사 (등급 비특정 공통) */
  introText: string;
  /** 질문별 한글 가이드 (콤보 질문 수와 정확히 매칭) */
  approaches: ApproachItem[];
  /** 콤보 질문 정보 (영어 원문 + 한 줄 요약 + 유형 라벨) */
  comboQuestions: Array<{
    question_index: number;        // 1-based
    question_english: string;
    question_short: string | null;
    question_type_kor: string | null;
  }>;
  onStart?: () => void;
  liveMode?: boolean;
  groupName?: string;
}

/** Step 5 v2 — AI 스터디 코치 가이드 (3카드 + 진행방식 4단계) */
export function Step5({
  introText,
  approaches,
  comboQuestions,
  onStart,
}: Step5Props) {
  const cardCount = Math.max(comboQuestions.length, 1);

  // approach 매칭: question_index 기준
  const approachByIndex = new Map<number, ApproachItem>();
  for (const a of approaches) approachByIndex.set(a.question_index, a);

  return (
    <div className="bp-scope bp-shell">
      <PcStepBar now={4} total={6} />

      <div
        className="bp-shell-content"
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        {/* 코치 인사 (한 줄, 라벨 없음) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "4px 4px 0",
          }}
        >
          <CoachAvatar size="sm" />
          <span
            className="t-body"
            style={{
              lineHeight: 1.55,
              color: "var(--bp-ink)",
              textWrap: "pretty" as const,
              minWidth: 0,
            }}
          >
            {introText}
          </span>
        </div>

        {/* 3개 질문 카드 (메인) */}
        <div
          className="bp-grid-questions"
          style={
            {
              ["--question-cols" as string]: cardCount,
            } as React.CSSProperties
          }
        >
          {comboQuestions.map((q, i) => {
            const approach = approachByIndex.get(q.question_index);
            // DB의 question_type_kor를 SSOT로 우선 사용 (EF 생성 라벨은 fallback)
            const typeLabel =
              q.question_type_kor || approach?.type_label || "질문";
            return (
              <HfCard
                key={i}
                padding={16}
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {/* 카드 헤더 — Q번호 + 유형 태그 + 한국어 한 줄 요약 (인라인 통합) */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    className="t-num t-xs"
                    style={{
                      minWidth: 32,
                      height: 24,
                      borderRadius: 8,
                      background: "var(--bp-surface-2)",
                      color: "var(--bp-ink-2)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                      flexShrink: 0,
                      border: "1px solid var(--bp-line)",
                    }}
                    aria-hidden="true"
                  >
                    Q{q.question_index}
                  </span>
                  <Tag tone="good" style={{ fontSize: 10 }}>
                    {typeLabel}
                  </Tag>
                  {q.question_short && (
                    <span
                      className="t-sm"
                      style={{
                        flex: 1,
                        minWidth: 0,
                        lineHeight: 1.5,
                        color: "var(--bp-ink)",
                        fontWeight: 600,
                      }}
                    >
                      {q.question_short}
                    </span>
                  )}
                </div>

                {/* 영어 원문 */}
                <Quote>{q.question_english}</Quote>

                {/* 💡 이렇게 답해요 (풀 가이드 — 본문 + 흐름 + 포인트 + 권장 길이) */}
                {approach && (
                  <CoachBlock
                    tone="good"
                    label="💡 이렇게 답해요"
                    style={{ padding: "10px 12px", marginTop: "auto" }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {/* 본문 */}
                      <span
                        className="t-sm"
                        style={{
                          lineHeight: 1.55,
                          color: "var(--bp-ink)",
                          textWrap: "pretty" as const,
                        }}
                      >
                        {approach.approach}
                      </span>

                      {/* 흐름 */}
                      {approach.answer_flow && approach.answer_flow.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            flexWrap: "wrap",
                            fontSize: 11,
                          }}
                        >
                          <span
                            className="ink-3"
                            style={{ fontWeight: 700, marginRight: 2 }}
                          >
                            흐름
                          </span>
                          {approach.answer_flow.map((step, idx) => (
                            <span
                              key={idx}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 2,
                              }}
                            >
                              <span
                                style={{
                                  padding: "2px 6px",
                                  background: "var(--bp-surface)",
                                  border: "1px solid var(--bp-line)",
                                  borderRadius: 4,
                                  fontWeight: 600,
                                  color: "var(--bp-ink)",
                                }}
                              >
                                {step}
                              </span>
                              {idx < approach.answer_flow.length - 1 && (
                                <span
                                  className="ink-3"
                                  style={{ fontSize: 9 }}
                                  aria-hidden="true"
                                >
                                  ›
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* 포인트 */}
                      {approach.key_points && approach.key_points.length > 0 && (
                        <ul
                          style={{
                            margin: 0,
                            paddingLeft: 14,
                            fontSize: 11,
                            color: "var(--bp-ink-2)",
                            lineHeight: 1.5,
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                          }}
                        >
                          {approach.key_points.map((p, idx) => (
                            <li key={idx}>{p}</li>
                          ))}
                        </ul>
                      )}

                      {/* 권장 길이 */}
                      {approach.recommended_word_min !== undefined &&
                        approach.recommended_word_max !== undefined && (
                          <div
                            className="t-xs ink-3"
                            style={{
                              fontVariantNumeric: "tabular-nums",
                              marginTop: 2,
                            }}
                          >
                            권장{" "}
                            <span
                              style={{
                                fontWeight: 700,
                                color: "var(--bp-ink-2)",
                              }}
                            >
                              {approach.recommended_word_min}~
                              {approach.recommended_word_max}
                            </span>{" "}
                            단어
                          </div>
                        )}
                    </div>
                  </CoachBlock>
                )}
              </HfCard>
            );
          })}
        </div>

        {/* 진행 방식 카드 */}
        <HfCard
          padding={16}
          style={{
            background: "var(--bp-surface-2)",
            boxShadow: "none",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 16 }} aria-hidden="true">
              📋
            </span>
            <SectionH style={{ marginBottom: 0 }}>
              오늘 스터디는 이렇게 진행돼요
            </SectionH>
          </div>
          <ol
            style={{
              margin: 0,
              padding: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {[
              "한 명씩 답변하고 함께 듣기",
              "코칭이 도착하면 함께 보기",
              cardCount > 1
                ? `Q1 → Q${cardCount} 순서로 진행`
                : "콤보 질문 순서로 진행",
              "마지막에 멤버 답변 함께 비교",
            ].map((step, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <span
                  className="t-num t-xs"
                  style={{
                    minWidth: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "var(--bp-tc-tint)",
                    color: "var(--bp-tc)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    flexShrink: 0,
                    fontVariantNumeric: "tabular-nums",
                  }}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <span className="t-sm" style={{ lineHeight: 1.55 }}>
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </HfCard>
      </div>

      <div className="bp-shell-actions">
        <div className="bp-shell-actions-inner">
          <span className="bp-shell-helper" aria-live="polite">
            먼저 누른 사람이 시작하면 모두 다음 단계로 이동해요
          </span>
          <HfButton
            variant="primary"
            size="lg"
            onClick={onStart}
            style={{ minWidth: 200 }}
          >
            시작할게요 →
          </HfButton>
        </div>
      </div>
    </div>
  );
}

// 미사용 import 정리 (다른 Step에서 쓰일 수 있어 import는 유지)
void MbDot;
void MOCK_GUIDE_POINTS;
void Mic;
void Layers;
void Pen;
void Sparkles;
void Hl;
