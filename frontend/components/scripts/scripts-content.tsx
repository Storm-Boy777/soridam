"use client";

import { useState, useMemo, useEffect } from "react";
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
  Package,
  Loader2,
  AlertCircle,
  Play,
  Coffee,
  Clapperboard,
  Lightbulb,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { TOPIC_ICONS } from "@/components/reviews/submit/topic-pagination";
import {
  getMyScripts,
  getShadowingHistory,
  getShadowableScripts,
  deleteScript,
  createPackage,
} from "@/lib/actions/scripts";
import { getTopicsByCategory } from "@/lib/queries/master-questions";
import type { ScriptListItem, ShadowingHistoryItem } from "@/lib/types/scripts";
import {
  SCRIPT_SOURCE_LABELS,
  SCRIPT_STATUS_LABELS,
  TARGET_LEVEL_SHORT_LABELS,
} from "@/lib/types/scripts";
import { ANSWER_TYPE_LABELS, ANSWER_TYPE_COLORS } from "@/lib/types/reviews";

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
}

/* ── 메인 컴포넌트 ── */

export function ScriptsContent({
  initialScripts,
  initialShadowingHistory,
}: ScriptsContentProps) {
  const [activeTab, setActiveTab] = useState<TabId>("create");

  return (
    <div>
      {/* 탭 네비게이션 */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex min-w-max border-b border-border">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition-colors sm:gap-2 sm:px-4 ${
                  active
                    ? "border-primary-500 text-primary-600"
                    : "border-transparent text-foreground-muted hover:border-border hover:text-foreground-secondary"
                }`}
              >
                <tab.icon size={16} className="hidden sm:block" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === "create" && <CreateTab />}
      {activeTab === "my" && <MyScriptsTab initialData={initialScripts} />}
      {activeTab === "shadowing" && (
        <ShadowingTab initialData={initialShadowingHistory} />
      )}
    </div>
  );
}

/* ── 스크립트 생성 탭 ── */

function CreateTab() {
  return (
    <div className="space-y-6">
      {/* 안내 배너 */}
      <div className="flex items-start gap-3 rounded-[var(--radius-xl)] border border-primary-200 bg-primary-50/50 p-4">
        <Info size={18} className="mt-0.5 shrink-0 text-primary-500" />
        <div>
          <p className="text-sm font-medium text-foreground">
            나만의 맞춤 스크립트란?
          </p>
          <p className="mt-1 text-sm text-foreground-secondary">
            시험 빈출 주제와 내 경험을 조합하여, 자연스럽고 외우기 쉬운 영어
            답변 스크립트가 자동으로 만들어집니다.
          </p>
        </div>
      </div>

      {/* 생성 과정 + CTA 카드 */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6">
        <h3 className="font-semibold text-foreground">스크립트 생성 과정</h3>
        <p className="mt-1 text-sm text-foreground-secondary">
          3단계로 나만의 맞춤 스크립트를 완성합니다
        </p>

        {/* 3단계 안내 */}
        <div className="relative mt-6">
          {[
            { step: 1, title: "주제·질문 선택", desc: "빈출 주제 목록에서 준비할 질문을 선택합니다" },
            { step: 2, title: "내 경험 입력 + 목표 등급 선택", desc: "한국어로 경험을 입력하고 목표 등급을 설정합니다" },
            { step: 3, title: "AI 스크립트 생성 → 확인 → 확정", desc: "AI가 생성한 답변을 확인하고, 최대 3회 수정 후 확정합니다" },
          ].map((s, i) => (
            <div key={s.step} className="relative flex gap-4 pb-5 last:pb-0">
              {i < 2 && (
                <div className="absolute left-4 top-8 bottom-0 w-px bg-border" />
              )}
              <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-border bg-surface-secondary text-sm font-bold text-foreground-muted">
                {s.step}
              </div>
              <div className="pt-0.5">
                <p className="font-semibold text-foreground">{s.title}</p>
                <p className="text-sm text-foreground-secondary">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-6 border-t border-border pt-4">
          <Link
            href="/scripts/create"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-primary-500 px-5 text-sm font-medium text-white transition-colors hover:bg-primary-600"
          >
            <PenTool size={16} />
            스크립트 생성 시작하기
          </Link>
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

  async function handleDelete(scriptId: string) {
    if (!confirm("이 스크립트를 삭제하시겠습니까? 연결된 패키지도 함께 삭제됩니다.")) return;
    setDeletingId(scriptId);
    try {
      const result = await deleteScript(scriptId);
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

  if (!scripts?.length) {
    return (
      <div className="space-y-6">
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6">
          <h3 className="font-semibold text-foreground">내 스크립트 목록</h3>
          <div className="mt-6 flex flex-col items-center py-8 text-center">
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
              onDelete={handleDelete}
              isDeleting={deletingId === script.id}
            />
          ))}
        </div>
      )}
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
  const answerTypeLabel =
    script.answer_type && ANSWER_TYPE_LABELS[script.answer_type]
      ? ANSWER_TYPE_LABELS[script.answer_type]
      : script.answer_type;

  const answerTypeColor =
    script.answer_type && ANSWER_TYPE_COLORS[script.answer_type]
      ? ANSWER_TYPE_COLORS[script.answer_type]
      : "bg-gray-100 text-gray-700";

  const levelLabel =
    script.target_level
      ? TARGET_LEVEL_SHORT_LABELS[script.target_level] || script.target_level
      : null;

  const preview =
    script.english_text?.length > 120
      ? script.english_text.slice(0, 120) + "..."
      : script.english_text || "(생성 중...)";

  return (
    <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 transition-colors hover:border-primary-200">
      {/* 상단: 뱃지 + 메타 */}
      <div className="flex flex-wrap items-center gap-2">
        {/* answer_type 뱃지 */}
        {script.answer_type && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${answerTypeColor}`}
          >
            {answerTypeLabel}
          </span>
        )}
        {/* 등급 뱃지 */}
        {levelLabel && (
          <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-600">
            {levelLabel}
          </span>
        )}
        {/* 소스 뱃지 */}
        <span className="text-xs text-foreground-muted">
          {SCRIPT_SOURCE_LABELS[script.source]}
        </span>
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

      {/* 주제 + 질문 */}
      <div className="mt-2">
        {script.topic && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            {(() => {
              const Icon = TOPIC_ICONS[script.topic] || DEFAULT_TOPIC_ICON;
              return <Icon size={14} className="shrink-0 text-foreground-secondary" />;
            })()}
            {script.topic}
          </p>
        )}
        {script.question_korean && (
          <p className="mt-0.5 text-xs text-foreground-secondary line-clamp-1">
            {script.question_korean}
          </p>
        )}
      </div>

      {/* 미리보기 */}
      <p className="mt-2 text-sm text-foreground-secondary line-clamp-2">
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
}: {
  initialData?: ShadowingHistoryItem[];
}) {
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

  // 훈련 가능한 스크립트 목록 (패키지 완료된 것)
  const { data: shadowableScripts, isLoading: scriptsLoading } = useQuery({
    queryKey: ["shadowable-scripts"],
    queryFn: async () => {
      const result = await getShadowableScripts();
      if (result.error) throw new Error(result.error);
      return result.data ?? [];
    },
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
    <div className="space-y-6">
      {/* 훈련 가능 스크립트 */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6">
        <h3 className="font-semibold text-foreground">쉐도잉 훈련</h3>
        <p className="mt-1 text-sm text-foreground-secondary">
          패키지가 완료된 스크립트를 선택하여 4단계 점진 훈련을 시작합니다.
        </p>

        {isLoading ? (
          <div className="mt-6 flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : !shadowableScripts?.length ? (
          <div className="mt-6 flex flex-col items-center py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-secondary">
              <Headphones size={24} className="text-foreground-muted" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground-secondary">
              훈련 가능한 스크립트가 없습니다
            </p>
            <p className="mt-1 text-xs text-foreground-muted">
              스크립트를 확정한 후 패키지를 생성하면 쉐도잉 훈련을 시작할 수 있습니다
            </p>
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
                    {script.target_level && (
                      <span className="rounded bg-primary-50 px-1.5 py-0.5 font-semibold text-primary-600">
                        {script.target_level}
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
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6">
          <h3 className="font-semibold text-foreground">훈련 이력</h3>
          <div className="mt-4 space-y-3">
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
                  href={`/scripts/shadowing?session=${session.id}`}
                  className="inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-medium text-primary-500 transition-colors hover:bg-primary-50"
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
