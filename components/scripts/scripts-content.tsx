"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PenTool,
  FolderOpen,
  Headphones,
  ArrowRight,
  FileText,
  Info,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Package,
  Loader2,
  AlertCircle,
  Play,
  Coffee,
  Clapperboard,
  Lightbulb,
  BookOpen,
  FlaskConical,
  Coins,
  type LucideIcon,
} from "lucide-react";
import { formatUsd } from "@/lib/constants/pricing";
import { TOPIC_ICONS } from "@/components/reviews/submit/topic-pagination";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  getMyScripts,
  getShadowingHistory,
  getShadowableScripts,
  deleteScript,
  createPackage,
  checkScriptCredit,
} from "@/lib/actions/scripts";
import { getTopicsByCategory } from "@/lib/queries/master-questions";
import { NoCreditCard } from "@/components/trial/no-credit-card";
import type { ScriptListItem, ShadowingHistoryItem } from "@/lib/types/scripts";
import {
  SCRIPT_SOURCE_LABELS,
  SCRIPT_STATUS_LABELS,
  TARGET_LEVEL_SHORT_LABELS,
} from "@/lib/types/scripts";
import { QUESTION_TYPE_LABELS, QUESTION_TYPE_COLORS } from "@/lib/types/reviews";

/* ── 상수 ── */

const tabs = [
  { id: "create", label: "스크립트 생성", icon: PenTool },
  { id: "my", label: "내 스크립트", icon: FolderOpen },
  { id: "shadowing", label: "쉐도잉 훈련", icon: Headphones },
] as const;

type TabId = (typeof tabs)[number]["id"];

/* ── Props ── */

interface ScriptsContentProps {
  initialScripts?: ScriptListItem[];
  initialShadowingHistory?: ShadowingHistoryItem[];
  initialShadowableScripts?: ScriptListItem[];
}

/* ── 메인 컴포넌트 ── */

export function ScriptsContent({
  initialScripts,
  initialShadowingHistory,
  initialShadowableScripts,
}: ScriptsContentProps) {
  const searchParams = useSearchParams();

  // ?mode=trial 감지 시 자동으로 "생성" 탭 활성
  const isTrialMode = searchParams.get("mode") === "trial";

  // useState로 즉시 탭 전환 + history.replaceState로 URL만 동기화 (Next.js 네비게이션 미발생)
  const tabParam = searchParams.get("tab") as TabId | null;
  const initialTab: TabId = isTrialMode ? "create" : (tabParam && tabs.some((t) => t.id === tabParam) ? tabParam : "create");
  const [activeTab, setActiveTabState] = useState<TabId>(initialTab);

  const setActiveTab = useCallback((id: TabId) => {
    setActiveTabState(id);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", id);
    window.history.replaceState(null, "", url.toString());
  }, []);

  return (
    <div>
      {/* 탭 네비게이션 — 카드형 */}
      <div className="mb-4 flex gap-1 rounded-xl bg-surface-secondary p-1 sm:mb-6">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs font-medium transition-all sm:gap-2 sm:px-3 sm:text-sm ${
                active
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-foreground-secondary hover:text-foreground"
              }`}
            >
              <tab.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === "create" && <CreateTab />}
      {activeTab === "my" && <MyScriptsTab initialData={initialScripts} />}
      {activeTab === "shadowing" && (
        <ShadowingTab
          initialData={initialShadowingHistory}
          initialShadowable={initialShadowableScripts}
        />
      )}
    </div>
  );
}

/* ── 스크립트 생성 탭 ── */

function CreateTab() {
  const [bannerOpen, setBannerOpen] = useState(false);

  // 크레딧 확인
  const { data: creditInfo } = useQuery({
    queryKey: ["script-credit"],
    queryFn: async () => {
      const result = await checkScriptCredit();
      if (result.error) return null;
      return result.data;
    },
    staleTime: 60 * 1000,
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 안내 배너 (접이식) */}
      <button
        onClick={() => setBannerOpen(!bannerOpen)}
        className="flex w-full items-start gap-2.5 rounded-[var(--radius-xl)] border border-primary-200 bg-primary-50/50 p-3 text-left sm:gap-3 sm:p-4"
      >
        <Info size={18} className="shrink-0 text-primary-500" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">
              나만의 맞춤 스크립트란?
            </p>
            {creditInfo && (
              <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                <Coins size={11} />
                크레딧 : {formatUsd(creditInfo.balanceCents ?? creditInfo.totalCredits ?? 0)}
              </span>
            )}
          </div>
          {bannerOpen && (
            <p className="mt-0.5 text-xs text-foreground-secondary sm:mt-1 sm:text-sm">
              시험 빈출 주제와 내 경험을 조합하여, 자연스럽고 외우기 쉬운 영어
              답변 스크립트가 자동으로 만들어집니다.
            </p>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`shrink-0 text-primary-400 transition-transform ${bannerOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* 생성 과정 + CTA 카드 */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-foreground sm:text-base">스크립트 생성 및 활용</h3>
        <p className="mt-0.5 text-xs text-foreground-secondary sm:mt-1 sm:text-sm">
          빈출 주제로 맞춤 스크립트를 만들고 쉐도잉으로 체화합니다
        </p>

        {/* 3단계 안내 — 모바일: 세로 타임라인, PC: 가로 3컬럼 */}
        {/* 모바일 세로 */}
        <div className="relative mt-4 sm:hidden">
          {[
            { step: 1, title: "주제·질문 + 내 경험", desc: "빈출 주제에서 질문 선택, 경험 입력" },
            { step: 2, title: "맞춤 스크립트 생성", desc: "내 경험 기반 영어 답변 자동 생성" },
            { step: 3, title: "확정 + 쉐도잉 패키지", desc: "확정 후 원어민 음성으로 쉐도잉 훈련" },
          ].map((s, i) => (
            <div key={s.step} className="relative flex gap-3 pb-4 last:pb-0">
              {i < 2 && (
                <div className="absolute left-3.5 top-7 bottom-0 w-px bg-border" />
              )}
              <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-border bg-surface-secondary text-xs font-bold text-foreground-muted">
                {s.step}
              </div>
              <div className="pt-0.5">
                <p className="text-sm font-semibold text-foreground">{s.title}</p>
                <p className="text-xs text-foreground-secondary">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
        {/* PC 가로 — 단계 사이 화살표 */}
        <div className="hidden sm:mt-6 sm:grid sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center sm:gap-3">
          {[
            { step: 1, title: "주제·질문 + 내 경험", desc: "빈출 주제에서 질문 선택, 경험 입력" },
            { step: 2, title: "맞춤 스크립트 생성", desc: "내 경험 기반 영어 답변 자동 생성" },
            { step: 3, title: "확정 + 쉐도잉 패키지", desc: "확정 후 원어민 음성으로 쉐도잉 훈련" },
          ].flatMap((s, i) => [
            <div key={s.step} className="flex flex-col items-center text-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-border bg-surface-secondary text-sm font-bold text-foreground-muted">
                {s.step}
              </div>
              <p className="mt-2 text-sm font-semibold text-foreground">{s.title}</p>
              <p className="mt-0.5 text-xs text-foreground-secondary">{s.desc}</p>
            </div>,
            ...(i < 2
              ? [<div key={`arrow-${i}`}><ChevronRight size={24} className="text-foreground-muted" /></div>]
              : []),
          ])}
        </div>

        {/* CTA — 크레딧 유무에 따라 분기 */}
        <div className="mt-4 border-t border-border pt-3 sm:mt-6 sm:pt-4">
          {creditInfo && !creditInfo.hasCredit ? (
            <NoCreditCard type="script" credits={creditInfo.totalCredits} estimatedCostCents={creditInfo.estimatedCostCents} />
          ) : (
            <Link
              href="/scripts/create"
              className="flex h-9 w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-primary-500 px-4 text-sm font-medium text-white transition-colors hover:bg-primary-600 sm:h-10"
            >
              <PenTool size={16} />
              스크립트 생성 시작하기
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── 카테고리 상수 ── */

const CATEGORIES = [
  { id: "일반", label: "일반", icon: Coffee },
  { id: "롤플레이", label: "롤플레이", icon: Clapperboard },
  { id: "어드밴스", label: "어드밴스", icon: Lightbulb },
] as const;

const DEFAULT_TOPIC_ICON: LucideIcon = BookOpen;

/* ── 내 스크립트 탭 ── */

function MyScriptsTab({
  initialData,
}: {
  initialData?: ScriptListItem[];
}) {
  const queryClient = useQueryClient();

  const { data: scripts, isLoading } = useQuery({
    queryKey: ["my-scripts"],
    queryFn: async () => {
      const result = await getMyScripts();
      if (result.error) throw new Error(result.error);
      return result.data ?? [];
    },
    initialData,
    staleTime: 5 * 60 * 1000,
  });

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [topicPage, setTopicPage] = useState(0);

  // 반응형 페이지 크기: 모바일 5개, PC 10개
  const [topicPerPage, setTopicPerPage] = useState(5);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const update = () => setTopicPerPage(mq.matches ? 10 : 5);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // 선택된 카테고리의 빈도 데이터 (출제 빈도순 정렬)
  const { data: frequencyTopics } = useQuery({
    queryKey: ["topics", selectedCategory],
    queryFn: () =>
      getTopicsByCategory(
        selectedCategory as "일반" | "롤플레이" | "어드밴스"
      ),
    enabled: !!selectedCategory,
    staleTime: Infinity,
  });

  // 카테고리별 스크립트 개수
  const categoryCounts = useMemo(() => {
    if (!scripts) return {};
    const counts: Record<string, number> = {};
    for (const s of scripts) {
      const cat = s.category || "기타";
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [scripts]);

  // 선택된 카테고리의 주제 목록 (빈도순) + 보유 스크립트 개수
  const sortedTopics = useMemo(() => {
    if (!scripts || !selectedCategory) return [];

    // 보유 스크립트 개수 계산
    const scriptCounts: Record<string, number> = {};
    for (const s of scripts) {
      if (s.category !== selectedCategory) continue;
      const topic = s.topic || "기타";
      scriptCounts[topic] = (scriptCounts[topic] || 0) + 1;
    }

    // 빈도순 정렬 (frequencyTopics 순서 활용)
    if (frequencyTopics?.length) {
      const freqOrder = new Map(
        frequencyTopics.map((t, i) => [t.topic, i])
      );
      return Object.entries(scriptCounts)
        .sort(
          (a, b) =>
            (freqOrder.get(a[0]) ?? 999) - (freqOrder.get(b[0]) ?? 999)
        )
        .map(([topic, count]) => ({ topic, count }));
    }

    // 빈도 데이터 미도착 시 스크립트 수 순 폴백
    return Object.entries(scriptCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([topic, count]) => ({ topic, count }));
  }, [scripts, selectedCategory, frequencyTopics]);

  // 필터링된 스크립트
  const filteredScripts = useMemo(() => {
    if (!scripts) return [];
    let result = scripts;
    if (selectedCategory) {
      result = result.filter((s) => s.category === selectedCategory);
    }
    if (selectedTopic) {
      result = result.filter((s) => s.topic === selectedTopic);
    }
    return result;
  }, [scripts, selectedCategory, selectedTopic]);

  function handleCategoryChange(cat: string | null) {
    setSelectedCategory(cat);
    setSelectedTopic(null);
    setTopicPage(0);
  }

  function handleDeleteRequest(scriptId: string) {
    setConfirmDeleteId(scriptId);
  }

  async function handleDeleteConfirm() {
    if (!confirmDeleteId) return;
    setDeletingId(confirmDeleteId);
    setConfirmDeleteId(null);
    try {
      const result = await deleteScript(confirmDeleteId);
      if (result.error) {
        alert(result.error);
      } else {
        queryClient.invalidateQueries({ queryKey: ["my-scripts"] });
      }
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  const myScriptsBanner = (
    <button
      onClick={() => setBannerOpen(!bannerOpen)}
      className="flex w-full items-start gap-2.5 rounded-[var(--radius-xl)] border border-primary-200 bg-primary-50/50 p-3 text-left sm:gap-3 sm:p-4"
    >
      <Info size={18} className="shrink-0 text-primary-500" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">
          내 스크립트란?
        </p>
        {bannerOpen && (
          <p className="mt-0.5 text-xs text-foreground-secondary sm:mt-1 sm:text-sm">
            생성한 스크립트를 관리하고, 패키지를 만들어 쉐도잉 훈련에 활용할 수 있습니다.
          </p>
        )}
      </div>
      <ChevronDown
        size={16}
        className={`shrink-0 text-primary-400 transition-transform ${bannerOpen ? "rotate-180" : ""}`}
      />
    </button>
  );

  if (!scripts?.length) {
    return (
      <div className="space-y-6">
        {myScriptsBanner}
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-foreground sm:text-base">내 스크립트 목록</h3>
          <div className="mt-4 flex flex-col items-center py-6 text-center sm:mt-6 sm:py-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-secondary">
              <FileText size={24} className="text-foreground-muted" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground-secondary">
              아직 생성한 스크립트가 없습니다
            </p>
            <p className="mt-1 text-xs text-foreground-muted">
              스크립트를 생성하면 여기에서 관리할 수 있습니다
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {myScriptsBanner}

      {/* 카테고리 필터 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleCategoryChange(null)}
          className={`inline-flex flex-1 items-center justify-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors sm:flex-none sm:gap-1.5 sm:px-3 sm:text-sm ${
            selectedCategory === null
              ? "bg-primary-500 text-white"
              : "bg-surface-secondary text-foreground-secondary hover:bg-border hover:text-foreground"
          }`}
        >
          전체
          <span className={`text-[10px] sm:text-xs ${selectedCategory === null ? "text-white/80" : "text-foreground-muted"}`}>
            {scripts.length}
          </span>
        </button>
        {CATEGORIES.map((cat) => {
          const count = categoryCounts[cat.id] || 0;
          if (count === 0) return null;
          const active = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`inline-flex flex-1 items-center justify-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors sm:flex-none sm:gap-1.5 sm:px-3 sm:text-sm ${
                active
                  ? "bg-primary-500 text-white"
                  : "bg-surface-secondary text-foreground-secondary hover:bg-border hover:text-foreground"
              }`}
            >
              <cat.icon size={14} className="hidden sm:block" />
              {cat.label}
              <span className={`text-[10px] sm:text-xs ${active ? "text-white/80" : "text-foreground-muted"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 주제 필터 (카테고리 선택 시에만, 빈도순 페이지네이션) */}
      {selectedCategory && sortedTopics.length > 0 && (() => {
        const totalPages = Math.ceil(sortedTopics.length / topicPerPage) || 1;
        const currentItems = sortedTopics.slice(
          topicPage * topicPerPage,
          (topicPage + 1) * topicPerPage
        );

        return (
          <div className="space-y-2">
            <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10 sm:gap-2">
              {currentItems.map((item) => {
                const Icon = TOPIC_ICONS[item.topic] || DEFAULT_TOPIC_ICON;
                const isSelected = selectedTopic === item.topic;
                return (
                  <button
                    key={item.topic}
                    onClick={() => setSelectedTopic(isSelected ? null : item.topic)}
                    className={`flex flex-col items-center gap-0.5 rounded-[var(--radius-lg)] border p-2 text-center transition-all ${
                      isSelected
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-border bg-surface text-foreground hover:border-primary-300 hover:bg-primary-50/30"
                    }`}
                  >
                    <Icon
                      size={14}
                      className={isSelected ? "text-primary-600" : "text-primary-400"}
                    />
                    <span className="text-[10px] font-medium leading-tight sm:text-[11px]">{item.topic}</span>
                    <span className="text-[10px] text-foreground-muted">{item.count}개</span>
                  </button>
                );
              })}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setTopicPage((p) => Math.max(0, p - 1))}
                  disabled={topicPage === 0}
                  className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-md)] border border-border text-foreground-secondary transition-colors hover:bg-surface-secondary disabled:opacity-30"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs text-foreground-muted">
                  {topicPage + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setTopicPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={topicPage >= totalPages - 1}
                  className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-md)] border border-border text-foreground-secondary transition-colors hover:bg-surface-secondary disabled:opacity-30"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* 스크립트 목록 */}
      {filteredScripts.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <p className="text-sm text-foreground-secondary">
            해당 조건의 스크립트가 없습니다
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredScripts.map((script) => (
            <ScriptCard
              key={script.id}
              script={script}
              onDelete={handleDeleteRequest}
              isDeleting={deletingId === script.id}
            />
          ))}
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        open={!!confirmDeleteId}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDeleteId(null)}
        title="스크립트를 삭제하시겠습니까?"
        description="연결된 패키지도 함께 삭제되며, 복구할 수 없습니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        variant="danger"
      />
    </div>
  );
}

/* ── 스크립트 카드 ── */

function ScriptCard({
  script,
  onDelete,
  isDeleting,
}: {
  script: ScriptListItem;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const questionTypeLabel =
    script.question_type && QUESTION_TYPE_LABELS[script.question_type]
      ? QUESTION_TYPE_LABELS[script.question_type]
      : script.question_type;

  const questionTypeColor =
    script.question_type && QUESTION_TYPE_COLORS[script.question_type]
      ? QUESTION_TYPE_COLORS[script.question_type]
      : "bg-gray-100 text-gray-700";

  const levelLabel =
    script.target_grade
      ? TARGET_LEVEL_SHORT_LABELS[script.target_grade] || script.target_grade
      : null;

  const preview =
    script.english_text?.length > 120
      ? script.english_text.slice(0, 120) + "..."
      : script.english_text || "(생성 중...)";

  return (
    <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 transition-colors hover:border-primary-200">
      {/* 상단: 주제 + 뱃지 + 메타 */}
      <div className="flex flex-wrap items-center gap-2">
        {/* 주제 */}
        {script.topic && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            {(() => {
              const Icon = TOPIC_ICONS[script.topic] || DEFAULT_TOPIC_ICON;
              return <Icon size={14} className="shrink-0 text-foreground-secondary" />;
            })()}
            {script.topic}
          </span>
        )}
        {/* question_type 뱃지 */}
        {script.question_type && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${questionTypeColor}`}
          >
            {questionTypeLabel}
          </span>
        )}
        {/* 등급 뱃지 */}
        {levelLabel && (
          <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-600">
            {levelLabel}
          </span>
        )}
        {/* 짧은 질문 (PC만) */}
        {(script.question_short || script.question_korean) && (
          <span className="hidden text-xs text-foreground-muted line-clamp-1 sm:inline">
            {script.question_short || script.question_korean}
          </span>
        )}
        {/* 상태 */}
        <span className="ml-auto flex items-center gap-1 text-xs">
          {script.status === "confirmed" ? (
            <>
              <CheckCircle2 size={12} className="text-green-500" />
              <span className="text-green-600">확정</span>
            </>
          ) : (
            <>
              <Clock size={12} className="text-foreground-muted" />
              <span className="text-foreground-muted">초안</span>
            </>
          )}
        </span>
      </div>

      {/* 질문 */}
      <div className="mt-1.5">
        {/* 질문: PC=영어 1줄, 모바일=question_short */}
        {script.question_english && (
          <p className="hidden truncate text-sm text-foreground sm:block">
            {script.question_english}
          </p>
        )}
        {(script.question_short || script.question_korean) && (
          <p className="text-xs text-foreground line-clamp-1 sm:hidden">
            {script.question_short || script.question_korean}
          </p>
        )}
      </div>

      {/* 미리보기 */}
      <p className="mt-1.5 text-xs text-foreground-muted line-clamp-1 sm:text-sm">
        {preview}
      </p>

      {/* 하단: 단어 수 + 액션 */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-foreground-muted">
          {script.word_count && (
            <span>{script.word_count}단어</span>
          )}
          {script.refine_count > 0 && (
            <span>수정 {script.refine_count}/3</span>
          )}
          {script.package && (
            <span
              className={
                script.package.status === "completed"
                  ? "text-green-500"
                  : script.package.status === "partial"
                    ? "text-amber-500"
                    : script.package.status === "failed"
                      ? "text-red-400"
                      : "text-primary-500"
              }
            >
              {script.package.status === "completed"
                ? "패키지 완료"
                : script.package.status === "partial"
                  ? "듣기만 가능"
                  : script.package.status === "failed"
                    ? "패키지 실패"
                    : `패키지 ${script.package.progress}%`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* 패키지 완료 → 쉐도잉 시작 */}
          {script.status === "confirmed" &&
            script.package?.status === "completed" && (
              <Link
                href={`/scripts/shadowing?packageId=${script.package.id}&scriptId=${script.id}`}
                className="inline-flex h-7 items-center gap-1 rounded-md bg-primary-50 px-2 text-xs font-medium text-primary-600 transition-colors hover:bg-primary-100"
              >
                <Headphones size={12} />
                쉐도잉
              </Link>
            )}
          <Link
            href={`/scripts/create?view=${script.id}`}
            className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary hover:text-foreground"
          >
            <Eye size={12} />
            보기
          </Link>
          <button
            onClick={() => onDelete(script.id)}
            disabled={isDeleting}
            className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          >
            <Trash2 size={12} />
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 쉐도잉 훈련 탭 ── */

function ShadowingTab({
  initialData,
  initialShadowable,
}: {
  initialData?: ShadowingHistoryItem[];
  initialShadowable?: ScriptListItem[];
}) {
  const [bannerOpen, setBannerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [topicPage, setTopicPage] = useState(0);

  // 반응형 페이지 크기: 모바일 5개, PC 10개
  const [topicPerPage, setTopicPerPage] = useState(5);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const update = () => setTopicPerPage(mq.matches ? 10 : 5);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["shadowing-history"],
    queryFn: async () => {
      const result = await getShadowingHistory();
      if (result.error) throw new Error(result.error);
      return result.data ?? [];
    },
    initialData,
    staleTime: 5 * 60 * 1000,
  });

  // 훈련 가능한 스크립트 목록 (패키지 완료된 것, 서버 사전 조회 initialData 활용)
  const { data: shadowableScripts, isLoading: scriptsLoading } = useQuery({
    queryKey: ["shadowable-scripts"],
    queryFn: async () => {
      const result = await getShadowableScripts();
      if (result.error) throw new Error(result.error);
      return result.data ?? [];
    },
    initialData: initialShadowable,
    staleTime: 5 * 60 * 1000,
  });

  // 빈도 데이터 (주제 정렬용)
  const { data: frequencyTopics } = useQuery({
    queryKey: ["topics", selectedCategory],
    queryFn: () =>
      getTopicsByCategory(
        selectedCategory as "일반" | "롤플레이" | "어드밴스"
      ),
    enabled: !!selectedCategory,
    staleTime: Infinity,
  });

  const isLoading = historyLoading || scriptsLoading;

  // 카테고리별 스크립트 개수
  const categoryCounts = useMemo(() => {
    if (!shadowableScripts) return {};
    const counts: Record<string, number> = {};
    for (const s of shadowableScripts) {
      const cat = s.category || "기타";
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [shadowableScripts]);

  // 주제 목록 (빈도순) + 보유 개수
  const sortedTopics = useMemo(() => {
    if (!shadowableScripts || !selectedCategory) return [];
    const scriptCounts: Record<string, number> = {};
    for (const s of shadowableScripts) {
      if (s.category !== selectedCategory) continue;
      const topic = s.topic || "기타";
      scriptCounts[topic] = (scriptCounts[topic] || 0) + 1;
    }
    if (frequencyTopics?.length) {
      const freqOrder = new Map(frequencyTopics.map((t, i) => [t.topic, i]));
      return Object.entries(scriptCounts)
        .sort((a, b) => (freqOrder.get(a[0]) ?? 999) - (freqOrder.get(b[0]) ?? 999))
        .map(([topic, count]) => ({ topic, count }));
    }
    return Object.entries(scriptCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([topic, count]) => ({ topic, count }));
  }, [shadowableScripts, selectedCategory, frequencyTopics]);

  // 필터링된 스크립트
  const filteredScripts = useMemo(() => {
    if (!shadowableScripts) return [];
    let result = shadowableScripts;
    if (selectedCategory) {
      result = result.filter((s) => s.category === selectedCategory);
    }
    if (selectedTopic) {
      result = result.filter((s) => s.topic === selectedTopic);
    }
    return result;
  }, [shadowableScripts, selectedCategory, selectedTopic]);

  function handleCategoryChange(cat: string | null) {
    setSelectedCategory(cat);
    setSelectedTopic(null);
    setTopicPage(0);
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 안내 배너 (접이식) */}
      <button
        onClick={() => setBannerOpen(!bannerOpen)}
        className="flex w-full items-start gap-2.5 rounded-[var(--radius-xl)] border border-primary-200 bg-primary-50/50 p-3 text-left sm:gap-3 sm:p-4"
      >
        <Info size={18} className="shrink-0 text-primary-500" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            쉐도잉 훈련이란?
          </p>
          {bannerOpen && (
            <p className="mt-0.5 text-xs text-foreground-secondary sm:mt-1 sm:text-sm">
              원어민 발화를 듣고 따라하며 스크립트를 입에 붙이는 4단계 점진 훈련입니다.
              듣기 → 따라읽기 → 혼자말하기 → 실전 순서로 진행됩니다.
            </p>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`shrink-0 text-primary-400 transition-transform ${bannerOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* 훈련 가능 스크립트 */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-foreground sm:text-base">쉐도잉 훈련</h3>
        <p className="mt-0.5 text-xs text-foreground-secondary sm:mt-1 sm:text-sm">
          패키지가 완료된 스크립트를 선택하여 4단계 점진 훈련을 시작합니다.
        </p>

        {isLoading ? (
          <div className="mt-6 flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : !shadowableScripts?.length ? (
          <div className="mt-4 flex flex-col items-center py-6 text-center sm:mt-6 sm:py-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-secondary">
              <Headphones size={24} className="text-foreground-muted" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground-secondary">
              훈련 가능한 스크립트가 없습니다
            </p>
            <p className="mt-1 text-xs text-foreground-muted">
              스크립트를 확정한 후 패키지를 생성하면 쉐도잉 훈련을 시작할 수 있습니다
            </p>
            <Link
              href="/scripts/shadowing?mode=trial"
              className="mt-4 inline-flex items-center gap-2 rounded-[var(--radius-lg)] border border-secondary-200 bg-secondary-50/30 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-secondary-300 hover:bg-secondary-50/60"
            >
              <FlaskConical size={16} className="text-secondary-600" />
              체험판으로 쉐도잉 체험하기
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* 카테고리 필터 */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => handleCategoryChange(null)}
                className={`inline-flex flex-1 items-center justify-center gap-0.5 rounded-full px-2 py-1.5 text-xs font-medium transition-colors sm:flex-none sm:gap-1.5 sm:px-3 sm:text-sm ${
                  selectedCategory === null
                    ? "bg-primary-500 text-white"
                    : "bg-surface-secondary text-foreground-secondary hover:bg-border hover:text-foreground"
                }`}
              >
                전체
                <span className={`text-[10px] sm:text-xs ${selectedCategory === null ? "text-white/80" : "text-foreground-muted"}`}>
                  {shadowableScripts.length}
                </span>
              </button>
              {CATEGORIES.map((cat) => {
                const count = categoryCounts[cat.id] || 0;
                if (count === 0) return null;
                const active = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.id)}
                    className={`inline-flex flex-1 items-center justify-center gap-0.5 rounded-full px-2 py-1.5 text-xs font-medium transition-colors sm:flex-none sm:gap-1.5 sm:px-3 sm:text-sm ${
                      active
                        ? "bg-primary-500 text-white"
                        : "bg-surface-secondary text-foreground-secondary hover:bg-border hover:text-foreground"
                    }`}
                  >
                    <cat.icon size={14} className="hidden sm:block" />
                    {cat.label}
                    <span className={`text-[10px] sm:text-xs ${active ? "text-white/80" : "text-foreground-muted"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 주제 필터 (카테고리 선택 시에만, 빈도순 페이지네이션) */}
            {selectedCategory && sortedTopics.length > 0 && (() => {
              const totalPages = Math.ceil(sortedTopics.length / topicPerPage) || 1;
              const currentItems = sortedTopics.slice(
                topicPage * topicPerPage,
                (topicPage + 1) * topicPerPage
              );

              return (
                <div className="space-y-2">
                  <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10 sm:gap-2">
                    {currentItems.map((item) => {
                      const Icon = TOPIC_ICONS[item.topic] || DEFAULT_TOPIC_ICON;
                      const isSelected = selectedTopic === item.topic;
                      return (
                        <button
                          key={item.topic}
                          onClick={() => setSelectedTopic(isSelected ? null : item.topic)}
                          className={`flex flex-col items-center gap-0.5 rounded-[var(--radius-lg)] border p-2 text-center transition-all ${
                            isSelected
                              ? "border-primary-500 bg-primary-50 text-primary-700"
                              : "border-border bg-surface text-foreground hover:border-primary-300 hover:bg-primary-50/30"
                          }`}
                        >
                          <Icon
                            size={14}
                            className={isSelected ? "text-primary-600" : "text-primary-400"}
                          />
                          <span className="text-[10px] font-medium leading-tight sm:text-[11px]">{item.topic}</span>
                          <span className="text-[10px] text-foreground-muted">{item.count}개</span>
                        </button>
                      );
                    })}
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setTopicPage((p) => Math.max(0, p - 1))}
                        disabled={topicPage === 0}
                        className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-md)] border border-border text-foreground-secondary transition-colors hover:bg-surface-secondary disabled:opacity-30"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="text-xs text-foreground-muted">
                        {topicPage + 1} / {totalPages}
                      </span>
                      <button
                        onClick={() => setTopicPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={topicPage >= totalPages - 1}
                        className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-md)] border border-border text-foreground-secondary transition-colors hover:bg-surface-secondary disabled:opacity-30"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 스크립트 목록 */}
            {filteredScripts.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <p className="text-sm text-foreground-secondary">
                  해당 조건의 스크립트가 없습니다
                </p>
              </div>
            ) : (
            <div className="space-y-3">
            {filteredScripts.map((script) => (
              <div
                key={script.id}
                className="flex items-center justify-between rounded-lg border border-border bg-surface-secondary/50 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    {(() => {
                      const Icon = TOPIC_ICONS[script.topic || ""] || DEFAULT_TOPIC_ICON;
                      return <Icon size={14} className="shrink-0 text-foreground-secondary" />;
                    })()}
                    {script.topic || "주제 없음"}
                  </p>
                  {script.question_korean && (
                    <p className="mt-0.5 text-xs text-foreground-secondary line-clamp-1">
                      {script.question_korean}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-xs text-foreground-muted">
                    {script.target_grade && (
                      <span className="rounded bg-primary-50 px-1.5 py-0.5 font-semibold text-primary-600">
                        {script.target_grade}
                      </span>
                    )}
                    {script.word_count && <span>{script.word_count}단어</span>}
                  </div>
                </div>
                {script.package && (
                  <Link
                    href={`/scripts/shadowing?packageId=${script.package.id}&scriptId=${script.id}`}
                    className="ml-3 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-primary-500 px-3 text-xs font-medium text-white transition-colors hover:bg-primary-600"
                  >
                    <Play size={12} />
                    훈련 시작
                  </Link>
                )}
              </div>
            ))}
            </div>
            )}
          </div>
        )}
      </div>

      {/* 훈련 이력 */}
      {history && history.length > 0 && (
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-foreground sm:text-base">훈련 이력</h3>
          <div className="mt-3 space-y-2 sm:mt-4 sm:space-y-3">
            {history.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-lg border border-border bg-surface-secondary/50 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {session.topic || "주제 없음"}
                  </p>
                  {session.question_korean && (
                    <p className="mt-0.5 text-xs text-foreground-secondary line-clamp-1">
                      {session.question_korean}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-xs text-foreground-muted">
                    <span>
                      {new Date(session.started_at).toLocaleDateString("ko-KR")}
                    </span>
                    {session.evaluation?.overall_score != null && (
                      <span className="font-medium text-primary-500">
                        {session.evaluation.overall_score}점
                      </span>
                    )}
                    {session.evaluation?.estimated_level && (
                      <span className="rounded bg-primary-50 px-1.5 py-0.5 text-xs font-semibold text-primary-600">
                        {session.evaluation.estimated_level}
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/scripts/shadowing/${session.id}`}
                  className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-3 text-xs font-medium whitespace-nowrap text-primary-500 transition-colors hover:bg-primary-50"
                >
                  상세
                  <ArrowRight size={12} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
