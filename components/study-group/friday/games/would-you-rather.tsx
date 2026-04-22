"use client";

import { useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchGameCards } from "@/lib/actions/study-group";
import { ActivityTimer } from "../../activity-timer";
import type { WouldYouRatherCard } from "@/lib/types/study-group";

export function WouldYouRatherGame() {
  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["study-game-cards", "would-you-rather"],
    queryFn: () => fetchGameCards("would-you-rather"),
    staleTime: 5 * 60 * 1000,
  });

  const [cardIndex, setCardIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<"A" | "B" | null>(null);

  const card = cards[cardIndex]?.data as WouldYouRatherCard | undefined;

  const nextCard = useCallback(() => {
    if (cards.length <= 1) return;
    let next: number;
    do {
      next = Math.floor(Math.random() * cards.length);
    } while (next === cardIndex);
    setCardIndex(next);
    setSelectedOption(null);
  }, [cardIndex, cards.length]);

  if (isLoading) {
    return <div className="flex items-center justify-center py-10"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>;
  }

  if (!card) {
    return <div className="rounded-xl border border-border bg-surface p-8 text-center"><p className="text-sm text-foreground-muted">등록된 카드가 없습니다.</p></div>;
  }

  return (
    <div className="space-y-6">
      <p className="text-center text-lg font-bold text-foreground">Would You Rather...</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          onClick={() => setSelectedOption("A")}
          className={`rounded-2xl border-2 p-6 text-center transition-all ${
            selectedOption === "A"
              ? "border-blue-500 bg-blue-50"
              : "border-border bg-surface hover:border-blue-200 hover:bg-blue-50/30"
          }`}
        >
          <span className="mb-2 inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-600">A</span>
          <p className="text-sm font-semibold text-foreground sm:text-base">{card.optionA}</p>
        </button>

        <button
          onClick={() => setSelectedOption("B")}
          className={`rounded-2xl border-2 p-6 text-center transition-all ${
            selectedOption === "B"
              ? "border-orange-500 bg-orange-50"
              : "border-border bg-surface hover:border-orange-200 hover:bg-orange-50/30"
          }`}
        >
          <span className="mb-2 inline-block rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-600">B</span>
          <p className="text-sm font-semibold text-foreground sm:text-base">{card.optionB}</p>
        </button>
      </div>

      {selectedOption && (
        <p className="text-center text-sm text-primary-600 font-medium">선택 완료! 이유를 영어로 설명해 보세요.</p>
      )}

      <div className="flex justify-center">
        <button onClick={nextCard} className="flex items-center gap-2 rounded-full bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors">
          <RefreshCw size={16} /> 다음 질문
        </button>
      </div>

      <div className="flex justify-center">
        <ActivityTimer presets={[60, 120, 180]} />
      </div>
    </div>
  );
}
