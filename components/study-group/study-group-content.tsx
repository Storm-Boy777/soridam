"use client";

import { useState } from "react";
import { Headphones, BookOpen, MessageCircle, ChevronLeft, type LucideIcon } from "lucide-react";
import { SessionTimer } from "./session-timer";
import { PodcastTab } from "./monday/podcast-tab";
import { OpicTab } from "./wednesday/opic-tab";
import { FreetalkTab } from "./friday/freetalk-tab";

/* ── 스터디 옵션 ── */

type StudyDay = "monday" | "wednesday" | "friday";

interface StudyOption {
  id: StudyDay;
  day: string;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

const studyOptions: StudyOption[] = [
  {
    id: "monday",
    day: "월요일",
    label: "팟캐스트 스터디",
    description: "영어 팟캐스트를 듣고 핵심 표현 리뷰 + 토론",
    icon: Headphones,
    color: "text-violet-600",
    bgColor: "bg-violet-50 border-violet-200 hover:border-violet-400",
  },
  {
    id: "wednesday",
    day: "수요일",
    label: "OPIc 토픽 연습",
    description: "소리담 질문 DB에서 토픽별 집중 답변 연습",
    icon: BookOpen,
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200 hover:border-blue-400",
  },
  {
    id: "friday",
    day: "금요일",
    label: "프리토킹 + 게임",
    description: "랜덤 토론 주제 + 영어 말하기 게임 5종",
    icon: MessageCircle,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 border-emerald-200 hover:border-emerald-400",
  },
];

/* ── 메인 컴포넌트 ── */

export function StudyGroupContent() {
  const [selectedDay, setSelectedDay] = useState<StudyDay | null>(null);

  // 선택 전: 스터디 선택 화면
  if (!selectedDay) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-primary-100 bg-primary-50/50 p-4">
          <p className="text-sm text-primary-700">
            오늘 진행할 스터디를 선택하세요. 선택하면 바로 스터디가 시작됩니다!
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {studyOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setSelectedDay(option.id)}
              className={`group rounded-2xl border-2 p-6 text-left transition-all ${option.bgColor}`}
            >
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm ${option.color}`}>
                <option.icon size={24} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                {option.day}
              </p>
              <h3 className="mt-1 text-lg font-bold text-foreground">{option.label}</h3>
              <p className="mt-2 text-sm text-foreground-secondary leading-relaxed">
                {option.description}
              </p>
              <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-primary-600 opacity-0 transition-opacity group-hover:opacity-100">
                시작하기 →
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 선택 후: 세션 타이머 + 해당 스터디 콘텐츠만 표시
  const current = studyOptions.find((o) => o.id === selectedDay)!;

  return (
    <div>
      {/* 상단: 스터디 선택 복귀 + 현재 스터디 표시 + 세션 타이머 */}
      <div className="mb-4 flex items-center justify-between gap-3 sm:mb-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            onClick={() => setSelectedDay(null)}
            className="flex shrink-0 items-center gap-1 text-sm text-foreground-muted transition-colors hover:text-foreground-secondary"
          >
            <ChevronLeft size={16} /> 스터디 선택
          </button>
          <span className="hidden shrink-0 text-foreground-muted sm:inline">·</span>
          <div className="hidden min-w-0 items-center gap-2 sm:flex">
            <current.icon size={16} className={`shrink-0 ${current.color}`} />
            <span className="truncate text-sm font-semibold text-foreground">{current.day} — {current.label}</span>
          </div>
        </div>
        <SessionTimer />
      </div>

      {/* 스터디 콘텐츠 */}
      {selectedDay === "monday" && <PodcastTab />}
      {selectedDay === "wednesday" && <OpicTab />}
      {selectedDay === "friday" && <FreetalkTab />}
    </div>
  );
}
