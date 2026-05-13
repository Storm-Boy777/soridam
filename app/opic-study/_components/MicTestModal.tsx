"use client";

/**
 * 마이크 자가 진단 모달 — 본인 마이크 점검 전용 (모의고사 device-test 패턴 BM)
 *
 * 흐름:
 *   ready → recording → recorded(다시 듣기) → 닫기 또는 재녹음
 *
 * 다른 멤버 broadcast / Storage 업로드 없음 — 메모리 상의 Blob URL로만 재생.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Mic,
  Play,
  Square,
  X,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";

const MAX_RECORD_SECONDS = 10;

interface MicTestModalProps {
  open: boolean;
  onClose: () => void;
}

export function MicTestModal({ open, onClose }: MicTestModalProps) {
  if (!open) return null;
  return (
    <PortalShell onClose={onClose}>
      <MicTestBody onClose={onClose} />
    </PortalShell>
  );
}

/* ─── Portal 래퍼 ─── */

function PortalShell({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = orig;
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="bp-scope"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(0, 0, 0, 0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "var(--bp-surface, #ffffff)",
          border: "1px solid var(--bp-line, #E8E6E1)",
          borderRadius: 16,
          width: "100%",
          maxWidth: 460,
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.35)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

/* ─── 본문 ─── */

function MicTestBody({ onClose }: { onClose: () => void }) {
  type Phase = "ready" | "recording" | "recorded" | "failed";
  const [phase, setPhase] = useState<Phase>("ready");
  const [duration, setDuration] = useState(0);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const cleanupAudio = useCallback(() => {
    audioElRef.current?.pause();
    audioElRef.current = null;
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    setErrorMsg(null);
    setDuration(0);
    chunksRef.current = [];
    cleanupAudio();
    setPhase("recording");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const tracks = stream.getAudioTracks();
      if (
        tracks.length === 0 ||
        tracks[0].readyState !== "live" ||
        tracks[0].muted
      ) {
        stream.getTracks().forEach((t) => t.stop());
        setErrorMsg(
          "마이크가 활성 상태가 아니에요. 다른 음성 통화 앱(Discord, 카톡 통화 등)이 실행 중이면 앱을 완전히 종료한 후 다시 시도해 주세요."
        );
        setPhase("failed");
        return;
      }

      const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        if (blob.size < 1000) {
          // 매우 짧은 webm = 사실상 빈 녹음
          setErrorMsg(
            "녹음이 너무 짧아요. 녹음 시작 후 평소 말투로 자유롭게 말씀해 주세요."
          );
          setPhase("failed");
          return;
        }
        setPhase("recorded");
      };
      rec.start();

      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          const next = prev + 1;
          if (next >= MAX_RECORD_SECONDS) {
            try {
              rec.stop();
            } catch {
              /* noop */
            }
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            return MAX_RECORD_SECONDS;
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      const name = (err as { name?: string })?.name;
      let msg = "마이크를 사용할 수 없어요";
      if (name === "NotAllowedError" || name === "SecurityError") {
        msg = "마이크 권한을 허용해 주세요. 브라우저 주소창 좌측 자물쇠 아이콘에서 변경할 수 있어요.";
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        msg = "마이크 디바이스를 찾을 수 없어요. 시스템 설정에서 마이크 연결을 확인해 주세요.";
      } else if (name === "NotReadableError" || name === "TrackStartError") {
        msg = "다른 앱이 마이크를 사용 중이에요. Discord/카톡 통화 등을 완전히 종료한 후 다시 시도해 주세요.";
      }
      setErrorMsg(msg);
      setPhase("failed");
    }
  }, [cleanupAudio]);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        /* noop */
      }
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const togglePreview = useCallback(() => {
    const url = blobUrlRef.current;
    if (!url) return;
    if (!audioElRef.current) {
      const audio = new Audio(url);
      audio.onended = () => setPreviewPlaying(false);
      audio.onerror = () => setPreviewPlaying(false);
      audioElRef.current = audio;
    }
    if (previewPlaying) {
      audioElRef.current.pause();
      setPreviewPlaying(false);
    } else {
      audioElRef.current.currentTime = 0;
      audioElRef.current.play().catch(() => setPreviewPlaying(false));
      setPreviewPlaying(true);
    }
  }, [previewPlaying]);

  const retry = useCallback(() => {
    cleanupAudio();
    setPreviewPlaying(false);
    setDuration(0);
    setErrorMsg(null);
    setPhase("ready");
  }, [cleanupAudio]);

  const handleClose = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        /* noop */
      }
    }
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    cleanupAudio();
    onClose();
  }, [cleanupAudio, onClose]);

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, [cleanupAudio]);

  return (
    <>
      <Header onClose={handleClose} />
      <div style={{ padding: 20 }}>
        {phase === "ready" && <ReadyPanel onStart={startRecording} />}
        {phase === "recording" && (
          <RecordingPanel
            duration={duration}
            max={MAX_RECORD_SECONDS}
            onStop={stopRecording}
          />
        )}
        {phase === "recorded" && (
          <RecordedPanel
            previewPlaying={previewPlaying}
            onTogglePreview={togglePreview}
            onRetry={retry}
            onClose={handleClose}
          />
        )}
        {phase === "failed" && (
          <FailedPanel message={errorMsg} onRetry={retry} />
        )}
      </div>
    </>
  );
}

/* ─── 헤더 ─── */

function Header({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        padding: "16px 20px",
        borderBottom: "1px solid var(--bp-line, #E8E6E1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 800,
          color: "var(--bp-ink, #1A1A2E)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Mic size={18} color="var(--bp-tc, #c96442)" />
        마이크 자가 진단
      </h2>
      <button
        onClick={onClose}
        style={{
          background: "transparent",
          border: 0,
          color: "var(--bp-ink-3, #7a6f63)",
          cursor: "pointer",
          padding: 4,
          display: "flex",
        }}
      >
        <X size={18} />
      </button>
    </div>
  );
}

/* ─── Phase 패널들 ─── */

function ReadyPanel({ onStart }: { onStart: () => void }) {
  return (
    <>
      <p
        style={{
          margin: "0 0 14px",
          fontSize: 13,
          color: "var(--bp-ink-2, #4a4a4a)",
          lineHeight: 1.6,
        }}
      >
        본인 마이크 상태를 점검합니다.
        <br />
        <strong>녹음 시작</strong>을 누르고 평소 말투로 자유롭게 말씀해 주세요.
        <br />
        녹음 후 직접 들어보고 음성이 정상으로 들어왔는지 확인할 수 있어요.
      </p>
      <div
        style={{
          padding: "12px 14px",
          background: "rgba(220, 38, 38, 0.06)",
          border: "1px solid rgba(220, 38, 38, 0.18)",
          borderRadius: 10,
          fontSize: 11,
          color: "rgb(185, 28, 28)",
          marginBottom: 16,
          lineHeight: 1.6,
        }}
      >
        ⚠️ <strong>Discord / 카톡 통화 등 음성 앱은 완전 종료 필수</strong>
        <br />
        <span style={{ color: "var(--bp-ink-2, #4a4a4a)", fontWeight: 500 }}>
          마이크 음소거만으로는 부족합니다. 같은 디바이스의 마이크는 한 번에 한
          앱만 사용 가능해요.
        </span>
      </div>
      <button
        onClick={onStart}
        style={{
          width: "100%",
          padding: "12px 16px",
          background: "var(--bp-tc, #c96442)",
          color: "#fff",
          border: 0,
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 800,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          boxShadow: "0 4px 12px rgba(201, 100, 66, 0.25)",
        }}
      >
        <Mic size={16} />
        녹음 시작
      </button>
    </>
  );
}

function RecordingPanel({
  duration,
  max,
  onStop,
}: {
  duration: number;
  max: number;
  onStop: () => void;
}) {
  const remaining = Math.max(max - duration, 0);
  return (
    <>
      <div
        style={{
          padding: "20px 16px",
          background: "var(--bp-surface-2, #f3f2ef)",
          borderRadius: 12,
          textAlign: "center",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 12px",
            background: "rgba(220, 38, 38, 0.12)",
            border: "1px solid rgba(220, 38, 38, 0.3)",
            borderRadius: 999,
            marginBottom: 12,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: "rgb(220, 38, 38)",
              animation: "mtm-pulse 1s ease-in-out infinite",
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: "rgb(185, 28, 28)",
              letterSpacing: 0.5,
            }}
          >
            REC
          </span>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 850,
            color: "var(--bp-ink, #1A1A2E)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {String(Math.floor(duration / 60)).padStart(1, "0")}:
          {String(duration % 60).padStart(2, "0")}
        </p>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 11,
            color: "var(--bp-ink-3, #7a6f63)",
          }}
        >
          남은 시간 {remaining}초
        </p>
      </div>
      <button
        onClick={onStop}
        style={{
          width: "100%",
          padding: "12px 16px",
          background: "var(--bp-ink, #1A1A2E)",
          color: "#fff",
          border: 0,
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 800,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <Square size={14} fill="currentColor" />
        녹음 중지
      </button>
      <style jsx>{`
        @keyframes mtm-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </>
  );
}

function RecordedPanel({
  previewPlaying,
  onTogglePreview,
  onRetry,
  onClose,
}: {
  previewPlaying: boolean;
  onTogglePreview: () => void;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div
        style={{
          textAlign: "center",
          padding: "8px 0 14px",
        }}
      >
        <CheckCircle2 size={36} color="#4a8e60" style={{ margin: "0 auto" }} />
        <p
          style={{
            margin: "10px 0 4px",
            fontSize: 15,
            fontWeight: 800,
            color: "var(--bp-ink, #1A1A2E)",
          }}
        >
          녹음 완료
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: "var(--bp-ink-2, #4a4a4a)",
            lineHeight: 1.6,
          }}
        >
          본인 녹음을 들어보고 음성이 정상으로 들어왔는지 확인해 주세요.
        </p>
      </div>

      <button
        onClick={onTogglePreview}
        style={{
          width: "100%",
          padding: "12px 16px",
          background: previewPlaying
            ? "var(--bp-tc, #c96442)"
            : "var(--bp-surface-2, #f3f2ef)",
          color: previewPlaying ? "#fff" : "var(--bp-ink, #1A1A2E)",
          border: `1px solid ${
            previewPlaying ? "var(--bp-tc, #c96442)" : "var(--bp-line, #E8E6E1)"
          }`,
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          marginBottom: 12,
        }}
      >
        {previewPlaying ? (
          <>
            <Square size={14} fill="currentColor" />
            정지
          </>
        ) : (
          <>
            <Play size={14} />
            내 녹음 들어보기
          </>
        )}
      </button>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onRetry}
          style={{
            flex: 1,
            padding: "10px 12px",
            background: "transparent",
            color: "var(--bp-ink-2, #4a4a4a)",
            border: "1px solid var(--bp-line, #E8E6E1)",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <RotateCcw size={13} />
          다시 녹음
        </button>
        <button
          onClick={onClose}
          style={{
            flex: 1,
            padding: "10px 12px",
            background: "var(--bp-tc, #c96442)",
            color: "#fff",
            border: 0,
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          닫기
        </button>
      </div>
    </>
  );
}

function FailedPanel({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry: () => void;
}) {
  return (
    <div style={{ textAlign: "center", padding: "12px 0" }}>
      <AlertCircle
        size={44}
        color="rgb(220, 38, 38)"
        style={{ margin: "0 auto" }}
      />
      <h3
        style={{
          margin: "12px 0 6px",
          fontSize: 16,
          fontWeight: 800,
          color: "var(--bp-ink, #1A1A2E)",
        }}
      >
        마이크를 사용할 수 없어요
      </h3>
      <p
        style={{
          margin: "0 0 12px",
          fontSize: 13,
          color: "var(--bp-ink-2, #4a4a4a)",
          lineHeight: 1.6,
        }}
      >
        {message ?? "녹음을 시작할 수 없어요"}
      </p>
      <div
        style={{
          textAlign: "left",
          background: "var(--bp-surface-2, #f3f2ef)",
          borderRadius: 8,
          padding: "12px 14px",
          fontSize: 12,
          color: "var(--bp-ink-2, #4a4a4a)",
          lineHeight: 1.7,
          marginBottom: 16,
        }}
      >
        <strong>다음을 확인해 주세요:</strong>
        <br />
        ① 다른 음성 통화 앱(Discord, 카톡 통화 등)을 <strong>완전히 종료</strong>해 주세요
        <br />
        <span
          style={{
            paddingLeft: 14,
            color: "var(--bp-ink-3, #7a6f63)",
            fontSize: 11,
          }}
        >
          마이크 음소거만으로는 부족합니다.
        </span>
        <br />
        ② 시스템 마이크 권한이 켜져 있는지 확인
        <br />
        <span
          style={{
            paddingLeft: 14,
            color: "var(--bp-ink-3, #7a6f63)",
            fontSize: 11,
          }}
        >
          Windows: 설정 → 개인 정보 보호 → 마이크
          <br />
          Mac: 시스템 환경설정 → 보안 및 개인정보 보호 → 마이크
        </span>
        <br />
        ③ 헤드셋을 사용 중이라면 연결 상태를 확인
      </div>
      <button
        onClick={onRetry}
        style={{
          padding: "10px 28px",
          background: "var(--bp-tc, #c96442)",
          color: "#fff",
          border: 0,
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        다시 시도
      </button>
    </div>
  );
}
