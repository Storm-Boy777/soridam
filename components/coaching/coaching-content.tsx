"use client";

// AI 코치 메인 — Step 1: 유형 카드 그리드
// 자기소개 별도 영역 + 본문 10유형 그리드

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getTypeCards } from "@/lib/actions/coaching";
import type { TypeCard } from "@/lib/types/coaching";

interface Props {
  initialTypeCards: TypeCard[];
  initialError?: string;
}

export function CoachingContent({ initialTypeCards, initialError }: Props) {
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

  const selfIntro = cards.find((c) => c.question_type === "self_intro");
  const bodyTypes = cards.filter((c) => c.question_type !== "self_intro");

  return (
    <div className="space-y-6">
      {/* 시험 도입 영역 */}
      {selfIntro && (
        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground-secondary">
            <span>📌</span>
            <span>시험 도입</span>
          </div>
          <TypeCardItem card={selfIntro} />
        </section>
      )}

      {/* 시험 본문 영역 */}
      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground-secondary">
          <span>📝</span>
          <span>시험 본문 (10유형)</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bodyTypes.map((card) => (
            <TypeCardItem key={card.question_type} card={card} />
          ))}
        </div>
      </section>

      {/* 안내 */}
      <div className="rounded-2xl border border-border bg-surface-secondary p-4 text-sm text-foreground-secondary">
        <p className="mb-1 font-medium text-foreground">💡 학습 방식</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>유형 선택 → 주제(토픽) 선택 → 본인 답변 → 강사 톤 1:1 코칭</li>
          <li>같은 토픽 N회 반복으로 흠 0~1 수렴 시 토픽 졸업</li>
          <li>같은 유형의 5개 토픽 졸업 시 체화 완료</li>
        </ul>
      </div>
    </div>
  );
}

function TypeCardItem({ card }: { card: TypeCard }) {
  const masteredCount = card.user_progress?.topics_mastered_count ?? 0;
  const typeMastered = card.user_progress?.type_mastered ?? false;

  if (!card.is_active) {
    return (
      <div className="flex flex-col gap-1 rounded-xl border border-border bg-surface-secondary p-4 opacity-60">
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold text-foreground-secondary">{card.label}</span>
          <span className="rounded-full bg-foreground-muted/20 px-2 py-0.5 text-xs text-foreground-muted">
            준비 중
          </span>
        </div>
        <p className="text-xs text-foreground-muted">{card.description}</p>
      </div>
    );
  }

  // 자기소개는 별도 흐름 (강의 없음, 사전 작성·암기). MVP에선 미연결.
  if (card.question_type === "self_intro") {
    return (
      <div className="flex items-center justify-between rounded-xl border border-border bg-surface-secondary p-4 opacity-70">
        <div>
          <div className="text-base font-semibold text-foreground">{card.label}</div>
          <p className="text-xs text-foreground-muted">{card.description}</p>
        </div>
        <span className="rounded-full bg-foreground-muted/20 px-2 py-0.5 text-xs text-foreground-muted">
          별도 흐름
        </span>
      </div>
    );
  }

  return (
    <Link
      href={`/coaching/topic/${card.question_type}`}
      className="group flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 transition hover:border-primary-300 hover:shadow-card"
    >
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold text-foreground group-hover:text-primary-600">
          {card.label}
        </span>
        {typeMastered && (
          <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-700">
            마스터
          </span>
        )}
      </div>
      <p className="text-xs text-foreground-secondary">{card.description}</p>
      <div className="mt-1 flex items-center gap-2 text-xs text-foreground-muted">
        <span>토픽 졸업: {masteredCount}개</span>
        {card.user_progress?.last_session_at && (
          <>
            <span>·</span>
            <span>최근 학습: {new Date(card.user_progress.last_session_at).toLocaleDateString("ko-KR")}</span>
          </>
        )}
      </div>
    </Link>
  );
}
