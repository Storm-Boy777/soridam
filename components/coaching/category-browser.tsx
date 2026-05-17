"use client";

// 탭 2 "주제별" — 스크립트 생성 방식
// 카테고리(일반/롤플레이/어드밴스) → 주제 → 질문 (한 페이지 누적 펼침)

import { useState, useTransition, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Layers,
  Drama,
  TrendingUp,
  Folder,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Volume2,
  ListChecks,
  Shuffle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getTopicsByCategory } from "@/lib/queries/master-questions";
import { startOrResumeSession, getCoachingQuestionsByCategoryTopic } from "@/lib/actions/coaching";
import { TOPIC_ICONS } from "@/components/reviews/submit/topic-pagination";
import { QUESTION_TYPE_LABELS, QUESTION_TYPE_COLORS } from "@/lib/types/reviews";
import type { CoachingCategoryQuestion } from "@/lib/types/coaching";

type Category = "일반" | "롤플레이" | "어드밴스";

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

export function CategoryBrowser() {
  const [category, setCategory] = useState<Category | null>(null);
  const [topic, setTopic] = useState<string | null>(null);

  // 다음 단계 영역이 펼쳐지면 자동으로 위로 스크롤 (선택 직후 인지 향상)
  const topicSectionRef = useRef<HTMLElement>(null);
  const questionSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (category) {
      topicSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [category]);

  useEffect(() => {
    if (topic) {
      questionSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [topic]);

  return (
    <div className="space-y-5">
      {/* ① 카테고리 선택 */}
      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="mb-3 text-sm font-semibold text-foreground-secondary">① 카테고리 선택</div>
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
                }}
                className={`flex flex-col gap-1 rounded-xl border p-4 text-left transition ${
                  active
                    ? "border-primary-400 bg-primary-50"
                    : "border-border bg-surface hover:border-primary-300 hover:bg-surface-hover"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon size={18} className={active ? "text-primary-600" : "text-foreground-secondary"} />
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
            onSelect={(t) => setTopic(t)}
          />
        </section>
      )}

      {/* ③ 질문 선택 */}
      {category && topic && (
        <section
          ref={questionSectionRef}
          className="scroll-mt-24 rounded-2xl border border-border bg-surface p-5 sm:p-6"
        >
          <div className="mb-3 text-sm font-semibold text-foreground-secondary">
            ③ 질문 선택 — {topic}
          </div>
          <QuestionGrid category={category} topic={topic} />
        </section>
      )}
    </div>
  );
}

// ── 주제 그리드 ──

function TopicGrid({
  category,
  selectedTopic,
  onSelect,
}: {
  category: Category;
  selectedTopic: string | null;
  onSelect: (topic: string) => void;
}) {
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

  // 선택형 / 공통형 그룹핑 (빈도순은 getTopicsByCategory에서 이미 정렬됨)
  const selective = topics.filter((t: TopicRow) => t.survey_type === "선택형");
  const common = topics.filter((t: TopicRow) => t.survey_type === "공통형");

  return (
    <div className="space-y-5">
      {/* 빈도순 안내 */}
      <div className="flex items-start gap-2 rounded-xl bg-primary-50 px-3 py-2.5 text-xs leading-relaxed text-primary-700">
        <TrendingUp className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          주제는 <strong className="font-semibold">기출 빈도순</strong>으로 정렬돼 있어요. 자주
          나오는 위쪽 주제부터 학습하는 걸 추천해요.
        </span>
      </div>

      {/* 선택형 */}
      {selective.length > 0 && (
        <section>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground-secondary">
            <ListChecks className="h-4 w-4 text-foreground-muted" />
            <span>선택형 ({selective.length}) — 백그라운드 서베이</span>
          </div>
          <TopicCards topics={selective} selectedTopic={selectedTopic} onSelect={onSelect} />
        </section>
      )}

      {/* 공통형 (돌발) */}
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

// ── 주제 카드 그리드 ──

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
            <Icon size={18} className={active ? "text-primary-600" : "text-foreground-secondary"} />
            <span className="text-sm font-semibold text-foreground">{t.topic}</span>
            <span className="text-[10px] text-foreground-muted">질문 {t.count}개</span>
          </button>
        );
      })}
    </div>
  );
}

// ── 질문 그리드 ──

function QuestionGrid({ category, topic }: { category: Category; topic: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ["coaching-cat-questions", category, topic],
    queryFn: async () => {
      const r = await getCoachingQuestionsByCategoryTopic(category, topic);
      if (r.error) throw new Error(r.error);
      return r.data ?? [];
    },
    staleTime: 0,
  });

  function handlePick(q: CoachingCategoryQuestion) {
    // MVP: 활성 유형(현재 묘사)만 학습 가능
    if (!q.is_active_type) {
      setError("이 유형은 아직 준비 중입니다. 현재는 묘사 유형만 학습 가능해요.");
      return;
    }
    setError(null);
    setPendingId(q.question_id);
    startTransition(async () => {
      const result = await startOrResumeSession({
        question_type: q.question_type,
        topic,
        question_id: q.question_id,
      });
      if (result.error || !result.data) {
        setError(result.error ?? "세션 시작 실패");
        setPendingId(null);
        return;
      }
      router.push(`/coaching/learn/${result.data.session_id}`);
    });
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
      </div>
    );
  }

  if (questions.length === 0) {
    return <p className="py-3 text-sm text-foreground-muted">질문이 없습니다</p>;
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-accent-300 bg-accent-50 px-4 py-2 text-sm text-accent-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {questions.map((q: CoachingCategoryQuestion, idx: number) => {
        const typeLabel = QUESTION_TYPE_LABELS[q.question_type] ?? q.question_type;
        const typeColor = QUESTION_TYPE_COLORS[q.question_type] ?? "bg-gray-100 text-gray-700";
        const isPickPending = pendingId === q.question_id;
        const progress = q.user_progress;
        // 유형별 탭과 동일한 진행/졸업 표시 (활성 유형만)
        const mastered = q.is_active_type && !!progress?.mastered;
        const inProgress = q.is_active_type && !mastered && !!progress?.has_session;
        return (
          <button
            key={q.question_id}
            type="button"
            disabled={isPending}
            onClick={() => handlePick(q)}
            className={`relative flex w-full flex-col gap-2 rounded-2xl border p-4 text-left transition disabled:opacity-50 ${
              !q.is_active_type
                ? "border-border bg-surface-secondary opacity-60"
                : mastered
                  ? "border-primary-300 bg-primary-50 hover:border-primary-500"
                  : inProgress
                    ? "border-accent-300 bg-accent-50 hover:border-accent-500"
                    : "border-border bg-surface hover:border-primary-300 hover:bg-surface-hover"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-foreground-muted/15 px-2 py-0.5 text-xs font-mono text-foreground-secondary">
                  Q{idx + 1}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${typeColor}`}>
                  {typeLabel}
                </span>
                {!q.is_active_type ? (
                  <span className="rounded-full bg-foreground-muted/20 px-2 py-0.5 text-[10px] text-foreground-muted">
                    준비 중
                  </span>
                ) : mastered ? (
                  <span className="flex items-center gap-1 rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-semibold text-primary-700">
                    <CheckCircle2 className="h-3 w-3" />
                    졸업
                  </span>
                ) : inProgress ? (
                  <span className="flex items-center gap-1 rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-semibold text-accent-700">
                    <RotateCcw className="h-3 w-3" />
                    이어하기 ({progress?.attempt_count}회차)
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-foreground-muted/10 px-2 py-0.5 text-[10px] text-foreground-muted">
                    <Sparkles className="h-3 w-3" />
                    새 질문
                  </span>
                )}
              </div>
              {q.audio_url && (
                <span className="shrink-0 text-foreground-muted">
                  <Volume2 className="h-4 w-4" />
                </span>
              )}
            </div>
            {q.question_korean && (
              <p className="text-sm font-medium leading-relaxed text-foreground">
                {q.question_korean}
              </p>
            )}
            <p className="text-xs leading-relaxed text-foreground-secondary">
              {q.question_english}
            </p>
            {q.is_active_type && progress?.last_attempt_at && (
              <div className="text-xs text-foreground-muted">
                최근 시도: {new Date(progress.last_attempt_at).toLocaleDateString("ko-KR")}
              </div>
            )}
            {isPickPending && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-surface/80">
                <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
