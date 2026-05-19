"use client";

// 토픽 선택 — 선택형 / 공통형 그룹핑
// 유형별 탭(TypeBrowser) 내부에 임베드 — 클릭 시 콜백으로 상위에 알림 (네비게이션 X)
//
// 묘사(description) 유형 + 공통형 13 토픽은 자료 #11~#14 강사 4 그룹(시사/환경/산업·기술/개인)으로
// 추가 분류. 같은 spec(description_random_{group})을 공유하는 토픽끼리 시각적으로 묶어
// 학습 효과를 높임 (마이그 081 + 082 정합).

import { useQuery } from "@tanstack/react-query";
import { TOPIC_ICONS } from "@/components/reviews/submit/topic-pagination";
import {
  Folder,
  ListChecks,
  Shuffle,
  CheckCircle2,
  Loader2,
  TrendingUp,
  Building2,
  Leaf,
  Cpu,
  Users,
} from "lucide-react";
import { getTopicsByType } from "@/lib/actions/coaching";
import type { QuestionType, TopicCard } from "@/lib/types/coaching";

interface Props {
  type: QuestionType;
  selectedTopic: string | null;
  onPickTopic: (topic: string) => void;
}

// 자료 #11~#14 강사 4 그룹 분류 — EF resolveSpecId 매칭과 동일
// (supabase/functions/coaching-evaluate/index.ts RANDOM_TOPICS_ALL와 정합)
//
// 강사 직접 명시 13 토픽 + DB 실 토픽 16개 확장 = 28 토픽을 4 그룹으로 매핑.
// 추가 토픽은 그룹 본질(시사=공공·생활 서비스 / 환경=자연·시간 / 산업기술=기기·회사 / 개인=일상·관계)에 맞춰 분류.
// 강사 직접 모범이 있는 13 토픽은 topic_skeleton(082) row 존재 — 추가 16 토픽은 그룹 spec(081)만 적용.
const TEACHER_CANON_TOPICS = new Set([
  "은행", "호텔", "음식점", "교통",
  "재활용", "지형", "날씨",
  "산업", "기술",
  "모임", "휴일", "자유시간",
]);

const COMMON_GROUPS = [
  {
    id: "current_affairs",
    label: "시사·생활 서비스",
    description: "어휘 격상 매트릭스 + 디지털 대체",
    topics: ["은행", "호텔", "음식점", "교통", "미용실", "병원", "치과", "약국", "약속", "예약"],
    icon: Building2,
    accentClass: "text-sky-600",
    bgClass: "bg-sky-50",
    borderClass: "border-sky-200",
  },
  {
    id: "environment",
    label: "환경",
    description: "Cohesive 6 카테고리 + 토론적 마무리",
    topics: ["재활용", "지형", "날씨"],
    icon: Leaf,
    accentClass: "text-emerald-600",
    bgClass: "bg-emerald-50",
    borderClass: "border-emerald-200",
  },
  {
    id: "industry_tech",
    label: "산업·기술·기기",
    description: "Breath of Vocabulary + 시장 점유율 정량화",
    topics: ["산업", "기술", "전화기", "가전제품", "인터넷", "선호회사"],
    icon: Cpu,
    accentClass: "text-violet-600",
    bgClass: "bg-violet-50",
    borderClass: "border-violet-200",
  },
  {
    id: "personal",
    label: "개인·일상",
    description: "양면 토론 5단 + 가족 emphasis",
    topics: ["모임", "휴일", "자유시간", "가족/친구", "음식", "패션", "건강", "가구", "직장"],
    icon: Users,
    accentClass: "text-amber-600",
    bgClass: "bg-amber-50",
    borderClass: "border-amber-200",
  },
] as const;

const TOPIC_TO_GROUP: Record<string, string> = COMMON_GROUPS.reduce(
  (acc, g) => {
    g.topics.forEach((t) => (acc[t] = g.id));
    return acc;
  },
  {} as Record<string, string>,
);

export function TopicSelector({ type, selectedTopic, onPickTopic }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["coaching-topics-by-type", type],
    queryFn: async () => {
      const r = await getTopicsByType(type);
      if (r.error) throw new Error(r.error);
      return r.data ?? { selective: [], common: [] };
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

  const selective = data?.selective ?? [];
  const common = data?.common ?? [];

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
      <section>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground-secondary">
          <ListChecks className="h-4 w-4 text-foreground-muted" />
          <span>선택형 ({selective.length}) — 백그라운드 서베이</span>
        </div>
        <TopicGrid topics={selective} selectedTopic={selectedTopic} onPick={onPickTopic} />
      </section>

      {/* 공통형 (돌발) — 묘사 유형이면 자료 #11~#14 강사 4 그룹으로 분류 */}
      {type === "description" ? (
        <CommonGroupedSections common={common} selectedTopic={selectedTopic} onPick={onPickTopic} />
      ) : (
        <section>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground-secondary">
            <Shuffle className="h-4 w-4 text-foreground-muted" />
            <span>공통형 ({common.length}) — 돌발</span>
          </div>
          <TopicGrid topics={common} selectedTopic={selectedTopic} onPick={onPickTopic} />
        </section>
      )}
    </div>
  );
}

// 묘사 유형 공통형(돌발) — 자료 #11~#14 강사 4 그룹 (시사/환경/산업·기술/개인) 분류
function CommonGroupedSections({
  common,
  selectedTopic,
  onPick,
}: {
  common: TopicCard[];
  selectedTopic: string | null;
  onPick: (topic: string) => void;
}) {
  // 토픽을 그룹별로 분류
  const grouped: Record<string, TopicCard[]> = {};
  const ungrouped: TopicCard[] = [];
  common.forEach((t) => {
    const groupId = TOPIC_TO_GROUP[t.topic];
    if (groupId) {
      (grouped[groupId] ??= []).push(t);
    } else {
      ungrouped.push(t);
    }
  });

  return (
    <section>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground-secondary">
        <Shuffle className="h-4 w-4 text-foreground-muted" />
        <span>공통형 ({common.length}) — 돌발 · 강사 4 그룹</span>
      </div>
      <div className="mb-3 rounded-xl border border-border bg-surface-secondary/50 px-3 py-2.5 text-xs leading-relaxed text-foreground-secondary">
        같은 그룹 안의 토픽은 <strong className="font-semibold text-foreground">동일한 그룹 코칭 spec</strong>을 공유해요.
        그룹별로 격상 카드(어휘 매트릭스 / 토론 마무리 / 정량화 / 양면 토론)가 다르게 적용됩니다.
        <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
          ★
        </span>
        <span className="ml-1">표시는 강사 자료 #11~#14 직접 모범 풀 모범이 있는 토픽이에요.</span>
      </div>

      <div className="space-y-4">
        {COMMON_GROUPS.map((g) => {
          const topics = grouped[g.id] ?? [];
          if (topics.length === 0) return null;
          const Icon = g.icon;
          return (
            <div
              key={g.id}
              className={`overflow-hidden rounded-xl border ${g.borderClass} bg-surface`}
            >
              <div
                className={`flex items-center gap-2 ${g.bgClass} px-3 py-2`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${g.accentClass}`} />
                <div className="flex min-w-0 flex-1 items-baseline gap-2">
                  <span className={`text-xs font-bold ${g.accentClass}`}>
                    {g.label}
                  </span>
                  <span className="text-[10px] text-foreground-secondary">
                    ({topics.length})
                  </span>
                  <span className="truncate text-[10px] text-foreground-muted">
                    {g.description}
                  </span>
                </div>
              </div>
              <div className="p-2.5">
                <TopicGrid topics={topics} selectedTopic={selectedTopic} onPick={onPick} />
              </div>
            </div>
          );
        })}

        {ungrouped.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="flex items-center gap-2 bg-surface-secondary/60 px-3 py-2">
              <Folder className="h-4 w-4 shrink-0 text-foreground-muted" />
              <div className="flex min-w-0 flex-1 items-baseline gap-2">
                <span className="text-xs font-bold text-foreground-secondary">
                  기타
                </span>
                <span className="text-[10px] text-foreground-muted">
                  ({ungrouped.length}) · 강사 4 그룹 외
                </span>
              </div>
            </div>
            <div className="p-2.5">
              <TopicGrid topics={ungrouped} selectedTopic={selectedTopic} onPick={onPick} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function TopicGrid({
  topics,
  selectedTopic,
  onPick,
}: {
  topics: TopicCard[];
  selectedTopic: string | null;
  onPick: (topic: string) => void;
}) {
  if (topics.length === 0) {
    return <p className="px-2 py-3 text-sm text-foreground-muted">결과 없음</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {topics.map((t) => {
        const mastered = t.user_progress?.mastered;
        const inProgress = t.user_progress?.in_progress_session_id;
        const active = selectedTopic === t.topic;
        const Icon = TOPIC_ICONS[t.topic] ?? Folder;
        const isCanon = TEACHER_CANON_TOPICS.has(t.topic);
        return (
          <button
            key={t.topic}
            type="button"
            onClick={() => onPick(t.topic)}
            className={`relative flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition ${
              active
                ? "border-primary-400 bg-primary-50 ring-1 ring-primary-200"
                : mastered
                  ? "border-primary-300 bg-primary-50 hover:border-primary-500"
                  : inProgress
                    ? "border-accent-300 bg-accent-50 hover:border-accent-500"
                    : "border-border bg-surface hover:border-primary-300 hover:bg-surface-hover"
            }`}
          >
            {isCanon && (
              <span
                className="absolute right-1 top-1 text-amber-500"
                title="강사 자료 #11~#14 직접 모범 풀 모범 토픽"
              >
                ★
              </span>
            )}
            <Icon
              size={18}
              className={
                mastered
                  ? "text-primary-600"
                  : inProgress
                    ? "text-accent-600"
                    : "text-foreground-secondary"
              }
            />
            <span className="text-sm font-semibold text-foreground">{t.topic}</span>
            <div className="flex items-center gap-1 text-[10px] text-foreground-muted">
              {mastered ? (
                <span className="flex items-center gap-0.5 rounded-full bg-primary-100 px-1.5 py-0.5 font-semibold text-primary-700">
                  <CheckCircle2 className="h-3 w-3" />
                  졸업
                </span>
              ) : inProgress ? (
                <span className="rounded-full bg-accent-100 px-1.5 py-0.5 font-semibold text-accent-700">
                  진행중 {t.user_progress?.attempt_count ?? 0}회
                </span>
              ) : (
                <span>새 토픽</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
