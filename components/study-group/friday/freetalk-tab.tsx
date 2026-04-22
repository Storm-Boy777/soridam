"use client";

import { useState } from "react";
import { MessageCircle, Gamepad2 } from "lucide-react";
import { FreeTalkMode } from "./free-talk-mode";
import { GameMode } from "./game-mode";

type Mode = "freetalk" | "game";

export function FreetalkTab() {
  const [mode, setMode] = useState<Mode>("freetalk");

  return (
    <div className="space-y-6">
      {/* 모드 토글 */}
      <div className="flex rounded-xl border border-border bg-surface p-1">
        <button
          onClick={() => setMode("freetalk")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors ${
            mode === "freetalk"
              ? "bg-primary-500 text-white"
              : "text-foreground-secondary hover:text-foreground"
          }`}
        >
          <MessageCircle size={16} /> 프리토킹
        </button>
        <button
          onClick={() => setMode("game")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors ${
            mode === "game"
              ? "bg-primary-500 text-white"
              : "text-foreground-secondary hover:text-foreground"
          }`}
        >
          <Gamepad2 size={16} /> 영어 게임
        </button>
      </div>

      {/* 콘텐츠 */}
      {mode === "freetalk" ? <FreeTalkMode /> : <GameMode />}
    </div>
  );
}
