"use client";

import { Languages, CaseSensitive, Type } from "lucide-react";
import { ShadowingPlayer, useActiveSentenceIndex } from "./shadowing-player";
import { useShadowingStore, type DisplayMode } from "@/lib/stores/shadowing";

const DISPLAY_MODES: { mode: DisplayMode; icon: React.ElementType; label: string }[] = [
  { mode: "both", icon: Languages, label: "영/한" },
  { mode: "english", icon: CaseSensitive, label: "영어" },
  { mode: "korean", icon: Type, label: "한글" },
];

export function StepListen() {
  const { sentences, displayMode, repeatTargetIndex, setDisplayMode, seekTo, setRepeatTarget } = useShadowingStore();
  const activeIndex = useActiveSentenceIndex();

  return (
    <div className="space-y-3 pb-20 sm:pb-0">

      {/* 스크립트 텍스트 카드 */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface">
        {/* 카드 헤더: 표시 모드 토글 */}
        <div className="flex items-center justify-end border-b border-border px-4 py-2">
          <div className="inline-flex rounded-lg border border-border bg-surface-secondary p-0.5">
            {DISPLAY_MODES.map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setDisplayMode(mode)}
                className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                  displayMode === mode
                    ? "bg-surface text-foreground shadow-sm"
                    : "text-foreground-muted hover:text-foreground-secondary"
                }`}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 문장 목록 */}
        <div className="space-y-3 p-4 sm:p-6">
          {sentences.map((sent, i) => (
            <div
              key={i}
              onClick={() => {
                seekTo(sent.start);
                if (repeatTargetIndex != null) setRepeatTarget(i);
              }}
              className={`cursor-pointer rounded-lg p-2.5 transition-colors hover:bg-primary-50/50 ${
                i === activeIndex
                  ? "bg-primary-50 ring-1 ring-primary-200"
                  : ""
              }`}
            >
              {(displayMode === "both" || displayMode === "english") && (
                <p
                  className={`text-[13px] leading-relaxed sm:text-[15px] ${
                    i === activeIndex
                      ? "font-medium text-foreground"
                      : "text-foreground-secondary"
                  }`}
                >
                  {sent.english}
                </p>
              )}
              {(displayMode === "both" || displayMode === "korean") && (
                <p
                  className={`text-xs leading-relaxed sm:text-sm ${
                    displayMode === "both" ? "mt-1 border-l-2 border-primary-100 pl-2" : ""
                  } ${
                    i === activeIndex
                      ? "text-foreground-secondary"
                      : "text-foreground-muted"
                  }`}
                >
                  {sent.korean}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 오디오 플레이어 — 모바일: 하단 고정 / 데스크탑: 카드 아래 */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-surface px-4 py-[18px] sm:static sm:border-t-0 sm:bg-transparent sm:p-0">
        <ShadowingPlayer showSpeedControl compact />
      </div>
    </div>
  );
}
