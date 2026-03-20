"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
} from "recharts";
import { ArrowUp, ArrowDown, Minus, TrendingUp, CheckCircle2, ThumbsUp, AlertTriangle, Target, Star, ArrowUpRight, Equal, Ban } from "lucide-react";
import { MOCK_GROWTH_DATA, type GrowthReportV2, type GradeHistoryItem, type TypeChangeStatus } from "@/lib/mock-data/result-v2";
import { OPIC_LEVEL_ORDER, type OpicLevel } from "@/lib/types/mock-exam";

// ── 성장리포트 탭 (v2) ──

export function TabGrowthV2() {
  const data = MOCK_GROWTH_DATA;

  return (
    <div className="space-y-5 p-4 pb-20 sm:p-6">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary-500" />
        <h2 className="text-lg font-bold text-foreground">성장 리포트</h2>
        <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700">
          {data.current_session.session_count}회차
        </span>
      </div>

      {/* 등급 추이 차트 + 등급 변화 */}
      <SectionGradeProgress
        history={data.grade_history}
        gradeChange={data.grade_change}
        targetGrade={data.target_grade}
      />

      {/* 섹션 2: 좋아진 점 */}
      <SectionObservationList
        icon={ThumbsUp}
        title="좋아진 점"
        items={data.improvements}
        variant="positive"
      />

      {/* 섹션 3: 아직 부족한 점 */}
      <SectionObservationList
        icon={AlertTriangle}
        title="아직 부족한 점"
        items={data.weaknesses}
        variant="negative"
      />

      {/* 섹션 4: 문항 유형별 변화 */}
      <SectionTypeComparison items={data.type_comparison} targetGrade={data.target_grade} />

      {/* 섹션 5: 집중 훈련 포인트 + CTA */}
      <SectionFocusPoint focusPoint={data.focus_point} />
    </div>
  );
}

// ── 등급 추이 차트 + 등급 변화 ──

const LEVEL_Y: Record<string, number> = { NH: 1, IL: 2, IM1: 3, IM2: 4, IM3: 5, IH: 6, AL: 7 };
const Y_LABEL: Record<number, string> = { 1: "NH", 2: "IL", 3: "IM1", 4: "IM2", 5: "IM3", 6: "IH", 7: "AL" };

function GradeYTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: number } }) {
  const label = Y_LABEL[payload?.value ?? 0] || "";
  const isTarget = false; // 목표 등급은 ReferenceLine으로 처리
  return (
    <text x={14} y={y} dy={4} fontSize={11} fill="var(--color-foreground-secondary, #8B7E72)" textAnchor="middle" fontWeight={isTarget ? 700 : 400}>
      {label}
    </text>
  );
}

function GradeTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Record<string, unknown> }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-md">
      <p className="text-xs text-foreground-muted">{d.date as string}</p>
      <p className="text-sm font-bold text-primary-600">{d.grade as string}</p>
    </div>
  );
}

function SectionGradeProgress({
  history,
  gradeChange,
  targetGrade,
}: {
  history: GradeHistoryItem[];
  gradeChange: GrowthReportV2["grade_change"];
  targetGrade: string;
}) {
  const chartData = useMemo(() =>
    history.map((h) => ({
      name: `${h.session_count}회차`,
      y: LEVEL_Y[h.grade] ?? 0,
      grade: h.grade,
      date: h.date,
    })),
    [history],
  );

  const targetY = LEVEL_Y[targetGrade] ?? 6;
  const isUp = gradeChange.diff > 0;
  const isDown = gradeChange.diff < 0;

  // Y축 범위: NH(1) ~ AL(7) 전체 표시
  const yMin = 1;
  const yMax = 7;

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      {/* 헤더: 등급 변화 요약 */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-foreground-secondary">{gradeChange.previous}</span>
          <span className="text-foreground-muted">→</span>
          <span className="text-xl font-bold text-foreground">{gradeChange.current}</span>
          {isUp && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-green-50 px-2 py-0.5 text-xs font-bold text-green-600">
              <ArrowUp className="h-3 w-3" />
              {gradeChange.diff}단계
            </span>
          )}
          {isDown && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-500">
              <ArrowDown className="h-3 w-3" />
              {Math.abs(gradeChange.diff)}단계
            </span>
          )}
          {!isUp && !isDown && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-foreground-muted">
              <Minus className="h-3 w-3" />
              유지
            </span>
          )}
        </div>
        <span className="text-xs text-foreground-muted">
          목표 <span className="font-semibold text-primary-700">{targetGrade}</span>
        </span>
      </div>

      {/* 차트 */}
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 50, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #EAE0D5)" vertical={false} />

            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "var(--color-foreground-muted, #B5A99D)" }}
              axisLine={false}
              tickLine={false}
              padding={{ left: 20, right: 20 }}
            />
            <YAxis
              domain={[yMin, yMax]}
              ticks={Array.from({ length: yMax - yMin + 1 }, (_, i) => yMin + i)}
              tick={GradeYTick as unknown as React.ComponentType}
              axisLine={false}
              tickLine={false}
              interval={0}
              width={30}
            />

            {/* 목표 등급 점선 */}
            <ReferenceLine
              y={targetY}
              stroke="var(--color-primary-500, #D4835E)"
              strokeDasharray="6 4"
              strokeWidth={1.5}
              label={{
                value: `목표 ${targetGrade}`,
                position: "right",
                fontSize: 10,
                fill: "var(--color-primary-700, #A5603F)",
              }}
            />

            <Tooltip content={<GradeTooltip />} />

            {/* 등급 라인 (계단식) */}
            <Line
              type="stepAfter"
              dataKey="y"
              stroke="var(--color-primary-500, #D4835E)"
              strokeWidth={2.5}
              dot={{ r: 5, fill: "var(--color-surface, #FFFCF8)", stroke: "var(--color-primary-500, #D4835E)", strokeWidth: 2.5 }}
              activeDot={{ r: 7, fill: "var(--color-primary-500, #D4835E)", stroke: "var(--color-surface, #FFFCF8)", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── 섹션 2/3: 관찰 리스트 (좋아진 점 / 부족한 점) ──

function SectionObservationList({
  icon: Icon,
  title,
  items,
  variant,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: string[];
  variant: "positive" | "negative";
}) {
  const borderColor = variant === "positive" ? "border-green-200" : "border-amber-200";
  const bgColor = variant === "positive" ? "bg-green-50/50" : "bg-amber-50/50";
  const iconColor = variant === "positive" ? "text-green-600" : "text-amber-600";
  const dotColor = variant === "positive" ? "bg-green-500" : "bg-amber-500";

  return (
    <div className={`rounded-xl border ${borderColor} ${bgColor} p-4`}>
      <div className="mb-3 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground-secondary">
            <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${dotColor}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── 섹션 4: 문항 유형별 변화 ──

const STATUS_CONFIG: Record<TypeChangeStatus, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}> = {
  reached: { label: "도달", icon: Star, color: "text-green-600", bgColor: "bg-green-50" },
  improved: { label: "향상", icon: ArrowUpRight, color: "text-blue-600", bgColor: "bg-blue-50" },
  maintained: { label: "유지", icon: Equal, color: "text-foreground-muted", bgColor: "bg-gray-100" },
  declined: { label: "하락", icon: ArrowDown, color: "text-red-500", bgColor: "bg-red-50" },
  not_attempted: { label: "미수행", icon: Ban, color: "text-foreground-muted", bgColor: "bg-gray-100" },
};

function SectionTypeComparison({
  items,
  targetGrade,
}: {
  items: GrowthReportV2["type_comparison"];
  targetGrade: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-4 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-primary-500" />
        <h3 className="text-sm font-bold text-foreground">문항 유형별 변화</h3>
        <span className="text-xs text-foreground-muted">목표: {targetGrade}</span>
      </div>
      <div className="space-y-4">
        {items.map((item) => (
          <TypeComparisonCard key={item.type} item={item} />
        ))}
      </div>
    </div>
  );
}

function TypeComparisonCard({ item }: { item: GrowthReportV2["type_comparison"][number] }) {
  const config = STATUS_CONFIG[item.status];
  const StatusIcon = config.icon;

  return (
    <div className="rounded-lg border border-border/60 bg-surface-secondary/30 p-3">
      {/* 헤더: 유형명 + 상태 뱃지 */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">{item.type_label}</span>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.color} ${config.bgColor}`}>
          <StatusIcon className="h-3 w-3" />
          {config.label}
        </span>
      </div>

      {/* 도달도 도트 */}
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs text-foreground-muted">목표 기준:</span>
        <CriteriaDots met={item.criteria_met} total={item.criteria_total} />
        <span className="text-xs font-medium text-foreground-secondary">
          {item.criteria_met}/{item.criteria_total}
        </span>
      </div>

      {/* 변화 관찰 */}
      <p className="mb-1 text-xs leading-relaxed text-foreground-secondary">
        <span className="font-medium text-foreground">변화:</span>{" "}
        {item.change_observation}
      </p>

      {/* 남은 과제 */}
      <p className="text-xs leading-relaxed text-foreground-muted">
        <span className="font-medium">
          {item.status === "reached" ? "평가:" : "남은 과제:"}
        </span>{" "}
        {item.remaining}
      </p>
    </div>
  );
}

function CriteriaDots({ met, total }: { met: number; total: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-2.5 w-2.5 rounded-full ${
            i < met ? "bg-primary-500" : "bg-border"
          }`}
        />
      ))}
    </div>
  );
}

// ── 섹션 5: 집중 훈련 포인트 + CTA ──

function SectionFocusPoint({ focusPoint }: { focusPoint: GrowthReportV2["focus_point"] }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-2 flex items-center gap-2">
        <Target className="h-4 w-4 text-primary-500" />
        <h3 className="text-sm font-bold text-foreground">집중 훈련 포인트</h3>
        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
          {focusPoint.area_label}
        </span>
      </div>
      <p className="mb-4 text-sm leading-relaxed text-foreground-secondary">
        {focusPoint.observation}
      </p>

      {/* 튜터링 CTA */}
      <a
        href="/tutoring?tab=prescription"
        className="flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
      >
        <Target className="h-4 w-4" />
        튜터링으로 집중 훈련하기
      </a>
    </div>
  );
}
