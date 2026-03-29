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
  Loader2,
} from "lucide-react";
import { ShadowingPlayer } from "./shadowing-player";
import { SentenceMasteryDots } from "./sentence-mastery-dots";
import { SentenceComparisonResult } from "./sentence-comparison-result";
import { useShadowingStore, type TextHintLevel } from "@/lib/stores/shadowing";
import { extractSegment, blobToPCM } from "@/lib/audio/audio-segment";
import { extractPitch, type PitchFrame } from "@/lib/audio/pitch-extractor";
import { extractMFCC } from "@/lib/audio/mfcc";
import { dtw } from "@/lib/audio/dtw";
import { scorePronunciation } from "@/lib/audio/pronunciation-scorer";

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
    setShadowIndex,
    setShadowHintLevel,
    incrementShadowPlayCount,
    setShadowComparisonState,
    setShadowComparisonResult,
    markStepComplete,
    setStep,
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
  const abortRef = useRef<AbortController | null>(null);
  const MAX_RECORDING_DURATION = 30; // 문장 단위 최대 30초

  // 분석 결과 캐시
  const [nativePitchData, setNativePitchData] = useState<PitchFrame[] | null>(null);
  const [userPitchData, setUserPitchData] = useState<PitchFrame[] | null>(null);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);

  const currentSentence = shadowIndex >= 0 && shadowIndex < sentences.length
    ? sentences[shadowIndex]
    : null;

  const playCount = shadowPlayCounts[shadowIndex] ?? 0;

  // 문장 재생 완료 → 녹음 준비 상태로 전환
  const handleSentenceEnd = useCallback(() => {
    incrementShadowPlayCount(shadowIndex);
    // 첫 재생 후 녹음 준비 상태로 전환
    if (shadowComparisonState === "idle") {
      setShadowComparisonState("ready_to_record");
    }
  }, [shadowIndex, incrementShadowPlayCount, shadowComparisonState, setShadowComparisonState]);

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
    setNativePitchData(null);
    setUserPitchData(null);
    setRecordingBlob(null);
    setRecordingDuration(0);
  }, [shadowIndex, setShadowComparisonState, setShadowComparisonResult]);

  // 녹음 시작
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
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

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setRecordingBlob(blob);
        await analyzeRecording(blob);
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setShadowComparisonState("recording");

      // 타이머 + 최대 시간 제한
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRecordingDuration(elapsed);
        if (elapsed >= MAX_RECORDING_DURATION) {
          stopRecording();
        }
      }, 200);
    } catch {
      alert("마이크 접근 권한을 허용해주세요.");
    }
  }, [setShadowComparisonState]);

  // 녹음 정지
  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  }, []);

  // 녹음 분석 — AbortController로 경합 조건 방지
  const analyzeRecording = useCallback(async (blob: Blob) => {
    if (!currentSentence || !audioUrl) return;

    // 이전 분석 취소
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setShadowComparisonState("analyzing");

    try {
      // 1. 원어민 오디오 구간 추출 + 피치 분석
      const nativeSegment = await extractSegment(
        audioUrl,
        currentSentence.start,
        currentSentence.end,
        shadowIndex,
      );
      if (controller.signal.aborted) return;

      const nativePitch = extractPitch(nativeSegment.pcm, nativeSegment.sampleRate);
      const nativeMFCC = extractMFCC(nativeSegment.pcm, nativeSegment.sampleRate);

      // 2. 사용자 녹음 PCM 변환 + 피치 + MFCC 분석
      const userSegment = await blobToPCM(blob);
      if (controller.signal.aborted) return;

      const userPitch = extractPitch(userSegment.pcm, userSegment.sampleRate);
      const userMFCC = extractMFCC(userSegment.pcm, userSegment.sampleRate);

      // 3. F0 배열 추출 (DTW 입력)
      const nativeF0 = nativePitch.map((f) => f.f0);
      const userF0 = userPitch.map((f) => f.f0);

      // 4. DTW 정렬
      const dtwResult = dtw(nativeF0, userF0);
      if (controller.signal.aborted) return;

      // 5. 점수 계산 (MFCC 포함)
      const score = scorePronunciation(nativePitch, userPitch, dtwResult, nativeMFCC, userMFCC);

      // 결과 저장
      setNativePitchData(nativePitch);
      setUserPitchData(userPitch);
      setShadowComparisonResult(score);
      setShadowComparisonState("showing_result");
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error("발음 분석 실패:", err);
      setShadowComparisonState("ready_to_record");
    }
  }, [currentSentence, audioUrl, shadowIndex, setShadowComparisonState, setShadowComparisonResult]);

  // 정리 — 마이크 스트림 + 타이머 + 분석 취소
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      abortRef.current?.abort();
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
    setNativePitchData(null);
    setUserPitchData(null);
  }, [setShadowComparisonState, setShadowComparisonResult]);

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

        {/* 플레이어 — 데스크탑 (비교 UI가 아닐 때만) */}
        {!isMobile && shadowComparisonState !== "showing_result" && (
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
            {/* 녹음 준비 or 녹음 중 */}
            {(shadowComparisonState === "ready_to_record" || shadowComparisonState === "recording") && (
              <div className="flex flex-col items-center gap-4">
                {/* 안내 텍스트 */}
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    {isRecording ? "듣고 있어요..." : "이 문장을 따라 말해보세요"}
                  </p>
                  {isRecording && (
                    <p className="mt-1 text-xs tabular-nums text-red-500">{recordingDuration}초 / {MAX_RECORDING_DURATION}초</p>
                  )}
                </div>

                {/* 녹음 버튼 — 링 애니메이션 */}
                <div className="relative">
                  {isRecording && (
                    <>
                      <div className="absolute inset-0 animate-ping rounded-full bg-red-400/20" style={{ animationDuration: "1.5s" }} />
                      <div className="absolute -inset-2 animate-pulse rounded-full border-2 border-red-300/40" />
                    </>
                  )}
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`relative flex h-16 w-16 items-center justify-center rounded-full shadow-lg transition-all active:scale-95 ${
                      isRecording
                        ? "bg-red-500 text-white shadow-red-200"
                        : "bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-primary-200 hover:shadow-xl"
                    }`}
                  >
                    {isRecording ? <Square size={22} /> : <Mic size={24} />}
                  </button>
                </div>

                {/* 녹음 중일 때 타이머 바 */}
                {isRecording && (
                  <div className="h-1 w-32 overflow-hidden rounded-full bg-surface-secondary">
                    <div
                      className="h-1 rounded-full bg-red-500 transition-all duration-200"
                      style={{ width: `${(recordingDuration / MAX_RECORDING_DURATION) * 100}%` }}
                    />
                  </div>
                )}

                {!isRecording && (
                  <button
                    onClick={() => setShadowComparisonState("idle")}
                    className="text-[11px] text-foreground-muted transition-colors hover:text-foreground-secondary"
                  >
                    건너뛰기
                  </button>
                )}
              </div>
            )}

            {/* 분석 중 */}
            {shadowComparisonState === "analyzing" && (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="relative">
                  <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-surface-secondary border-t-primary-500" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">발음 분석 중</p>
                  <p className="mt-0.5 text-[11px] text-foreground-muted">피치와 억양을 비교하고 있어요</p>
                </div>
              </div>
            )}

            {/* 결과 표시 */}
            {shadowComparisonState === "showing_result" && shadowComparisonResult && nativePitchData && userPitchData && (
              <SentenceComparisonResult
                sentenceIndex={shadowIndex}
                totalSentences={sentences.length}
                score={shadowComparisonResult}
                nativePitch={nativePitchData}
                userPitch={userPitchData}
                recordingBlob={recordingBlob}
                nativeAudioUrl={audioUrl}
                sentenceStart={currentSentence?.start}
                sentenceEnd={currentSentence?.end}
                onRetry={handleRetry}
                onNext={handleNextFromResult}
              />
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

      {/* 모바일 고정 재생 바 */}
      {isMobile && shadowComparisonState !== "showing_result" && (
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
