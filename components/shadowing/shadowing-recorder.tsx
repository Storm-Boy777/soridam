"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { Mic, Square, Play, Pause } from "lucide-react";

interface ShadowingRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number) => void;
  isRecording: boolean;
  onRecordingChange: (recording: boolean) => void;
  maxDuration?: number;
  showPlayback?: boolean;
  compact?: boolean; // 소형 버튼, 레이블 숨김
}

export function ShadowingRecorder({
  onRecordingComplete,
  isRecording,
  onRecordingChange,
  maxDuration = 120,
  showPlayback = false,
  compact = false,
}: ShadowingRecorderProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef = useRef(0);
  const cancelledRef = useRef(false); // 레이스컨디션 방지: 녹음 취소 시 onstop 무시
  const [duration, setDuration] = useState(0);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [isPlayingBack, setIsPlayingBack] = useState(false);
  const playbackRef = useRef<HTMLAudioElement | null>(null);
  // 콜백 refs (onstop closure에서 최신 참조)
  const onRecordingCompleteRef = useRef(onRecordingComplete);
  onRecordingCompleteRef.current = onRecordingComplete;

  // 녹음 시작
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      chunksRef.current = [];
      durationRef.current = 0;
      cancelledRef.current = false;
      setDuration(0);
      setPlaybackUrl(null);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        // 스트림 정리
        stream.getTracks().forEach((t) => t.stop());
        // 취소된 녹음이면 상태 업데이트 스킵 (레이스컨디션 방지)
        if (cancelledRef.current) return;
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setPlaybackUrl(url);
        onRecordingCompleteRef.current(blob, durationRef.current);
      };

      recorder.start(100); // 100ms 간격 데이터
      mediaRecorderRef.current = recorder;
      onRecordingChange(true);

      // 타이머 시작
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        durationRef.current = elapsed;
        setDuration(elapsed);
        if (elapsed >= maxDuration) {
          stopRecording();
        }
      }, 200);
    } catch {
      alert("마이크 접근 권한을 허용해주세요.");
    }
  }, [maxDuration, onRecordingChange]);

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
    onRecordingChange(false);
  }, [onRecordingChange]);

  // 정리 (언마운트 시 진행 중 녹음 취소)
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      if (playbackUrl) URL.revokeObjectURL(playbackUrl);
    };
  }, [playbackUrl]);

  // 녹음 재생
  const togglePlayback = useCallback(() => {
    if (!playbackUrl) return;
    if (!playbackRef.current) {
      playbackRef.current = new Audio(playbackUrl);
      playbackRef.current.onended = () => setIsPlayingBack(false);
    }
    if (isPlayingBack) {
      playbackRef.current.pause();
      setIsPlayingBack(false);
    } else {
      playbackRef.current.currentTime = 0;
      playbackRef.current.play();
      setIsPlayingBack(true);
    }
  }, [playbackUrl, isPlayingBack]);

  function formatDuration(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  const btnSize = compact ? "h-11 w-11" : "h-14 w-14";
  const iconSize = compact ? 18 : 22;

  return (
    <div className={`flex ${compact ? "items-center gap-2" : "flex-col items-center gap-3"}`}>
      {/* 녹음 버튼 */}
      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`flex ${btnSize} items-center justify-center rounded-full transition-colors ${
          isRecording
            ? "animate-pulse bg-red-500 text-white"
            : "bg-primary-500 text-white hover:bg-primary-600"
        }`}
      >
        {isRecording ? <Square size={iconSize} /> : <Mic size={iconSize} />}
      </button>

      {/* 녹음 상태 텍스트 — compact 모드에서 숨김 */}
      {!compact && (
        <p
          className={`text-sm font-medium ${
            isRecording ? "text-red-500" : "text-foreground-muted"
          }`}
        >
          {isRecording
            ? `녹음 중 ${formatDuration(duration)}`
            : duration > 0
              ? `${formatDuration(duration)} 녹음됨`
              : "녹음 대기"}
        </p>
      )}

      {/* 녹음 재생 */}
      {showPlayback && playbackUrl && !isRecording && (
        <button
          onClick={togglePlayback}
          className="inline-flex items-center gap-1.5 rounded-lg bg-surface-secondary px-3 py-1.5 text-xs font-medium text-foreground-secondary transition-colors hover:text-foreground"
        >
          {isPlayingBack ? <Pause size={12} /> : <Play size={12} />}
          {isPlayingBack ? "정지" : "녹음 듣기"}
        </button>
      )}
    </div>
  );
}
