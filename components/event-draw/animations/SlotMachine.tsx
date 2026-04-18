"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { playSlotTick, playSlotStop, playAllComplete } from "./drawSounds";

interface Props {
  winners: string[];
  participants: string[];
  onComplete: () => void;
}

const COLOR = { bar: "#4f46e5" };

// ============================================================
// 슬롯머신 1대 - DOM 직접 조작으로 최적화
// ============================================================

interface UnitProps {
  winner: string;
  participants: string[];
  delay: number;
  index: number;
  showTitle: boolean;
  onDone: () => void;
}

function SlotUnit({ winner, participants, delay, index, showTitle, onDone }: UnitProps) {
  const [done, setDone] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rafRef = useRef<number | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const getRandom = () => participants[Math.floor(Math.random() * participants.length)];

    const startDelay = setTimeout(() => {
      setSpinning(true);
      const duration = 5000 + index * 500;
      let speed = 55;
      let lastTick = 0;

      // requestAnimationFrame 기반 스핀 (setInterval 대신)
      let tickSoundCounter = 0;
      const tick = (ts: number) => {
        if (ts - lastTick >= speed) {
          lastTick = ts;
          if (topRef.current) topRef.current.textContent = getRandom();
          if (centerRef.current) centerRef.current.textContent = getRandom();
          if (bottomRef.current) bottomRef.current.textContent = getRandom();
          tickSoundCounter++;
          if (tickSoundCounter % 3 === 0) playSlotTick();
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);

      // 감속 스케줄
      const slowdowns = [
        { at: duration * 0.4, newSpeed: 100 },
        { at: duration * 0.6, newSpeed: 200 },
        { at: duration * 0.78, newSpeed: 350 },
        { at: duration * 0.9, newSpeed: 500 },
      ];
      slowdowns.forEach(({ at, newSpeed }) => {
        const t = setTimeout(() => { speed = newSpeed; }, at);
        timeoutsRef.current.push(t);
      });

      // 완료
      const finishTimeout = setTimeout(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (topRef.current) topRef.current.textContent = getRandom();
        if (centerRef.current) centerRef.current.textContent = winner;
        if (bottomRef.current) bottomRef.current.textContent = getRandom();
        setSpinning(false);
        setDone(true);
        playSlotStop();
        onDoneRef.current();
      }, duration);
      timeoutsRef.current.push(finishTimeout);
    }, delay);
    timeoutsRef.current.push(startDelay);

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner, participants, delay, index]);

  return (
    <div className="flex items-stretch gap-0 w-full max-w-xl">
      {/* 슬롯머신 본체 */}
      <div className="w-full flex flex-col">
        {/* 최상단 아치형 장식 */}
        <div className="relative mx-2">
          <div className="bg-gradient-to-b from-red-700 to-red-800 rounded-t-[2rem] pt-3 pb-2 px-6 border-2 border-red-600/50"
            style={{ boxShadow: "inset 0 2px 4px rgba(255,255,255,0.15), 0 4px 12px rgba(0,0,0,0.4)" }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              {Array.from({ length: 11 }).map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full" style={{
                  background: done ? (i % 2 === 0 ? "#fbbf24" : "#f87171") : spinning ? (i % 2 === 0 ? "#fbbf24" : "#fb923c") : "#ffffff30",
                  animation: (spinning || done) ? `bulbChase 0.8s ease-in-out ${i * 0.07}s infinite alternate` : undefined,
                }} />
              ))}
            </div>
            <div className="text-center">
              <div className="text-amber-300 font-black text-lg tracking-[0.25em] uppercase"
                style={{ textShadow: "0 0 10px rgba(251,191,36,0.5), 0 2px 0 rgba(0,0,0,0.3)" }}>
                {showTitle ? "LUCKY DRAW" : `#${index + 1}`}
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 mt-2">
              {Array.from({ length: 11 }).map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full" style={{
                  background: done ? (i % 2 === 1 ? "#fbbf24" : "#f87171") : spinning ? (i % 2 === 1 ? "#fbbf24" : "#fb923c") : "#ffffff30",
                  animation: (spinning || done) ? `bulbChase 0.8s ease-in-out ${(10 - i) * 0.07}s infinite alternate` : undefined,
                }} />
              ))}
            </div>
          </div>
        </div>

        {/* 메인 바디 */}
        <div className="relative bg-gradient-to-b from-slate-500 via-slate-600 to-slate-500 px-5 py-5 border-x-4 border-slate-400/40"
          style={{ boxShadow: "inset 2px 0 4px rgba(255,255,255,0.1), inset -2px 0 4px rgba(0,0,0,0.2)" }}>
          <div className="relative rounded-xl overflow-hidden border-4 border-slate-800"
            style={{ boxShadow: "inset 0 0 20px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)" }}>
            <div className="bg-slate-950">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/10 pointer-events-none z-20" />
              <div className="flex flex-col items-center justify-center py-4">
                <div
                  ref={topRef}
                  className={`w-full text-center truncate px-8 text-xl lg:text-2xl py-4 font-bold ${done ? "text-white/30" : "text-white/15"}`}
                  style={{ filter: spinning ? "blur(2px)" : "none" }}
                >
                  {"\u00A0"}
                </div>
                <div className={`w-full h-px ${done ? "bg-white/30" : "bg-amber-500/30"}`} />
                <div
                  ref={centerRef}
                  className={`w-full text-center truncate px-8 text-4xl lg:text-5xl xl:text-6xl py-8 lg:py-10 font-black ${done ? "text-white" : spinning ? "text-white/85" : "text-white/20"}`}
                >
                  ???
                </div>
                <div className={`w-full h-px ${done ? "bg-white/30" : "bg-amber-500/30"}`} />
                <div
                  ref={bottomRef}
                  className={`w-full text-center truncate px-8 text-xl lg:text-2xl py-4 font-bold ${done ? "text-white/30" : "text-white/15"}`}
                  style={{ filter: spinning ? "blur(2px)" : "none" }}
                >
                  {"\u00A0"}
                </div>
              </div>
              <div className={`absolute top-0 left-0 right-0 h-1/4 bg-gradient-to-b from-slate-950 to-transparent pointer-events-none z-10 ${done ? "opacity-0" : "opacity-100"}`} />
              <div className={`absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none z-10 ${done ? "opacity-0" : "opacity-100"}`} />
            </div>
          </div>
          <div className="absolute left-0 top-1/2 -translate-y-1/2 z-30">
            <div className={`w-3 h-6 rounded-r-sm ${done ? "bg-indigo-400" : "bg-amber-500/70"}`} />
          </div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 z-30">
            <div className={`w-3 h-6 rounded-l-sm ${done ? "bg-indigo-400" : "bg-amber-500/70"}`} />
          </div>
          <div className="absolute top-2 left-2 w-3 h-3 rounded-full bg-slate-400/30 border border-slate-300/20" style={{ boxShadow: "inset 0 1px 2px rgba(255,255,255,0.2)" }} />
          <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-slate-400/30 border border-slate-300/20" style={{ boxShadow: "inset 0 1px 2px rgba(255,255,255,0.2)" }} />
          <div className="absolute bottom-2 left-2 w-3 h-3 rounded-full bg-slate-400/30 border border-slate-300/20" style={{ boxShadow: "inset 0 1px 2px rgba(255,255,255,0.2)" }} />
          <div className="absolute bottom-2 right-2 w-3 h-3 rounded-full bg-slate-400/30 border border-slate-300/20" style={{ boxShadow: "inset 0 1px 2px rgba(255,255,255,0.2)" }} />
        </div>

        {/* 하단 패널 */}
        <div className="bg-gradient-to-b from-slate-500 to-slate-700 rounded-b-2xl px-6 py-4 border-x-4 border-b-4 border-slate-400/40"
          style={{ boxShadow: "inset 2px 0 4px rgba(255,255,255,0.05), 0 4px 12px rgba(0,0,0,0.4)" }}>
          <div className="w-full max-w-xs mx-auto mb-3">
            <div className="h-1.5 bg-slate-800/60 rounded-full overflow-hidden border border-slate-600/50">
              <div className="h-full rounded-full" style={{
                width: done ? "100%" : "0%",
                background: COLOR.bar,
                transition: done ? "width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)" : "width 5s linear",
              }} ref={(el) => { if (el && !done) requestAnimationFrame(() => { el.style.width = "85%"; }); }} />
            </div>
          </div>
          <div className="flex items-center justify-center gap-4">
            <div className="w-16 h-1.5 rounded-full bg-slate-800/50 border border-slate-600/30" />
            <div className="text-[10px] font-bold text-slate-400/50 uppercase tracking-widest">insert coin</div>
            <div className="w-16 h-1.5 rounded-full bg-slate-800/50 border border-slate-600/30" />
          </div>
        </div>
      </div>

      {/* 레버 */}
      <div className="flex flex-col items-center relative" style={{ width: "48px", paddingTop: "18%" }}>
        <div className="absolute z-0 w-3 rounded-full" style={{
          height: "90px", top: "calc(18% + 8px)",
          background: "linear-gradient(180deg, #1e293b, #334155, #1e293b)",
          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.6)",
        }} />
        <div className="w-10 h-5 rounded-md bg-gradient-to-b from-slate-400 to-slate-500 z-20"
          style={{ boxShadow: "inset 0 1px 2px rgba(255,255,255,0.2), 0 2px 4px rgba(0,0,0,0.3)" }} />
        <div className="flex flex-col items-center z-10"
          style={{ animation: `leverPull 1.6s ease-out ${0.2 + (delay / 1000)}s both` }}>
          <div className="w-2.5 rounded-sm" style={{
            height: "80px",
            background: "linear-gradient(90deg, #94a3b8, #cbd5e1, #e2e8f0, #cbd5e1, #94a3b8)",
            boxShadow: "2px 2px 4px rgba(0,0,0,0.3), -1px 0 2px rgba(255,255,255,0.1)",
          }} />
          <div className={`w-9 h-9 rounded-full ${done ? "bg-indigo-500" : "bg-red-600"}`}
            style={{ boxShadow: "0 4px 8px rgba(0,0,0,0.4), inset 0 -3px 6px rgba(0,0,0,0.3), inset 0 3px 6px rgba(255,255,255,0.25)" }} />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 메인
// ============================================================

export default function SlotMachine({ winners, participants, onComplete }: Props) {
  const capped = useMemo(() => winners.slice(0, 8), [winners]);
  const isMulti = capped.length > 1;
  const [doneCount, setDoneCount] = useState(0);

  const handleUnitDone = useCallback(() => {
    setDoneCount((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (doneCount === capped.length && capped.length > 0) {
      playAllComplete();
      const t = setTimeout(onComplete, 2500);
      return () => clearTimeout(t);
    }
  }, [doneCount, capped.length, onComplete]);

  return (
    <div className="flex flex-col items-center justify-center" style={{ width: "80vw", maxWidth: "80vw", gap: isMulti ? "4vh" : 0 }}>
      {isMulti ? (
        <>
          <div className="grid grid-cols-4 gap-6 justify-items-center">
            {capped.map((winner, i) => (
              <SlotUnit
                key={i}
                winner={winner}
                participants={participants}
                delay={i * 800}
                index={i}
                showTitle={false}
                onDone={handleUnitDone}
              />
            ))}
          </div>

          <div className="w-full max-w-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white/25 uppercase tracking-widest">Progress</span>
              <span className="text-sm font-black text-white/40">{doneCount} / {capped.length}</span>
            </div>
            <div className="h-1 bg-white/8 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{
                width: `${(doneCount / capped.length) * 100}%`,
                background: doneCount > 0 ? COLOR.bar : undefined,
                transition: "width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }} />
            </div>
          </div>
        </>
      ) : (
        <SlotUnit
          winner={capped[0]}
          participants={participants}
          delay={800}
          index={0}
          showTitle={true}
          onDone={handleUnitDone}
        />
      )}

      <style jsx>{`
        @keyframes bulbChase {
          from { opacity: 0.3; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1.1); }
        }
        @keyframes leverPull {
          0%   { transform: translateY(0); }
          5%   { transform: translateY(-4px); }
          25%  { transform: translateY(60px); }
          35%  { transform: translateY(58px); }
          50%  { transform: translateY(60px); }
          65%  { transform: translateY(-8px); }
          75%  { transform: translateY(4px); }
          83%  { transform: translateY(-2px); }
          90%  { transform: translateY(1px); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
