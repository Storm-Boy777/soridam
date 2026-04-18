"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";

interface Props {
  winners: string[];
  participants: string[];
  onComplete: () => void;
}

const SEGMENT_COLORS = [
  "#475569", "#546478", "#4a5568", "#5b6b7a",
  "#526072", "#4d5c6e", "#586878", "#4f5f70",
  "#5a6a7c", "#4b5b6d", "#566676", "#516171",
];

const WINNER_COLOR = "#e11d48"; // rose-600

// ============================================================
// 룰렛 1대 (싱글/멀티 동일한 UI)
// ============================================================

interface UnitProps {
  winner: string;
  participants: string[];
  delay: number;
  index: number;
  showIndex: boolean;
  maxSize: number;
  onDone: () => void;
}

function RouletteUnit({ winner, participants, delay, index, showIndex, maxSize, onDone }: UnitProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"waiting" | "spinning" | "done">("waiting");
  const [canvasSize, setCanvasSize] = useState(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // 컨테이너 크기에 맞춰 캔버스 크기 결정
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const w = container.clientWidth;
      setCanvasSize(Math.round(Math.min(w, maxSize)));
    };
    updateSize();

    const ro = new ResizeObserver(updateSize);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  const drawWheel = useCallback((
    ctx: CanvasRenderingContext2D,
    unique: string[],
    rotation: number,
    size: number,
    winnerIdx: number,
    highlight: boolean,
  ) => {
    const center = size / 2;
    const radius = size / 2 - 6;
    const segAngle = 360 / unique.length;

    ctx.clearRect(0, 0, size, size);

    // 외곽 링
    ctx.beginPath();
    ctx.arc(center, center, radius + 3, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 3;
    ctx.stroke();

    unique.forEach((name, i) => {
      const startA = ((i * segAngle - 90 + rotation) * Math.PI) / 180;
      const endA = (((i + 1) * segAngle - 90 + rotation) * Math.PI) / 180;
      const isWinner = highlight && i === winnerIdx;

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startA, endA);
      ctx.fillStyle = isWinner ? WINNER_COLOR : SEGMENT_COLORS[i % SEGMENT_COLORS.length];
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startA + ((segAngle * Math.PI) / 360));
      ctx.fillStyle = isWinner ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.6)";
      const fontSize = Math.min(Math.round(size * 0.04), Math.round(160 / unique.length));
      ctx.font = `${isWinner ? "800" : "600"} ${Math.max(fontSize, 10)}px 'Pretendard', sans-serif`;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      const maxLen = unique.length > 12 ? 3 : 5;
      const displayName = name.length > maxLen ? name.slice(0, maxLen - 1) + ".." : name;
      ctx.fillText(displayName, radius * 0.78, 0);
      ctx.restore();
    });

    // 중앙 원
    ctx.beginPath();
    ctx.arc(center, center, size * 0.065, 0, Math.PI * 2);
    ctx.fillStyle = highlight ? WINNER_COLOR : "#1e293b";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 중앙 점
    ctx.beginPath();
    ctx.arc(center, center, size * 0.02, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fill();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasSize < 50) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let items = [...participants];
    if (items.length > 20) {
      items = items.slice(0, 19);
      if (!items.includes(winner)) items[0] = winner;
    }
    const unique = [...new Set(items)];
    if (!unique.includes(winner)) unique.push(winner);

    const segAngle = 360 / unique.length;
    const winnerIdx = unique.indexOf(winner);
    const targetAngle = 360 * 8 + (360 - winnerIdx * segAngle - segAngle / 2);
    const duration = 7000;

    // 초기 그리기
    drawWheel(ctx, unique, 0, canvasSize, winnerIdx, false);

    const delayTimeout = setTimeout(() => {
      setPhase("spinning");
      let startTime: number | null = null;
      let animId: number;

      const easeOutBack = (t: number): number => {
        const c1 = 1.2;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      };

      const animate = (ts: number) => {
        if (!startTime) startTime = ts;
        const elapsed = ts - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutBack(progress);
        drawWheel(ctx, unique, targetAngle * eased, canvasSize, winnerIdx, false);

        if (progress < 1) {
          animId = requestAnimationFrame(animate);
        } else {
          drawWheel(ctx, unique, targetAngle, canvasSize, winnerIdx, true);
          setPhase("done");
          onDoneRef.current();
        }
      };

      animId = requestAnimationFrame(animate);
    }, delay);

    return () => clearTimeout(delayTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner, participants, canvasSize, delay, drawWheel, maxSize]);

  return (
    <div className="flex flex-col items-center w-full max-w-[600px]" ref={containerRef}>
      {canvasSize > 0 && (
        <div className="relative">
          {/* 번호 뱃지 (멀티일 때만) */}
          {showIndex && (
            <span className={`absolute -top-1 -left-1 z-20 rounded-md flex items-center justify-center font-black w-6 h-6 text-[10px] ${
              phase === "done" ? "bg-rose-700 text-white" : "bg-white/10 text-white/25"
            }`}>
              {index + 1}
            </span>
          )}
          {/* 바늘 */}
          <div className="absolute z-10 left-1/2 -translate-x-1/2" style={{ top: "-2px" }}>
            <div style={{
              width: 0, height: 0,
              borderLeft: `${Math.round(canvasSize * 0.025)}px solid transparent`,
              borderRight: `${Math.round(canvasSize * 0.025)}px solid transparent`,
              borderTop: `${Math.round(canvasSize * 0.06)}px solid ${phase === "done" ? WINNER_COLOR : "#94a3b8"}`,
            }} />
          </div>
          <canvas ref={canvasRef} width={canvasSize} height={canvasSize} className="rounded-full" />
        </div>
      )}

      {/* 프로그레스 바 (싱글일 때만) */}
      {!showIndex && (
        <div className="w-full mt-4">
          <div className="h-1 bg-white/8 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{
              width: phase === "done" ? "100%" : "0%",
              background: WINNER_COLOR,
              transition: phase === "done" ? "width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)" : "width 6.5s linear",
            }} ref={(el) => {
              if (el && phase === "waiting") {
                setTimeout(() => { if (el) el.style.width = "85%"; }, delay + 100);
              }
            }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 메인
// ============================================================

function getGridCols(count: number): string {
  if (count <= 4) return "grid-cols-4";
  return "grid-cols-4";
}

export default function Roulette({ winners, participants, onComplete }: Props) {
  const capped = useMemo(() => winners.slice(0, 8), [winners]);
  const isMulti = capped.length > 1;
  const [doneCount, setDoneCount] = useState(0);
  const gridCols = getGridCols(capped.length);

  const handleUnitDone = useCallback(() => {
    setDoneCount((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (doneCount === capped.length && capped.length > 0) {
      const t = setTimeout(onComplete, 2500);
      return () => clearTimeout(t);
    }
  }, [doneCount, capped.length, onComplete]);

  return (
    <div className="flex flex-col items-center justify-center" style={{ width: "80vw", maxWidth: "80vw", gap: isMulti ? "4vh" : 0 }}>
      {isMulti ? (
        <>
          <div className={`w-full grid ${gridCols} justify-items-center`} style={{ gap: capped.length <= 4 ? "2rem 2rem" : "3.5rem 2rem" }}>
            {capped.map((winner, i) => (
              <RouletteUnit
                key={i}
                winner={winner}
                participants={participants}
                delay={i * 1000}
                index={i}
                showIndex={true}
                maxSize={capped.length <= 4 ? 300 : 260}
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
                background: doneCount > 0 ? WINNER_COLOR : undefined,
                transition: "width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }} />
            </div>
          </div>
        </>
      ) : (
        <RouletteUnit
          winner={capped[0]}
          participants={participants}
          delay={0}
          index={0}
          showIndex={false}
          maxSize={600}
          onDone={handleUnitDone}
        />
      )}
    </div>
  );
}
