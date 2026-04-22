"use client";

import { useState, useCallback } from "react";
import { RefreshCw, Users, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchGameCards } from "@/lib/actions/study-group";
import { ActivityTimer } from "../../activity-timer";
import type { StoryStarter } from "@/lib/types/study-group";

export function StoryChainGame() {
  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["study-game-cards", "story-chain"],
    queryFn: () => fetchGameCards("story-chain"),
    staleTime: 5 * 60 * 1000,
  });

  const [storyIndex, setStoryIndex] = useState(0);
  const [playerCount, setPlayerCount] = useState(6);
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [round, setRound] = useState(1);

  const story = cards[storyIndex]?.data as StoryStarter | undefined;

  const nextPlayer = useCallback(() => {
    setCurrentPlayer((prev) => {
      if (prev >= playerCount) {
        setRound((r) => r + 1);
        return 1;
      }
      return prev + 1;
    });
  }, [playerCount]);

  const newStory = useCallback(() => {
    if (cards.length <= 1) return;
    let next: number;
    do {
      next = Math.floor(Math.random() * cards.length);
    } while (next === storyIndex);
    setStoryIndex(next);
    setCurrentPlayer(1);
    setRound(1);
  }, [storyIndex, cards.length]);

  if (isLoading) {
    return <div className="flex items-center justify-center py-10"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>;
  }

  if (!story) {
    return <div className="rounded-xl border border-border bg-surface p-8 text-center"><p className="text-sm text-foreground-muted">등록된 이야기가 없습니다.</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-3">
        <Users size={16} className="text-foreground-secondary" />
        <span className="text-sm text-foreground-secondary">참여 인원:</span>
        <div className="flex gap-1">
          {[4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button
              key={n}
              onClick={() => { setPlayerCount(n); setCurrentPlayer(1); setRound(1); }}
              className={`h-8 w-8 rounded-full text-xs font-medium transition-colors ${
                playerCount === n ? "bg-primary-500 text-white" : "bg-surface-secondary text-foreground-secondary hover:bg-primary-50"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <div className="mb-4 flex items-center justify-between">
          <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-600">{story.genre}</span>
          <span className="text-xs text-foreground-muted">Round {round}</span>
        </div>
        <p className="text-center text-lg font-medium italic leading-relaxed text-foreground">&ldquo;{story.opening}&rdquo;</p>
      </div>

      <div className="rounded-xl border border-primary-200 bg-primary-50/30 p-4 text-center">
        <p className="text-xs text-foreground-muted">현재 차례</p>
        <p className="mt-1 text-2xl font-black text-primary-600">Player {currentPlayer}</p>
        <p className="mt-1 text-xs text-foreground-secondary">2~3문장을 영어로 이어서 말하세요!</p>
      </div>

      <div className="flex justify-center gap-3">
        <button onClick={newStory} className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface-secondary transition-colors">
          <RefreshCw size={14} /> 새 이야기
        </button>
        <button onClick={nextPlayer} className="flex items-center gap-1.5 rounded-full bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors">
          다음 사람 <ChevronRight size={16} />
        </button>
      </div>

      <div className="flex justify-center">
        <ActivityTimer presets={[20, 30, 45]} />
      </div>
    </div>
  );
}
