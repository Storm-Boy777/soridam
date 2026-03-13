"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { getDailyTrends } from "@/lib/actions/admin/stats";

// ── X축 날짜 포맷 ──
const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

// ── 커스텀 Tooltip ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-sm">
      <p className="text-xs text-foreground-muted">{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any) => (
        <p key={p.name} className="text-sm font-medium" style={{ color: p.color }}>
          {p.name}: {p.name === "매출" ? `${p.value.toLocaleString()}원` : p.value}
        </p>
      ))}
    </div>
  );
};

// ── 기간 선택 버튼 ──
const PERIOD_OPTIONS = [
  { label: "7일", value: 7 },
  { label: "30일", value: 30 },
  { label: "90일", value: 90 },
] as const;

export function AdminTrendCharts() {
  const [days, setDays] = useState(30);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-daily-trends", days],
    queryFn: () => getDailyTrends(days),
    staleTime: 5 * 60 * 1000, // 5분
  });

  return (
    <div className="space-y-4">
      {/* 헤더 + 기간 토글 */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground-secondary">추이 차트</h2>
        <div className="flex gap-1 rounded-lg border border-border bg-surface-secondary p-0.5">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDays(opt.value)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                days === opt.value
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-foreground-muted hover:text-foreground-secondary"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 로딩 */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-foreground-muted" />
          <span className="ml-2 text-sm text-foreground-muted">데이터 로딩 중...</span>
        </div>
      )}

      {/* 차트 3개 */}
      {data && (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* 차트 1: 가입 추이 */}
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="mb-3 text-sm font-medium text-foreground">가입 추이</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EAE0D5" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 11, fill: "#B5A99D" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#B5A99D" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="signups"
                  name="가입"
                  stroke="#D4835E"
                  strokeWidth={2}
                  dot={{ r: 2, fill: "#D4835E" }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 차트 2: 매출 추이 */}
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="mb-3 text-sm font-medium text-foreground">매출 추이</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EAE0D5" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 11, fill: "#B5A99D" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#B5A99D" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    v >= 10000 ? `${(v / 10000).toFixed(0)}만` : v.toLocaleString()
                  }
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="revenue"
                  name="매출"
                  fill="#B8945A"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 차트 3: 모듈 사용량 */}
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="mb-3 text-sm font-medium text-foreground">모듈 사용량</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EAE0D5" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 11, fill: "#B5A99D" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#B5A99D" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11 }}
                />
                <Line
                  type="monotone"
                  dataKey="mockExams"
                  name="모의고사"
                  stroke="#7C3AED"
                  strokeWidth={2}
                  dot={{ r: 2, fill: "#7C3AED" }}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="scripts"
                  name="스크립트"
                  stroke="#2563EB"
                  strokeWidth={2}
                  dot={{ r: 2, fill: "#2563EB" }}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="tutoring"
                  name="튜터링"
                  stroke="#0D9488"
                  strokeWidth={2}
                  dot={{ r: 2, fill: "#0D9488" }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
