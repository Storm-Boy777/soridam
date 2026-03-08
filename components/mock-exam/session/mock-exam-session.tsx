"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Mic,
  ChevronRight,
  Loader2,
  Volume2,
  RotateCcw,
  AlertTriangle,
  WifiOff,
  Headphones,
  RefreshCw,
  ArrowRight,
  Bot,
  Clock,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { useRecorder } from "@/lib/hooks/use-recorder";
import { useQuestionPlayer } from "@/lib/hooks/use-question-player";
import { useEvalPolling } from "@/lib/hooks/use-eval-polling";
import { SessionTimer } from "./session-timer";
import { QuestionGrid } from "./question-grid";
import { AvaAvatar } from "./ava-avatar";
import { EvalWaiting } from "../evaluation/eval-waiting";
import { TrainingEvalPanel } from "./training-eval-panel";
import { submitAnswer, completeSession } from "@/lib/actions/mock-exam";
import type {
  MockTestSession,
  MockTestAnswer,
  MockTestEvaluation,
  MockTestReport,
  MockExamMode,
  EvalStatus,
} from "@/lib/types/mock-exam";

// Q1 자기소개도 questions 테이블에서 조회 (SLF_SYS_SYS_UNK_01)

// ── 세션 페이즈 ──
type SessionPhase = "exam" | "completing" | "waiting";

// ── 업로드 상태 ──
type UploadState = "idle" | "uploading" | "retrying" | "submitted" | "failed";

// ── 5단계 가이드 활성 스텝 ──
type GuideStep = "listen" | "replay" | "record" | "next" | "eval";

interface MockExamSessionProps {
  sessionId: string;
  initialData: {
    session: MockTestSession;
    answers: MockTestAnswer[];
    evaluations: MockTestEvaluation[];
    report: MockTestReport | null;
    questions: Array<{
      id: string;
      question_english: string;
      question_korean: string;
      question_type_eng: string;
      topic: string;
      category: string;
      audio_url: string | null;
    }>;
  };
}

export function MockExamSession({
  sessionId,
  initialData,
}: MockExamSessionProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { session, answers: initialAnswers, questions } = initialData;
  const mode = session.mode as MockExamMode;
  const isTraining = mode === "training";

  // ── 훈련 모드: 인라인 평가 뷰 상태 ──
  const [viewingEvalQNum, setViewingEvalQNum] = useState<number | null>(null);

  // ── 훈련 모드 평가 완료 알림 배너 ──
  const [evalBanner, setEvalBanner] = useState<number | null>(null);
  const evalBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 이미 알림 표시한 문항 추적
  const evalNotifiedRef = useRef<Set<number>>(new Set());

  const handleEvalNotify = useCallback((qNum: number) => {
    setEvalBanner(qNum);
    if (evalBannerTimerRef.current) clearTimeout(evalBannerTimerRef.current);
    evalBannerTimerRef.current = setTimeout(() => setEvalBanner(null), 4000);
  }, []);

  // ── 세션 상태 ──
  const [phase, setPhase] = useState<SessionPhase>(
    session.status === "completed" ? "waiting" : "exam"
  );
  const [currentQ, setCurrentQ] = useState(session.current_question);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(
    () => new Set(initialAnswers.map((a) => a.question_number))
  );
  const [evalStatusMap, setEvalStatusMap] = useState<Record<number, EvalStatus>>(
    () =>
      Object.fromEntries(
        initialAnswers.map((a) => [a.question_number, a.eval_status as EvalStatus])
      )
  );
  const [error, setError] = useState<string | null>(null);
  const [showQuestion, setShowQuestion] = useState<"hidden" | "en" | "ko">("hidden");
  const [showTimeWarning, setShowTimeWarning] = useState(false);

  // ── AVA 컨테이너 높이 측정 (세로 볼륨바 높이 동기화) ──
  const avaContainerRef = useRef<HTMLDivElement>(null);
  const [avaHeight, setAvaHeight] = useState(0);
  useEffect(() => {
    const el = avaContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setAvaHeight(entry.contentRect.height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── 오프라인 감지 ──
  const [isOnline, setIsOnline] = useState(true);
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // ── 커스텀 훅: 녹음 (최소 1초, 소리담 기준. 10초 제한은 UI에서 처리) ──
  const recorder = useRecorder({ maxDuration: 240, minDuration: 1 });

  // 자동 녹음 시작 콜백 (질문 오디오 끝난 후)
  const autoStartRecording = useCallback(() => {
    if (recorder.state !== "idle" || uploadState !== "idle") return;
    recorder.startRecording();
  }, [recorder, uploadState]);

  // ── 커스텀 훅: 질문 오디오 (자동 녹음 콜백 연결) ──
  const questionPlayer = useQuestionPlayer({
    replayWindowSeconds: 5,
    onPlaybackEnded: autoStartRecording,
  });

  // ── 커스텀 훅: 평가 폴링 ──
  // 훈련 모드: 시험 중에도 폴링 (개별 평가 결과 실시간 표시)
  // 실전 모드: 평가 대기 화면에서만 폴링
  const evalPolling = useEvalPolling({
    sessionId,
    enabled: phase === "waiting" || (isTraining && phase === "exam"),
    interval: isTraining && phase === "exam" ? 8000 : 5000,
  });

  // 폴링 결과를 로컬 상태에 반영
  useEffect(() => {
    if (Object.keys(evalPolling.evalStatuses).length > 0) {
      setEvalStatusMap((prev) => {
        const next = { ...prev };
        for (const [qStr, status] of Object.entries(evalPolling.evalStatuses)) {
          next[Number(qStr)] = status;
        }
        return next;
      });
    }
  }, [evalPolling.evalStatuses]);

  // ── 훈련 모드: evalStatusMap 변화 감지 → 평가 완료 알림 ──
  useEffect(() => {
    if (!isTraining) return;
    for (const [qStr, status] of Object.entries(evalStatusMap)) {
      const qNum = Number(qStr);
      if (qNum <= 1 || evalNotifiedRef.current.has(qNum)) continue;
      if (status === "completed" || status === "skipped" || status === "failed") {
        evalNotifiedRef.current.add(qNum);
        if (status === "completed") handleEvalNotify(qNum);
      }
    }
  }, [evalStatusMap, isTraining, handleEvalNotify]);

  // ── 업로드 재시도 ref ──
  const uploadRetryRef = useRef(0);
  const MAX_UPLOAD_RETRIES = 3;
  // "다음" 클릭 → 녹음 중지 → 업로드 완료 후 자동 이동 (소리담 패턴)
  const pendingAdvanceRef = useRef(false);

  // ── 현재 질문 정보 ──
  // questions 배열은 .in() 쿼리로 반환되어 순서 보장 안 됨 → Map으로 ID 기반 조회
  const questionsMap = useMemo(
    () => new Map(questions.map((q) => [q.id, q])),
    [questions]
  );
  const isQ1 = currentQ === 1;
  // question_ids: Q1~Q15 (15개), 인덱스 = currentQ - 1
  const currentQuestionId = session.question_ids?.[currentQ - 1] ?? null;
  const currentQuestion = currentQuestionId ? questionsMap.get(currentQuestionId) ?? null : null;

  // ── 브라우저 뒤로가기 방지 ──
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (phase === "exam" && recorder.state === "recording") {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase, recorder.state]);

  // 질문 오디오는 자동 재생하지 않음 — 실제 OPIc처럼 "질문 듣기" 클릭 시에만 재생

  // ── 업로드 + 제출 ──
  const handleUploadAndSubmit = useCallback(
    async (blob: Blob) => {
      setUploadState("uploading");
      setError(null);
      uploadRetryRef.current = 0;

      const doUpload = async (): Promise<string | null> => {
        try {
          const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) {
            setError("로그인이 필요합니다");
            setUploadState("failed");
            return null;
          }

          const ext = blob.type === "audio/wav" ? "wav" : "webm";
          const filePath = `${user.id}/${sessionId}/Q${currentQ}_${Date.now()}.${ext}`;
          const { error: uploadErr } = await supabase.storage
            .from("mock-test-recordings")
            .upload(filePath, blob, {
              contentType: blob.type,
              upsert: true,
            });

          if (uploadErr) throw uploadErr;

          const { data: urlData } = supabase.storage
            .from("mock-test-recordings")
            .getPublicUrl(filePath);

          return urlData.publicUrl;
        } catch {
          return null;
        }
      };

      // 업로드 재시도 루프 (지수 백오프)
      let publicUrl: string | null = null;
      while (uploadRetryRef.current <= MAX_UPLOAD_RETRIES) {
        publicUrl = await doUpload();
        if (publicUrl) break;

        uploadRetryRef.current += 1;
        if (uploadRetryRef.current > MAX_UPLOAD_RETRIES) {
          setError("업로드 실패. 네트워크를 확인해주세요.");
          setUploadState("failed");
          return;
        }

        setUploadState("retrying");
        await new Promise((r) =>
          setTimeout(r, 1000 * Math.pow(2, uploadRetryRef.current - 1))
        );
      }

      if (!publicUrl) return;

      // SA로 답변 제출
      const result = await submitAnswer({
        session_id: sessionId,
        question_number: currentQ,
        question_id: currentQuestion?.id ?? null,
        audio_url: publicUrl,
        audio_duration: recorder.duration,
      });

      if (result.error) {
        setError(result.error);
        setUploadState("failed");
      } else {
        setUploadState("submitted");
        setAnsweredQuestions((prev) => new Set(prev).add(currentQ));
        setEvalStatusMap((prev) => ({
          ...prev,
          [currentQ]: isQ1 ? ("skipped" as EvalStatus) : ("pending" as EvalStatus),
        }));
      }
    },
    [sessionId, currentQ, isQ1, currentQuestion, recorder.duration]
  );

  // recorder blob 준비 시 자동 업로드
  useEffect(() => {
    if (recorder.state === "stopped" && recorder.audioBlob && uploadState === "idle") {
      handleUploadAndSubmit(recorder.audioBlob);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder.state, recorder.audioBlob]);

  // ── 다음 문제로 이동 (실제 상태 전환) ──
  const advanceToNext = useCallback(() => {
    pendingAdvanceRef.current = false;
    if (currentQ >= 15) {
      setPhase("completing");
      completeSession({ session_id: sessionId }).then((res) => {
        if (res.error) {
          setError(res.error);
          setPhase("exam");
          return;
        }
        queryClient.invalidateQueries({ queryKey: ["mock-exam-history"] });
        queryClient.invalidateQueries({ queryKey: ["mock-active-session"] });
        setPhase("waiting");
      });
      return;
    }
    setCurrentQ((prev) => prev + 1);
    recorder.reset();
    questionPlayer.reset();
    setUploadState("idle");
    setError(null);
    setShowQuestion("hidden");
  }, [currentQ, sessionId, queryClient, recorder, questionPlayer]);

  // ── "다음" 버튼 핸들러 (소리담 패턴: 1클릭으로 중지+업로드+이동) ──
  const handleNext = useCallback(() => {
    // 녹음 중 → 중지 (blob 생성 → 자동 업로드 → 자동 이동)
    if (recorder.state === "recording") {
      pendingAdvanceRef.current = true;
      recorder.stopRecording();
      return;
    }
    // 이미 제출 완료 → 즉시 이동
    if (uploadState === "submitted") {
      advanceToNext();
      return;
    }
    // 업로드 진행 중 → 완료 대기 후 자동 이동
    pendingAdvanceRef.current = true;
  }, [recorder, uploadState, advanceToNext]);

  // ── 업로드 완료 후 자동 이동 (pendingAdvance 패턴) ──
  useEffect(() => {
    if (uploadState === "submitted" && pendingAdvanceRef.current) {
      advanceToNext();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadState]);

  // ── 리플레이 (녹음 중이면 먼저 중지) ──
  const handleReplay = useCallback(() => {
    if (!questionPlayer.canReplay || questionPlayer.hasReplayed) return;
    // 녹음 중이면 리셋 (리플레이 후 onPlaybackEnded로 다시 시작됨)
    if (recorder.state === "recording") {
      recorder.reset();
    }
    questionPlayer.replay();
  }, [questionPlayer, recorder]);

  // ── 질문 듣기 버튼 ──
  const handlePlayQuestion = useCallback(() => {
    if (questionPlayer.isPlaying) return;
    if (!currentQuestion?.audio_url) return;
    if (recorder.state === "recording") {
      recorder.reset();
    }
    questionPlayer.play(currentQuestion.audio_url);
  }, [questionPlayer, recorder, currentQuestion]);

  // ── 40분 경고 ──
  const handleTimeExpired = useCallback(() => {
    if (!isTraining) setShowTimeWarning(true);
  }, [isTraining]);

  const handleContinueAfterWarning = useCallback(() => {
    setShowTimeWarning(false);
  }, []);

  const handleEndAfterWarning = useCallback(() => {
    setShowTimeWarning(false);
    setPhase("completing");
    completeSession({ session_id: sessionId }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["mock-exam-history"] });
      queryClient.invalidateQueries({ queryKey: ["mock-active-session"] });
      setPhase("waiting");
    });
  }, [sessionId, queryClient]);

  // ── 5단계 가이드 활성 스텝 ──
  const activeGuideStep: GuideStep = (() => {
    if (questionPlayer.isPlaying) return "listen";
    if (questionPlayer.canReplay && !questionPlayer.hasReplayed) return "replay";
    if (recorder.state === "recording") return "record";
    if (
      uploadState === "uploading" ||
      uploadState === "retrying" ||
      uploadState === "submitted"
    )
      return "next";
    const hasPendingEval = Object.values(evalStatusMap).some(
      (s) =>
        s === "pending" ||
        s === "processing" ||
        s === "stt_completed" ||
        s === "evaluating"
    );
    if (hasPendingEval) return "eval";
    return "listen";
  })();

  // 시간 포맷
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ── 세션 완료 중 ──
  if (phase === "completing") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-primary-500" />
          <p className="text-sm text-foreground-secondary">
            세션을 마무리하고 있습니다...
          </p>
        </div>
      </div>
    );
  }

  // ── 평가 대기 화면 ──
  if (phase === "waiting") {
    return (
      <EvalWaiting
        sessionId={sessionId}
        totalQuestions={14}
        onReportReady={() => router.push("/mock-exam")}
      />
    );
  }

  // ── 시험 진행 화면 ──
  return (
    <div className={`flex flex-1 flex-col overflow-hidden ${viewingEvalQNum ? "" : "md:h-auto md:overflow-visible"}`}>
      {/* 오프라인 배너 */}
      {!isOnline && (
        <div className="flex items-center gap-2 bg-accent-500 px-4 py-2 text-sm text-white">
          <WifiOff size={14} />
          <span>오프라인 상태입니다. 녹음은 계속됩니다.</span>
        </div>
      )}

      {/* ── 상단 바: 문항 + 타이머 + 프로그레스 + 질문 그리드 ── */}
      <div className="border-b border-border bg-surface px-3 py-2 sm:px-6 sm:py-3">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground-secondary">
              문항{" "}
              <span className="font-bold text-foreground">{currentQ}</span> / 15
            </span>
            <SessionTimer
              mode={mode}
              startedAt={session.started_at}
              onTimeExpired={handleTimeExpired}
            />
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-surface-secondary">
            <div
              className="h-1.5 rounded-full bg-primary-500 transition-all"
              style={{ width: `${(currentQ / 15) * 100}%` }}
            />
          </div>
          {/* 질문 그리드 */}
          <div className="mt-3">
            <QuestionGrid
              currentQ={currentQ}
              mode={mode}
              answeredQuestions={answeredQuestions}
              skippedQuestions={new Set()}
              evalStatuses={evalStatusMap}
              viewingEvalQNum={viewingEvalQNum}
              onEvalClick={(qNum) => setViewingEvalQNum(qNum)}
              onReturnToSession={() => setViewingEvalQNum(null)}
            />
          </div>
        </div>
      </div>

      {/* ── 메인 영역: 평가 뷰 / 세션 뷰 조건부 렌더링 ── */}
      {isTraining && viewingEvalQNum ? (
        <TrainingEvalPanel
          sessionId={sessionId}
          questionNumber={viewingEvalQNum}
          questionInfo={(() => {
            const qId = session.question_ids?.[viewingEvalQNum - 1];
            const q = qId ? questionsMap.get(qId) : null;
            return q ? { question_english: q.question_english, question_korean: q.question_korean, question_type_eng: q.question_type_eng, topic: q.topic, category: q.category } : null;
          })()}
          onClose={() => setViewingEvalQNum(null)}
        />
      ) : (
      <div className="mx-auto flex w-full max-w-5xl min-h-0 flex-1 flex-col overflow-hidden px-3 py-2 sm:px-6 sm:py-4 md:min-h-auto md:overflow-visible">
        {/* 5단계 진행 가이드 (relative 컨테이너 — 알림 배너 오버랩용) */}
        <div className="relative mb-2 rounded-xl border border-border bg-surface p-2 md:mb-4 md:p-3">
          {/* 훈련 모드: 평가 완료 알림 배너 (오버랩) */}
          {isTraining && evalBanner && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-primary-50/95 animate-fadeIn">
              <div className="flex items-center gap-2 text-xs font-medium text-primary-700">
                <CheckCircle2 size={14} className="shrink-0" />
                <span>
                  <strong>Q{evalBanner}</strong> 평가 완료 — 상단 번호를 눌러 결과를 확인하세요
                </span>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-1 md:gap-3">
            {[
              {
                key: "listen" as GuideStep,
                label: "질문 듣기",
                activeIcon: <Volume2 size={16} className="text-white md:h-5 md:w-5" />,
                icon: <Headphones size={16} className="text-foreground-muted md:h-5 md:w-5" />,
              },
              {
                key: "replay" as GuideStep,
                label:
                  questionPlayer.canReplay && !questionPlayer.hasReplayed
                    ? `${questionPlayer.replayCountdown}초`
                    : "다시 듣기",
                activeIcon: <Clock size={16} className="text-white md:h-5 md:w-5" />,
                icon: <RefreshCw size={16} className="text-foreground-muted md:h-5 md:w-5" />,
              },
              {
                key: "record" as GuideStep,
                label: "답변 녹음",
                activeIcon: <Mic size={16} className="text-white md:h-5 md:w-5" />,
                icon: <Mic size={16} className="text-foreground-muted md:h-5 md:w-5" />,
              },
              {
                key: "next" as GuideStep,
                label: "다음 문제",
                activeIcon:
                  uploadState === "uploading" || uploadState === "retrying" ? (
                    <Loader2 size={16} className="animate-spin text-white md:h-5 md:w-5" />
                  ) : (
                    <ArrowRight size={16} className="text-white md:h-5 md:w-5" />
                  ),
                icon: <ArrowRight size={16} className="text-foreground-muted md:h-5 md:w-5" />,
              },
              {
                key: "eval" as GuideStep,
                label: "답변 평가",
                activeIcon: <Bot size={16} className="text-white md:h-5 md:w-5" />,
                icon: <Bot size={16} className="text-foreground-muted md:h-5 md:w-5" />,
              },
            ].map((step, i, arr) => (
              <div key={step.key} className="flex flex-1 items-center">
                <div className="flex-1 text-center">
                  <div
                    className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full transition-all md:mb-1 md:h-10 md:w-10 md:rounded-lg ${
                      activeGuideStep === step.key
                        ? "bg-primary-500"
                        : "border border-border bg-surface-secondary"
                    }`}
                  >
                    {activeGuideStep === step.key ? step.activeIcon : step.icon}
                  </div>
                  <div className="hidden font-medium text-foreground-secondary md:block md:text-xs">
                    {step.label}
                  </div>
                </div>
                {i < arr.length - 1 && (
                  <div className="h-px w-2 flex-shrink-0 bg-border md:w-5" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 훈련 모드: 질문 텍스트 — PC만 push-down 토글 (모바일은 AVA 오버레이) */}
        {isTraining && currentQuestion && (
          <div className="hidden rounded-xl border border-border bg-primary-50/30 md:mb-4 md:block md:p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-medium text-primary-700">
                  Q{currentQ} · {currentQuestion.category}
                </span>
                <span className="text-xs text-foreground-muted">
                  {currentQuestion.topic}
                </span>
              </div>
              <button
                onClick={() => setShowQuestion((prev) => prev === "hidden" ? "en" : "hidden")}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-foreground-muted hover:bg-primary-100/50 hover:text-foreground-secondary"
              >
                {showQuestion !== "hidden" ? <EyeOff size={14} /> : <Eye size={14} />}
                {showQuestion !== "hidden" ? "숨기기" : "질문 보기"}
              </button>
            </div>
            {showQuestion !== "hidden" && (
              <div className="mt-2 border-t border-border/50 pt-2">
                <p className="text-sm font-medium text-foreground">
                  {currentQuestion.question_english}
                </p>
                <p className="mt-0.5 text-xs text-foreground-secondary">
                  {currentQuestion.question_korean}
                </p>
              </div>
            )}
          </div>
        )}

        {/* 에러 메시지 */}
        {(error || recorder.error) && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error || recorder.error}
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            메인 2-Column 프레임
            좌측: AVA 면접관 + 재생 컨트롤
            우측: 녹음 시간 + 볼륨 + 상태 + Next
           ════════════════════════════════════════════════════ */}
        <div className="flex min-h-0 flex-1 flex-col md:flex-none md:min-h-auto md:rounded-2xl md:border md:border-border md:bg-surface md:p-5">
          <div className="flex min-h-0 flex-1 flex-col gap-2 md:flex-row md:min-h-auto md:flex-none md:gap-5">
            {/* === 좌측: AVA 면접관 === */}
            <div className="flex min-h-0 flex-1 flex-col gap-2 md:flex-none md:w-[42%] md:gap-3">
              {/* 아바타 — aspect-ratio로 이미지와 비율 일치 */}
              <div ref={avaContainerRef} className="relative w-full min-h-0 flex-1 overflow-hidden rounded-xl border border-border md:flex-none md:aspect-square" style={{ backgroundColor: "#F7F3EE" }}>
                <AvaAvatar
                  isSpeaking={questionPlayer.isPlaying}
                  isListening={recorder.state === "recording"}
                />

                {/* 모바일 전용: 훈련 모드 질문 오버레이 (AVA 이미지 위) */}
                {isTraining && currentQuestion && (
                  <>
                    {/* 상단: 주제 태그 + EN/한글 토글 버튼 */}
                    <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between p-2 md:hidden">
                      <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                        Q{currentQ} · {currentQuestion.topic}
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setShowQuestion((prev) => prev === "en" ? "hidden" : "en")}
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm ${
                            showQuestion === "en"
                              ? "bg-white/80 text-black"
                              : "bg-black/40 text-white"
                          }`}
                        >
                          EN
                        </button>
                        <button
                          onClick={() => setShowQuestion((prev) => prev === "ko" ? "hidden" : "ko")}
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm ${
                            showQuestion === "ko"
                              ? "bg-white/80 text-black"
                              : "bg-black/40 text-white"
                          }`}
                        >
                          한글
                        </button>
                      </div>
                    </div>

                    {/* 하단: 질문 텍스트 오버레이 (선택한 언어만) */}
                    {showQuestion !== "hidden" && (
                      <div className="absolute inset-x-0 bottom-0 z-10 max-h-[60%] overflow-y-auto bg-black/60 px-2.5 py-2 backdrop-blur-sm md:hidden">
                        <p className="text-[11px] leading-relaxed text-white">
                          {showQuestion === "en"
                            ? currentQuestion.question_english
                            : currentQuestion.question_korean}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* 재생 컨트롤 (데스크탑만) */}
              <div className="hidden rounded-xl border border-border bg-surface-secondary p-3 md:block">
                {/* 재생 프로그레스 바 */}
                <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-primary-500 transition-[width] duration-300 ease-linear"
                    style={{ width: `${questionPlayer.playbackProgress}%` }}
                  />
                </div>

                {/* 재생 버튼 — 상태별 분기 */}
                {!questionPlayer.hasPlayed && !questionPlayer.isPlaying ? (
                  <button
                    onClick={handlePlayQuestion}
                    disabled={!currentQuestion?.audio_url || questionPlayer.isPlaying}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-primary-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 md:py-3 md:text-base"
                  >
                    <Volume2 size={18} />
                    질문 듣기
                  </button>
                ) : questionPlayer.isPlaying ? (
                  <button
                    disabled
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50 md:py-3 md:text-base"
                  >
                    <Loader2 size={18} className="animate-spin" />
                    Playing...
                  </button>
                ) : questionPlayer.canReplay && !questionPlayer.hasReplayed ? (
                  <button
                    onClick={handleReplay}
                    className="flex w-full animate-pulse items-center justify-center gap-2 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-all md:py-3 md:text-base"
                  >
                    <RotateCcw size={18} />
                    다시 듣기 ({questionPlayer.replayCountdown}초)
                  </button>
                ) : (
                  <div className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-surface-secondary px-4 py-2.5 text-sm font-bold text-foreground-muted md:py-3 md:text-base">
                    <Volume2 size={18} />
                    재생 완료
                  </div>
                )}

                {/* 오디오 없는 질문: 수동 녹음 시작 */}
                {!currentQuestion?.audio_url && recorder.state === "idle" && uploadState === "idle" && (
                  <button
                    onClick={() => recorder.startRecording()}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-primary-600 md:py-3 md:text-base"
                  >
                    <Mic size={18} />
                    녹음 시작
                  </button>
                )}
              </div>
            </div>

            {/* === 세로 볼륨바: LED 세그먼트 미터 (데스크탑, AVA 높이 동기화) === */}
            <div
              className="hidden w-4 flex-shrink-0 md:flex md:flex-col md:items-center md:gap-1"
              style={{ height: avaHeight > 0 ? avaHeight : undefined }}
            >
              {/* w-full 필수: 부모 items-center가 자식 width를 content로 축소시키는 문제 방지 */}
              <div className="flex w-full flex-1 flex-col-reverse gap-px rounded-lg border border-border bg-surface-secondary p-0.5">
                {Array.from({ length: 24 }).map((_, i) => {
                  const threshold = (i + 1) / 24;
                  const vol =
                    recorder.state === "recording" ? recorder.volume : 0;
                  const lit = vol >= threshold;
                  const color =
                    i < 16
                      ? lit ? "bg-primary-300" : "bg-border"
                      : i < 21
                        ? lit ? "bg-primary-500" : "bg-border"
                        : lit ? "bg-accent-500" : "bg-border";
                  return (
                    <div
                      key={i}
                      className={`w-full flex-1 rounded-sm transition-colors duration-75 ${color}`}
                    />
                  );
                })}
              </div>
              <Mic
                size={12}
                className={`shrink-0 transition-colors ${
                  recorder.state === "recording"
                    ? "animate-pulse text-primary-500"
                    : "text-foreground-muted"
                }`}
              />
            </div>

            {/* === 우측: 수험자 녹음 === */}
            <div className="flex flex-col gap-1 md:flex-1 md:gap-2">
              {/* 녹음 시간 표시 (데스크탑만) */}
              <div className="hidden items-center justify-between rounded-xl border border-border bg-surface-secondary p-3 md:flex">
                <span className="text-sm font-medium text-foreground-secondary">
                  녹음 시간
                </span>
                <span
                  className={`font-mono text-2xl font-bold md:text-3xl ${
                    recorder.state === "recording"
                      ? "text-primary-600"
                      : "text-foreground-muted"
                  }`}
                >
                  {formatTime(recorder.duration)}
                </span>
              </div>

              {/* ── 상태 표시 영역 (데스크탑만) ── */}
              <div className="hidden flex-1 flex-col items-center justify-center rounded-xl border border-border bg-surface-secondary p-4 md:flex">
                {/* IDLE 초기 */}
                {recorder.state === "idle" &&
                  uploadState === "idle" &&
                  !questionPlayer.isPlaying &&
                  !questionPlayer.hasPlayed && (
                    <div className="text-center">
                      <Headphones
                        size={28}
                        className="mx-auto mb-2 text-foreground-muted md:h-8 md:w-8"
                      />
                      <p className="text-sm font-medium text-foreground-secondary">
                        준비되셨나요?
                      </p>
                      <p className="mt-1 text-xs text-foreground-muted">
                        좌측 &apos;질문 듣기&apos; 버튼을 눌러 질문을 들어주세요
                      </p>
                    </div>
                  )}

                {/* 질문 재생 중 */}
                {questionPlayer.isPlaying && (
                  <div className="text-center">
                    <Volume2
                      size={28}
                      className="mx-auto mb-2 animate-pulse text-primary-500 md:h-8 md:w-8"
                    />
                    <p className="text-sm font-medium text-primary-600">
                      질문을 듣는 중...
                    </p>
                    <p className="mt-1 text-xs text-foreground-muted">
                      질문을 잘 듣고 답변을 준비하세요
                    </p>
                  </div>
                )}

                {/* 녹음 중 */}
                {recorder.state === "recording" && (
                  <div className="relative flex w-full flex-1 flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-primary-200 bg-primary-50">
                    <div className="absolute inset-0 animate-pulse bg-primary-100/50" />
                    <div className="z-10 flex items-center gap-2">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-primary-500" />
                      <span className="text-sm font-bold uppercase tracking-widest text-primary-600 md:text-base">
                        Recording...
                      </span>
                    </div>
                    {recorder.warningMessage && (
                      <p
                        className={`z-10 mt-2 text-xs font-medium ${
                          recorder.warning === "silent"
                            ? "text-red-500"
                            : recorder.warning === "too_quiet"
                              ? "text-yellow-600"
                              : "text-orange-500"
                        }`}
                      >
                        {recorder.warningMessage}
                      </p>
                    )}
                  </div>
                )}

                {/* 업로드 중 */}
                {(uploadState === "uploading" || uploadState === "retrying") && (
                  <div className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-primary-200 bg-primary-50 py-6 md:py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary-500 md:h-8 md:w-8" />
                    <span className="animate-pulse text-sm font-medium tracking-wide text-primary-600 md:text-base">
                      {uploadState === "retrying"
                        ? `재시도 중... (${uploadRetryRef.current}/${MAX_UPLOAD_RETRIES})`
                        : "Uploading your audio..."}
                    </span>
                  </div>
                )}

                {/* 제출 완료 */}
                {uploadState === "submitted" && (
                  <div className="text-center">
                    <CheckCircle2
                      size={28}
                      className="mx-auto mb-2 text-green-500 md:h-8 md:w-8"
                    />
                    <p className="text-sm font-medium text-green-600">
                      제출 완료!
                    </p>
                    <p className="mt-1 text-xs text-foreground-muted">
                      다음 문제로 이동하세요
                    </p>
                  </div>
                )}

                {/* 업로드 실패 */}
                {uploadState === "failed" && (
                  <div className="text-center">
                    <AlertTriangle
                      size={28}
                      className="mx-auto mb-2 text-red-500 md:h-8 md:w-8"
                    />
                    <p className="text-sm font-medium text-red-600">
                      업로드 실패
                    </p>
                    <p className="mt-1 text-xs text-foreground-muted">
                      다시 녹음해주세요
                    </p>
                    <button
                      onClick={() => {
                        recorder.reset();
                        setUploadState("idle");
                        setError(null);
                      }}
                      className="mt-3 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
                    >
                      다시 녹음
                    </button>
                  </div>
                )}

                {/* 녹음 대기 */}
                {questionPlayer.hasPlayed &&
                  !questionPlayer.isPlaying &&
                  recorder.state === "idle" &&
                  uploadState === "idle" && (
                    <div className="text-center">
                      <Mic
                        size={28}
                        className="mx-auto mb-2 text-primary-400 md:h-8 md:w-8"
                      />
                      <p className="text-sm text-foreground-secondary">
                        녹음이 곧 시작됩니다...
                      </p>
                    </div>
                  )}
              </div>

              {/* 모바일 전용: 컴팩트 녹음 상태 */}
              <div className="flex min-h-12 flex-col justify-center gap-1.5 md:hidden">
                {/* 녹음 중 상태 */}
                {recorder.state === "recording" && (
                  <div className="rounded-lg border border-primary-100 bg-primary-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                      <span className="text-xs font-medium text-primary-600">Recording...</span>
                      <span className="ml-auto font-mono text-xs font-semibold text-primary-500">
                        {formatTime(recorder.duration)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-primary-100">
                      <div
                        className="h-full rounded-full bg-primary-500 transition-all"
                        style={{ width: `${Math.min(recorder.volume * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* 재생 중 */}
                {questionPlayer.isPlaying && (
                  <div className="flex items-center gap-2 rounded-lg border border-primary-100 bg-primary-50 px-3 py-2">
                    <Volume2 size={14} className="animate-pulse text-primary-500" />
                    <span className="text-xs font-medium text-primary-600">질문을 듣는 중...</span>
                  </div>
                )}

                {/* 업로드 중 */}
                {(uploadState === "uploading" || uploadState === "retrying") && (
                  <div className="flex items-center gap-2 rounded-lg border border-primary-100 bg-primary-50 px-3 py-2">
                    <Loader2 size={14} className="animate-spin text-primary-500" />
                    <span className="text-xs font-medium text-primary-600">
                      {uploadState === "retrying" ? `재시도 중... (${uploadRetryRef.current}/${MAX_UPLOAD_RETRIES})` : "업로드 중..."}
                    </span>
                  </div>
                )}

                {/* 제출 완료 */}
                {uploadState === "submitted" && (
                  <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                    <CheckCircle2 size={14} className="text-green-500" />
                    <span className="text-xs font-medium text-green-600">제출 완료! 다음 문제로 이동하세요</span>
                  </div>
                )}

                {/* 업로드 실패 */}
                {uploadState === "failed" && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                    <AlertTriangle size={14} className="text-red-500" />
                    <span className="text-xs font-medium text-red-600">업로드 실패</span>
                    <button
                      onClick={() => { recorder.reset(); setUploadState("idle"); setError(null); }}
                      className="ml-auto text-xs font-medium text-primary-500"
                    >
                      다시 녹음
                    </button>
                  </div>
                )}

                {/* 대기: 질문 듣기 버튼 / 녹음 시작 버튼 */}
                {recorder.state === "idle" && uploadState === "idle" && !questionPlayer.isPlaying && (
                  <div className="flex gap-2">
                    {!questionPlayer.hasPlayed ? (
                      <button
                        onClick={handlePlayQuestion}
                        disabled={!currentQuestion?.audio_url}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-500 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                      >
                        <Volume2 size={16} />
                        질문 듣기
                      </button>
                    ) : questionPlayer.canReplay && !questionPlayer.hasReplayed ? (
                      <button
                        onClick={handleReplay}
                        className="flex flex-1 animate-pulse items-center justify-center gap-2 rounded-lg bg-primary-500 px-3 py-2.5 text-sm font-bold text-white"
                      >
                        <RotateCcw size={16} />
                        다시 듣기 ({questionPlayer.replayCountdown}초)
                      </button>
                    ) : (
                      <div className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-surface-secondary px-3 py-2 text-xs text-foreground-muted">
                        <Volume2 size={14} />
                        재생 완료
                      </div>
                    )}
                    {/* 오디오 없는 질문: 수동 녹음 시작 */}
                    {!currentQuestion?.audio_url && recorder.state === "idle" && uploadState === "idle" && (
                      <button
                        onClick={() => recorder.startRecording()}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-500 px-3 py-2.5 text-sm font-bold text-white"
                      >
                        <Mic size={16} />
                        녹음 시작
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Next 버튼 */}
              <div className="flex justify-end border-t border-border pt-1 md:pt-3">
                <button
                  onClick={handleNext}
                  disabled={
                    !(
                      (recorder.state === "recording" && recorder.duration >= 10) ||
                      recorder.state === "stopped" ||
                      uploadState === "submitted"
                    ) ||
                    uploadState === "uploading" ||
                    uploadState === "retrying"
                  }
                  className={`inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-bold shadow-lg transition-all md:px-10 md:py-4 md:text-lg ${
                    ((recorder.state === "recording" && recorder.duration >= 10) ||
                      recorder.state === "stopped" ||
                      uploadState === "submitted") &&
                    uploadState !== "uploading" &&
                    uploadState !== "retrying"
                      ? "bg-primary-500 text-white hover:bg-primary-600 active:scale-95"
                      : "cursor-not-allowed bg-surface-secondary text-foreground-muted opacity-50"
                  }`}
                >
                  {uploadState === "uploading" ||
                  uploadState === "retrying" ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      제출 중...
                    </>
                  ) : currentQ >= 15 ? (
                    <>
                      Submit
                      <ChevronRight size={20} />
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight size={20} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* 40분 경고 모달 (실전 모드) */}
      {showTimeWarning && !isTraining && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-surface p-6 shadow-lg">
            <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <AlertTriangle size={20} className="text-accent-500" />
              40분이 경과했습니다
            </div>
            <p className="mt-3 text-sm text-foreground-secondary">
              실제 OPIc 시험이라면 여기서 종료됩니다. 하지만 훈련 목적이므로 남은
              문제를 마저 풀 수 있습니다.
            </p>
            <div className="mt-2 text-sm text-foreground-muted">
              현재 진행: Q{currentQ} / Q15 · 남은 문제: {15 - currentQ}개
            </div>
            <div className="mt-2 rounded-lg bg-primary-50/50 p-2 text-xs text-primary-600">
              15문제를 모두 완료해야 정확한 평가가 가능합니다
            </div>
            <div className="mt-5 flex gap-3">
              <button
                onClick={handleEndAfterWarning}
                className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground-secondary hover:bg-surface-secondary"
              >
                여기서 종료하기
              </button>
              <button
                onClick={handleContinueAfterWarning}
                className="flex-1 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-600"
              >
                남은 문제 마저 풀기
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
