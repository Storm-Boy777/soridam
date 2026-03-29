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
}

interface ChartDataPoint {
  time: number;
  native: number | null;
  user: number | null;
}

const MIN_CONFIDENCE = 0.2;

// 데이터 간격을 균일하게 리샘플링 (20ms 간격)
function resamplePitch(frames: PitchFrame[], stepMs: number): Map<number, number> {
  const map = new Map<number, number>();
  if (frames.length === 0) return map;

  const step = stepMs / 1000;
  const maxTime = frames[frames.length - 1].time;

  for (let t = 0; t <= maxTime; t += step) {
    // 가장 가까운 프레임 찾기
    let best: PitchFrame | null = null;
    let bestDist = Infinity;
    for (const f of frames) {
      const d = Math.abs(f.time - t);
      if (d < bestDist) {
        bestDist = d;
        best = f;
      }
      if (f.time > t + step) break;
    }
    if (best && best.f0 > 0 && best.confidence >= MIN_CONFIDENCE && bestDist < step * 2) {
      map.set(Math.round(t * 100) / 100, best.f0);
    }
  }
  return map;
}

export function PitchComparisonChart({
  nativePitch,
  userPitch,
}: PitchComparisonChartProps) {
  const data = useMemo(() => {
    const nativeMap = resamplePitch(nativePitch, 20);
    const userMap = resamplePitch(userPitch, 20);

    const allTimes = new Set([...nativeMap.keys(), ...userMap.keys()]);
    const sortedTimes = [...allTimes].sort((a, b) => a - b);

    return sortedTimes.map((t) => ({
      time: t,
      native: nativeMap.get(t) ?? null,
      user: userMap.get(t) ?? null,
    }));
  }, [nativePitch, userPitch]);

  if (data.length === 0) return null;

  return (
    <div className="relative">
      {/* 범례 — 차트 위 */}
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

      <div className="h-[130px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 8, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="nativeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D4835E" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#D4835E" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              tick={{ fontSize: 9, fill: "#B5A99D" }}
              tickFormatter={(v) => `${Number(v).toFixed(1)}s`}
              stroke="transparent"
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[50, "auto"]}
              tick={{ fontSize: 9, fill: "#B5A99D" }}
              tickFormatter={(v) => `${Math.round(Number(v))}`}
              stroke="transparent"
              tickLine={false}
              width={32}
              allowDataOverflow
            />
            <Tooltip
              contentStyle={{
                fontSize: 11,
                background: "rgba(255,252,248,0.95)",
                border: "1px solid #EAE0D5",
                borderRadius: 10,
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                padding: "6px 10px",
              }}
              formatter={(value, name) => [
                `${Math.round(Number(value))} Hz`,
                name === "native" ? "원어민" : "내 발음",
              ]}
              labelFormatter={(label) => `${Number(label).toFixed(1)}초`}
            />
            <Area
              type="monotone"
              dataKey="native"
              stroke="#D4835E"
              strokeWidth={2.5}
              fill="url(#nativeGrad)"
              dot={false}
              connectNulls={false}
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
              connectNulls={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
