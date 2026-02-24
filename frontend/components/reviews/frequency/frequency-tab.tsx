"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, TrendingUp, FileText, Users, Info, ChevronDown } from "lucide-react";
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
  ANSWER_TYPE_LABELS,
  ANSWER_TYPE_COLORS,
} from "@/lib/types/reviews";

interface FrequencyTabProps {
  initialStats: ReviewStats;
  initialFrequency: FrequencyItem[];
}

export function FrequencyTab({ initialStats, initialFrequency }: FrequencyTabProps) {
  const queryClient = useQueryClient();
  const [subTab, setSubTab] = useState<FrequencyCategory>("일반");
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
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

  // 주제별 질문 빈도 Prefetch — 빈도 데이터 로드 후 1회만 실행
  useEffect(() => {
    if (prefetchedRef.current || frequencyData.length === 0) return;
    prefetchedRef.current = true;

    const uniqueTopics = [...new Set(frequencyData.map((item) => item.topic))];
    for (const topic of uniqueTopics) {
      queryClient.prefetchQuery({
        queryKey: ["question-frequency", topic],
        queryFn: async () => {
          const result = await getQuestionFrequency(topic);
          return result.data || [];
        },
        staleTime: 5 * 60 * 1000,
      });
    }
  }, [frequencyData, queryClient]);

  // 클릭한 주제의 질문 빈도 조회
  const { data: questionData = [], isLoading: questionLoading } = useQuery({
    queryKey: ["question-frequency", expandedTopic],
    queryFn: async () => {
      if (!expandedTopic) return [];
      const result = await getQuestionFrequency(expandedTopic);
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
    <div className="space-y-6">
      {/* 안내 배너 */}
      <div className="flex items-start gap-3 rounded-[var(--radius-xl)] border border-primary-200 bg-primary-50/50 p-4">
        <Info size={18} className="mt-0.5 shrink-0 text-primary-500" />
        <div>
          <p className="text-sm font-medium text-foreground">
            출제 빈도 분석이란?
          </p>
          <p className="mt-1 text-sm text-foreground-secondary">
            실제 시험 응시자들의 후기를 분석하여, 어떤 주제가 자주 출제되는지
            빈도순으로 보여줍니다. 높은 빈도의 주제부터 준비하면 효율적입니다.
          </p>
        </div>
      </div>

      {/* 통계 요약 — 모바일: 가로 1줄 컴팩트 / 데스크톱: 카드 3열 */}
      <div className="grid grid-cols-3 gap-2 rounded-[var(--radius-xl)] border border-border bg-surface p-3 sm:gap-4 sm:border-0 sm:bg-transparent sm:p-0">
        {[
          { icon: FileText, color: "bg-primary-50 text-primary-500", label: "총 후기", value: initialStats.totalReviews, unit: "개" },
          { icon: TrendingUp, color: "bg-secondary-50 text-secondary-600", label: "분석 주제", value: initialStats.uniqueTopics, unit: "개" },
          { icon: Users, color: "bg-accent-50 text-accent-500", label: "참여자", value: initialStats.totalParticipants, unit: "명" },
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
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6">
        <h3 className="font-semibold text-foreground">카테고리별 출제 빈도</h3>
        <p className="mt-1 text-sm text-foreground-secondary">
          일반 질문 / 롤플레이 / 어드밴스 카테고리별 출제 빈도를 분석합니다
        </p>

        {/* 서브탭 */}
        <div className="mt-4 flex gap-1 rounded-[var(--radius-lg)] bg-surface-secondary p-1">
          {FREQUENCY_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => { setSubTab(cat); setExpandedTopic(null); }}
              className={`flex flex-1 items-center justify-center gap-1 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors ${
                subTab === cat
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-foreground-muted hover:text-foreground-secondary"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

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
              {aggregatedData.map((item, idx) => {
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
                                ? "bg-primary-50 text-primary-600"
                                : "bg-slate-100 text-slate-600"
                            }`}>
                              {typeLabel}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-secondary">
                          <div
                            className="h-full rounded-full bg-primary-500 transition-all"
                            style={{
                              width: `${(item.frequency / maxFreq) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-1">
                        <div className="text-right">
                          <span className="text-sm font-bold text-primary-600">
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
                                key={qIdx}
                                className="rounded-[var(--radius-md)] bg-surface-secondary/50 px-3 py-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-foreground">
                                      {q.answer_type && (
                                        <span className={`mr-1.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium align-middle ${
                                          ANSWER_TYPE_COLORS[q.answer_type] || "bg-gray-100 text-gray-700"
                                        }`}>
                                          {ANSWER_TYPE_LABELS[q.answer_type] || q.answer_type}
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
