"use client";

// 쉐도잉(답변뱅크) 탭 — 현재 questions DB 기준
//   유형(10) → 질문 직행 (토픽 단계 없음). 질문은 토픽 소제목으로 묶어 한 화면에.
//   + 기타(DB에 없는 보존 답변). 질문은 DB에서 로드(음성 포함), 모범답안은 id로 join.

import { useState, useMemo, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, Loader2, Check } from "lucide-react";
import {
  getShadowingTypeCards,
  getShadowingQuestions,
  getShadowingOrphans,
} from "@/lib/actions/shadowing";
import { QUESTION_TYPE_LABELS } from "@/lib/types/coaching";
import type { QuestionType } from "@/lib/types/coaching";
import { DOMAIN_LABELS, DOMAIN_ORDER } from "@/lib/types/shadowing";
import type { ShadowType, ShadowTypeCard, ShadowQuestion } from "@/lib/types/shadowing";
import { useShadowingProgress } from "@/lib/hooks/use-shadowing-progress";
import { ShadowingCard } from "@/components/coaching/shadowing-card";

export function ShadowingBrowser() {
  const [selectedType, setSelectedType] = useState<ShadowType | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const progress = useShadowingProgress();

  const isEtc = selectedType === "etc";

  const typeCardsQ = useQuery({
    queryKey: ["shadow-type-cards"],
    queryFn: async () => {
      const r = await getShadowingTypeCards();
      if (r.error) throw new Error(r.error);
      return r.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const questionsQ = useQuery({
    queryKey: ["shadow-questions-by-type", selectedType],
    queryFn: async () => {
      const r = await getShadowingQuestions(selectedType as QuestionType);
      if (r.error) throw new Error(r.error);
      return r.data ?? [];
    },
    enabled: !!selectedType && !isEtc,
    staleTime: Infinity,
  });

  const orphansQ = useQuery({
    queryKey: ["shadow-orphans"],
    queryFn: async () => {
      const r = await getShadowingOrphans();
      if (r.error) throw new Error(r.error);
      return r.data ?? [];
    },
    enabled: isEtc,
    staleTime: Infinity,
  });

  const raw: ShadowQuestion[] = (isEtc ? orphansQ.data : questionsQ.data) ?? [];
  const listLoading = isEtc ? orphansQ.isLoading : questionsQ.isLoading;

  // 같은 종류(도메인)가 2개 이상이면 도메인으로 묶고(묘사: 장소/사람/사물/활동/사회),
  // 아니면 토픽으로 묶는다. 표시 순서 = 카드 이전/다음 순서.
  const { items, byDomain, groupCounts } = useMemo(() => {
    const distinct = new Set<string>();
    for (const q of raw) if (q.domain) distinct.add(q.domain);
    const useDomain = distinct.size >= 2;

    const keyOf = (q: ShadowQuestion) => (useDomain ? q.domain ?? "기타" : q.topic);
    const m = new Map<string, ShadowQuestion[]>();
    for (const q of raw) {
      const k = keyOf(q);
      const arr = m.get(k);
      if (arr) arr.push(q);
      else m.set(k, [q]);
    }

    const entries = [...m.entries()];
    if (useDomain) {
      const idx = (k: string) => {
        const i = DOMAIN_ORDER.indexOf(k);
        return i < 0 ? 999 : i;
      };
      entries.sort((a, b) => idx(a[0]) - idx(b[0]) || a[0].localeCompare(b[0], "ko"));
      for (const [, qs] of entries)
        qs.sort((x, y) => x.topic.localeCompare(y.topic, "ko") || x.id.localeCompare(y.id));
    } else {
      entries.sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], "ko"));
    }

    const counts = new Map<string, number>();
    for (const [k, qs] of entries) counts.set(k, qs.length);
    return {
      items: entries.flatMap(([, qs]) => qs),
      byDomain: useDomain,
      groupCounts: counts,
    };
  }, [raw]);

  const groupKeyOf = (q: ShadowQuestion) => (byDomain ? q.domain ?? "기타" : q.topic);
  const groupLabelOf = (q: ShadowQuestion) =>
    byDomain ? DOMAIN_LABELS[q.domain ?? ""] ?? q.domain ?? "기타" : q.topic;

  const openIndex = openId ? items.findIndex((q) => q.id === openId) : -1;
  const openQ = openIndex >= 0 ? items[openIndex] : null;

  // ── 유형 그리드 ──
  if (!selectedType) {
    return (
      <TypeGrid
        cards={typeCardsQ.data ?? []}
        loading={typeCardsQ.isLoading}
        totalDone={progress.totalDone}
        onSelect={(t) => {
          setSelectedType(t);
          setOpenId(null);
        }}
      />
    );
  }

  // ── 쉐도잉 카드 ──
  if (openQ) {
    return (
      <ShadowingCard
        key={openQ.id}
        q={openQ}
        index={openIndex}
        total={items.length}
        onClose={() => setOpenId(null)}
        onPrev={() => {
          const p = items[openIndex - 1];
          if (p) setOpenId(p.id);
        }}
        onNext={() => {
          const n = items[openIndex + 1];
          if (n) setOpenId(n.id);
        }}
        isDone={progress.isDone(openQ.id)}
        onToggleDone={() => progress.toggle(openQ.id)}
      />
    );
  }

  // ── 질문 리스트 (토픽 소제목으로 그룹) ──
  const doneInView = items.filter((q) => progress.isDone(q.id)).length;
  const label = isEtc ? "기타" : QUESTION_TYPE_LABELS[selectedType as QuestionType];

  // 그룹(소제목) 내 번호 — 소제목마다 1부터
  const groupNumbers: number[] = [];
  let prevK: string | null = null;
  let gn = 0;
  items.forEach((q, j) => {
    const k = groupKeyOf(q);
    if (k !== prevK) {
      prevK = k;
      gn = 0;
    }
    groupNumbers[j] = ++gn;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setSelectedType(null)}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary"
        >
          <ArrowLeft className="h-4 w-4" /> 유형
        </button>
        <span className="text-xs font-medium text-foreground-muted">
          체득 {doneInView} / {items.length}
        </span>
      </div>

      <div className="rounded-2xl border border-border bg-surface px-5 py-4">
        <h3 className="text-base font-semibold text-foreground">{label}</h3>
        <p className="text-xs text-foreground-secondary">
          {items.length}개 질문 · {byDomain ? "종류별로 묶음" : "토픽별로 묶음"}
        </p>
      </div>

      {listLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-foreground-muted">질문이 없습니다</p>
      ) : (
        <div className="space-y-2">
          {items.map((q, i) => {
            const key = groupKeyOf(q);
            const showHeader = i === 0 || groupKeyOf(items[i - 1]) !== key;
            return (
              <Fragment key={q.id}>
                {showHeader && (
                  <div className="flex items-baseline gap-2 px-1 pb-0.5 pt-4 first:pt-0">
                    <span className="text-sm font-semibold text-foreground">{groupLabelOf(q)}</span>
                    <span className="text-[11px] text-foreground-muted">
                      {groupCounts.get(key)}문항
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setOpenId(q.id)}
                  className="group flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left transition hover:border-primary-300 hover:shadow-card"
                >
                  {progress.isDone(q.id) ? (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  ) : (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-[11px] font-semibold text-foreground-muted">
                      {groupNumbers[i]}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm text-foreground group-hover:text-primary-600">
                      {q.question_english}
                    </p>
                    {q.question_korean && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-foreground-muted">
                        {q.question_korean}
                      </p>
                    )}
                    {!q.answer && (
                      <p className="mt-1 text-[11px] text-foreground-muted">답안 준비 중</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-foreground-muted" />
                </button>
              </Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── 유형 그리드 ──

function TypeGrid({
  cards,
  loading,
  totalDone,
  onSelect,
}: {
  cards: ShadowTypeCard[];
  loading: boolean;
  totalDone: number;
  onSelect: (t: ShadowType) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-primary-200 bg-gradient-to-r from-primary-50 to-surface p-5 sm:p-6">
        <h3 className="text-sm font-semibold text-foreground sm:text-base">
          쉐도잉 — 듣고 따라 말하기
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-foreground-secondary sm:text-sm">
          현재 기출 DB 기준이에요. 질문을{" "}
          <span className="font-medium text-foreground">실제 음성으로 듣고</span>, 모범답안을
          보고(또는 가리고) 따라 말한 뒤,{" "}
          <span className="font-medium text-foreground">내 목소리를 녹음해 다시 들으며</span>{" "}
          점검하세요.
        </p>
        {totalDone > 0 && (
          <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-primary-700">
            <Check className="h-3.5 w-3.5" /> 지금까지 {totalDone}개 체득
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <button
              key={c.type}
              type="button"
              onClick={() => onSelect(c.type)}
              className={`group flex flex-col gap-1.5 rounded-2xl border p-5 text-left transition hover:border-primary-300 hover:shadow-card ${
                c.type === "etc" ? "border-dashed border-border bg-surface" : "border-border bg-surface"
              }`}
            >
              <div className="flex items-center justify-between">
                <h4 className="text-base font-semibold text-foreground group-hover:text-primary-600">
                  {c.label}
                </h4>
                <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-xs font-medium text-foreground-muted">
                  {c.total}문항
                </span>
              </div>
              <p className="text-xs text-foreground-secondary">{c.desc}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
