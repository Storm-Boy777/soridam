"use client";

// AI 코치 학습 룸 — Option A: 현재 사이클 중심 레이아웃
// 구조: 압축 sticky 질문 헤더 → slim 진행 바 → 현재 회차 포커스 카드 → 지난 회차 아코디언
// 코칭 결과는 구조화 JSON(coaching_json) 전용 카드로 렌더링, 구버전은 markdown 폴백

import { useState, useTransition, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertCircle,
  Loader2,
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  Send,
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
} from "lucide-react";
import { useRecorder } from "@/lib/hooks/use-recorder";
import {
  getSessionDetail,
  submitAttempt,
  markTopicMastered,
} from "@/lib/actions/coaching";
import type {
  SessionDetail,
  AttemptDisplay,
  MarkMasteredResult,
  CoachingOutput,
  CoachingIssue,
} from "@/lib/types/coaching";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Props {
  initialDetail: SessionDetail;
}

type InputModeUI = "voice" | "text";
type UploadState = "idle" | "uploading" | "submitting" | "submitted" | "failed";

const PROCESSING_STATUSES = ["pending", "preprocessing", "evaluating"];
// 평가가 비정상적으로 오래 걸릴 때의 안내/중단 기준
const SLOW_AFTER_MS = 120_000; // 2분 — "오래 걸려요" 안내 표시
const STUCK_AFTER_MS = 180_000; // 3분 — 폴링 중단 (EF가 멈춘 것으로 판단)

export function LearnRoom({ initialDetail }: Props) {
  const sessionId = initialDetail.session.id;
  const queryClient = useQueryClient();
  const router = useRouter();

  const [inputMode, setInputMode] = useState<InputModeUI>("voice");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
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
  // 다음 답변 입력 가능: 진행 중 평가 없음 + 졸업 안 함
  const canAnswer = !currentProcessing && !isMastered;

  // 녹음 blob 생성 시 미리듣기 URL
  useEffect(() => {
    if (recorder.audioBlob) {
      const url = URL.createObjectURL(recorder.audioBlob);
      setAudioPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setAudioPreviewUrl(null);
  }, [recorder.audioBlob]);

  // 음성 제출
  const handleVoiceSubmit = useCallback(async () => {
    if (!recorder.audioBlob) {
      setError("녹음된 답변이 없어요");
      return;
    }
    const blob = recorder.audioBlob;
    setError(null);
    setUploadState("uploading");

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const ext = blob.type.includes("webm") ? "webm" : blob.type.includes("wav") ? "wav" : "webm";
      const filePath = `${session.user_id}/${session.id}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("coaching-recordings")
        .upload(filePath, blob, {
          contentType: blob.type || "audio/webm",
          upsert: false,
        });

      if (uploadErr) throw new Error(`업로드 실패: ${uploadErr.message}`);

      setUploadState("submitting");

      const r = await submitAttempt({
        session_id: sessionId,
        input_mode: "voice",
        audio_url: filePath,
        audio_duration: recorder.duration,
      });

      if (r.error || !r.data) {
        throw new Error(r.error ?? "답변 제출 실패");
      }

      setUploadState("submitted");
      recorder.reset();
      queryClient.invalidateQueries({ queryKey: ["coaching-session-detail", sessionId] });
      setTimeout(() => setUploadState("idle"), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드/제출 실패");
      setUploadState("failed");
    }
  }, [recorder, sessionId, session.id, session.user_id, queryClient]);

  // 텍스트 제출
  function handleTextSubmit() {
    if (!text.trim() || text.trim().length < 20) {
      setError("답변은 최소 20자 이상 입력하세요");
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await submitAttempt({
        session_id: sessionId,
        input_mode: "text",
        text: text.trim(),
      });
      if (r.error || !r.data) {
        setError(r.error ?? "답변 제출 실패");
        return;
      }
      setText("");
      queryClient.invalidateQueries({ queryKey: ["coaching-session-detail", sessionId] });
    });
  }

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
      {/* 압축 sticky 질문 헤더 */}
      <QuestionHeader question={question} defaultExpanded={attempts.length === 0} />

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
          canAnswer={canAnswer}
          currentProcessing={currentProcessing}
          inputMode={inputMode}
          setInputMode={setInputMode}
          recorder={recorder}
          audioPreviewUrl={audioPreviewUrl}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          uploadState={uploadState}
          onVoiceSubmit={handleVoiceSubmit}
          text={text}
          setText={setText}
          isPending={isPending}
          onTextSubmit={handleTextSubmit}
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
// 압축 sticky 질문 헤더 — 한 줄(접힘) ↔ 전문(펼침)
// ============================================================

function QuestionHeader({
  question,
  defaultExpanded,
}: {
  question: SessionDetail["question"];
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  function playQuestionAudio() {
    if (!question.audio_url) return;
    new Audio(question.audio_url).play().catch(() => undefined);
  }

  return (
    <section className="sticky top-14 z-20 rounded-2xl border border-border bg-surface/95 shadow-sm backdrop-blur-md">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left sm:px-5"
      >
        <span className="shrink-0 rounded-md bg-primary-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-700">
          질문
        </span>
        <p
          className={`min-w-0 flex-1 text-sm font-medium text-foreground ${
            expanded ? "" : "truncate"
          }`}
        >
          {question.korean || "(질문 없음)"}
        </p>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-foreground-muted transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded && (
        <div className="border-t border-border px-4 pb-3.5 pt-3 sm:px-5">
          <p className="text-sm italic leading-relaxed text-foreground-secondary">
            {question.english || "(no english)"}
          </p>
          {question.audio_url && (
            <button
              type="button"
              onClick={playQuestionAudio}
              className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-surface-secondary px-2.5 py-1 text-xs text-foreground-secondary transition-colors hover:bg-primary-50 hover:text-primary-700"
            >
              <Volume2 className="h-3 w-3" />
              질문 듣기
            </button>
          )}
        </div>
      )}
    </section>
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
  const ready = current !== undefined && current <= 1;

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

      {ready && !isMastered && (
        <p className="mt-2 text-xs font-medium text-primary-700">
          개선점이 거의 없어요. 이 질문 졸업할 준비가 됐어요!
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
  canAnswer,
  currentProcessing,
  inputMode,
  setInputMode,
  recorder,
  audioPreviewUrl,
  isPlaying,
  setIsPlaying,
  uploadState,
  onVoiceSubmit,
  text,
  setText,
  isPending,
  onTextSubmit,
  error,
  hasAttempts,
  onGraduate,
}: {
  latest: AttemptDisplay | null;
  nextAttemptNumber: number;
  canAnswer: boolean;
  currentProcessing: boolean;
  inputMode: InputModeUI;
  setInputMode: (m: InputModeUI) => void;
  recorder: ReturnType<typeof useRecorder>;
  audioPreviewUrl: string | null;
  isPlaying: boolean;
  setIsPlaying: (v: boolean) => void;
  uploadState: UploadState;
  onVoiceSubmit: () => void;
  text: string;
  setText: (v: string) => void;
  isPending: boolean;
  onTextSubmit: () => void;
  error: string | null;
  hasAttempts: boolean;
  onGraduate: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-primary-200 bg-surface shadow-sm">
      {/* 카드 헤더 */}
      <div className="flex items-center gap-2 border-b border-border bg-primary-50/50 px-4 py-2.5 sm:px-5">
        <span className="flex h-2 w-2 rounded-full bg-primary-500" />
        <span className="text-sm font-bold text-foreground">지금 학습 중</span>
      </div>

      {/* 최신 회차 코칭 결과 */}
      {latest && (
        <div className="px-4 py-4 sm:px-5">
          <AttemptBody attempt={latest} />
        </div>
      )}

      {/* 다음 답변 입력 */}
      {canAnswer && (
        <div className={latest ? "border-t border-border" : ""}>
          <div className="px-4 py-4 sm:px-5">
            <div className="mb-3 flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1.5 text-[11px] font-bold text-background">
                  {nextAttemptNumber}
                </span>
                {nextAttemptNumber}회차 답변
              </label>
              <div className="flex items-center gap-1 rounded-full bg-surface-secondary p-1">
                <ModeBtn
                  active={inputMode === "voice"}
                  onClick={() => setInputMode("voice")}
                  icon={<Mic className="h-3 w-3" />}
                  label="녹음"
                />
                <ModeBtn
                  active={inputMode === "text"}
                  onClick={() => setInputMode("text")}
                  icon={<Type className="h-3 w-3" />}
                  label="텍스트"
                />
              </div>
            </div>

            {inputMode === "voice" ? (
              <VoiceInputArea
                recorder={recorder}
                audioPreviewUrl={audioPreviewUrl}
                isPlaying={isPlaying}
                setIsPlaying={setIsPlaying}
                uploadState={uploadState}
                onSubmit={onVoiceSubmit}
              />
            ) : (
              <TextInputArea
                text={text}
                setText={setText}
                isPending={isPending}
                onSubmit={onTextSubmit}
              />
            )}

            {error && (
              <div className="mt-3 flex items-center gap-2 text-sm text-accent-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {hasAttempts && (
              <button
                type="button"
                onClick={onGraduate}
                disabled={isPending}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-primary-200 py-2 text-xs font-semibold text-primary-700 transition-colors hover:bg-primary-50 disabled:opacity-50"
              >
                <GraduationCap className="h-3.5 w-3.5" />
                이 질문 졸업하기
              </button>
            )}
          </div>
        </div>
      )}

      {/* 평가 진행 중 — 입력 잠금 안내 */}
      {currentProcessing && !canAnswer && (
        <div className="border-t border-border px-4 py-3 sm:px-5">
          <p className="flex items-center gap-2 text-xs text-foreground-secondary">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-500" />
            코칭이 완성되면 다음 회차 답변을 이어갈 수 있어요.
          </p>
        </div>
      )}
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
      ) : attempt.coaching_markdown ? (
        <MarkdownFallback markdown={attempt.coaching_markdown} />
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
function ModelAnswer({ modelAnswer }: { modelAnswer: CoachingOutput["model_answer"] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-primary-200 bg-primary-50/40">
      <div className="flex items-center gap-1.5 bg-primary-100/60 px-3.5 py-2">
        <Sparkles className="h-3.5 w-3.5 text-primary-600" />
        <span className="text-xs font-bold text-primary-700">통합 답변 — 본인 소재로 다시 쓴 모범</span>
      </div>
      <div className="px-3.5 py-3">
        <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">
          {modelAnswer.text}
        </p>
        {modelAnswer.changes && modelAnswer.changes.length > 0 && (
          <div className="mt-3 border-t border-primary-200 pt-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-primary-600">
              무엇이 바뀌었나
            </span>
            <ul className="mt-1.5 space-y-1">
              {modelAnswer.changes.map((c, i) => (
                <li key={i} className="flex gap-1.5 text-xs leading-relaxed text-foreground-secondary">
                  <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-primary-500" />
                  {c}
                </li>
              ))}
            </ul>
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

// 구버전 markdown 폴백
function MarkdownFallback({ markdown }: { markdown: string }) {
  return (
    <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-foreground prose-h2:mt-6 prose-h2:mb-2 prose-h2:border-t prose-h2:border-border prose-h2:pt-4 prose-h2:text-base prose-h3:mt-4 prose-h3:mb-2 prose-h3:rounded-lg prose-h3:bg-primary-50 prose-h3:px-3 prose-h3:py-2 prose-h3:text-sm prose-h3:text-primary-700 prose-p:leading-relaxed prose-p:text-foreground prose-strong:text-foreground prose-code:rounded prose-code:bg-surface-secondary prose-code:px-1 prose-code:py-0.5 prose-code:font-mono prose-code:text-[0.85em] prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none prose-li:my-0.5 prose-li:text-foreground prose-ul:my-2 prose-ol:my-2 prose-table:text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
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
// 모드 토글 버튼
// ============================================================

function ModeBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition ${
        active ? "bg-surface text-foreground shadow-sm" : "text-foreground-muted hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ============================================================
// 음성 입력 영역
// ============================================================

function VoiceInputArea({
  recorder,
  audioPreviewUrl,
  isPlaying,
  setIsPlaying,
  uploadState,
  onSubmit,
}: {
  recorder: ReturnType<typeof useRecorder>;
  audioPreviewUrl: string | null;
  isPlaying: boolean;
  setIsPlaying: (v: boolean) => void;
  uploadState: UploadState;
  onSubmit: () => void;
}) {
  const isUploading = uploadState === "uploading" || uploadState === "submitting";
  const recordingActive = recorder.state === "recording";
  const hasRecording = recorder.state === "stopped" && !!recorder.audioBlob;

  function togglePlay() {
    if (!audioPreviewUrl) return;
    const audio = document.getElementById("coaching-audio-preview") as HTMLAudioElement | null;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => undefined);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 py-3">
      {!hasRecording && (
        <>
          <button
            type="button"
            disabled={isUploading}
            onClick={() => (recordingActive ? recorder.stopRecording() : recorder.startRecording())}
            className={`flex h-20 w-20 items-center justify-center rounded-full transition disabled:opacity-50 ${
              recordingActive
                ? "bg-accent-500 text-white shadow-lg shadow-accent-500/40 hover:bg-accent-600"
                : "bg-primary-500 text-white shadow-lg shadow-primary-500/40 hover:bg-primary-600"
            }`}
            aria-label={recordingActive ? "녹음 중지" : "녹음 시작"}
          >
            {recordingActive ? <Square className="h-7 w-7 fill-current" /> : <Mic className="h-7 w-7" />}
          </button>

          {recordingActive && (
            <div className="flex flex-col items-center gap-2">
              <div className="font-mono text-2xl font-semibold text-accent-700">
                {formatDuration(recorder.duration)}
              </div>
              <VolumeMeter volume={recorder.volume} />
              {recorder.warningMessage && (
                <p className="text-xs text-accent-600">{recorder.warningMessage}</p>
              )}
            </div>
          )}

          {recorder.state === "idle" && (
            <p className="text-sm text-foreground-secondary">
              버튼을 누르고 답변을 녹음하세요. (최대 4분)
            </p>
          )}
        </>
      )}

      {hasRecording && audioPreviewUrl && (
        <div className="w-full space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface-secondary px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-500 text-white hover:bg-primary-600"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
              </button>
              <div>
                <div className="text-sm font-semibold text-foreground">녹음 완료</div>
                <div className="text-xs text-foreground-muted">
                  {formatDuration(recorder.duration)}
                </div>
              </div>
            </div>
            <audio
              id="coaching-audio-preview"
              src={audioPreviewUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => recorder.reset()}
              disabled={isUploading}
              className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-foreground-secondary hover:bg-surface hover:text-accent-600 disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" />
              다시 녹음
            </button>
          </div>

          <button
            type="button"
            disabled={isUploading}
            onClick={onSubmit}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary-500 py-3 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {uploadState === "uploading" ? "업로드 중…" : "평가 시작 중…"}
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                제출하고 코칭 받기
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function VolumeMeter({ volume }: { volume: number }) {
  const bars = 20;
  const filled = Math.round(volume * bars);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={`h-3 w-1 rounded-full transition-colors ${
            i < filled ? "bg-accent-500" : "bg-foreground-muted/20"
          }`}
        />
      ))}
    </div>
  );
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ============================================================
// 텍스트 입력 영역 (백업)
// ============================================================

function TextInputArea({
  text,
  setText,
  isPending,
  onSubmit,
}: {
  text: string;
  setText: (v: string) => void;
  isPending: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="본인 답변을 입력하세요. 외우지 마시고 본인 말로 풀어내세요."
        rows={8}
        disabled={isPending}
        className="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed text-foreground placeholder:text-foreground-muted focus:border-primary-400 focus:outline-none disabled:opacity-50"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground-muted">{text.length}자</span>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isPending || text.trim().length < 20}
          className="flex items-center gap-2 rounded-full bg-primary-500 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              제출 중…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              제출하고 코칭 받기
            </>
          )}
        </button>
      </div>
    </div>
  );
}
