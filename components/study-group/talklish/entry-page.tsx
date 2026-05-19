"use client";

// Talklish · 진입 페이지 (요일 선택)
// 매스트헤드(축약) + 월/수/금 카드 3개. 오늘 요일 자동 강조.
// 캐릭터 멤버 dot 줄로 그룹 정체성 노출.

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Headphones, Mic, MessagesSquare, Sparkles } from "lucide-react";
import { fetchPanelMembers } from "@/lib/actions/study-group";
import type { PanelMember } from "@/lib/types/study-group";
import { TLK, TLK_FONT } from "./tokens";

type DayKey = "mon" | "wed" | "fri";

interface DayDef {
  key: DayKey;
  weekday: number; // JS Date.getDay (0=일)
  label: string;     // "월요일"
  sub: string;       // "Podcast"
  intro: string;     // 짧은 한 줄 카피
  blurb: string;     // 카드 본문
  icon: typeof Headphones;
  picks: string[];   // 카드 하이라이트 칩
}

const DAYS: DayDef[] = [
  {
    key: "mon",
    weekday: 1,
    label: "월요일",
    sub: "Podcast",
    intro: "오늘은 영상 한 편을 골라 깊이 듣습니다",
    blurb: "EnglishPod 한 에피소드를 함께 듣고, 들은 내용을 나누고, 핵심 표현을 손에 넣는 60분.",
    icon: Headphones,
    picks: ["1차 청취", "내용 공유", "어휘·표현", "토론", "랩업"],
  },
  {
    key: "wed",
    weekday: 3,
    label: "수요일",
    sub: "OPIc",
    intro: "콤보 하나로 모의 시험을 함께 풀어봅니다",
    blurb: "기출 콤보 4문항을 룰렛으로 돌려가며 답하고, AI 코치 노트를 발판 삼아 같이 토론하는 60분.",
    icon: Mic,
    picks: ["콤보 선택", "발화자 룰렛", "답변", "코치 노트", "토론"],
  },
  {
    key: "fri",
    weekday: 5,
    label: "금요일",
    sub: "Free Talk",
    intro: "게임과 자유 토론으로 회로를 풀어줍니다",
    blurb: "자유 토픽 카드와 4종 게임(타부·이거 vs 저거·찬반·이어말하기)을 섞어 즐겁게 영어 회로를 굴리는 60분.",
    icon: MessagesSquare,
    picks: ["타부", "이거 vs 저거", "찬반 토론", "이어말하기", "Free Talk"],
  },
];

function getInitialDay(): DayKey {
  const d = new Date().getDay();
  if (d === 1 || d === 2) return "mon";
  if (d === 3 || d === 4) return "wed";
  if (d === 5 || d === 6 || d === 0) return "fri";
  return "mon";
}

function formatTodayLabel(): string {
  const now = new Date();
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${now.getMonth() + 1}월 ${now.getDate()}일 (${days[now.getDay()]})`;
}

export function TalklishEntryPage() {
  const today = useMemo(() => getInitialDay(), []);
  const dateLabel = useMemo(() => formatTodayLabel(), []);

  const { data: members = [] } = useQuery({
    queryKey: ["study-panel-members"],
    queryFn: fetchPanelMembers,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div
      className="flex min-h-dvh w-full flex-col"
      style={{ background: TLK.bg, color: TLK.ink, fontFamily: TLK_FONT.ko }}
    >
      {/* 좌상단 — 대시보드 복귀 */}
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
      </div>

      {/* 매스트헤드 (축약형 — 요일 탭/타이머 없이 워드마크 + 날짜만) */}
      <header
        className="relative flex flex-wrap items-end gap-x-7 gap-y-3 px-6 pb-6 pt-3 sm:px-12"
        style={{
          background: TLK.bg,
          borderBottom: `1px solid ${TLK.ruleHi}`,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: TLK_FONT.serif,
              fontStyle: "italic",
              fontWeight: 500,
              fontSize: 44,
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
              fontSize: 11,
              letterSpacing: 2.5,
              color: TLK.inkDim,
              textTransform: "uppercase",
              marginTop: 6,
            }}
          >
            오프라인 영어 스터디 · 매주 월·수·금
          </div>
        </div>

        <div className="hidden h-11 w-px sm:block" style={{ background: TLK.rule }} />

        <div>
          <div
            style={{
              fontFamily: TLK_FONT.sans,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1.5,
              color: TLK.inkFaint,
            }}
          >
            TODAY
          </div>
          <div
            style={{
              fontFamily: TLK_FONT.serif,
              fontStyle: "italic",
              fontSize: 18,
              marginTop: 2,
            }}
          >
            {dateLabel}
          </div>
        </div>

        <div className="hidden flex-1 sm:block" />

        {/* 패널 멤버 dot — 그룹 정체성 */}
        <MemberStrip members={members} />
      </header>

      {/* 본문 — 요일 카드 3개 */}
      <main
        className="flex-1 overflow-y-auto px-6 py-10 sm:px-12 sm:py-14"
        style={{ background: TLK.bg }}
      >
        <div className="mx-auto max-w-6xl">
          {/* 인트로 카피 */}
          <div className="mb-10 max-w-2xl">
            <p
              style={{
                fontFamily: TLK_FONT.sans,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 2.5,
                color: TLK.inkFaint,
                textTransform: "uppercase",
              }}
            >
              Today's Studio
            </p>
            <h1
              style={{
                fontFamily: TLK_FONT.serif,
                fontStyle: "italic",
                fontSize: 40,
                fontWeight: 500,
                color: TLK.ink,
                lineHeight: 1.15,
                marginTop: 8,
                letterSpacing: -0.5,
              }}
            >
              오늘 어떤 무대에서<br />같이 노실래요?
            </h1>
            <p
              style={{
                fontFamily: TLK_FONT.ko,
                fontSize: 14,
                color: TLK.inkDim,
                lineHeight: 1.7,
                marginTop: 12,
              }}
            >
              매주 월·수·금 60분. 요일마다 색다른 흐름으로 회로를 굴립니다. 오늘 요일은 카드가 빛납니다.
            </p>
          </div>

          {/* 요일 카드 그리드 */}
          <div className="grid gap-5 md:grid-cols-3">
            {DAYS.map((d) => (
              <DayCard key={d.key} day={d} isToday={d.key === today} />
            ))}
          </div>

          {/* 안내 캡션 */}
          <div className="mt-10 max-w-3xl">
            <p
              style={{
                fontFamily: TLK_FONT.sans,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1.5,
                color: TLK.inkFaint,
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              운영 안내
            </p>
            <p
              style={{
                fontFamily: TLK_FONT.ko,
                fontSize: 13,
                color: TLK.inkDim,
                lineHeight: 1.65,
              }}
            >
              · 모임은 큰 모니터에 페이지를 띄우고 진행해요. 마이크 권한이나 결제는 필요 없습니다.
              <br />· 화살표 ← → 로 단계 이동, R로 룰렛, F로 헤더 숨김(영상·자료 몰입). 진행자는 키보드만 손에 두면 충분해요.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── 카드 ──────────────────────────────────────

function DayCard({ day, isToday }: { day: DayDef; isToday: boolean }) {
  const Icon = day.icon;
  return (
    <Link
      href={`/study-group/${day.key === "mon" ? "monday" : day.key === "wed" ? "wednesday" : "friday"}`}
      className="group relative flex flex-col overflow-hidden rounded-3xl transition-all hover:-translate-y-0.5"
      style={{
        background: isToday ? TLK.paperHi : TLK.paper,
        border: `1px solid ${isToday ? TLK.accent : TLK.rule}`,
        boxShadow: isToday ? `0 18px 40px -22px ${TLK.accent}55` : "0 4px 14px -8px rgba(31,27,22,0.10)",
        textDecoration: "none",
        color: "inherit",
        minHeight: 360,
      }}
    >
      {/* 오늘 뱃지 */}
      {isToday && (
        <div
          className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full px-2.5 py-1"
          style={{
            background: TLK.accent,
            color: "#fff",
            fontFamily: TLK_FONT.sans,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 1.5,
          }}
        >
          <Sparkles size={11} />
          TODAY
        </div>
      )}

      {/* 상단 — 아이콘 + 요일 워드마크 */}
      <div className="px-7 pt-8">
        <div
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
          style={{
            background: isToday ? `${TLK.accent}14` : TLK.bg2,
            border: `1px solid ${isToday ? `${TLK.accent}44` : TLK.rule}`,
          }}
        >
          <Icon size={22} style={{ color: isToday ? TLK.accent : TLK.inkDim }} />
        </div>
        <p
          style={{
            fontFamily: TLK_FONT.serif,
            fontStyle: "italic",
            fontSize: 11,
            fontWeight: 500,
            color: TLK.inkFaint,
            letterSpacing: 0.5,
            marginBottom: 4,
          }}
        >
          {day.sub}
        </p>
        <h3
          style={{
            fontFamily: TLK_FONT.serif,
            fontStyle: "italic",
            fontSize: 38,
            fontWeight: 500,
            color: TLK.ink,
            lineHeight: 1,
            letterSpacing: -0.5,
          }}
        >
          {day.label}
        </h3>
        <p
          style={{
            fontFamily: TLK_FONT.ko,
            fontSize: 13,
            color: isToday ? TLK.ink : TLK.inkDim,
            lineHeight: 1.5,
            marginTop: 10,
          }}
        >
          {day.intro}
        </p>
      </div>

      {/* 본문 — 설명 */}
      <div
        className="mx-7 my-5 flex-1 rounded-xl px-5 py-4"
        style={{
          background: isToday ? TLK.bg2 : TLK.paperHi,
          border: `1px solid ${TLK.rule}`,
        }}
      >
        <p
          style={{
            fontFamily: TLK_FONT.ko,
            fontSize: 12.5,
            color: TLK.inkDim,
            lineHeight: 1.65,
          }}
        >
          {day.blurb}
        </p>

        {/* 단계 칩 */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {day.picks.map((p) => (
            <span
              key={p}
              className="rounded-full px-2 py-0.5"
              style={{
                background: isToday ? "transparent" : TLK.bg2,
                border: `1px solid ${TLK.rule}`,
                fontFamily: TLK_FONT.sans,
                fontSize: 10,
                fontWeight: 600,
                color: TLK.inkDim,
                letterSpacing: 0.3,
              }}
            >
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* 하단 — 진입 버튼 */}
      <div className="flex items-center justify-between px-7 pb-7">
        <p
          style={{
            fontFamily: TLK_FONT.sans,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: 1.5,
            color: TLK.inkFaint,
            textTransform: "uppercase",
          }}
        >
          무대로 입장
        </p>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full transition-all group-hover:translate-x-0.5"
          style={{
            background: isToday ? TLK.accent : TLK.ink,
            color: "#fff",
          }}
        >
          <ArrowRight size={16} />
        </div>
      </div>
    </Link>
  );
}

// ─── 멤버 strip ────────────────────────────

function MemberStrip({ members }: { members: PanelMember[] }) {
  if (members.length === 0) return null;
  return (
    <div className="flex items-center gap-2">
      <p
        style={{
          fontFamily: TLK_FONT.sans,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 1.5,
          color: TLK.inkFaint,
          textTransform: "uppercase",
        }}
      >
        Panel
      </p>
      <div className="flex -space-x-1.5">
        {members.slice(0, 6).map((m) => (
          <div
            key={m.id}
            title={m.name}
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{
              background: `${m.color}22`,
              border: `2px solid ${TLK.bg}`,
              boxShadow: `0 0 0 1.5px ${m.color}88`,
              fontSize: 18,
            }}
          >
            {m.emoji}
          </div>
        ))}
        {members.length > 6 && (
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{
              background: TLK.paper,
              border: `2px solid ${TLK.bg}`,
              boxShadow: `0 0 0 1.5px ${TLK.rule}`,
              fontFamily: TLK_FONT.sans,
              fontSize: 11,
              fontWeight: 700,
              color: TLK.inkDim,
            }}
          >
            +{members.length - 6}
          </div>
        )}
      </div>
    </div>
  );
}
