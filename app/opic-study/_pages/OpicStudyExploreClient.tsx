"use client";

/**
 * 오픽 스터디 — 콤보 둘러보기 클라이언트
 *
 * URL 쿼리스트링으로 단계 분기 (history.replaceState로 즉시 동기화):
 *   - cat 없음 → 카테고리 선택
 *   - cat 있음 → 토픽 그리드
 *   - cat + topic → 콤보 리스트
 *   - cat + topic + combo → 콤보 상세 풀뷰
 *
 * 데이터:
 *   - 카테고리 통계 / 유형 가이드: 서버 prefetch (props)
 *   - 토픽 / 콤보 / 콤보 상세: 클라이언트 useQuery
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronRight,
  ChevronLeft,
  Search,
  ArrowLeft,
  Coffee,
  Clapperboard,
  Lightbulb,
  Sprout,
  Flame,
  Star,
  BookOpenText,
  CheckCircle2,
  ScrollText,
} from "lucide-react";
import {
  getTopicsForStudy,
  getCombosForStudy,
  getComboBySig,
  getOrGenerateComboCache,
  getApprovedExamPool,
} from "@/lib/actions/opic-study";
import type {
  StudyCategory,
  CategoryStat,
  TopicForStudy,
  ComboForStudy,
  QuestionTypeGuide,
  ApproachItem,
  ExamLibraryCombo,
} from "@/lib/types/opic-study";
import { QuestionAudioRow } from "../_components/QuestionAudioRow";
import { useQuestionPlayer } from "@/lib/hooks/use-question-player";
import { Play, Pause } from "lucide-react";

// ============================================================
// 타입 / 상수
// ============================================================

interface Props {
  groupId: string;
  groupName: string;
  categoryStats: CategoryStat[];
  typeGuides: QuestionTypeGuide[];
  initialCategory?: StudyCategory;
  initialTopic?: string;
  initialComboSig?: string;
  initialTab?: "combos" | "exams";
  initialExamPage?: number;
}

type ExploreTab = "combos" | "exams";

const CATEGORY_LABEL: Record<StudyCategory, string> = {
  general: "일반",
  roleplay: "롤플레이",
  advance: "어드밴스",
};

const CATEGORY_DESC: Record<StudyCategory, string> = {
  general: "묘사·루틴·비교·경험 등 일상 주제 콤보",
  roleplay: "정보 요청 + 문제 해결 가상 상황 콤보",
  advance: "사회 변화 분석·이슈 토론 고난도 콤보 (12-14번)",
};

// ============================================================
// 메인 컴포넌트
// ============================================================

export function OpicStudyExploreClient({
  groupId,
  groupName,
  categoryStats,
  typeGuides,
  initialCategory,
  initialTopic,
  initialComboSig,
  initialTab = "combos",
  initialExamPage = 1,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 탭 상태
  const [tab, setTab] = useState<ExploreTab>(initialTab);

  // 상태 (URL과 동기화)
  const [category, setCategory] = useState<StudyCategory | undefined>(
    initialCategory
  );
  const [topic, setTopic] = useState<string | undefined>(initialTopic);
  const [comboSig, setComboSig] = useState<string | undefined>(initialComboSig);
  const [examPage, setExamPage] = useState<number>(initialExamPage);
  const [fromExamPage, setFromExamPage] = useState<number | undefined>(undefined);

  // searchParams 변경 추적 (브라우저 뒤로가기 등)
  useEffect(() => {
    const t = (searchParams.get("tab") as ExploreTab) || "combos";
    const cat = searchParams.get("cat") as StudyCategory | null;
    const topicQ = searchParams.get("topic");
    const c = searchParams.get("combo");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const fromExam = parseInt(searchParams.get("fromExam") || "", 10);
    setTab(t === "exams" ? "exams" : "combos");
    setCategory(cat ?? undefined);
    setTopic(topicQ ?? undefined);
    setComboSig(c ?? undefined);
    setExamPage(Number.isFinite(page) && page > 0 ? page : 1);
    setFromExamPage(
      Number.isFinite(fromExam) && fromExam > 0 ? fromExam : undefined
    );
  }, [searchParams]);

  // URL 동기화 헬퍼 (콤보 탭)
  const updateUrl = useCallback(
    (next: { cat?: StudyCategory; topic?: string; combo?: string }) => {
      const params = new URLSearchParams();
      if (next.cat) params.set("cat", next.cat);
      if (next.topic) params.set("topic", next.topic);
      if (next.combo) params.set("combo", next.combo);
      const qs = params.toString();
      router.push(qs ? `/opic-study/explore?${qs}` : "/opic-study/explore");
    },
    [router]
  );

  // 기출 탭 페이지 이동
  const updateExamUrl = useCallback(
    (page: number) => {
      const params = new URLSearchParams();
      params.set("tab", "exams");
      params.set("page", String(page));
      router.push(`/opic-study/explore?${params.toString()}`);
    },
    [router]
  );

  // 탭 전환
  const handleSwitchTab = (next: ExploreTab) => {
    if (next === tab) return;
    if (next === "exams") {
      updateExamUrl(examPage || 1);
    } else {
      router.push("/opic-study/explore");
    }
  };

  // 콤보 가이드로 점프 (기출 탭에서) — fromExam에 현재 페이지 보존
  const handleJumpToComboGuide = useCallback(
    (
      cat: StudyCategory,
      t: string,
      sig: string,
      fromExam?: number
    ) => {
      const params = new URLSearchParams();
      params.set("cat", cat);
      params.set("topic", t);
      params.set("combo", sig);
      if (fromExam && fromExam > 0) {
        params.set("fromExam", String(fromExam));
      }
      router.push(`/opic-study/explore?${params.toString()}`);
    },
    [router]
  );

  // 단계별 핸들러
  const handleSelectCategory = (cat: StudyCategory) => {
    updateUrl({ cat });
  };
  const handleSelectTopic = (t: string) => {
    if (!category) return;
    updateUrl({ cat: category, topic: t });
  };
  const handleSelectCombo = (sig: string) => {
    if (!category || !topic) return;
    updateUrl({ cat: category, topic, combo: sig });
  };
  const handleBack = () => {
    // 콤보 상세에서 기출 탭으로 점프해서 들어왔으면 해당 페이지로 직접 복귀
    if (comboSig && fromExamPage) {
      router.push(`/opic-study/explore?tab=exams&page=${fromExamPage}`);
      return;
    }
    // 기출별 탭 → 홈으로
    if (tab === "exams") {
      router.push("/opic-study");
      return;
    }
    // 콤보별 탭의 깊이별 단계 후퇴
    if (comboSig) {
      updateUrl({ cat: category, topic });
    } else if (topic) {
      updateUrl({ cat: category });
    } else if (category) {
      updateUrl({});
    } else {
      // 카테고리 화면 (콤보별 첫 화면) → 홈으로
      router.push("/opic-study");
    }
  };

  // 유형 가이드 빠른 조회용 Map
  const typeGuideMap = useMemo(() => {
    const m = new Map<string, QuestionTypeGuide>();
    for (const g of typeGuides) m.set(g.type_id, g);
    return m;
  }, [typeGuides]);

  // ============================================================
  // 단계별 분기
  // ============================================================

  const currentStep: "category" | "topic" | "combo" | "detail" = comboSig
    ? "detail"
    : topic
      ? "combo"
      : category
        ? "topic"
        : "category";

  return (
    <div className="bp-scope" style={{ paddingBottom: 48 }}>
      {/* 페이지 헤더 */}
      <ExploreHeader
        groupName={groupName}
        category={category}
        topic={topic}
        comboSig={comboSig}
        onJump={updateUrl}
        showBack
        backLabel={
          // 우선순위: 1) 기출 referrer → 기출 N번으로
          //          2) 카테고리/기출별 첫 화면 → 홈으로
          //          3) 그 외 → 뒤로
          comboSig && fromExamPage
            ? `기출 ${fromExamPage}번으로`
            : (tab === "exams" ||
              (tab === "combos" && currentStep === "category"))
              ? "홈으로"
              : "뒤로"
        }
        onBack={handleBack}
        tab={tab}
        onSwitchTab={handleSwitchTab}
      />

      {/* 본문 */}
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "16px",
        }}
      >
        {/* 콤보별 탭 */}
        {tab === "combos" && currentStep === "category" && (
          <CategoryStep
            stats={categoryStats}
            onSelect={handleSelectCategory}
          />
        )}

        {tab === "combos" && currentStep === "topic" && category && (
          <TopicStep
            category={category}
            groupId={groupId}
            onSelect={handleSelectTopic}
          />
        )}

        {tab === "combos" && currentStep === "combo" && category && topic && (
          <ComboListStep
            category={category}
            topic={topic}
            groupId={groupId}
            typeGuideMap={typeGuideMap}
            onSelect={handleSelectCombo}
          />
        )}

        {tab === "combos" && currentStep === "detail" && comboSig && (
          <ComboDetailStep
            sig={comboSig}
            groupId={groupId}
            typeGuideMap={typeGuideMap}
            contextCategory={category}
            contextTopic={topic}
          />
        )}

        {/* 기출별 탭 */}
        {tab === "exams" && (
          <ExamLibraryView
            page={examPage}
            typeGuideMap={typeGuideMap}
            onChangePage={(p) => updateExamUrl(p)}
            onJumpToComboGuide={(cat, t, sig) =>
              handleJumpToComboGuide(cat, t, sig, examPage)
            }
          />
        )}
      </div>
    </div>
  );
}

// ============================================================
// 헤더 (브레드크럼 + 그룹 표시)
// ============================================================

interface ExploreHeaderProps {
  groupName: string;
  category?: StudyCategory;
  topic?: string;
  comboSig?: string;
  showBack: boolean;
  backLabel?: string;          // "홈으로" or "뒤로"
  onBack: () => void;
  onJump: (next: { cat?: StudyCategory; topic?: string; combo?: string }) => void;
  tab: ExploreTab;
  onSwitchTab: (next: ExploreTab) => void;
}

function ExploreHeader({
  groupName,
  category,
  topic,
  comboSig,
  showBack,
  backLabel = "뒤로",
  onBack,
  onJump,
  tab,
  onSwitchTab,
}: ExploreHeaderProps) {
  return (
    <div
      style={{
        background: "var(--bp-surface)",
        borderBottom: "1px solid var(--bp-line)",
        padding: "16px 16px 14px",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        {showBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label={backLabel}
            title={backLabel}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "0 12px",
              height: 32,
              borderRadius: 999,
              background: "var(--bp-surface-2)",
              border: "1px solid var(--bp-line)",
              color: "var(--bp-ink-2)",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <ArrowLeft size={14} strokeWidth={1.8} />
            {backLabel}
          </button>
        )}

        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            background: "var(--bp-tc-tint)",
            color: "var(--bp-tc)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <BookOpenText size={18} strokeWidth={1.6} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--bp-ink-3)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 2,
            }}
          >
            둘러보기 · {groupName}
          </div>
          {tab === "combos" ? (
            <Breadcrumb
              category={category}
              topic={topic}
              comboSig={comboSig}
              onJump={onJump}
            />
          ) : (
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--bp-ink)",
              }}
            >
              실제 시험에 이런 문제가 나왔어요
            </span>
          )}
        </div>
      </div>

      {/* 탭 */}
      <div
        style={{
          maxWidth: 1100,
          margin: "10px auto 0",
          display: "flex",
          gap: 4,
          borderBottom: "1px solid var(--bp-line)",
        }}
      >
        <TabButton
          icon={<BookOpenText size={14} strokeWidth={1.8} />}
          label="콤보별"
          active={tab === "combos"}
          onClick={() => onSwitchTab("combos")}
        />
        <TabButton
          icon={<ScrollText size={14} strokeWidth={1.8} />}
          label="기출별"
          active={tab === "exams"}
          onClick={() => onSwitchTab("exams")}
        />
      </div>
    </div>
  );
}

function TabButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "10px 14px",
        background: "transparent",
        border: 0,
        borderBottom: active
          ? "2px solid var(--bp-tc)"
          : "2px solid transparent",
        marginBottom: -1,
        color: active ? "var(--bp-tc)" : "var(--bp-ink-3)",
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
        transition: "color 0.15s",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function Breadcrumb({
  category,
  topic,
  comboSig,
  onJump,
}: {
  category?: StudyCategory;
  topic?: string;
  comboSig?: string;
  onJump: (next: { cat?: StudyCategory; topic?: string; combo?: string }) => void;
}) {
  const items: Array<{ label: string; onClick?: () => void }> = [
    { label: "탐색", onClick: () => onJump({}) },
  ];
  if (category) {
    items.push({
      label: CATEGORY_LABEL[category],
      onClick: topic || comboSig ? () => onJump({ cat: category }) : undefined,
    });
  }
  if (topic) {
    items.push({
      label: topic,
      onClick: comboSig
        ? () => onJump({ cat: category, topic })
        : undefined,
    });
  }
  if (comboSig) {
    items.push({ label: "콤보 상세" });
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap",
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      {items.map((it, i) => (
        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {it.onClick ? (
            <button
              type="button"
              onClick={it.onClick}
              style={{
                background: "none",
                border: 0,
                padding: 0,
                color: "var(--bp-ink-2)",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              {it.label}
            </button>
          ) : (
            <span style={{ color: "var(--bp-ink)" }}>{it.label}</span>
          )}
          {i < items.length - 1 && (
            <ChevronRight size={14} strokeWidth={1.6} color="var(--bp-ink-3)" aria-hidden="true" />
          )}
        </span>
      ))}
    </div>
  );
}

// ============================================================
// Step 1: 카테고리 선택
// ============================================================

function CategoryStep({
  stats,
  onSelect,
}: {
  stats: CategoryStat[];
  onSelect: (cat: StudyCategory) => void;
}) {
  const cats: StudyCategory[] = ["general", "roleplay", "advance"];

  // category → stats 매핑
  const statMap = new Map<StudyCategory, CategoryStat>();
  for (const s of stats) statMap.set(s.category, s);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "var(--bp-ink)",
            margin: 0,
            marginBottom: 6,
          }}
        >
          어떤 콤보를 둘러볼까요?
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "var(--bp-ink-3)",
            margin: 0,
            lineHeight: 1.55,
          }}
        >
          카테고리 → 토픽 → 콤보 순서로 들어가면, 각 콤보의 질문과 한글
          답변 가이드를 미리 학습할 수 있어요.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 12,
        }}
      >
        {cats.map((cat) => {
          const stat = statMap.get(cat);
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onSelect(cat)}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                padding: "20px 18px",
                background: "var(--bp-surface)",
                border: "1px solid var(--bp-line)",
                borderRadius: "var(--bp-radius)",
                boxShadow: "var(--bp-shadow-sm)",
                cursor: "pointer",
                textAlign: "left",
                transition: "transform 0.15s, box-shadow 0.15s",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "var(--bp-ink)",
                  }}
                >
                  {CATEGORY_LABEL[cat]}
                </span>
                <ChevronRight size={18} strokeWidth={1.6} color="var(--bp-ink-3)" />
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--bp-ink-2)",
                  lineHeight: 1.5,
                }}
              >
                {CATEGORY_DESC[cat]}
              </div>
              {stat && (
                <div
                  style={{
                    display: "flex",
                    gap: 14,
                    fontSize: 12,
                    color: "var(--bp-ink-3)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <span>토픽 {stat.topic_count}개</span>
                  <span>·</span>
                  <span>콤보 {stat.combo_count}개</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Step 2: 토픽 그리드
// ============================================================

function TopicStep({
  category,
  groupId,
  onSelect,
}: {
  category: StudyCategory;
  groupId: string;
  onSelect: (topic: string) => void;
}) {
  const [search, setSearch] = useState("");

  const { data: topics, isLoading } = useQuery({
    queryKey: ["explore-topics", category, groupId],
    queryFn: async () => {
      const res = await getTopicsForStudy({ category, groupId });
      if (res.error) throw new Error(res.error);
      return res.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    if (!topics) return [];
    if (!search.trim()) return topics;
    const q = search.trim().toLowerCase();
    return topics.filter((t) => t.topic.toLowerCase().includes(q));
  }, [topics, search]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "var(--bp-ink)",
            margin: 0,
          }}
        >
          {CATEGORY_LABEL[category]} 토픽
        </h2>
        <span
          style={{
            fontSize: 12,
            color: "var(--bp-ink-3)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {topics?.length ?? 0}개
        </span>
      </div>

      {/* 검색 */}
      <div
        style={{
          position: "relative",
          maxWidth: 360,
        }}
      >
        <Search
          size={16}
          strokeWidth={1.6}
          color="var(--bp-ink-3)"
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
          }}
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="토픽 검색 (예: 음악, 카페)"
          style={{
            width: "100%",
            padding: "10px 14px 10px 36px",
            background: "var(--bp-surface)",
            border: "1px solid var(--bp-line)",
            borderRadius: 10,
            fontSize: 14,
            outline: "none",
          }}
        />
      </div>

      {isLoading ? (
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            color: "var(--bp-ink-3)",
          }}
        >
          토픽을 불러오는 중...
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            color: "var(--bp-ink-3)",
          }}
        >
          {search ? "검색 결과가 없어요" : "토픽이 없어요"}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 10,
          }}
        >
          {filtered.map((t) => (
            <TopicCard key={t.topic} topic={t} onClick={() => onSelect(t.topic)} />
          ))}
        </div>
      )}
    </div>
  );
}

function TopicCard({
  topic,
  onClick,
}: {
  topic: TopicForStudy;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "14px 16px",
        background: "var(--bp-surface)",
        border: "1px solid var(--bp-line)",
        borderRadius: "var(--bp-radius)",
        cursor: "pointer",
        textAlign: "left",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "var(--bp-ink)",
          }}
        >
          {topic.topic}
        </span>
        {topic.studied_count > 0 && (
          <CheckCircle2
            size={14}
            strokeWidth={1.8}
            color="var(--bp-tc)"
            aria-label="우리 그룹에서 학습한 토픽"
          />
        )}
      </div>
      <div
        style={{
          display: "flex",
          gap: 10,
          fontSize: 12,
          color: "var(--bp-ink-3)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <span>콤보 {topic.combo_count}개</span>
        <span>·</span>
        <span>출제 {topic.submission_count}회</span>
      </div>
    </button>
  );
}

// ============================================================
// Step 3: 콤보 리스트
// ============================================================

function ComboListStep({
  category,
  topic,
  groupId,
  typeGuideMap,
  onSelect,
}: {
  category: StudyCategory;
  topic: string;
  groupId: string;
  typeGuideMap: Map<string, QuestionTypeGuide>;
  onSelect: (sig: string) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["explore-combos", category, topic, groupId],
    queryFn: async () => {
      const res = await getCombosForStudy({ category, topic, groupId });
      if (res.error) throw new Error(res.error);
      return res.data ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const combos = data?.combos ?? [];
  const topicCount = data?.topic_category_count ?? 0;
  const totalSubs = data?.total_submissions ?? 0;
  const headerPct =
    totalSubs > 0 ? Math.round((topicCount / totalSubs) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--bp-ink)",
              margin: 0,
              marginBottom: 4,
            }}
          >
            {topic} 콤보
          </h2>
          <span
            style={{
              fontSize: 12,
              color: "var(--bp-ink-3)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {CATEGORY_LABEL[category]} · {combos.length}개 (빈도순)
            {totalSubs > 0 && (
              <>
                {" · "}
                <span style={{ color: "var(--bp-ink-2)", fontWeight: 700 }}>
                  전체 {totalSubs}회 중 {topicCount}회 출제 ({headerPct}%)
                </span>
              </>
            )}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            color: "var(--bp-ink-3)",
          }}
        >
          콤보를 불러오는 중...
        </div>
      ) : combos.length === 0 ? (
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            color: "var(--bp-ink-3)",
          }}
        >
          이 토픽에 등록된 콤보가 없어요
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {combos.map((c, i) => (
            <ComboCard
              key={c.sig}
              combo={c}
              rank={i + 1}
              typeGuideMap={typeGuideMap}
              onClick={() => onSelect(c.sig)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ComboCard({
  combo,
  rank,
  typeGuideMap,
  onClick,
}: {
  combo: ComboForStudy;
  rank: number;
  typeGuideMap: Map<string, QuestionTypeGuide>;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        gap: 14,
        padding: "16px 18px",
        background: "var(--bp-surface)",
        border: "1px solid var(--bp-line)",
        borderRadius: "var(--bp-radius)",
        cursor: "pointer",
        textAlign: "left",
        boxShadow: "var(--bp-shadow-sm)",
        transition: "border-color 0.15s, box-shadow 0.15s",
        alignItems: "stretch",
      }}
    >
      {/* 빈도 / 순위 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          flexShrink: 0,
          minWidth: 56,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--bp-ink-3)",
            letterSpacing: "0.04em",
          }}
        >
          #{rank}
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "var(--bp-tc)",
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
          }}
        >
          {combo.frequency}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--bp-ink-3)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {combo.appearance_pct}%
        </div>
      </div>

      {/* 질문들 */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: 8,
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
          {combo.questions.map((q, i) => {
            const guide = typeGuideMap.get(q.question_type);
            return (
              <span
                key={q.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "3px 8px",
                  background: "var(--bp-tc-tint)",
                  color: "var(--bp-tc)",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                Q{i + 1}
                <span style={{ opacity: 0.7 }}>·</span>
                {guide?.type_short_kor ?? q.question_type}
              </span>
            );
          })}
          {combo.studied_in_group && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                fontSize: 11,
                fontWeight: 700,
                color: "var(--bp-tc)",
              }}
            >
              <CheckCircle2 size={12} strokeWidth={1.8} />
              학습함
            </span>
          )}
        </div>

        {combo.questions.map((q, i) => (
          <div
            key={q.id}
            style={{
              fontSize: 13,
              color: "var(--bp-ink-2)",
              lineHeight: 1.5,
              display: "-webkit-box",
              WebkitLineClamp: 1,
              WebkitBoxOrient: "vertical" as const,
              overflow: "hidden",
            }}
          >
            <span
              style={{
                color: "var(--bp-ink-3)",
                fontWeight: 700,
                marginRight: 6,
              }}
            >
              Q{i + 1}.
            </span>
            {q.question_short ?? q.question_english}
          </div>
        ))}
      </div>

      <ChevronRight
        size={18}
        strokeWidth={1.6}
        color="var(--bp-ink-3)"
        style={{ alignSelf: "center", flexShrink: 0 }}
      />
    </button>
  );
}

// ============================================================
// Step 4: 콤보 상세 풀뷰
// ============================================================

function ComboDetailStep({
  sig,
  groupId,
  contextCategory,
  contextTopic,
}: {
  sig: string;
  groupId: string;
  typeGuideMap: Map<string, QuestionTypeGuide>;
  contextCategory?: StudyCategory;
  contextTopic?: string;
}) {
  // 콤보 메타 정보 (질문 + 빈도) — 카테고리 분모로 한정 (시험후기 빈도 분석 BM)
  const { data: combo, isLoading: comboLoading } = useQuery({
    queryKey: ["explore-combo-detail", sig, groupId, contextCategory],
    queryFn: async () => {
      const res = await getComboBySig({
        sig,
        groupId,
        category: contextCategory,
      });
      if (res.error) throw new Error(res.error);
      return res.data ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  // 풀 가이드 (캐시 또는 EF 생성) — 별도 쿼리 (캐시 미스 시 1~3초 대기 가능)
  const { data: cache, isLoading: cacheLoading } = useQuery({
    queryKey: ["explore-combo-cache", sig, contextCategory, contextTopic],
    queryFn: async () => {
      // 클라이언트 컨텍스트(category, topic) 명시 → EF가 정확한 컨텍스트로 가이드 생성
      const res = await getOrGenerateComboCache(sig, {
        category: contextCategory,
        topic: contextTopic,
      });
      if (res.error) throw new Error(res.error);
      return res.data ?? null;
    },
    staleTime: 30 * 60 * 1000, // 캐시는 30분간 stale 안 됨
    refetchOnWindowFocus: false,
  });

  if (comboLoading) {
    return (
      <div
        style={{
          padding: "60px",
          textAlign: "center",
          color: "var(--bp-ink-3)",
        }}
      >
        콤보 상세를 불러오는 중...
      </div>
    );
  }

  if (!combo) {
    return (
      <div
        style={{
          padding: "60px",
          textAlign: "center",
          color: "var(--bp-ink-3)",
        }}
      >
        콤보를 찾을 수 없어요
      </div>
    );
  }

  // approach 매핑 (question_index 기준)
  const approachByIndex = new Map<number, ApproachItem>();
  if (cache?.approaches) {
    for (const a of cache.approaches) approachByIndex.set(a.question_index, a);
  }

  // 토픽·카테고리 출제율 (페이지 상단 메타)
  const topicCount = combo.total_in_category ?? 0;
  const totalSubs = combo.total_submissions ?? 0;
  const topicCategoryPct =
    totalSubs > 0 ? Math.round((topicCount / totalSubs) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* 페이지 상단 메타 — 이 토픽·카테고리가 전체 시험 중 얼마나? */}
      {totalSubs > 0 && contextTopic && contextCategory && (
        <div
          style={{
            padding: "10px 16px",
            background: "var(--bp-surface-2)",
            borderRadius: 10,
            fontSize: 13,
            color: "var(--bp-ink-2)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontWeight: 700, color: "var(--bp-ink)" }}>
            {CATEGORY_LABEL[contextCategory]} · {contextTopic}
          </span>
          <span style={{ color: "var(--bp-ink-3)" }}>
            전체 {totalSubs}회 중
          </span>
          <span style={{ fontWeight: 700, color: "var(--bp-tc)" }}>
            {topicCount}회 출제 ({topicCategoryPct}%)
          </span>
        </div>
      )}

      {/* 콤보 메타 — 균등 분배 + 구분선 */}
      <div
        style={{
          padding: "20px 24px",
          background: "var(--bp-surface)",
          border: "1px solid var(--bp-line)",
          borderRadius: "var(--bp-radius)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        {/* 통계 3종 — 균등 분배 + 가운데 정렬 + 구분선 */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
            gap: 8,
            minWidth: 0,
          }}
        >
          <Stat
            label="출제 횟수"
            value={`${combo.frequency}회`}
            sub={
              combo.total_in_category !== undefined
                ? `카테고리 ${combo.total_in_category}회 중`
                : undefined
            }
          />
          <div
            aria-hidden="true"
            style={{
              width: 1,
              height: 40,
              background: "var(--bp-line)",
              flexShrink: 0,
            }}
          />
          <Stat label="카테고리 점유율" value={`${combo.appearance_pct}%`} />
          <div
            aria-hidden="true"
            style={{
              width: 1,
              height: 40,
              background: "var(--bp-line)",
              flexShrink: 0,
            }}
          />
          <Stat label="질문 수" value={`${combo.questions.length}개`} />
        </div>

        {combo.studied_in_group && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              background: "var(--bp-tc-tint)",
              color: "var(--bp-tc)",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={14} strokeWidth={1.8} />
            우리 그룹에서 학습한 콤보
          </div>
        )}
      </div>

      {/* AI 코치 한 줄 인사 */}
      {cache?.intro_text && (
        <div
          style={{
            padding: "14px 16px",
            background: "var(--bp-tc-tint)",
            border: "1px solid var(--bp-line)",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: "var(--bp-ink)",
            fontSize: 14,
            lineHeight: 1.55,
          }}
        >
          <span style={{ fontSize: 18 }} aria-hidden="true">🤖</span>
          <span>{cache.intro_text}</span>
        </div>
      )}

      {/* 캐시 로딩 중 (첫 진입 — GPT 호출, 콤보당 1회만) */}
      {cacheLoading && !cache && (
        <div
          style={{
            padding: "16px 18px",
            background: "var(--bp-surface-2)",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          {/* 회전 스피너 */}
          <span
            aria-hidden="true"
            style={{
              display: "inline-block",
              width: 16,
              height: 16,
              borderRadius: "50%",
              border: "2px solid var(--bp-line)",
              borderTopColor: "var(--bp-tc)",
              animation: "bp-spin 0.9s linear infinite",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--bp-ink-2)",
            }}
          >
            이 콤보의 가이드를 준비하고 있어요. 잠시만 기다려 주세요.
          </span>
          {/* 회전 애니메이션 keyframes (인라인 style 태그) */}
          <style>{`
            @keyframes bp-spin {
              from { transform: rotate(0deg); }
              to   { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* 질문 카드들 — 풀 가이드 (캐시) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 14,
        }}
      >
        {combo.questions.map((q, i) => {
          const approach = approachByIndex.get(i + 1);
          return (
            <ComboQuestionCard
              key={q.id}
              questionIdx={i + 1}
              english={q.question_english}
              korean={q.question_korean}
              short={q.question_short}
              approach={approach}
              appearancePct={q.appearance_pct}
              audioUrl={q.audio_url}
            />
          );
        })}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        textAlign: "center",
        flex: 1,
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--bp-ink-3)",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 20,
          fontWeight: 800,
          color: "var(--bp-ink)",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      {sub && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--bp-ink-3)",
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1.3,
          }}
        >
          {sub}
        </span>
      )}
    </div>
  );
}

function ComboQuestionCard({
  questionIdx,
  english,
  korean,
  short,
  approach,
  appearancePct,
  audioUrl,
}: {
  questionIdx: number;
  english: string;
  korean: string | null;
  short: string | null;
  approach?: ApproachItem;
  appearancePct: number;
  audioUrl: string | null;
}) {
  const audio = useQuestionPlayer();
  return (
    <div
      style={{
        background: "var(--bp-surface)",
        border: "1px solid var(--bp-line)",
        borderRadius: "var(--bp-radius)",
        boxShadow: "var(--bp-shadow-sm)",
        padding: "20px 20px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 36,
            height: 28,
            padding: "0 10px",
            borderRadius: 8,
            background: "var(--bp-surface-2)",
            color: "var(--bp-ink-2)",
            fontWeight: 800,
            fontSize: 13,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          Q{questionIdx}
        </span>
        {approach?.type_label && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "4px 10px",
              borderRadius: 999,
              background: "var(--bp-tc-tint)",
              color: "var(--bp-tc)",
              fontWeight: 700,
              fontSize: 12,
              flexShrink: 0,
            }}
          >
            {approach.type_label}
          </span>
        )}
        {(short || korean) && (
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 14,
              color: "var(--bp-ink)",
              fontWeight: 600,
              lineHeight: 1.5,
            }}
          >
            {short ?? korean}
          </span>
        )}
        <span
          style={{
            marginLeft: short || korean ? 0 : "auto",
            fontSize: 12,
            color: "var(--bp-ink-3)",
            fontVariantNumeric: "tabular-nums",
            flexShrink: 0,
          }}
        >
          카테고리 점유율 {appearancePct}%
        </span>
      </div>

      {/* 영어 원문 + 음성 통합 박스 (옵션 A — 우상단 ▶ 버튼) */}
      <div
        role={audioUrl ? "button" : undefined}
        tabIndex={audioUrl ? 0 : undefined}
        onClick={
          audioUrl
            ? () => {
                if (audio.isPlaying) audio.reset();
                else audio.play(audioUrl);
              }
            : undefined
        }
        onKeyDown={
          audioUrl
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (audio.isPlaying) audio.reset();
                  else audio.play(audioUrl);
                }
              }
            : undefined
        }
        aria-label={
          audioUrl
            ? audio.isPlaying
              ? "재생 일시정지"
              : "영어로 듣기"
            : undefined
        }
        style={{
          position: "relative",
          padding: audioUrl ? "14px 50px 16px 16px" : "12px 14px",
          background: audio.isPlaying
            ? "var(--bp-tc-tint)"
            : "var(--bp-surface-2)",
          borderRadius: 10,
          fontSize: 14,
          lineHeight: 1.6,
          color: "var(--bp-ink)",
          fontStyle: "italic",
          cursor: audioUrl ? "pointer" : "default",
          transition: "background 0.18s",
          overflow: "hidden",
        }}
      >
        “{english}”

        {/* 우상단 동그란 재생 버튼 */}
        {audioUrl && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (audio.isPlaying) audio.reset();
              else audio.play(audioUrl);
            }}
            aria-label={audio.isPlaying ? "일시정지" : "영어로 듣기"}
            title={audio.isPlaying ? "일시정지" : "영어로 듣기"}
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: audio.isPlaying ? "var(--bp-tc)" : "var(--bp-surface)",
              border: "1px solid var(--bp-tc)",
              color: audio.isPlaying ? "var(--bp-surface)" : "var(--bp-tc)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "background 0.15s, color 0.15s",
              flexShrink: 0,
              boxShadow: audio.isPlaying
                ? "0 0 0 4px rgba(201, 100, 66, 0.15)"
                : "none",
            }}
          >
            {audio.isPlaying ? (
              <Pause size={13} strokeWidth={2.2} fill="currentColor" />
            ) : (
              <Play size={13} strokeWidth={2.2} fill="currentColor" />
            )}
          </button>
        )}

        {/* 재생 중 진행 바 */}
        {audioUrl && audio.isPlaying && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 3,
              background: "var(--bp-line)",
            }}
            aria-hidden="true"
          >
            <div
              style={{
                width: `${audio.playbackProgress}%`,
                height: "100%",
                background: "var(--bp-tc)",
                transition: "width 0.1s linear",
              }}
            />
          </div>
        )}
      </div>

      {/* 유형별 한글 가이드 (캐시 풀 가이드) */}
      {approach && (
        <div
          style={{
            padding: "14px 16px",
            background:
              "linear-gradient(140deg, var(--bp-tc-tint) 0%, var(--bp-surface) 80%)",
            border: "1px solid var(--bp-line)",
            borderRadius: 12,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontWeight: 700,
              fontSize: 13,
              color: "var(--bp-tc)",
            }}
          >
            💡 이 질문은 이렇게 답해요
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.6,
              color: "var(--bp-ink)",
            }}
          >
            {approach.approach}
          </p>

          {/* 답변 흐름 */}
          {approach.answer_flow.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
                fontSize: 12,
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  color: "var(--bp-ink-3)",
                  fontSize: 11,
                  letterSpacing: "0.04em",
                }}
              >
                흐름
              </span>
              {approach.answer_flow.map((step, i) => (
                <span
                  key={i}
                  style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  <span
                    style={{
                      padding: "3px 8px",
                      background: "var(--bp-surface)",
                      border: "1px solid var(--bp-line)",
                      borderRadius: 6,
                      color: "var(--bp-ink)",
                      fontWeight: 600,
                    }}
                  >
                    {step}
                  </span>
                  {i < approach.answer_flow.length - 1 && (
                    <ChevronRight
                      size={12}
                      strokeWidth={1.6}
                      color="var(--bp-ink-3)"
                      aria-hidden="true"
                    />
                  )}
                </span>
              ))}
            </div>
          )}

          {/* 핵심 포인트 */}
          {approach.key_points.length > 0 && (
            <div>
              <div
                style={{
                  fontWeight: 700,
                  color: "var(--bp-ink-3)",
                  fontSize: 11,
                  letterSpacing: "0.04em",
                  marginBottom: 4,
                }}
              >
                놓치면 안 되는 포인트
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  fontSize: 13,
                  color: "var(--bp-ink-2)",
                  lineHeight: 1.55,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                {approach.key_points.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 권장 길이 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 11,
              color: "var(--bp-ink-3)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <span>권장 길이</span>
            <span
              style={{
                fontWeight: 700,
                color: "var(--bp-ink-2)",
              }}
            >
              {approach.recommended_word_min}~{approach.recommended_word_max} 단어
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 기출 둘러보기 (ExamLibraryView)
// ============================================================

function ExamLibraryView({
  page,
  typeGuideMap,
  onChangePage,
  onJumpToComboGuide,
}: {
  page: number;
  typeGuideMap: Map<string, QuestionTypeGuide>;
  onChangePage: (page: number) => void;
  onJumpToComboGuide: (cat: StudyCategory, topic: string, sig: string) => void;
}) {
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["explore-exam", page],
    queryFn: async () => {
      const res = await getApprovedExamPool({ page });
      if (res.error) throw new Error(res.error);
      return res.data ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div
        style={{
          padding: "60px",
          textAlign: "center",
          color: "var(--bp-ink-3)",
        }}
      >
        기출을 불러오는 중...
      </div>
    );
  }

  if (!data || !data.exam) {
    return (
      <div
        style={{
          padding: "60px",
          textAlign: "center",
          color: "var(--bp-ink-3)",
        }}
      >
        {data?.total === 0
          ? "아직 등록된 승인 기출이 없어요"
          : "이 페이지에 해당하는 기출이 없어요"}
      </div>
    );
  }

  const { exam, total } = data;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* 페이지 인디케이터만 (미니멀, 우측 정렬) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 8,
          padding: "0 4px",
          fontSize: 12,
          fontWeight: 700,
          color: "var(--bp-ink-3)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <span>
          <span style={{ color: "var(--bp-ink-2)" }}>{page}</span>
          <span style={{ margin: "0 2px" }}>/</span>
          <span>{total} 기출</span>
        </span>
        {isFetching && <span>· 불러오는 중...</span>}
      </div>

      {/* 콤보 블록들 */}
      {exam.combos.map((combo) => (
        <ExamComboBlock
          key={combo.combo_type}
          combo={combo}
          typeGuideMap={typeGuideMap}
          onJumpToComboGuide={onJumpToComboGuide}
        />
      ))}

      {/* 페이지네이션 — 5개 그룹 윈도우 + 이전/다음(1) + 건너뛰기(5) */}
      <ExamPagination
        currentPage={page}
        totalPages={total}
        onChangePage={onChangePage}
      />
    </div>
  );
}

// ============================================================
// 페이지네이션 — 5개 그룹 윈도우
// ============================================================

function ExamPagination({
  currentPage,
  totalPages,
  onChangePage,
}: {
  currentPage: number;
  totalPages: number;
  onChangePage: (page: number) => void;
}) {
  // 화면 폭에 따라 그룹 사이즈 + 버튼 크기 분기
  // SSR/첫 렌더에선 PC 기본값 → 마운트 후 실제 width 반영
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const groupSize = isMobile ? 5 : 10;
  const btnSize = isMobile ? 32 : 36;
  const fontSize = isMobile ? 12 : 13;
  const gap = isMobile ? 3 : 4;

  const groupStart =
    Math.floor((currentPage - 1) / groupSize) * groupSize + 1;
  const groupEnd = Math.min(groupStart + groupSize - 1, totalPages);

  const pageNumbers: number[] = [];
  for (let i = groupStart; i <= groupEnd; i++) pageNumbers.push(i);

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const hasPrevGroup = groupStart > 1;
  const hasNextGroup = groupEnd < totalPages;

  // 그룹 점프 — 이전/다음 그룹의 첫 페이지
  const prevGroupStart = Math.max(1, groupStart - groupSize);
  const nextGroupStart = Math.min(totalPages, groupEnd + 1);

  const jumpLabel = isMobile ? "5페이지" : "10페이지";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap,
        padding: "16px 0 0",
        borderTop: "1px solid var(--bp-line)",
        flexWrap: "wrap",
      }}
    >
      <NavBtn
        onClick={() => onChangePage(prevGroupStart)}
        disabled={!hasPrevGroup}
        ariaLabel={`${jumpLabel} 이전`}
        title={`${jumpLabel} 이전`}
        size={btnSize}
      >
        «
      </NavBtn>
      <NavBtn
        onClick={() => onChangePage(currentPage - 1)}
        disabled={!hasPrev}
        ariaLabel="이전 기출"
        title="이전 기출"
        size={btnSize}
      >
        ‹
      </NavBtn>

      {pageNumbers.map((p) => {
        const isCurrent = p === currentPage;
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChangePage(p)}
            disabled={isCurrent}
            aria-current={isCurrent ? "page" : undefined}
            style={{
              minWidth: btnSize,
              height: btnSize,
              padding: "0 8px",
              borderRadius: 8,
              background: isCurrent ? "var(--bp-tc)" : "var(--bp-surface)",
              border: "1px solid",
              borderColor: isCurrent ? "var(--bp-tc)" : "var(--bp-line)",
              color: isCurrent ? "var(--bp-surface)" : "var(--bp-ink)",
              fontWeight: isCurrent ? 800 : 600,
              fontSize,
              fontVariantNumeric: "tabular-nums",
              cursor: isCurrent ? "default" : "pointer",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            {p}
          </button>
        );
      })}

      <NavBtn
        onClick={() => onChangePage(currentPage + 1)}
        disabled={!hasNext}
        ariaLabel="다음 기출"
        title="다음 기출"
        size={btnSize}
      >
        ›
      </NavBtn>
      <NavBtn
        onClick={() => onChangePage(nextGroupStart)}
        disabled={!hasNextGroup}
        ariaLabel={`${jumpLabel} 다음`}
        title={`${jumpLabel} 다음`}
        size={btnSize}
      >
        »
      </NavBtn>
    </div>
  );
}

function NavBtn({
  onClick,
  disabled,
  ariaLabel,
  title,
  size = 36,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  ariaLabel: string;
  title: string;
  size?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title}
      style={{
        width: size,
        height: size,
        padding: 0,
        borderRadius: 8,
        background: disabled ? "var(--bp-surface-2)" : "var(--bp-surface)",
        border: "1px solid var(--bp-line)",
        color: disabled ? "var(--bp-ink-3)" : "var(--bp-ink-2)",
        fontSize: 16,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.15s",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function ExamComboBlock({
  combo,
  typeGuideMap,
  onJumpToComboGuide,
}: {
  combo: ExamLibraryCombo;
  typeGuideMap: Map<string, QuestionTypeGuide>;
  onJumpToComboGuide: (cat: StudyCategory, topic: string, sig: string) => void;
}) {
  const isSelfIntro = combo.category === "self_intro";

  // 카테고리별 색상 톤
  const tone =
    combo.category === "general"
      ? "var(--bp-tc)"
      : combo.category === "roleplay"
        ? "#3b5fa0"
        : combo.category === "advance"
          ? "#9b59b6"
          : "#5a7a55"; // self_intro

  const handleJump = () => {
    if (!combo.sig || isSelfIntro || combo.category === "self_intro") return;
    onJumpToComboGuide(
      combo.category as StudyCategory,
      combo.topic,
      combo.sig
    );
  };

  return (
    <div
      style={{
        background: "var(--bp-surface)",
        border: "1px solid var(--bp-line)",
        borderRadius: "var(--bp-radius)",
        boxShadow: "var(--bp-shadow-sm)",
        padding: "16px 18px",
      }}
    >
      {/* 콤보 헤더 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 10,
          paddingBottom: 10,
          borderBottom: "1px solid var(--bp-line)",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "4px 10px",
              borderRadius: 8,
              background: `${tone}20`,
              color: tone,
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {combo.category_label}
          </span>
          {combo.topic && (
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--bp-ink)",
              }}
            >
              · {combo.topic}
            </span>
          )}
        </div>

        {!isSelfIntro && combo.sig && (
          <button
            type="button"
            onClick={handleJump}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "5px 10px",
              fontSize: 11,
              fontWeight: 700,
              color: "var(--bp-tc)",
              background: "var(--bp-tc-tint)",
              border: "0",
              borderRadius: 999,
              cursor: "pointer",
            }}
            title="콤보 둘러보기에서 풀 가이드 보기"
          >
            가이드 보기
            <ChevronRight size={12} strokeWidth={1.8} />
          </button>
        )}
      </div>

      {/* 질문들 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          divideY: "1px solid var(--bp-line)",
        } as React.CSSProperties}
      >
        {combo.questions.map((q, idx) => {
          const typeGuide = q.question_type_eng
            ? typeGuideMap.get(q.question_type_eng)
            : undefined;
          return (
            <div
              key={`${q.question_number}-${idx}`}
              style={{
                borderTop: idx > 0 ? "1px solid var(--bp-line)" : "none",
              }}
            >
              <QuestionAudioRow
                questionNumber={q.question_number}
                typeLabel={typeGuide?.type_short_kor ?? null}
                korean={q.question_short ?? q.question_korean}
                english={q.question_english}
                audioUrl={q.audio_url}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// 미사용 import 정리
// ============================================================
void Coffee;
void Clapperboard;
void Lightbulb;
void Sprout;
void Flame;
void Star;
