"use client";

import { useState, useCallback } from "react";
import { RefreshCw, EyeOff } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchGameCards } from "@/lib/actions/study-group";
import { ActivityTimer } from "../../activity-timer";
import type { TabooCard } from "@/lib/types/study-group";

export function TabooGame() {
  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["study-game-cards", "taboo"],
    queryFn: () => fetchGameCards("taboo"),
    staleTime: 5 * 60 * 1000,
  });

  const [cardIndex, setCardIndex] = useState(0);
  const [isHidden, setIsHidden] = useState(false);

  const card = cards[cardIndex]?.data as TabooCard | undefined;

  const nextCard = useCallback(() => {
    if (cards.length <= 1) return;
    let next: number;
    do {
      next = Math.floor(Math.random() * cards.length);
    } while (next === cardIndex);
    setCardIndex(next);
    setIsHidden(false);
  }, [cardIndex, cards.length]);

  if (isLoading) {
    return <div className="flex items-center justify-center py-10"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>;
  }

  if (!card) {
    return <div className="rounded-xl border border-border bg-surface p-8 text-center"><p className="text-sm text-foreground-muted">등록된 카드가 없습니다.</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border-2 border-red-200 bg-surface p-6 sm:p-8">
        {isHidden ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <EyeOff size={32} className="text-foreground-muted" />
            <p className="text-sm text-foreground-muted">카드가 숨겨져 있습니다</p>
            <button onClick={() => setIsHidden(false)} className="rounded-full bg-primary-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-600 transition-colors">카드 보기</button>
          </div>
        ) : (
          <>
            <div className="mb-6 text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-green-600">TARGET</p>
              <p className="mt-1 text-3xl font-black text-foreground">{card.target}</p>
            </div>
            <div className="space-y-2">
              <p className="text-center text-xs font-medium uppercase tracking-wider text-red-500">FORBIDDEN</p>
              {card.forbidden.map((word) => (
                <div key={word} className="rounded-lg bg-red-50 py-2 text-center">
                  <span className="text-sm font-semibold text-red-700">{word}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex justify-center gap-3">
        <button onClick={() => setIsHidden(true)} className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface-secondary transition-colors">
          <EyeOff size={14} /> 카드 숨기기
        </button>
        <button onClick={nextCard} className="flex items-center gap-1.5 rounded-full bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors">
          <RefreshCw size={14} /> 다음 카드
        </button>
      </div>

      <div className="flex justify-center">
        <ActivityTimer presets={[30, 60, 90]} />
      </div>
    </div>
  );
}
