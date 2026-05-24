"use client";

// Talklish · 요일 Shell — 공통 외곽(매스트헤드 + 출석 + 타이머)
// day prop에 따라 내부에서 Stage를 분기 렌더한다.
//
// 주의: 라우트 페이지(Server Component)는 함수 children/컴포넌트 prop을
//       Client Component에 전달할 수 없으므로(직렬화 불가) day 문자열만 받음.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Home } from "lucide-react";
import { Masthead, type DayKey } from "./masthead";
import { PodcastStage } from "./podcast-stage";
import { OpicStage } from "./opic-stage";
import { FreetalkStage } from "./freetalk-stage";
import { TLK, TLK_FONT } from "./tokens";

/** VOL(회차) 계산 — 매년 1월 1일을 기준으로 그 해의 월·수·금 세션을 1부터 카운트.
 *  예: 1월 1일이 월요일이면 1/1이 Vol 1, 그 주 수요일이 Vol 2, 금요일이 Vol 3 …
 *  매년 1월 1일에 다시 1부터 시작한다. (오늘이 월·수·금이면 오늘 포함 회차) */
function computeSessionMeta(): { sessionNo: number; dateLabel: string } {
  const today = new Date();

  // 올해 1월 1일부터 오늘까지 월(1)·수(3)·금(5) 요일 수를 센다 (오늘 포함)
  let sessionNo = 0;
  const cursor = new Date(today.getFullYear(), 0, 1);
  while (cursor <= today) {
    const dow = cursor.getDay();
    if (dow === 1 || dow === 3 || dow === 5) sessionNo += 1;
    cursor.setDate(cursor.getDate() + 1);
  }

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
  const [absentIds, setAbsentIds] = useState<Set<string>>(new Set());
  const [focusMode, setFocusMode] = useState(false); // F 키 — 최상단 chrome(nav + Masthead) 숨김
  const [clock, setClock] = useState(""); // Full 모드에서 표시할 현재 시각 (HH:MM)

  const toggleAttendance = (memberId: string) => {
    setAbsentIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  // 세션 경과 시간 — PodcastStage 단계 자동전환용 (화면 타이머 표시는 없음)
  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => Math.min(e + 1, 60 * 60)), 1000);
    return () => clearInterval(id);
  }, []);

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

  // 현재 시각(HH:MM)을 1초마다 갱신 — 일반 모드 헤더 + Full 모드 표시 공용
  // (분이 바뀔 때만 동일값 bail-out으로 실제 리렌더되어 부담 없음)
  useEffect(() => {
    const update = () => {
      const d = new Date();
      setClock(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="flex h-dvh w-full flex-col overflow-hidden"
      style={{ background: TLK.bg, color: TLK.ink, fontFamily: TLK_FONT.ko }}
    >
      {/* 우상단 — Talklish 홈(요일 선택)으로 복귀 (F 키로 숨김) */}
      {!focusMode && (
      <div
        className="flex items-center justify-end px-6 pt-3 sm:px-12"
        style={{ background: TLK.bg }}
      >
        <Link
          href="/talklish"
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors"
          style={{ color: TLK.inkFaint, fontFamily: TLK_FONT.sans }}
        >
          <Home size={12} /> Talklish 홈
        </Link>
      </div>
      )}

      {!focusMode && (
      <Masthead
        day={day}
        sessionNo={meta.sessionNo}
        dateLabel={meta.dateLabel}
      />
      )}

      {/* Stage 본문 — day별 분기 */}
      <div className="min-h-0 flex-1">
        {day === "mon" && (
          <PodcastStage
            elapsed={elapsed}
            focusMode={focusMode}
            absentIds={absentIds}
            onToggleAttendance={toggleAttendance}
          />
        )}
        {day === "wed" && (
          <OpicStage
            focusMode={focusMode}
            absentIds={absentIds}
            onToggleAttendance={toggleAttendance}
          />
        )}
        {day === "fri" && (
          <FreetalkStage
            focusMode={focusMode}
            absentIds={absentIds}
            onToggleAttendance={toggleAttendance}
          />
        )}
      </div>

      {/* Full(focus) 모드 — 현재 시각 (Masthead 숨김 상태에서도 시간 확인) */}
      {focusMode && (
        <div
          className="fixed right-4 top-4 z-50 flex items-center gap-2.5 rounded-full py-2 pl-4 pr-4 shadow-lg"
          style={{ background: TLK.ink, color: TLK.bg }}
        >
          <span
            style={{
              fontFamily: TLK_FONT.sans,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 1.5,
              opacity: 0.6,
            }}
          >
            NOW
          </span>
          <span
            style={{
              fontFamily: TLK_FONT.serif,
              fontStyle: "italic",
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: -0.5,
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {clock.slice(0, 2)}
            <span style={{ color: TLK.accent }}>:</span>
            {clock.slice(3)}
          </span>
        </div>
      )}
    </div>
  );
}
