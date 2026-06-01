"use client";

// 시제 만능 아크 — 1편 뷰어
//   시간축 비트를 순서대로 보여주고, 한글(기본 숨김)·해설(기본 표시)을 토글.
//   ⭐ 사건 비트 강조. 상·하단 "다음 주제" 버튼 — 목록으로 안 돌아가고 바로 다음 도메인으로.

import { useEffect, useRef } from "react";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Languages,
  Lightbulb,
  Repeat2,
  Star,
} from "lucide-react";
import type { TenseNarrative } from "@/lib/types/tense";

interface Props {
  n: TenseNarrative;
  index: number;
  total: number;
  prevDomain: string | null;
  nextDomain: string | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  isDone: boolean;
  onToggleDone: () => void;
  showKo: boolean;
  showNote: boolean;
  onToggleKo: () => void;
  onToggleNote: () => void;
}

export function TenseNarrativeView({
  n,
  index,
  total,
  prevDomain,
  nextDomain,
  onClose,
  onPrev,
  onNext,
  isDone,
  onToggleDone,
  showKo,
  showNote,
  onToggleKo,
  onToggleNote,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  // 주제 이동 시 새 이야기의 맨 위로 (key 변경으로 remount되며 매번 실행)
  useEffect(() => {
    rootRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
  }, []);

  return (
    <div ref={rootRef} className="space-y-4">
      {/* 상단 바 */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary"
        >
          <ArrowLeft className="h-4 w-4" /> 목록
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleDone}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              isDone
                ? "bg-green-100 text-green-700"
                : "bg-surface-secondary text-foreground-muted hover:text-foreground-secondary"
            }`}
          >
            <Check className="h-3.5 w-3.5" /> {isDone ? "익힘" : "익힘 표시"}
          </button>
          {nextDomain && (
            <button
              type="button"
              onClick={onNext}
              className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 transition-colors hover:bg-primary-100"
            >
              다음 주제 <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 타이틀 카드 */}
      <div className="rounded-2xl border border-border bg-surface p-5">
        <span className="inline-block rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
          {n.domain}
        </span>
        <h3 className="mt-2 text-lg font-bold text-foreground">{n.title}</h3>
        <p className="mt-0.5 text-sm text-foreground-secondary">{n.hook}</p>

        {/* 등장 시제 배지 */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {n.tenses.map((t) => (
            <span
              key={t}
              className="rounded-md bg-surface-secondary px-2 py-0.5 text-[11px] font-medium text-foreground-secondary"
            >
              {t}
            </span>
          ))}
        </div>

        {/* 재활용 — 이 이야기로 답할 수 있는 질문 */}
        <div className="mt-4 rounded-xl bg-surface-secondary/60 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground-secondary">
            <Repeat2 className="h-3.5 w-3.5" /> 이 이야기 하나로 답할 수 있는 질문
          </p>
          <ul className="mt-1.5 space-y-1">
            {n.covers.map((c) => (
              <li key={c} className="text-xs leading-relaxed text-foreground-secondary">
                · {c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 토글 */}
      <div className="flex items-center gap-2">
        <TogglePill
          active={showKo}
          onClick={onToggleKo}
          icon={<Languages className="h-3.5 w-3.5" />}
          label="한글"
        />
        <TogglePill
          active={showNote}
          onClick={onToggleNote}
          icon={<Lightbulb className="h-3.5 w-3.5" />}
          label="해설"
        />
      </div>

      {/* 시간축 비트 */}
      <div className="space-y-3">
        {n.beats.map((b, i) => (
          <div
            key={i}
            className={`rounded-2xl border bg-surface p-4 sm:p-5 ${
              b.incident ? "border-accent-500/40 ring-1 ring-accent-500/20" : "border-border"
            }`}
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-foreground">{b.beat}</span>
              <span className="rounded-md bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary-700">
                {b.tense}
              </span>
              {b.incident && (
                <span className="inline-flex items-center gap-1 rounded-md bg-accent-500/10 px-2 py-0.5 text-[11px] font-bold text-accent-500">
                  <Star className="h-3 w-3 fill-current" /> 사건 만능
                </span>
              )}
            </div>
            <p className="text-[15px] leading-relaxed text-foreground sm:text-base">{b.en}</p>
            {showKo && (
              <p className="mt-2 text-sm leading-relaxed text-foreground-muted">{b.ko}</p>
            )}
            {showNote && (
              <div className="mt-3 space-y-1.5 rounded-xl bg-primary-50/50 p-3">
                <p className="text-xs leading-relaxed text-foreground-secondary">
                  <span className="font-semibold text-primary-700">왜 이 시제 · </span>
                  {b.why}
                </p>
                <p className="text-xs leading-relaxed text-foreground-secondary">
                  <span className="font-semibold text-primary-700">역할 · </span>
                  {b.role}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 하단 네비 — 다음 주제로 바로 이동 */}
      <div className="space-y-2 pt-2">
        <p className="text-center text-xs text-foreground-muted">
          {index + 1} / {total}
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onPrev}
            disabled={!prevDomain}
            className="inline-flex shrink-0 items-center gap-1 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> 이전
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!nextDomain}
            className="inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:bg-surface-secondary disabled:text-foreground-muted"
          >
            <span className="truncate">
              {nextDomain ? `다음 주제 · ${nextDomain}` : "마지막 주제예요"}
            </span>
            {nextDomain && <ChevronRight className="h-4 w-4 shrink-0" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function TogglePill({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-primary-300 bg-primary-50 text-primary-700"
          : "border-border bg-surface text-foreground-muted hover:text-foreground-secondary"
      }`}
    >
      {icon}
      {label}
      <span className={`text-[10px] ${active ? "text-primary-500" : "text-foreground-muted"}`}>
        {active ? "ON" : "OFF"}
      </span>
    </button>
  );
}
