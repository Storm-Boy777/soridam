"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { MockExamHistoryItem, OpicLevel } from "@/lib/types/mock-exam";
import {
  OPIC_LEVEL_ORDER,
  MOCK_EXAM_MODE_LABELS,
} from "@/lib/types/mock-exam";

const FACT_COLORS: Record<string, string> = {
  F: "#3B82F6", // 파랑
  A: "#10B981", // 초록
  C: "#F59E0B", // 주황
  T: "#8B5CF6", // 보라
};

/* ── 유틸 ── */

function levelToY(level: OpicLevel | null): number {
  if (!level) return 0;
  return OPIC_LEVEL_ORDER[level] ?? 0;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// 이동 평균 계산 (최근 n개)
function movingAverage(values: number[], window: number): (number | null)[] {
  return values.map((_, i) => {
    if (i < window - 1) return null;
    const slice = values.slice(i - window + 1, i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

/* ── Y축 커스텀 틱 (등급 라벨 왼쪽 정렬) ── */

const LEVEL_LABELS: Record<number, string> = { 1: "NH", 2: "IL", 3: "IM1", 4: "IM2", 5: "IM3", 6: "IH", 7: "AL" };

function YAxisTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: number } }) {
  const label = LEVEL_LABELS[payload?.value ?? 0] || "";
  return (
    <text x={14} y={y} dy={4} fontSize={11} fill="var(--color-foreground-secondary, #8B7E72)" textAnchor="middle">
      {label}
    </text>
  );
}

/* ── 커스텀 툴팁 ── */

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Record<string, unknown> }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-surface p-2.5 shadow-md">
      <p className="text-xs font-medium text-foreground">
        {d.fullDate as string} · {d.modeLabel as string}
      </p>
      <p className="mt-1 text-sm font-bold text-primary-600">
        {d.level as string}
      </p>
      <div className="mt-1 flex gap-2 text-[10px] text-foreground-muted">
        <span style={{ color: FACT_COLORS.F }}>F:{(d.f as number)?.toFixed(1)}</span>
        <span style={{ color: FACT_COLORS.A }}>A:{(d.a as number)?.toFixed(1)}</span>
        <span style={{ color: FACT_COLORS.C }}>C:{(d.c as number)?.toFixed(1)}</span>
        <span style={{ color: FACT_COLORS.T }}>T:{(d.t as number)?.toFixed(1)}</span>
      </div>
    </div>
  );
}

/* ── 메인 컴포넌트 ── */

interface GradeProgressChartProps {
  data: MockExamHistoryItem[];
}

export function GradeProgressChart({ data }: GradeProgressChartProps) {
  // 완료된 데이터만 (이미 시간순)
  const items = useMemo(
    () => data.filter((h) => h.status === "completed" && h.final_level).slice(-10),
    [data]
  );

  // 차트 데이터 변환
  const chartData = useMemo(
    () =>
      items.map((item, i) => ({
        idx: i + 1,
        label: `${i + 1}회`,
        date: formatDate(item.started_at),
        fullDate: new Date(item.started_at).toLocaleDateString("ko-KR"),
        level: item.final_level,
        levelY: levelToY(item.final_level as OpicLevel),
        totalScore: item.total_score ?? 0,
        modeLabel: MOCK_EXAM_MODE_LABELS[item.mode],
        f: item.score_f ?? 0,
        a: item.score_a ?? 0,
        c: item.score_c ?? 0,
        t: item.score_t ?? 0,
      })),
    [items]
  );

  // 이동 평균 (3회)
  const maValues = useMemo(
    () => movingAverage(chartData.map((d) => d.levelY), 3),
    [chartData]
  );

  const chartDataWithMA = useMemo(
    () => chartData.map((d, i) => ({ ...d, ma3: maValues[i] })),
    [chartData, maValues]
  );

  // 최신 데이터
  const latest = items[items.length - 1];
  const previous = items.length >= 2 ? items[items.length - 2] : null;

  if (!latest) return null;

  const currentLevel = latest.final_level as OpicLevel;

  // 등급 변화
  const levelChange = previous
    ? (OPIC_LEVEL_ORDER[currentLevel] ?? 0) - (OPIC_LEVEL_ORDER[previous.final_level as OpicLevel] ?? 0)
    : 0;

  return (
    <div className="flex flex-col">
      {/* A. 등급 추이 계단 그래프 */}
      <div className="flex flex-1 flex-col rounded-xl border border-border bg-surface p-3 sm:p-6">
        <div className="mb-3 flex items-center justify-between sm:mb-4">
          <h3 className="font-semibold text-foreground">나의 등급 추이</h3>
          <div className="flex items-center gap-1.5">
            {levelChange > 0 && (
              <span className="flex items-center gap-0.5 text-[11px] font-medium text-green-600">
                <TrendingUp size={12} /> 상승
              </span>
            )}
            {levelChange < 0 && (
              <span className="flex items-center gap-0.5 text-[11px] font-medium text-red-500">
                <TrendingDown size={12} /> 하락
              </span>
            )}
            {levelChange === 0 && previous && (
              <span className="flex items-center gap-0.5 text-[11px] font-medium text-foreground-muted">
                <Minus size={12} /> 유지
              </span>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1" style={{ width: "100%", minHeight: 200 }}>
          <ResponsiveContainer>
            <ComposedChart data={chartDataWithMA} margin={{ top: 5, right: 15, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #EAE0D5)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--color-foreground-muted, #B5A99D)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 8]}
                ticks={[1, 2, 3, 4, 5, 6, 7]}
                tick={<YAxisTick />}
                interval={0}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip content={<ChartTooltip />} />

              {/* 등급 계단선 */}
              <Line
                type="stepAfter"
                dataKey="levelY"
                stroke="#D4835E"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#D4835E", stroke: "#fff", strokeWidth: 2 }}
                activeDot={{ r: 6, fill: "#D4835E", stroke: "#fff", strokeWidth: 2 }}
              />

              {/* 3회 이동 평균 (점선) */}
              {chartData.length >= 3 && (
                <Line
                  type="monotone"
                  dataKey="ma3"
                  stroke="#D4835E"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  dot={false}
                  connectNulls={false}
                  opacity={0.4}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}

/* ── 1회차 현재 상태 카드 ── */

export function CurrentStateCard({ data }: { data: MockExamHistoryItem }) {
  const level = data.final_level as OpicLevel;
  const factScores = {
    F: data.score_f ?? 0,
    A: data.score_a ?? 0,
    C: data.score_c ?? 0,
    T: data.score_t ?? 0,
  };
  const maxFact = 10;

  return (
    <div className="rounded-xl border border-border bg-surface p-3 sm:p-4">
      <h4 className="text-xs font-semibold text-foreground sm:text-sm">현재 수준</h4>

      <div className="mt-3 flex items-center gap-4 sm:mt-4">
        {/* 등급 배지 */}
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-50 sm:h-20 sm:w-20">
          <span className="text-lg font-bold text-primary-600 sm:text-xl">{level}</span>
        </div>

        {/* FACT 바 */}
        <div className="flex-1 space-y-1.5">
          {Object.entries(factScores).map(([key, val]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="w-3 text-[10px] font-medium" style={{ color: FACT_COLORS[key] }}>
                {key}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-secondary">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(val / maxFact) * 100}%`,
                    backgroundColor: FACT_COLORS[key],
                  }}
                />
              </div>
              <span className="w-6 text-right text-[10px] text-foreground-muted">
                {val.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-foreground-secondary sm:mt-4">
        다음 응시 후 성장 추이를 확인할 수 있습니다
      </p>
    </div>
  );
}
