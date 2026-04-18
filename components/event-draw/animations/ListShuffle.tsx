"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { playReelTick, playReelStop, playAllComplete } from "./drawSounds";

interface Props {
  winners: string[];
  participants: string[];
  onComplete: () => void;
}

function getGridCols(count: number): string {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-2";
  if (count === 3) return "grid-cols-3";
  if (count <= 4) return "grid-cols-2";
  if (count <= 6) return "grid-cols-3";
  if (count <= 8) return "grid-cols-4";
  if (count <= 12) return "grid-cols-4";
  return "grid-cols-5";
}

const REEL_COLOR = {
  bg: "bg-teal-600",
  border: "border-teal-600",
  badge: "bg-teal-700",
  bar: "#0d9488",
};

interface ReelState {
  top: string;
  center: string;
  bottom: string;
  done: boolean;
}

export default function ListShuffle({ winners, participants, onComplete }: Props) {
  const [reels, setReels] = useState<ReelState[]>(
    winners.map(() => ({
      top: "",
      center: "???",
      bottom: "",
      done: false,
    }))
  );
  const [allDone, setAllDone] = useState(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([]);

  const doneCount = useMemo(() => reels.filter((r) => r.done).length, [reels]);
  const gridCols = getGridCols(winners.length);

  const isSmall = winners.length > 8;
  const isMedium = winners.length > 4 && winners.length <= 8;

  const getRandomName = useCallback(() => {
    return participants[Math.floor(Math.random() * participants.length)];
  }, [participants]);

  useEffect(() => {
    winners.forEach((winner, i) => {
      const delay = i * 800;
      const duration = 5000 + i * 500;

      const startTimeout = setTimeout(() => {
        let intervalId: ReturnType<typeof setInterval>;

        let spinCounter = 0;
        const spin = () => {
          setReels((prev) =>
            prev.map((r, j) =>
              j === i && !r.done
                ? { top: getRandomName(), center: getRandomName(), bottom: getRandomName(), done: false }
                : r
            )
          );
          spinCounter++;
          if (spinCounter % 4 === 0) playReelTick();
        };

        intervalId = setInterval(spin, 60);
        intervalsRef.current.push(intervalId);

        const slowdowns = [
          { at: duration * 0.4, newSpeed: 100 },
          { at: duration * 0.6, newSpeed: 180 },
          { at: duration * 0.75, newSpeed: 280 },
          { at: duration * 0.88, newSpeed: 420 },
        ];

        slowdowns.forEach(({ at, newSpeed }) => {
          const t = setTimeout(() => {
            clearInterval(intervalId);
            intervalId = setInterval(spin, newSpeed);
            intervalsRef.current.push(intervalId);
          }, at);
          timeoutsRef.current.push(t);
        });

        const finishTimeout = setTimeout(() => {
          clearInterval(intervalId);
          setReels((prev) =>
            prev.map((r, j) =>
              j === i
                ? { top: getRandomName(), center: winner, bottom: getRandomName(), done: true }
                : r
            )
          );
          playReelStop();
        }, duration);
        timeoutsRef.current.push(finishTimeout);
      }, delay);

      timeoutsRef.current.push(startTimeout);
    });

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      intervalsRef.current.forEach(clearInterval);
    };
  }, [winners, participants, getRandomName]);

  useEffect(() => {
    if (reels.length > 0 && reels.every((r) => r.done)) {
      setAllDone(true);
      playAllComplete();
      const t = setTimeout(onComplete, 2500);
      return () => clearTimeout(t);
    }
  }, [reels, onComplete]);

  return (
    <div className="flex flex-col items-center justify-center" style={{ width: "80vw", maxWidth: "80vw", gap: "5vh" }}>
      {/* 릴 그리드 */}
      <div className={`w-full grid ${gridCols} gap-4`}>
        {reels.map((reel, i) => {
          const isSpinning = !reel.done && reel.center !== "???";
          const color = REEL_COLOR;
          return (
            <div
              key={i}
              className={`relative rounded-2xl border-2 overflow-hidden transition-all duration-500 ${
                reel.done
                  ? `${color.bg} ${color.border}`
                  : isSpinning
                    ? "border-white/15 bg-slate-800"
                    : "border-white/10 bg-slate-900/80"
              }`}
            >
              {/* 번호 뱃지 */}
              <span
                className={`absolute top-2.5 left-2.5 z-20 rounded-md flex items-center justify-center font-black ${
                  isSmall ? "w-5 h-5 text-[9px]" : "w-6 h-6 text-[10px]"
                } ${
                  reel.done
                    ? `${color.badge} text-white`
                    : "bg-white/10 text-white/25"
                }`}
              >
                {i + 1}
              </span>

              {/* 릴 윈도우 */}
              <div className={`flex flex-col items-center justify-center ${
                isSmall ? "py-4" : isMedium ? "py-6" : "py-8"
              }`}>
                {/* 위 (흐릿) */}
                <div className={`w-full text-center truncate px-3 ${
                  isSmall ? "text-xs py-2" : isMedium ? "text-sm py-2.5" : "text-base py-3"
                } font-bold transition-all duration-150 ${
                  reel.done ? "text-white/25" : "text-white/12"
                } ${isSpinning ? "blur-[1.5px]" : ""}`}>
                  {reel.top || "\u00A0"}
                </div>

                {/* 구분선 위 */}
                <div className={`w-4/5 h-px transition-colors duration-500 ${
                  reel.done ? "bg-white/20" : "bg-white/8"
                }`} />

                {/* 중앙 (선명) */}
                <div className={`w-full text-center truncate px-3 ${
                  isSmall ? "text-lg py-4" : isMedium ? "text-xl py-5" : "text-2xl py-6"
                } font-black transition-all duration-300 ${
                  reel.done
                    ? "text-white"
                    : isSpinning
                      ? "text-white/80"
                      : "text-white/20"
                }`}>
                  {reel.center}
                </div>

                {/* 구분선 아래 */}
                <div className={`w-4/5 h-px transition-colors duration-500 ${
                  reel.done ? "bg-white/20" : "bg-white/8"
                }`} />

                {/* 아래 (흐릿) */}
                <div className={`w-full text-center truncate px-3 ${
                  isSmall ? "text-xs py-2" : isMedium ? "text-sm py-2.5" : "text-base py-3"
                } font-bold transition-all duration-150 ${
                  reel.done ? "text-white/25" : "text-white/12"
                } ${isSpinning ? "blur-[1.5px]" : ""}`}>
                  {reel.bottom || "\u00A0"}
                </div>
              </div>

              {/* 회전 중 상하 페이드 */}
              {!reel.done && (
                <>
                  <div className="absolute top-0 left-0 right-0 h-1/4 bg-gradient-to-b from-slate-900/90 to-transparent pointer-events-none z-10" />
                  <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-slate-900/90 to-transparent pointer-events-none z-10" />
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* 프로그레스 바 */}
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-white/25 uppercase tracking-widest">Progress</span>
          <span className="text-sm font-black text-white/40">{doneCount} / {winners.length}</span>
        </div>
        <div className="h-1 bg-white/8 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${(doneCount / winners.length) * 100}%`,
              background: doneCount > 0 ? REEL_COLOR.bar : undefined,
              transition: "width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          />
        </div>
      </div>

      {/* 완료 */}
      {allDone && (
        <div className="text-center animate-[resultIn_0.6s_ease-out]">
          <div className="text-lg font-black text-white/60 tracking-widest uppercase">
            {winners.length}명 당첨!
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes resultIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
