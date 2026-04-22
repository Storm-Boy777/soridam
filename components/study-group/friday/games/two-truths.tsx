"use client";

import { useState } from "react";
import { Users, ChevronRight } from "lucide-react";
import { ActivityTimer } from "../../activity-timer";

export function TwoTruthsGame() {
  const [playerCount, setPlayerCount] = useState(6);
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [scores, setScores] = useState<Record<number, number>>({});

  const nextPlayer = () => {
    setCurrentPlayer((p) => (p < playerCount ? p + 1 : 1));
  };

  const addScore = (player: number) => {
    setScores((prev) => ({ ...prev, [player]: (prev[player] || 0) + 1 }));
  };

  return (
    <div className="space-y-6">
      {/* 인원 설정 */}
      <div className="flex items-center justify-center gap-3">
        <Users size={16} className="text-foreground-secondary" />
        <span className="text-sm text-foreground-secondary">참여 인원:</span>
        <div className="flex gap-1">
          {[4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button
              key={n}
              onClick={() => { setPlayerCount(n); setCurrentPlayer(1); setScores({}); }}
              className={`h-8 w-8 rounded-full text-xs font-medium transition-colors ${
                playerCount === n
                  ? "bg-primary-500 text-white"
                  : "bg-surface-secondary text-foreground-secondary hover:bg-primary-50"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* 현재 플레이어 */}
      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted">NOW PLAYING</p>
        <p className="mt-2 text-4xl font-black text-primary-600">Player {currentPlayer}</p>
        <div className="mt-6 space-y-3 text-left">
          <div className="rounded-lg bg-surface-secondary p-3">
            <p className="text-sm text-foreground">
              <span className="font-semibold text-primary-600">1.</span> 영어로 첫 번째 문장을 말하세요 (진실 또는 거짓)
            </p>
          </div>
          <div className="rounded-lg bg-surface-secondary p-3">
            <p className="text-sm text-foreground">
              <span className="font-semibold text-primary-600">2.</span> 영어로 두 번째 문장을 말하세요
            </p>
          </div>
          <div className="rounded-lg bg-surface-secondary p-3">
            <p className="text-sm text-foreground">
              <span className="font-semibold text-primary-600">3.</span> 영어로 세 번째 문장을 말하세요
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs text-foreground-muted">다른 사람들이 질문하고 거짓을 맞춰보세요!</p>
      </div>

      {/* 점수 + 다음 사람 */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: playerCount }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => addScore(p)}
              className={`flex h-8 items-center gap-1 rounded-full px-3 text-xs font-medium transition-colors ${
                p === currentPlayer
                  ? "bg-primary-100 text-primary-700"
                  : "bg-surface-secondary text-foreground-secondary hover:bg-surface"
              }`}
              title={`Player ${p}에게 1점 추가`}
            >
              P{p}: {scores[p] || 0}점
            </button>
          ))}
        </div>
        <button
          onClick={nextPlayer}
          className="flex items-center gap-1 rounded-full bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors"
        >
          다음 사람 <ChevronRight size={16} />
        </button>
      </div>

      {/* 타이머 */}
      <div className="flex justify-center">
        <ActivityTimer presets={[60, 120, 180]} />
      </div>
    </div>
  );
}
