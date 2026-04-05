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
import { TrendingUp, TrendingDown, Minus, ChevronRight } from "lucide-react";
import type { MockExamHistoryItem } from "@/lib/types/mock-exam";
import {
  OPIC_LEVEL_ORDER,
  MOCK_EXAM_MODE_LABELS,
} from "@/lib/types/mock-exam";

type OpicLevel = keyof typeof OPIC_LEVEL_ORDER;

/* ── 유틸 ── */

function levelToY(level: string | null): number {
  if (!level) return 0;
  return OPIC_LEVEL_ORDER[level as OpicLevel] ?? 0;
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
    <text x={14} y={y} dy={4} fontSize={11} fill="var(--color-foreground-secondary, #6B6B7B)" textAnchor="middle">
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
        levelY: levelToY(item.final_level),
        modeLabel: MOCK_EXAM_MODE_LABELS[item.mode],
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

  const currentLevel = latest.final_level;

  // 등급 변화
  const levelChange = previous
    ? levelToY(currentLevel) - levelToY(previous.final_level)
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
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #E8E6E1)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--color-foreground-muted, #A0A0AF)" }}
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
                stroke="#3A5BC7"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#3A5BC7", stroke: "#fff", strokeWidth: 2 }}
                activeDot={{ r: 6, fill: "#3A5BC7", stroke: "#fff", strokeWidth: 2 }}
              />

              {/* 3회 이동 평균 (점선) */}
              {chartData.length >= 3 && (
                <Line
                  type="monotone"
                  dataKey="ma3"
                  stroke="#3A5BC7"
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

/* ── 1회차: 등급 추이 안내 카드 ── */

export function CurrentStateCard({ data, targetGrade }: { data: MockExamHistoryItem; targetGrade?: string }) {
  const level = data.final_level || "—";

  return (
    <div className="flex flex-col items-center rounded-xl border border-border bg-surface p-4 sm:p-6">
      {/* 아이콘 + 제목 */}
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 sm:h-12 sm:w-12">
        <TrendingUp size={20} className="text-primary-500" />
      </div>
      <h4 className="mt-2.5 text-sm font-semibold text-foreground sm:text-base">등급 추이 그래프</h4>
      <p className="mt-1 text-center text-xs leading-relaxed text-foreground-muted">
        한 번 더 응시하면 등급 변화를<br className="sm:hidden" /> 그래프로 비교할 수 있어요
      </p>

      {/* 미리보기: 현재 → 목표 */}
      <div className="mt-4 flex items-center gap-3 rounded-lg bg-surface-secondary/60 px-4 py-2.5 sm:gap-4 sm:px-5 sm:py-3">
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-foreground-muted">현재</span>
          <span className="mt-0.5 text-base font-bold text-primary-600 sm:text-lg">{level}</span>
        </div>
        {targetGrade && (
          <>
            <ChevronRight size={16} className="text-foreground-muted" />
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-foreground-muted">목표</span>
              <span className="mt-0.5 text-base font-bold text-foreground-secondary sm:text-lg">{targetGrade}</span>
            </div>
          </>
        )}
      </div>

      {/* 안내 */}
      <p className="mt-3 text-center text-[11px] text-foreground-muted sm:mt-4">
        다음 응시 후 추이 그래프가 표시됩니다
      </p>
    </div>
  );
}
