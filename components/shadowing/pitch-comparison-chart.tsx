"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Legend,
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

export function PitchComparisonChart({
  nativePitch,
  userPitch,
}: PitchComparisonChartProps) {
  const data = useMemo(() => {
    // 두 시퀀스를 시간축 기준으로 병합
    const points: ChartDataPoint[] = [];
    const allTimes = new Set<number>();

    for (const f of nativePitch) allTimes.add(Math.round(f.time * 100) / 100);
    for (const f of userPitch) allTimes.add(Math.round(f.time * 100) / 100);

    const sortedTimes = [...allTimes].sort((a, b) => a - b);

    // 빠른 룩업용 맵
    const nativeMap = new Map<number, number>();
    for (const f of nativePitch) {
      if (f.f0 > 0 && f.confidence >= 0.6) {
        nativeMap.set(Math.round(f.time * 100) / 100, f.f0);
      }
    }
    const userMap = new Map<number, number>();
    for (const f of userPitch) {
      if (f.f0 > 0 && f.confidence >= 0.6) {
        userMap.set(Math.round(f.time * 100) / 100, f.f0);
      }
    }

    for (const t of sortedTimes) {
      points.push({
        time: t,
        native: nativeMap.get(t) ?? null,
        user: userMap.get(t) ?? null,
      });
    }

    return points;
  }, [nativePitch, userPitch]);

  if (data.length === 0) return null;

  return (
    <div className="h-[120px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10 }}
            tickFormatter={(v) => `${v.toFixed(1)}s`}
            stroke="#B5A99D"
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fontSize: 10 }}
            tickFormatter={(v) => `${v}`}
            stroke="#B5A99D"
            axisLine={false}
            tickLine={false}
            width={35}
          />
          <Tooltip
            contentStyle={{
              fontSize: 11,
              background: "#FFFCF8",
              border: "1px solid #EAE0D5",
              borderRadius: 8,
            }}
            formatter={(value, name) => [
              `${Math.round(Number(value))} Hz`,
              name === "native" ? "원어민" : "내 발음",
            ]}
            labelFormatter={(label) => `${Number(label).toFixed(2)}초`}
          />
          <Legend
            formatter={(value) => (value === "native" ? "원어민" : "내 발음")}
            wrapperStyle={{ fontSize: 11 }}
          />
          <Line
            type="monotone"
            dataKey="native"
            stroke="#D4835E"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="user"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
