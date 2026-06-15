"use client";

// 만능 스토리 — 브라우저 (스토리 그리드 → 1편 뷰어)
//   한글 토글은 여기서 보유해 편 사이 이동에도 유지.
//   설계 근거: docs/만능스토리-전략분석.md

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Layers, Loader2, ListChecks } from "lucide-react";
import { getUniversalStories } from "@/lib/actions/universal-story";
import { useStoryProgress } from "@/lib/hooks/use-story-progress";
import { StoryViewer } from "@/components/coaching/story-viewer";
import type { UniversalStory } from "@/lib/types/universal-story";

// kind별 카드 배지 색
const KIND_BADGE: Record<UniversalStory["kind"], { label: string; cls: string }> = {
  story: { label: "암기", cls: "bg-green-50 text-green-700" },
  template: { label: "틀+카드", cls: "bg-amber-50 text-amber-700" },
  frame: { label: "골격만", cls: "bg-red-50 text-red-700" },
  engine: { label: "🤖 엔진", cls: "bg-primary-50 text-primary-700" },
};

export function StoryBrowser() {
  const progress = useStoryProgress();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showKo, setShowKo] = useState(false); // 한글: 기본 숨김

  const q = useQuery({
    queryKey: ["universal-stories"],
    queryFn: async () => {
      const r = await getUniversalStories();
      if (r.error) throw new Error(r.error);
      return r.data ?? [];
    },
    staleTime: Infinity,
  });

  const list = q.data ?? [];
  const selIndex = selectedId ? list.findIndex((s) => s.id === selectedId) : -1;
  const sel = selIndex >= 0 ? list[selIndex] : null;

  // ── 1편 뷰어 ──
  if (sel) {
    const prev = list[selIndex - 1];
    const next = list[selIndex + 1];
    return (
      <StoryViewer
        key={sel.id}
        s={sel}
        index={selIndex}
        total={list.length}
        prevTitle={prev?.title ?? null}
        nextTitle={next?.title ?? null}
        onClose={() => setSelectedId(null)}
        onPrev={() => {
          if (prev) setSelectedId(prev.id);
        }}
        onNext={() => {
          if (next) setSelectedId(next.id);
        }}
        isDone={progress.isDone(sel.id)}
        onToggleDone={() => progress.toggle(sel.id)}
        showKo={showKo}
        onToggleKo={() => setShowKo((v) => !v)}
      />
    );
  }

  // ── 스토리 그리드 ──
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-primary-200 bg-gradient-to-r from-primary-50 to-surface p-5 sm:p-6">
        <h3 className="text-sm font-semibold text-foreground sm:text-base">
          만능 스토리 — 적은 스토리로 많은 질문을
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-foreground-secondary sm:text-sm">
          강지완 AL method 적용 — 통째 대본이 아니라{" "}
          <span className="font-medium text-foreground">🍔 골격 + ⚔️ 격상블록은 외우고(🔒)</span>,{" "}
          <span className="font-medium text-amber-700">🎲 슬롯만 즉흥</span>으로 갈아끼워요. 핵심은{" "}
          <span className="font-medium text-foreground">긍정·문제해결 두 드라마</span>와{" "}
          <span className="font-medium text-primary-600">🤖 AI 만능 엔진(14·15번)</span>이에요.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-foreground-secondary">
            <Layers className="h-3.5 w-3.5" /> 회차당 15문항 중 ~11~12문항 커버
          </span>
          {progress.totalDone > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-primary-700">
              <Check className="h-3.5 w-3.5" /> {progress.totalDone}편 외움
            </span>
          )}
        </div>
      </div>

      {q.isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
        </div>
      ) : list.length === 0 ? (
        <p className="py-8 text-center text-sm text-foreground-muted">준비된 스토리가 없습니다</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {list.map((s) => {
            const done = progress.isDone(s.id);
            const kindBadge = KIND_BADGE[s.kind];
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedId(s.id)}
                className="group flex flex-col gap-1.5 rounded-2xl border border-border bg-surface p-5 text-left transition hover:border-primary-300 hover:shadow-card"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-500 text-[11px] font-bold text-white">
                      {s.badge}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${kindBadge.cls}`}>
                      {kindBadge.label}
                    </span>
                  </div>
                  {done && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </div>
                <h4 className="text-base font-semibold text-foreground group-hover:text-primary-600">
                  {s.title}
                </h4>
                <p className="line-clamp-2 text-xs leading-relaxed text-foreground-secondary">
                  {s.hook}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-foreground-muted">
                  {s.alSkeleton && (
                    <span className="inline-flex items-center gap-1 font-semibold text-primary-600">
                      <Layers className="h-3 w-3" /> AL 골격
                    </span>
                  )}
                  {s.beats.length > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <ListChecks className="h-3 w-3" /> {s.beats.length}비트
                    </span>
                  )}
                  <span>{s.mappings.length}개 매핑</span>
                  {s.leverage && (
                    <span className="font-medium text-accent-500">{s.leverage}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
