"use client";

// Talklish · 요일 Shell — 공통 외곽(매스트헤드 + 출석 + 타이머)
// day prop에 따라 내부에서 Stage를 분기 렌더한다.
//
// 주의: 라우트 페이지(Server Component)는 함수 children/컴포넌트 prop을
//       Client Component에 전달할 수 없으므로(직렬화 불가) day 문자열만 받음.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Masthead, type DayKey } from "./masthead";
import { PodcastStage } from "./podcast-stage";
import { OpicStage } from "./opic-stage";
import { FreetalkStage } from "./freetalk-stage";
import { TLK, TLK_FONT } from "./tokens";

/** 첫 시작일(2026-05-11 월) 기준 회차 계산.
 *  주 5일 운영(월·수·금) 가정: 한 주에 3회차씩 증가. */
function computeSessionMeta(): { sessionNo: number; dateLabel: string } {
  const baseSession = 47;
  const baseDate = new Date(2026, 4, 11); // 2026-05-11 (월)
  const today = new Date();
  const diffDays = Math.max(0, Math.floor((today.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24)));
  const sessionsPassed = Math.floor((diffDays / 7) * 3);
  const sessionNo = baseSession + sessionsPassed;
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const dateLabel = `${today.getMonth() + 1}월 ${today.getDate()}일 (${days[today.getDay()]})`;
  return { sessionNo, dateLabel };
}

interface DayShellProps {
  day: DayKey;
}

export function DayShell({ day }: DayShellProps) {
  const meta = useRef(computeSessionMeta()).current;
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [absentIds, setAbsentIds] = useState<Set<string>>(new Set());
  const [focusMode, setFocusMode] = useState(false); // F 키 — 최상단 chrome(nav + Masthead) 숨김

  const toggleAttendance = (memberId: string) => {
    setAbsentIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  // 타이머 (60분 카운트다운)
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed((e) => Math.min(e + 1, 60 * 60)), 1000);
    return () => clearInterval(id);
  }, [running]);

  // 키보드 단축키 — F: 최상단 chrome 토글 (영상·자료 몰입)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target;
      if (t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        setFocusMode((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      className="flex h-dvh w-full flex-col overflow-hidden"
      style={{ background: TLK.bg, color: TLK.ink, fontFamily: TLK_FONT.ko }}
    >
      {/* 좌상단 — 대시보드 + 진입 페이지 복귀 (F 키로 숨김) */}
      {!focusMode && (
      <div
        className="flex items-center justify-between px-6 pt-3 sm:px-12"
        style={{ background: TLK.bg }}
      >
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors"
          style={{ color: TLK.inkFaint, fontFamily: TLK_FONT.sans }}
        >
          <ArrowLeft size={12} /> 대시보드
        </Link>
        <Link
          href="/study-group"
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors"
          style={{ color: TLK.inkFaint, fontFamily: TLK_FONT.sans }}
        >
          <ArrowLeft size={12} /> 요일 선택
        </Link>
      </div>
      )}

      {!focusMode && (
      <Masthead
        day={day}
        elapsed={elapsed}
        running={running}
        onToggleRunning={() => setRunning((r) => !r)}
        sessionNo={meta.sessionNo}
        dateLabel={meta.dateLabel}
      />
      )}

      {/* Stage 본문 — day별 분기 */}
      <div className="min-h-0 flex-1">
        {day === "mon" && (
          <PodcastStage
            elapsed={elapsed}
            absentIds={absentIds}
            onToggleAttendance={toggleAttendance}
          />
        )}
        {day === "wed" && (
          <OpicStage absentIds={absentIds} onToggleAttendance={toggleAttendance} />
        )}
        {day === "fri" && (
          <FreetalkStage absentIds={absentIds} onToggleAttendance={toggleAttendance} />
        )}
      </div>

      {/* focus 모드 복귀 버튼 — F 키 누른 동안만 우상단에 떠 있음 */}
      {focusMode && (
        <button
          type="button"
          onClick={() => setFocusMode(false)}
          className="fixed right-4 top-4 z-50 rounded-full px-4 py-2 shadow-lg"
          style={{
            background: TLK.ink,
            color: TLK.bg,
            border: 0,
            fontSize: 11,
            fontFamily: TLK_FONT.sans,
            fontWeight: 700,
            letterSpacing: 1.5,
            cursor: "pointer",
          }}
        >
          F · 헤더 보이기
        </button>
      )}
    </div>
  );
}
