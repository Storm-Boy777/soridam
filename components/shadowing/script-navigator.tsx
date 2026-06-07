"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ArrowRight, Layers, Play, Coffee, Clapperboard, Lightbulb } from "lucide-react";
import type { ScriptListItem } from "@/lib/types/scripts";
import { QUESTION_TYPE_LABELS, QUESTION_TYPE_COLORS } from "@/lib/types/reviews";

// 카테고리 아이콘 (scripts 목록 탭과 동일 매핑)
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  일반: Coffee,
  롤플레이: Clapperboard,
  어드밴스: Lightbulb,
};

// ── 추천 정렬: 같은 주제 → 같은 카테고리 → 그 외 ──
export function orderNextScripts(
  list: ScriptListItem[],
  currentScriptId: string,
  currentTopic: string | null,
  currentCategory: string | null,
): ScriptListItem[] {
  const others = list.filter((s) => s.id !== currentScriptId && s.package);
  const sameTopic = others.filter((s) => s.topic && s.topic === currentTopic);
  const sameCat = others.filter(
    (s) => s.topic !== currentTopic && s.category && s.category === currentCategory,
  );
  const rest = others.filter(
    (s) => s.topic !== currentTopic && s.category !== currentCategory,
  );
  return [...sameTopic, ...sameCat, ...rest];
}

// ── 카테고리 → 주제 2단계 그룹핑 (전환 드롭다운용) ──
const CATEGORY_ORDER = ["일반", "롤플레이", "어드밴스"];

interface TopicGroup {
  topic: string;
  items: ScriptListItem[];
}
interface CategoryGroup {
  category: string;
  total: number;
  topics: TopicGroup[];
}

export function groupScriptsByCategoryTopic(
  list: ScriptListItem[],
  currentScriptId: string,
  currentTopic: string | null,
  currentCategory: string | null,
): CategoryGroup[] {
  const others = list.filter((s) => s.id !== currentScriptId && s.package);

  // category → topic → items
  const catMap = new Map<string, Map<string, ScriptListItem[]>>();
  for (const s of others) {
    const cat = s.category || "기타";
    const topic = s.topic || "기타";
    if (!catMap.has(cat)) catMap.set(cat, new Map());
    const tMap = catMap.get(cat)!;
    if (!tMap.has(topic)) tMap.set(topic, []);
    tMap.get(topic)!.push(s);
  }

  const catRank = (cat: string) => {
    if (cat === currentCategory) return -1;
    const i = CATEGORY_ORDER.indexOf(cat);
    return i >= 0 ? i : 99;
  };

  const groups: CategoryGroup[] = [];
  for (const [category, tMap] of Array.from(catMap.entries())) {
    let total = 0;
    const topics: TopicGroup[] = [];
    for (const [topic, items] of Array.from(tMap.entries())) {
      // 주제 내 질문은 question_id(코드) 기준 정렬 → Q14 → Q15 식 정식 순서
      items.sort((a, b) => (a.question_id || "").localeCompare(b.question_id || ""));
      total += items.length;
      topics.push({ topic, items });
    }
    // 주제 정렬: 현재 주제 우선 → 개수 많은 순 → 가나다
    topics.sort((a, b) => {
      const ar = a.topic === currentTopic ? 0 : 1;
      const br = b.topic === currentTopic ? 0 : 1;
      if (ar !== br) return ar - br;
      if (b.items.length !== a.items.length) return b.items.length - a.items.length;
      return a.topic.localeCompare(b.topic, "ko");
    });
    groups.push({ category, total, topics });
  }
  groups.sort((a, b) => catRank(a.category) - catRank(b.category));
  return groups;
}

interface SwitchHandler {
  (packageId: string, scriptId: string): void;
}

// ════════════════════════════════════════════
// 상단 전환기 — 훈련 중 다른 질문으로 바로 점프
// ════════════════════════════════════════════
export function ScriptSwitcher({
  list,
  currentScriptId,
  currentTopic,
  currentCategory,
  onSwitch,
}: {
  list: ScriptListItem[];
  currentScriptId: string;
  currentTopic: string | null;
  currentCategory: string | null;
  onSwitch: SwitchHandler;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const groups = useMemo(
    () => groupScriptsByCategoryTopic(list, currentScriptId, currentTopic, currentCategory),
    [list, currentScriptId, currentTopic, currentCategory],
  );
  const totalCount = useMemo(
    () => groups.reduce((n, g) => n + g.total, 0),
    [groups],
  );

  // 바깥 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (totalCount === 0) return null;

  return (
    <div ref={wrapRef} className="relative flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2 sm:px-4">
      <div className="flex min-w-0 items-center gap-1.5 text-xs text-foreground-muted">
        <span className="shrink-0">지금 훈련 중</span>
        <span className="truncate font-medium text-foreground-secondary">
          {currentTopic || "현재 질문"}
        </span>
      </div>

      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary"
      >
        다른 질문
        <span className="text-foreground-muted">{totalCount}</span>
        <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-2 top-full z-30 mt-1 max-h-[60vh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-[var(--radius-xl)] border border-border bg-surface p-1.5 shadow-lg [scrollbar-width:thin]">
          {groups.map((g) => {
            const CatIcon = CATEGORY_ICONS[g.category];
            return (
            <div key={g.category} className="mb-3 last:mb-0">
              {/* 카테고리 헤더 — 아이콘 + 배경 밴드로 구분 강조 (스크롤 고정) */}
              <div className="sticky top-0 z-10 mb-1 flex items-center gap-1.5 rounded-md bg-surface-secondary px-2.5 py-1.5 text-xs font-bold text-foreground-secondary">
                {CatIcon && <CatIcon size={13} className="text-primary-500" />}
                {g.category}
                <span className="ml-auto text-[11px] font-medium text-foreground-muted">{g.total}</span>
              </div>

              {g.topics.map((t) => (
                <div key={t.topic} className="mb-0.5">
                  {/* 주제 서브헤더 */}
                  <div className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-foreground-secondary">
                    <span className="h-1 w-1 shrink-0 rounded-full bg-primary-300" />
                    {t.topic}
                    {t.items.length > 1 && (
                      <span className="font-normal text-foreground-muted">{t.items.length}</span>
                    )}
                  </div>

                  {t.items.map((s) => {
                    const typeLabel = s.question_type && QUESTION_TYPE_LABELS[s.question_type];
                    const primary = s.question_short || s.question_english || "질문";
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          if (s.package) onSwitch(s.package.id, s.id);
                          setOpen(false);
                        }}
                        className="flex w-full items-start gap-2 rounded-lg py-1.5 pl-4 pr-2 text-left transition-colors hover:bg-surface-secondary"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {typeLabel && (
                              <span
                                className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                  QUESTION_TYPE_COLORS[s.question_type!] ||
                                  "bg-surface-secondary text-foreground-secondary"
                                }`}
                              >
                                {typeLabel}
                              </span>
                            )}
                            <span className="truncate text-[13px] font-medium text-foreground">{primary}</span>
                          </div>
                          {s.question_short && s.question_english && (
                            <p className="mt-0.5 line-clamp-1 text-[11px] text-foreground-muted">
                              {s.question_english}
                            </p>
                          )}
                        </div>
                        <ArrowRight size={13} className="mt-1 shrink-0 text-foreground-muted" />
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════
// 하단 "다음 훈련" 카드 — 완료 후 이어서 연습 유도
// ════════════════════════════════════════════
export function NextTrainingCards({
  list,
  currentScriptId,
  currentTopic,
  currentCategory,
  onSwitch,
  limit = 4,
}: {
  list: ScriptListItem[];
  currentScriptId: string;
  currentTopic: string | null;
  currentCategory: string | null;
  onSwitch: SwitchHandler;
  limit?: number;
}) {
  const ordered = useMemo(
    () => orderNextScripts(list, currentScriptId, currentTopic, currentCategory).slice(0, limit),
    [list, currentScriptId, currentTopic, currentCategory, limit],
  );

  if (ordered.length === 0) return null;

  return (
    <div className="mt-6 rounded-[var(--radius-xl)] border border-border bg-surface p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Layers size={15} className="text-primary-500" />
        <h3 className="text-sm font-semibold text-foreground">다음 훈련</h3>
        <span className="text-xs text-foreground-muted">나가지 않고 이어서 연습해요</span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ordered.map((s) => {
          const typeLabel = s.question_type && QUESTION_TYPE_LABELS[s.question_type];
          return (
            <button
              key={s.id}
              onClick={() => {
                if (s.package) onSwitch(s.package.id, s.id);
              }}
              className="group flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-secondary/40 p-3 text-left transition-colors hover:border-primary-300 hover:bg-primary-50/40"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-medium text-foreground">{s.topic || "주제 없음"}</span>
                  {typeLabel && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                        QUESTION_TYPE_COLORS[s.question_type!] ||
                        "bg-surface-secondary text-foreground-secondary"
                      }`}
                    >
                      {typeLabel}
                    </span>
                  )}
                </div>
                {s.question_short && (
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-foreground-muted">{s.question_short}</p>
                )}
              </div>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white transition-transform group-hover:scale-105">
                <Play size={12} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
