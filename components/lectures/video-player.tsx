"use client";

// HLS.js 기반 강의 영상 플레이어
// 권한: get-lecture-playlist EF에서 검증 (admin OR lecture_access)

import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { toast } from "sonner";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { updateLectureProgress } from "@/lib/actions/lectures";

interface VideoPlayerProps {
  lectureId: string;
  lectureTitle?: string;
}

const supabase = createClient();

export function VideoPlayer({ lectureId, lectureTitle }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [bufferedPercentage, setBufferedPercentage] = useState(0);
  const [error, setError] = useState("");

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTouchRef = useRef<number>(0);
  const progressSaveRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<number>(0);

  // ── 플레이어 초기화 ──
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        setIsLoading(true);
        setError("");

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("로그인이 필요합니다");
        }

        // playlist URL 발급 (Edge Function)
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-lecture-playlist`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ lectureId }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "강의를 불러올 수 없습니다");
        }

        const data = await response.json();
        if (!data.playlistUrl) {
          throw new Error("플레이리스트 URL이 반환되지 않았습니다");
        }

        if (cancelled) return;

        const video = videoRef.current;
        if (!video) return;

        if (video.src && video.src.startsWith("blob:")) {
          URL.revokeObjectURL(video.src);
        }
        video.removeAttribute("src");
        video.load();

        // MP4 직접 재생
        if (data.playlistUrl.includes(".mp4")) {
          video.src = data.playlistUrl;
          setIsLoading(false);
          return;
        }

        // HLS 스트리밍
        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 30,
            maxBufferLength: 60,
            maxMaxBufferLength: 120,
            maxBufferSize: 30 * 1000 * 1000,
            xhrSetup: (xhr) => {
              if (session.access_token) {
                xhr.setRequestHeader(
                  "Authorization",
                  `Bearer ${session.access_token}`
                );
              }
            },
          });

          hls.loadSource(data.playlistUrl);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setIsLoading(false);
          });

          hls.on(Hls.Events.ERROR, (_event, errData) => {
            if (errData.details === "bufferFullError") return;
            if (
              errData.details === "bufferStalledError" &&
              videoRef.current
            ) {
              videoRef.current.currentTime =
                videoRef.current.currentTime + 0.1;
              return;
            }

            if (errData.fatal) {
              switch (errData.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  setTimeout(() => hls.startLoad(), 3000);
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  hls.recoverMediaError();
                  break;
                default:
                  setError("재생 중 오류가 발생했습니다. 새로고침해주세요.");
              }
            }
          });

          hlsRef.current = hls;
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          // Safari 네이티브 HLS
          video.src = data.playlistUrl;
          setIsLoading(false);
        } else {
          setError("이 브라우저는 HLS 재생을 지원하지 않습니다");
        }

        // 이전 위치 복원
        if (data.progress?.last_position > 0 && video) {
          video.currentTime = data.progress.last_position;
        }
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "재생 오류";
        setError(msg);
        toast.error(msg);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    init();

    return () => {
      cancelled = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (progressSaveRef.current) clearInterval(progressSaveRef.current);
    };
  }, [lectureId]);

  // ── 진도 자동 저장 (10초마다, 변경 시에만) ──
  useEffect(() => {
    progressSaveRef.current = setInterval(() => {
      const video = videoRef.current;
      if (!video || !video.duration || video.paused) return;
      const pos = Math.floor(video.currentTime);
      if (Math.abs(pos - lastSavedRef.current) < 5) return;
      lastSavedRef.current = pos;
      updateLectureProgress({
        lectureId,
        lastPosition: pos,
        watchedSeconds: pos,
        totalSeconds: Math.floor(video.duration),
        playbackSpeed,
      }).catch(() => {});
    }, 10_000);

    return () => {
      if (progressSaveRef.current) clearInterval(progressSaveRef.current);
    };
  }, [lectureId, playbackSpeed]);

  // ── 컨트롤 ──
  const togglePlayPause = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (video.paused) {
        await video.play();
        setIsPlaying(true);
      } else {
        video.pause();
        setIsPlaying(false);
      }
    } catch (err) {
      const e = err as Error;
      if (e.name !== "AbortError") {
        setError("영상 재생 중 오류가 발생했습니다");
      }
    }
  }, []);

  const skipForward = () => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = Math.min(video.currentTime + 5, video.duration);
    }
  };

  const skipBackward = () => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = Math.max(video.currentTime - 5, 0);
    }
  };

  const handleVolumeChange = (value: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = value;
    setVolume(value);
    setIsMuted(value === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isMuted) {
      video.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      try {
        await containerRef.current?.requestFullscreen();
        const isMobile =
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
          ) || window.innerWidth <= 768;
        if (
          isMobile &&
          screen.orientation &&
          typeof (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock === "function"
        ) {
          await (screen.orientation as ScreenOrientation & { lock: (o: string) => Promise<void> })
            .lock("landscape")
            .catch(() => {});
        }
      } catch {
        toast.error("전체화면 전환에 실패했습니다");
      }
    } else {
      await document.exitFullscreen();
    }
  };

  const changePlaybackSpeed = (speed: number) => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = speed;
      setPlaybackSpeed(speed);
      setShowSettings(false);
    }
  };

  const handleShowControls = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      const video = videoRef.current;
      if (video && !video.paused) setShowControls(false);
    }, 3000);
  }, []);

  const handleTouch = useCallback(() => {
    lastTouchRef.current = Date.now();
    handleShowControls();
  }, [handleShowControls]);

  const handleMouseMove = useCallback(() => {
    if (Date.now() - lastTouchRef.current > 500) handleShowControls();
  }, [handleShowControls]);

  const handleMouseLeave = useCallback(() => {
    if (Date.now() - lastTouchRef.current < 1000) return;
    if (isPlaying) setShowControls(false);
  }, [isPlaying]);

  const formatTime = (s: number) => {
    if (!s || isNaN(s) || !isFinite(s)) return "0:00";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    video.currentTime = (x / rect.width) * video.duration;
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    setDuration(video.duration);
    if (video.buffered.length > 0 && video.duration > 0) {
      const buffered = video.buffered.end(video.buffered.length - 1);
      setBufferedPercentage((buffered / video.duration) * 100);
    }
  };

  // ── 키보드 단축키 ──
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).tagName === "INPUT" ||
        (e.target as HTMLElement).tagName === "TEXTAREA"
      )
        return;

      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        togglePlayPause();
        return;
      }

      const k = e.key.toLowerCase();
      switch (k) {
        case "arrowleft":
          e.preventDefault();
          skipBackward();
          break;
        case "arrowright":
          e.preventDefault();
          skipForward();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [togglePlayPause]);

  // ── fullscreen change 감지 ──
  useEffect(() => {
    const handleFsChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
        if (
          screen.orientation &&
          typeof (screen.orientation as ScreenOrientation & { unlock?: () => void }).unlock === "function"
        ) {
          try {
            (screen.orientation as ScreenOrientation & { unlock: () => void }).unlock();
          } catch {}
        }
      } else {
        setIsFullscreen(true);
      }
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  if (error && !isLoading) {
    return (
      <div className="flex aspect-video items-center justify-center bg-foreground">
        <div className="text-center">
          <div className="mb-4 text-4xl">⚠️</div>
          <p className="mb-3 text-lg text-white">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-[var(--radius-md)] bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="group relative aspect-video w-full overflow-hidden rounded-[var(--radius-xl)] bg-black"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchEnd={handleTouch}
    >
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80">
          <div className="text-center">
            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary-400" />
            <p className="text-sm text-white">강의를 불러오는 중…</p>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        className="h-full w-full bg-black"
        style={{ objectFit: isFullscreen ? "contain" : "cover" }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          const v = videoRef.current;
          if (v) {
            setDuration(v.duration);
            v.playbackRate = playbackSpeed;
          }
        }}
        onClick={(e) => {
          e.stopPropagation();
          togglePlayPause();
          handleShowControls();
        }}
        playsInline
      />

      {/* 컨트롤 오버레이 */}
      <div
        className={`absolute inset-0 z-10 bg-gradient-to-t from-black/90 via-transparent to-black/50 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {/* 상단 타이틀 */}
        <div className="absolute left-0 right-0 top-0 p-4">
          <h2 className="text-sm font-medium text-white drop-shadow-md md:text-lg">
            {lectureTitle}
          </h2>
        </div>

        {/* 중앙 컨트롤 */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="pointer-events-auto flex items-center gap-8 md:gap-16">
            <button
              onClick={(e) => {
                e.stopPropagation();
                skipBackward();
                handleShowControls();
              }}
              className="active:scale-95"
              aria-label="5초 뒤로"
            >
              <div className="p-2 md:p-4">
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-7 w-7 text-white drop-shadow-lg md:h-10 md:w-10"
                >
                  <path d="M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
                  <text x="12" y="16" fontSize="10" fontWeight="bold" textAnchor="middle">
                    5
                  </text>
                </svg>
              </div>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlayPause();
                handleShowControls();
              }}
              className="rounded-full bg-black/30 p-3 backdrop-blur-sm transition-all hover:bg-black/50 active:scale-95 md:p-5"
              aria-label={isPlaying ? "일시정지" : "재생"}
            >
              {isPlaying ? (
                <Pause className="h-8 w-8 text-white drop-shadow-lg md:h-12 md:w-12" />
              ) : (
                <Play className="ml-0.5 h-8 w-8 text-white drop-shadow-lg md:ml-1 md:h-12 md:w-12" />
              )}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                skipForward();
                handleShowControls();
              }}
              className="active:scale-95"
              aria-label="5초 앞으로"
            >
              <div className="p-2 md:p-4">
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-7 w-7 text-white drop-shadow-lg md:h-10 md:w-10"
                >
                  <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z" />
                  <text x="12" y="16" fontSize="10" fontWeight="bold" textAnchor="middle">
                    5
                  </text>
                </svg>
              </div>
            </button>
          </div>
        </div>

        {/* 하단 컨트롤 */}
        <div className="absolute bottom-0 left-0 right-0 p-2 md:p-4">
          {/* 프로그레스 바 */}
          <div className="mb-1 md:mb-2">
            <div
              className="group/progress relative h-1 cursor-pointer rounded-full bg-white/30"
              onClick={handleProgressClick}
            >
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-white/20"
                style={{ width: `${bufferedPercentage}%` }}
              />
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-primary-500 transition-colors group-hover/progress:bg-primary-400"
                style={{
                  width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                }}
              >
                <div className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 translate-x-1/2 rounded-full bg-white opacity-0 transition-opacity group-hover/progress:opacity-100" />
              </div>
            </div>
            <div className="mt-0.5 flex justify-between text-[10px] text-white/70 md:mt-1 md:text-xs">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* 버튼 행 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-4">
              <button
                onClick={togglePlayPause}
                className="rounded p-1 text-white transition-colors hover:bg-white/10 hover:text-primary-400 active:scale-95"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5 md:h-6 md:w-6" />
                ) : (
                  <Play className="h-5 w-5 md:h-6 md:w-6" />
                )}
              </button>

              <div className="group/volume hidden items-center gap-2 md:flex">
                <button
                  onClick={toggleMute}
                  className="rounded p-1 text-white transition-colors hover:bg-white/10 hover:text-primary-400"
                >
                  {isMuted ? (
                    <VolumeX className="h-6 w-6" />
                  ) : (
                    <Volume2 className="h-6 w-6" />
                  )}
                </button>
                <div className="w-0 overflow-hidden transition-all group-hover/volume:w-20">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={isMuted ? 0 : volume}
                    onChange={(e) =>
                      handleVolumeChange(parseFloat(e.target.value))
                    }
                    className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/30"
                  />
                </div>
              </div>

              <div className="text-xs text-white md:text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <div className="relative">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="rounded p-1.5 text-white transition-colors hover:bg-white/10 hover:text-primary-400 active:scale-95 md:p-2"
                  aria-label="설정"
                >
                  <Settings className="h-4 w-4 md:h-5 md:w-5" />
                </button>

                {showSettings && (
                  <div className="absolute bottom-full right-0 mb-2 min-w-[140px] rounded-lg border border-white/10 bg-foreground/95 p-2 shadow-xl backdrop-blur-sm md:min-w-[160px] md:p-3">
                    <div className="mb-1 text-xs text-white/60 md:mb-2">
                      재생 속도
                    </div>
                    {[0.75, 1.0, 1.25, 1.5].map((s) => (
                      <button
                        key={s}
                        onClick={() => changePlaybackSpeed(s)}
                        className={`block w-full rounded px-2 py-1 text-left text-xs transition-colors hover:bg-white/10 md:px-3 md:text-sm ${
                          playbackSpeed === s
                            ? "text-primary-400"
                            : "text-white"
                        }`}
                      >
                        {s.toFixed(2)}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={toggleFullscreen}
                className="rounded p-1.5 text-white transition-colors hover:bg-white/10 hover:text-primary-400 active:scale-95 md:p-2"
                aria-label={isFullscreen ? "전체화면 종료" : "전체화면"}
              >
                {isFullscreen ? (
                  <Minimize className="h-4 w-4 md:h-5 md:w-5" />
                ) : (
                  <Maximize className="h-4 w-4 md:h-5 md:w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
