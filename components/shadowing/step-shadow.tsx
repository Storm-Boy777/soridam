"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Languages,
  CaseSensitive,
  Type,
  RefreshCw,
  Check,
  Mic,
  Square,
} from "lucide-react";
import { ShadowingPlayer } from "./shadowing-player";
import { SentenceMasteryDots } from "./sentence-mastery-dots";
import { QuestionCard } from "./question-card";
import { useShadowingStore, type TextHintLevel } from "@/lib/stores/shadowing";

const LANG_OPTIONS: { mode: TextHintLevel; label: string; icon: React.ElementType }[] = [
  { mode: "both", icon: Languages, label: "영/한" },
  { mode: "english", icon: CaseSensitive, label: "영어" },
  { mode: "korean", icon: Type, label: "한글" },
];

export function StepShadow() {
  const {
    sentences,
    audioUrl,
    shadowIndex,
    shadowHintLevel,
    shadowPlayCounts,
    shadowComparisonState,
    shadowComparisonResult,
    currentTime,
    stepCompletions,
    questionText,
    questionKorean,
    questionAudioUrl,
    setShadowIndex,
    setShadowHintLevel,
    incrementShadowPlayCount,
    setShadowComparisonState,
    setShadowComparisonResult,
    markStepComplete,
    setStep,
    setCurrentTime,
  } = useShadowingStore();

  // 모바일 여부
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // 녹음 상태
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const karaokeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setTimeout> | null>(null); // 녹음 딜레이 타이머
  const MAX_RECORDING_DURATION = 30;

  // 녹음 결과 (재생용)
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingBlobUrl, setRecordingBlobUrl] = useState<string | null>(null);

  const currentSentence = shadowIndex >= 0 && shadowIndex < sentences.length
    ? sentences[shadowIndex]
    : null;

  const playCount = shadowPlayCounts[shadowIndex] ?? 0;

  // 녹음 정지 (handleSentenceEnd보다 먼저 선언)
  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop(); // timeslice 없이 start()했으므로 stop()만으로 완전한 Blob 생성
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (karaokeTimerRef.current) {
      clearInterval(karaokeTimerRef.current);
      karaokeTimerRef.current = null;
    }
    if (countdownRef.current) {
      clearTimeout(countdownRef.current);
      countdownRef.current = null;
    }
    setIsRecording(false);
  }, []);

  // 문장 재생 완료 → 녹음 준비 또는 녹음 자동 중지
  const handleSentenceEnd = useCallback(() => {
    incrementShadowPlayCount(shadowIndex);

    if (shadowComparisonState === "idle") {
      // 첫 재생 후 녹음 준비 상태로 전환
      setShadowComparisonState("ready_to_record");
    } else if (shadowComparisonState === "recording" && isRecording) {
      // 녹음 중 문장 끝 도달 → 자동 녹음 중지
      stopRecording();
    }
  }, [shadowIndex, incrementShadowPlayCount, shadowComparisonState, setShadowComparisonState, isRecording, stopRecording]);

  // Step 완료 체크
  useEffect(() => {
    if (
      !stepCompletions.shadow &&
      sentences.length > 0 &&
      sentences.every((_, i) => (shadowPlayCounts[i] ?? 0) >= 3)
    ) {
      markStepComplete("shadow");
    }
  }, [shadowPlayCounts, sentences, stepCompletions.shadow, markStepComplete]);

  // 문장 전환 시 비교 상태 리셋
  useEffect(() => {
    setShadowComparisonState("idle");
    setShadowComparisonResult(null);
    if (recordingBlobUrl) URL.revokeObjectURL(recordingBlobUrl);
    setRecordingBlob(null);
    setRecordingBlobUrl(null);
    setRecordingDuration(0);
  }, [shadowIndex, setShadowComparisonState, setShadowComparisonResult]); // eslint-disable-line react-hooks/exhaustive-deps

  // 녹음 시작: 카라오케 즉시 → 0.5초 후 녹음 ON → 카라오케 끝 → 0.5초 후 녹음 OFF
  const RECORD_DELAY = 500; // 카라오케 대비 녹음 시작/종료 딜레이 (ms)

  const startRecording = useCallback(async () => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
    } catch {
      alert("마이크 접근 권한을 허용해주세요.");
      return;
    }

    setShadowComparisonState("recording");

    // 1. 카라오케 즉시 시작
    if (currentSentence) {
      const sentStart = currentSentence.start;
      const sentEnd = currentSentence.end;
      const karaokeStart = Date.now();

      karaokeTimerRef.current = setInterval(() => {
        const elapsed = (Date.now() - karaokeStart) / 1000;
        const simTime = sentStart + elapsed;
        if (simTime >= sentEnd) {
          setCurrentTime(sentEnd);
          if (karaokeTimerRef.current) {
            clearInterval(karaokeTimerRef.current);
            karaokeTimerRef.current = null;
          }
          // 카라오케 끝 → UI 즉시 종료 + 녹음은 0.5초 백그라운드 후 종료
          setIsRecording(false);
          setTimeout(() => {
            const rec = mediaRecorderRef.current;
            if (rec && rec.state !== "inactive") {
              rec.stop();
            }
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
          }, RECORD_DELAY);
        } else {
          setCurrentTime(simTime);
        }
      }, 30);
    }

    // 2. 0.5초 후 녹음 시작
    countdownRef.current = setTimeout(() => {
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      chunksRef.current = [];
      setRecordingDuration(0);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setRecordingBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordingBlobUrl(url);
        setShadowComparisonState("showing_result");
      };

      recorder.start(); // timeslice 없이 — stop() 시 완전한 WebM Blob 생성
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      // 최대 녹음 시간 제한
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRecordingDuration(elapsed);
        if (elapsed >= MAX_RECORDING_DURATION) {
          stopRecording();
        }
      }, 200);
    }, RECORD_DELAY);
  }, [setShadowComparisonState, currentSentence, stopRecording, setCurrentTime]);

  // 정리 — 마이크 스트림 + 타이머 + 카라오케 + 카운트다운
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (karaokeTimerRef.current) clearInterval(karaokeTimerRef.current);
      if (countdownRef.current) clearTimeout(countdownRef.current);
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const goPrev = useCallback(() => {
    if (shadowIndex > 0) setShadowIndex(shadowIndex - 1);
  }, [shadowIndex, setShadowIndex]);

  const goNext = useCallback(() => {
    if (shadowIndex < sentences.length - 1) setShadowIndex(shadowIndex + 1);
  }, [shadowIndex, sentences.length, setShadowIndex]);

  const handleDotClick = useCallback((index: number) => {
    setShadowIndex(index);
  }, [setShadowIndex]);

  const handleRetry = useCallback(() => {
    setShadowComparisonState("ready_to_record");
    setShadowComparisonResult(null);
    if (recordingBlobUrl) URL.revokeObjectURL(recordingBlobUrl);
    setRecordingBlob(null);
    setRecordingBlobUrl(null);
  }, [setShadowComparisonState, setShadowComparisonResult, recordingBlobUrl]);

  const handleNextFromResult = useCallback(() => {
    if (shadowIndex < sentences.length - 1) {
      setShadowIndex(shadowIndex + 1);
    } else {
      setStep("recite");
    }
  }, [shadowIndex, sentences.length, setShadowIndex, setStep]);

  if (!currentSentence) return null;

  // 카라오케: 단어 길이 가중치 기반 하이라이팅
  const words = currentSentence.english.split(" ");
  const isActiveSentence =
    currentTime >= currentSentence.start && currentTime <= currentSentence.end;
  const senProgress = isActiveSentence && currentSentence.duration > 0
    ? Math.max(0, Math.min(1, (currentTime - currentSentence.start) / currentSentence.duration))
    : 0;

  let highlightedCount = 0;
  if (isActiveSentence && senProgress > 0) {
    const charLengths = words.map((w) => w.length);
    const totalChars = charLengths.reduce((a, b) => a + b, 0);
    let accumulated = 0;
    for (const len of charLengths) {
      accumulated += len;
      if (accumulated / totalChars <= senProgress) highlightedCount++;
      else break;
    }
    if (senProgress > 0.02 && highlightedCount === 0) highlightedCount = 1;
  }

  const playCountColor = playCount >= 3 ? "text-green-500" : playCount >= 1 ? "text-amber-500" : "text-foreground-muted/70";
  const isShadowComplete = sentences.length > 0 && sentences.every((_, i) => (shadowPlayCounts[i] ?? 0) >= 3);
  const showComparisonUI = shadowComparisonState !== "idle";

  return (
    <div className="space-y-3 pb-[220px] sm:pb-0">
      {/* 질문 카드 */}
      {questionText && <QuestionCard english={questionText} korean={questionKorean} audioUrl={questionAudioUrl} />}

      {/* 문장 마스터리 도트 네비게이션 */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface px-3 py-2.5">
        <SentenceMasteryDots onDotClick={handleDotClick} />
      </div>

      {/* 문장 카드 */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface">
        {/* 카드 헤더 */}
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-foreground-muted">
              {shadowIndex + 1} / {sentences.length}
            </span>
            <span className={`flex items-center gap-0.5 text-[11px] ${playCountColor}`}>
              {playCount >= 3 ? (
                <Check size={10} strokeWidth={3} />
              ) : (
                <RefreshCw size={10} />
              )}
              {playCount}회
            </span>
          </div>
          <div className="inline-flex rounded-lg border border-border bg-surface-secondary p-0.5">
            {LANG_OPTIONS.map(({ mode, label, icon: Icon }) => (
              <button
                key={mode}
                onClick={() => setShadowHintLevel(mode)}
                className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                  shadowHintLevel === mode
                    ? "bg-surface text-foreground shadow-sm"
                    : "text-foreground-muted hover:text-foreground-secondary"
                }`}
              >
                <Icon size={12} aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 현재 문장 — 카라오케 */}
        <div className="p-5 text-center">
          {(shadowHintLevel === "both" || shadowHintLevel === "english") && (
            <p className="text-lg font-medium leading-relaxed sm:text-xl">
              {words.map((word, i) => (
                <span
                  key={i}
                  className={`transition-colors duration-150 ${
                    i < highlightedCount ? "text-primary-500" : "text-foreground"
                  }`}
                >
                  {word}
                  {i < words.length - 1 ? " " : ""}
                </span>
              ))}
            </p>
          )}
          {(shadowHintLevel === "both" || shadowHintLevel === "korean") && (
            <p
              className={`text-xs leading-relaxed text-foreground-muted ${
                shadowHintLevel === "both"
                  ? "mt-2"
                  : "text-lg font-medium text-foreground sm:text-xl"
              }`}
            >
              {currentSentence.korean}
            </p>
          )}
        </div>

        {/* 플레이어 — 데스크탑 (결과 화면 때만 숨김, 녹음 중에는 카라오케 가이드로 표시) */}
        {!isMobile && shadowComparisonState !== "showing_result" && shadowComparisonState !== "analyzing" && (
          <div className="border-t border-border px-4 py-3 sm:px-5">
            <ShadowingPlayer
              sentenceMode
              sentenceIndex={shadowIndex}
              onSentenceEnd={handleSentenceEnd}
            />
          </div>
        )}

        {/* 녹음 / 분석 / 결과 UI */}
        {showComparisonUI && (
          <div className="border-t border-border px-4 py-5 sm:px-5">
            {/* 녹음 준비 / 녹음 중 */}
            {(shadowComparisonState === "ready_to_record" || shadowComparisonState === "recording") && (
              <div className="flex flex-col items-center gap-4">

                {/* 녹음 대기 */}
                {!isRecording && !karaokeTimerRef.current && (
                  <>
                    <p className="text-sm font-medium text-foreground">이 문장을 따라 말해보세요</p>

                    <button
                      onClick={startRecording}
                      className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-200 transition-all hover:shadow-xl active:scale-95"
                    >
                      <Mic size={24} />
                    </button>

                    <button
                      onClick={() => setShadowComparisonState("idle")}
                      className="text-[11px] text-foreground-muted transition-colors hover:text-foreground-secondary"
                    >
                      건너뛰기
                    </button>
                  </>
                )}

                {/* 녹음 중 (카라오케 진행 중 포함) */}
                {(isRecording || karaokeTimerRef.current) && (
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute inset-0 animate-ping rounded-full bg-red-400/20" style={{ animationDuration: "1.5s" }} />
                      <button
                        onClick={stopRecording}
                        className="relative flex h-11 w-11 items-center justify-center rounded-full bg-red-500 text-white shadow-sm transition-all active:scale-95"
                      >
                        <Square size={16} />
                      </button>
                    </div>
                    <span className="text-xs font-medium text-red-500">녹음 중</span>
                  </div>
                )}
              </div>
            )}

            {/* 녹음 재생 */}
            {shadowComparisonState === "showing_result" && recordingBlobUrl && (
              <div className="flex flex-col items-center gap-4 py-2">
                <p className="text-sm font-medium text-foreground">내 녹음 듣기</p>
                <audio controls src={recordingBlobUrl} className="w-full max-w-xs" />
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleRetry}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary"
                  >
                    <RefreshCw size={14} />
                    다시 녹음
                  </button>
                  <button
                    onClick={handleNextFromResult}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
                  >
                    다음 문장
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 문장 탐색 — 데스크탑 (결과 표시 중엔 숨김) */}
        {shadowComparisonState !== "showing_result" && (
          <div className="hidden items-center justify-center gap-4 border-t border-border px-4 py-2 sm:flex">
            <button
              onClick={goPrev}
              disabled={shadowIndex === 0}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary disabled:opacity-30"
            >
              <ChevronLeft size={16} />
              이전
            </button>
            <button
              onClick={goNext}
              disabled={shadowIndex >= sentences.length - 1}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary disabled:opacity-30"
            >
              다음
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* 완료 시 다음 단계 안내 */}
      {isShadowComplete && (
        <button
          onClick={() => setStep("recite")}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50/50 px-4 py-3 text-sm font-medium text-green-700 transition-colors hover:bg-green-50"
        >
          모든 문장 연습 완료! 구조로 말하기로 이동
          <ChevronRight size={16} />
        </button>
      )}

      {/* 모바일 고정 재생 바 (결과/분석 중 숨김, 녹음 중에는 카라오케 표시) */}
      {isMobile && shadowComparisonState !== "showing_result" && shadowComparisonState !== "analyzing" && (
        <div className="fixed bottom-[68px] left-0 right-0 z-20 border-t border-border bg-surface px-4 py-3">
          <ShadowingPlayer
            sentenceMode
            sentenceIndex={shadowIndex}
            onSentenceEnd={handleSentenceEnd}
          />
        </div>
      )}

      {/* 모바일 고정 하단 바 */}
      {shadowComparisonState !== "showing_result" && (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-surface px-5 py-3 sm:hidden">
          <div className="flex items-center justify-between">
            <button
              onClick={goPrev}
              disabled={shadowIndex === 0}
              className="inline-flex h-11 items-center gap-1 rounded-lg px-4 text-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary disabled:opacity-30"
            >
              <ChevronLeft size={16} />
              이전
            </button>
            <span className="text-xs text-foreground-muted">
              {shadowIndex + 1} / {sentences.length}
            </span>
            <button
              onClick={goNext}
              disabled={shadowIndex >= sentences.length - 1}
              className="inline-flex h-11 items-center gap-1 rounded-lg px-4 text-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary disabled:opacity-30"
            >
              다음
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
