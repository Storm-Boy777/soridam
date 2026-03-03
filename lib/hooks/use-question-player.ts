"use client";

import { useState, useCallback, useRef, useEffect } from "react";

// ── 질문 오디오 재생 + 5초 리플레이 윈도우 + 자동 녹음 콜백 ──

interface UseQuestionPlayerOptions {
  replayWindowSeconds?: number; // 리플레이 대기 시간 (기본 5초)
  onPlaybackEnded?: () => void; // 오디오 재생 완료 시 콜백 (자동 녹음용)
}

interface UseQuestionPlayerReturn {
  isPlaying: boolean;
  canReplay: boolean;
  replayCountdown: number;     // 남은 리플레이 대기 시간 (초)
  hasPlayed: boolean;          // 1회 이상 재생 완료 여부
  hasReplayed: boolean;        // 리플레이 사용 여부
  playbackProgress: number;    // 재생 진행률 (0~100)
  play: (audioUrl: string) => void;
  replay: () => void;
  reset: () => void;
}

export function useQuestionPlayer(
  options: UseQuestionPlayerOptions = {}
): UseQuestionPlayerReturn {
  const { replayWindowSeconds = 5 } = options;

  const [isPlaying, setIsPlaying] = useState(false);
  const [canReplay, setCanReplay] = useState(false);
  const [replayCountdown, setReplayCountdown] = useState(0);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [hasReplayed, setHasReplayed] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentUrlRef = useRef<string | null>(null);

  // onPlaybackEnded ref (최신 콜백 항상 참조)
  const onPlaybackEndedRef = useRef(options.onPlaybackEnded);
  useEffect(() => {
    onPlaybackEndedRef.current = options.onPlaybackEnded;
  }, [options.onPlaybackEnded]);

  // 카운트다운 정리
  const clearCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setReplayCountdown(0);
  }, []);

  // 리플레이 카운트다운 시작
  const startReplayWindow = useCallback(() => {
    setCanReplay(true);
    setReplayCountdown(replayWindowSeconds);

    countdownTimerRef.current = setInterval(() => {
      setReplayCountdown((prev) => {
        if (prev <= 1) {
          clearCountdown();
          setCanReplay(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [replayWindowSeconds, clearCountdown]);

  // 재생
  const play = useCallback(
    (audioUrl: string) => {
      // 기존 오디오 정리
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      clearCountdown();
      setPlaybackProgress(0);

      currentUrlRef.current = audioUrl;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => setIsPlaying(true);

      audio.ontimeupdate = () => {
        if (audio.duration) {
          setPlaybackProgress((audio.currentTime / audio.duration) * 100);
        }
      };

      audio.onended = () => {
        setPlaybackProgress(100);
        setIsPlaying(false);
        setHasPlayed(true);
        if (!hasReplayed) {
          startReplayWindow();
        }
        onPlaybackEndedRef.current?.();
      };

      audio.onerror = () => {
        setIsPlaying(false);
      };

      audio.play().catch(() => {
        setIsPlaying(false);
      });
    },
    [hasReplayed, startReplayWindow, clearCountdown]
  );

  // 리플레이 (5초 내 1회만)
  const replay = useCallback(() => {
    if (!canReplay || hasReplayed || !currentUrlRef.current) return;

    clearCountdown();
    setCanReplay(false);
    setHasReplayed(true);
    setPlaybackProgress(0);

    const audio = new Audio(currentUrlRef.current);
    audioRef.current = audio;

    audio.onplay = () => setIsPlaying(true);

    audio.ontimeupdate = () => {
      if (audio.duration) {
        setPlaybackProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    audio.onended = () => {
      setPlaybackProgress(100);
      setIsPlaying(false);
      onPlaybackEndedRef.current?.();
    };

    audio.onerror = () => setIsPlaying(false);

    audio.play().catch(() => setIsPlaying(false));
  }, [canReplay, hasReplayed, clearCountdown]);

  // 다음 문제로 이동 시 리셋
  const reset = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    clearCountdown();
    currentUrlRef.current = null;
    setIsPlaying(false);
    setCanReplay(false);
    setHasPlayed(false);
    setHasReplayed(false);
    setPlaybackProgress(0);
  }, [clearCountdown]);

  // 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  return {
    isPlaying,
    canReplay,
    replayCountdown,
    hasPlayed,
    hasReplayed,
    playbackProgress,
    play,
    replay,
    reset,
  };
}
