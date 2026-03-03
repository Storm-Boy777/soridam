"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import {
  Mic,
  Play,
  Square,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

interface DeviceTestProps {
  onComplete: () => void;
  onBack: () => void;
}

export function DeviceTest({ onComplete, onBack }: DeviceTestProps) {
  // 스피커 테스트
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [speakerOk, setSpeakerOk] = useState(false);

  // 마이크 테스트
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [micOk, setMicOk] = useState(false);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [volume, setVolume] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingUrlRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // 스피커 테스트 — AVA 음성 재생
  const playTestAudio = useCallback(() => {
    setIsPlayingTest(true);
    const audio = new Audio(
      "https://rwdsyqnrrpwkureqfxwb.supabase.co/storage/v1/object/public/audio-recordings/questions/SPK_SYS_SYS_UNK_01.wav"
    );
    audio.onended = () => {
      setIsPlayingTest(false);
      setSpeakerOk(true);
    };
    audio.onerror = () => {
      setIsPlayingTest(false);
      setSpeakerOk(true);
    };
    audio.play().catch(() => {
      setIsPlayingTest(false);
    });
  }, []);

  // 마이크 녹음 시작
  const startRecording = useCallback(async () => {
    try {
      setMicError(null);
      setMicOk(false);
      setHasRecording(false);
      setRecordingDuration(0);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });

      // 볼륨 분석
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg =
          dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
        setVolume(avg / 255);
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (recordingUrlRef.current) {
          URL.revokeObjectURL(recordingUrlRef.current);
        }
        recordingUrlRef.current = URL.createObjectURL(blob);
        setHasRecording(true);
        setMicOk(false);
        stream.getTracks().forEach((t) => t.stop());
        audioCtx.close();
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        setVolume(0);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);

      // 타이머 (최대 10초)
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev >= 10) {
            mediaRecorder.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
            return 10;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      setMicError("마이크 권한을 허용해주세요");
    }
  }, []);

  // 녹음 중지
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, []);

  // 녹음 재생
  const playRecording = useCallback(() => {
    if (!recordingUrlRef.current) return;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(recordingUrlRef.current);
    audioRef.current = audio;
    setIsPlayingRecording(true);
    audio.onended = () => {
      setIsPlayingRecording(false);
      setMicOk(true);
    };
    audio.play();
  }, []);

  // 클린업
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
      audioRef.current?.pause();
    };
  }, []);

  const allTestsComplete = speakerOk && micOk;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:py-12">
      {/* 타이틀 */}
      <div className="mb-6 border-b border-border pb-4 lg:mb-8 lg:pb-6">
        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">
          Pre-Test Setup
        </h1>
      </div>

      {/* 메인 2열 레이아웃 */}
      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-2 lg:gap-16">
        {/* 왼쪽: AVA 캐릭터 + Play 버튼 */}
        <div className="flex flex-col items-center gap-6 lg:justify-center">
          <div className="relative mx-auto h-48 w-48 lg:h-64 lg:w-64">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-300/20 to-secondary-300/20 blur-xl" />
            <div className="relative h-full w-full overflow-hidden rounded-3xl shadow-2xl">
              <Image
                src="/images/ava-avatar-new.png"
                alt="AVA 시험관"
                width={256}
                height={256}
                className="h-full w-full object-cover"
                priority
                unoptimized
              />
            </div>
          </div>

          {/* Play 버튼 (스피커 테스트) */}
          <button
            onClick={playTestAudio}
            disabled={isPlayingTest}
            className="flex w-32 items-center justify-center gap-2 rounded-xl bg-primary-500 py-3 font-semibold text-white shadow-lg transition-all hover:bg-primary-600 hover:shadow-xl disabled:opacity-60 lg:py-4"
          >
            {isPlayingTest ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Play size={18} className="ml-0.5" />
            )}
            Play
          </button>

          {speakerOk && (
            <p className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle2 size={14} />
              스피커 확인 완료
            </p>
          )}
        </div>

        {/* 오른쪽: 3단계 안내 + 버튼 영역 */}
        <div className="flex flex-col gap-5 lg:gap-6">
          {/* 3단계 안내 */}
          {[
            {
              num: "1",
              text: "Play 아이콘(▶)을 눌러 질문을 듣고 재생 음량을 조정하십시오.",
            },
            {
              num: "2",
              text: "마이크 점검을 위해 Start Recording을 누르고 답변 후 Stop Recording을 눌러 녹음을 마칩니다.",
            },
            {
              num: "3",
              text: "Play Recording을 눌러 음성이 정상 녹음되었는지 확인하십시오.",
            },
          ].map((step) => (
            <div key={step.num} className="flex items-center gap-3 lg:gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-50 lg:h-12 lg:w-12">
                <span className="text-lg font-bold text-primary-500 lg:text-xl">
                  {step.num}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-foreground lg:text-base">
                {step.text}
              </p>
            </div>
          ))}

          {/* 마이크 에러 */}
          {micError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              <AlertCircle size={14} className="mr-1 inline" />
              {micError}
            </div>
          )}

          {/* 버튼 영역 */}
          <div className="rounded-2xl border border-border bg-surface-secondary p-4 lg:p-6">
            <div className="mb-4 flex gap-3 lg:mb-6 lg:gap-4">
              {/* Start Recording / Stop / Re-record */}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`relative flex flex-1 items-center justify-center gap-1.5 overflow-hidden rounded-xl py-3 text-sm font-semibold transition-all lg:gap-2 lg:py-4 lg:text-base ${
                  isRecording
                    ? "bg-foreground text-white"
                    : "bg-primary-500 text-white shadow-lg hover:bg-primary-600 hover:shadow-xl"
                }`}
              >
                {/* 녹음 진행률 배경 */}
                {isRecording && (
                  <div
                    className="absolute inset-0 bg-accent-500/30 transition-all duration-1000 ease-linear"
                    style={{ width: `${(recordingDuration / 10) * 100}%` }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5 lg:gap-2">
                  {isRecording ? (
                    <>
                      <Square size={18} />
                      Stop Recording ({10 - recordingDuration}s)
                    </>
                  ) : hasRecording ? (
                    <>
                      <Mic size={18} />
                      Re-record
                    </>
                  ) : (
                    <>
                      <Mic size={18} />
                      Start Recording
                    </>
                  )}
                </span>
              </button>

              {/* Play Recording */}
              <button
                onClick={playRecording}
                disabled={!hasRecording || isPlayingRecording}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-semibold transition-all lg:gap-2 lg:py-4 lg:text-base ${
                  !hasRecording || isPlayingRecording
                    ? "cursor-not-allowed bg-primary-100 text-primary-500/50"
                    : "bg-primary-100 text-primary-500 shadow hover:bg-primary-200 hover:shadow-lg"
                }`}
              >
                <Play size={18} />
                Play Recording
              </button>
            </div>

            {/* 볼륨 바 */}
            {isRecording && (
              <div className="mb-4 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
                  <div
                    className="h-full rounded-full bg-primary-500 transition-all"
                    style={{ width: `${Math.min(volume * 100, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-foreground-muted">
                  {recordingDuration}초
                </span>
              </div>
            )}

            {/* 상태 메시지 */}
            <div className="py-2 text-center">
              {allTestsComplete ? (
                <div className="flex flex-col items-center gap-1.5 text-green-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} />
                    <span className="font-semibold">
                      장비 테스트가 완료되었습니다!
                    </span>
                  </div>
                  <span className="text-sm text-foreground-secondary">
                    Next 버튼을 눌러 모의고사를 시작해주세요.
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-amber-600">
                  <AlertCircle size={18} />
                  <span className="font-semibold">
                    스피커와 마이크 테스트를 진행해주세요
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 하단 버튼 */}
          <div className="flex justify-between">
            <button
              onClick={onBack}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground-secondary hover:bg-surface-secondary"
            >
              ← 돌아가기
            </button>

            <button
              onClick={onComplete}
              disabled={!allTestsComplete}
              className="flex items-center gap-2 rounded-lg bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-40 lg:px-10 lg:py-3"
            >
              Next
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
