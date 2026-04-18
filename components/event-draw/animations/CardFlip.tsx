"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { playCardFlip, playCardShuffle, playWinCard, playMissCard, playAllComplete } from "./drawSounds";

interface Props {
  winners: string[];
  participants: string[];
  onComplete: () => void;
}

function getGridConfig(count: number): { cols: number; cls: string } {
  if (count <= 4) return { cols: 2, cls: "grid-cols-2" };
  if (count <= 6) return { cols: 3, cls: "grid-cols-3" };
  if (count <= 12) return { cols: 4, cls: "grid-cols-4" };
  if (count <= 20) return { cols: 5, cls: "grid-cols-5" };
  if (count <= 30) return { cols: 6, cls: "grid-cols-6" };
  return { cols: 7, cls: "grid-cols-7" };
}

const WINNER_COLOR = "bg-amber-600";
const WINNER_BAR = "#d97706";

export default function CardFlip({ winners, participants, onComplete }: Props) {
  const winnerSet = useMemo(() => new Set(winners), [winners]);
  // 화면 80vw를 최대한 채우도록 카드 수를 늘림 (최소: 당첨자+4, 최대: 참가자 수 또는 35)
  const cardCount = Math.min(participants.length, Math.max(20, winners.length + 6), 35);

  const [cards, setCards] = useState<{ name: string; flipped: boolean; isWinner: boolean }[]>([]);
  const [phase, setPhase] = useState<"shuffle" | "flipping" | "done">("shuffle");
  const [shuffleRound, setShuffleRound] = useState(0);
  const [flipOrderRef] = useState<{ current: number[] }>({ current: [] });
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const flippedCount = useMemo(() => cards.filter((c) => c.flipped).length, [cards]);
  const { cols, cls: gridCols } = getGridConfig(cardCount);
  const rows = Math.ceil(cardCount / cols);

  // 카드 초기 세팅
  useEffect(() => {
    let pool = [...participants].sort(() => Math.random() - 0.5).slice(0, cardCount);
    // 당첨자가 풀에 모두 포함되도록 보장
    winners.forEach((w, i) => {
      if (!pool.includes(w)) pool[Math.min(i, pool.length - 1)] = w;
    });
    pool = pool.sort(() => Math.random() - 0.5);

    setCards(
      pool.map((name) => ({
        name,
        flipped: false,
        isWinner: winnerSet.has(name),
      }))
    );

    // 뒤집기 순서: 당첨/꽝 섞되 마지막은 반드시 당첨
    const winnerIndices = pool
      .map((name, i) => ({ name, i }))
      .filter((x) => winnerSet.has(x.name))
      .map((x) => x.i)
      .sort(() => Math.random() - 0.5);
    const nonWinnerIndices = pool
      .map((name, i) => ({ name, i }))
      .filter((x) => !winnerSet.has(x.name))
      .map((x) => x.i)
      .sort(() => Math.random() - 0.5);

    // 마지막 당첨자 1명 빼놓고 나머지를 섞기
    const lastWinner = winnerIndices.pop()!;
    const mixed = [...nonWinnerIndices, ...winnerIndices].sort(() => Math.random() - 0.5);
    mixed.push(lastWinner);
    flipOrderRef.current = mixed;

    // 1단계: 셔플 애니메이션
    let count = 0;
    const si = setInterval(() => {
      count++;
      setShuffleRound(count);
      playCardShuffle();
      if (count >= 5) {
        clearInterval(si);
        const t = setTimeout(() => setPhase("flipping"), 400);
        timeoutsRef.current.push(t);
      }
    }, 300);

    return () => {
      clearInterval(si);
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, [winners, winnerSet, participants, cardCount]);

  // 자동 뒤집기 로직
  useEffect(() => {
    if (phase !== "flipping") return;
    if (cards.length === 0 || flipOrderRef.current.length === 0) return;

    const flipOrder = flipOrderRef.current;

    // 카드 수에 따라 뒤집기 간격 조절 (많을수록 빠르게)
    const flipInterval = cards.length > 20 ? 250 : cards.length > 12 ? 350 : 500;
    flipOrder.forEach((cardIdx, order) => {
      const delay = order * flipInterval + 200;
      const t = setTimeout(() => {
        setCards((prev) => {
          const card = prev[cardIdx];
          playCardFlip();
          if (card.isWinner) setTimeout(playWinCard, 300);
          else setTimeout(playMissCard, 300);
          return prev.map((c, i) => (i === cardIdx ? { ...c, flipped: true } : c));
        });
      }, delay);
      timeoutsRef.current.push(t);
    });

    // 완료
    const totalTime = flipOrder.length * flipInterval + 3000;
    const doneT = setTimeout(() => {
      setPhase("done");
      playAllComplete();
      onComplete();
    }, totalTime);
    timeoutsRef.current.push(doneT);

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, [phase, cards.length, flipOrderRef, onComplete]);

  return (
    <div className="flex flex-col items-center justify-center" style={{ width: "80vw", maxWidth: "80vw", maxHeight: "80vh", gap: "2vh" }}>
      {/* 카드 그리드 - 뷰포트 안에 맞추기 */}
      <div className={`w-full grid ${gridCols}`} style={{ gap: "clamp(4px, 0.8vw, 12px)", maxHeight: "70vh" }}>
        {cards.map((card, i) => {
          const isShuffling = phase === "shuffle" && shuffleRound > 0;
          // 행 수 기반으로 카드 높이를 뷰포트에 맞춤
          const cardMaxHeight = `calc((70vh - ${(rows - 1) * 8}px) / ${rows})`;
          return (
            <div
              key={i}
              className="perspective-600 w-full"
              style={{
                aspectRatio: "3 / 4",
                maxHeight: cardMaxHeight,
                animation: isShuffling ? `cardShuffle 0.3s ease ${i * 30}ms` : undefined,
              }}
            >
              <div
                className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${
                  card.flipped ? "rotate-y-180" : ""
                }`}
                style={{ transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)" }}
              >
                {/* 앞면 (?) */}
                <div className={`absolute inset-0 ${cardCount > 16 ? "rounded-lg" : "rounded-2xl"} bg-slate-800 border-2 border-white/8 flex flex-col items-center justify-center backface-hidden`}>
                  <div className={`absolute ${cardCount > 16 ? "inset-1.5" : "inset-3"} ${cardCount > 16 ? "rounded-md" : "rounded-xl"} border border-white/5`} />
                  <span className={`${cardCount > 20 ? "text-lg" : cardCount > 12 ? "text-2xl" : "text-5xl"}`}>❓</span>
                </div>

                {/* 뒷면 (이름) */}
                <div
                  className={`absolute inset-0 ${cardCount > 16 ? "rounded-lg p-1.5" : "rounded-2xl p-3"} flex items-center justify-center text-center backface-hidden rotate-y-180 border-2 ${
                    card.isWinner
                      ? `${WINNER_COLOR} border-amber-500/30`
                      : "bg-slate-700 border-white/8"
                  }`}
                >
                  <div className="flex flex-col items-center justify-center w-[80%] h-[80%]">
                    <span className="flex-1 flex items-end" style={{ fontSize: "clamp(14px, 4vw, 48px)" }}>
                      {card.isWinner ? "👼" : "💣"}
                    </span>
                    <span className={`flex-1 flex items-start font-black truncate max-w-full ${
                      card.isWinner ? "text-white" : "text-white/50"
                    }`} style={{ fontSize: "clamp(10px, 2.5vw, 28px)" }}>
                      {card.name}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 프로그레스 바 */}
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-white/25 uppercase tracking-widest">Progress</span>
          <span className="text-sm font-black text-white/40">{flippedCount} / {cards.length}</span>
        </div>
        <div className="h-1 bg-white/8 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${cards.length > 0 ? (flippedCount / cards.length) * 100 : 0}%`,
              background: flippedCount > 0 ? WINNER_BAR : undefined,
              transition: "width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          />
        </div>
      </div>

      <style jsx>{`
        .perspective-600 { perspective: 600px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }

        @keyframes cardShuffle {
          0% { transform: translateY(0) rotate(0deg); }
          20% { transform: translateY(-8px) rotate(-3deg); }
          50% { transform: translateY(4px) rotate(2deg); }
          80% { transform: translateY(-2px) rotate(-1deg); }
          100% { transform: translateY(0) rotate(0deg); }
        }
      `}</style>
    </div>
  );
}
