"use client";

import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
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
import { type GrowthReportV2, type GradeHistoryItem, type TypeChangeStatus } from "@/lib/mock-data/mock-exam-result";

// ── 성장리포트 탭 (v2) — 진단서 스타일 ──

interface TabGrowthProps {
  /** 실데이터. 없으면 목 데이터 사용 */
  data?: GrowthReportV2 | null;
}

export function TabGrowth({ data: propData }: TabGrowthProps = {}) {
  if (!propData) {
    return (
      <div className="mx-auto max-w-5xl px-3 py-16 sm:py-24">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface px-6 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-50"><TrendingUp className="h-7 w-7 text-primary-500" /></div>
          <p className="text-[15px] font-medium text-foreground">성장 분석은 2회차부터 제공됩니다</p>
          <p className="text-[13px] text-foreground-secondary">다음 모의고사를 응시하면 이전 결과와 비교한 성장 분석이 이 탭에 표시됩니다.</p>
        </div>
      </div>
    );
  }
  const data = propData;

  return (
    <div className="mx-auto max-w-5xl px-3 py-4 sm:px-6 sm:py-6">

      {/* ── 진단서 프레임 ── */}
      <div className="border border-[#d0d7e2] bg-white shadow-[0_12px_36px_rgba(20,28,38,0.06)]">

        {/* ── 섹션 1: 등급 추이 차트 + 등급 변화 ── */}
        <div className="border-b border-[#d0d7e2] px-6 py-6 md:px-10">
          <SectionTitle>등급 변화</SectionTitle>
          <GradeChangeHeader gradeChange={data.grade_change} targetGrade={data.target_grade} />
          <GradeChart history={data.grade_history} targetGrade={data.target_grade} />
        </div>

        {/* ── 섹션 2: 좋아진 점 ── */}
        <div className="border-b border-[#d0d7e2] px-6 py-6 md:px-10">
          <SectionTitle>좋아진 점</SectionTitle>
          <ObservationList items={data.improvements} />
        </div>

        {/* ── 섹션 3: 아직 부족한 점 ── */}
        <div className="border-b border-[#d0d7e2] px-6 py-6 md:px-10">
          <SectionTitle>아직 부족한 점</SectionTitle>
          <ObservationList items={data.weaknesses} />
        </div>

        {/* ── 섹션 4: 문항 유형별 변화 ── */}
        <div className="border-b border-[#d0d7e2] px-6 py-6 md:px-10">
          <SectionTitle>문항 유형별 변화 <span className="ml-2 text-[12px] font-normal text-[#8a93a1]">목표: {data.target_grade}</span></SectionTitle>
          <div className="space-y-0 divide-y divide-[#e8edf3]">
            {data.type_comparison.map((item) => (
              <TypeComparisonRow key={item.type} item={item} />
            ))}
          </div>
        </div>

        {/* ── 섹션 5: 집중 훈련 포인트 + CTA ── */}
        <div className="px-6 py-6 md:px-10">
          <SectionTitle>집중 훈련 포인트 <span className="ml-2 inline-block rounded bg-[#fff3e0] px-1.5 py-0.5 text-[11px] font-bold text-[#e65100]">{data.focus_point.area_label}</span></SectionTitle>
          <p className="mb-5 text-[14px] leading-[1.9] text-[#2f3644]">
            {data.focus_point.observation}
          </p>
          <a
            href="/tutoring?tab=prescription"
            className="flex items-center justify-center gap-2 rounded bg-[#2449d8] px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#1a38b0]"
          >
            튜터링으로 집중 훈련하기
          </a>
        </div>

      </div>
    </div>
  );
}

// ── 섹션 타이틀 (• 볼드 스타일 — 종합 진단/세부진단과 동일) ──
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-[15px] font-extrabold tracking-[0.01em] text-[#161b23]">
      <span className="mr-1.5 text-[#2449d8]">•</span>
      {children}
    </h2>
  );
}

// ── 등급 변화 헤더 ──
function GradeChangeHeader({
  gradeChange,
  targetGrade,
}: {
  gradeChange: GrowthReportV2["grade_change"];
  targetGrade: string;
}) {
  const isUp = gradeChange.diff > 0;
  const isDown = gradeChange.diff < 0;

  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="font-serif text-[28px] font-black text-[#8a93a1]">{gradeChange.previous}</span>
        <span className="text-[#8a93a1]">→</span>
        <span className="font-serif text-[28px] font-black text-[#161b23]">{gradeChange.current}</span>
        {isUp && (
          <span className="inline-flex items-center gap-0.5 rounded bg-[#e8f5e9] px-2 py-0.5 text-[11px] font-bold text-[#2e7d32]">
            ▲ {gradeChange.diff}단계
          </span>
        )}
        {isDown && (
          <span className="inline-flex items-center gap-0.5 rounded bg-[#fce4ec] px-2 py-0.5 text-[11px] font-bold text-[#c62828]">
            ▼ {Math.abs(gradeChange.diff)}단계
          </span>
        )}
        {!isUp && !isDown && (
          <span className="inline-flex items-center gap-0.5 rounded bg-[#f5f5f5] px-2 py-0.5 text-[11px] font-bold text-[#8a93a1]">
            유지
          </span>
        )}
      </div>
      <span className="text-[12px] text-[#8a93a1]">
        목표 <span className="font-bold text-[#2449d8]">{targetGrade}</span>
      </span>
    </div>
  );
}

// ── 등급 추이 차트 ──

const LEVEL_Y: Record<string, number> = { NH: 1, IL: 2, IM1: 3, IM2: 4, IM3: 5, IH: 6, AL: 7 };
const Y_LABEL: Record<number, string> = { 1: "NH", 2: "IL", 3: "IM1", 4: "IM2", 5: "IM3", 6: "IH", 7: "AL" };

function GradeYTick({ y, payload }: { x?: number; y?: number; payload?: { value: number } }) {
  const label = Y_LABEL[payload?.value ?? 0] || "";
  return (
    <text x={14} y={y} dy={4} fontSize={11} fill="#8a93a1" textAnchor="middle">
      {label}
    </text>
  );
}

function GradeTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Record<string, unknown> }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="border border-[#d0d7e2] bg-white px-3 py-2 shadow-md">
      <p className="text-[11px] text-[#8a93a1]">{d.date as string}</p>
      <p className="text-[13px] font-bold text-[#161b23]">{d.grade as string}</p>
    </div>
  );
}

function GradeChart({ history, targetGrade }: { history: GradeHistoryItem[]; targetGrade: string }) {
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

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 50, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e8edf3" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "#8a93a1" }}
            axisLine={false}
            tickLine={false}
            padding={{ left: 20, right: 20 }}
          />
          <YAxis
            domain={[1, 7]}
            ticks={[1, 2, 3, 4, 5, 6, 7]}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tick={GradeYTick as any}
            axisLine={false}
            tickLine={false}
            interval={0}
            width={30}
          />
          <ReferenceLine
            y={targetY}
            stroke="#2449d8"
            strokeDasharray="6 4"
            strokeWidth={1.5}
            label={{
              value: `목표 ${targetGrade}`,
              position: "right",
              fontSize: 10,
              fill: "#2449d8",
            }}
          />
          <Tooltip content={<GradeTooltip />} />
          <Line
            type="stepAfter"
            dataKey="y"
            stroke="#161b23"
            strokeWidth={2}
            dot={{ r: 4, fill: "#fff", stroke: "#161b23", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: "#161b23", stroke: "#fff", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 관찰 리스트 (좋아진 점 / 부족한 점) ──

function ObservationList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2.5 pl-5 marker:text-[#161b23]">
      {items.map((item, i) => (
        <li key={i} className="text-[14px] leading-[1.75] text-[#2f3644]">
          {item}
        </li>
      ))}
    </ul>
  );
}

// ── 문항 유형별 변화 ──

const STATUS_CONFIG: Record<TypeChangeStatus, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  reached: { label: "도달", color: "text-[#2e7d32]", bgColor: "bg-[#e8f5e9]" },
  improved: { label: "향상", color: "text-[#1565c0]", bgColor: "bg-[#e3f2fd]" },
  maintained: { label: "유지", color: "text-[#5f6976]", bgColor: "bg-[#f5f5f5]" },
  declined: { label: "하락", color: "text-[#c62828]", bgColor: "bg-[#fce4ec]" },
  not_attempted: { label: "미수행", color: "text-[#8a93a1]", bgColor: "bg-[#f5f5f5]" },
};

function TypeComparisonRow({ item }: { item: GrowthReportV2["type_comparison"][number] }) {
  const config = STATUS_CONFIG[item.status];

  return (
    <div className="py-4 first:pt-0 last:pb-0">
      {/* 헤더: 유형명 + 상태 뱃지 + 도달도 */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[14px] font-bold text-[#161b23]">{item.type_label}</span>
          <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-bold ${config.color} ${config.bgColor}`}>
            {config.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CriteriaDots met={item.criteria_met} total={item.criteria_total} />
          <span className="text-[12px] font-bold text-[#5f6976]">
            {item.criteria_met}/{item.criteria_total}
          </span>
        </div>
      </div>

      {/* 변화 관찰 */}
      <p className="text-[13px] leading-[1.7] text-[#2f3644]">
        <span className="font-bold text-[#161b23]">변화:</span>{" "}
        {item.change_observation}
      </p>

      {/* 남은 과제 */}
      <p className="mt-0.5 text-[13px] leading-[1.7] text-[#8a93a1]">
        <span className="font-bold">
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
          className={`h-2 w-2 rounded-full ${
            i < met ? "bg-[#2449d8]" : "bg-[#d0d7e2]"
          }`}
        />
      ))}
    </div>
  );
}
