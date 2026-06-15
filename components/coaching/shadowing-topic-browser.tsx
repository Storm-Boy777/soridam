"use client";

// 쉐도잉(주제) 탭 — 카테고리(일반/롤플레이/어드밴스) → 주제 → 질문(쉐도잉)
//   '쉐도잉' 탭이 유형별 진입이라면, 이 탭은 주제별 진입. 카드는 같은 ShadowingCard 재사용.
//   주제 안에는 여러 유형이 섞이므로 질문 리스트를 유형 소제목으로 묶는다.
//   주제 그리드는 '주제별' 코칭 탭과 동일하게 기출 빈도순(선택형/공통형) 정렬.

import { useState, useMemo, useEffect, useRef, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Layers,
  Drama,
  TrendingUp,
  Folder,
  Loader2,
  ListChecks,
  Shuffle,
  ChevronRight,
  Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getTopicsByCategory } from "@/lib/queries/master-questions";
import { getShadowingByCategoryTopic } from "@/lib/actions/shadowing";
import { TOPIC_ICONS } from "@/components/reviews/submit/topic-pagination";
import {
  QUESTION_TYPE_LABELS,
  QUESTION_TYPE_COLORS,
  QUESTION_TYPE_ORDER,
} from "@/lib/types/reviews";
import type { ShadowTopicQuestion } from "@/lib/types/shadowing";
import { useShadowingProgress } from "@/lib/hooks/use-shadowing-progress";
import { ShadowingCard } from "@/components/coaching/shadowing-card";

type Category = "일반" | "롤플레이" | "어드밴스";
type Progress = ReturnType<typeof useShadowingProgress>;

const CATEGORIES: { key: Category; icon: LucideIcon; desc: string }[] = [
  { key: "일반", icon: Layers, desc: "묘사·루틴·비교·경험" },
  { key: "롤플레이", icon: Drama, desc: "질문하기·대안제시" },
  { key: "어드밴스", icon: TrendingUp, desc: "비교/변화·사회이슈" },
];

interface TopicRow {
  topic: string;
  count: number;
  frequency: number;
  survey_type: string | null;
}

export function ShadowingTopicBrowser() {
  const [category, setCategory] = useState<Category | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const progress = useShadowingProgress();

  // 다음 단계 영역이 펼쳐지면 자동으로 위로 스크롤 (선택 직후 인지 향상)
  const topicSectionRef = useRef<HTMLElement>(null);
  const questionSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (category)
      topicSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [category]);
  useEffect(() => {
    if (topic)
      questionSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [topic]);

  const questionsQ = useQuery({
    queryKey: ["shadow-topic-questions", category, topic],
    queryFn: async () => {
      const r = await getShadowingByCategoryTopic(category as Category, topic as string);
      if (r.error) throw new Error(r.error);
      return r.data ?? [];
    },
    enabled: !!category && !!topic,
    staleTime: Infinity,
  });

  // 유형 순 → 같은 유형이면 id 순 (유형 소제목 그룹핑 기준)
  const items = useMemo(() => {
    const raw = questionsQ.data ?? [];
    const ord = (t: string | null) => QUESTION_TYPE_ORDER[t ?? ""] ?? 99;
    return [...raw].sort(
      (a, b) => ord(a.question_type) - ord(b.question_type) || a.id.localeCompare(b.id)
    );
  }, [questionsQ.data]);

  const openIndex = openId ? items.findIndex((q) => q.id === openId) : -1;
  const openQ = openIndex >= 0 ? items[openIndex] : null;

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

  return (
    <div className="space-y-5">
      {/* 안내 */}
      <div className="rounded-2xl border border-primary-200 bg-gradient-to-r from-primary-50 to-surface p-5 sm:p-6">
        <h3 className="text-sm font-semibold text-foreground sm:text-base">
          쉐도잉 — 주제별로 골라 듣고 따라 말하기
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-foreground-secondary sm:text-sm">
          카테고리 → 주제 순으로 골라요. 한 주제의 여러 유형 질문을 모아 보고, 질문을{" "}
          <span className="font-medium text-foreground">실제 음성으로 듣고</span>, 모범답안을
          보며(또는 가리고) 따라 말한 뒤{" "}
          <span className="font-medium text-foreground">내 목소리를 녹음해 다시 들으며</span>{" "}
          점검하세요.
        </p>
        {progress.totalDone > 0 && (
          <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-primary-700">
            <Check className="h-3.5 w-3.5" /> 지금까지 {progress.totalDone}개 체득
          </span>
        )}
      </div>

      {/* ① 카테고리 선택 */}
      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="mb-3 text-sm font-semibold text-foreground-secondary">
          ① 카테고리 선택
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            const active = category === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => {
                  setCategory(c.key);
                  setTopic(null);
                  setOpenId(null);
                }}
                className={`flex flex-col gap-1 rounded-xl border p-4 text-left transition ${
                  active
                    ? "border-primary-400 bg-primary-50"
                    : "border-border bg-surface hover:border-primary-300 hover:bg-surface-hover"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    size={18}
                    className={active ? "text-primary-600" : "text-foreground-secondary"}
                  />
                  <span className="text-base font-semibold text-foreground">{c.key}</span>
                </div>
                <p className="text-xs text-foreground-muted">{c.desc}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* ② 주제 선택 */}
      {category && (
        <section
          ref={topicSectionRef}
          className="scroll-mt-24 rounded-2xl border border-border bg-surface p-5 sm:p-6"
        >
          <div className="mb-3 text-sm font-semibold text-foreground-secondary">
            ② 주제 선택 — {category}
          </div>
          <TopicGrid
            category={category}
            selectedTopic={topic}
            onSelect={(t) => {
              setTopic(t);
              setOpenId(null);
            }}
          />
        </section>
      )}

      {/* ③ 질문 선택 (쉐도잉) */}
      {category && topic && (
        <section
          ref={questionSectionRef}
          className="scroll-mt-24 rounded-2xl border border-border bg-surface p-5 sm:p-6"
        >
          <QuestionList
            topic={topic}
            items={items}
            loading={questionsQ.isLoading}
            progress={progress}
            onOpen={(id) => setOpenId(id)}
          />
        </section>
      )}
    </div>
  );
}

// ── 주제 그리드 (빈도순 · 선택형/공통형) ──

function TopicGrid({
  category,
  selectedTopic,
  onSelect,
}: {
  category: Category;
  selectedTopic: string | null;
  onSelect: (topic: string) => void;
}) {
  // '주제별' 코칭 탭과 동일 쿼리키 → 캐시 공유
  const { data: topics = [], isLoading } = useQuery({
    queryKey: ["coaching-cat-topics", category],
    queryFn: () => getTopicsByCategory(category),
    staleTime: Infinity,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
      </div>
    );
  }

  if (topics.length === 0) {
    return <p className="py-3 text-sm text-foreground-muted">주제가 없습니다</p>;
  }

  const selective = topics.filter((t: TopicRow) => t.survey_type === "선택형");
  const common = topics.filter((t: TopicRow) => t.survey_type === "공통형");

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2 rounded-xl bg-primary-50 px-3 py-2.5 text-xs leading-relaxed text-primary-700">
        <TrendingUp className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          주제는 <strong className="font-semibold">기출 빈도순</strong>으로 정렬돼 있어요. 자주
          나오는 위쪽 주제부터 학습하는 걸 추천해요.
        </span>
      </div>

      {selective.length > 0 && (
        <section>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground-secondary">
            <ListChecks className="h-4 w-4 text-foreground-muted" />
            <span>선택형 ({selective.length}) — 백그라운드 서베이</span>
          </div>
          <TopicCards topics={selective} selectedTopic={selectedTopic} onSelect={onSelect} />
        </section>
      )}

      {common.length > 0 && (
        <section>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground-secondary">
            <Shuffle className="h-4 w-4 text-foreground-muted" />
            <span>공통형 ({common.length}) — 돌발</span>
          </div>
          <TopicCards topics={common} selectedTopic={selectedTopic} onSelect={onSelect} />
        </section>
      )}
    </div>
  );
}

function TopicCards({
  topics,
  selectedTopic,
  onSelect,
}: {
  topics: TopicRow[];
  selectedTopic: string | null;
  onSelect: (topic: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {topics.map((t) => {
        const Icon = TOPIC_ICONS[t.topic] ?? Folder;
        const active = selectedTopic === t.topic;
        return (
          <button
            key={t.topic}
            type="button"
            onClick={() => onSelect(t.topic)}
            className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition ${
              active
                ? "border-primary-400 bg-primary-50"
                : "border-border bg-surface hover:border-primary-300 hover:bg-surface-hover"
            }`}
          >
            <Icon
              size={18}
              className={active ? "text-primary-600" : "text-foreground-secondary"}
            />
            <span className="text-sm font-semibold text-foreground">{t.topic}</span>
            <span className="text-[10px] text-foreground-muted">질문 {t.count}개</span>
          </button>
        );
      })}
    </div>
  );
}

// ── 질문 리스트 (유형 소제목으로 그룹) ──

function QuestionList({
  topic,
  items,
  loading,
  progress,
  onOpen,
}: {
  topic: string;
  items: ShadowTopicQuestion[];
  loading: boolean;
  progress: Progress;
  onOpen: (id: string) => void;
}) {
  const doneInView = items.filter((q) => progress.isDone(q.id)).length;

  // 그룹(유형) 내 번호 — 유형이 바뀔 때마다 1부터
  const groupNumbers: number[] = [];
  let prevType: string | null | undefined;
  let gn = 0;
  items.forEach((q, j) => {
    if (q.question_type !== prevType) {
      prevType = q.question_type;
      gn = 0;
    }
    groupNumbers[j] = ++gn;
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-foreground-secondary">
          ③ 질문 선택 — {topic}
        </div>
        {items.length > 0 && (
          <span className="text-xs font-medium text-foreground-muted">
            체득 {doneInView} / {items.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-3 text-sm text-foreground-muted">질문이 없습니다</p>
      ) : (
        <div className="space-y-2">
          {items.map((q, i) => {
            const prev = i > 0 ? items[i - 1] : null;
            const showType = prev === null || prev.question_type !== q.question_type;
            const typeLabel =
              QUESTION_TYPE_LABELS[q.question_type ?? ""] ?? q.question_type ?? "기타";
            const typeColor =
              QUESTION_TYPE_COLORS[q.question_type ?? ""] ?? "bg-gray-100 text-gray-700";
            return (
              <Fragment key={q.id}>
                {showType && (
                  <div className="flex items-center gap-2 px-1 pb-1 pt-4 first:pt-0">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${typeColor}`}
                    >
                      {typeLabel}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onOpen(q.id)}
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
