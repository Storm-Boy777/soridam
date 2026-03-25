"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  Square,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { useRecorder } from "@/lib/hooks/use-recorder";
import { submitRetestResult } from "@/lib/actions/tutoring";
import type { TutoringRetest, RetestResult } from "@/lib/types/tutoring";
import { RETEST_RESULT_LABELS } from "@/lib/types/tutoring";

interface MiniRetestProps {
  retest: TutoringRetest;
  focusId: string;
}

type Phase = "intro" | "question" | "submitting" | "result";

interface QuestionResult {
  question_id: string;
  transcript: string;
  audio_url: string | null;
  passed: boolean; // Layer 1에서 판정 — 여기서는 간이 판정
}

export function MiniRetest({ retest, focusId }: MiniRetestProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [currentQ, setCurrentQ] = useState(0);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [overallResult, setOverallResult] = useState<RetestResult | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const recorder = useRecorder({ maxDuration: 120, minDuration: 3 });
  const questions = retest.questions;
  const totalQuestions = questions.length;

  // ── 시작 ──
  const handleStart = () => {
    setPhase("question");
  };

  // ── 녹음 시작 ──
  const handleRecord = async () => {
    await recorder.startRecording();
    setIsRecording(true);
  };

  // ── 녹음 종료 → 다음 문항 ──
  const handleStopAndNext = useCallback(async () => {
    recorder.stopRecording();
    setIsRecording(false);

    await new Promise((r) => setTimeout(r, 300));

    // 간이 결과 (실제로는 EF에서 STT + Layer1 판정해야 함)
    // MVP에서는 녹음 완료 = 일단 기록, 서버에서 후처리
    const result: QuestionResult = {
      question_id: questions[currentQ].question_id,
      transcript: "", // 서버에서 STT 처리
      audio_url: null,
      passed: true, // 서버에서 판정
    };

    const newResults = [...results, result];
    setResults(newResults);
    recorder.reset();

    if (currentQ + 1 < totalQuestions) {
      // 다음 문항
      setCurrentQ(currentQ + 1);
    } else {
      // 전체 완료 → 서버 제출
      setPhase("submitting");
      try {
        const res = await submitRetestResult(retest.id, newResults);
        setOverallResult((res.data?.overall_result as RetestResult) ?? "hold");
        setPhase("result");
      } catch {
        setOverallResult("hold");
        setPhase("result");
      }
    }
  }, [recorder, questions, currentQ, results, totalQuestions, retest.id]);

  // ── 인트로 화면 ──
  if (phase === "intro") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-50">
            <CheckCircle2 className="h-7 w-7 text-primary-500" />
          </div>
          <h2 className="text-lg font-bold text-foreground">
            힌트 없이 확인해볼게요
          </h2>
          <p className="mt-2 text-sm text-foreground-secondary">
            이번에는 힌트 없이 {totalQuestions}문항만 해봅니다.
            <br />
            모르면 아는 만큼 말해도 됩니다.
          </p>

          <div className="mt-4 rounded-lg bg-surface-secondary p-3 text-left text-xs text-foreground-secondary">
            <p>• Frame / 예시 / 힌트 없음</p>
            <p>• 중간 피드백 없음</p>
            <p>• 녹음 후 바로 다음 문항으로</p>
          </div>

          <button
            onClick={handleStart}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary-500 px-6 py-3 text-sm font-medium text-white hover:bg-primary-700"
          >
            확인 시작
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── 문항 화면 ──
  if (phase === "question") {
    const q = questions[currentQ];
    return (
      <div className="flex flex-1 flex-col">
        {/* 상단 */}
        <div className="border-b border-border bg-surface px-4 py-3">
          <div className="mx-auto max-w-2xl">
            <div className="mb-2 flex items-center justify-between text-xs text-foreground-secondary">
              <span>확인 {currentQ + 1} / {totalQuestions}</span>
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-yellow-700">
                힌트 없음
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-secondary">
              <div
                className="h-full rounded-full bg-primary-500 transition-all"
                style={{ width: `${((currentQ + 1) / totalQuestions) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* 질문만 */}
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="mx-auto max-w-2xl">
            <p className="text-center text-base font-medium leading-relaxed text-foreground sm:text-lg">
              {q.question_english}
            </p>
          </div>
        </div>

        {/* 녹음 */}
        <div className="border-t border-border bg-surface px-4 py-4">
          <div className="mx-auto flex max-w-2xl items-center justify-center gap-4">
            {!isRecording ? (
              <button
                onClick={handleRecord}
                className="flex items-center gap-2 rounded-full bg-primary-500 px-8 py-3 text-sm font-medium text-white shadow-lg hover:bg-primary-700 active:scale-95"
              >
                <Mic className="h-5 w-5" />
                답변 녹음하기
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
                  <span className="text-sm text-foreground-secondary">
                    {Math.floor(recorder.duration)}초
                  </span>
                </div>
                <button
                  onClick={handleStopAndNext}
                  className="flex items-center gap-2 rounded-full bg-red-500 px-8 py-3 text-sm font-medium text-white shadow-lg hover:bg-red-600 active:scale-95"
                >
                  <Square className="h-4 w-4" />
                  완료
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── 제출 중 ──
  if (phase === "submitting") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <Loader2 className="mb-3 h-10 w-10 animate-spin text-primary-500" />
        <p className="text-sm text-foreground-secondary">결과를 확인하고 있어요...</p>
      </div>
    );
  }

  // ── 결과 화면 ──
  const resultConfig = {
    graduated: {
      icon: <CheckCircle2 className="h-8 w-8 text-green-600" />,
      bg: "bg-green-100",
      title: "통과!",
      message: "이 병목은 도움 없이도 구조가 나옵니다.",
      color: "text-green-700",
    },
    improving: {
      icon: <Clock className="h-8 w-8 text-yellow-600" />,
      bg: "bg-yellow-100",
      title: "거의 됐어요",
      message: "연습할 때는 되지만, 아직 매번 안정적이진 않습니다.",
      color: "text-yellow-700",
    },
    hold: {
      icon: <AlertTriangle className="h-8 w-8 text-orange-600" />,
      bg: "bg-orange-100",
      title: "조금 더 연습이 필요해요",
      message: "도움 없이 하기엔 아직 이릅니다.",
      color: "text-orange-700",
    },
  };

  const r = resultConfig[overallResult ?? "hold"];

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="mx-auto max-w-md text-center">
        <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${r.bg}`}>
          {r.icon}
        </div>

        <h2 className={`text-xl font-bold ${r.color}`}>{r.title}</h2>
        <p className="mt-2 text-sm text-foreground-secondary">{r.message}</p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {overallResult === "graduated" && (
            <button
              onClick={() => router.push("/tutoring?tab=training")}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary-500 px-6 py-3 text-sm font-medium text-white hover:bg-primary-700"
            >
              다음 병목으로
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
          {overallResult === "improving" && (
            <>
              <button
                onClick={() => router.push(`/tutoring/drill?focusId=${focusId}`)}
                className="flex items-center justify-center gap-2 rounded-lg bg-primary-500 px-6 py-3 text-sm font-medium text-white hover:bg-primary-700"
              >
                비슷한 문항 더 연습
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => router.push("/tutoring?tab=training")}
                className="flex items-center justify-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-medium text-foreground-secondary hover:bg-surface-secondary"
              >
                나중에 다시
              </button>
            </>
          )}
          {overallResult === "hold" && (
            <button
              onClick={() => router.push(`/tutoring/drill?focusId=${focusId}`)}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary-500 px-6 py-3 text-sm font-medium text-white hover:bg-primary-700"
            >
              <RotateCcw className="h-4 w-4" />
              다시 연습하기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
