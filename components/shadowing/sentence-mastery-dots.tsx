"use client";

import { useShadowingStore } from "@/lib/stores/shadowing";

interface SentenceMasteryDotsProps {
  onDotClick: (index: number) => void;
}

export function SentenceMasteryDots({ onDotClick }: SentenceMasteryDotsProps) {
  const { sentences, shadowIndex, shadowPlayCounts } = useShadowingStore();

  const total = sentences.length;
  const mastered = sentences.filter((_, i) => (shadowPlayCounts[i] ?? 0) >= 3).length;
  const allMastered = total > 0 && mastered === total;

  return (
    <div className="space-y-2">
      {/* 마스터 요약 — 한눈에 보는 성취 신호 */}
      <div className="flex items-center justify-center gap-1 text-[11px]">
        <span className={`font-semibold ${allMastered ? "text-green-600" : "text-foreground-secondary"}`}>
          입에 붙은 문장 {mastered}/{total}
        </span>
        {allMastered && <span className="font-medium text-green-600">· 완성 ✓</span>}
      </div>

      {/* 문장별 마스터 점 (3회 이상 = 초록) */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 px-2">
        {sentences.map((_, i) => {
          const count = shadowPlayCounts[i] ?? 0;
          const isActive = i === shadowIndex;
          const isMastered = count >= 3;

          // 마스터리 색상: 0회=회색, 1-2회=주황, 3+회=초록
          let dotColor = "bg-border";
          if (isMastered) dotColor = "bg-green-400";
          else if (count >= 1) dotColor = "bg-amber-400";

          return (
            <button
              key={i}
              onClick={() => onDotClick(i)}
              className={`h-2 w-2 rounded-full transition-all ${dotColor} ${
                isActive
                  ? "scale-150 ring-2 ring-primary-300 ring-offset-1"
                  : isMastered
                    ? "ring-1 ring-green-300 ring-offset-1 hover:scale-125"
                    : "hover:scale-125"
              }`}
              title={`문장 ${i + 1} — ${isMastered ? "입에 붙음 ✓" : `${count}회 연습`}`}
            />
          );
        })}
      </div>
    </div>
  );
}
