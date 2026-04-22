"use client";

import { useState } from "react";
import { Ban, ArrowLeftRight, Scale, Eye, Link, ChevronLeft, type LucideIcon } from "lucide-react";
import { GAME_INFO } from "@/lib/constants/study-group";
import { TabooGame } from "./games/taboo-game";
import { WouldYouRatherGame } from "./games/would-you-rather";
import { DebateGame } from "./games/debate-game";
import { TwoTruthsGame } from "./games/two-truths";
import { StoryChainGame } from "./games/story-chain";
import type { GameType } from "@/lib/types/study-group";

const iconMap: Record<string, LucideIcon> = {
  Ban, ArrowLeftRight, Scale, Eye, Link,
};

export function GameMode() {
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);

  // 게임 미선택 → 선택 화면
  if (!selectedGame) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-primary-100 bg-primary-50/50 p-4">
          <p className="text-sm text-primary-700">
            <strong>게임을 선택하세요!</strong> 각 게임의 규칙을 확인하고 영어로 즐겨보세요.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {GAME_INFO.map((game) => {
            const Icon = iconMap[game.icon] || Ban;
            return (
              <button
                key={game.type}
                onClick={() => setSelectedGame(game.type)}
                className="rounded-xl border border-border bg-surface p-4 text-left transition-all hover:border-primary-200 hover:bg-primary-50/30"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{game.nameKo}</h3>
                    <p className="text-xs text-foreground-muted">{game.name}</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-foreground-secondary">{game.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 선택된 게임 렌더링
  const gameInfo = GAME_INFO.find((g) => g.type === selectedGame)!;

  return (
    <div className="space-y-4">
      {/* 뒤로가기 + 게임 제목 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSelectedGame(null)}
          className="flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground-secondary transition-colors"
        >
          <ChevronLeft size={16} /> 게임 선택
        </button>
        <span className="text-sm font-semibold text-foreground">{gameInfo.nameKo}</span>
        <span className="text-xs text-foreground-muted">({gameInfo.name})</span>
      </div>

      {/* 규칙 */}
      <div className="rounded-xl border border-border bg-surface-secondary/50 p-4">
        <p className="mb-2 text-xs font-semibold text-foreground-secondary">규칙</p>
        <ul className="space-y-1">
          {gameInfo.rules.map((rule, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-foreground-secondary">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-600">
                {i + 1}
              </span>
              {rule}
            </li>
          ))}
        </ul>
      </div>

      {/* 게임 콘텐츠 */}
      {selectedGame === "taboo" && <TabooGame />}
      {selectedGame === "would-you-rather" && <WouldYouRatherGame />}
      {selectedGame === "debate" && <DebateGame />}
      {selectedGame === "two-truths" && <TwoTruthsGame />}
      {selectedGame === "story-chain" && <StoryChainGame />}
    </div>
  );
}
