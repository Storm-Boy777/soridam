"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Mic,
  Square,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Puzzle,
} from "lucide-react";
import { useRecorder } from "@/lib/hooks/use-recorder";
import { submitDrillAttempt, getDrillData } from "@/lib/actions/tutoring";
import type {
  TutoringDrill,
  TutoringAttempt,
  Layer1Result,
  Layer2Result,
  ChecklistItem,
} from "@/lib/types/tutoring";

// ── 레벨별 Frame 강도 설정 (설계서 D-8) ──
const LEVEL_FRAME_CONFIG: Record<string, {
  showKorean: boolean;
  showExample: boolean;
  allowSlotRescueQ1: boolean;
  allowSlotRescueQ2: boolean;
}> = {
  IL:  { showKorean: true,  showExample: true,  allowSlotRescueQ1: true,  allowSlotRescueQ2: true },
  IM1: { showKorean: true,  showExample: true,  allowSlotRescueQ1: true,  allowSlotRescueQ2: true },
  IM2: { showKorean: true,  showExample: false, allowSlotRescueQ1: true,  allowSlotRescueQ2: false },
  IM3: { showKorean: false, showExample: false, allowSlotRescueQ1: true,  allowSlotRescueQ2: false },
  IH:  { showKorean: false, showExample: false, allowSlotRescueQ1: false, allowSlotRescueQ2: false },
  AL:  { showKorean: false, showExample: false, allowSlotRescueQ1: false, allowSlotRescueQ2: false },
};

interface DrillPlayerProps {
  drill: TutoringDrill;
  drillIndex: number; // 1, 2, 3
  totalDrills: number;
  attempts: TutoringAttempt[];
  targetLevel: string; // 현재 학생의 next_step_level
  onAttemptComplete: () => void;
  onDrillPassed: () => void; // Q 자동 전환용
  onAllDrillsComplete: () => void; // 전체 완료 → retest 연결
}

type DrillPhase = "ready" | "recording" | "submitting" | "feedback" | "slot_rescue" | "passed";

export function DrillPlayer({
  drill,
  drillIndex,
  totalDrills,
  attempts,
  targetLevel,
  onAttemptComplete,
  onDrillPassed,
  onAllDrillsComplete,
}: DrillPlayerProps) {
  const [phase, setPhase] = useState<DrillPhase>("ready");
  const [showExample, setShowExample] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rescueSlots, setRescueSlots] = useState<string[]>([]);

  const recorder = useRecorder({
    maxDuration: 120,
    minDuration: 3,
  });

  const retryCount = attempts.length;
  const lastAttempt = attempts[attempts.length - 1];
  const levelConfig = LEVEL_FRAME_CONFIG[targetLevel] ?? LEVEL_FRAME_CONFIG.IM3;

  // Slot rescue 허용 여부
  const canSlotRescue =
    (drillIndex === 1 && levelConfig.allowSlotRescueQ1) ||
    (drillIndex === 2 && levelConfig.allowSlotRescueQ2);

  // ── 녹음 시작 ──
  const handleStartRecording = useCallback(async () => {
    await recorder.startRecording();
    setPhase("recording");
  }, [recorder]);

  // ── 녹음 종료 + 제출 ──
  const handleStopAndSubmit = useCallback(async () => {
    recorder.stopRecording();
    setPhase("submitting");
    setIsSubmitting(true);

    await new Promise((r) => setTimeout(r, 300));

    if (!recorder.audioBlob) {
      setPhase("ready");
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await submitDrillAttempt(drill.id, recorder.audioBlob);
      if (result.error) {
        console.error("제출 실패:", result.error);
        setPhase("ready");
      } else {
        // EF 처리 대기 (약 3~5초)
        await new Promise((r) => setTimeout(r, 4000));
        onAttemptComplete();
        // 결과 확인을 위해 refetch 후 상태 결정
        const drillData = await getDrillData(drill.focus_id);
        const updatedAttempts = (drillData.data?.attempts ?? []).filter(
          (a) => a.drill_id === drill.id
        );
        const latest = updatedAttempts[updatedAttempts.length - 1];

        if (latest?.result === "pass") {
          setPhase("passed");
          // 1.5초 후 자동 전환
          setTimeout(() => {
            if (drillIndex >= totalDrills) {
              onAllDrillsComplete();
            } else {
              onDrillPassed();
            }
          }, 1500);
        } else {
          // 실패 시 slot rescue 판단
          const layer1 = latest?.layer1_result as Layer1Result | null;
          if (layer1 && canSlotRescue && layer1.failed_flags.length >= 2 && retryCount >= 1) {
            setRescueSlots(layer1.failed_flags);
          }
          setPhase("feedback");
        }
      }
    } catch {
      setPhase("ready");
    } finally {
      setIsSubmitting(false);
      recorder.reset();
    }
  }, [recorder, drill.id, drill.focus_id, drillIndex, totalDrills, retryCount, canSlotRescue, onAttemptComplete, onDrillPassed, onAllDrillsComplete]);

  // ── 다시 말하기 ──
  const handleRetry = useCallback(() => {
    setPhase("ready");
    setRescueSlots([]);
    recorder.reset();
  }, [recorder]);

  // ── Slot Rescue 모드 진입 ──
  const handleSlotRescue = useCallback(() => {
    setPhase("slot_rescue");
  }, []);

  // ── Slot Rescue 완료 → 전체 재녹음 ──
  const handleSlotRescueComplete = useCallback(() => {
    setPhase("ready");
    setRescueSlots([]);
  }, []);

  // ── Q 라벨 ──
  const qLabels = ["학습", "적용", "독립 수행"];
  const qLabel = qLabels[drillIndex - 1] ?? "";

  // ── Frame slots 타입 변환 ──
  const frameSlots = (drill.frame_slots ?? []) as { slot: string; frame_en: string; label_ko: string }[];

  return (
    <div className="flex flex-1 flex-col">
      {/* 상단: 진행 바 + 목표 */}
      <div className="border-b border-border bg-surface px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-2 flex items-center justify-between text-xs text-foreground-secondary">
            <span>Q{drillIndex} / {totalDrills} — {qLabel}</span>
            <span className="rounded-full bg-primary-50 px-2 py-0.5 text-primary-600">
              {drill.hint_level === "full" ? "가이드 제공" : drill.hint_level === "reduced" ? "힌트 축소" : "혼자 하기"}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-secondary">
            <div
              className="h-full rounded-full bg-primary-500 transition-all"
              style={{ width: `${(drillIndex / totalDrills) * 100}%` }}
            />
          </div>
          {drill.goal && (
            <p className="mt-2 text-sm font-medium text-foreground">🎯 {drill.goal}</p>
          )}
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="relative h-0 flex-grow">
        <div className="absolute inset-0 overflow-y-auto max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden">
          <div className="mx-auto max-w-2xl space-y-4 px-4 py-4 sm:px-6">

            {/* 질문 */}
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-base font-medium leading-relaxed text-foreground">
                {drill.question_english}
              </p>
            </div>

            {/* Slot Rescue 모드 */}
            {phase === "slot_rescue" && (
              <SlotRescuePanel
                allSlots={frameSlots}
                failedFlags={rescueSlots}
                showKorean={levelConfig.showKorean}
                onComplete={handleSlotRescueComplete}
              />
            )}

            {/* Frame 카드 (hint_level + 레벨별 강도) */}
            {phase !== "slot_rescue" && drill.hint_level !== "minimal" && frameSlots.length > 0 && (
              <FrameCards
                slots={frameSlots}
                collapsed={drill.hint_level === "reduced"}
                showKorean={levelConfig.showKorean}
                failedSlots={phase === "feedback" ? rescueSlots : []}
              />
            )}

            {/* Q3 규칙 1줄 */}
            {phase !== "slot_rescue" && drill.hint_level === "minimal" && drill.rule_only_hint && (
              <div className="rounded-lg border border-primary-200 bg-primary-50/50 p-3">
                <p className="text-sm text-primary-700">💡 {drill.rule_only_hint}</p>
              </div>
            )}

            {/* 예시 보기 (Q1 + 레벨 허용 시) */}
            {phase !== "slot_rescue" && drill.hint_level === "full" && levelConfig.showExample && drill.sample_answer && (
              <div>
                <button
                  onClick={() => setShowExample(!showExample)}
                  className="flex items-center gap-1 text-xs text-foreground-secondary hover:text-foreground"
                >
                  {showExample ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  예시 보기
                </button>
                {showExample && (
                  <div className="mt-2 rounded-lg bg-surface-secondary p-3">
                    <p className="text-sm italic leading-relaxed text-foreground-secondary">
                      {drill.sample_answer}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 피드백 결과 */}
            {phase === "feedback" && lastAttempt && (
              <FeedbackPanel
                attempt={lastAttempt}
                canSlotRescue={canSlotRescue && rescueSlots.length >= 2}
                onRetry={handleRetry}
                onSlotRescue={handleSlotRescue}
              />
            )}

            {/* PASS 전환 애니메이션 */}
            {phase === "passed" && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
                <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-500" />
                <p className="text-sm font-semibold text-green-700">PASS!</p>
                <p className="mt-1 text-xs text-green-600">
                  {drillIndex >= totalDrills
                    ? "모든 드릴을 완료했어요!"
                    : "다음 문항으로 넘어갑니다..."}
                </p>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* 하단: 녹음 컨트롤 */}
      <div className="border-t border-border bg-surface px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center justify-center gap-4">
          {(phase === "ready" || phase === "slot_rescue") && phase !== "slot_rescue" && (
            <button
              onClick={handleStartRecording}
              className="flex items-center gap-2 rounded-full bg-primary-500 px-8 py-3 text-sm font-medium text-white shadow-lg transition-all hover:bg-primary-700 active:scale-95"
            >
              <Mic className="h-5 w-5" />
              답변 녹음하기
            </button>
          )}

          {phase === "slot_rescue" && (
            <button
              onClick={handleSlotRescueComplete}
              className="flex items-center gap-2 rounded-full bg-primary-500 px-8 py-3 text-sm font-medium text-white shadow-lg transition-all hover:bg-primary-700 active:scale-95"
            >
              <Mic className="h-5 w-5" />
              전체 답변으로 돌아가기
            </button>
          )}

          {phase === "recording" && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
                <span className="text-sm text-foreground-secondary">
                  {Math.floor(recorder.duration)}초
                </span>
              </div>
              <button
                onClick={handleStopAndSubmit}
                className="flex items-center gap-2 rounded-full bg-red-500 px-8 py-3 text-sm font-medium text-white shadow-lg transition-all hover:bg-red-600 active:scale-95"
              >
                <Square className="h-4 w-4" />
                완료
              </button>
            </div>
          )}

          {phase === "submitting" && (
            <div className="flex items-center gap-2 text-sm text-foreground-secondary">
              <Loader2 className="h-5 w-5 animate-spin" />
              분석 중...
            </div>
          )}

          {phase === "feedback" && lastAttempt?.result !== "pass" && (
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 rounded-full bg-primary-500 px-8 py-3 text-sm font-medium text-white shadow-lg transition-all hover:bg-primary-700 active:scale-95"
            >
              <RefreshCw className="h-4 w-4" />
              다시 말하기
            </button>
          )}

          {phase === "passed" && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              다음으로 이동 중...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Frame 카드 (레벨별 한국어 표시 + 실패 slot 하이라이트) ── */

function FrameCards({
  slots,
  collapsed,
  showKorean,
  failedSlots,
}: {
  slots: { slot: string; frame_en: string; label_ko: string }[];
  collapsed: boolean;
  showKorean: boolean;
  failedSlots: string[];
}) {
  const [isExpanded, setIsExpanded] = useState(!collapsed);

  return (
    <div className="rounded-xl border border-border bg-surface">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground"
      >
        <span>📝 말하기 구조</span>
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {isExpanded && (
        <div className="space-y-2 border-t border-border px-4 pb-4 pt-2">
          {slots.map((slot, idx) => {
            const isFailed = failedSlots.some((f) =>
              f.toLowerCase().includes(slot.slot.toLowerCase().replace(/_/g, ""))
            );
            return (
              <div
                key={slot.slot}
                className={`flex items-start gap-3 rounded-lg p-3 ${
                  isFailed
                    ? "border border-red-200 bg-red-50"
                    : "bg-surface-secondary"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isFailed
                      ? "bg-red-100 text-red-600"
                      : "bg-primary-100 text-primary-600"
                  }`}
                >
                  {idx + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{slot.frame_en}</p>
                  {showKorean && (
                    <p className="text-xs text-foreground-secondary">{slot.label_ko}</p>
                  )}
                  {isFailed && (
                    <p className="mt-0.5 text-xs font-medium text-red-500">← 이 부분이 빠졌어요</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Slot Rescue 패널 (빠진 slot만 집중 연습) ── */

function SlotRescuePanel({
  allSlots,
  failedFlags,
  showKorean,
  onComplete,
}: {
  allSlots: { slot: string; frame_en: string; label_ko: string }[];
  failedFlags: string[];
  showKorean: boolean;
  onComplete: () => void;
}) {
  // failedFlags에 매칭되는 slot만 표시
  const rescueSlots = allSlots.filter((slot) =>
    failedFlags.some((f) =>
      f.toLowerCase().includes(slot.slot.toLowerCase().replace(/_/g, ""))
    )
  );

  if (rescueSlots.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border-2 border-yellow-300 bg-yellow-50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Puzzle className="h-5 w-5 text-yellow-600" />
        <h4 className="text-sm font-semibold text-yellow-800">빠진 부분 연습하기</h4>
      </div>
      <p className="mb-3 text-xs text-yellow-700">
        아래 구조를 머릿속에 넣고, 전체 답변으로 돌아가서 다시 말해보세요.
      </p>
      <div className="space-y-2">
        {rescueSlots.map((slot) => (
          <div key={slot.slot} className="rounded-lg bg-white p-3">
            <p className="text-sm font-medium text-foreground">{slot.frame_en}</p>
            {showKorean && (
              <p className="text-xs text-foreground-secondary">{slot.label_ko}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 피드백 패널 (Slot Rescue 버튼 포함) ── */

function FeedbackPanel({
  attempt,
  canSlotRescue,
  onRetry,
  onSlotRescue,
}: {
  attempt: TutoringAttempt;
  canSlotRescue: boolean;
  onRetry: () => void;
  onSlotRescue: () => void;
}) {
  const layer1 = attempt.layer1_result as Layer1Result | null;
  const layer2 = attempt.layer2_result as Layer2Result | null;
  const isPassed = attempt.result === "pass";

  // Layer 2 우선 표시
  if (layer2) {
    return (
      <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-2">
          {layer2.pass_or_retry === "pass" ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          )}
          <span className={`text-sm font-semibold ${layer2.pass_or_retry === "pass" ? "text-green-700" : "text-yellow-700"}`}>
            {layer2.pass_or_retry === "pass" ? "PASS" : "다시 한번 해볼게요"}
          </span>
        </div>
        <p className="text-sm text-foreground">{layer2.praise_one}</p>
        {layer2.fix_one_or_two.length > 0 && (
          <div className="space-y-1">
            {layer2.fix_one_or_two.map((fix, i) => (
              <p key={i} className="text-sm text-foreground-secondary">⚠️ {fix}</p>
            ))}
          </div>
        )}
        {layer2.correction_examples?.length > 0 && (
          <div className="rounded-lg bg-surface-secondary p-3">
            {layer2.correction_examples.map((ex, i) => (
              <p key={i} className="text-sm italic text-foreground-secondary">{ex}</p>
            ))}
          </div>
        )}
        {layer2.target_connection_hint && (
          <p className="text-xs text-primary-600">{layer2.target_connection_hint}</p>
        )}
        {layer2.pass_or_retry === "retry" && layer2.retry_instruction && (
          <p className="text-sm font-medium text-foreground">👉 {layer2.retry_instruction}</p>
        )}
      </div>
    );
  }

  // Layer 1 피드백
  if (layer1) {
    return (
      <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-2">
          {isPassed ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <RefreshCw className="h-5 w-5 text-yellow-500" />
          )}
          <span className={`text-sm font-semibold ${isPassed ? "text-green-700" : "text-yellow-700"}`}>
            {layer1.student_feedback.status_label}
          </span>
        </div>
        <p className="text-sm text-foreground">{layer1.student_feedback.praise}</p>
        <div className="space-y-1">
          {layer1.student_feedback.checklist.map((item: ChecklistItem, i: number) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              {item.status === "pass" ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-400" />
              )}
              <span className={item.status === "pass" ? "text-foreground" : "text-red-600"}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
        {!isPassed && layer1.student_feedback.retry_instruction && (
          <p className="text-sm font-medium text-foreground">
            👉 {layer1.student_feedback.retry_instruction}
          </p>
        )}

        {/* Slot Rescue 버튼 (조건부) */}
        {!isPassed && canSlotRescue && (
          <button
            onClick={onSlotRescue}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-2 text-xs font-medium text-yellow-700 transition-colors hover:bg-yellow-100"
          >
            <Puzzle className="h-3.5 w-3.5" />
            빠진 부분 연습하기
          </button>
        )}
      </div>
    );
  }

  return null;
}
