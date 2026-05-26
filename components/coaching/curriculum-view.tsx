"use client";

// 오픽 IH 안정화 4주 커리큘럼 뷰
//   히어로 + 약점 매핑 + IH 4기둥 + 주차 탭 + Day 카드 + 부록(접이식)

import { useState } from "react";
import {
  Target,
  CalendarDays,
  Repeat,
  Lightbulb,
  Sparkles,
  CheckCircle2,
  BookOpen,
  Wrench,
  ClipboardCheck,
  ChevronDown,
} from "lucide-react";
import {
  CURRICULUM_META,
  WEAKNESS_MAP,
  IH_PILLARS,
  CURRICULUM_WEEKS,
  APPENDIX_EXPRESSIONS,
  APPENDIX_TOOLS,
  APPENDIX_CHECKLIST,
  type CurriculumDay,
} from "@/lib/data/coaching-curriculum";

export function CurriculumView() {
  const [activeWeek, setActiveWeek] = useState(1);
  const week = CURRICULUM_WEEKS.find((w) => w.week === activeWeek) ?? CURRICULUM_WEEKS[0];

  return (
    <div className="mx-auto max-w-3xl">
      {/* ── 히어로 ── */}
      <section className="rounded-2xl border border-primary-200 bg-primary-50/40 p-5 sm:p-7">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-3 py-1 text-xs font-medium text-white">
          <Sparkles className="h-3.5 w-3.5" />
          맞춤 커리큘럼
        </div>
        <h1 className="mt-3 text-xl font-bold leading-snug text-foreground sm:text-2xl">
          {CURRICULUM_META.title}
        </h1>
        <p className="mt-1 text-sm text-foreground-secondary">{CURRICULUM_META.subtitle}</p>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
          <MetaChip
            icon={<Target className="h-4 w-4" />}
            label={CURRICULUM_META.goalLabel}
            value={CURRICULUM_META.goal}
          />
          <MetaChip
            icon={<CalendarDays className="h-4 w-4" />}
            label={CURRICULUM_META.periodLabel}
            value={CURRICULUM_META.period}
          />
          <MetaChip
            icon={<Repeat className="h-4 w-4" />}
            label={CURRICULUM_META.routineLabel}
            value={CURRICULUM_META.routine}
          />
        </div>

        {/* 통암기 금지 원칙 */}
        <div className="mt-4 flex gap-3 rounded-xl border border-border bg-surface p-3.5">
          <Lightbulb className="h-5 w-5 shrink-0 text-accent-500" />
          <div>
            <p className="text-sm font-semibold text-foreground">{CURRICULUM_META.principleTitle}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-foreground-secondary">
              {CURRICULUM_META.principle}
            </p>
          </div>
        </div>
      </section>

      {/* ── 왜 이 순서인가: 약점 매핑 + IH 4기둥 ── */}
      <section className="mt-6">
        <h2 className="mb-3 text-base font-bold text-foreground sm:text-lg">
          왜 이 순서인가
        </h2>

        {/* SAIL 약점 → 강의 처방 */}
        <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <p className="text-sm font-semibold text-foreground">SAIL 약점 → 강의 처방</p>
          <p className="mt-0.5 text-xs text-foreground-secondary">
            네 리포트가 짚은 약점을 1주차부터 그대로 교정한다
          </p>
          <div className="mt-3 space-y-2">
            {WEAKNESS_MAP.map((w) => (
              <div
                key={w.sail}
                className="flex flex-col gap-1.5 rounded-xl bg-surface-secondary p-3 sm:flex-row sm:items-center sm:gap-3"
              >
                <span className="shrink-0 text-sm font-semibold text-foreground sm:w-36">
                  {w.sail}
                </span>
                <span className="flex-1 text-sm text-primary-700">{w.fix}</span>
                <span className="shrink-0 rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-600">
                  {w.where}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* IH 4기둥 */}
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {IH_PILLARS.map((p, i) => (
            <div key={p.title} className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white">
                  {i + 1}
                </span>
                <p className="text-sm font-semibold text-foreground">{p.title}</p>
                <span className="ml-auto text-xs font-medium text-primary-600">{p.week}</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-foreground-secondary">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 주차 탭 ── */}
      <section className="mt-8">
        <div className="flex gap-1.5 overflow-x-auto pb-1 max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden">
          {CURRICULUM_WEEKS.map((w) => (
            <button
              key={w.week}
              type="button"
              onClick={() => setActiveWeek(w.week)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeWeek === w.week
                  ? "bg-primary-500 text-white"
                  : "bg-surface-secondary text-foreground-secondary hover:bg-primary-50 hover:text-primary-600"
              }`}
            >
              {w.week}주차
            </button>
          ))}
        </div>

        {/* 선택된 주차 헤더 */}
        <div className="mt-4 rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-bold text-primary-500">WEEK {week.week}</span>
          </div>
          <h3 className="mt-0.5 text-lg font-bold text-foreground">{week.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-foreground-secondary">{week.goal}</p>
        </div>

        {/* Day 카드 */}
        <div className="mt-3 space-y-3">
          {week.days.map((d) => (
            <DayCard key={d.day} day={d} />
          ))}
        </div>
      </section>

      {/* ── 부록 ── */}
      <section className="mt-8">
        <h2 className="mb-3 text-base font-bold text-foreground sm:text-lg">부록</h2>
        <div className="space-y-3">
          <Accordion
            icon={<BookOpen className="h-4 w-4" />}
            title="A. 강사 만능 표현집"
            defaultOpen
          >
            <div className="space-y-3">
              {APPENDIX_EXPRESSIONS.map((g) => (
                <div key={g.group}>
                  <p className="text-sm font-semibold text-foreground">{g.group}</p>
                  <ul className="mt-1.5 space-y-1">
                    {g.items.map((it, i) => (
                      <li
                        key={i}
                        className="rounded-lg bg-surface-secondary px-3 py-2 text-xs leading-relaxed text-foreground-secondary"
                      >
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Accordion>

          <Accordion icon={<Wrench className="h-4 w-4" />} title="B. 매일 쓰는 학습 도구">
            <ul className="space-y-1.5">
              {APPENDIX_TOOLS.map((t, i) => (
                <li key={i} className="flex gap-2 text-sm text-foreground-secondary">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-400" />
                  <span className="leading-relaxed">{t}</span>
                </li>
              ))}
            </ul>
          </Accordion>

          <Accordion
            icon={<ClipboardCheck className="h-4 w-4" />}
            title="C. SAIL 약점 자가진단 체크리스트"
          >
            <p className="mb-2 text-xs text-foreground-secondary">
              매주 녹음 후 체크 — 틀린 개수가 줄어드는지 주차별로 기록
            </p>
            <div className="space-y-1.5">
              {APPENDIX_CHECKLIST.map((c) => (
                <div
                  key={c.item}
                  className="flex items-center gap-3 rounded-lg bg-surface-secondary px-3 py-2"
                >
                  <span className="shrink-0 text-sm font-semibold text-foreground">{c.item}</span>
                  <span className="text-xs text-foreground-secondary">{c.point}</span>
                </div>
              ))}
            </div>
          </Accordion>
        </div>
      </section>

      <p className="mt-8 text-center text-xs text-foreground-muted">
        “실수를 줄이는 것만큼 IH 안정화에 중요한 것은 없다.” — 강사
      </p>
    </div>
  );
}

// ── 히어로 메타 칩 ──
function MetaChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center gap-1.5 text-primary-500">
        {icon}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-foreground-secondary">{value}</p>
    </div>
  );
}

// ── Day 카드 ──
function DayCard({ day }: { day: CurriculumDay }) {
  return (
    <div
      className={`rounded-2xl border bg-surface p-4 sm:p-5 ${
        day.star ? "border-primary-200" : "border-border"
      }`}
    >
      {/* 헤더 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-lg bg-primary-500 px-2.5 py-1 text-xs font-bold text-white">
          Day {day.day}
        </span>
        {day.star && <Sparkles className="h-4 w-4 text-primary-500" />}
        <h4 className="text-sm font-bold text-foreground sm:text-base">{day.title}</h4>
      </div>

      {/* 메타 칩 (강의 / SAIL) */}
      {(day.lecture || day.sailTag) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {day.lecture && (
            <span className="rounded-full bg-surface-secondary px-2.5 py-0.5 text-xs text-foreground-secondary">
              {day.lecture}
            </span>
          )}
          {day.sailTag && (
            <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700">
              SAIL · {day.sailTag}
            </span>
          )}
        </div>
      )}

      {/* 개념 */}
      <p className="mt-3 text-sm leading-relaxed text-foreground-secondary">{day.concept}</p>

      {/* 암기 표현 */}
      {day.expressions && day.expressions.length > 0 && (
        <div className="mt-3 space-y-1.5 rounded-xl bg-surface-secondary p-3">
          <p className="text-xs font-semibold text-foreground-muted">암기 표현</p>
          {day.expressions.map((e, i) => (
            <div key={i}>
              <p className="text-sm font-medium text-foreground">{e.en}</p>
              {e.note && <p className="text-xs text-foreground-muted">{e.note}</p>}
            </div>
          ))}
        </div>
      )}

      {/* 오늘의 액션 */}
      <ul className="mt-3 space-y-1.5">
        {day.actions.map((a, i) => (
          <li key={i} className="flex gap-2 text-sm text-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
            <span className="leading-relaxed">{a}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── 접이식 부록 섹션 ──
function Accordion({
  icon,
  title,
  defaultOpen = false,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 p-4 text-left transition-colors hover:bg-surface-secondary"
      >
        <span className="text-primary-500">{icon}</span>
        <span className="flex-1 text-sm font-semibold text-foreground">{title}</span>
        <ChevronDown
          className={`h-4 w-4 text-foreground-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="border-t border-border p-4">{children}</div>}
    </div>
  );
}
