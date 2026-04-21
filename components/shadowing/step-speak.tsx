"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { formatUsd } from "@/lib/constants/pricing";
import {
  Mic,
  Square,
  AlertCircle,
  Loader2,
  Coins,
  Volume2,
  RotateCcw,
  Play,
  Headphones,
  Eye,
  EyeOff,
} from "lucide-react";
import { AvaAvatar } from "@/components/mock-exam/session/ava-avatar";
import { useShadowingStore } from "@/lib/stores/shadowing";
import {
  startShadowingSession,
  checkScriptCredit,
  submitSpeakRecording,
  pollSpeakEvaluation,
} from "@/lib/actions/scripts";
import { useRecorder } from "@/lib/hooks/use-recorder";
import { useQuestionPlayer } from "@/lib/hooks/use-question-player";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ShadowingEvaluation } from "@/lib/types/scripts";

type SpeakPhase = "ready" | "playing" | "recording" | "submitting" | "evaluating" | "result";

export function StepSpeak() {
  const queryClient = useQueryClient();
  const {
    packageId,
    scriptId,
    questionText,
    questionKorean,
    questionAudioUrl,
    speakResult,
    setSpeakResult,
    markStepComplete,
    stepCompletions,
  } = useShadowingStore();

  const [phase, setPhase] = useState<SpeakPhase>("ready");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [evaluationId, setEvaluationId] = useState<string | null>(null);
  const [evalResult, setEvalResult] = useState<ShadowingEvaluation | null>(null);
  const [error, setError] = useState("");
  const [showQuestion, setShowQuestion] = useState<"hidden" | "en" | "ko">("hidden");
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittedBlobRef = useRef<Blob | null>(null); // 재진입 방지 (업로드 실패 시 audioBlob 유지되어 useEffect 재실행되는 무한 루프 차단)
  const avaContainerRef = useRef<HTMLDivElement>(null);
  const [avaHeight, setAvaHeight] = useState(0);

  useEffect(() => {
    const el = avaContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setAvaHeight(entry.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { data: creditData } = useQuery({
    queryKey: ["script-credit"],
    queryFn: async () => {
      const result = await checkScriptCredit();
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    staleTime: 60 * 1000,
  });

  const recorder = useRecorder({ maxDuration: 120, minDuration: 3, timeWarningAt: 15 });

  const questionPlayer = useQuestionPlayer({
    replayWindowSeconds: 5,
    onPlaybackEnded: () => {
      // 모의고사 동일: 재생 완료와 동시에 녹음 자동 시작
      if (recorder.state === "idle") {
        setPhase("recording");
        recorder.startRecording();
      }
    },
  });

  const handleStart = useCallback(async () => {
    if (!packageId || !scriptId) return;
    setError("");
    try {
      const result = await startShadowingSession({ package_id: packageId, script_id: scriptId });
      if (result.error || !result.data) { setError(result.error || "세션 생성 실패"); return; }
      setSessionId(result.data.sessionId);
      if (questionAudioUrl) {
        setPhase("playing");
        questionPlayer.play(questionAudioUrl);
      } else {
        setPhase("recording");
        recorder.startRecording();
      }
    } catch (err) { setError((err as Error).message); }
  }, [packageId, scriptId, questionAudioUrl, questionPlayer, recorder]);

  const handleReplay = useCallback(() => {
    // 모의고사 동일: 녹음 중이면 리셋 후 리플레이
    if (recorder.state === "recording") {
      recorder.reset();
    }
    setPhase("playing");
    questionPlayer.replay();
  }, [questionPlayer, recorder]);
  const handleManualRecord = useCallback(() => { setPhase("recording"); recorder.startRecording(); }, [recorder]);
  const handleStop = useCallback(() => { recorder.stopRecording(); }, [recorder]);

  useEffect(() => {
    if (phase !== "recording" || !recorder.audioBlob || !sessionId || !scriptId) return;
    // 동일 blob 중복 제출 방지 — 실패 시 "다시 도전" 눌러야만 재시도 가능
    if (submittedBlobRef.current === recorder.audioBlob) return;
    submittedBlobRef.current = recorder.audioBlob;

    const submit = async () => {
      setPhase("submitting");
      setError("");
      try {
        const arrayBuffer = await recorder.audioBlob!.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
        }
        const result = await submitSpeakRecording({ sessionId, scriptId, audioBase64: btoa(binary) });
        if (result.error || !result.data) {
          setError(result.error || "제출 실패");
          setPhase("ready"); // ready로 복귀 (recording으로 돌리면 useEffect 재진입 루프)
          return;
        }
        setEvaluationId(result.data.evaluationId);
        setPhase("evaluating");
      } catch (err) {
        setError((err as Error).message);
        setPhase("ready");
      }
    };
    submit();
  }, [recorder.audioBlob, phase, sessionId, scriptId]);

  useEffect(() => {
    if (phase !== "evaluating" || !evaluationId) return;
    const poll = async () => {
      const result = await pollSpeakEvaluation(evaluationId);
      if (result.error) return;
      if (result.data?.status === "completed" && result.data.evaluation) {
        setEvalResult(result.data.evaluation);
        setSpeakResult(result.data.evaluation);
        setPhase("result");
        if (!stepCompletions.speak) markStepComplete("speak");
        queryClient.invalidateQueries({ queryKey: ["shadowing-history"] });
        queryClient.invalidateQueries({ queryKey: ["script-credit"] });
        queryClient.invalidateQueries({ queryKey: ["user-credits"] });
      } else if (result.data?.status === "failed") {
        setError("평가에 실패했습니다. 다시 시도해주세요.");
        setPhase("ready");
      }
    };
    poll();
    pollIntervalRef.current = setInterval(poll, 5000);
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, [phase, evaluationId, setSpeakResult, stepCompletions.speak, markStepComplete, queryClient]);

  const handleRetry = useCallback(() => {
    setPhase("ready"); setSessionId(null); setEvaluationId(null); setEvalResult(null); setError("");
    submittedBlobRef.current = null;
    recorder.reset(); questionPlayer.reset();
  }, [recorder, questionPlayer]);

  function formatTime(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  // ── 결과 화면 ──
  if (phase === "result" && evalResult) {
    return (
      <div className="space-y-5 pb-4">
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50">
              <Play size={14} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">실전 평가 결과</h3>
              <p className="text-[10px] text-foreground-muted">{evalResult.estimated_level || "—"} 기준</p>
            </div>
          </div>
          <div className="divide-y divide-border">
            {evalResult.fulfillment && (
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-primary-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white">판정</span>
                  <span className="text-xs font-bold text-foreground-secondary">과제 수행</span>
                </div>
                <div className="mt-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    evalResult.fulfillment === "fulfilled" ? "bg-green-50 text-green-600"
                    : evalResult.fulfillment === "partial" ? "bg-yellow-50 text-yellow-600"
                    : "bg-red-50 text-red-600"
                  }`}>
                    {evalResult.fulfillment === "fulfilled" ? "✓ 충족" : evalResult.fulfillment === "partial" ? "△ 부분 충족" : evalResult.fulfillment === "skipped" ? "— 미응답" : "✗ 미충족"}
                  </span>
                </div>
                {evalResult.task_checklist && evalResult.task_checklist.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {evalResult.task_checklist.map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className={`mt-0.5 text-xs ${item.pass ? "text-green-500" : "text-red-400"}`}>{item.pass ? "✓" : "✗"}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground-secondary">{item.item}</p>
                          {item.evidence && <p className="mt-0.5 text-[11px] italic text-foreground-muted">{item.evidence}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {evalResult.observation && (
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white">소견</span>
                  <span className="text-xs font-bold text-foreground-secondary">평가 관찰</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-foreground-secondary">{evalResult.observation}</p>
              </div>
            )}
            {evalResult.directions && evalResult.directions.length > 0 && (
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-blue-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white">방향</span>
                  <span className="text-xs font-bold text-foreground-secondary">개선 방향</span>
                </div>
                <ul className="mt-2 space-y-1.5">
                  {evalResult.directions.map((d, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-foreground-secondary">
                      <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-foreground-muted" />{d}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {evalResult.weak_points && evalResult.weak_points.length > 0 && (
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-accent-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white">약점</span>
                  <span className="text-xs font-bold text-foreground-secondary">병목 분석</span>
                </div>
                <div className="mt-3 space-y-3">
                  {evalResult.weak_points.map((wp, i) => (
                    <div key={i} className="rounded-lg border border-border bg-surface-secondary/50 px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-bold text-primary-500">{wp.code}</span>
                        <span className={`text-[10px] font-medium ${wp.severity === "severe" ? "text-red-500" : "text-yellow-600"}`}>
                          ● {wp.severity === "severe" ? "심각" : "보통"}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs font-medium text-foreground-secondary">{wp.reason}</p>
                      {wp.evidence && <p className="mt-1 text-[11px] italic text-foreground-muted">{wp.evidence}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={handleRetry}
          className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-border py-3 text-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary"
        >
          <RotateCcw size={14} />다시 도전
        </button>
      </div>
    );
  }

  // ── 메인 UI ──
  return (
    <div className="space-y-3 md:space-y-4">
      {/* 크레딧 안내 (모바일: 컴팩트) */}
      <div className="flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50/50 p-2 text-[11px] md:p-2.5 md:text-xs">
        <Coins size={14} className="text-amber-600" />
        <span className="text-amber-700">
          크레딧이 사용량에 따라 차감됩니다
          {creditData && <span className="ml-1 font-semibold">· 잔액 {formatUsd(creditData.balanceCents ?? creditData.totalCredits ?? 0)}</span>}
        </span>
      </div>

      {creditData && !creditData.hasCredit && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle size={16} />크레딧이 부족합니다. AI 스토어에서 충전해주세요.
        </div>
      )}

      {/* 질문 정보 바 (데스크탑) */}
      {questionText && (
        <div className="hidden rounded-xl border border-border bg-surface px-4 py-2.5 md:block">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-medium text-primary-700">실전 평가</span>
            <button
              onClick={() => setShowQuestion((prev) => prev === "hidden" ? "en" : "hidden")}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-foreground-muted hover:bg-surface-secondary hover:text-foreground-secondary"
            >
              {showQuestion !== "hidden" ? <EyeOff size={14} /> : <Eye size={14} />}
              {showQuestion !== "hidden" ? "숨기기" : "질문 보기"}
            </button>
          </div>
          {showQuestion !== "hidden" && (
            <div className="mt-2 border-t border-border/50 pt-2">
              <p className="text-sm font-medium text-foreground">{questionText}</p>
              {questionKorean && (
                <>
                  <div className="my-2 h-px bg-border/50" />
                  <p className="text-xs leading-relaxed text-foreground-muted">{questionKorean}</p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ 메인 프레임 (모의고사 동일) ═══ */}
      <div className="rounded-2xl border border-border bg-surface p-2 md:p-5">
        <div className="flex flex-col gap-2 md:flex-row md:gap-5">

          {/* === 좌측: AVA + 재생 컨트롤 === */}
          <div className="flex flex-col gap-2 md:w-[42%] md:gap-3">
            {/* 아바타 */}
            <div
              ref={avaContainerRef}
              className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-border md:aspect-square"
              style={{ backgroundColor: "#F7F3EE" }}
            >
              <AvaAvatar
                isSpeaking={phase === "playing" || questionPlayer.isPlaying}
                isListening={recorder.state === "recording"}
              />

              {/* 모바일: 질문 오버레이 */}
              <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between p-2 md:hidden">
                <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                  실전 평가
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setShowQuestion((prev) => prev === "en" ? "hidden" : "en")}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm ${showQuestion === "en" ? "bg-white/80 text-black" : "bg-black/40 text-white"}`}
                  >EN</button>
                  <button
                    onClick={() => setShowQuestion((prev) => prev === "ko" ? "hidden" : "ko")}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm ${showQuestion === "ko" ? "bg-white/80 text-black" : "bg-black/40 text-white"}`}
                  >한글</button>
                </div>
              </div>
              {showQuestion !== "hidden" && (
                <div className="absolute inset-x-0 bottom-0 z-10 max-h-[60%] overflow-y-auto bg-black/60 px-2.5 py-2 backdrop-blur-sm md:hidden">
                  <p className="text-[11px] leading-relaxed text-white">
                    {showQuestion === "en" ? questionText : questionKorean}
                  </p>
                </div>
              )}
            </div>

            {/* 재생 컨트롤 (모바일 + 데스크탑 공용) */}
            <div className="shrink-0 rounded-xl border border-border bg-surface-secondary p-3">
              <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-primary-500 transition-[width] duration-300" style={{ width: `${questionPlayer.playbackProgress}%` }} />
              </div>

              {phase === "ready" && (
                <button onClick={handleStart} disabled={!creditData?.hasCredit} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-500 px-4 py-3 text-sm font-bold text-white shadow-lg hover:bg-primary-600 active:scale-95 disabled:opacity-50">
                  <Volume2 size={18} />질문 듣기
                </button>
              )}
              {questionPlayer.isPlaying && (
                <button disabled className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-500 px-4 py-3 text-sm font-bold text-white shadow-lg disabled:opacity-50">
                  <Loader2 size={18} className="animate-spin" />Playing...
                </button>
              )}
              {phase === "playing" && questionPlayer.canReplay && !questionPlayer.hasReplayed && (
                <button onClick={handleReplay} className="flex w-full animate-pulse items-center justify-center gap-2 rounded-lg bg-primary-500 px-4 py-3 text-sm font-bold text-white shadow-lg">
                  <RotateCcw size={18} />다시 듣기 ({questionPlayer.replayCountdown}초)
                </button>
              )}
              {phase === "playing" && questionPlayer.hasPlayed && !questionPlayer.isPlaying && !questionPlayer.canReplay && recorder.state === "idle" && (
                <button onClick={handleManualRecord} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-500 px-4 py-3 text-sm font-bold text-white shadow-lg hover:bg-primary-600">
                  <Mic size={18} />녹음 시작
                </button>
              )}
              {recorder.state === "recording" && (
                <button onClick={handleStop} className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-3 text-sm font-bold text-white shadow-lg hover:bg-red-600">
                  <Square size={16} />답변 완료
                </button>
              )}
              {(phase === "submitting" || phase === "evaluating") && (
                <div className="flex w-full items-center justify-center gap-2 rounded-lg bg-surface-secondary px-4 py-3 text-sm font-bold text-foreground-muted">
                  <Loader2 size={18} className="animate-spin" />{phase === "submitting" ? "업로드 중..." : "AI 평가 중..."}
                </div>
              )}
            </div>
          </div>

          {/* === 세로 볼륨바 (데스크탑) === */}
          <div className="hidden w-4 flex-shrink-0 md:flex md:flex-col md:items-center md:gap-1" style={{ height: avaHeight > 0 ? avaHeight : undefined }}>
            <div className="flex w-full flex-1 flex-col-reverse gap-px rounded-lg border border-border bg-surface-secondary p-0.5">
              {Array.from({ length: 24 }).map((_, i) => {
                const threshold = (i + 1) / 24;
                const vol = recorder.state === "recording" ? recorder.volume : 0;
                const lit = vol >= threshold;
                const color = i < 16 ? lit ? "bg-primary-300" : "bg-border" : i < 21 ? lit ? "bg-primary-500" : "bg-border" : lit ? "bg-accent-500" : "bg-border";
                return <div key={i} className={`w-full flex-1 rounded-sm transition-colors duration-75 ${color}`} />;
              })}
            </div>
            <Mic size={12} className={`shrink-0 transition-colors ${recorder.state === "recording" ? "animate-pulse text-primary-500" : "text-foreground-muted"}`} />
          </div>

          {/* === 우측: 녹음 상태 (데스크탑) === */}
          <div className="hidden flex-col gap-2 md:flex md:flex-1">
            {/* 녹음 시간 (데스크탑) */}
            <div className="hidden items-center justify-between rounded-xl border border-border bg-surface-secondary p-3 md:flex">
              <span className="text-sm font-medium text-foreground-secondary">녹음 시간</span>
              <span className={`font-mono text-2xl font-bold md:text-3xl ${recorder.state === "recording" ? "text-primary-600" : "text-foreground-muted"}`}>
                {formatTime(recorder.duration)}
              </span>
            </div>

            {/* 상태 표시 (데스크탑) */}
            <div className="hidden flex-1 flex-col items-center justify-center rounded-xl border border-border bg-surface-secondary p-4 md:flex">
              {phase === "ready" && (
                <div className="text-center">
                  <Headphones size={28} className="mx-auto mb-2 text-foreground-muted" />
                  <p className="text-sm font-medium text-foreground-secondary">준비되셨나요?</p>
                  <p className="mt-1 text-xs text-foreground-muted">좌측 &apos;질문 듣기&apos; 버튼을 눌러 시작하세요</p>
                </div>
              )}
              {questionPlayer.isPlaying && (
                <div className="text-center">
                  <Volume2 size={28} className="mx-auto mb-2 animate-pulse text-primary-500" />
                  <p className="text-sm font-medium text-primary-600">질문을 듣는 중...</p>
                  <p className="mt-1 text-xs text-foreground-muted">질문을 잘 듣고 답변을 준비하세요</p>
                </div>
              )}
              {recorder.state === "recording" && (
                <div className="relative flex w-full flex-1 flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-primary-200 bg-primary-50">
                  <div className="absolute inset-0 animate-pulse bg-primary-100/50" />
                  <div className="z-10 flex items-center gap-2">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-primary-500" />
                    <span className="text-sm font-bold uppercase tracking-widest text-primary-600">Recording...</span>
                  </div>
                  {recorder.warningMessage && (
                    <p className={`z-10 mt-2 text-xs font-medium ${recorder.warning === "silent" ? "text-red-500" : "text-amber-600"}`}>
                      {recorder.warningMessage}
                    </p>
                  )}
                </div>
              )}
              {phase === "submitting" && (
                <div className="text-center">
                  <Loader2 size={28} className="mx-auto mb-2 animate-spin text-primary-500" />
                  <p className="text-sm font-medium text-foreground-secondary">녹음 업로드 중...</p>
                </div>
              )}
              {phase === "evaluating" && (
                <div className="text-center">
                  <div className="mx-auto mb-3 h-12 w-12 animate-spin rounded-full border-[3px] border-surface-secondary border-t-primary-500" />
                  <p className="text-sm font-medium text-foreground">AI 평가 중</p>
                  <p className="mt-0.5 text-[11px] text-foreground-muted">음성을 분석하고 피드백을 생성하고 있어요</p>
                </div>
              )}
              {phase === "playing" && !questionPlayer.isPlaying && recorder.state === "idle" && (
                <div className="text-center">
                  <Mic size={28} className="mx-auto mb-2 text-foreground-muted" />
                  <p className="text-sm font-medium text-foreground-secondary">답변을 준비하세요</p>
                  <p className="mt-1 text-xs text-foreground-muted">좌측 버튼으로 녹음을 시작하세요</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* 에러 */}
      {error && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="flex items-center gap-2 text-sm text-red-600"><AlertCircle size={16} />{error}</div>
          <button onClick={handleRetry} className="flex shrink-0 items-center gap-1 rounded-md bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200">
            <RotateCcw size={12} />다시 시도
          </button>
        </div>
      )}
    </div>
  );
}
