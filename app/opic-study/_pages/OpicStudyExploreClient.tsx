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
} from "lucide-react";
import {
  getTopicsForStudy,
  getCombosForStudy,
  getComboBySig,
  getOrGenerateComboCache,
} from "@/lib/actions/opic-study";
import type {
  StudyCategory,
  CategoryStat,
  TopicForStudy,
  ComboForStudy,
  QuestionTypeGuide,
  ApproachItem,
} from "@/lib/types/opic-study";

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
}

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
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 상태 (URL과 동기화)
  const [category, setCategory] = useState<StudyCategory | undefined>(
    initialCategory
  );
  const [topic, setTopic] = useState<string | undefined>(initialTopic);
  const [comboSig, setComboSig] = useState<string | undefined>(initialComboSig);

  // searchParams 변경 추적 (브라우저 뒤로가기 등)
  useEffect(() => {
    const cat = searchParams.get("cat") as StudyCategory | null;
    const t = searchParams.get("topic");
    const c = searchParams.get("combo");
    setCategory(cat ?? undefined);
    setTopic(t ?? undefined);
    setComboSig(c ?? undefined);
  }, [searchParams]);

  // URL 동기화 헬퍼
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
    if (comboSig) {
      updateUrl({ cat: category, topic });
    } else if (topic) {
      updateUrl({ cat: category });
    } else if (category) {
      updateUrl({});
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
        showBack={currentStep !== "category"}
        onBack={handleBack}
      />

      {/* 본문 */}
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "16px",
        }}
      >
        {currentStep === "category" && (
          <CategoryStep
            stats={categoryStats}
            onSelect={handleSelectCategory}
          />
        )}

        {currentStep === "topic" && category && (
          <TopicStep
            category={category}
            groupId={groupId}
            onSelect={handleSelectTopic}
          />
        )}

        {currentStep === "combo" && category && topic && (
          <ComboListStep
            category={category}
            topic={topic}
            groupId={groupId}
            typeGuideMap={typeGuideMap}
            onSelect={handleSelectCombo}
          />
        )}

        {currentStep === "detail" && comboSig && (
          <ComboDetailStep
            sig={comboSig}
            groupId={groupId}
            typeGuideMap={typeGuideMap}
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
  onBack: () => void;
  onJump: (next: { cat?: StudyCategory; topic?: string; combo?: string }) => void;
}

function ExploreHeader({
  groupName,
  category,
  topic,
  comboSig,
  showBack,
  onBack,
  onJump,
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
            aria-label="뒤로"
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              background: "var(--bp-surface-2)",
              border: "1px solid var(--bp-line)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <ArrowLeft size={16} strokeWidth={1.6} />
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
            콤보 둘러보기 · {groupName}
          </div>
          <Breadcrumb
            category={category}
            topic={topic}
            comboSig={comboSig}
            onJump={onJump}
          />
        </div>
      </div>
    </div>
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
  const { data: combos, isLoading } = useQuery({
    queryKey: ["explore-combos", category, topic, groupId],
    queryFn: async () => {
      const res = await getCombosForStudy({ category, topic, groupId });
      if (res.error) throw new Error(res.error);
      return res.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

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
            {CATEGORY_LABEL[category]} · {combos?.length ?? 0}개 (빈도순)
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
      ) : !combos || combos.length === 0 ? (
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
}: {
  sig: string;
  groupId: string;
  typeGuideMap: Map<string, QuestionTypeGuide>;
}) {
  // 콤보 메타 정보 (질문 + 빈도)
  const { data: combo, isLoading: comboLoading } = useQuery({
    queryKey: ["explore-combo-detail", sig, groupId],
    queryFn: async () => {
      const res = await getComboBySig({ sig, groupId });
      if (res.error) throw new Error(res.error);
      return res.data ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  // 풀 가이드 (캐시 또는 EF 생성) — 별도 쿼리 (캐시 미스 시 1~3초 대기 가능)
  const { data: cache, isLoading: cacheLoading } = useQuery({
    queryKey: ["explore-combo-cache", sig],
    queryFn: async () => {
      const res = await getOrGenerateComboCache(sig);
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* 콤보 메타 */}
      <div
        style={{
          padding: "16px 18px",
          background: "var(--bp-surface)",
          border: "1px solid var(--bp-line)",
          borderRadius: "var(--bp-radius)",
          display: "flex",
          gap: 18,
          flexWrap: "wrap",
        }}
      >
        <Stat label="출제 횟수" value={`${combo.frequency}회`} />
        <Stat label="토픽 내 비율" value={`${combo.appearance_pct}%`} />
        <Stat label="질문 수" value={`${combo.questions.length}개`} />
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
              alignSelf: "center",
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

      {/* 캐시 로딩 중 (첫 진입 — GPT 호출 1~3초) */}
      {cacheLoading && !cache && (
        <div
          style={{
            padding: "16px 18px",
            background: "var(--bp-surface-2)",
            borderRadius: 12,
            textAlign: "center",
            color: "var(--bp-ink-3)",
            fontSize: 13,
          }}
        >
          이 콤보의 풀 가이드를 처음 만드는 중이에요... (1~3초)
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
            />
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--bp-ink-3)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: "var(--bp-ink)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
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
}: {
  questionIdx: number;
  english: string;
  korean: string | null;
  short: string | null;
  approach?: ApproachItem;
  appearancePct: number;
}) {
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
            }}
          >
            {approach.type_label}
          </span>
        )}
        <span
          style={{
            marginLeft: "auto",
            fontSize: 12,
            color: "var(--bp-ink-3)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          토픽 내 등장률 {appearancePct}%
        </span>
      </div>

      {/* 영어 원문 */}
      <div
        style={{
          padding: "12px 14px",
          background: "var(--bp-surface-2)",
          borderRadius: 10,
          fontSize: 14,
          lineHeight: 1.6,
          color: "var(--bp-ink)",
          fontStyle: "italic",
        }}
      >
        “{english}”
      </div>

      {/* 한글 (쇼츠 우선, 없으면 풀번역) */}
      {(short || korean) && (
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--bp-ink-3)",
              letterSpacing: "0.04em",
              marginBottom: 4,
            }}
          >
            {short ? "질문 한 줄로" : "한국어 번역"}
          </div>
          <div
            style={{
              fontSize: 14,
              color: "var(--bp-ink-2)",
              lineHeight: 1.55,
            }}
          >
            {short ?? korean}
          </div>
        </div>
      )}

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
// 미사용 import 정리
// ============================================================
void Coffee;
void Clapperboard;
void Lightbulb;
void Sprout;
void Flame;
void Star;
