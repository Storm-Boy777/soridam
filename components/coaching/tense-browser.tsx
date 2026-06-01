"use client";

// 시제 만능 아크 — 브라우저 (23 도메인 그리드 → 1편 뷰어)
//   한글/해설 토글은 여기서 보유해 편 사이 이동에도 유지.

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Clock, Loader2, Star } from "lucide-react";
import { getTenseNarratives } from "@/lib/actions/tense";
import { useTenseProgress } from "@/lib/hooks/use-tense-progress";
import { TenseNarrativeView } from "@/components/coaching/tense-narrative";

export function TenseBrowser() {
  const progress = useTenseProgress();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showKo, setShowKo] = useState(false); // 한글: 기본 숨김
  const [showNote, setShowNote] = useState(true); // 해설: 기본 표시

  const q = useQuery({
    queryKey: ["tense-narratives"],
    queryFn: async () => {
      const r = await getTenseNarratives();
      if (r.error) throw new Error(r.error);
      return r.data ?? [];
    },
    staleTime: Infinity,
  });

  const list = q.data ?? [];
  const selIndex = selectedId ? list.findIndex((n) => n.id === selectedId) : -1;
  const sel = selIndex >= 0 ? list[selIndex] : null;

  // ── 1편 뷰어 ──
  if (sel) {
    const prev = list[selIndex - 1];
    const next = list[selIndex + 1];
    return (
      <TenseNarrativeView
        key={sel.id}
        n={sel}
        index={selIndex}
        total={list.length}
        prevDomain={prev?.domain ?? null}
        nextDomain={next?.domain ?? null}
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
        showNote={showNote}
        onToggleKo={() => setShowKo((v) => !v)}
        onToggleNote={() => setShowNote((v) => !v)}
      />
    );
  }

  // ── 도메인 그리드 ──
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-primary-200 bg-gradient-to-r from-primary-50 to-surface p-5 sm:p-6">
        <h3 className="text-sm font-semibold text-foreground sm:text-base">
          시제 — 만능 답변으로 시제 굳히기
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-foreground-secondary sm:text-sm">
          경험 주제마다{" "}
          <span className="font-medium text-foreground">&quot;예전 → 그 사건 → 요즘 → 앞으로&quot;</span>{" "}
          시간 흐름으로 짠 이야기예요. 자연스럽게 따라 읽다 보면{" "}
          <span className="font-medium text-foreground">과거·현재·미래 시제</span>가 몸에 붙고, ⭐
          표시된 <span className="font-medium text-foreground">사건 칸</span>은 그 주제의 실제 기출을
          통째로 답해 줍니다.
        </p>
        {progress.totalDone > 0 && (
          <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-primary-700">
            <Check className="h-3.5 w-3.5" /> 지금까지 {progress.totalDone}편 익힘
          </span>
        )}
      </div>

      {q.isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
        </div>
      ) : list.length === 0 ? (
        <p className="py-8 text-center text-sm text-foreground-muted">준비된 이야기가 없습니다</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {list.map((n) => {
            const done = progress.isDone(n.id);
            const hasIncident = n.beats.some((b) => b.incident);
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => setSelectedId(n.id)}
                className="group flex flex-col gap-1.5 rounded-2xl border border-border bg-surface p-5 text-left transition hover:border-primary-300 hover:shadow-card"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary-700">
                    {n.domain}
                  </span>
                  {done && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </div>
                <h4 className="text-base font-semibold text-foreground group-hover:text-primary-600">
                  {n.title}
                </h4>
                <p className="line-clamp-1 text-xs text-foreground-secondary">{n.hook}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-foreground-muted">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {n.beats.length}칸
                  </span>
                  <span>{n.tenses.length}개 시제</span>
                  {hasIncident && (
                    <span className="inline-flex items-center gap-1 font-medium text-accent-500">
                      <Star className="h-3 w-3 fill-current" /> 사건 포함
                    </span>
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
