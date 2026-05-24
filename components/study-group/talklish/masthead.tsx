"use client";

// Talklish · Editorial Studio 매스트헤드
// 워드마크 + VOL + 요일 탭 + 큰 세리프 타이머 + PAUSE
//
// 요일 탭은 라우트 기반 (월/수/금 페이지로 이동). 진입 페이지(/talklish)로 돌아가는
// "스튜디오" 워드마크 링크 포함.

import Link from "next/link";
import { TLK, TLK_FONT } from "./tokens";

export type DayKey = "mon" | "wed" | "fri";

const DAYS: { key: DayKey; label: string; sub: string; route: string }[] = [
  { key: "mon", label: "월요일", sub: "Podcast",   route: "/talklish/monday" },
  { key: "wed", label: "수요일", sub: "OPIc",      route: "/talklish/wednesday" },
  { key: "fri", label: "금요일", sub: "Free Talk", route: "/talklish/friday" },
];

interface MastheadProps {
  day: DayKey;
  sessionNo: number;
  dateLabel: string;
}

export function Masthead({
  day,
  sessionNo,
  dateLabel,
}: MastheadProps) {
  const current = DAYS.find((d) => d.key === day);

  return (
    <div
      className="relative flex flex-wrap items-center gap-x-7 gap-y-3 px-6 py-5 sm:px-12"
      style={{
        background: TLK.bg,
        borderBottom: `1px solid ${TLK.ruleHi}`,
        fontFamily: TLK_FONT.ko,
        color: TLK.ink,
      }}
    >
      {/* 워드마크 — 클릭 시 진입 페이지 복귀 */}
      <Link
        href="/talklish"
        title="요일 선택으로 돌아가기"
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <div
          style={{
            fontFamily: TLK_FONT.serif,
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: 38,
            letterSpacing: -1.2,
            lineHeight: 1,
          }}
        >
          Talklish<span style={{ color: TLK.accent }}>.</span>
        </div>
        <div
          style={{
            fontFamily: TLK_FONT.sans,
            fontWeight: 600,
            fontSize: 10.5,
            letterSpacing: 2.5,
            color: TLK.inkDim,
            textTransform: "uppercase",
            marginTop: 4,
          }}
        >
          오프라인 영어 스터디 · No. {sessionNo}
        </div>
      </Link>

      <div className="hidden flex-1 sm:block" />

      {/* 현재 요일 — 단일 정적 표시 (탭 이동 없음) */}
      {current && (
        <div className="text-center">
          <div style={{ fontFamily: TLK_FONT.sans, fontWeight: 600, fontSize: 16, color: TLK.ink }}>
            {current.label}
          </div>
          <div
            style={{
              fontFamily: TLK_FONT.serif,
              fontStyle: "italic",
              fontSize: 12,
              fontWeight: 400,
              letterSpacing: 0.5,
              color: TLK.inkDim,
              marginTop: 2,
            }}
          >
            {current.sub}
          </div>
        </div>
      )}

      <div className="hidden flex-1 sm:block" />

      <div className="hidden h-11 w-px sm:block" style={{ background: TLK.rule }} />

      {/* VOL / 날짜 — 우측 */}
      <div style={{ textAlign: "right" }}>
        <div
          style={{
            fontFamily: TLK_FONT.sans,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 1.5,
            color: TLK.inkFaint,
          }}
        >
          VOL. {sessionNo}
        </div>
        <div
          style={{
            fontFamily: TLK_FONT.serif,
            fontStyle: "italic",
            fontSize: 16,
            marginTop: 2,
          }}
        >
          {dateLabel}
        </div>
      </div>
    </div>
  );
}
