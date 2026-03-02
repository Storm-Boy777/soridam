"use client";

import { useState, useCallback, useRef, useEffect } from "react";

// ── 녹음 상태 ──

export type RecordingState =
  | "idle"       // 대기
  | "recording"  // 녹음 중
  | "stopped";   // 녹음 완료 (업로드 전)

// ── 녹음 품질 피드백 (UX 2-3) ──

export type VolumeWarning = "none" | "silent" | "too_quiet" | "time_warning";

interface UseRecorderOptions {
  maxDuration?: number;      // 최대 녹음 시간 (초, 기본 240 = 4분)
  minDuration?: number;      // 최소 녹음 시간 (초, 기본 1)
  silenceThreshold?: number; // 무음 감지 임계값 (0~1, 기본 0.02)
  silenceTimeout?: number;   // 무음 경고까지 시간 (초, 기본 3)
  lowVolumeThreshold?: number; // 낮은 볼륨 임계값 (0~1, 기본 0.08)
  timeWarningAt?: number;    // 종료 경고 시점 (남은 초, 기본 30)
}

interface UseRecorderReturn {
  state: RecordingState;
  volume: number;            // 0~1 실시간 볼륨
  duration: number;          // 녹음 경과 시간 (초)
  remainingTime: number;     // 남은 시간 (초, maxDuration 기준)
  warning: VolumeWarning;
  warningMessage: string | null;
  audioBlob: Blob | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  reset: () => void;
  error: string | null;
}

export function useRecorder(options: UseRecorderOptions = {}): UseRecorderReturn {
  const {
    maxDuration = 240,
    minDuration = 1,
    silenceThreshold = 0.02,
    silenceTimeout = 3,
    lowVolumeThreshold = 0.08,
    timeWarningAt = 30,
  } = options;

  const [state, setState] = useState<RecordingState>("idle");
  const [volume, setVolume] = useState(0);
  const [duration, setDuration] = useState(0);
  const [warning, setWarning] = useState<VolumeWarning>("none");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  // refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  // reset() 호출 시 onstop 핸들러 무시 (비동기 레이스 컨디션 방지)
  const cancelledRef = useRef(false);

  // 무음 감지 (UX 2-3)
  const silenceStartRef = useRef<number | null>(null);

  // 볼륨 분석 + 경고 판정
  const updateVolume = useCallback(() => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    const avg = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
    const normalizedVolume = avg / 255;
    setVolume(normalizedVolume);

    // 무음 감지
    if (normalizedVolume < silenceThreshold) {
      if (!silenceStartRef.current) {
        silenceStartRef.current = Date.now();
      } else {
        const silenceDuration = (Date.now() - silenceStartRef.current) / 1000;
        if (silenceDuration >= silenceTimeout) {
          setWarning("silent");
        }
      }
    } else {
      silenceStartRef.current = null;
      // 낮은 볼륨 경고
      if (normalizedVolume < lowVolumeThreshold) {
        setWarning("too_quiet");
      } else {
        setWarning("none");
      }
    }

    animFrameRef.current = requestAnimationFrame(updateVolume);
  }, [silenceThreshold, silenceTimeout, lowVolumeThreshold]);

  // 녹음 시작
  const startRecording = useCallback(async () => {
    try {
      cancelledRef.current = false;
      setError(null);
      setAudioBlob(null);
      setWarning("none");
      silenceStartRef.current = null;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      // Web Audio API 볼륨 분석
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // 볼륨 업데이트 시작
      updateVolume();

      // MediaRecorder
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        // reset()에서 stop한 경우 무시 (비동기 레이스 컨디션 방지)
        if (cancelledRef.current) return;
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setState("stopped");
      };

      mediaRecorderRef.current = recorder;
      startTimeRef.current = Date.now();
      recorder.start();
      setState("recording");

      // 녹음 시간 타이머
      setDuration(0);
      durationTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);

        // 4분 임박 경고 (UX 2-3)
        const remaining = maxDuration - elapsed;
        if (remaining <= timeWarningAt && remaining > 0) {
          setWarning("time_warning");
        }

        // 최대 녹음 시간 자동 중지
        if (elapsed >= maxDuration) {
          recorder.stop();
          cleanup();
        }
      }, 1000);
    } catch {
      setError("마이크 권한을 허용해주세요");
    }
  }, [maxDuration, timeWarningAt, updateVolume]);

  // 녹음 중지
  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current || state !== "recording") return;

    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    if (elapsed < minDuration) {
      setError(`최소 ${minDuration}초 이상 녹음해야 합니다`);
      return;
    }

    mediaRecorderRef.current.stop();
    cleanup();
  }, [state, minDuration]);

  // 리소스 정리
  const cleanup = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setVolume(0);
    setWarning("none");
  }, []);

  // 초기화 (다시듣기, 다음문제 전환 시 사용)
  const reset = useCallback(() => {
    cancelledRef.current = true; // onstop 비동기 핸들러 무시
    if (state === "recording") {
      mediaRecorderRef.current?.stop();
      cleanup();
    }
    mediaRecorderRef.current = null;
    setState("idle");
    setDuration(0);
    setVolume(0);
    setWarning("none");
    setAudioBlob(null);
    setError(null);
  }, [state, cleanup]);

  // 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // 경고 메시지 계산
  const warningMessage = (() => {
    switch (warning) {
      case "silent":
        return "마이크를 확인해주세요";
      case "too_quiet":
        return "좀 더 크게 말해주세요";
      case "time_warning": {
        const remaining = maxDuration - duration;
        return `녹음 종료 ${remaining}초 전`;
      }
      default:
        return null;
    }
  })();

  return {
    state,
    volume,
    duration,
    remainingTime: Math.max(maxDuration - duration, 0),
    warning,
    warningMessage,
    audioBlob,
    startRecording,
    stopRecording,
    reset,
    error,
  };
}
