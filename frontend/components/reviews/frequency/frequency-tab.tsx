"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  TrendingUp,
  FileText,
  Users,
  Info,
} from "lucide-react";
import { getFrequency } from "@/lib/actions/reviews";
import type {
  FrequencyItem,
  ReviewStats,
  FrequencyCategory,
} from "@/lib/types/reviews";
import {
  FREQUENCY_CATEGORIES,
  FREQUENCY_COMBO_MAP,
  COMBO_TYPE_LABELS,
} from "@/lib/types/reviews";

interface FrequencyTabProps {
  initialStats: ReviewStats;
  initialFrequency: FrequencyItem[];
}

export function FrequencyTab({ initialStats, initialFrequency }: FrequencyTabProps) {
  const [subTab, setSubTab] = useState<FrequencyCategory>("일반");

  const { data: frequencyData = [], isLoading: loading } = useQuery({
    queryKey: ["review-frequency"],
    queryFn: async () => {
      const result = await getFrequency();
      return result.data || [];
    },
    initialData: initialFrequency,
    staleTime: 5 * 60 * 1000, // 5분
  });

  // 현재 서브탭에 해당하는 combo_type 필터
  const comboTypes = FREQUENCY_COMBO_MAP[subTab];
  const filteredData = frequencyData.filter((item) =>
    comboTypes.includes(item.combo_type)
  );

  // 최대 빈도 (바 너비 계산용)
  const maxFreq = filteredData.length > 0
    ? Math.max(...filteredData.map((d) => d.frequency))
    : 1;

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

      {/* 통계 요약 카드 */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] bg-primary-50 text-primary-500">
              <FileText size={18} />
            </div>
            <p className="text-sm text-foreground-secondary">총 후기 수</p>
          </div>
          <p className="mt-3 text-2xl font-bold text-foreground">
            {initialStats.totalReviews > 0 ? initialStats.totalReviews : "—"}
          </p>
          <p className="mt-0.5 text-xs text-foreground-muted">
            {initialStats.totalReviews > 0 ? "개의 후기" : "데이터 수집 중"}
          </p>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] bg-secondary-50 text-secondary-600">
              <TrendingUp size={18} />
            </div>
            <p className="text-sm text-foreground-secondary">분석 주제 수</p>
          </div>
          <p className="mt-3 text-2xl font-bold text-foreground">
            {initialStats.uniqueTopics > 0 ? initialStats.uniqueTopics : "—"}
          </p>
          <p className="mt-0.5 text-xs text-foreground-muted">
            {initialStats.uniqueTopics > 0 ? "개 주제" : "데이터 수집 중"}
          </p>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] bg-accent-50 text-accent-500">
              <Users size={18} />
            </div>
            <p className="text-sm text-foreground-secondary">참여 응시자</p>
          </div>
          <p className="mt-3 text-2xl font-bold text-foreground">
            {initialStats.totalParticipants > 0 ? initialStats.totalParticipants : "—"}
          </p>
          <p className="mt-0.5 text-xs text-foreground-muted">
            {initialStats.totalParticipants > 0 ? "명 참여" : "데이터 수집 중"}
          </p>
        </div>
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
              onClick={() => setSubTab(cat)}
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
          ) : filteredData.length === 0 ? (
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
            <div className="space-y-2">
              {filteredData.map((item, idx) => (
                <div
                  key={`${item.combo_type}-${item.topic}`}
                  className="flex items-center gap-3 rounded-[var(--radius-md)] p-2 hover:bg-surface-secondary"
                >
                  <span className="w-5 text-right text-xs font-medium text-foreground-muted">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {item.topic}
                      </span>
                      <span className="rounded-full bg-surface-secondary px-1.5 py-0.5 text-[10px] text-foreground-muted">
                        {COMBO_TYPE_LABELS[item.combo_type]}
                      </span>
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
                  <span className="w-10 text-right text-sm font-bold text-primary-600">
                    {item.frequency}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
