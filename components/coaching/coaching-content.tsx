"use client";

// 스피킹 코치 메인 — 모의고사형 허브
//   이어하기 배너 + 학습 진행 과정 안내 + 2탭(유형별/주제별)

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { LayoutGrid, FolderTree, ChevronRight, RotateCcw, ArrowRight } from "lucide-react";
import { getTypeCards, getResumableSessions } from "@/lib/actions/coaching";
import { QUESTION_TYPE_LABELS } from "@/lib/types/coaching";
import type { TypeCard, QuestionType, ResumableSession } from "@/lib/types/coaching";
import { TypeBrowser } from "@/components/coaching/type-browser";
import { CategoryBrowser } from "@/components/coaching/category-browser";

type TabKey = "type" | "topic";

interface Props {
  initialTypeCards: TypeCard[];
  initialResumable: ResumableSession[];
  initialError?: string;
}

// 학습 진행 과정 4단계
const PROCESS_STEPS = [
  { n: 1, title: "유형·주제 선택", desc: "실제 기출문제를 선택" },
  { n: 2, title: "답변 녹음", desc: "질문에 내 목소리로 답변" },
  { n: 3, title: "1:1 밀착 코칭", desc: "코치가 개선점을 짚고 시범" },
  { n: 4, title: "반복 교정 → 졸업", desc: "개선점이 줄면 토픽 졸업" },
];

export function CoachingContent({ initialTypeCards, initialResumable, initialError }: Props) {
  const searchParams = useSearchParams();
  const preType = (searchParams.get("type") as QuestionType | null) ?? null;
  const preTopic = searchParams.get("topic");
  const [tab, setTab] = useState<TabKey>("type");

  const { data: cards } = useQuery({
    queryKey: ["coaching-type-cards"],
    queryFn: async () => {
      const r = await getTypeCards();
      if (r.error) throw new Error(r.error);
      return r.data ?? [];
    },
    initialData: initialTypeCards,
    staleTime: 60 * 1000,
  });

  if (initialError) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-foreground-secondary">
        오류: {initialError}
      </div>
    );
  }

  return (
    <div>
      {/* 진행 중인 학습 이어하기 배너 */}
      <ResumeBanner initialResumable={initialResumable} />

      {/* 학습 진행 과정 안내 */}
      <ProcessCard />

      {/* 탭 네비게이션 */}
      <div className="mb-4 flex border-b border-border sm:mb-6">
        <TabButton
          active={tab === "type"}
          onClick={() => setTab("type")}
          icon={<LayoutGrid className="h-4 w-4 shrink-0" />}
          label="유형별"
        />
        <TabButton
          active={tab === "topic"}
          onClick={() => setTab("topic")}
          icon={<FolderTree className="h-4 w-4 shrink-0" />}
          label="주제별"
        />
      </div>

      {tab === "type" ? (
        <TypeBrowser cards={cards} preType={preType} preTopic={preTopic} />
      ) : (
        <CategoryBrowser />
      )}
    </div>
  );
}

// ── 이어하기 배너 ──

function ResumeBanner({ initialResumable }: { initialResumable: ResumableSession[] }) {
  const { data: sessions = [] } = useQuery({
    queryKey: ["coaching-resumable"],
    queryFn: async () => {
      const r = await getResumableSessions();
      if (r.error) throw new Error(r.error);
      return r.data ?? [];
    },
    initialData: initialResumable,
    staleTime: 30 * 1000,
  });

  if (sessions.length === 0) return null;
  const latest = sessions[0];
  const label = QUESTION_TYPE_LABELS[latest.question_type] ?? latest.question_type;

  return (
    <div className="mb-4 rounded-2xl border border-primary-200 bg-primary-50/50 p-4 sm:mb-6">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <RotateCcw className="h-5 w-5 shrink-0 text-primary-500" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">진행 중인 학습이 있어요</p>
            <p className="text-xs text-foreground-secondary">
              {label} · {latest.topic} · {latest.attempt_count}회차
              {sessions.length > 1 && ` · 외 ${sessions.length - 1}개`}
            </p>
          </div>
        </div>
        <Link
          href={`/coaching/learn/${latest.session_id}`}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
        >
          이어하기
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

// ── 학습 진행 과정 카드 ──

function ProcessCard() {
  return (
    <div className="mb-4 rounded-2xl border border-border bg-surface p-4 sm:mb-6 sm:p-6">
      <h3 className="text-sm font-semibold text-foreground sm:text-base">학습 진행 과정</h3>
      <p className="mt-0.5 text-xs text-foreground-secondary sm:text-sm">
        답변하고 1:1 밀착 코칭으로 말하기 습관을 반복 교정합니다
      </p>

      {/* 모바일 세로 */}
      <div className="relative mt-4 sm:hidden">
        {PROCESS_STEPS.map((s, i) => (
          <div key={s.n} className="relative flex gap-3 pb-4 last:pb-0">
            {i < PROCESS_STEPS.length - 1 && (
              <div className="absolute bottom-0 left-3.5 top-7 w-px bg-border" />
            )}
            <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-border bg-surface-secondary text-xs font-bold text-foreground-muted">
              {s.n}
            </div>
            <div className="pt-0.5">
              <p className="text-sm font-semibold text-foreground">{s.title}</p>
              <p className="text-xs text-foreground-secondary">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* PC 가로 — 단계 사이 화살표 */}
      <div className="mt-6 hidden sm:grid sm:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] sm:items-center sm:gap-3">
        {PROCESS_STEPS.flatMap((s, i) => [
          <div key={s.n} className="flex flex-col items-center text-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-border bg-surface-secondary text-sm font-bold text-foreground-muted">
              {s.n}
            </div>
            <p className="mt-2 text-sm font-semibold text-foreground">{s.title}</p>
            <p className="mt-0.5 text-xs text-foreground-secondary">{s.desc}</p>
          </div>,
          ...(i < PROCESS_STEPS.length - 1
            ? [
                <div key={`arrow-${i}`}>
                  <ChevronRight size={20} className="text-foreground-muted" />
                </div>,
              ]
            : []),
        ])}
      </div>
    </div>
  );
}

// ── 탭 버튼 ──

function TabButton({
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
      className={`relative flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-medium transition-colors sm:gap-2 sm:px-6 sm:text-sm ${
        active ? "text-primary-600" : "text-foreground-muted hover:text-foreground-secondary"
      }`}
    >
      {icon}
      <span className="truncate">{label}</span>
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary-500" />
      )}
    </button>
  );
}
