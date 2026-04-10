"use client";

import { useState, useRef, useCallback } from "react";
import { Type, Volume2, Pause } from "lucide-react";

interface QuestionCardProps {
  english: string;
  korean: string | null;
  audioUrl?: string | null;
}

export function QuestionCard({ english, korean, audioUrl }: QuestionCardProps) {
  const [showKorean, setShowKorean] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggleAudio = useCallback(() => {
    if (!audioUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }
    if (isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    } else {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [audioUrl, isPlaying]);

  return (
    <div className="rounded-[var(--radius-xl)] border border-border bg-surface px-4 py-3 sm:px-5">
      <p className="text-[13px] font-medium leading-relaxed text-foreground sm:text-sm">
        <span className="mr-1 text-primary-500">Q.</span>{english}
      </p>
      {(korean || audioUrl) && (
        <>
          <div className="mt-2.5 flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <div className="flex shrink-0 items-center gap-1">
              {audioUrl && (
                <button
                  onClick={toggleAudio}
                  className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                    isPlaying
                      ? "bg-primary-500 text-white"
                      : "text-foreground-muted hover:text-foreground-secondary"
                  }`}
                >
                  {isPlaying ? <Pause size={10} /> : <Volume2 size={12} />}
                  {isPlaying ? "정지" : "듣기"}
                </button>
              )}
              {korean && (
                <button
                  onClick={() => setShowKorean(!showKorean)}
                  className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                    showKorean
                      ? "bg-surface text-foreground shadow-sm"
                      : "text-foreground-muted hover:text-foreground-secondary"
                  }`}
                >
                  <Type size={12} />
                  한글
                </button>
              )}
            </div>
          </div>
          {showKorean && korean && (
            <p className="mt-2 text-[11px] leading-relaxed text-foreground-muted sm:text-xs">
              {korean}
            </p>
          )}
        </>
      )}
    </div>
  );
}
