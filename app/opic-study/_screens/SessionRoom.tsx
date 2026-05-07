"use client";

/**
 * SessionRoom — 답변 단계 통합 컴포넌트
 *
 * 핵심 설계: 코치 노트가 그룹 토론의 발판이 됨
 *   - 한 멤버가 답변 → AI 코치노트 생성 → 전원이 함께 봄
 *   - 코치노트를 발판으로 멤버끼리 의견 주고받기 (토론)
 *   - 자연스럽게 다음 발화자 자임
 *   - 모든 멤버 답변 끝 → 다음 질문
 *
 * 모의고사 UI/UX 레이아웃 + 오픽 스터디 BP scope 색상
 *
 * Phase 머신:
 *   speaker_select   — 발화자 미선정 + 답변 없음
 *   speaker_active   — 본인이 발화자 (질문 듣기 → 녹음)
 *   listener         — 다른 멤버가 발화자 (청취)
 *   coaching_wait    — 답변 제출 + F/B 미도착 (전원 같은 화면)
 *   coaching_review  — 답변자의 코치노트를 전원이 함께 봄 (토론)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Volume2,
  RotateCcw,
  Mic,
  ArrowRight,
  Loader2,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Headphones,
  Bot,
  SkipForward,
  Eye,
  EyeOff,
  Users,
  Play,
  Pause,
  MessageSquare,
} from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { AvaAvatar } from "@/components/mock-exam/session/ava-avatar";
import { useRecorder } from "@/lib/hooks/use-recorder";
import { useQuestionPlayer } from "@/lib/hooks/use-question-player";
import type { OpicStudyAnswer, FeedbackResult } from "@/lib/types/opic-study";

// ============================================================
// 타입
// ============================================================

type SessionPhase =
  | "speaker_select"
  | "speaker_active"
  | "listener"
  | "coaching_wait"
  | "coaching_review";

type SpeakerStep = "listen" | "replay" | "record" | "uploading" | "submitted";

type GuideKey = "speaker" | "listen" | "replay" | "record" | "coach";

interface MemberLite {
  key: "a" | "b" | "c" | "d";
  name: string;
  userId: string;
  initial: string;
  isMe: boolean;
  isOnline: boolean;
}

export interface SessionRoomProps {
  sessionId: string;
  questionIdx: number;
  totalQuestions: number;
  questionText: string;
  questionAudioUrl: string | null;
  questionTypeLabel: string;
  questionShortKor: string | null;
  members: MemberLite[];
  currentSpeakerUserId: string | null;
  myAnswer: OpicStudyAnswer | null;
  currentSpeakerAnswer: OpicStudyAnswer | null;
  allAnswers: Record<string, OpicStudyAnswer>;
  groupName: string;
  topicLabel: string;
  comboProgress: string;
  onClaimSpeaker: () => void;
  onSubmitAnswer: (blob: Blob) => Promise<void>;
  onSkipAnswer?: () => void;
  onRetryFeedback: () => Promise<void>;
  onNextSpeaker: () => void;
  /** 다음 질문으로 진행 (모든 멤버 답변 완료 시) */
  onNextQuestion: () => void;
}

// ============================================================
// Phase 결정
// ============================================================

function derivePhase(
  currentSpeakerUserId: string | null,
  myUserId: string,
  allAnswers: Record<string, OpicStudyAnswer>,
  questionIdx: number
): SessionPhase {
  // 발화자가 있을 때 → 발화자의 답변 상태로 분기
  if (currentSpeakerUserId) {
    const speakerAnswer = allAnswers[`${currentSpeakerUserId}_${questionIdx}`];
    if (speakerAnswer?.feedback_result) return "coaching_review";
    if (speakerAnswer) return "coaching_wait";
    if (currentSpeakerUserId === myUserId) return "speaker_active";
    return "listener";
  }

  // 발화자 미선정 — 가장 최근 답변자 검사
  const allForQ = Object.values(allAnswers).filter(
    (a) => a.question_idx === questionIdx
  );
  if (allForQ.length === 0) return "speaker_select";

  const allHaveFeedback = allForQ.every((a) => a.feedback_result);
  if (allHaveFeedback) return "coaching_review";
  return "coaching_wait";
}

function deriveActiveGuide(
  phase: SessionPhase,
  speakerStep: SpeakerStep,
  questionPlayerCanReplay: boolean,
  questionPlayerHasReplayed: boolean
): GuideKey {
  if (phase === "coaching_wait") return "coach";
  if (phase === "coaching_review") return "coach";
  if (phase === "speaker_select") return "speaker";
  if (phase === "listener") return "listen";

  if (phase === "speaker_active") {
    if (speakerStep === "uploading" || speakerStep === "submitted") return "coach";
    if (speakerStep === "record") return "record";
    if (questionPlayerCanReplay && !questionPlayerHasReplayed) return "replay";
    if (speakerStep === "listen") return "listen";
  }
  return "speaker";
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ============================================================
// SessionRoom — 메인
// ============================================================

export function SessionRoom(props: SessionRoomProps) {
  const {
    questionIdx,
    totalQuestions,
    questionText,
    questionAudioUrl,
    questionTypeLabel,
    questionShortKor,
    members,
    currentSpeakerUserId,
    myAnswer,
    allAnswers,
    onClaimSpeaker,
    onSubmitAnswer,
    onSkipAnswer,
    onRetryFeedback,
    onNextSpeaker,
    onNextQuestion,
  } = props;

  const me = members.find((m) => m.isMe);
  const myUserId = me?.userId ?? "";
  const speakerMember =
    members.find((m) => m.userId === currentSpeakerUserId) ?? null;
  const phase = derivePhase(currentSpeakerUserId, myUserId, allAnswers, questionIdx);

  // ── 답변 완료된 멤버들 (시간순) — coaching_review 멤버 탭용 ──
  const answeredMembersOrdered = useMemo(() => {
    const entries = Object.values(allAnswers)
      .filter((a) => a.question_idx === questionIdx && a.feedback_result)
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    const list: { member: MemberLite; answer: OpicStudyAnswer }[] = [];
    for (const a of entries) {
      const m = members.find((mm) => mm.userId === a.user_id);
      if (m) list.push({ member: m, answer: a });
    }
    return list;
  }, [allAnswers, members, questionIdx]);

  // 가장 최근 답변자 = 디폴트 탭
  const latestAnsweredUserId =
    answeredMembersOrdered.length > 0
      ? answeredMembersOrdered[answeredMembersOrdered.length - 1].member.userId
      : null;

  // 선택된 탭 (코치노트 볼 멤버) — 디폴트는 가장 최근 답변자
  const [selectedTabUserId, setSelectedTabUserId] = useState<string | null>(null);

  useEffect(() => {
    // 새 답변 추가 시 자동으로 그 멤버 탭으로 전환
    if (latestAnsweredUserId && latestAnsweredUserId !== selectedTabUserId) {
      setSelectedTabUserId(latestAnsweredUserId);
    }
    // 답변 없으면 reset
    if (!latestAnsweredUserId && selectedTabUserId) {
      setSelectedTabUserId(null);
    }
  }, [latestAnsweredUserId, selectedTabUserId]);

  const selectedReviewItem =
    selectedTabUserId
      ? answeredMembersOrdered.find((x) => x.member.userId === selectedTabUserId)
      : null;

  // 모든 멤버 답변 + F/B 완료?
  const allDone = useMemo(() => {
    return members.every((m) => allAnswers[`${m.userId}_${questionIdx}`]?.feedback_result);
  }, [members, allAnswers, questionIdx]);

  // ── 녹음 + 질문 플레이어 ──
  const recorder = useRecorder({ maxDuration: 240, minDuration: 1 });
  const [uploadState, setUploadState] = useState<
    "idle" | "uploading" | "submitted" | "failed"
  >("idle");
  const [showQuestion, setShowQuestion] = useState(false);

  const autoStartRecording = useCallback(() => {
    if (recorder.state !== "idle" || uploadState !== "idle") return;
    recorder.startRecording();
  }, [recorder, uploadState]);

  const questionPlayer = useQuestionPlayer({
    replayWindowSeconds: 5,
    onPlaybackEnded: autoStartRecording,
  });

  // AVA 컨테이너 높이
  const avaContainerRef = useRef<HTMLDivElement>(null);
  const [avaHeight, setAvaHeight] = useState(0);
  useEffect(() => {
    const el = avaContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setAvaHeight(entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Phase 전환 시 녹음 정리
  useEffect(() => {
    if (phase !== "speaker_active") {
      questionPlayer.reset();
      recorder.reset();
      setUploadState("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    questionPlayer.reset();
    recorder.reset();
    setUploadState("idle");
    setShowQuestion(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionIdx]);

  const speakerStep: SpeakerStep = useMemo(() => {
    if (uploadState === "uploading") return "uploading";
    if (uploadState === "submitted") return "submitted";
    if (recorder.state === "recording") return "record";
    if (questionPlayer.canReplay && !questionPlayer.hasReplayed) return "replay";
    return "listen";
  }, [
    questionPlayer.canReplay,
    questionPlayer.hasReplayed,
    recorder.state,
    uploadState,
  ]);

  useEffect(() => {
    if (recorder.state !== "stopped") return;
    if (!recorder.audioBlob) return;
    if (uploadState !== "idle") return;
    setUploadState("uploading");
    onSubmitAnswer(recorder.audioBlob)
      .then(() => setUploadState("submitted"))
      .catch(() => setUploadState("failed"));
  }, [recorder.state, recorder.audioBlob, uploadState, onSubmitAnswer]);

  const handlePlayQuestion = useCallback(() => {
    if (!questionAudioUrl) {
      autoStartRecording();
      return;
    }
    if (questionPlayer.isPlaying) return;
    questionPlayer.play(questionAudioUrl);
  }, [questionAudioUrl, questionPlayer, autoStartRecording]);

  const handleReplay = useCallback(() => {
    if (!questionPlayer.canReplay || questionPlayer.hasReplayed) return;
    if (recorder.state === "recording") recorder.reset();
    questionPlayer.replay();
  }, [questionPlayer, recorder]);

  const handleFinishRecording = useCallback(() => {
    if (recorder.state === "recording") recorder.stopRecording();
  }, [recorder]);

  const activeGuide = deriveActiveGuide(
    phase,
    speakerStep,
    questionPlayer.canReplay,
    questionPlayer.hasReplayed
  );

  const onlineMembers = members.filter((m) => m.isOnline);
  const answeredCount = members.filter(
    (m) => allAnswers[`${m.userId}_${questionIdx}`]
  ).length;

  return (
    <div
      className="bp-scope flex flex-1 flex-col overflow-hidden"
      style={{ background: "var(--bp-bg)" }}
    >
      {/* TopBar — flex-none, 항상 위 (App Shell 패턴) */}
      <TopBar
        questionIdx={questionIdx}
        totalQuestions={totalQuestions}
        onlineCount={onlineMembers.length}
        totalMembers={members.length}
        answeredCount={answeredCount}
        offlineNames={members
          .filter((m) => !m.isOnline)
          .map((m) => m.name)}
      />

      {/* 스크롤 영역 — TopBar 아래 콘텐츠 자체 스크롤 */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-3 py-2 sm:px-6 sm:py-4">
          <GuideStepper active={activeGuide} />

          <QuestionLabelBar
            questionIdx={questionIdx}
            questionTypeLabel={questionTypeLabel}
            questionShortKor={questionShortKor}
            questionText={questionText}
            showQuestion={showQuestion}
            onToggleQuestion={() => setShowQuestion((p) => !p)}
          />

          <div
            className="mt-2 rounded-2xl border p-3 md:mt-4 md:p-5"
            style={{
              background: "var(--bp-surface)",
              borderColor: "var(--bp-line)",
            }}
          >
            <div className="flex flex-col gap-2 md:flex-row md:gap-5">
            {/* 좌측: AVA + 컨트롤 */}
            <div className="flex min-h-0 flex-1 flex-col gap-2 md:flex-none md:w-[42%] md:gap-3">
              <div
                ref={avaContainerRef}
                className="relative w-full aspect-square overflow-hidden rounded-xl border"
                style={{
                  backgroundColor: "var(--bp-surface-2)",
                  borderColor: "var(--bp-line)",
                }}
              >
                <AvaAvatar
                  isSpeaking={questionPlayer.isPlaying}
                  isListening={recorder.state === "recording"}
                />
                {speakerMember && (
                  <div
                    className="absolute left-2 top-2 z-10 flex items-center gap-1.5 rounded-full px-2 py-1 backdrop-blur-sm"
                    style={{ background: "rgba(31, 27, 22, 0.55)" }}
                  >
                    <SpeakerDot member={speakerMember} />
                    <span className="text-[10px] font-medium text-white">
                      {speakerMember.isMe ? "내 차례" : `${speakerMember.name}님 답변 중`}
                    </span>
                  </div>
                )}
                {/* coaching_review 시 — 누구 코치노트 보고 있는지 표시 */}
                {phase === "coaching_review" && selectedReviewItem && (
                  <div
                    className="absolute left-2 top-2 z-10 flex items-center gap-1.5 rounded-full px-2 py-1 backdrop-blur-sm"
                    style={{ background: "rgba(31, 27, 22, 0.55)" }}
                  >
                    <SpeakerDot member={selectedReviewItem.member} />
                    <span className="text-[10px] font-medium text-white">
                      {selectedReviewItem.member.name}님 코칭
                    </span>
                  </div>
                )}
              </div>

              <LeftControls
                phase={phase}
                speakerStep={speakerStep}
                questionPlayer={questionPlayer}
                questionAudioUrl={questionAudioUrl}
                onPlay={handlePlayQuestion}
                onReplay={handleReplay}
                onClaim={onClaimSpeaker}
                onSkip={onSkipAnswer}
                myAnsweredAlready={!!myAnswer}
              />
            </div>

            <VolumeMeter
              recordingVolume={recorder.volume ?? 0}
              isRecording={recorder.state === "recording"}
              avaHeight={avaHeight}
            />

            <div className="flex flex-col gap-1 md:flex-1 md:gap-2">
              {/* 녹음 시간 박스 — speaker_active 또는 본인 답변 후엔만 의미 */}
              {(phase === "speaker_active" ||
                (phase === "coaching_wait" && myUserId === currentSpeakerUserId)) && (
                <div
                  className="hidden items-center justify-between rounded-xl border p-3 md:flex"
                  style={{
                    background: "var(--bp-surface-2)",
                    borderColor: "var(--bp-line)",
                  }}
                >
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--bp-ink-2)" }}
                  >
                    녹음 시간
                  </span>
                  <span
                    className="font-mono text-2xl font-bold md:text-3xl"
                    style={{
                      color:
                        recorder.state === "recording"
                          ? "var(--bp-tc)"
                          : "var(--bp-ink-4)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatTime(recorder.duration ?? 0)}
                  </span>
                </div>
              )}

              {/* 우측 메인 영역 — Phase별 분기 */}
              <RightMain
                phase={phase}
                speakerStep={speakerStep}
                questionPlayer={questionPlayer}
                speakerMember={speakerMember}
                speakerAnswer={props.currentSpeakerAnswer}
                myAnswer={myAnswer}
                onRetry={onRetryFeedback}
                /* coaching_review 데이터 */
                answeredMembersOrdered={answeredMembersOrdered}
                selectedTabUserId={selectedTabUserId}
                onSelectTab={setSelectedTabUserId}
                selectedReviewItem={selectedReviewItem}
              />

              {/* 하단 액션 */}
              <BottomAction
                phase={phase}
                speakerStep={speakerStep}
                onFinish={handleFinishRecording}
                onNextSpeaker={onNextSpeaker}
                onNextQuestion={onNextQuestion}
                hasNextSpeakerSelected={!!currentSpeakerUserId}
                allDone={allDone}
                isLastQuestion={questionIdx === totalQuestions - 1}
                myAnsweredAlready={!!myAnswer}
                membersLeft={
                  members.filter((m) => !allAnswers[`${m.userId}_${questionIdx}`]).length
                }
              />
            </div>
          </div>
        </div>

          <MembersStrip
            members={members}
            questionIdx={questionIdx}
            allAnswers={allAnswers}
            currentSpeakerUserId={currentSpeakerUserId}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 상단 바
// ============================================================

function TopBar({
  questionIdx,
  totalQuestions,
  onlineCount,
  totalMembers,
  answeredCount,
  offlineNames,
}: {
  questionIdx: number;
  totalQuestions: number;
  onlineCount: number;
  totalMembers: number;
  answeredCount: number;
  offlineNames: string[];
}) {
  const allOnline = onlineCount === totalMembers && totalMembers > 0;
  return (
    <div
      className="border-b px-3 py-2 sm:px-6 sm:py-3"
      style={{
        background: "var(--bp-surface)",
        borderColor: "var(--bp-line)",
      }}
    >
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm" style={{ color: "var(--bp-ink-2)" }}>
            문항{" "}
            <span className="font-bold" style={{ color: "var(--bp-ink)" }}>
              {questionIdx + 1}
            </span>{" "}
            / {totalQuestions}
          </span>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs" style={{ color: "var(--bp-ink-3)" }}>
              답변 {answeredCount}/{totalMembers}
            </span>
            {/* 멤버 presence pill — TopBar 우측 끝 (레이아웃 max-w 1040 안) */}
            {totalMembers > 0 && (
              <span
                aria-label={`접속 멤버 ${onlineCount}/${totalMembers}`}
                title={
                  offlineNames.length > 0
                    ? `오프라인: ${offlineNames.join(", ")}`
                    : "모두 접속 중"
                }
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                style={{
                  color: allOnline ? "#2d7a3d" : "#a48121",
                  background: allOnline
                    ? "rgba(45, 122, 61, 0.10)"
                    : "rgba(164, 129, 33, 0.10)",
                  border: `1px solid ${
                    allOnline
                      ? "rgba(45, 122, 61, 0.25)"
                      : "rgba(164, 129, 33, 0.25)"
                  }`,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <Users size={11} strokeWidth={2.4} aria-hidden="true" />
                <span className="hidden sm:inline">멤버 </span>
                {onlineCount}/{totalMembers}
              </span>
            )}
          </div>
        </div>
        <div
          className="mt-2 h-1.5 rounded-full"
          style={{ background: "var(--bp-surface-2)" }}
        >
          <div
            className="h-1.5 rounded-full transition-all"
            style={{
              width: `${((questionIdx + 1) / totalQuestions) * 100}%`,
              background: "var(--bp-tc)",
            }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {Array.from({ length: totalQuestions }).map((_, i) => {
            const isCurrent = i === questionIdx;
            const isPast = i < questionIdx;
            return (
              <div
                key={i}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-all"
                style={{
                  background: isCurrent
                    ? "var(--bp-tc)"
                    : isPast
                      ? "var(--bp-good, #5a8f5a)"
                      : "var(--bp-surface)",
                  color: isCurrent || isPast ? "#fff" : "var(--bp-ink-4)",
                  border: isCurrent || isPast ? "none" : "1px solid var(--bp-line)",
                  boxShadow: isCurrent
                    ? "0 0 0 4px rgba(201, 100, 66, 0.15)"
                    : "none",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {i + 1}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 5단계 가이드
// ============================================================

const GUIDE_STEPS: Array<{
  key: GuideKey;
  label: string;
  Icon: typeof Headphones;
  ActiveIcon?: typeof Headphones;
}> = [
  { key: "speaker", label: "발화자 선정", Icon: Mic },
  { key: "listen", label: "질문 듣기", Icon: Headphones, ActiveIcon: Volume2 },
  { key: "replay", label: "다시 듣기", Icon: RotateCcw },
  { key: "record", label: "답변 녹음", Icon: Mic },
  { key: "coach", label: "코치노트", Icon: Bot },
];

function GuideStepper({ active }: { active: GuideKey }) {
  return (
    <div
      className="rounded-xl border p-2 md:p-3"
      style={{
        background: "var(--bp-surface)",
        borderColor: "var(--bp-line)",
      }}
    >
      <div className="flex items-center justify-between gap-1 md:gap-3">
        {GUIDE_STEPS.map((step, i, arr) => {
          const isActive = step.key === active;
          const ActiveIcon = step.ActiveIcon ?? step.Icon;
          return (
            <div key={step.key} className="flex flex-1 items-center">
              <div className="flex-1 text-center">
                <div
                  className="mx-auto flex h-7 w-7 items-center justify-center rounded-full transition-all md:mb-1 md:h-10 md:w-10 md:rounded-lg"
                  style={{
                    background: isActive
                      ? "var(--bp-tc)"
                      : "var(--bp-surface-2)",
                    border: isActive ? "none" : "1px solid var(--bp-line)",
                  }}
                >
                  {isActive ? (
                    <ActiveIcon
                      size={16}
                      className="md:h-5 md:w-5"
                      color="#fff"
                    />
                  ) : (
                    <step.Icon
                      size={16}
                      className="md:h-5 md:w-5"
                      color="var(--bp-ink-4)"
                    />
                  )}
                </div>
                <div
                  className="hidden font-medium md:block md:text-xs"
                  style={{
                    color: isActive ? "var(--bp-tc)" : "var(--bp-ink-3)",
                  }}
                >
                  {step.label}
                </div>
              </div>
              {i < arr.length - 1 && (
                <div
                  className="h-px w-2 flex-shrink-0 md:w-5"
                  style={{ background: "var(--bp-line-strong)" }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// 질문 라벨
// ============================================================

function QuestionLabelBar({
  questionIdx,
  questionTypeLabel,
  questionShortKor,
  questionText,
  showQuestion,
  onToggleQuestion,
}: {
  questionIdx: number;
  questionTypeLabel: string;
  questionShortKor: string | null;
  questionText: string;
  showQuestion: boolean;
  onToggleQuestion: () => void;
}) {
  return (
    <div
      className="mt-2 rounded-xl border p-2 md:mt-4 md:p-3"
      style={{
        background: "var(--bp-tc-tint)",
        borderColor: "var(--bp-line)",
        opacity: 0.96,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{
              background: "var(--bp-tc)",
              color: "#fff",
              letterSpacing: "0.02em",
            }}
          >
            Q{questionIdx + 1} · {questionTypeLabel || "—"}
          </span>
          {questionShortKor && (
            <span
              className="text-xs font-semibold"
              style={{ color: "var(--bp-ink)" }}
            >
              {questionShortKor}
            </span>
          )}
        </div>
        <button
          onClick={onToggleQuestion}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors"
          style={{ color: "var(--bp-ink-3)" }}
        >
          {showQuestion ? <EyeOff size={14} /> : <Eye size={14} />}
          {showQuestion ? "숨기기" : "질문 보기"}
        </button>
      </div>
      {showQuestion && questionText && (
        <div
          className="mt-2 border-t pt-2"
          style={{ borderColor: "rgba(201, 100, 66, 0.2)" }}
        >
          <p
            className="text-sm font-medium italic"
            style={{ color: "var(--bp-ink)", lineHeight: 1.55 }}
          >
            &ldquo;{questionText}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 좌측 컨트롤
// ============================================================

function LeftControls({
  phase,
  speakerStep,
  questionPlayer,
  questionAudioUrl,
  onPlay,
  onReplay,
  onClaim,
  onSkip,
  myAnsweredAlready,
}: {
  phase: SessionPhase;
  speakerStep: SpeakerStep;
  questionPlayer: ReturnType<typeof useQuestionPlayer>;
  questionAudioUrl: string | null;
  onPlay: () => void;
  onReplay: () => void;
  onClaim: () => void;
  onSkip?: () => void;
  myAnsweredAlready: boolean;
}) {
  return (
    <div
      className="rounded-xl border p-3"
      style={{
        background: "var(--bp-surface-2)",
        borderColor: "var(--bp-line)",
      }}
    >
      <div
        className="mb-3 h-1.5 overflow-hidden rounded-full"
        style={{ background: "var(--bp-line-strong)" }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300 ease-linear"
          style={{
            width: `${questionPlayer.playbackProgress}%`,
            background: "var(--bp-tc)",
          }}
        />
      </div>

      {/* 발화자 선정 — 본인이 아직 답변 안 했을 때만 자임 가능 */}
      {phase === "speaker_select" && !myAnsweredAlready && (
        <button
          onClick={onClaim}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-base font-bold transition-all hover:opacity-90 active:scale-95"
          style={{
            background: "var(--bp-tc)",
            color: "#fff",
            boxShadow: "0 4px 12px rgba(201, 100, 66, 0.25)",
          }}
        >
          <Mic size={18} strokeWidth={2.4} />
          내가 답변
        </button>
      )}
      {phase === "speaker_select" && myAnsweredAlready && (
        <div
          className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium"
          style={{
            background: "var(--bp-surface)",
            color: "var(--bp-ink-3)",
            border: "1px solid var(--bp-line)",
          }}
        >
          <CheckCircle2 size={16} color="var(--bp-good, #5a8f5a)" />
          내 답변 완료
        </div>
      )}

      {/* coaching_review — 본인 답변 안 했으면 자임 가능 */}
      {phase === "coaching_review" && !myAnsweredAlready && (
        <button
          onClick={onClaim}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-base font-bold transition-all hover:opacity-90 active:scale-95"
          style={{
            background: "var(--bp-tc)",
            color: "#fff",
            boxShadow: "0 4px 12px rgba(201, 100, 66, 0.25)",
          }}
        >
          <Mic size={18} strokeWidth={2.4} />
          내가 답변
        </button>
      )}
      {phase === "coaching_review" && myAnsweredAlready && (
        <div
          className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium"
          style={{
            background: "var(--bp-good-tint, #e6efe1)",
            color: "var(--bp-good, #5a8f5a)",
          }}
        >
          <CheckCircle2 size={16} />
          내 답변 완료 — 함께 이야기 나눠 보세요
        </div>
      )}

      {phase === "speaker_active" && (
        <>
          {speakerStep === "listen" &&
            !questionPlayer.hasPlayed &&
            !questionPlayer.isPlaying && (
              <button
                onClick={onPlay}
                disabled={questionPlayer.isPlaying}
                className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-all hover:opacity-90 active:scale-95 md:py-3 md:text-base"
                style={{
                  background: "var(--bp-tc)",
                  color: "#fff",
                  boxShadow: "0 4px 12px rgba(201, 100, 66, 0.25)",
                }}
              >
                <Volume2 size={18} />
                {questionAudioUrl ? "질문 듣기" : "녹음 시작"}
              </button>
            )}
          {questionPlayer.isPlaying && (
            <button
              disabled
              className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold disabled:opacity-80 md:py-3 md:text-base"
              style={{ background: "var(--bp-tc)", color: "#fff" }}
            >
              <Loader2 size={18} className="animate-spin" />
              Playing...
            </button>
          )}
          {speakerStep === "replay" &&
            questionPlayer.canReplay &&
            !questionPlayer.hasReplayed && (
              <button
                onClick={onReplay}
                className="flex w-full animate-pulse items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-all md:py-3 md:text-base"
                style={{
                  background: "var(--bp-tc)",
                  color: "#fff",
                  boxShadow: "0 4px 12px rgba(201, 100, 66, 0.25)",
                }}
              >
                <RotateCcw size={18} />
                다시 듣기 ({questionPlayer.replayCountdown}초)
              </button>
            )}
          {(speakerStep === "record" ||
            speakerStep === "uploading" ||
            speakerStep === "submitted") && (
            <div
              className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold md:py-3 md:text-base"
              style={{
                background: "var(--bp-surface)",
                color: "var(--bp-ink-3)",
                border: "1px solid var(--bp-line)",
              }}
            >
              {speakerStep === "record" ? (
                <>
                  <Mic size={18} color="var(--bp-tc)" />
                  녹음 중…
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} color="var(--bp-good, #5a8f5a)" />
                  제출 완료
                </>
              )}
            </div>
          )}
          {onSkip && (speakerStep === "listen" || speakerStep === "replay") && (
            <button
              onClick={onSkip}
              className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg px-4 py-2 text-xs transition-colors"
              style={{
                background: "var(--bp-surface)",
                color: "var(--bp-ink-3)",
                border: "1px solid var(--bp-line)",
              }}
            >
              <SkipForward size={12} />
              이번 질문 패스
            </button>
          )}
        </>
      )}

      {phase === "listener" && (
        <div
          className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium"
          style={{
            background: "var(--bp-surface)",
            color: "var(--bp-ink-2)",
            border: "1px solid var(--bp-line)",
          }}
        >
          <Headphones size={16} />
          답변 듣는 중
        </div>
      )}

      {phase === "coaching_wait" && (
        <div
          className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium"
          style={{
            background: "var(--bp-tc-tint)",
            color: "var(--bp-tc)",
          }}
        >
          <Loader2 size={16} className="animate-spin" />
          코치 작업 중
        </div>
      )}
    </div>
  );
}

// ============================================================
// LED 볼륨 미터
// ============================================================

function VolumeMeter({
  recordingVolume,
  isRecording,
  avaHeight,
}: {
  recordingVolume: number;
  isRecording: boolean;
  avaHeight: number;
}) {
  return (
    <div
      className="hidden w-4 flex-shrink-0 md:flex md:flex-col md:items-center md:gap-1"
      style={{ height: avaHeight > 0 ? avaHeight : undefined }}
    >
      <div
        className="flex w-full flex-1 flex-col-reverse gap-px rounded-lg border p-0.5"
        style={{
          background: "var(--bp-surface-2)",
          borderColor: "var(--bp-line)",
        }}
      >
        {Array.from({ length: 24 }).map((_, i) => {
          const threshold = (i + 1) / 24;
          const vol = isRecording ? recordingVolume : 0;
          const lit = vol >= threshold;
          let bg = "var(--bp-line)";
          if (lit) {
            if (i < 16) bg = "var(--bp-tc-soft, #f5d7c8)";
            else if (i < 21) bg = "var(--bp-tc)";
            else bg = "var(--bp-tip, #a48121)";
          }
          return (
            <div
              key={i}
              className="w-full flex-1 rounded-sm transition-colors duration-75"
              style={{ background: bg }}
            />
          );
        })}
      </div>
      <Mic
        size={12}
        className="shrink-0"
        style={{
          color: isRecording ? "var(--bp-tc)" : "var(--bp-ink-4)",
          animation: isRecording ? "bp-pulse 1.2s infinite" : "none",
        }}
      />
    </div>
  );
}

// ============================================================
// 우측 메인 영역
// ============================================================

function RightMain({
  phase,
  speakerStep,
  questionPlayer,
  speakerMember,
  speakerAnswer,
  myAnswer,
  onRetry,
  answeredMembersOrdered,
  selectedTabUserId,
  onSelectTab,
  selectedReviewItem,
}: {
  phase: SessionPhase;
  speakerStep: SpeakerStep;
  questionPlayer: ReturnType<typeof useQuestionPlayer>;
  speakerMember: MemberLite | null;
  speakerAnswer: OpicStudyAnswer | null;
  myAnswer: OpicStudyAnswer | null;
  onRetry: () => Promise<void>;
  answeredMembersOrdered: { member: MemberLite; answer: OpicStudyAnswer }[];
  selectedTabUserId: string | null;
  onSelectTab: (userId: string) => void;
  selectedReviewItem: { member: MemberLite; answer: OpicStudyAnswer } | undefined | null;
}) {
  // coaching_review — 메인 컨텐츠
  if (phase === "coaching_review" && selectedReviewItem) {
    return (
      <div
        className="hidden flex-1 flex-col rounded-xl border md:flex"
        style={{
          background: "var(--bp-surface-2)",
          borderColor: "var(--bp-line)",
        }}
      >
        {/* 멤버 탭 */}
        {answeredMembersOrdered.length > 1 && (
          <div
            className="flex flex-wrap gap-1 border-b p-2"
            style={{ borderColor: "var(--bp-line)" }}
          >
            {answeredMembersOrdered.map(({ member }) => {
              const isActive = selectedTabUserId === member.userId;
              return (
                <button
                  key={member.userId}
                  onClick={() => onSelectTab(member.userId)}
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all"
                  style={{
                    background: isActive
                      ? "var(--bp-tc)"
                      : "var(--bp-surface)",
                    color: isActive ? "#fff" : "var(--bp-ink-2)",
                    border: isActive
                      ? "none"
                      : "1px solid var(--bp-line)",
                  }}
                >
                  <SpeakerDot member={member} />
                  <span>{member.name}</span>
                  {member.isMe && (
                    <span className="text-[9px] opacity-70">(나)</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* 코치 노트 본문 */}
        <div className="flex-1 overflow-y-auto p-4">
          <CoachingReviewContent
            member={selectedReviewItem.member}
            answer={selectedReviewItem.answer}
          />
        </div>
      </div>
    );
  }

  // 기타 phase — 작은 상태 박스
  return (
    <div
      className="hidden flex-1 flex-col items-center justify-center rounded-xl border p-4 md:flex"
      style={{
        background: "var(--bp-surface-2)",
        borderColor: "var(--bp-line)",
        minHeight: 280,
      }}
    >
      {phase === "speaker_select" && (
        <div className="text-center">
          <Mic size={32} className="mx-auto mb-2" color="var(--bp-ink-4)" />
          <p
            className="text-sm font-medium"
            style={{ color: "var(--bp-ink-2)" }}
          >
            먼저 답변할 분을 선택해주세요
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--bp-ink-3)" }}>
            한 명이 먼저 답하면 모두 함께 들어요
          </p>
        </div>
      )}

      {phase === "speaker_active" &&
        speakerStep === "listen" &&
        !questionPlayer.hasPlayed &&
        !questionPlayer.isPlaying && (
          <div className="text-center">
            <Headphones
              size={32}
              className="mx-auto mb-2"
              color="var(--bp-ink-4)"
            />
            <p
              className="text-sm font-medium"
              style={{ color: "var(--bp-ink-2)" }}
            >
              준비되셨나요?
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--bp-ink-3)" }}>
              좌측 &apos;질문 듣기&apos; 버튼을 눌러 질문을 들어주세요
            </p>
          </div>
        )}

      {phase === "speaker_active" && questionPlayer.isPlaying && (
        <div className="text-center">
          <Volume2
            size={32}
            className="mx-auto mb-2 animate-pulse"
            color="var(--bp-tc)"
          />
          <p className="text-sm font-medium" style={{ color: "var(--bp-tc)" }}>
            질문을 듣는 중...
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--bp-ink-3)" }}>
            질문을 잘 듣고 답변을 준비하세요
          </p>
        </div>
      )}

      {phase === "speaker_active" && speakerStep === "record" && (
        <div
          className="relative flex w-full flex-1 flex-col items-center justify-center overflow-hidden rounded-xl"
          style={{
            background: "var(--bp-tc-tint)",
            border: "2px solid var(--bp-tc-soft, #f5d7c8)",
          }}
        >
          <div
            className="absolute inset-0 animate-pulse"
            style={{ background: "rgba(201, 100, 66, 0.06)" }}
          />
          <div className="z-10 flex items-center gap-2">
            <div
              className="h-2 w-2 animate-pulse rounded-full"
              style={{ background: "var(--bp-tc)" }}
            />
            <span
              className="text-sm font-bold uppercase tracking-widest md:text-base"
              style={{ color: "var(--bp-tc)" }}
            >
              Recording...
            </span>
          </div>
          <p className="z-10 mt-2 text-xs" style={{ color: "var(--bp-ink-2)" }}>
            답변 끝났으면 &apos;답변 완료&apos; 버튼을 눌러주세요
          </p>
        </div>
      )}

      {phase === "speaker_active" &&
        (speakerStep === "uploading" || speakerStep === "submitted") && (
          <div
            className="flex w-full flex-col items-center justify-center gap-3 rounded-xl py-6 md:py-8"
            style={{
              background: "var(--bp-tc-tint)",
              border: "2px solid var(--bp-tc-soft, #f5d7c8)",
            }}
          >
            <Loader2
              className="h-6 w-6 animate-spin md:h-8 md:w-8"
              color="var(--bp-tc)"
            />
            <span
              className="animate-pulse text-sm font-medium tracking-wide md:text-base"
              style={{ color: "var(--bp-tc)" }}
            >
              {speakerStep === "uploading"
                ? "Uploading your audio..."
                : "코치가 듣는 중..."}
            </span>
          </div>
        )}

      {phase === "listener" && (
        <ListenerStatus
          speakerMember={speakerMember}
          speakerAnswer={speakerAnswer}
        />
      )}

      {phase === "coaching_wait" && (
        <CoachingWaitStatus answer={myAnswer ?? speakerAnswer} onRetry={onRetry} />
      )}
    </div>
  );
}

function ListenerStatus({
  speakerMember,
  speakerAnswer,
}: {
  speakerMember: MemberLite | null;
  speakerAnswer: OpicStudyAnswer | null;
}) {
  const isStillSpeaking = !speakerAnswer;
  const speakerName = speakerMember?.name ?? "발화자";
  return (
    <div className="text-center">
      <Headphones
        size={32}
        className="mx-auto mb-2 animate-pulse"
        color="var(--bp-tc)"
      />
      <p className="text-sm font-medium" style={{ color: "var(--bp-ink)" }}>
        {isStillSpeaking
          ? `${speakerName}님이 답변하고 있어요`
          : `${speakerName}님 답변 완료`}
      </p>
      <p className="mt-1 text-xs" style={{ color: "var(--bp-ink-3)" }}>
        {isStillSpeaking
          ? "함께 들으면서 어떤 표현을 쓰는지 살펴보세요"
          : "곧 코치노트가 나올 거예요"}
      </p>
    </div>
  );
}

function CoachingWaitStatus({
  answer,
  onRetry,
}: {
  answer: OpicStudyAnswer | null;
  onRetry: () => Promise<void>;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const start = answer?.created_at
      ? new Date(answer.created_at).getTime()
      : Date.now();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [answer?.created_at]);

  const isLong = elapsed > 60;

  return (
    <div className="text-center w-full">
      <Sparkles
        size={32}
        className="mx-auto mb-2 animate-pulse"
        color="var(--bp-tc)"
      />
      <p className="text-sm font-medium" style={{ color: "var(--bp-ink)" }}>
        코치가 답변을 듣고 있어요
      </p>
      <p className="mt-1 text-xs" style={{ color: "var(--bp-ink-3)" }}>
        {isLong
          ? "조금 오래 걸리고 있어요"
          : `약 10~30초 정도 걸려요 (${elapsed}초 경과)`}
      </p>
      {isLong && (
        <button
          onClick={async () => {
            if (retrying) return;
            setRetrying(true);
            await onRetry();
            setRetrying(false);
          }}
          disabled={retrying}
          className="mt-3 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
          style={{
            background: "var(--bp-surface)",
            color: "var(--bp-ink-2)",
            border: "1px solid var(--bp-line)",
          }}
        >
          <RefreshCw size={12} className={retrying ? "animate-spin" : ""} />
          {retrying ? "재시도 중…" : "코칭 다시 받기"}
        </button>
      )}
    </div>
  );
}

// ============================================================
// 코치 노트 본문 — 메인 멘트 + 강점/다듬을점/팁 + 전사 + 음성 + 토론 가이드
// ============================================================

function CoachingReviewContent({
  member,
  answer,
}: {
  member: MemberLite;
  answer: OpicStudyAnswer;
}) {
  const feedback = answer.feedback_result as FeedbackResult;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Bot size={20} color="var(--bp-tc)" />
        <p className="text-sm font-bold" style={{ color: "var(--bp-ink)" }}>
          {member.name}님 코치 노트
        </p>
      </div>

      {feedback?.feedback_text && (
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--bp-ink)" }}
        >
          {feedback.feedback_text}
        </p>
      )}

      {feedback?.strengths?.length > 0 && (
        <div
          className="rounded-lg p-2.5"
          style={{
            background: "var(--bp-good-tint, #e6efe1)",
            border: "1px solid rgba(90, 143, 90, 0.3)",
          }}
        >
          <p
            className="mb-1 text-xs font-bold"
            style={{ color: "var(--bp-good, #5a8f5a)" }}
          >
            ✓ 잘한 점
          </p>
          <ul className="space-y-1 text-xs" style={{ color: "var(--bp-ink)" }}>
            {feedback.strengths.map((s, i) => (
              <li key={i}>· {s}</li>
            ))}
          </ul>
        </div>
      )}

      {feedback?.improvements?.length > 0 && (
        <div
          className="rounded-lg p-2.5"
          style={{
            background: "var(--bp-tip-tint, #fbf1d1)",
            border: "1px solid rgba(164, 129, 33, 0.3)",
          }}
        >
          <p
            className="mb-1 text-xs font-bold"
            style={{ color: "var(--bp-tip, #a48121)" }}
          >
            ◈ 다듬을 부분
          </p>
          <ul className="space-y-1 text-xs" style={{ color: "var(--bp-ink)" }}>
            {feedback.improvements.map((s, i) => (
              <li key={i}>· {s}</li>
            ))}
          </ul>
        </div>
      )}

      {feedback?.tips?.length > 0 && (
        <div
          className="rounded-lg p-2.5"
          style={{
            background: "var(--bp-tc-tint)",
            border: "1px solid rgba(201, 100, 66, 0.3)",
          }}
        >
          <p
            className="mb-1 text-xs font-bold"
            style={{ color: "var(--bp-tc)" }}
          >
            💡 다음에 적용
          </p>
          <ul className="space-y-1 text-xs" style={{ color: "var(--bp-ink)" }}>
            {feedback.tips.map((s, i) => (
              <li key={i}>· {s}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 전사 + 음성 재생 — 모의고사 패턴 */}
      {(answer.transcript || answer.audio_url) && (
        <div
          className="rounded-lg p-3"
          style={{
            background: "var(--bp-surface)",
            border: "1px solid var(--bp-line)",
          }}
        >
          <p
            className="mb-2 text-xs font-bold"
            style={{ color: "var(--bp-ink-2)" }}
          >
            🎙️ 답변 다시 듣기 + 전사
          </p>
          {answer.audio_url && (
            <AnswerAudioPlayer audioPath={answer.audio_url} />
          )}
          {answer.transcript && (
            <p
              className="mt-2 text-xs leading-relaxed"
              style={{ color: "var(--bp-ink-2)" }}
            >
              {answer.transcript}
            </p>
          )}
        </div>
      )}

      {/* 토론 가이드 */}
      <div
        className="rounded-lg p-2.5"
        style={{
          background: "var(--bp-surface)",
          border: "1px dashed var(--bp-line-strong)",
        }}
      >
        <div className="mb-1.5 flex items-center gap-1.5">
          <MessageSquare size={14} color="var(--bp-tc)" />
          <p
            className="text-xs font-bold"
            style={{ color: "var(--bp-ink)" }}
          >
            함께 의견 나눠보세요
          </p>
        </div>
        <ul className="space-y-1 text-xs" style={{ color: "var(--bp-ink-2)" }}>
          <li>· 이 답변에서 가장 인상적이었던 표현은?</li>
          <li>· 여러분이라면 어떻게 답하시겠어요?</li>
          <li>· 코치노트의 ‘다음에 적용’ 팁 함께 연습해 볼까요?</li>
        </ul>
      </div>
    </div>
  );
}

// ============================================================
// 답변 음성 재생 (Storage 경로 → signed URL)
// ============================================================

function AnswerAudioPlayer({ audioPath }: { audioPath: string }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase.storage
      .from("opic-study-recordings")
      .createSignedUrl(audioPath, 3600)
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.signedUrl) setSignedUrl(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [audioPath]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => setPlaying(false);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, [signedUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.pause();
    else audio.play();
    setPlaying(!playing);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * duration;
  };

  const fmt = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!signedUrl) {
    return (
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
        style={{
          background: "var(--bp-surface-2)",
          color: "var(--bp-ink-3)",
        }}
      >
        <Loader2 size={12} className="animate-spin" />
        음성 불러오는 중…
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 rounded-lg px-3 py-2"
      style={{ background: "var(--bp-surface-2)" }}
    >
      <audio ref={audioRef} src={signedUrl} preload="metadata" />
      <button
        onClick={togglePlay}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors"
        style={{
          background: "var(--bp-tc)",
          color: "#fff",
        }}
      >
        {playing ? (
          <Pause size={14} fill="currentColor" strokeWidth={0} />
        ) : (
          <Play size={14} fill="currentColor" strokeWidth={0} className="ml-0.5" />
        )}
      </button>
      <div className="flex flex-1 items-center gap-2">
        <span
          className="text-[10px] font-medium"
          style={{
            color: "var(--bp-ink-2)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {fmt(currentTime)}
        </span>
        <div
          className="relative h-1.5 flex-1 cursor-pointer rounded-full"
          style={{ background: "var(--bp-line-strong)" }}
          onClick={seek}
        >
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-[width] duration-100"
            style={{
              width: `${progress}%`,
              background: "var(--bp-tc)",
            }}
          />
          <div
            className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow-sm transition-[left] duration-100"
            style={{
              left: `calc(${progress}% - 6px)`,
              border: "2px solid var(--bp-tc)",
            }}
          />
        </div>
        <span
          className="text-[10px] font-medium"
          style={{
            color: "var(--bp-ink-3)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {fmt(duration)}
        </span>
      </div>
    </div>
  );
}

// ============================================================
// 하단 액션
// ============================================================

function BottomAction({
  phase,
  speakerStep,
  onFinish,
  onNextSpeaker,
  onNextQuestion,
  hasNextSpeakerSelected,
  allDone,
  isLastQuestion,
  myAnsweredAlready,
  membersLeft,
}: {
  phase: SessionPhase;
  speakerStep: SpeakerStep;
  onFinish: () => void;
  onNextSpeaker: () => void;
  onNextQuestion: () => void;
  hasNextSpeakerSelected: boolean;
  allDone: boolean;
  isLastQuestion: boolean;
  myAnsweredAlready: boolean;
  membersLeft: number;
}) {
  if (phase === "speaker_active" && speakerStep === "record") {
    return (
      <button
        onClick={onFinish}
        className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-base font-bold transition-all hover:opacity-90 active:scale-95"
        style={{
          background: "var(--bp-tc)",
          color: "#fff",
          boxShadow: "0 4px 12px rgba(201, 100, 66, 0.25)",
        }}
      >
        답변 완료
        <ArrowRight size={18} />
      </button>
    );
  }

  if (phase === "coaching_review") {
    // 모든 멤버 답변 완료 → 다음 질문
    if (allDone) {
      return (
        <button
          onClick={onNextQuestion}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-base font-bold transition-all hover:opacity-90 active:scale-95"
          style={{
            background: "var(--bp-tc)",
            color: "#fff",
            boxShadow: "0 4px 12px rgba(201, 100, 66, 0.25)",
          }}
        >
          {isLastQuestion ? "스터디 마무리" : `다음 질문 (Q${membersLeft}…)`}
          <ArrowRight size={18} />
        </button>
      );
    }

    // 본인이 아직 답변 안 했으면 — "내가 답변" 버튼은 좌측 컨트롤에 있음
    // 본인이 답변 했으면 — "다음 발화자 자임 대기" 안내
    if (myAnsweredAlready) {
      return (
        <div
          className="rounded-lg px-4 py-3 text-center text-xs"
          style={{
            background: "var(--bp-surface)",
            color: "var(--bp-ink-3)",
            border: "1px solid var(--bp-line)",
          }}
        >
          {hasNextSpeakerSelected
            ? "다음 멤버가 답변 중이에요…"
            : `다음 답변할 분이 ‘내가 답변’을 눌러주세요 (${membersLeft}명 남음)`}
        </div>
      );
    }

    // 본인 답변 X — 좌측 "내가 답변" 버튼이 있으니 안내만
    return (
      <div
        className="rounded-lg px-4 py-3 text-center text-xs"
        style={{
          background: "var(--bp-tc-tint)",
          color: "var(--bp-tc)",
          border: "1px solid rgba(201, 100, 66, 0.3)",
          fontWeight: 600,
        }}
      >
        ← &apos;내가 답변&apos; 버튼을 누르고 시작해 보세요
      </div>
    );
  }

  return null;
}

// ============================================================
// 멤버 dot
// ============================================================

const SPEAKER_COLOR_BG: Record<MemberLite["key"], string> = {
  a: "var(--bp-mb-a, #c96442)",
  b: "var(--bp-mb-b, #5a8f9c)",
  c: "var(--bp-mb-c, #a48121)",
  d: "var(--bp-mb-d, #6b6390)",
};

function SpeakerDot({ member }: { member: MemberLite }) {
  return (
    <div
      className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
      style={{ background: SPEAKER_COLOR_BG[member.key] }}
    >
      {member.initial}
    </div>
  );
}

// ============================================================
// 멤버 strip (하단)
// ============================================================

function MembersStrip({
  members,
  questionIdx,
  allAnswers,
  currentSpeakerUserId,
}: {
  members: MemberLite[];
  questionIdx: number;
  allAnswers: Record<string, OpicStudyAnswer>;
  currentSpeakerUserId: string | null;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2 px-1 pb-2">
      {members.map((m) => {
        const answer = allAnswers[`${m.userId}_${questionIdx}`];
        const isSpeaking = currentSpeakerUserId === m.userId;
        const status: "speaking" | "done" | "waiting" | "offline" = !m.isOnline
          ? "offline"
          : isSpeaking
            ? "speaking"
            : answer?.feedback_result
              ? "done"
              : answer
                ? "speaking"
                : "waiting";

        const styleByStatus = {
          speaking: {
            background: "var(--bp-tc-tint)",
            color: "var(--bp-tc)",
            ring: "1px solid var(--bp-tc-soft, #f5d7c8)",
          },
          done: {
            background: "var(--bp-good-tint, #e6efe1)",
            color: "var(--bp-good, #5a8f5a)",
            ring: "1px solid rgba(90, 143, 90, 0.3)",
          },
          offline: {
            background: "var(--bp-surface-2)",
            color: "var(--bp-ink-4)",
            ring: "1px solid var(--bp-line)",
          },
          waiting: {
            background: "var(--bp-surface)",
            color: "var(--bp-ink-2)",
            ring: "1px solid var(--bp-line)",
          },
        }[status];

        return (
          <div
            key={m.userId}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
            style={{
              background: styleByStatus.background,
              color: styleByStatus.color,
              border: styleByStatus.ring,
            }}
          >
            <SpeakerDot member={m} />
            <span className="font-medium">{m.name}</span>
            {m.isMe && (
              <span className="text-[9px]" style={{ opacity: 0.7 }}>
                (나)
              </span>
            )}
            <span className="text-[10px]" style={{ opacity: 0.7 }}>
              {status === "speaking"
                ? "답변 중"
                : status === "done"
                  ? "✓ 완료"
                  : status === "offline"
                    ? "오프라인"
                    : "대기"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
