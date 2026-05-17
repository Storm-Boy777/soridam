"use client";

// 유형별 탭 — 유형 → 토픽 → 질문 (한 페이지 누적 펼침, 주제별 탭과 동일 패턴)

import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Image as ImageIcon,
  RefreshCw,
  GitCompare,
  Baby,
  Calendar,
  Star,
  TrendingUp,
  Newspaper,
  HelpCircle,
  Wrench,
  Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getQuestionsByTopicAndType } from "@/lib/actions/coaching";
import { TopicSelector } from "@/components/coaching/topic-selector";
import { QuestionList } from "@/components/coaching/question-list";
import type { TypeCard, QuestionType } from "@/lib/types/coaching";

const TYPE_ICONS: Record<string, LucideIcon> = {
  description: ImageIcon,
  routine: RefreshCw,
  comparison: GitCompare,
  past_childhood: Baby,
  past_recent: Calendar,
  past_special: Star,
  adv_14: TrendingUp,
  adv_15: Newspaper,
  rp_11: HelpCircle,
  rp_12: Wrench,
};

const TYPE_COLORS: Record<string, string> = {
  description: "text-blue-600",
  routine: "text-green-600",
  comparison: "text-purple-600",
  past_childhood: "text-rose-600",
  past_recent: "text-orange-600",
  past_special: "text-amber-600",
  adv_14: "text-red-600",
  adv_15: "text-pink-600",
  rp_11: "text-teal-600",
  rp_12: "text-indigo-600",
};

interface Props {
  cards: TypeCard[];
  preType: QuestionType | null;
  preTopic: string | null;
}

export function TypeBrowser({ cards, preType, preTopic }: Props) {
  // 자기소개 제외, 본문 10유형
  const bodyTypes = cards.filter((c) => c.question_type !== "self_intro");

  // preType이 활성 유형일 때만 초기 선택 복원 (학습룸 "다른 질문" 복귀용)
  const validPre =
    preType && bodyTypes.some((c) => c.question_type === preType && c.is_active)
      ? preType
      : null;
  const [selectedType, setSelectedType] = useState<QuestionType | null>(validPre);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(
    validPre ? preTopic : null
  );

  const selectedCard = bodyTypes.find((c) => c.question_type === selectedType);

  // 다음 단계 영역이 펼쳐지면 자동으로 위로 스크롤 (선택 직후 인지 향상)
  const topicSectionRef = useRef<HTMLElement>(null);
  const questionSectionRef = useRef<HTMLElement>(null);
  const skipInitialScroll = useRef(true);

  useEffect(() => {
    if (skipInitialScroll.current) return;
    if (selectedType) {
      topicSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedType]);

  useEffect(() => {
    if (skipInitialScroll.current) {
      skipInitialScroll.current = false;
      return;
    }
    if (selectedTopic) {
      questionSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedTopic]);

  return (
    <div className="space-y-5">
      {/* ① 유형 선택 */}
      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="mb-3 text-sm font-semibold text-foreground-secondary">
          ① 유형 선택 (10유형)
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bodyTypes.map((card) => (
            <TypeCardItem
              key={card.question_type}
              card={card}
              active={selectedType === card.question_type}
              onSelect={() => {
                setSelectedType(card.question_type);
                setSelectedTopic(null);
              }}
            />
          ))}
        </div>
      </section>

      {/* ② 주제 선택 */}
      {selectedType && selectedCard && (
        <section
          ref={topicSectionRef}
          className="scroll-mt-24 rounded-2xl border border-border bg-surface p-5 sm:p-6"
        >
          <div className="mb-3 text-sm font-semibold text-foreground-secondary">
            ② 주제 선택 — {selectedCard.label}
          </div>
          <TopicSelector
            type={selectedType}
            selectedTopic={selectedTopic}
            onPickTopic={(t) => setSelectedTopic(t)}
          />
        </section>
      )}

      {/* ③ 질문 선택 */}
      {selectedType && selectedTopic && (
        <section
          ref={questionSectionRef}
          className="scroll-mt-24 rounded-2xl border border-border bg-surface p-5 sm:p-6"
        >
          <div className="mb-3 text-sm font-semibold text-foreground-secondary">
            ③ 질문 선택 — {selectedTopic}
          </div>
          <TypeQuestionList type={selectedType} topic={selectedTopic} />
        </section>
      )}
    </div>
  );
}

// ── 유형 카드 ──

function TypeCardItem({
  card,
  active,
  onSelect,
}: {
  card: TypeCard;
  active: boolean;
  onSelect: () => void;
}) {
  const Icon = TYPE_ICONS[card.question_type] ?? ImageIcon;
  const iconColor = TYPE_COLORS[card.question_type] ?? "text-foreground-secondary";
  const masteredCount = card.user_progress?.topics_mastered_count ?? 0;
  const typeMastered = card.user_progress?.type_mastered ?? false;

  if (!card.is_active) {
    return (
      <div className="flex flex-col gap-1 rounded-xl border border-border bg-surface-secondary p-4 opacity-60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon size={16} className="text-foreground-muted" />
            <span className="text-base font-semibold text-foreground-secondary">{card.label}</span>
          </div>
          <span className="rounded-full bg-foreground-muted/20 px-2 py-0.5 text-xs text-foreground-muted">
            준비 중
          </span>
        </div>
        <p className="text-xs text-foreground-muted">{card.description}</p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group flex flex-col gap-2 rounded-xl border p-4 text-left transition ${
        active
          ? "border-primary-400 bg-primary-50 ring-1 ring-primary-200"
          : "border-border bg-surface hover:border-primary-300 hover:shadow-card"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={18} className={iconColor} />
          <span className="text-base font-semibold text-foreground group-hover:text-primary-600">
            {card.label}
          </span>
        </div>
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
            <span>
              최근 학습: {new Date(card.user_progress.last_session_at).toLocaleDateString("ko-KR")}
            </span>
          </>
        )}
      </div>
    </button>
  );
}

// ── 질문 리스트 (선택된 토픽) ──

function TypeQuestionList({ type, topic }: { type: QuestionType; topic: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["coaching-type-questions", type, topic],
    queryFn: async () => {
      const r = await getQuestionsByTopicAndType(type, topic);
      if (r.error) throw new Error(r.error);
      return r.data ?? null;
    },
    staleTime: 0,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!data || data.questions.length === 0) {
    return <p className="py-3 text-sm text-foreground-muted">질문이 없습니다</p>;
  }

  return <QuestionList payload={data} />;
}
