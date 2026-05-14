"use client";

// AI 코치 학습 룸 — 음성 녹음 중심
// 흐름: 질문 표시 → 녹음 (또는 텍스트 백업) → Storage 업로드 → 평가 폴링 → 코칭 markdown

import { useState, useTransition, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  CheckCircle2,
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
} from "lucide-react";
import { useRecorder } from "@/lib/hooks/use-recorder";
import {
  getSessionDetail,
  submitAttempt,
  markTopicMastered,
} from "@/lib/actions/coaching";
import type { SessionDetail, AttemptDisplay } from "@/lib/types/coaching";

interface Props {
  initialDetail: SessionDetail;
}

type InputModeUI = "voice" | "text";
type UploadState = "idle" | "uploading" | "submitting" | "submitted" | "failed";

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
      if (lastAttempt && ["pending", "preprocessing", "evaluating"].includes(lastAttempt.status)) {
        return 5000;
      }
      return false;
    },
    staleTime: 0,
  });

  const session = detail.session;
  const question = detail.question;
  const attempts = detail.attempts;
  const isMastered = session.status === "mastered";
  const currentProcessing = attempts.find((a) =>
    ["pending", "preprocessing", "evaluating"].includes(a.status)
  );

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
      // 1. Storage 직접 업로드 (브라우저 클라이언트)
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

      // 2. SA 호출 (audio_url = storage path)
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
      // 폴링 트리거
      queryClient.invalidateQueries({ queryKey: ["coaching-session-detail", sessionId] });

      // 다음 답변 위해 상태 리셋
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

  async function handleMastered() {
    if (!confirm("이 토픽을 졸업으로 처리합니다. 계속하시겠어요?")) return;
    startTransition(async () => {
      const r = await markTopicMastered(sessionId);
      if (r.error) {
        setError(r.error);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["coaching-session-detail", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["coaching-type-cards"] });
      if (r.data?.type_mastered) alert("축하합니다! 이 유형을 마스터했습니다.");
      router.push(`/coaching/topic/${session.question_type}/${encodeURIComponent(session.topic)}`);
    });
  }

  // 질문 오디오 재생
  function playQuestionAudio() {
    if (!question.audio_url) return;
    new Audio(question.audio_url).play().catch(() => undefined);
  }

  return (
    <div className="space-y-5">
      {/* 질문 카드 */}
      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
            오늘의 질문
          </span>
          {question.audio_url && (
            <button
              type="button"
              onClick={playQuestionAudio}
              className="flex items-center gap-1 rounded-full bg-surface-hover px-2 py-1 text-xs text-foreground-secondary hover:bg-primary-50 hover:text-primary-700"
            >
              <Volume2 className="h-3 w-3" />
              질문 듣기
            </button>
          )}
        </div>
        <p className="mt-2 text-base font-medium leading-relaxed text-foreground">
          🇰🇷 {question.korean || "(질문 없음)"}
        </p>
        <p className="mt-2 text-sm italic leading-relaxed text-foreground-secondary">
          🇺🇸 {question.english || "(no english)"}
        </p>
      </section>

      {/* 졸업 안내 또는 답변 입력 */}
      {isMastered ? (
        <section className="rounded-2xl border border-primary-300 bg-primary-50 p-5">
          <div className="flex items-center gap-2 font-semibold text-primary-700">
            <CheckCircle2 className="h-5 w-5" />
            이 질문은 졸업했습니다
          </div>
          <p className="mt-2 text-sm text-primary-700">
            같은 토픽의 다른 질문 또는 다른 토픽으로 가서 체화 사이클을 계속하세요.
          </p>
          <button
            type="button"
            onClick={() => router.push(`/coaching/topic/${session.question_type}/${encodeURIComponent(session.topic)}`)}
            className="mt-3 rounded-full bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600"
          >
            다른 질문 선택
          </button>
        </section>
      ) : (
        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <label className="text-sm font-semibold text-foreground">
              {attempts.length + 1}회차 답변
            </label>
            <div className="flex items-center gap-1 rounded-full bg-surface-secondary p-1">
              <ModeBtn active={inputMode === "voice"} onClick={() => setInputMode("voice")} icon={<Mic className="h-3 w-3" />} label="녹음" />
              <ModeBtn active={inputMode === "text"} onClick={() => setInputMode("text")} icon={<Type className="h-3 w-3" />} label="텍스트" />
            </div>
          </div>

          {inputMode === "voice" ? (
            <VoiceInputArea
              recorder={recorder}
              audioPreviewUrl={audioPreviewUrl}
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
              uploadState={uploadState}
              currentProcessing={!!currentProcessing}
              onSubmit={handleVoiceSubmit}
            />
          ) : (
            <TextInputArea
              text={text}
              setText={setText}
              isPending={isPending}
              currentProcessing={!!currentProcessing}
              onSubmit={handleTextSubmit}
            />
          )}

          {error && (
            <div className="mt-3 flex items-center gap-2 text-sm text-accent-700">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {attempts.length > 0 && (
            <div className="mt-4 border-t border-border pt-3">
              <button
                type="button"
                onClick={handleMastered}
                disabled={isPending}
                className="text-sm text-foreground-secondary underline-offset-2 hover:text-primary-600 hover:underline"
              >
                이 질문 졸업으로 표시
              </button>
            </div>
          )}
        </section>
      )}

      {/* 회차별 코칭 결과 */}
      {attempts.length > 0 && (
        <section className="space-y-4">
          {[...attempts].reverse().map((a) => (
            <AttemptCard key={a.id} attempt={a} />
          ))}
        </section>
      )}
    </div>
  );
}

// ============================================================
// 모드 토글 버튼
// ============================================================

function ModeBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
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
  currentProcessing,
  onSubmit,
}: {
  recorder: ReturnType<typeof useRecorder>;
  audioPreviewUrl: string | null;
  isPlaying: boolean;
  setIsPlaying: (v: boolean) => void;
  uploadState: UploadState;
  currentProcessing: boolean;
  onSubmit: () => void;
}) {
  const isUploading = uploadState === "uploading" || uploadState === "submitting";
  const isLocked = isUploading || currentProcessing;
  const recordingActive = recorder.state === "recording";
  const hasRecording = recorder.state === "stopped" && !!recorder.audioBlob;

  function togglePlay() {
    if (!audioPreviewUrl) return;
    const audio = document.getElementById(`coaching-audio-preview`) as HTMLAudioElement | null;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => undefined);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      {/* 녹음 버튼 + 상태 표시 */}
      {!hasRecording && (
        <>
          <button
            type="button"
            disabled={isLocked}
            onClick={() => (recordingActive ? recorder.stopRecording() : recorder.startRecording())}
            className={`flex h-24 w-24 items-center justify-center rounded-full transition disabled:opacity-50 ${
              recordingActive
                ? "bg-accent-500 text-white shadow-lg shadow-accent-500/40 hover:bg-accent-600"
                : "bg-primary-500 text-white shadow-lg shadow-primary-500/40 hover:bg-primary-600"
            }`}
            aria-label={recordingActive ? "녹음 중지" : "녹음 시작"}
          >
            {recordingActive ? <Square className="h-8 w-8 fill-current" /> : <Mic className="h-8 w-8" />}
          </button>

          {/* 녹음 시간 / 볼륨 미터 */}
          {recordingActive && (
            <div className="flex flex-col items-center gap-2">
              <div className="text-2xl font-mono font-semibold text-accent-700">
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

      {/* 녹음 완료 — 미리듣기 + 제출 */}
      {hasRecording && audioPreviewUrl && (
        <div className="w-full space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface-secondary px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-500 text-white hover:bg-primary-600"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
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
              disabled={isLocked}
              className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-foreground-secondary hover:bg-surface hover:text-accent-600 disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" />
              다시 녹음
            </button>
          </div>

          <button
            type="button"
            disabled={isLocked}
            onClick={onSubmit}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary-500 py-3 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {uploadState === "uploading" ? "업로드 중…" : "평가 시작 중…"}
              </>
            ) : currentProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                평가 진행 중…
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

// ============================================================
// 볼륨 미터 (실시간)
// ============================================================

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
  currentProcessing,
  onSubmit,
}: {
  text: string;
  setText: (v: string) => void;
  isPending: boolean;
  currentProcessing: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="본인 답변을 입력하세요. 외우지 마시고 본인 말로 풀어내세요."
        rows={8}
        disabled={isPending || currentProcessing}
        className="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed text-foreground placeholder:text-foreground-muted focus:border-primary-400 focus:outline-none disabled:opacity-50"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground-muted">{text.length}자</span>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isPending || currentProcessing || text.trim().length < 20}
          className="flex items-center gap-2 rounded-full bg-primary-500 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
        >
          {isPending || currentProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              평가 중…
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

// ============================================================
// 회차 카드
// ============================================================

function AttemptCard({ attempt }: { attempt: AttemptDisplay }) {
  const isProcessing = ["pending", "preprocessing", "evaluating"].includes(attempt.status);
  const statusLabel = {
    pending: "전처리 대기",
    preprocessing: "트랜스크립트 정제 중",
    evaluating: "코칭 생성 중",
    done: "완료",
    failed: "실패",
  }[attempt.status];

  return (
    <article className="rounded-2xl border border-border bg-surface p-5">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
            {attempt.attempt_number}회차
          </span>
          <span className="text-[10px] font-mono text-foreground-muted uppercase">
            {attempt.input_mode}
          </span>
          {attempt.status === "done" && attempt.display_summary && (
            <>
              <span className="text-xs text-foreground-muted">
                Skeleton {attempt.display_summary.skeleton_filled}
              </span>
              <span className="text-xs text-foreground-muted">
                · filler {attempt.display_summary.filler_count}
              </span>
              <span className="text-xs text-foreground-muted">
                · 흠 {attempt.display_summary.흠_count}
              </span>
              {attempt.display_summary.progress_from_prev && (
                <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-700">
                  {attempt.display_summary.progress_from_prev}
                </span>
              )}
            </>
          )}
        </div>
        <span className="text-xs text-foreground-muted">
          {new Date(attempt.created_at).toLocaleString("ko-KR")}
        </span>
      </header>

      {isProcessing && (
        <div className="flex items-center gap-2 rounded-xl bg-surface-secondary px-4 py-3 text-sm text-foreground-secondary">
          {attempt.status === "failed" ? (
            <>
              <AlertCircle className="h-4 w-4 text-accent-500" />
              평가 실패. 다시 시도해주세요.
            </>
          ) : (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
              {statusLabel}…
            </>
          )}
        </div>
      )}

      {attempt.cleaned_transcript && (
        <details className="mb-3 rounded-xl border border-border bg-surface-secondary px-4 py-2">
          <summary className="cursor-pointer text-xs font-semibold text-foreground-secondary">
            본인 답변 ({attempt.word_count ?? "?"}단어
            {attempt.audio_duration ? ` · ${formatDuration(attempt.audio_duration)}` : ""})
            {attempt.stt_fix_log && attempt.stt_fix_log.length > 0 && (
              <span className="ml-2 text-foreground-muted">
                — STT 정정 {attempt.stt_fix_log.length}건
              </span>
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
      )}

      {attempt.coaching_markdown && (
        <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:rounded prose-code:bg-surface-secondary prose-code:px-1 prose-code:py-0.5 prose-code:font-mono prose-code:text-foreground prose-li:text-foreground prose-table:text-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {attempt.coaching_markdown}
          </ReactMarkdown>
        </div>
      )}
    </article>
  );
}
