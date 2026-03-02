"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Volume2,
  Mic,
  MicOff,
  CheckCircle2,
  Play,
  Square,
  Loader2,
} from "lucide-react";

interface DeviceTestProps {
  onComplete: () => void;
  onBack: () => void;
}

export function DeviceTest({ onComplete, onBack }: DeviceTestProps) {
  const [step, setStep] = useState<"speaker" | "mic">("speaker");
  const [speakerOk, setSpeakerOk] = useState(false);
  const [micOk, setMicOk] = useState(false);
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
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

  // 스피커 테스트 오디오 재생
  const playTestAudio = useCallback(() => {
    setIsPlayingTest(true);
    // 간단한 비프 사운드 생성 (외부 파일 불필요)
    const audioCtx = new AudioContext();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.frequency.value = 440; // A4 음
    gainNode.gain.value = 0.3;
    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      audioCtx.close();
      setIsPlayingTest(false);
    }, 1500);
  }, []);

  // 마이크 녹음 시작
  const startRecording = useCallback(async () => {
    try {
      setMicError(null);
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
        const avg = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
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
        stream.getTracks().forEach((t) => t.stop());
        audioCtx.close();
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        setVolume(0);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

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
    audio.onended = () => setIsPlayingRecording(false);
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

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* 단계 인디케이터 */}
      <div className="flex items-center justify-center gap-3">
        {[
          { key: "speaker", label: "스피커", done: speakerOk },
          { key: "mic", label: "마이크", done: micOk },
        ].map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                s.done
                  ? "bg-green-100 text-green-600"
                  : step === s.key
                    ? "bg-primary-100 text-primary-600"
                    : "bg-surface-secondary text-foreground-muted"
              }`}
            >
              {s.done ? <CheckCircle2 size={14} /> : i + 1}
            </div>
            <span
              className={`text-sm ${
                step === s.key
                  ? "font-medium text-foreground"
                  : "text-foreground-muted"
              }`}
            >
              {s.label}
            </span>
            {i === 0 && (
              <div className="mx-2 h-px w-8 bg-border" />
            )}
          </div>
        ))}
      </div>

      {/* 스피커 테스트 */}
      {step === "speaker" && (
        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center gap-2">
            <Volume2 size={18} className="text-primary-500" />
            <h3 className="font-semibold text-foreground">스피커 테스트</h3>
          </div>

          <div className="mt-6 flex flex-col items-center gap-4">
            <button
              onClick={playTestAudio}
              disabled={isPlayingTest}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg transition-transform hover:scale-105 disabled:opacity-50"
            >
              {isPlayingTest ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <Play size={24} className="ml-1" />
              )}
            </button>
            <p className="text-sm text-foreground-secondary">
              {isPlayingTest
                ? "소리를 재생 중입니다..."
                : "버튼을 눌러 소리를 확인하세요"}
            </p>

            <button
              onClick={() => {
                setSpeakerOk(true);
                setStep("mic");
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100"
            >
              <CheckCircle2 size={14} />
              소리가 잘 들립니다
            </button>
          </div>
        </div>
      )}

      {/* 마이크 테스트 */}
      {step === "mic" && (
        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center gap-2">
            <Mic size={18} className="text-primary-500" />
            <h3 className="font-semibold text-foreground">마이크 테스트</h3>
          </div>

          {micError && (
            <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              <MicOff size={14} className="mr-1 inline" />
              {micError}
            </div>
          )}

          <div className="mt-6 flex flex-col items-center gap-4">
            {/* 녹음 버튼 */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 ${
                isRecording
                  ? "animate-pulse bg-accent-500"
                  : "bg-primary-500"
              }`}
            >
              {isRecording ? <Square size={24} /> : <Mic size={24} />}
            </button>

            {/* 볼륨 바 */}
            {isRecording && (
              <div className="flex w-48 items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-secondary">
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

            <p className="text-sm text-foreground-secondary">
              {isRecording
                ? "말해보세요... (최대 10초)"
                : hasRecording
                  ? "녹음이 완료되었습니다"
                  : "버튼을 눌러 녹음을 시작하세요"}
            </p>

            {/* 녹음 재생 */}
            {hasRecording && !isRecording && (
              <button
                onClick={playRecording}
                disabled={isPlayingRecording}
                className="inline-flex items-center gap-1.5 rounded-lg bg-surface-secondary px-4 py-2 text-sm font-medium text-foreground-secondary hover:bg-border"
              >
                <Play size={14} />
                {isPlayingRecording ? "재생 중..." : "녹음 재생 확인"}
              </button>
            )}

            {hasRecording && !isRecording && (
              <button
                onClick={() => setMicOk(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100"
              >
                <CheckCircle2 size={14} />
                마이크가 잘 작동합니다
              </button>
            )}
          </div>
        </div>
      )}

      {/* 하단 버튼 */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground-secondary hover:bg-surface-secondary"
        >
          ← 돌아가기
        </button>

        {speakerOk && micOk && (
          <button
            onClick={onComplete}
            className="rounded-lg bg-primary-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600"
          >
            시험 시작 →
          </button>
        )}
      </div>
    </div>
  );
}
