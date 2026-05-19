"use client";

// 스피킹 코치 학습 룸 — Option A: 현재 사이클 중심 레이아웃
// 구조: 압축 sticky 질문 헤더 → slim 진행 바 → 현재 회차 포커스 카드 → 지난 회차 아코디언
// 코칭 결과는 구조화 JSON(coaching_json) 전용 카드로 렌더링, 구버전은 markdown 폴백

import { useState, useTransition, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  AlertCircle,
  Loader2,
  Mic,
  Square,
  Type,
  Volume2,
  ArrowRight,
  GraduationCap,
  TrendingDown,
  TrendingUp,
  Minus,
  ChevronDown,
  Sparkles,
  CornerDownRight,
  CheckCircle2,
  Quote,
  Lightbulb,
  FileText,
  Headphones,
  RotateCcw,
  Coins,
  Eye,
  EyeOff,
  Target,
  BookOpen,
  Repeat,
} from "lucide-react";
import { useRecorder } from "@/lib/hooks/use-recorder";
import { useQuestionPlayer } from "@/lib/hooks/use-question-player";
import { AvaAvatar } from "@/components/mock-exam/session/ava-avatar";
import { formatUsd } from "@/lib/constants/pricing";
import {
  getSessionDetail,
  submitAttempt,
  markTopicMastered,
  checkCoachingCredit,
} from "@/lib/actions/coaching";
import {
  QUESTION_TYPE_LABELS,
  type SessionDetail,
  type AttemptDisplay,
  type MarkMasteredResult,
  type CoachingOutput,
  type CoachingIssue,
} from "@/lib/types/coaching";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Props {
  initialDetail: SessionDetail;
}

type UploadState = "idle" | "uploading" | "retrying" | "submitting" | "submitted" | "failed";

const PROCESSING_STATUSES = ["pending", "preprocessing", "evaluating"];
// 평가가 비정상적으로 오래 걸릴 때의 안내/중단 기준
const SLOW_AFTER_MS = 120_000; // 2분 — "오래 걸려요" 안내 표시
const STUCK_AFTER_MS = 180_000; // 3분 — 폴링 중단 (EF가 멈춘 것으로 판단)

export function LearnRoom({ initialDetail }: Props) {
  const sessionId = initialDetail.session.id;
  const queryClient = useQueryClient();
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [isPending, startTransition] = useTransition();
  const [showMasterConfirm, setShowMasterConfirm] = useState(false);
  const [masterResult, setMasterResult] = useState<MarkMasteredResult | null>(null);

  // 녹음 훅 (최대 4분, 최소 1초)
  const recorder = useRecorder({ maxDuration: 240, minDuration: 1 });

  // 세션 상세 폴링
  const { data: detail } = useQuery({
    queryKey: ["coaching-session-detail", sessionId],
    queryFn: async () => {
      const r = await getSessionDetail(sessionId);
      if (r.error) throw new Error(r.error);
      return r.data ?? initialDetail;
    },
    initialData: initialDetail,
    refetchInterval: (q) => {
      const d = q.state.data as SessionDetail | undefined;
      const lastAttempt = d?.attempts?.[d.attempts.length - 1];
      if (lastAttempt && PROCESSING_STATUSES.includes(lastAttempt.status)) {
        // EF가 멈춘 경우 무한 폴링 방지 — 3분 경과 시 중단
        const elapsed = Date.now() - new Date(lastAttempt.created_at).getTime();
        return elapsed > STUCK_AFTER_MS ? false : 5000;
      }
      return false;
    },
    staleTime: 0,
  });

  const session = detail.session;
  const question = detail.question;
  const attempts = detail.attempts;
  const isMastered = session.status === "mastered";
  const latest = attempts.length > 0 ? attempts[attempts.length - 1] : null;
  const past = attempts.slice(0, -1);
  const currentProcessing = !!latest && PROCESSING_STATUSES.includes(latest.status);

  // 업로드 재시도 ref (모의고사 동일 패턴)
  const uploadRetryRef = useRef(0);
  const MAX_UPLOAD_RETRIES = 3;
  const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10MB — Whisper 25MB 한도 방어

  // 업로드 + 제출 (모의고사 handleUploadAndSubmit 동일 패턴)
  const handleUploadAndSubmit = useCallback(
    async (blob: Blob) => {
      // 파일 크기 체크
      if (blob.size > MAX_AUDIO_SIZE) {
        setError("녹음 파일이 너무 큽니다. 다시 녹음해 주세요.");
        recorder.reset();
        setUploadState("idle");
        return;
      }

      setUploadState("uploading");
      setError(null);
      uploadRetryRef.current = 0;

      const ext = blob.type.includes("wav") ? "wav" : "webm";
      const filePath = `${session.user_id}/${session.id}/${Date.now()}.${ext}`;

      const doUpload = async (): Promise<boolean> => {
        try {
          const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );
          const { error: uploadErr } = await supabase.storage
            .from("coaching-recordings")
            .upload(filePath, blob, {
              contentType: blob.type || "audio/webm",
              upsert: true,
            });
          if (uploadErr) return false;
          return true;
        } catch {
          return false;
        }
      };

      // 업로드 재시도 루프 (지수 백오프)
      let uploaded = false;
      while (uploadRetryRef.current <= MAX_UPLOAD_RETRIES) {
        uploaded = await doUpload();
        if (uploaded) break;

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

      if (!uploaded) return;

      setUploadState("submitting");

      const result = await submitAttempt({
        session_id: sessionId,
        input_mode: "voice",
        audio_url: filePath,
        audio_duration: recorder.duration,
      });

      if (result.error || !result.data) {
        setError(result.error ?? "답변 제출 실패");
        setUploadState("failed");
        return;
      }

      setUploadState("submitted");
      recorder.reset();
      queryClient.invalidateQueries({ queryKey: ["coaching-session-detail", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["coaching-credit"] });
      setTimeout(() => setUploadState("idle"), 1000);
    },
    [recorder, sessionId, session.id, session.user_id, queryClient]
  );

  // recorder blob 준비 시 자동 업로드 (모의고사 동일 패턴)
  useEffect(() => {
    if (
      recorder.state === "stopped" &&
      recorder.audioBlob &&
      uploadState === "idle"
    ) {
      handleUploadAndSubmit(recorder.audioBlob);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder.state, recorder.audioBlob]);

  // 제출 실패 후 다시 녹음
  const handleResetAnswer = useCallback(() => {
    setError(null);
    setUploadState("idle");
    uploadRetryRef.current = 0;
    recorder.reset();
  }, [recorder]);

  function confirmMastered() {
    startTransition(async () => {
      const r = await markTopicMastered(sessionId);
      if (r.error) {
        setError(r.error);
        setShowMasterConfirm(false);
        return;
      }
      setMasterResult(r.data ?? null);
      setShowMasterConfirm(false);
      queryClient.invalidateQueries({ queryKey: ["coaching-session-detail", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["coaching-type-cards"] });
      queryClient.invalidateQueries({ queryKey: ["coaching-resumable"] });
    });
  }

  return (
    <div className="space-y-4">
      {/* 세션 메타 — 목표 등급 + 토픽·유형 + 회차 (Sticky) */}
      <SessionMetaStrip
        targetLevel={session.target_level ?? null}
        topic={session.topic}
        questionType={session.question_type}
        currentAttemptNumber={attempts.length}
        isMastered={isMastered}
      />

      {/* slim 진행 바 */}
      <ProgressStrip
        attempts={attempts}
        isMastered={isMastered}
        onGraduate={() => setShowMasterConfirm(true)}
      />

      {/* 졸업 완료 / 현재 회차 */}
      {isMastered ? (
        <MasteredCard
          masterResult={masterResult}
          onPickAnother={() =>
            router.push(
              `/coaching?type=${session.question_type}&topic=${encodeURIComponent(session.topic)}`
            )
          }
        />
      ) : (
        <CurrentCycle
          latest={latest}
          nextAttemptNumber={attempts.length + 1}
          currentProcessing={currentProcessing}
          recorder={recorder}
          question={question}
          uploadState={uploadState}
          onResetAnswer={handleResetAnswer}
          error={error}
          hasAttempts={attempts.length > 0}
          onGraduate={() => setShowMasterConfirm(true)}
        />
      )}

      {/* 지난 회차 아코디언 */}
      {past.length > 0 && <PastAttempts attempts={past} />}

      <ConfirmDialog
        open={showMasterConfirm}
        onConfirm={confirmMastered}
        onCancel={() => setShowMasterConfirm(false)}
        title="이 질문을 졸업할까요?"
        description="졸업하면 이 세션은 완료 처리되고 토픽 마스터 진척에 반영돼요. 더 연습하고 싶으면 취소하세요."
        confirmLabel="졸업하기"
        cancelLabel="더 연습하기"
        variant="warning"
        icon={GraduationCap}
        isLoading={isPending}
      />
    </div>
  );
}

// ============================================================
// 세션 메타 — 목표 등급 + 토픽·유형 + 회차 (학생 컨텍스트 sticky 카드)
// 사용자 의도: 학습 룸에서 "내가 어떤 코칭을 받고 있는지" 한눈에 인식
// ANTI-DISCLOSURE: 추정 등급(evaluation.estimated_grade) 노출 X, 목표 등급만
// ============================================================

const TARGET_LEVEL_DESCRIPTIONS: Record<string, string> = {
  IL: "단순 문장으로 의사소통",
  IM1: "빈도 부사 + 격상 어휘 1~2개",
  IM2: "두 문장 묶기 + 단락 진입",
  IM3: "Skeleton 골격 도입",
  IH: "Skeleton 완성 + 위치별 표지",
  AL: "분사·강조·비교급·토론적 마무리",
};

function SessionMetaStrip({
  targetLevel,
  topic,
  questionType,
  currentAttemptNumber,
  isMastered,
}: {
  targetLevel: string | null;
  topic: string;
  questionType: string;
  currentAttemptNumber: number;
  isMastered: boolean;
}) {
  const typeLabel =
    QUESTION_TYPE_LABELS[questionType as keyof typeof QUESTION_TYPE_LABELS] ??
    questionType;
  const levelDescription = targetLevel
    ? TARGET_LEVEL_DESCRIPTIONS[targetLevel] ?? null
    : null;

  return (
    <div className="sticky top-0 z-10 -mx-4 border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur-sm sm:-mx-6 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {/* 목표 등급 뱃지 */}
        {targetLevel && (
          <div
            className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1.5 ring-1 ring-primary-200"
            title={levelDescription ?? undefined}
          >
            <Target className="h-3.5 w-3.5 text-primary-600" />
            <span className="text-[11px] font-medium text-foreground-secondary">목표</span>
            <span className="text-xs font-bold text-primary-700">{targetLevel}</span>
          </div>
        )}

        {/* 토픽 · 유형 칩 */}
        <div className="inline-flex items-center gap-1.5 rounded-full bg-surface-secondary px-3 py-1.5">
          <BookOpen className="h-3.5 w-3.5 text-foreground-muted" />
          <span className="text-xs font-medium text-foreground">{topic}</span>
          <span className="text-[11px] text-foreground-muted">·</span>
          <span className="text-xs text-foreground-secondary">{typeLabel}</span>
        </div>

        {/* 회차 */}
        <div className="inline-flex items-center gap-1.5 rounded-full bg-surface-secondary px-3 py-1.5">
          <Repeat className="h-3.5 w-3.5 text-foreground-muted" />
          <span className="text-xs font-medium text-foreground">
            {isMastered ? "졸업 완료" : `${currentAttemptNumber}회차`}
          </span>
        </div>

        {/* 등급별 한 줄 가이드 (옵션 — 데스크탑에서만) */}
        {levelDescription && (
          <span className="ml-auto hidden text-[11px] text-foreground-muted md:inline">
            <Sparkles className="mr-1 inline h-3 w-3" />
            {levelDescription}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================
// slim 진행 바 — 졸업까지 개선점 추이
// ============================================================

function ProgressStrip({
  attempts,
  isMastered,
  onGraduate,
}: {
  attempts: AttemptDisplay[];
  isMastered: boolean;
  onGraduate: () => void;
}) {
  const done = attempts.filter((a) => a.status === "done" && a.display_summary);
  const counts = done.map((a) => a.display_summary!.흠_count);
  const current = counts.length > 0 ? counts[counts.length - 1] : undefined;
  const prev = counts.length >= 2 ? counts[counts.length - 2] : null;
  // 졸업 판정은 코치가 내린 graduation 필드를 단일 소스로 사용
  // (구버전 회차엔 없음 → 흠 개수 ≤ 1 폴백)
  const grad = done.length > 0 ? done[done.length - 1].coaching_json?.graduation : undefined;
  const ready = grad?.ready ?? false;
  const gradReason = grad?.reason?.trim() ?? "";

  let trend: "down" | "up" | "flat" | null = null;
  if (current !== undefined && prev !== null) {
    trend = current < prev ? "down" : current > prev ? "up" : "flat";
  }

  // 첫 평가 전 — 안내만
  if (done.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5">
        <GraduationCap className="h-4 w-4 shrink-0 text-foreground-muted" />
        <p className="text-xs leading-relaxed text-foreground-secondary">
          개선점을 <strong className="text-foreground">0~1개</strong>로 줄이면 이 질문 졸업이에요.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border px-4 py-2.5 ${
        ready && !isMastered ? "border-primary-300 bg-primary-50" : "border-border bg-surface"
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-center gap-1.5">
          <GraduationCap
            className={`h-4 w-4 ${ready ? "text-primary-600" : "text-foreground-muted"}`}
          />
          <span className="text-xs font-semibold text-foreground">졸업까지</span>
        </div>

        {/* 개선점 추이 */}
        <div className="flex items-center gap-1">
          {counts.map((c, i) => (
            <div key={i} className="flex items-center gap-1">
              {i > 0 && <ArrowRight className="h-3 w-3 text-foreground-muted" />}
              <span
                className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold ${
                  i === counts.length - 1
                    ? ready
                      ? "bg-primary-500 text-white"
                      : "bg-foreground text-background"
                    : "bg-surface-secondary text-foreground-secondary"
                }`}
              >
                {c}
              </span>
            </div>
          ))}
          <span className="ml-1 text-[11px] text-foreground-muted">→ 목표 0~1</span>
        </div>

        {trend && (
          <span
            className={`flex items-center gap-0.5 text-[11px] font-medium ${
              trend === "down"
                ? "text-green-600"
                : trend === "up"
                  ? "text-accent-600"
                  : "text-foreground-muted"
            }`}
          >
            {trend === "down" ? (
              <TrendingDown className="h-3.5 w-3.5" />
            ) : trend === "up" ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <Minus className="h-3.5 w-3.5" />
            )}
            {trend === "down" ? "개선 중" : trend === "up" ? "주의" : "정체"}
          </span>
        )}

        {ready && !isMastered && (
          <button
            type="button"
            onClick={onGraduate}
            className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-600"
          >
            <GraduationCap className="h-3.5 w-3.5" />
            졸업하기
          </button>
        )}
      </div>

      {!isMastered && (gradReason || ready) && (
        <p
          className={`mt-2 text-xs font-medium ${
            ready ? "text-primary-700" : "text-foreground-secondary"
          }`}
        >
          {gradReason || "개선점이 거의 없어요. 이 질문 졸업할 준비가 됐어요!"}
        </p>
      )}
    </div>
  );
}

// ============================================================
// 현재 회차 — 최신 코칭 결과 + 다음 답변 입력 (포커스 존)
// ============================================================

function CurrentCycle({
  latest,
  nextAttemptNumber,
  currentProcessing,
  recorder,
  question,
  uploadState,
  onResetAnswer,
  error,
  hasAttempts,
  onGraduate,
}: {
  latest: AttemptDisplay | null;
  nextAttemptNumber: number;
  currentProcessing: boolean;
  recorder: ReturnType<typeof useRecorder>;
  question: SessionDetail["question"];
  uploadState: UploadState;
  onResetAnswer: () => void;
  error: string | null;
  hasAttempts: boolean;
  onGraduate: () => void;
}) {
  // "한 번 더 답변하기" 수동 표시 — 새 회차가 생기면 자동 해제
  const [recorderRevealed, setRecorderRevealed] = useState(false);
  useEffect(() => {
    setRecorderRevealed(false);
  }, [latest?.id]);

  const submitInFlight =
    uploadState === "uploading" ||
    uploadState === "retrying" ||
    uploadState === "submitting" ||
    uploadState === "submitted";

  // AVA 녹음 화면 표시 조건: 첫 답변 / 평가 중 / 제출 중 / "한 번 더" 클릭
  const showRecorder =
    latest === null || currentProcessing || submitInFlight || recorderRevealed;

  if (showRecorder) {
    return (
      <AvaRecorder
        recorder={recorder}
        question={question}
        uploadState={uploadState}
        evaluating={currentProcessing}
        onResetAnswer={onResetAnswer}
        attemptNumber={nextAttemptNumber}
        error={error}
      />
    );
  }

  if (!latest) return null;

  // 코칭 결과 카드 + 다음 액션
  return (
    <section className="overflow-hidden rounded-2xl border border-primary-200 bg-surface shadow-sm">
      <div className="flex items-center gap-2 border-b border-border bg-primary-50/50 px-4 py-2.5 sm:px-5">
        <span className="flex h-2 w-2 rounded-full bg-primary-500" />
        <span className="text-sm font-bold text-foreground">
          {latest.attempt_number}회차 코칭 결과
        </span>
      </div>
      <div className="px-4 py-4 sm:px-5">
        <AttemptBody attempt={latest} />
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => setRecorderRevealed(true)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
          >
            <Mic className="h-4 w-4" />
            한 번 더 답변하기
          </button>
          {hasAttempts && (
            <button
              type="button"
              onClick={onGraduate}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-primary-200 py-2.5 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-50"
            >
              <GraduationCap className="h-4 w-4" />
              이 질문 졸업하기
            </button>
          )}
        </div>
        {error && (
          <div className="mt-3 flex items-center gap-2 text-sm text-accent-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================================
// 회차 본문 — 상태별 (처리 중 / 실패 / 완료)
// ============================================================

function AttemptBody({ attempt }: { attempt: AttemptDisplay }) {
  const isProcessing = PROCESSING_STATUSES.includes(attempt.status);
  const isFailed = attempt.status === "failed";

  if (isProcessing) {
    const statusLabel =
      {
        pending: "전처리 대기 중",
        preprocessing: "트랜스크립트 정제 중",
        evaluating: "코칭 생성 중",
      }[attempt.status as "pending" | "preprocessing" | "evaluating"] ?? "처리 중";
    const slow = Date.now() - new Date(attempt.created_at).getTime() > SLOW_AFTER_MS;
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
        <p className="text-sm font-medium text-foreground">{attempt.attempt_number}회차 — {statusLabel}…</p>
        {slow ? (
          <p className="max-w-xs text-xs text-accent-600">
            예상보다 오래 걸리고 있어요. 잠시 후에도 그대로면 새로고침하거나 다시 답변해 주세요.
          </p>
        ) : (
          <p className="text-xs text-foreground-muted">보통 20~40초 걸려요. 이 화면에서 기다리시면 됩니다.</p>
        )}
      </div>
    );
  }

  if (isFailed) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-accent-50 px-4 py-3 text-sm text-accent-700">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {attempt.attempt_number}회차 평가에 실패했어요. 다시 답변해 주세요.
      </div>
    );
  }

  // 완료
  return (
    <div className="space-y-4">
      {attempt.coaching_json ? (
        <CoachingResult attemptNumber={attempt.attempt_number} coaching={attempt.coaching_json} />
      ) : (
        <p className="text-sm text-foreground-muted">코칭 결과를 불러오는 중…</p>
      )}
      <TranscriptDetails attempt={attempt} />
    </div>
  );
}

// ============================================================
// 구조화 코칭 결과 — 전용 카드 UI
// ============================================================

function CoachingResult({
  attemptNumber,
  coaching,
}: {
  attemptNumber: number;
  coaching: CoachingOutput;
}) {
  return (
    <div className="space-y-4">
      {/* 회차 라벨 + 인사 */}
      <div>
        <div className="mb-1.5 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary-500" />
          <span className="text-xs font-bold uppercase tracking-wide text-primary-600">
            {attemptNumber}회차 코칭
          </span>
        </div>
        {coaching.intro && (
          <p className="text-sm leading-relaxed text-foreground">{coaching.intro}</p>
        )}
      </div>

      {/* 진척 비교 */}
      {coaching.progress_table && coaching.progress_table.length > 0 && (
        <ProgressTable rows={coaching.progress_table} />
      )}

      {/* 개선점 */}
      {coaching.issues.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground-secondary">
            <span className="h-px flex-1 bg-border" />
            짚어볼 점 {coaching.issues.length}개
            <span className="h-px flex-1 bg-border" />
          </div>
          {coaching.issues.map((issue, i) => (
            <IssueCard key={i} index={i + 1} issue={issue} />
          ))}
        </div>
      )}

      {/* 통합 답변 */}
      {coaching.model_answer?.text && <ModelAnswer modelAnswer={coaching.model_answer} />}

      {/* 학습자 액션 */}
      {coaching.action_items && coaching.action_items.length > 0 && (
        <ActionChecklist items={coaching.action_items} />
      )}

      {/* 마무리 */}
      {coaching.closing && (
        <p className="rounded-xl bg-surface-secondary px-4 py-2.5 text-xs leading-relaxed text-foreground-secondary">
          💡 {coaching.closing}
        </p>
      )}
    </div>
  );
}

// 진척 비교 표
function ProgressTable({ rows }: { rows: NonNullable<CoachingOutput["progress_table"]> }) {
  const signalMeta = {
    improved: { label: "개선", cls: "bg-green-100 text-green-700" },
    big: { label: "큰 변화", cls: "bg-green-500 text-white" },
    new: { label: "NEW", cls: "bg-primary-500 text-white" },
  };
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="bg-surface-secondary px-3 py-1.5 text-[11px] font-bold text-foreground-secondary">
        📊 지난 회차 대비 진척
      </div>
      <div className="divide-y divide-border">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-2 text-xs">
            <span className="min-w-0 flex-1 truncate font-medium text-foreground">{r.label}</span>
            <span className="font-mono text-foreground-muted">{r.prev}</span>
            <ArrowRight className="h-3 w-3 text-foreground-muted" />
            <span className="font-mono font-bold text-foreground">{r.current}</span>
            {r.signal && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${signalMeta[r.signal].cls}`}
              >
                {signalMeta[r.signal].label}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// 개선점 1건 카드
function IssueCard({ index, issue }: { index: number; issue: CoachingIssue }) {
  const severityMeta = {
    high: { label: "핵심", cls: "bg-accent-50 text-accent-700 ring-accent-200" },
    medium: { label: "보강", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
    low: { label: "디테일", cls: "bg-surface-secondary text-foreground-secondary ring-border" },
  };
  const sev = severityMeta[issue.severity] ?? severityMeta.medium;

  return (
    <article className="rounded-xl border border-border bg-surface p-3.5 sm:p-4">
      {/* 제목 줄 */}
      <div className="flex items-start gap-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
          {index}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-bold text-foreground">{issue.title}</h4>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${sev.cls}`}
            >
              {sev.label}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-2.5 space-y-2.5 pl-[2.125rem]">
        {/* 본인 표현 인용 */}
        {issue.quote && (
          <div className="flex gap-2 rounded-lg border-l-2 border-foreground-muted bg-surface-secondary px-3 py-2">
            <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground-muted" />
            <p className="text-sm italic leading-relaxed text-foreground-secondary">
              {issue.quote}
            </p>
          </div>
        )}

        {/* 원리 설명 */}
        <p className="text-sm leading-relaxed text-foreground">{issue.explanation}</p>

        {/* 시범 표현 */}
        {issue.fix_example && (
          <div className="flex gap-2 rounded-lg bg-primary-50 px-3 py-2">
            <CornerDownRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-600" />
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wide text-primary-600">
                이렇게
              </span>
              <p className="text-sm font-medium leading-relaxed text-primary-700">
                {issue.fix_example}
              </p>
            </div>
          </div>
        )}

        {/* 일반화 노트 */}
        {issue.note && (
          <p className="flex gap-1.5 text-xs leading-relaxed text-foreground-secondary">
            <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
            {issue.note}
          </p>
        )}
      </div>
    </article>
  );
}

// 통합 답변 (모범)
// 변경 사항 카테고리 자동 감지 (휴리스틱 — change 텍스트 키워드 매칭)
type ChangeCategory =
  | "vocab"
  | "grammar"
  | "participial"
  | "phrasing"
  | "closing"
  | "marker"
  | "structure"
  | "default";

function categorizeChange(text: string): ChangeCategory {
  const t = text.toLowerCase();
  // 우선순위 순서대로 매칭 (구체적 → 일반적)
  if (/분사|-ing|watching |having |sitting |listening |depending |participial/i.test(text)) return "participial";
  if (/agreement|일치|주어|is→are|단수|복수|-s 누락|3인칭/i.test(text)) return "grammar";
  if (/마무리|closing|that['']s about|that['']s pretty much|that['']s all/i.test(text)) return "closing";
  if (/skeleton|단락|transition|구조|6 슬롯/i.test(text)) return "structure";
  if (/speaking of|to talk about|when it comes to|위치별|표지|q2|q5|q8/i.test(t)) return "marker";
  if (/격상|→|대체|변경|어휘 폭|repetitive|반복.*?(?:줄|바꿔|다양)/i.test(text)) return "vocab";
  if (/어색|자연스러|feel|all of|불가산|pieces of|consist of|consisting/i.test(text)) return "phrasing";
  return "default";
}

const CATEGORY_META: Record<ChangeCategory, { label: string; cls: string; dot: string }> = {
  vocab:       { label: "어휘 격상", cls: "bg-primary-50 text-primary-700 ring-primary-200",  dot: "bg-primary-500" },
  grammar:     { label: "문법",      cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  participial: { label: "분사구문",  cls: "bg-violet-50 text-violet-700 ring-violet-200",    dot: "bg-violet-500" },
  phrasing:    { label: "표현 다듬기", cls: "bg-amber-50 text-amber-700 ring-amber-200",     dot: "bg-amber-500" },
  closing:     { label: "마무리",    cls: "bg-sky-50 text-sky-700 ring-sky-200",             dot: "bg-sky-500" },
  marker:      { label: "위치 표지", cls: "bg-indigo-50 text-indigo-700 ring-indigo-200",    dot: "bg-indigo-500" },
  structure:   { label: "구조",      cls: "bg-slate-100 text-slate-700 ring-slate-200",      dot: "bg-slate-500" },
  default:     { label: "변경",      cls: "bg-surface-secondary text-foreground-secondary ring-border", dot: "bg-foreground-muted" },
};

function ModelAnswer({ modelAnswer }: { modelAnswer: CoachingOutput["model_answer"] }) {
  // changes 카테고리 분류 + 동일 카테고리 묶기 (UI 시각 그루핑)
  const changesByCategory = (modelAnswer.changes ?? []).reduce<Record<ChangeCategory, string[]>>(
    (acc, change) => {
      const cat = categorizeChange(change);
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(change);
      return acc;
    },
    {} as Record<ChangeCategory, string[]>
  );
  const orderedCats: ChangeCategory[] = [
    "vocab", "grammar", "participial", "phrasing", "closing", "marker", "structure", "default",
  ];
  const presentCats = orderedCats.filter((c) => changesByCategory[c]?.length > 0);

  // Web Speech API — 모범 답변 듣기 (브라우저 내장 TTS, OS 보이스 의존)
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(true);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setTtsSupported(false);
      return;
    }
    // voices 비동기 로딩 트리거 (Chrome)
    window.speechSynthesis.getVoices();
    const handler = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", handler);
    return () => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.removeEventListener?.("voiceschanged", handler);
    };
  }, []);

  const handleSpeak = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel(); // 다른 utterance 중복 방지
    const utter = new SpeechSynthesisUtterance(modelAnswer.text);
    utter.lang = "en-US";
    utter.rate = 0.95;
    utter.pitch = 1.0;
    const voices = window.speechSynthesis.getVoices();
    // en-US 우선 → en 전체 폴백
    const preferred =
      voices.find((v) => v.lang === "en-US" && /google|samantha|natural|neural/i.test(v.name)) ??
      voices.find((v) => v.lang === "en-US") ??
      voices.find((v) => v.lang.startsWith("en"));
    if (preferred) utter.voice = preferred;
    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);
    utterRef.current = utter;
    window.speechSynthesis.speak(utter);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-primary-200 bg-primary-50/40">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-2 bg-primary-100/60 px-3.5 py-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary-600" />
          <span className="truncate text-xs font-bold text-primary-700">
            통합 답변 — 본인 소재로 다시 쓴 모범
          </span>
        </div>
        {ttsSupported && (
          <button
            type="button"
            onClick={handleSpeak}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset transition ${
              isSpeaking
                ? "bg-primary-600 text-white ring-primary-700 hover:bg-primary-700"
                : "bg-white text-primary-700 ring-primary-300 hover:bg-primary-50"
            }`}
            aria-label={isSpeaking ? "재생 중지" : "모범 답변 듣기"}
          >
            {isSpeaking ? (
              <>
                <Square className="h-3 w-3 fill-current" />
                <span>정지</span>
              </>
            ) : (
              <>
                <Volume2 className="h-3 w-3" />
                <span>듣기</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* 모범 본문 */}
      <div className="px-3.5 py-3">
        <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">
          {modelAnswer.text}
        </p>

        {/* 변경 사항 — 카테고리 그루핑 + 뱃지 시각화 */}
        {presentCats.length > 0 && (
          <div className="mt-3 border-t border-primary-200 pt-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wide text-primary-600">
                무엇이 바뀌었나
              </span>
              {/* 카테고리 칩 요약 (한눈에 어떤 종류의 격상이 일어났는지) */}
              <div className="flex flex-wrap gap-1">
                {presentCats.map((cat) => {
                  const meta = CATEGORY_META[cat];
                  const count = changesByCategory[cat].length;
                  return (
                    <span
                      key={cat}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${meta.cls}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                      {meta.label}
                      {count > 1 && <span className="opacity-70">×{count}</span>}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* 변경 디테일 — 카테고리별 묶음 */}
            <div className="space-y-2">
              {presentCats.map((cat) => {
                const meta = CATEGORY_META[cat];
                const items = changesByCategory[cat];
                return (
                  <div key={cat} className="rounded-lg bg-white/60 p-2.5 ring-1 ring-inset ring-primary-100">
                    <div className="mb-1 flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                      <span className={`text-[11px] font-bold ${meta.cls.split(" ")[1]}`}>
                        {meta.label}
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {items.map((c, i) => (
                        <li
                          key={i}
                          className="flex gap-1.5 text-xs leading-relaxed text-foreground"
                        >
                          <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-primary-400" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 학습자 액션 체크리스트
function ActionChecklist({ items }: { items: string[] }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3.5 sm:p-4">
      <div className="mb-2 flex items-center gap-1.5">
        <CheckCircle2 className="h-4 w-4 text-primary-500" />
        <span className="text-sm font-bold text-foreground">다음 회차에 의식할 것</span>
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-foreground">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-primary-300 text-[10px] font-bold text-primary-500">
              {i + 1}
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// 본인 답변 트랜스크립트 (접기)
function TranscriptDetails({ attempt }: { attempt: AttemptDisplay }) {
  if (!attempt.cleaned_transcript) return null;
  return (
    <details className="rounded-xl border border-border bg-surface-secondary px-4 py-2">
      <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-foreground-secondary">
        <FileText className="h-3.5 w-3.5" />
        내가 말한 답변 ({attempt.word_count ?? "?"}단어
        {attempt.audio_duration ? ` · ${formatDuration(attempt.audio_duration)}` : ""})
        {attempt.stt_fix_log && attempt.stt_fix_log.length > 0 && (
          <span className="text-foreground-muted">— STT 정정 {attempt.stt_fix_log.length}건</span>
        )}
      </summary>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {attempt.cleaned_transcript}
      </p>
      {attempt.stt_fix_log && attempt.stt_fix_log.length > 0 && (
        <ul className="mt-2 ml-4 list-disc space-y-0.5 text-xs text-foreground-muted">
          {attempt.stt_fix_log.map((fix, i) => (
            <li key={i}>
              <code className="rounded bg-surface px-1">{fix.original}</code> →{" "}
              <code className="rounded bg-surface px-1">{fix.fixed}</code> ({fix.reason})
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

// ============================================================
// 지난 회차 아코디언
// ============================================================

function PastAttempts({ attempts }: { attempts: AttemptDisplay[] }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-2xl border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left sm:px-5"
      >
        <span className="text-sm font-semibold text-foreground">
          지난 회차 <span className="text-foreground-muted">{attempts.length}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 text-foreground-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="space-y-2 border-t border-border p-3 sm:p-4">
          {[...attempts].reverse().map((a) => (
            <PastAttemptItem key={a.id} attempt={a} />
          ))}
        </div>
      )}
    </section>
  );
}

function PastAttemptItem({ attempt }: { attempt: AttemptDisplay }) {
  const [expanded, setExpanded] = useState(false);
  const summary = attempt.display_summary;

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-surface">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-surface-secondary/50"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-xs font-bold text-foreground-secondary">
            {attempt.attempt_number}회차
          </span>
          {attempt.input_mode === "voice" ? (
            <Mic className="h-3 w-3 text-foreground-muted" />
          ) : (
            <Type className="h-3 w-3 text-foreground-muted" />
          )}
          {attempt.status === "done" && summary && (
            <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary-700">
              개선점 {summary.흠_count}개
            </span>
          )}
          {attempt.status === "failed" && (
            <AlertCircle className="h-3.5 w-3.5 text-accent-500" />
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-foreground-muted transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>
      {expanded && (
        <div className="border-t border-border px-3.5 py-3.5">
          <AttemptBody attempt={attempt} />
        </div>
      )}
    </article>
  );
}

// ============================================================
// 졸업 완료 카드
// ============================================================

function MasteredCard({
  masterResult,
  onPickAnother,
}: {
  masterResult: MarkMasteredResult | null;
  onPickAnother: () => void;
}) {
  return (
    <section className="rounded-2xl border border-primary-300 bg-primary-50 p-5 sm:p-6">
      <div className="flex items-center gap-2 text-base font-bold text-primary-700">
        <GraduationCap className="h-5 w-5" />
        이 질문 졸업 완료
      </div>
      {masterResult?.type_mastered ? (
        <p className="mt-2 text-sm leading-relaxed text-primary-700">
          🎉 축하해요! 이 유형의 {masterResult.total_topics_mastered}개 토픽을 마스터해{" "}
          <strong>체화 완료</strong>했어요.
        </p>
      ) : (
        <p className="mt-2 text-sm leading-relaxed text-primary-700">
          {masterResult
            ? `토픽 졸업 ${masterResult.total_topics_mastered}/${masterResult.required_for_type_mastery} · `
            : ""}
          같은 토픽의 다른 질문이나 다른 토픽으로 체화 사이클을 이어가세요.
        </p>
      )}
      <button
        type="button"
        onClick={onPickAnother}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
      >
        다른 질문 선택
        <ArrowRight className="h-4 w-4" />
      </button>
    </section>
  );
}

// ============================================================
// AVA 녹음 영역 — 쉐도잉 실전평가 동일 (크레딧 배너 + 질문 바 + 메인 프레임)
// ============================================================

function AvaRecorder({
  recorder,
  question,
  uploadState,
  evaluating,
  onResetAnswer,
  attemptNumber,
  error,
}: {
  recorder: ReturnType<typeof useRecorder>;
  question: SessionDetail["question"];
  uploadState: UploadState;
  evaluating: boolean;
  onResetAnswer: () => void;
  attemptNumber: number;
  error: string | null;
}) {
  const [showQuestion, setShowQuestion] = useState<"hidden" | "en" | "ko">("en");
  const avaContainerRef = useRef<HTMLDivElement>(null);
  const [avaHeight, setAvaHeight] = useState(0);

  // 세로 볼륨바 높이를 AVA 박스에 맞춤
  useEffect(() => {
    const el = avaContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setAvaHeight(entry.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 크레딧 잔액
  const { data: creditData } = useQuery({
    queryKey: ["coaching-credit"],
    queryFn: async () => {
      const r = await checkCoachingCredit();
      if (r.error) throw new Error(r.error);
      return r.data ?? null;
    },
    staleTime: 60 * 1000,
  });

  // 자동 녹음 시작 콜백 (모의고사 동일: state + uploadState 가드)
  const autoStartRecording = useCallback(() => {
    if (recorder.state !== "idle" || uploadState !== "idle") return;
    recorder.startRecording();
  }, [recorder, uploadState]);

  const questionPlayer = useQuestionPlayer({
    replayWindowSeconds: 5,
    onPlaybackEnded: autoStartRecording,
  });

  const hasAudio = !!question.audio_url;
  const recording = recorder.state === "recording";
  const failed = uploadState === "failed";
  const retrying = uploadState === "retrying";
  // 업로드/제출/평가 중 (한 프레임 깜빡임 방지로 stopped도 포함)
  const submitting =
    uploadState === "uploading" ||
    uploadState === "submitting" ||
    uploadState === "submitted" ||
    recorder.state === "stopped";
  // 잔액을 확실히 확인했고 부족한 경우에만 시작 차단
  const noCredit = creditData != null && !creditData.hasCredit;

  // 질문 듣기 (모의고사 동일: 녹음 중이면 리셋 후 재생)
  function handlePlayQuestion() {
    if (!question.audio_url || questionPlayer.isPlaying) return;
    if (recorder.state === "recording") recorder.reset();
    questionPlayer.play(question.audio_url);
  }
  // 다시 듣기 (모의고사 동일: 리플레이 윈도우 5초 내 1회, 녹음 중이면 리셋)
  function handleReplay() {
    if (!questionPlayer.canReplay || questionPlayer.hasReplayed) return;
    if (recorder.state === "recording") recorder.reset();
    questionPlayer.replay();
  }
  // 수동 녹음 시작 (오디오 없는 질문 / 자동 녹음 미시작 대비)
  function handleManualRecord() {
    recorder.startRecording();
  }

  return (
    <div className="space-y-3 md:space-y-4">
      {/* 크레딧 안내 */}
      <div className="flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50/50 p-2 text-[11px] md:p-2.5 md:text-xs">
        <Coins size={14} className="text-amber-600" />
        <span className="text-amber-700">
          크레딧이 사용량에 따라 차감됩니다
          {creditData && (
            <span className="ml-1 font-semibold">· 잔액 {formatUsd(creditData.balanceCents)}</span>
          )}
        </span>
      </div>

      {noCredit && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle size={16} />
          크레딧이 부족합니다. AI 스토어에서 충전해주세요.
        </div>
      )}

      {/* 질문 정보 바 (데스크탑) */}
      <div className="hidden rounded-xl border border-border bg-surface px-4 py-2.5 md:block">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-medium text-primary-700">
            {attemptNumber}회차 답변
          </span>
          <button
            onClick={() => setShowQuestion((p) => (p === "hidden" ? "en" : "hidden"))}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-foreground-muted hover:bg-surface-secondary hover:text-foreground-secondary"
          >
            {showQuestion !== "hidden" ? <EyeOff size={14} /> : <Eye size={14} />}
            {showQuestion !== "hidden" ? "숨기기" : "질문 보기"}
          </button>
        </div>
        {showQuestion !== "hidden" && (
          <div className="mt-2 border-t border-border/50 pt-2">
            <p className="text-sm font-medium text-foreground">
              {question.english || "(no question)"}
            </p>
            {question.korean && (
              <>
                <div className="my-2 h-px bg-border/50" />
                <p className="text-xs leading-relaxed text-foreground-muted">{question.korean}</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* ═══ 메인 프레임 ═══ */}
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
          <AvaAvatar isSpeaking={questionPlayer.isPlaying} isListening={recording} />

          {/* 모바일: 질문 오버레이 */}
          <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between p-2 md:hidden">
            <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
              {attemptNumber}회차 답변
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setShowQuestion((p) => (p === "en" ? "hidden" : "en"))}
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm ${
                  showQuestion === "en" ? "bg-white/80 text-black" : "bg-black/40 text-white"
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setShowQuestion((p) => (p === "ko" ? "hidden" : "ko"))}
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm ${
                  showQuestion === "ko" ? "bg-white/80 text-black" : "bg-black/40 text-white"
                }`}
              >
                한글
              </button>
            </div>
          </div>
          {showQuestion !== "hidden" && (
            <div className="absolute inset-x-0 bottom-0 z-10 max-h-[60%] overflow-y-auto bg-black/60 px-2.5 py-2 backdrop-blur-sm md:hidden">
              <p className="text-[11px] leading-relaxed text-white">
                {showQuestion === "en" ? question.english : question.korean}
              </p>
            </div>
          )}
        </div>

        {/* 재생 컨트롤 — 질문 듣기 / 다시 듣기 (모의고사 동일) */}
        {hasAudio && (
          <div className="shrink-0 rounded-xl border border-border bg-surface-secondary p-3">
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-primary-500 transition-[width] duration-300 ease-linear"
                style={{ width: `${questionPlayer.playbackProgress}%` }}
              />
            </div>

            {!questionPlayer.hasPlayed && !questionPlayer.isPlaying ? (
              <button
                onClick={handlePlayQuestion}
                disabled={noCredit}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-500 px-4 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-primary-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Volume2 size={18} />
                질문 듣기
              </button>
            ) : questionPlayer.isPlaying ? (
              <button
                disabled
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-500 px-4 py-3 text-sm font-bold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Loader2 size={18} className="animate-spin" />
                Playing...
              </button>
            ) : questionPlayer.canReplay && !questionPlayer.hasReplayed ? (
              <button
                onClick={handleReplay}
                className="flex w-full animate-pulse items-center justify-center gap-2 rounded-lg bg-primary-500 px-4 py-3 text-sm font-bold text-white shadow-lg transition-all"
              >
                <RotateCcw size={18} />
                다시 듣기 ({questionPlayer.replayCountdown}초)
              </button>
            ) : (
              <div className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-surface-secondary px-4 py-3 text-sm font-bold text-foreground-muted">
                <Volume2 size={18} />
                재생 완료
              </div>
            )}
          </div>
        )}

      </div>

      {/* === 세로 볼륨바 (데스크탑) === */}
      <div
        className="hidden w-4 flex-shrink-0 md:flex md:flex-col md:items-center md:gap-1"
        style={{ height: avaHeight > 0 ? avaHeight : undefined }}
      >
        <div className="flex w-full flex-1 flex-col-reverse gap-px rounded-lg border border-border bg-surface-secondary p-0.5">
          {Array.from({ length: 24 }).map((_, i) => {
            const threshold = (i + 1) / 24;
            const vol = recording ? recorder.volume : 0;
            const lit = vol >= threshold;
            const color =
              i < 16
                ? lit
                  ? "bg-primary-300"
                  : "bg-border"
                : i < 21
                  ? lit
                    ? "bg-primary-500"
                    : "bg-border"
                  : lit
                    ? "bg-accent-500"
                    : "bg-border";
            return (
              <div key={i} className={`w-full flex-1 rounded-sm transition-colors duration-75 ${color}`} />
            );
          })}
        </div>
        <Mic
          size={12}
          className={`shrink-0 transition-colors ${
            recording ? "animate-pulse text-primary-500" : "text-foreground-muted"
          }`}
        />
      </div>

      {/* === 우측: 녹음 시간 + 상태 + 답변 컨트롤 (모의고사 동일) === */}
      <div className="flex flex-col gap-2 md:flex-1">
        {/* 녹음 시간 + 상태 — 데스크탑 전용 */}
        <div className="hidden md:flex md:flex-1 md:flex-col md:gap-2">
        {/* 녹음 시간 */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-surface-secondary p-3">
          <span className="text-sm font-medium text-foreground-secondary">녹음 시간</span>
          <span
            className={`font-mono text-2xl font-bold md:text-3xl ${
              recording ? "text-primary-600" : "text-foreground-muted"
            }`}
          >
            {formatDuration(recorder.duration)}
          </span>
        </div>

        {/* 상태 표시 */}
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-border bg-surface-secondary p-4">
          {failed ? (
            <div className="text-center">
              <AlertCircle size={28} className="mx-auto mb-2 text-red-500" />
              <p className="text-sm font-medium text-red-600">제출에 실패했어요</p>
              <p className="mt-1 text-xs text-foreground-muted">
                아래 &apos;다시 녹음하기&apos; 버튼을 눌러 다시 시도하세요
              </p>
            </div>
          ) : evaluating ? (
            <div className="text-center">
              <div className="mx-auto mb-3 h-12 w-12 animate-spin rounded-full border-[3px] border-surface-secondary border-t-primary-500" />
              <p className="text-sm font-medium text-foreground">코칭 분석 중</p>
              <p className="mt-0.5 text-[11px] text-foreground-muted">
                답변을 분석하고 코칭을 준비하고 있어요
              </p>
            </div>
          ) : retrying ? (
            <div className="text-center">
              <Loader2 size={28} className="mx-auto mb-2 animate-spin text-amber-500" />
              <p className="text-sm font-medium text-amber-700">업로드 재시도 중...</p>
              <p className="mt-1 text-xs text-foreground-muted">잠시만 기다려주세요</p>
            </div>
          ) : submitting ? (
            <div className="text-center">
              <Loader2 size={28} className="mx-auto mb-2 animate-spin text-primary-500" />
              <p className="text-sm font-medium text-foreground-secondary">녹음 업로드 중...</p>
            </div>
          ) : recording ? (
            <div className="relative flex w-full flex-1 flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-primary-200 bg-primary-50">
              <div className="absolute inset-0 animate-pulse bg-primary-100/50" />
              <div className="z-10 flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-primary-500" />
                <span className="text-sm font-bold uppercase tracking-widest text-primary-600">
                  Recording...
                </span>
              </div>
              {recorder.warningMessage && (
                <p
                  className={`z-10 mt-2 text-xs font-medium ${
                    recorder.warning === "silent" ? "text-red-500" : "text-amber-600"
                  }`}
                >
                  {recorder.warningMessage}
                </p>
              )}
            </div>
          ) : questionPlayer.isPlaying ? (
            <div className="text-center">
              <Volume2 size={28} className="mx-auto mb-2 animate-pulse text-primary-500" />
              <p className="text-sm font-medium text-primary-600">질문을 듣는 중...</p>
              <p className="mt-1 text-xs text-foreground-muted">질문을 잘 듣고 답변을 준비하세요</p>
            </div>
          ) : questionPlayer.hasPlayed ? (
            <div className="text-center">
              <Mic size={28} className="mx-auto mb-2 text-foreground-muted" />
              <p className="text-sm font-medium text-foreground-secondary">답변을 준비하세요</p>
              <p className="mt-1 text-xs text-foreground-muted">‘녹음 시작’ 버튼을 눌러주세요</p>
            </div>
          ) : (
            <div className="text-center">
              <Headphones size={28} className="mx-auto mb-2 text-foreground-muted" />
              <p className="text-sm font-medium text-foreground-secondary">준비되셨나요?</p>
              <p className="mt-1 text-xs text-foreground-muted">
                {hasAudio
                  ? "좌측 ‘질문 듣기’ 버튼을 눌러 시작하세요"
                  : "‘녹음 시작’ 버튼을 눌러 시작하세요"}
              </p>
            </div>
          )}
        </div>
        </div>

        {/* 답변 컨트롤 — 모의고사 Next 위치 (우하단, 단일 액션 버튼) */}
        <div className="flex justify-end md:border-t md:border-border md:pt-3">
          {failed ? (
            <button
              onClick={onResetAnswer}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-primary-600 active:scale-95 md:px-10 md:py-4 md:text-lg"
            >
              <RotateCcw size={18} />
              다시 녹음하기
            </button>
          ) : retrying ? (
            <button
              disabled
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-amber-50 px-6 py-3 text-sm font-bold text-amber-700 md:px-10 md:py-4 md:text-lg"
            >
              <Loader2 size={18} className="animate-spin" />
              재시도 중...
            </button>
          ) : evaluating ? (
            <button
              disabled
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-surface-secondary px-6 py-3 text-sm font-bold text-foreground-muted md:px-10 md:py-4 md:text-lg"
            >
              <Loader2 size={18} className="animate-spin" />
              코칭 분석 중...
            </button>
          ) : submitting ? (
            <button
              disabled
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-surface-secondary px-6 py-3 text-sm font-bold text-foreground-muted md:px-10 md:py-4 md:text-lg"
            >
              <Loader2 size={18} className="animate-spin" />
              업로드 중...
            </button>
          ) : recording ? (
            <button
              onClick={() => recorder.stopRecording()}
              className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-red-600 active:scale-95 md:px-10 md:py-4 md:text-lg"
            >
              <Square size={16} />
              답변 완료
            </button>
          ) : !hasAudio || (questionPlayer.hasPlayed && !questionPlayer.isPlaying) ? (
            <button
              onClick={handleManualRecord}
              disabled={noCredit}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-primary-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 md:px-10 md:py-4 md:text-lg"
            >
              <Mic size={18} />
              녹음 시작
            </button>
          ) : (
            <button
              disabled
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-surface-secondary px-6 py-3 text-sm font-bold text-foreground-muted opacity-60 md:px-10 md:py-4 md:text-lg"
            >
              <Square size={16} />
              답변 완료
            </button>
          )}
        </div>
      </div>
        </div>
      </div>

      {/* 에러 */}
      {error && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle size={16} />
            {error}
          </div>
          <button
            onClick={onResetAnswer}
            className="flex shrink-0 items-center gap-1 rounded-md bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200"
          >
            <RotateCcw size={12} />
            다시 시도
          </button>
        </div>
      )}
    </div>
  );
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

