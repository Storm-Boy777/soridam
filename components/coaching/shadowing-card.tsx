"use client";

// 쉐도잉 카드 — DB 질문(음성) + 모범답안(구조 분해/통문장) + 내 녹음/재생 + IH 안정권 셀프체크
//   구조 보기: 답변을 엔진 슬롯(소개/위치/분위기★…)과 필러(도입/전개/개인/맺음)로 분해 표시
//   같은 종류(장소) 답변이 늘 같은 골격으로 흐른다는 걸 눈에 익혀 "암기"가 아닌 "생성"을 학습

import { Fragment, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Mic,
  Square,
  RotateCcw,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Headphones,
  Volume2,
  List,
} from "lucide-react";
import { useRecorder } from "@/lib/hooks/use-recorder";
import type { ShadowQuestion, SlotSeg } from "@/lib/types/shadowing";
import {
  FILLER_SLOTS,
  ENGINE_SLOTS,
  ENGINE_LABELS,
  slotLabel,
  slotStar,
  IH_CHECKLIST,
} from "@/lib/types/shadowing";

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// 콘텐츠 슬롯 색 (기능 카테고리별, 필러는 무채색). 엔진 간 겹치는 키는 같은 색 공유.
const SLOT_COLOR: Record<string, string> = {
  // 도입/소개
  identity: "bg-slate-100 text-slate-600",
  location: "bg-slate-100 text-slate-600",
  topic_intro: "bg-slate-100 text-slate-600",
  // 외형/종류
  appearance: "bg-sky-100 text-sky-700",
  feature: "bg-sky-100 text-sky-700",
  types: "bg-sky-100 text-sky-700",
  characteristics: "bg-sky-100 text-sky-700",
  // 느낌/핵심
  atmosphere: "bg-rose-100 text-rose-700",
  personality: "bg-rose-100 text-rose-700",
  what_kind: "bg-rose-100 text-rose-700",
  // 타인/사람들
  purpose: "bg-teal-100 text-teal-700",
  service: "bg-teal-100 text-teal-700",
  how_people: "bg-teal-100 text-teal-700",
  who_with: "bg-teal-100 text-teal-700",
  // 나/사용
  usage: "bg-violet-100 text-violet-700",
  what_we_do: "bg-violet-100 text-violet-700",
  how_when: "bg-violet-100 text-violet-700",
  connection: "bg-violet-100 text-violet-700",
  benefit: "bg-violet-100 text-violet-700",
  frequency: "bg-violet-50 text-violet-600",
  // 이유
  reason: "bg-stone-100 text-stone-600",
  // 마무리
  emotion: "bg-amber-100 text-amber-800",
  my_view: "bg-amber-100 text-amber-800",
  memorability: "bg-amber-100 text-amber-800",
  // 경험(EVENT)
  when: "bg-slate-100 text-slate-600",
  where: "bg-slate-100 text-slate-600",
  who: "bg-teal-100 text-teal-700",
  background: "bg-stone-100 text-stone-600",
  scene: "bg-sky-100 text-sky-700",
  activity: "bg-violet-100 text-violet-700",
  feeling: "bg-rose-100 text-rose-700",
  // 루틴
  big_action: "bg-slate-100 text-slate-600",
  step1: "bg-violet-100 text-violet-700",
  step2: "bg-violet-100 text-violet-700",
  step3: "bg-violet-50 text-violet-600",
  // 비교 / 오피니언
  past: "bg-stone-100 text-stone-600",
  present: "bg-sky-100 text-sky-700",
  difference: "bg-rose-100 text-rose-700",
  opinion: "bg-amber-100 text-amber-800",
  phenomenon: "bg-slate-100 text-slate-600",
  cause: "bg-stone-100 text-stone-600",
  effect: "bg-teal-100 text-teal-700",
  // 롤플레이
  opening: "bg-slate-100 text-slate-600",
  q_chain: "bg-violet-100 text-violet-700",
  closing: "bg-amber-100 text-amber-800",
  situation: "bg-sky-100 text-sky-700",
  panic: "bg-rose-100 text-rose-700",
  options: "bg-amber-100 text-amber-800",
};

// 질문 음성 재생 버튼
function QuestionAudio({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const audio = new Audio(url);
    audio.onplay = () => setPlaying(true);
    audio.onended = () => setPlaying(false);
    audio.onpause = () => setPlaying(false);
    ref.current = audio;
    return () => {
      audio.pause();
      ref.current = null;
    };
  }, [url]);
  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (playing) {
      a.pause();
      a.currentTime = 0;
    } else {
      a.currentTime = 0;
      a.play().catch(() => setPlaying(false));
    }
  };
  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 transition-colors hover:bg-primary-100"
    >
      {playing ? <Square className="h-3.5 w-3.5 fill-current" /> : <Volume2 className="h-3.5 w-3.5" />}
      {playing ? "정지" : "질문 듣기"}
    </button>
  );
}

// 골격 범례 (엔진별 흐름)
function Skeleton({ engineKey }: { engineKey: string | null }) {
  const slots = engineKey ? ENGINE_SLOTS[engineKey] : undefined;
  if (!slots) return null;
  const domainLabel = (engineKey && ENGINE_LABELS[engineKey]) || "답변";
  return (
    <div className="mb-3 rounded-xl bg-surface-secondary/50 px-3 py-2">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-semibold text-foreground-secondary">{domainLabel} 골격</span>
        <span className="text-[11px] text-foreground-muted">— 같은 종류는 늘 이 흐름</span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-1 gap-y-1">
        {slots.map((s, i) => (
          <Fragment key={s.key}>
            {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-foreground-muted" />}
            <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-medium text-foreground-secondary">
              {s.label}
              {s.star ? "★".repeat(s.star) : ""}
            </span>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

// 슬롯 한 줄 (라벨 + 텍스트, 필러는 흐리게)
function SlotRow({
  seg,
  hidden,
  engineKey,
}: {
  seg: SlotSeg;
  hidden: boolean;
  engineKey: string | null;
}) {
  const isFiller = FILLER_SLOTS.has(seg.slot);
  const label = slotLabel(engineKey, seg.slot);
  const star = slotStar(engineKey, seg.slot);
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
      <span
        className={`inline-flex h-fit w-fit shrink-0 items-center justify-center rounded-md px-2 py-0.5 text-[11px] font-semibold sm:w-[84px] ${
          isFiller
            ? "bg-surface-secondary text-foreground-muted"
            : SLOT_COLOR[seg.slot] ?? "bg-surface-secondary text-foreground-secondary"
        }`}
      >
        {label}
        {star > 0 ? "★".repeat(star) : ""}
      </span>
      {hidden ? (
        <span className="select-none text-[15px] leading-relaxed text-foreground-muted">······</span>
      ) : (
        <p
          className={`text-[15px] leading-relaxed ${
            isFiller ? "italic text-foreground-secondary" : "text-foreground"
          }`}
        >
          {seg.text.trim()}
        </p>
      )}
    </div>
  );
}

interface Props {
  q: ShadowQuestion;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  isDone: boolean;
  onToggleDone: () => void;
}

export function ShadowingCard({
  q,
  index,
  total,
  onPrev,
  onNext,
  onClose,
  isDone,
  onToggleDone,
}: Props) {
  const recorder = useRecorder({ maxDuration: 240, minDuration: 1 });
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [hideText, setHideText] = useState(false);
  const [showStructure, setShowStructure] = useState(true);
  const [checks, setChecks] = useState<boolean[]>(() => IH_CHECKLIST.map(() => false));

  useEffect(() => {
    if (!recorder.audioBlob) {
      setAudioUrl(null);
      return;
    }
    const url = URL.createObjectURL(recorder.audioBlob);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [recorder.audioBlob]);

  const recording = recorder.state === "recording";
  const hasRec = recorder.state === "stopped" && !!audioUrl;
  const structured = !!q.structure && showStructure;

  return (
    <div className="space-y-4">
      {/* 상단 네비 */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary"
        >
          <ArrowLeft className="h-4 w-4" /> 목록
        </button>
        <span className="text-xs font-medium text-foreground-muted">
          {index + 1} / {total}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onPrev}
            disabled={index === 0}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground-secondary transition-colors hover:bg-surface-secondary disabled:opacity-30"
            aria-label="이전"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={index === total - 1}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground-secondary transition-colors hover:bg-surface-secondary disabled:opacity-30"
            aria-label="다음"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 질문 */}
      <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
            {q.topic}
          </span>
          {isDone && (
            <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
              ✓ 체득
            </span>
          )}
          {q.audio_url && (
            <span className="ml-auto">
              <QuestionAudio url={q.audio_url} />
            </span>
          )}
        </div>
        <p className="text-base font-medium leading-relaxed text-foreground sm:text-lg">
          {q.question_english}
        </p>
        {q.question_korean && (
          <p className="mt-1.5 text-sm leading-relaxed text-foreground-secondary">
            {q.question_korean}
          </p>
        )}
        <p className="mt-1.5 font-mono text-[11px] text-foreground-muted">{q.id}</p>
      </div>

      {/* 모범답안 */}
      <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-foreground-secondary">모범답안 (IH 안정권)</span>
          {q.answer && (
            <div className="flex items-center gap-1.5">
              {q.structure && (
                <button
                  type="button"
                  onClick={() => setShowStructure((v) => !v)}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                    showStructure
                      ? "border-primary-300 bg-primary-50 text-primary-700"
                      : "border-border text-foreground-secondary hover:bg-surface-secondary"
                  }`}
                >
                  <List className="h-3.5 w-3.5" /> {showStructure ? "구조" : "통문장"}
                </button>
              )}
              <button
                type="button"
                onClick={() => setHideText((v) => !v)}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary"
              >
                {hideText ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                {hideText ? "보기" : "가리기"}
              </button>
            </div>
          )}
        </div>

        {!q.answer ? (
          <p className="rounded-xl bg-surface-secondary px-4 py-6 text-center text-sm text-foreground-muted">
            모범답안 준비 중이에요. 질문 음성과 녹음은 사용할 수 있어요.
          </p>
        ) : structured ? (
          <>
            <Skeleton engineKey={q.engineKey} />
            {hideText && (
              <p className="mb-2 text-[11px] text-foreground-muted">
                슬롯 순서대로 떠올려 말해본 뒤 <span className="font-medium text-primary-600">보기</span>로 확인하세요.
              </p>
            )}
            <div className="space-y-2.5">
              {q.structure!.map((seg, i) => (
                <SlotRow key={i} seg={seg} hidden={hideText} engineKey={q.engineKey} />
              ))}
            </div>
          </>
        ) : hideText ? (
          <button
            type="button"
            onClick={() => setHideText(false)}
            className="flex w-full flex-col items-center justify-center gap-1.5 rounded-xl bg-surface-secondary py-12 text-center transition-colors hover:bg-border/40"
          >
            <EyeOff className="h-5 w-5 text-foreground-muted" />
            <p className="text-sm text-foreground-muted">
              먼저 입으로 말해본 뒤 <span className="font-medium text-primary-600">탭하여 정답 확인</span>
            </p>
          </button>
        ) : (
          <p className="whitespace-pre-line text-[15px] leading-[1.9] text-foreground sm:text-base">
            {q.answer}
          </p>
        )}
      </div>

      {/* 내 녹음 */}
      <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="mb-1 flex items-center gap-2">
          <Headphones className="h-4 w-4 text-primary-500" />
          <span className="text-sm font-semibold text-foreground">내 목소리로 녹음하고 들어보기</span>
        </div>
        <p className="mb-4 text-xs leading-relaxed text-foreground-secondary">
          질문을 듣고 → 골격(소개→…→마무리)을 떠올리며 따라 말한 뒤, 내 녹음을 들으며 끊김·시제·주제 유지를 스스로 점검하세요.
        </p>

        {recorder.error && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{recorder.error}</span>
          </div>
        )}

        {!recording && !hasRec && (
          <button
            type="button"
            onClick={recorder.startRecording}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
          >
            <Mic className="h-5 w-5" /> 녹음 시작
          </button>
        )}

        {recording && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium text-red-600">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                녹음 중 · {fmt(recorder.duration)}
              </span>
              {recorder.warningMessage && (
                <span className="text-xs text-red-500">{recorder.warningMessage}</span>
              )}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-secondary">
              <div
                className="h-full rounded-full bg-primary-500 transition-[width] duration-100"
                style={{ width: `${Math.min(100, recorder.volume * 100)}%` }}
              />
            </div>
            <button
              type="button"
              onClick={recorder.stopRecording}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Square className="h-4 w-4 fill-current" /> 정지
            </button>
          </div>
        )}

        {hasRec && (
          <div className="space-y-3">
            <audio controls src={audioUrl ?? undefined} className="w-full" preload="metadata" />
            <button
              type="button"
              onClick={() => {
                recorder.reset();
                setChecks(IH_CHECKLIST.map(() => false));
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary"
            >
              <RotateCcw className="h-4 w-4" /> 다시 녹음
            </button>

            {/* IH 안정권 셀프체크 */}
            <div className="rounded-xl border border-border bg-surface-secondary/40 p-3.5">
              <p className="mb-2 text-xs font-semibold text-foreground-secondary">
                IH 안정권 셀프체크
              </p>
              <div className="space-y-1.5">
                {IH_CHECKLIST.map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      setChecks((c) => {
                        const n = [...c];
                        n[i] = !n[i];
                        return n;
                      })
                    }
                    className="flex w-full items-center gap-2 text-left text-xs text-foreground"
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        checks[i] ? "border-green-500 bg-green-500 text-white" : "border-border"
                      }`}
                    >
                      {checks[i] && <Check className="h-3 w-3" />}
                    </span>
                    {item}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-foreground-muted">
                {checks.filter(Boolean).length}/5 · 4개 이상이면 IH 안정권 답변이에요.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 체득 완료 + 다음 */}
      <div className="flex gap-2 pb-2">
        <button
          type="button"
          onClick={onToggleDone}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-semibold transition-colors ${
            isDone
              ? "border border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
              : "border border-border bg-surface text-foreground-secondary hover:bg-surface-secondary"
          }`}
        >
          <Check className="h-4 w-4" /> {isDone ? "체득 완료됨" : "체득 완료 표시"}
        </button>
        {index < total - 1 && (
          <button
            type="button"
            onClick={onNext}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
          >
            다음 <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
