"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, TrendingUp, FileText, Users, Info, ChevronDown, Lock } from "lucide-react";
import Link from "next/link";
import { getFrequency, getQuestionFrequency } from "@/lib/actions/reviews";
import type {
  FrequencyItem,
  ReviewStats,
  FrequencyCategory,
  SurveyType,
} from "@/lib/types/reviews";
import {
  FREQUENCY_CATEGORIES,
  FREQUENCY_COMBO_MAP,
  QUESTION_TYPE_LABELS,
  QUESTION_TYPE_COLORS,
} from "@/lib/types/reviews";

interface FrequencyTabProps {
  initialStats: ReviewStats;
  initialFrequency: FrequencyItem[];
  isPaidUser?: boolean;
}

// 카테고리별 색상 테마
const CATEGORY_THEME: Record<FrequencyCategory, { bar: string; text: string; badge: string }> = {
  "일반": { bar: "bg-primary-500", text: "text-primary-600", badge: "bg-primary-50 text-primary-600" },
  "롤플레이": { bar: "bg-emerald-500", text: "text-emerald-600", badge: "bg-emerald-50 text-emerald-600" },
  "어드밴스": { bar: "bg-amber-500", text: "text-amber-600", badge: "bg-amber-50 text-amber-600" },
};

export function FrequencyTab({ initialStats, initialFrequency, isPaidUser = false }: FrequencyTabProps) {
  const queryClient = useQueryClient();
  // 무료 사용자는 어드밴스만 접근 가능
  const [subTab, setSubTab] = useState<FrequencyCategory>(isPaidUser ? "일반" : "어드밴스");
  const [showUpgradeHint, setShowUpgradeHint] = useState(false);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState<number>(10);
  const [bannerOpen, setBannerOpen] = useState(false);
  const prefetchedRef = useRef(false);

  const { data: frequencyData = [], isLoading: loading } = useQuery({
    queryKey: ["review-frequency"],
    queryFn: async () => {
      const result = await getFrequency();
      return result.data || [];
    },
    initialData: initialFrequency,
    initialDataUpdatedAt: Date.now(),
    staleTime: 5 * 60 * 1000, // 5분
  });

  // 주제별 질문 빈도 Prefetch — 카테고리별로 사전 로드
  useEffect(() => {
    if (prefetchedRef.current || frequencyData.length === 0) return;
    prefetchedRef.current = true;

    const uniqueTopics = [...new Set(frequencyData.map((item) => item.topic))];
    // 무료 사용자는 어드밴스만 접근 가능 → 어드밴스만 prefetch
    const categoriesToPrefetch = isPaidUser ? FREQUENCY_CATEGORIES : (["어드밴스"] as const);
    // 네트워크 요청 과다 방지: 상위 5개 토픽만 prefetch + 캐시 중복 제거
    const topicsToFetch = uniqueTopics.slice(0, 5);
    for (const cat of categoriesToPrefetch) {
      for (const topic of topicsToFetch) {
        const key = ["question-frequency", topic, cat];
        if (queryClient.getQueryData(key)) continue; // 이미 캐시에 있으면 스킵
        queryClient.prefetchQuery({
          queryKey: key,
          queryFn: async () => {
            const result = await getQuestionFrequency(topic, cat);
            return result.data || [];
          },
          staleTime: 5 * 60 * 1000,
        });
      }
    }
  }, [frequencyData, queryClient]);

  // 클릭한 주제의 질문 빈도 조회 (현재 서브탭 카테고리 포함)
  const { data: questionData = [], isLoading: questionLoading } = useQuery({
    queryKey: ["question-frequency", expandedTopic, subTab],
    queryFn: async () => {
      if (!expandedTopic) return [];
      const result = await getQuestionFrequency(expandedTopic, subTab);
      return result.data || [];
    },
    enabled: !!expandedTopic,
    staleTime: 5 * 60 * 1000,
  });

  // 현재 서브탭에 해당하는 combo_type 필터 → 주제별 빈도 + survey_type 합산
  const comboTypes = FREQUENCY_COMBO_MAP[subTab];
  const topicFreqMap = new Map<string, { frequency: number; survey_type?: SurveyType }>();
  for (const item of frequencyData) {
    if (!comboTypes.includes(item.combo_type)) continue;
    const existing = topicFreqMap.get(item.topic);
    if (existing) {
      existing.frequency += item.frequency;
      // survey_type은 첫 번째 값 유지 (덮어쓰지 않음)
    } else {
      topicFreqMap.set(item.topic, { frequency: item.frequency, survey_type: item.survey_type });
    }
  }
  const aggregatedData = Array.from(topicFreqMap.entries())
    .map(([topic, { frequency, survey_type }]) => ({ topic, frequency, survey_type }))
    .sort((a, b) => b.frequency - a.frequency);

  // 최대 빈도 (바 너비 계산용)
  const maxFreq = aggregatedData.length > 0
    ? aggregatedData[0].frequency
    : 1;

  const totalReviews = initialStats.totalReviews;

  const handleTopicClick = (topic: string) => {
    setExpandedTopic(expandedTopic === topic ? null : topic);
  };

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
            출제 빈도 분석이란?
          </p>
          {bannerOpen && (
            <p className="mt-0.5 text-xs text-foreground-secondary sm:mt-1 sm:text-sm">
              실제 시험 응시자들의 후기를 분석하여, 어떤 주제가 자주 출제되는지
              빈도순으로 보여줍니다. 높은 빈도의 주제부터 준비하면 효율적입니다.
            </p>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`shrink-0 text-primary-400 transition-transform ${bannerOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* 통계 요약 — 모바일: 가로 1줄 컴팩트 / 데스크톱: 카드 3열 */}
      <div className="grid grid-cols-3 gap-2 rounded-[var(--radius-xl)] border border-border bg-surface p-3 sm:gap-4 sm:border-0 sm:bg-transparent sm:p-0">
        {[
          { icon: FileText, color: "bg-primary-50 text-primary-500", label: "총 후기", value: initialStats.totalReviews, unit: "개" },
          { icon: TrendingUp, color: "bg-secondary-50 text-secondary-600", label: "분석 주제", value: initialStats.uniqueTopics, unit: "개" },
          { icon: Users, color: "bg-primary-50 text-primary-500", label: "분석 질문", value: initialStats.uniqueQuestions, unit: "개" },
        ].map(({ icon: Icon, color, label, value, unit }) => (
          <div key={label} className="flex flex-col items-center text-center sm:rounded-[var(--radius-xl)] sm:border sm:border-border sm:bg-surface sm:px-5 sm:py-4">
            <div className="hidden sm:flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-[var(--radius-md)] ${color}`}>
                <Icon size={14} />
              </div>
              <p className="text-sm text-foreground-secondary">{label}</p>
            </div>
            <p className="text-xs text-foreground-secondary sm:hidden">{label}</p>
            <p className="mt-0.5 text-xl font-bold text-foreground sm:mt-2 sm:text-2xl">
              {value > 0 ? <>{value}<span className="ml-0.5 text-sm font-medium text-foreground-muted sm:text-base">{unit}</span></> : "—"}
            </p>
          </div>
        ))}
      </div>

      {/* 카테고리별 서브탭 */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <h3 className="text-sm font-semibold text-foreground sm:text-base">카테고리별 출제 빈도</h3>
          <div className="flex items-center gap-1">
            {([10, 15, 20, 0] as const).map((count) => {
              const label = count === 0 ? "모두" : `${count}`;
              const isActive = displayCount === count;
              return (
                <button
                  key={count}
                  onClick={() => setDisplayCount(count)}
                  className={`rounded-[var(--radius-md)] px-2 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-primary-500 text-white"
                      : "text-foreground-muted hover:text-foreground-secondary hover:bg-surface-secondary"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <p className="mt-0.5 text-xs text-foreground-secondary sm:mt-1 sm:text-sm">
          일반 / 롤플레이 / 어드밴스 카테고리별 출제 빈도를 분석합니다
        </p>

        {/* 서브탭 */}
        <div className="mt-4 flex gap-1 rounded-[var(--radius-lg)] bg-surface-secondary p-1">
          {FREQUENCY_CATEGORIES.map((cat) => {
            const isLocked = !isPaidUser && cat !== "어드밴스";
            return (
              <button
                key={cat}
                onClick={() => {
                  if (isLocked) {
                    setShowUpgradeHint(true);
                    return;
                  }
                  setShowUpgradeHint(false);
                  setSubTab(cat);
                  setExpandedTopic(null);
                }}
                className={`flex flex-1 items-center justify-center gap-1 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors ${
                  subTab === cat
                    ? "bg-surface text-foreground shadow-sm"
                    : isLocked
                      ? "cursor-not-allowed text-foreground-muted/60"
                      : "text-foreground-muted hover:text-foreground-secondary"
                }`}
              >
                {isLocked && <Lock size={12} className="shrink-0" />}
                {cat}
              </button>
            );
          })}
        </div>

        {/* 무료 사용자 업그레이드 안내 */}
        {showUpgradeHint && !isPaidUser && (
          <div className="mt-3 flex items-center justify-between rounded-[var(--radius-lg)] border border-primary-200 bg-primary-50/50 px-4 py-3">
            <p className="text-sm text-foreground-secondary">
              유료 플랜에서 일반/롤플레이 빈도를 확인할 수 있습니다.
            </p>
            <Link
              href="/store"
              className="shrink-0 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600 transition-colors"
            >
              크레딧 충전하기
            </Link>
          </div>
        )}

        {/* 빈도 결과 */}
        <div className="mt-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 animate-pulse rounded-[var(--radius-md)] bg-surface-secondary"
                />
              ))}
            </div>
          ) : aggregatedData.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-secondary">
                <BarChart3 size={24} className="text-foreground-muted" />
              </div>
              <p className="mt-3 text-sm font-medium text-foreground-secondary">
                아직 분석 데이터가 없습니다
              </p>
              <p className="mt-1 text-xs text-foreground-muted">
                시험 후기가 제출되면 빈도 분석 결과가 표시됩니다
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {(displayCount > 0 ? aggregatedData.slice(0, displayCount) : aggregatedData).map((item, idx) => {
                const pct = totalReviews > 0
                  ? Math.round((item.frequency / totalReviews) * 100)
                  : 0;
                const typeLabel = item.survey_type === "선택형" ? "선택" : item.survey_type === "공통형" ? "공통" : null;
                const isExpanded = expandedTopic === item.topic;
                return (
                  <div key={item.topic}>
                    <button
                      type="button"
                      onClick={() => handleTopicClick(item.topic)}
                      className={`flex w-full items-center gap-3 rounded-[var(--radius-md)] p-2 text-left transition-colors hover:bg-surface-secondary ${
                        isExpanded ? "bg-surface-secondary" : ""
                      }`}
                    >
                      <span className="w-5 text-right text-xs font-medium text-foreground-muted">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-foreground">
                            {item.topic}
                          </span>
                          {typeLabel && (
                            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                              typeLabel === "선택"
                                ? CATEGORY_THEME[subTab].badge
                                : "bg-slate-100 text-slate-600"
                            }`}>
                              {typeLabel}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-secondary">
                          <div
                            className={`h-full rounded-full transition-all ${CATEGORY_THEME[subTab].bar}`}
                            style={{
                              width: `${(item.frequency / maxFreq) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-1">
                        <div className="text-right">
                          <span className={`text-sm font-bold ${CATEGORY_THEME[subTab].text}`}>
                            {item.frequency}
                          </span>
                          <span className="ml-1 text-xs text-foreground-muted">
                            ({pct}%)
                          </span>
                        </div>
                        <ChevronDown
                          size={14}
                          className={`text-foreground-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </div>
                    </button>

                    {/* 질문 빈도 드릴다운 */}
                    {isExpanded && (
                      <div className="ml-8 mr-2 mt-1 mb-2 space-y-1 border-l-2 border-primary-100 pl-3">
                        {questionLoading ? (
                          <div className="space-y-2 py-2">
                            {Array.from({ length: 2 }).map((_, i) => (
                              <div
                                key={i}
                                className="h-8 animate-pulse rounded-[var(--radius-md)] bg-surface-secondary"
                              />
                            ))}
                          </div>
                        ) : questionData.length === 0 ? (
                          <p className="py-2 text-xs text-foreground-muted">
                            질문 데이터가 없습니다
                          </p>
                        ) : (
                          questionData.map((q, qIdx) => {
                            const qPct = totalReviews > 0
                              ? Math.round((q.frequency / totalReviews) * 100)
                              : 0;
                            return (
                              <div
                                key={q.question_english || qIdx}
                                className="rounded-[var(--radius-md)] bg-surface-secondary/50 px-3 py-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-foreground">
                                      {q.question_type && (
                                        <span className={`mr-1.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium align-middle ${
                                          QUESTION_TYPE_COLORS[q.question_type] || "bg-gray-100 text-gray-700"
                                        }`}>
                                          {QUESTION_TYPE_LABELS[q.question_type] || q.question_type}
                                        </span>
                                      )}
                                      {q.question_english}
                                    </p>
                                    <p className="mt-0.5 text-xs text-foreground-muted">
                                      {q.question_korean}
                                    </p>
                                  </div>
                                  <div className="shrink-0 text-right">
                                    <span className="text-xs font-bold text-primary-600">
                                      {q.frequency}
                                    </span>
                                    <span className="ml-0.5 text-[10px] text-foreground-muted">
                                      ({qPct}%)
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
