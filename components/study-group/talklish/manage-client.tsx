"use client";

// Talklish · 스터디 준비 콘솔 — 좌측 월/수/금 사이드바 + 우측 요일별 자료 생성
// 멤버(study_panel_members)가 직접 수업 자료를 만들 수 있다 (관리자 결석 대비).

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Headphones, Mic, MessagesSquare, Construction } from "lucide-react";
import { TLK, TLK_FONT } from "./tokens";
import { MondayPrepare } from "./monday-prepare";
import { FridayPrepare } from "./friday-prepare";

type DayKey = "mon" | "wed" | "fri";

const DAYS: { key: DayKey; label: string; sub: string; icon: typeof Headphones; ready: boolean }[] = [
  { key: "mon", label: "월요일", sub: "Podcast", icon: Headphones, ready: true },
  { key: "wed", label: "수요일", sub: "OPIc", icon: Mic, ready: false },
  { key: "fri", label: "금요일", sub: "Free Talk", icon: MessagesSquare, ready: true },
];

export function TalklishManageClient() {
  const [day, setDay] = useState<DayKey>("mon");
  const current = DAYS.find((d) => d.key === day)!;

  return (
    <div
      className="flex h-dvh w-full overflow-hidden"
      style={{ background: TLK.bg, color: TLK.ink, fontFamily: TLK_FONT.ko }}
    >
      {/* 좌측 사이드바 */}
      <aside
        className="flex w-56 shrink-0 flex-col border-r sm:w-64"
        style={{ borderColor: TLK.rule, background: TLK.paper }}
      >
        <div className="px-5 pb-4 pt-5">
          <Link
            href="/talklish"
            className="inline-flex items-center gap-1 text-[11px] font-medium"
            style={{ color: TLK.inkFaint, fontFamily: TLK_FONT.sans }}
          >
            <ArrowLeft size={12} /> 스터디로
          </Link>
          <h1
            style={{
              fontFamily: TLK_FONT.serif,
              fontStyle: "italic",
              fontSize: 26,
              fontWeight: 500,
              color: TLK.ink,
              marginTop: 10,
              letterSpacing: -0.5,
            }}
          >
            스터디 준비
          </h1>
          <p style={{ fontFamily: TLK_FONT.sans, fontSize: 11, color: TLK.inkFaint, marginTop: 2 }}>
            요일별 수업 자료 만들기
          </p>
        </div>

        <nav className="flex flex-col gap-1 px-3">
          {DAYS.map((d) => {
            const active = d.key === day;
            const Icon = d.icon;
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => setDay(d.key)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors"
                style={{
                  background: active ? TLK.bg2 : "transparent",
                  border: `1px solid ${active ? TLK.ruleHi : "transparent"}`,
                  cursor: "pointer",
                }}
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{
                    background: active ? `${TLK.accent}14` : TLK.bg2,
                    border: `1px solid ${active ? `${TLK.accent}44` : TLK.rule}`,
                  }}
                >
                  <Icon size={15} style={{ color: active ? TLK.accent : TLK.inkDim }} />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className="block"
                    style={{ fontFamily: TLK_FONT.sans, fontSize: 13, fontWeight: 700, color: active ? TLK.ink : TLK.inkDim }}
                  >
                    {d.label}
                  </span>
                  <span style={{ fontFamily: TLK_FONT.sans, fontSize: 10.5, color: TLK.inkFaint }}>
                    {d.sub}
                    {!d.ready && " · 준비 중"}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto px-5 pb-5">
          <p style={{ fontFamily: TLK_FONT.ko, fontSize: 11, color: TLK.inkFaint, lineHeight: 1.6 }}>
            만든 자료는 해당 요일 스터디에서 바로 쓸 수 있어요.
          </p>
        </div>
      </aside>

      {/* 우측 콘텐츠 */}
      <main className="relative min-w-0 flex-1">
        <div className="absolute inset-0 overflow-y-auto">
          {day === "mon" ? <MondayPrepare /> : day === "fri" ? <FridayPrepare /> : <ComingSoon label={current.label} sub={current.sub} />}
        </div>
      </main>
    </div>
  );
}

function ComingSoon({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <Construction size={38} style={{ color: TLK.inkFaint }} />
      <p style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 24, color: TLK.inkDim, marginTop: 16 }}>
        {label} · {sub}
      </p>
      <p style={{ fontFamily: TLK_FONT.sans, fontSize: 13, color: TLK.inkFaint, marginTop: 6 }}>
        AI 자료 생성 기능을 준비 중이에요
      </p>
    </div>
  );
}
