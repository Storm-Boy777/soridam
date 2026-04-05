"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { PitchFrame } from "@/lib/audio/pitch-extractor";

interface PitchComparisonChartProps {
  nativePitch: PitchFrame[];
  userPitch: PitchFrame[];
  dtwPath?: [number, number][] | null;
}

interface ChartDataPoint {
  pct: number;         // 0-100% 진행률
  native: number | null;
  user: number | null;
}

/**
 * 시간축 정규화: 두 시퀀스를 동일한 0-100% 축에 맞춤
 * - 둘 다 같은 시작/끝 지점
 * - 유성음만 표시 (무성음 = null → 갭)
 */
function buildNormalizedData(
  nativePitch: PitchFrame[],
  userPitch: PitchFrame[],
): ChartDataPoint[] {
  const NUM_POINTS = 60;
  const points: ChartDataPoint[] = [];

  if (nativePitch.length === 0 && userPitch.length === 0) return points;

  for (let k = 0; k < NUM_POINTS; k++) {
    const pct = (k / (NUM_POINTS - 1)) * 100;
    const ratio = k / (NUM_POINTS - 1);

    // 원어민: 비율 기반 인덱스
    const ni = Math.round(ratio * (nativePitch.length - 1));
    const nf = nativePitch[ni];
    const nativeVal = nf && nf.f0 > 0 ? Math.round(nf.f0) : null;

    // 사용자: 비율 기반 인덱스
    const ui = Math.round(ratio * (userPitch.length - 1));
    const uf = userPitch[ui];
    const userVal = uf && uf.f0 > 0 ? Math.round(uf.f0) : null;

    points.push({ pct, native: nativeVal, user: userVal });
  }

  return points;
}

export function PitchComparisonChart({
  nativePitch,
  userPitch,
}: PitchComparisonChartProps) {
  const data = useMemo(
    () => buildNormalizedData(nativePitch, userPitch),
    [nativePitch, userPitch],
  );

  if (data.length === 0) return null;

  // Y축 범위 자동 계산
  const allValues = data.flatMap((d) => [d.native, d.user]).filter((v): v is number => v !== null);
  const minY = allValues.length > 0 ? Math.max(50, Math.min(...allValues) - 20) : 50;
  const maxY = allValues.length > 0 ? Math.max(...allValues) + 20 : 400;

  return (
    <div className="relative">
      {/* 범례 */}
      <div className="mb-2 flex items-center justify-center gap-5">
        <div className="flex items-center gap-1.5">
          <div className="h-[3px] w-4 rounded-full bg-primary-500" />
          <span className="text-[10px] font-medium text-foreground-secondary">원어민</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-[3px] w-4 rounded-full bg-blue-500" />
          <span className="text-[10px] font-medium text-foreground-secondary">내 발음</span>
        </div>
      </div>

      <div className="h-[140px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="nativeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3A5BC7" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#3A5BC7" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="pct"
              tick={false}
              stroke="transparent"
              tickLine={false}
            />
            <YAxis
              domain={[minY, maxY]}
              tick={{ fontSize: 9, fill: "#A0A0AF" }}
              tickFormatter={(v) => `${Math.round(Number(v))}`}
              stroke="transparent"
              tickLine={false}
              width={36}
            />
            <Tooltip
              contentStyle={{
                fontSize: 11,
                background: "rgba(255,252,248,0.95)",
                border: "1px solid #E8E6E1",
                borderRadius: 10,
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                padding: "6px 10px",
              }}
              formatter={(value, name) => [
                `${Math.round(Number(value))} Hz`,
                name === "native" ? "원어민" : "내 발음",
              ]}
              labelFormatter={(label) => `${Math.round(Number(label))}%`}
            />
            <Area
              type="monotone"
              dataKey="native"
              stroke="#3A5BC7"
              strokeWidth={2.5}
              fill="url(#nativeGrad)"
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="user"
              stroke="#3B82F6"
              strokeWidth={2}
              strokeDasharray="4 2"
              fill="url(#userGrad)"
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* X축 라벨 */}
      <div className="mt-1 flex justify-between px-9">
        <span className="text-[9px] text-foreground-muted">시작</span>
        <span className="text-[9px] text-foreground-muted">끝</span>
      </div>
    </div>
  );
}
