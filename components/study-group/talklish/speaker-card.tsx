"use client";

// 공용 룰렛/스피커 카드
// - 멤버 그리드 (출석자 강조, 결석자 dimmed)
// - 멤버 클릭 시 출석/결석 토글
// - PICK NEXT 클릭 시 출석자만 대상으로 spin
// - "지금 차례" 표시

import type { PanelMember } from "@/lib/types/study-group";
import { TLK, TLK_FONT } from "./tokens";

interface Props {
  members: PanelMember[];
  absentIds: Set<string>;
  activeSpeaker: number;        // members 인덱스
  /** 한 번이라도 spin이 돌았는지 — false면 active 표시 안 함 (초기 미선택 상태) */
  hasSpun?: boolean;
  spinning: boolean;
  onSpin: () => void;
  onToggleAttendance: (memberId: string) => void;
}

export function SpeakerCard({
  members,
  absentIds,
  activeSpeaker,
  hasSpun = true,
  spinning,
  onSpin,
  onToggleAttendance,
}: Props) {
  const presentCount = members.filter((m) => !absentIds.has(m.id)).length;
  const active = hasSpun ? members[activeSpeaker] : undefined;

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}
    >
      {/* 헤더: Speaker + 출석 카운트 + PICK NEXT */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p
            style={{
              fontFamily: TLK_FONT.sans,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 2,
              color: TLK.inkFaint,
              textTransform: "uppercase",
              lineHeight: 1,
            }}
          >
            Speaker
          </p>
          {members.length > 0 && (
            <p
              style={{
                fontFamily: TLK_FONT.mono,
                fontSize: 10,
                color: presentCount > 0 ? TLK.accent2 : TLK.inkFaint,
                marginTop: 4,
                letterSpacing: 0.5,
              }}
            >
              출석 {presentCount}/{members.length}
            </p>
          )}
        </div>
        <button
          onClick={onSpin}
          disabled={spinning || presentCount === 0}
          className="rounded-full px-3 py-1 text-[10px] font-bold tracking-widest transition-opacity disabled:opacity-50"
          style={{
            background: TLK.accent,
            color: "#fff",
            fontFamily: TLK_FONT.sans,
            cursor: spinning ? "wait" : presentCount === 0 ? "not-allowed" : "pointer",
            border: 0,
          }}
        >
          {spinning ? "SPIN…" : "PICK NEXT"}
        </button>
      </div>

      {members.length === 0 ? (
        <p style={{ fontSize: 11, color: TLK.inkFaint, fontFamily: TLK_FONT.sans }}>
          패널 멤버를 등록해 주세요.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {members.map((m, i) => {
              const absent = absentIds.has(m.id);
              const isActive = hasSpun && i === activeSpeaker && !spinning && !absent;
              return (
                <button
                  key={m.id}
                  onClick={() => onToggleAttendance(m.id)}
                  className="flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 transition-all"
                  style={{
                    background: isActive ? m.color : TLK.bg2,
                    border: `1px solid ${isActive ? m.color : absent ? `${TLK.rule}80` : TLK.rule}`,
                    transform: spinning && !absent ? `rotate(${(i % 2 ? 1 : -1) * 4}deg)` : "rotate(0)",
                    transition: "all .3s",
                    opacity: absent ? 0.4 : 1,
                    filter: absent ? "grayscale(0.7)" : "none",
                    cursor: "pointer",
                  }}
                  title={absent ? "결석 → 클릭하면 출석" : "출석 → 클릭하면 결석"}
                >
                  <div className="text-2xl leading-none">{m.emoji}</div>
                  <div
                    style={{
                      fontSize: 10,
                      fontFamily: TLK_FONT.sans,
                      fontWeight: 600,
                      color: isActive ? "#fff" : TLK.ink,
                      textDecoration: absent ? "line-through" : "none",
                    }}
                  >
                    {m.name}
                  </div>
                </button>
              );
            })}
          </div>

          {/* 안내 캡션 */}
          <p
            style={{
              marginTop: 8,
              fontSize: 10,
              color: TLK.inkFaint,
              fontFamily: TLK_FONT.sans,
              textAlign: "center",
            }}
          >
            클릭으로 출석/결석 전환 · 출석자만 룰렛 대상
          </p>

          {!spinning && active && !absentIds.has(active.id) && (
            <div
              className="mt-3 rounded-lg px-3 py-2 text-center"
              style={{
                background: TLK.bg2,
                fontFamily: TLK_FONT.serif,
                fontStyle: "italic",
                fontSize: 13,
                color: TLK.ink,
              }}
            >
              지금 차례 — <strong>{active.name}</strong>
            </div>
          )}
        </>
      )}
    </div>
  );
}
