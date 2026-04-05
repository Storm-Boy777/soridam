"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Timer,
  AlertCircle,
  Loader2,
  Upload,
  Coins,
  MessageCircle,
  Volume2,
  RotateCcw,
} from "lucide-react";
import { ShadowingRecorder } from "./shadowing-recorder";
import { RecordingComparison } from "./recording-comparison";
import { EvaluationResult } from "./evaluation-result";
import { useShadowingStore } from "@/lib/stores/shadowing";
import { startShadowingSession, checkScriptCredit } from "@/lib/actions/scripts";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type SubmitStage = "idle" | "uploading" | "analyzing" | "generating";
const STAGE_LABELS: Record<SubmitStage, string> = {
  idle: "",
  uploading: "녹음 업로드 중...",
  analyzing: "AI 분석 중...",
  generating: "결과 생성 중...",
};

export function StepSpeak() {
  const queryClient = useQueryClient();
  const {
    packageId,
    scriptId,
    questionText,
    questionKorean,
    questionAudioUrl,
    speakTimer,
    setSpeakTimer,
    speakResult,
    setSpeakResult,
    isRecording,
    setRecording,
    setRecordingDuration,
    markStepComplete,
    stepCompletions,
  } = useShadowingStore();

  const [timerActive, setTimerActive] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [isPlayingQuestion, setIsPlayingQuestion] = useState(false);
  const questionAudioRef = useRef<HTMLAudioElement | null>(null);

  const toggleQuestionAudio = useCallback(() => {
    if (!questionAudioUrl) return;
    if (!questionAudioRef.current) {
      questionAudioRef.current = new Audio(questionAudioUrl);
      questionAudioRef.current.onended = () => setIsPlayingQuestion(false);
    }
    if (isPlayingQuestion) {
      questionAudioRef.current.pause();
      questionAudioRef.current.currentTime = 0;
      setIsPlayingQuestion(false);
    } else {
      questionAudioRef.current.currentTime = 0;
      questionAudioRef.current.play().catch(() => {});
      setIsPlayingQuestion(true);
    }
  }, [questionAudioUrl, isPlayingQuestion]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStage, setSubmitStage] = useState<SubmitStage>("idle");
  const [submitError, setSubmitError] = useState("");

  const { data: creditData } = useQuery({
    queryKey: ["script-credit"],
    queryFn: async () => {
      const result = await checkScriptCredit();
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    staleTime: 60 * 1000,
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerCountRef = useRef(0);

  // 타이머 정리
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleRecordingComplete = useCallback(
    (blob: Blob, duration: number) => {
      setRecordingBlob(blob);
      setRecordingDuration(duration);
      setTimerActive(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    },
    [setRecordingDuration]
  );

  // 녹음 제출 (EF 호출)
  const handleSubmit = useCallback(async () => {
    if (!recordingBlob || !packageId || !scriptId) return;
    setIsSubmitting(true);
    setSubmitError("");
    setSubmitStage("uploading");

    try {
      // 1. 세션 생성
      const sessionResult = await startShadowingSession({
        package_id: packageId,
        script_id: scriptId,
      });

      if (sessionResult.error) {
        setSubmitError(sessionResult.error);
        setIsSubmitting(false);
        setSubmitStage("idle");
        return;
      }

      const sessionId = sessionResult.data?.sessionId;
      if (!sessionId) {
        setSubmitError("세션 생성에 실패했습니다");
        setIsSubmitting(false);
        setSubmitStage("idle");
        return;
      }

      // 2. 녹음 파일을 Base64로 변환
      setSubmitStage("analyzing");
      const arrayBuffer = await recordingBlob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      const base64 = btoa(binary);

      setSubmitStage("generating");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/scripts/evaluate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            session_id: sessionId,
            audio_base64: base64,
            audio_duration: speakTimer,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "평가 실패" }));
        setSubmitError(err.error || "평가에 실패했습니다");
        setIsSubmitting(false);
        setSubmitStage("idle");
        return;
      }

      const evalResult = await res.json();
      setSpeakResult(evalResult);

      // Step 완료
      if (!stepCompletions.speak) {
        markStepComplete("speak");
      }

      // 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ["shadowing-history"] });
      queryClient.invalidateQueries({ queryKey: ["script-credit"] });
      queryClient.invalidateQueries({ queryKey: ["user-credits"] });
    } catch {
      setSubmitError("평가 요청 중 오류가 발생했습니다");
    } finally {
      setIsSubmitting(false);
      setSubmitStage("idle");
    }
  }, [
    recordingBlob,
    packageId,
    scriptId,
    speakTimer,
    setSpeakResult,
    stepCompletions.speak,
    markStepComplete,
    queryClient,
  ]);

  function formatTime(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  const isOver2Min = speakTimer >= 120;

  // 평가 결과가 있으면 결과 화면
  if (speakResult) {
    return <EvaluationResult evaluation={speakResult} />;
  }

  return (
    <div className="space-y-5 pb-20 sm:pb-0">
      {/* 크레딧 안내 */}
      <div className="flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50/50 p-2.5 text-xs">
        <Coins size={14} className="text-amber-600" />
        <span className="text-amber-700">
          크레딧이 사용량에 따라 차감됩니다
          {creditData && (
            <span className="ml-1 font-semibold">· 잔액 ₩{(creditData.balanceKrw ?? creditData.totalCredits ?? 0).toLocaleString()}</span>
          )}
        </span>
      </div>

      {creditData && !creditData.hasCredit && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle size={16} />
          크레딧이 부족합니다. AI 스토어에서 충전해주세요.
        </div>
      )}

      {/* 질문 표시 */}
      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-primary-200">
        <div className="flex items-center justify-between border-b border-primary-100 bg-primary-50 px-4 py-2">
          <div className="flex items-center gap-1.5">
            <MessageCircle size={13} className="text-primary-500" />
            <span className="text-xs font-semibold text-primary-600">질문</span>
          </div>
          {questionAudioUrl && (
            <button
              onClick={toggleQuestionAudio}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                isPlayingQuestion
                  ? "bg-primary-500 text-white"
                  : "text-primary-500 hover:bg-primary-100"
              }`}
            >
              <Volume2 size={12} />
              {isPlayingQuestion ? "정지" : "듣기"}
            </button>
          )}
        </div>
        <div className="bg-primary-50/30 px-5 py-4 text-left">
          <p className="text-[13px] font-medium leading-relaxed text-foreground sm:text-[15px]">
            {questionText || "질문 없음"}
          </p>
          {questionKorean && (
            <p className="mt-3 border-t border-primary-100 pt-3 text-xs leading-relaxed text-foreground-muted">
              {questionKorean}
            </p>
          )}
        </div>
      </div>

      {/* 녹음 비교 (녹음 완료 + 제출 전) */}
      {recordingBlob && !isRecording && !isSubmitting && questionAudioUrl && (
        <RecordingComparison
          originalUrl={questionAudioUrl}
          recordingBlob={recordingBlob}
          originalLabel="질문 원본"
          recordingLabel="내 녹음"
        />
      )}

      {/* 타이머 + 녹음 + 제출 — 모바일: 하단 고정 / 데스크탑: 인라인 */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-surface px-5 py-3 sm:static sm:space-y-5 sm:border-t-0 sm:bg-transparent sm:p-0">
        {/* 모바일: 타이머 + 제출/로딩 + 녹음 가로 배치 */}
        <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-center sm:gap-0">
          {/* 타이머 */}
          <div className="flex items-center gap-1.5 sm:mb-4 sm:gap-2">
            <Timer
              size={14}
              className={isOver2Min ? "text-red-500" : "text-foreground-muted"}
              aria-hidden
            />
            <span
              className={`text-2xl font-bold tabular-nums sm:text-3xl ${
                isOver2Min ? "text-red-500" : "text-foreground"
              }`}
            >
              {formatTime(speakTimer)}
            </span>
            {isOver2Min && (
              <span className="flex items-center gap-0.5 text-xs text-red-500">
                <AlertCircle size={10} />
                초과
              </span>
            )}
          </div>

          {/* 제출 + 녹음 — 모바일 인라인, 데스크탑 세로 */}
          <div className="flex items-center gap-2 sm:flex-col sm:gap-3">
            {/* 제출 버튼 */}
            {recordingBlob && !isSubmitting && (
              <button
                onClick={handleSubmit}
                disabled={!creditData?.hasCredit}
                className="shrink-0 rounded-full bg-primary-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-50 sm:rounded-[var(--radius-lg)] sm:px-6 sm:py-2.5 sm:text-sm"
              >
                <span className="inline-flex items-center gap-1.5 sm:gap-2">
                  <Upload size={14} className="sm:hidden" />
                  <Upload size={16} className="hidden sm:block" />
                  <span className="sm:hidden">평가</span>
                  <span className="hidden sm:inline">평가 받기 (1회 차감)</span>
                </span>
              </button>
            )}

            {/* 제출 중 — 단계별 상태 */}
            {isSubmitting && (
              <div className="flex shrink-0 items-center gap-1.5 sm:flex-col sm:gap-2 sm:py-2">
                <Loader2 size={18} className="animate-spin text-primary-500 sm:size-5" />
                <p className="text-xs text-foreground-secondary sm:text-sm">
                  {STAGE_LABELS[submitStage]}
                </p>
              </div>
            )}

            {/* 녹음 */}
            <ShadowingRecorder
              compact
              isRecording={isRecording}
              onRecordingChange={(recording) => {
                setRecording(recording);
                if (recording) {
                  setTimerActive(true);
                  timerCountRef.current = 0;
                  setSpeakTimer(0);
                  timerRef.current = setInterval(() => {
                    timerCountRef.current += 1;
                    setSpeakTimer(timerCountRef.current);
                  }, 1000);
                }
              }}
              onRecordingComplete={handleRecordingComplete}
              showPlayback
              maxDuration={180}
            />
          </div>
        </div>
      </div>

      {/* 에러 + 다시 시도 */}
      {submitError && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle size={16} />
            {submitError}
          </div>
          <button
            onClick={handleSubmit}
            disabled={!recordingBlob || !creditData?.hasCredit}
            className="flex shrink-0 items-center gap-1 rounded-md bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-200 disabled:opacity-50"
          >
            <RotateCcw size={12} />
            다시 시도
          </button>
        </div>
      )}
    </div>
  );
}
