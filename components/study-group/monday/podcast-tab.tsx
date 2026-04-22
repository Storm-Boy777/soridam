"use client";

import { useState } from "react";
import { ExternalLink, ChevronRight, ChevronLeft, Lightbulb, MessageSquare, Headphones, Volume2, HelpCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { STUDY_FLOW_STEPS } from "@/lib/constants/study-group";
import { fetchPodcasts } from "@/lib/actions/study-group";
import { ActivityTimer } from "../activity-timer";
import type { PodcastRow, StudyFlowStep } from "@/lib/types/study-group";

/* ── 난이도 뱃지 ── */
const difficultyColors: Record<string, string> = {
  beginner: "bg-green-50 text-green-700",
  intermediate: "bg-blue-50 text-blue-700",
  advanced: "bg-purple-50 text-purple-700",
};
const difficultyLabels: Record<string, string> = {
  beginner: "초급",
  intermediate: "중급",
  advanced: "고급",
};

/* ── Phase 아이콘 ── */
const phaseIcons = [Lightbulb, Volume2, Headphones, HelpCircle, MessageSquare];

export function PodcastTab() {
  const { data: episodes = [], isLoading } = useQuery({
    queryKey: ["study-podcasts"],
    queryFn: fetchPodcasts,
    staleTime: 5 * 60 * 1000,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState(0); // 0 = 에피소드 선택 화면, 1~5 = Phase

  const selectedEpisode = episodes.find((e) => e.id === selectedId) ?? episodes[0] ?? null;

  // 로딩 중
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  // 데이터 없음
  if (episodes.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <p className="text-sm text-foreground-muted">등록된 팟캐스트가 없습니다.</p>
      </div>
    );
  }

  // Phase 0: 에피소드 선택
  if (currentPhase === 0) {
    return (
      <div className="space-y-6">
        {/* 안내 */}
        <div className="rounded-xl border border-primary-100 bg-primary-50/50 p-4">
          <p className="text-sm text-primary-700">
            <strong>진행 방법:</strong> 에피소드를 선택한 후 &apos;스터디 시작&apos;을 누르면 5단계 진행 가이드가 표시됩니다.
            사전에 팟캐스트를 듣고 오면 더 효과적이에요!
          </p>
        </div>

        {/* 에피소드 목록 */}
        <div className="grid gap-3 sm:grid-cols-2">
          {episodes.map((ep) => (
            <button
              key={ep.id}
              onClick={() => setSelectedId(ep.id)}
              className={`rounded-xl border p-4 text-left transition-all ${
                selectedEpisode.id === ep.id
                  ? "border-primary-500 bg-primary-50/30 ring-1 ring-primary-500"
                  : "border-border bg-surface hover:border-primary-200 hover:bg-surface-secondary"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">{ep.title}</h3>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${difficultyColors[ep.difficulty]}`}>
                  {difficultyLabels[ep.difficulty]}
                </span>
              </div>
              <p className="mt-1 text-xs text-foreground-secondary">{ep.source} · {ep.duration}</p>
              <p className="mt-1.5 line-clamp-2 text-xs text-foreground-muted">{ep.description}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="rounded bg-surface-secondary px-1.5 py-0.5 text-[10px] text-foreground-secondary">{ep.topic}</span>
                <span className="rounded bg-surface-secondary px-1.5 py-0.5 text-[10px] text-foreground-secondary">표현 {ep.key_expressions.length}개</span>
              </div>
            </button>
          ))}
        </div>

        {/* 선택된 에피소드 상세 + 시작 버튼 */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">{selectedEpisode.title}</h3>
              <p className="text-sm text-foreground-secondary">{selectedEpisode.source} · {selectedEpisode.duration}</p>
            </div>
            <a
              href={selectedEpisode.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground-secondary hover:bg-surface-secondary transition-colors"
            >
              팟캐스트 열기 <ExternalLink size={12} />
            </a>
          </div>
          <button
            onClick={() => setCurrentPhase(1)}
            className="mt-4 w-full rounded-full bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
          >
            스터디 시작
          </button>
        </div>
      </div>
    );
  }

  // Phase 1~5: 진행 가이드
  const step = STUDY_FLOW_STEPS[currentPhase - 1];
  const PhaseIcon = phaseIcons[currentPhase - 1];

  return (
    <div className="space-y-6">
      {/* 상단: 에피소드 + Phase 진행 바 */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">{selectedEpisode.title}</p>
          <button
            onClick={() => setCurrentPhase(0)}
            className="text-xs text-foreground-muted hover:text-foreground-secondary transition-colors"
          >
            에피소드 변경
          </button>
        </div>
        {/* Phase 인디케이터 */}
        <div className="mt-3 flex gap-1">
          {STUDY_FLOW_STEPS.map((s, i) => (
            <button
              key={s.phase}
              onClick={() => setCurrentPhase(i + 1)}
              className={`flex-1 rounded-full py-1 text-[10px] font-medium transition-colors ${
                i + 1 === currentPhase
                  ? "bg-primary-500 text-white"
                  : i + 1 < currentPhase
                    ? "bg-primary-100 text-primary-600"
                    : "bg-surface-secondary text-foreground-muted"
              }`}
            >
              {s.phase}
            </button>
          ))}
        </div>
      </div>

      {/* 현재 Phase 카드 */}
      <div className="rounded-xl border border-primary-200 bg-primary-50/30 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-500 text-white">
            <PhaseIcon size={20} />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Phase {step.phase}: {step.name}</h3>
            <p className="text-xs text-foreground-secondary">{step.nameEn} · {step.duration}</p>
          </div>
        </div>
        <p className="mb-6 text-sm text-foreground-secondary">{step.description}</p>

        {/* Phase별 콘텐츠 */}
        <PhaseContent phase={currentPhase} episode={selectedEpisode} step={step} />
      </div>

      {/* 네비게이션 */}
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentPhase((p) => Math.max(1, p - 1))}
          disabled={currentPhase === 1}
          className="flex items-center gap-1 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface-secondary disabled:opacity-30 transition-colors"
        >
          <ChevronLeft size={16} /> 이전
        </button>
        {currentPhase < 5 ? (
          <button
            onClick={() => setCurrentPhase((p) => p + 1)}
            className="flex items-center gap-1 rounded-full bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors"
          >
            다음 <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={() => setCurrentPhase(0)}
            className="flex items-center gap-1 rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
          >
            스터디 완료
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Phase별 콘텐츠 ── */

function PhaseContent({ phase, episode, step }: { phase: number; episode: PodcastRow; step: StudyFlowStep }) {
  const [showKorean, setShowKorean] = useState(false);

  switch (phase) {
    case 1: // Warm-up
      return (
        <div className="space-y-4">
          <div className="rounded-lg bg-surface p-4 text-center">
            <p className="text-lg font-medium text-foreground">&ldquo;{episode.warmup_question}&rdquo;</p>
          </div>
          <p className="text-center text-xs text-foreground-muted">돌아가며 아이스브레이커 질문에 답변하세요</p>
          <ActivityTimer presets={[60, 120, 180]} />
        </div>
      );

    case 2: // Key Expressions
      return (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={() => setShowKorean(!showKorean)}
              className="text-xs text-primary-600 hover:text-primary-700 transition-colors"
            >
              {showKorean ? "한국어 숨기기" : "한국어 보기"}
            </button>
          </div>
          {episode.key_expressions.map((expr, i) => (
            <div key={i} className="rounded-lg border border-border bg-surface p-3">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-bold text-primary-500">{i + 1}</span>
                <span className="font-semibold text-foreground">{expr.english}</span>
                {showKorean && <span className="text-sm text-foreground-secondary">— {expr.korean}</span>}
              </div>
              <p className="mt-1.5 text-sm text-foreground-muted italic">&ldquo;{expr.example}&rdquo;</p>
            </div>
          ))}
        </div>
      );

    case 3: // Listen Together
      return (
        <div className="space-y-4 text-center">
          <a
            href={episode.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
          >
            <Headphones size={18} /> 팟캐스트 열기
          </a>
          <p className="text-sm text-foreground-secondary">{episode.source} · {episode.duration}</p>
          <ActivityTimer presets={[300, 600, 900]} />
        </div>
      );

    case 4: // Comprehension Check
      return (
        <div className="space-y-3">
          {episode.comprehension_questions.map((q, i) => (
            <div key={i} className="rounded-lg border border-border bg-surface p-3">
              <div className="flex items-start gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-600">{i + 1}</span>
                <p className="text-sm font-medium text-foreground">{q}</p>
              </div>
            </div>
          ))}
          <ActivityTimer presets={[120, 180, 300]} />
        </div>
      );

    case 5: // Discussion
      return <DiscussionPhase questions={episode.discussion_questions} />;

    default:
      return null;
  }
}

/* ── 토론 Phase (질문 하나씩 표시) ── */

function DiscussionPhase({ questions }: { questions: string[] }) {
  const [qIndex, setQIndex] = useState(0);

  return (
    <div className="space-y-4">
      {/* 질문 카드 */}
      <div className="rounded-lg bg-surface p-6 text-center">
        <p className="text-xs text-foreground-muted mb-2">질문 {qIndex + 1} / {questions.length}</p>
        <p className="text-lg font-medium text-foreground">&ldquo;{questions[qIndex]}&rdquo;</p>
      </div>

      {/* 네비게이션 */}
      <div className="flex justify-center gap-2">
        <button
          onClick={() => setQIndex((p) => Math.max(0, p - 1))}
          disabled={qIndex === 0}
          className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground-secondary hover:bg-surface-secondary disabled:opacity-30 transition-colors"
        >
          이전 질문
        </button>
        <button
          onClick={() => setQIndex((p) => Math.min(questions.length - 1, p + 1))}
          disabled={qIndex === questions.length - 1}
          className="rounded-full bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600 disabled:opacity-30 transition-colors"
        >
          다음 질문
        </button>
      </div>

      <ActivityTimer presets={[120, 180, 300]} />
    </div>
  );
}
