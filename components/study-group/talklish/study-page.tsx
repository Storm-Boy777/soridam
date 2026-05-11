"use client";

// Talklish · Editorial Studio 메인 페이지
// 매스트헤드 + 요일별 Stage (월: PodcastStage, 수/금: 기존 탭 임베드)

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Masthead, type DayKey } from "./masthead";
import { PodcastStage } from "./podcast-stage";
import { OpicStage } from "./opic-stage";
import { FreetalkStage } from "./freetalk-stage";
import { TLK, TLK_FONT } from "./tokens";

/* 회차 산출 — 첫 시작일을 기준으로 매주 월/수/금에 +1 */
function computeSessionMeta() {
  // 임시: 오늘 날짜 + 단순 계산 (실데이터 연동 전까지는 47부터 시작)
  const baseSession = 47;
  const baseDate = new Date(2026, 4, 11); // 2026-05-11 (월)
  const today = new Date();
  const diffDays = Math.max(0, Math.floor((today.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24)));
  // 단순 — 주 5일 운영 가정 (월/수/금이 한 회차)
  const sessionsPassed = Math.floor((diffDays / 7) * 3);
  const sessionNo = baseSession + sessionsPassed;
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const dateLabel = `${today.getMonth() + 1}월 ${today.getDate()}일 (${days[today.getDay()]})`;
  // 요일에 따라 기본 day 선택
  const dayIdx = today.getDay();
  const initialDay: DayKey = dayIdx === 1 ? "mon" : dayIdx === 3 ? "wed" : dayIdx === 5 ? "fri" : "mon";
  return { sessionNo, dateLabel, initialDay };
}

export function TalklishStudyPage() {
  const meta = useRef(computeSessionMeta()).current;

  const [day, setDay] = useState<DayKey>(meta.initialDay);
  const [elapsed, setElapsed] = useState(0); // 초
  const [running, setRunning] = useState(false);

  // 출석 — 결석자 ID Set (기본은 모두 출석)
  const [absentIds, setAbsentIds] = useState<Set<string>>(new Set());
  const toggleAttendance = (memberId: string) => {
    setAbsentIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  // 타이머
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed((e) => Math.min(e + 1, 60 * 60)), 1000);
    return () => clearInterval(id);
  }, [running]);

  return (
    <div
      className="flex h-dvh w-full flex-col overflow-hidden"
      style={{ background: TLK.bg, color: TLK.ink, fontFamily: TLK_FONT.ko }}
    >
      {/* 좌상단 — 대시보드 복귀 (매스트헤드 위에 작은 칩) */}
      <div
        className="flex items-center justify-between px-6 pt-3 sm:px-12"
        style={{ background: TLK.bg }}
      >
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors"
          style={{
            background: "transparent",
            color: TLK.inkFaint,
            fontFamily: TLK_FONT.sans,
          }}
        >
          <ArrowLeft size={12} /> 대시보드
        </Link>
      </div>

      {/* 매스트헤드 */}
      <Masthead
        day={day}
        onDayChange={(d) => {
          setDay(d);
          // 요일 전환 시 타이머 초기화
          setElapsed(0);
          setRunning(false);
        }}
        elapsed={elapsed}
        running={running}
        onToggleRunning={() => setRunning((r) => !r)}
        sessionNo={meta.sessionNo}
        dateLabel={meta.dateLabel}
      />

      {/* 본문 */}
      <div className="flex-1 overflow-hidden">
        {day === "mon" && (
          <PodcastStage
            elapsed={elapsed}
            absentIds={absentIds}
            onToggleAttendance={toggleAttendance}
          />
        )}
        {day === "wed" && (
          <OpicStage
            absentIds={absentIds}
            onToggleAttendance={toggleAttendance}
          />
        )}
        {day === "fri" && (
          <FreetalkStage
            absentIds={absentIds}
            onToggleAttendance={toggleAttendance}
          />
        )}
      </div>
    </div>
  );
}
