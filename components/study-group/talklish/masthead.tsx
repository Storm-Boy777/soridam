"use client";

// Talklish · Editorial Studio 매스트헤드
// 워드마크 + VOL + 요일 탭 + 큰 세리프 타이머 + PAUSE
//
// 요일 탭은 라우트 기반 (월/수/금 페이지로 이동). 진입 페이지(/study-group)로 돌아가는
// "스튜디오" 워드마크 링크 포함.

import Link from "next/link";
import { TLK, TLK_FONT } from "./tokens";

export type DayKey = "mon" | "wed" | "fri";

const DAYS: { key: DayKey; label: string; sub: string; route: string }[] = [
  { key: "mon", label: "월요일", sub: "Podcast",   route: "/study-group/monday" },
  { key: "wed", label: "수요일", sub: "OPIc",      route: "/study-group/wednesday" },
  { key: "fri", label: "금요일", sub: "Free Talk", route: "/study-group/friday" },
];

interface MastheadProps {
  day: DayKey;
  elapsed: number;            // 초
  running: boolean;
  onToggleRunning: () => void;
  sessionNo: number;
  dateLabel: string;
}

const TOTAL = 60 * 60;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function Masthead({
  day,
  elapsed,
  running,
  onToggleRunning,
  sessionNo,
  dateLabel,
}: MastheadProps) {
  const remain = Math.max(0, TOTAL - elapsed);
  const mm = pad(Math.floor(remain / 60));
  const ss = pad(remain % 60);
  const pct = Math.min(1, elapsed / TOTAL);

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
        href="/study-group"
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

      <div className="hidden h-11 w-px sm:block" style={{ background: TLK.rule }} />

      {/* Vol */}
      <div>
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

      <div className="hidden flex-1 sm:block" />

      {/* 요일 탭 — 라우트 기반 (active = 현재 day) */}
      <div className="flex items-end" style={{ marginBottom: -19 }}>
        {DAYS.map((d) => {
          const active = day === d.key;
          return (
            <Link
              key={d.key}
              href={d.route}
              className="cursor-pointer transition-all"
              style={{
                background: "transparent",
                border: 0,
                paddingTop: 8,
                paddingBottom: 18,
                paddingLeft: 18,
                paddingRight: 18,
                borderBottom: `3px solid ${active ? TLK.accent : "transparent"}`,
                color: active ? TLK.ink : TLK.inkFaint,
                fontFamily: TLK_FONT.sans,
                fontWeight: 600,
                textAlign: "center",
                textDecoration: "none",
              }}
            >
              <div style={{ fontSize: 14, marginBottom: 2 }}>{d.label}</div>
              <div
                style={{
                  fontFamily: TLK_FONT.serif,
                  fontSize: 11,
                  fontStyle: "italic",
                  fontWeight: 400,
                  letterSpacing: 0.5,
                }}
              >
                {d.sub}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="hidden h-11 w-px sm:block" style={{ background: TLK.rule, marginLeft: 8 }} />

      {/* 타이머 */}
      <div className="ml-auto sm:ml-0" style={{ textAlign: "right" }}>
        <div
          style={{
            fontFamily: TLK_FONT.serif,
            fontSize: 36,
            fontWeight: 500,
            letterSpacing: -1,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {mm}
          <span style={{ color: TLK.accent }}>:</span>
          {ss}
        </div>
        <div
          className="mt-1.5 flex items-center justify-end gap-2"
        >
          <div
            style={{
              width: 96,
              height: 3,
              background: TLK.rule,
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${pct * 100}%`,
                height: "100%",
                background: TLK.accent,
                borderRadius: 2,
                transition: "width .5s",
              }}
            />
          </div>
          <button
            onClick={onToggleRunning}
            style={{
              fontFamily: TLK_FONT.sans,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 2,
              color: TLK.inkDim,
              background: "transparent",
              border: 0,
              cursor: "pointer",
              padding: 0,
            }}
          >
            {running ? "PAUSE" : "RESUME"}
          </button>
        </div>
      </div>
    </div>
  );
}
