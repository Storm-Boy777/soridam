"use client";

import { useMemo } from "react";
import { Check } from "lucide-react";
import type { ListenTrack } from "@/lib/actions/scripts";
import { useListenSettings } from "@/lib/stores/listen";
import { QUESTION_TYPE_LABELS } from "@/lib/types/reviews";

const CATEGORY_ORDER = ["일반", "롤플레이", "어드밴스"];

// 유형 표시 순서 (묘사 → 루틴 → 비교 → 경험3종 → 질문하기 → 대안제시 → 비교·변화 → 사회이슈)
const QUESTION_TYPE_ORDER = [
  "description",
  "routine",
  "comparison",
  "past_childhood",
  "past_recent",
  "past_special",
  "rp_11",
  "rp_12",
  "adv_14",
  "adv_15",
];

export function ListenSettings({
  tracks,
  queueCount,
}: {
  tracks: ListenTrack[];
  queueCount: number;
}) {
  const s = useListenSettings();
  const { update } = s;

  // 사용 가능한 유형 / 카테고리 / 주제
  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    for (const t of tracks) if (t.questionType) set.add(t.questionType);
    return Array.from(set).sort((a, b) => {
      const ia = QUESTION_TYPE_ORDER.indexOf(a);
      const ib = QUESTION_TYPE_ORDER.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
  }, [tracks]);

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    for (const t of tracks) if (t.category) set.add(t.category);
    return CATEGORY_ORDER.filter((c) => set.has(c)).concat(
      Array.from(set).filter((c) => !CATEGORY_ORDER.includes(c)),
    );
  }, [tracks]);

  const topicsOfCategory = useMemo(() => {
    if (!s.selectedCategory) return [] as string[];
    const set = new Set<string>();
    for (const t of tracks) if (t.category === s.selectedCategory && t.topic) set.add(t.topic);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ko"));
  }, [tracks, s.selectedCategory]);

  // 모드 전환 시 합리적 기본 선택
  function setFilterMode(mode: "all" | "type" | "topic") {
    if (mode === "type") {
      update({ filterMode: "type", selectedType: s.selectedType ?? availableTypes[0] ?? null });
    } else if (mode === "topic") {
      const cat = s.selectedCategory ?? availableCategories[0] ?? null;
      let topic = s.selectedTopic;
      if (cat) {
        const topics = tracks
          .filter((t) => t.category === cat && t.topic)
          .map((t) => t.topic as string);
        if (!topic || !topics.includes(topic)) topic = topics[0] ?? null;
      }
      update({ filterMode: "topic", selectedCategory: cat, selectedTopic: topic });
    } else {
      update({ filterMode: "all" });
    }
  }

  function pickCategory(cat: string) {
    const topics = tracks
      .filter((t) => t.category === cat && t.topic)
      .map((t) => t.topic as string);
    update({ selectedCategory: cat, selectedTopic: topics[0] ?? null });
  }

  // 세그먼트 컨트롤 (선택해도 크기 변화 없음)
  const seg = (active: boolean) =>
    `flex-1 rounded-md py-2 text-xs font-medium transition-colors ${
      active ? "bg-surface text-foreground shadow-sm" : "text-foreground-muted hover:text-foreground-secondary"
    }`;

  const chip = (active: boolean) =>
    `rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
      active ? "bg-primary-500 text-white" : "bg-surface text-foreground-secondary hover:bg-border"
    }`;

  return (
    <div className="space-y-4">
      {/* ── 무엇을 들을까 ── */}
      <div>
        <p className="mb-2 text-[11px] font-semibold text-foreground-muted">무엇을 들을까</p>
        <div className="flex gap-0.5 rounded-lg bg-surface-secondary p-0.5">
          <button onClick={() => setFilterMode("all")} className={seg(s.filterMode === "all")}>전체</button>
          <button onClick={() => setFilterMode("type")} className={seg(s.filterMode === "type")}>유형 집중</button>
          <button onClick={() => setFilterMode("topic")} className={seg(s.filterMode === "topic")}>주제 집중</button>
        </div>

        {/* 선택 슬롯 — 고정 높이(모드 바꿔도 안 움직임) */}
        <div className="mt-2 h-28 overflow-y-auto rounded-lg border border-border bg-surface-secondary/30 p-2.5 [scrollbar-width:thin]">
          {s.filterMode === "all" && (
            <div className="flex h-full items-center justify-center text-center text-[11px] text-foreground-muted">
              모든 곡을 순서대로 들어요
            </div>
          )}

          {s.filterMode === "type" &&
            (availableTypes.length === 0 ? (
              <div className="flex h-full items-center justify-center text-[11px] text-foreground-muted">
                사용 가능한 유형이 없어요
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {availableTypes.map((ty) => (
                  <button key={ty} onClick={() => update({ selectedType: ty })} className={chip(s.selectedType === ty)}>
                    {QUESTION_TYPE_LABELS[ty] || ty}
                  </button>
                ))}
              </div>
            ))}

          {s.filterMode === "topic" && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {availableCategories.map((cat) => (
                  <button key={cat} onClick={() => pickCategory(cat)} className={chip(s.selectedCategory === cat)}>
                    {cat}
                  </button>
                ))}
              </div>
              {topicsOfCategory.length > 0 && (
                <div className="flex flex-wrap gap-1.5 border-t border-border/60 pt-2">
                  {topicsOfCategory.map((tp) => (
                    <button key={tp} onClick={() => update({ selectedTopic: tp })} className={chip(s.selectedTopic === tp)}>
                      {tp}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 무엇을 재생 ── */}
      <div>
        <p className="mb-2 text-[11px] font-semibold text-foreground-muted">무엇을 재생</p>
        <div className="flex gap-0.5 rounded-lg bg-surface-secondary p-0.5">
          <button onClick={() => update({ contentMode: "answer" })} className={seg(s.contentMode === "answer")}>답변만</button>
          <button onClick={() => update({ contentMode: "qa" })} className={seg(s.contentMode === "qa")}>질문→답변</button>
          <button onClick={() => update({ contentMode: "question" })} className={seg(s.contentMode === "question")}>질문만</button>
        </div>

        {/* 옵션 슬롯 — 고정 높이(내용 바꿔도 안 움직임) */}
        <div className="mt-2 flex h-12 items-center rounded-lg bg-surface-secondary/30 px-3">
          {s.contentMode === "qa" ? (
            <div className="flex w-full items-center justify-between gap-2">
              <button
                onClick={() => update({ thinkGap: !s.thinkGap })}
                className="flex items-center gap-1.5 text-xs font-medium text-foreground-secondary"
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                    s.thinkGap ? "border-primary-500 bg-primary-500 text-white" : "border-border bg-surface"
                  }`}
                >
                  {s.thinkGap && <Check size={11} strokeWidth={3} />}
                </span>
                생각 간격
              </button>
              <div className="flex items-center gap-1">
                {[3, 5, 8].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => update({ thinkGap: true, thinkGapSec: sec })}
                    className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                      s.thinkGap && s.thinkGapSec === sec
                        ? "bg-primary-500 text-white"
                        : "bg-surface text-foreground-muted hover:bg-border"
                    } ${s.thinkGap ? "" : "opacity-50"}`}
                  >
                    {sec}초
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-foreground-muted">
              {s.contentMode === "answer" ? "답변 음성만 들어요" : "질문 음성만 들어요"}
            </p>
          )}
        </div>
      </div>

      <p className="text-center text-[11px] text-foreground-muted">
        지금 재생목록 <span className="font-semibold text-foreground-secondary">{queueCount}곡</span>
      </p>
    </div>
  );
}
