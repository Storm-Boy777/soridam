"use client";

// 기출 보관함 — 콤보 풀 가이드 (질문 카드 + AI 코치 + 토픽 빈도 메타)

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, ChevronRight, Play, Pause } from "lucide-react";
import { getComboBySig, getOrGenerateComboCache } from "@/lib/actions/opic-study";
import type { ApproachItem, StudyCategory } from "@/lib/types/opic-study";
import { useQuestionPlayer } from "@/lib/hooks/use-question-player";

const CATEGORY_LABEL: Record<StudyCategory, string> = {
  general: "일반",
  roleplay: "롤플레이",
  advance: "어드밴스",
};

interface Props {
  sig: string;
  category?: StudyCategory;
  topic?: string;
  onBack: () => void;
}

export function ComboDetail({ sig, category, topic, onBack }: Props) {
  // 콤보 메타 (질문 + 빈도) — groupId 미전달 → 학습 이력 가드 통과
  const { data: combo, isLoading: comboLoading } = useQuery({
    queryKey: ["exam-archive-combo-detail", sig, category],
    queryFn: async () => {
      const res = await getComboBySig({ sig, category });
      if (res.error) throw new Error(res.error);
      return res.data ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  // 풀 가이드 (캐시 또는 EF 생성)
  const { data: cache, isLoading: cacheLoading } = useQuery({
    queryKey: ["exam-archive-combo-cache", sig, category, topic],
    queryFn: async () => {
      const res = await getOrGenerateComboCache(sig, { category, topic });
      if (res.error) throw new Error(res.error);
      return res.data ?? null;
    },
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (comboLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-foreground-secondary">
        <Loader2 size={16} className="animate-spin" />
        콤보 상세를 불러오는 중...
      </div>
    );
  }

  if (!combo) {
    return (
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface px-6 py-16 text-center text-sm text-foreground-secondary">
        콤보를 찾을 수 없어요
      </div>
    );
  }

  const approachByIndex = new Map<number, ApproachItem>();
  if (cache?.approaches) {
    for (const a of cache.approaches) approachByIndex.set(a.question_index, a);
  }

  const topicCount = combo.total_in_category ?? 0;
  const totalSubs = combo.total_submissions ?? 0;
  const topicCategoryPct = totalSubs > 0 ? Math.round((topicCount / totalSubs) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      {/* 뒤로 가기 */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-bold text-foreground-secondary hover:bg-surface-secondary"
      >
        <ArrowLeft size={13} strokeWidth={1.8} />
        기출로 돌아가기
      </button>

      {/* 토픽·카테고리 빈도 메타 */}
      {totalSubs > 0 && topic && category && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-secondary px-4 py-2.5 text-sm text-foreground-secondary">
          <span className="font-bold text-foreground">
            {CATEGORY_LABEL[category]} · {topic}
          </span>
          <span className="text-foreground-muted">전체 {totalSubs}회 중</span>
          <span className="font-bold text-primary-600">
            {topicCount}회 출제 ({topicCategoryPct}%)
          </span>
        </div>
      )}

      {/* 통계 카드 — 3분할 */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-5">
        <div className="flex items-stretch justify-around gap-2">
          <Stat
            label="출제 횟수"
            value={`${combo.frequency}회`}
            sub={
              combo.total_in_category !== undefined
                ? `카테고리 ${combo.total_in_category}회 중`
                : undefined
            }
          />
          <div className="w-px shrink-0 self-stretch bg-border" aria-hidden="true" />
          <Stat label="카테고리 점유율" value={`${combo.appearance_pct}%`} />
          <div className="w-px shrink-0 self-stretch bg-border" aria-hidden="true" />
          <Stat label="질문 수" value={`${combo.questions.length}개`} />
        </div>
      </div>

      {/* AI 코치 한 줄 인사 */}
      {cache?.intro_text && (
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-primary-50 px-4 py-3.5 text-sm leading-relaxed text-foreground">
          <span className="text-lg" aria-hidden="true">🤖</span>
          <span>{cache.intro_text}</span>
        </div>
      )}

      {/* 캐시 로딩 중 */}
      {cacheLoading && !cache && (
        <div className="flex items-center justify-center gap-3 rounded-xl bg-surface-secondary px-4 py-4">
          <Loader2 size={16} className="animate-spin text-primary-500" />
          <span className="text-sm font-bold text-foreground-secondary">
            이 콤보의 가이드를 준비하고 있어요. 잠시만 기다려 주세요.
          </span>
        </div>
      )}

      {/* 질문 카드들 */}
      <div className="flex flex-col gap-3.5">
        {combo.questions.map((q, i) => {
          const approach = approachByIndex.get(i + 1);
          return (
            <ComboQuestionCard
              key={q.id}
              questionIdx={i + 1}
              english={q.question_english}
              korean={q.question_korean}
              short={q.question_short}
              approach={approach}
              appearancePct={q.appearance_pct}
              audioUrl={q.audio_url}
            />
          );
        })}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-center">
      <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted">
        {label}
      </span>
      <span className="text-xl font-extrabold tabular-nums leading-none text-foreground">
        {value}
      </span>
      {sub && (
        <span className="text-[11px] font-semibold tabular-nums leading-snug text-foreground-muted">
          {sub}
        </span>
      )}
    </div>
  );
}

function ComboQuestionCard({
  questionIdx,
  english,
  korean,
  short,
  approach,
  appearancePct,
  audioUrl,
}: {
  questionIdx: number;
  english: string;
  korean: string | null;
  short: string | null;
  approach?: ApproachItem;
  appearancePct: number;
  audioUrl: string | null;
}) {
  const audio = useQuestionPlayer();

  const togglePlay = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.stopPropagation?.();
    if (!audioUrl) return;
    if (audio.isPlaying) audio.reset();
    else audio.play(audioUrl);
  };

  return (
    <div className="flex flex-col gap-3.5 rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-sm">
      {/* 헤더 */}
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="inline-flex h-7 min-w-[40px] items-center justify-center rounded-md bg-surface-secondary px-2.5 text-[13px] font-extrabold tabular-nums text-foreground-secondary">
          Q{questionIdx}
        </span>
        {approach?.type_label && (
          <span className="inline-flex shrink-0 items-center rounded-full bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary-600">
            {approach.type_label}
          </span>
        )}
        {(short || korean) && (
          <span className="min-w-0 flex-1 text-sm font-semibold leading-relaxed text-foreground">
            {short ?? korean}
          </span>
        )}
        <span
          className={`shrink-0 text-xs tabular-nums text-foreground-muted ${
            short || korean ? "" : "ml-auto"
          }`}
        >
          카테고리 점유율 {appearancePct}%
        </span>
      </div>

      {/* 영어 원문 + 우상단 ▶ */}
      <div
        role={audioUrl ? "button" : undefined}
        tabIndex={audioUrl ? 0 : undefined}
        onClick={audioUrl ? togglePlay : undefined}
        onKeyDown={
          audioUrl
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  togglePlay(e);
                }
              }
            : undefined
        }
        aria-label={
          audioUrl ? (audio.isPlaying ? "재생 일시정지" : "영어로 듣기") : undefined
        }
        className={`relative overflow-hidden rounded-lg text-sm italic leading-relaxed text-foreground transition-colors ${
          audioUrl ? "cursor-pointer" : "cursor-default"
        } ${audio.isPlaying ? "bg-primary-50" : "bg-surface-secondary"} ${
          audioUrl ? "py-3.5 pl-4 pr-14" : "px-3.5 py-3"
        }`}
      >
        “{english}”

        {audioUrl && (
          <button
            type="button"
            onClick={togglePlay}
            aria-label={audio.isPlaying ? "일시정지" : "영어로 듣기"}
            title={audio.isPlaying ? "일시정지" : "영어로 듣기"}
            className={`absolute right-2.5 top-2.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary-500 transition-colors ${
              audio.isPlaying
                ? "bg-primary-500 text-white shadow-[0_0_0_4px_rgba(58,91,199,0.15)]"
                : "bg-white text-primary-600 hover:bg-primary-50"
            }`}
          >
            {audio.isPlaying ? (
              <Pause size={13} strokeWidth={2.2} fill="currentColor" />
            ) : (
              <Play size={13} strokeWidth={2.2} fill="currentColor" />
            )}
          </button>
        )}

        {audioUrl && audio.isPlaying && (
          <div
            aria-hidden="true"
            className="absolute bottom-0 left-0 right-0 h-[3px] bg-border"
          >
            <div
              className="h-full bg-primary-500 transition-[width] duration-100 ease-linear"
              style={{ width: `${audio.playbackProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* 유형별 풀 가이드 */}
      {approach && (
        <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-gradient-to-br from-primary-50 to-surface p-4">
          <div className="flex items-center gap-1.5 text-sm font-bold text-primary-600">
            💡 이 질문은 이렇게 답해요
          </div>
          <p className="m-0 text-sm leading-relaxed text-foreground">
            {approach.approach}
          </p>

          {/* 답변 흐름 */}
          {approach.answer_flow.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted">
                흐름
              </span>
              {approach.answer_flow.map((step, i) => (
                <span key={i} className="inline-flex items-center gap-1">
                  <span className="rounded-md border border-border bg-surface px-2 py-0.5 font-semibold text-foreground">
                    {step}
                  </span>
                  {i < approach.answer_flow.length - 1 && (
                    <ChevronRight
                      size={12}
                      strokeWidth={1.6}
                      className="text-foreground-muted"
                      aria-hidden="true"
                    />
                  )}
                </span>
              ))}
            </div>
          )}

          {/* 핵심 포인트 */}
          {approach.key_points.length > 0 && (
            <div>
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-foreground-muted">
                놓치면 안 되는 포인트
              </div>
              <ul className="m-0 flex flex-col gap-0.5 pl-4 text-[13px] leading-relaxed text-foreground-secondary [list-style:disc]">
                {approach.key_points.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 권장 길이 */}
          <div className="flex items-center gap-2 text-[11px] tabular-nums text-foreground-muted">
            <span>권장 길이</span>
            <span className="font-bold text-foreground-secondary">
              {approach.recommended_word_min}~{approach.recommended_word_max} 단어
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
