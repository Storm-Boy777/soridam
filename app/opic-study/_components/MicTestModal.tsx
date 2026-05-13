"use client";

/**
 * 마이크 자가 진단 모달
 *
 * 두 가지 모드:
 *  - tester   : 본인 마이크 테스트 (녹음 → 다시 듣기 → broadcast → 다른 멤버 응답)
 *  - listener : 다른 멤버 음성 자동 재생 → ✅/❌ 응답
 *
 * 모의고사 device-test 패턴 BM:
 *   Start Recording → Stop Recording (또는 자동 5초) → Play Recording → 다른 멤버 응답
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Mic,
  MicOff,
  Square,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Play,
} from "lucide-react";

const MAX_RECORD_SECONDS = 10;

export interface MicTestResponse {
  fromUserId: string;
  fromName: string;
  result: "ok" | "fail";
}

export interface MemberMicStatus {
  userId: string;
  name: string;
  initial: string;
  colorKey: "a" | "b" | "c" | "d";
  status: "untested" | "ok" | "failed";
  isMe: boolean;
}

interface TesterProps {
  mode: "tester";
  open: boolean;
  onClose: () => void;
  uploadBlob: (blob: Blob) => Promise<string>;
  broadcastRequest: (audioUrl: string) => void;
  responses: MicTestResponse[];
  onPassed: () => void;
  memberStatuses?: MemberMicStatus[];
}

interface ListenerProps {
  mode: "listener";
  open: boolean;
  onClose: () => void;
  testerName: string;
  audioUrl: string;
  onSubmitResponse: (result: "ok" | "fail") => void;
}

/** Portal 래퍼 — 부모의 transform/contain 영향 차단 + backdrop이 정상 작동 */
function PortalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    // body 스크롤 잠금
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
          maxWidth: 480,
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

export function MicTestModal(props: TesterProps | ListenerProps) {
  if (!props.open) return null;
  return (
    <PortalShell onClose={props.onClose}>
      {props.mode === "tester" ? <TesterBody {...props} /> : <ListenerBody {...props} />}
    </PortalShell>
  );
}

/* ─── Tester 모드 ─── */

function TesterBody({
  onClose,
  uploadBlob,
  broadcastRequest,
  responses,
  onPassed,
  memberStatuses,
}: TesterProps) {
  type Phase = "ready" | "recording" | "stopped" | "uploading" | "waiting" | "passed" | "failed";
  const [phase, setPhase] = useState<Phase>("ready");
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null); // 본인 다시 듣기용 blob URL
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null); // signed URL (broadcast 후)
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  // 녹음 시작
  const startRecording = useCallback(async () => {
    setErrorMsg(null);
    setDuration(0);
    chunksRef.current = [];
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
      if (tracks.length === 0 || tracks[0].readyState !== "live" || tracks[0].muted) {
        stream.getTracks().forEach((t) => t.stop());
        setErrorMsg(
          "마이크가 활성 상태가 아니에요. 다른 앱이 마이크를 사용 중이거나, 시스템 권한을 확인해 주세요."
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
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        // 업로드 + broadcast
        uploadAndBroadcast(blob);
        // stream 정리
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      rec.start();

      // 카운트다운 타이머 (최대 MAX_RECORD_SECONDS)
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
        msg = "마이크 권한을 허용해 주세요";
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        msg = "마이크 디바이스를 찾을 수 없어요";
      } else if (name === "NotReadableError" || name === "TrackStartError") {
        msg = "다른 앱이 마이크를 사용 중이에요. 해당 앱을 종료 후 다시 시도해 주세요";
      }
      setErrorMsg(msg);
      setPhase("failed");
    }
  }, [audioUrl, chunksRef, mediaRecorderRef, streamRef, timerRef]);

  // 업로드 + broadcast
  const uploadAndBroadcast = useCallback(
    async (blob: Blob) => {
      setPhase("uploading");
      try {
        const url = await uploadBlob(blob);
        setUploadedUrl(url);
        broadcastRequest(url);
        setPhase("waiting");
      } catch {
        setErrorMsg("업로드에 실패했어요. 네트워크 상태를 확인해 주세요.");
        setPhase("failed");
      }
    },
    [uploadBlob, broadcastRequest]
  );

  // 수동 녹음 중지
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
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
  }, [mediaRecorderRef, timerRef]);

  // 본인 다시 듣기
  const togglePreview = useCallback(() => {
    const targetUrl = audioUrl;
    if (!targetUrl) return;
    if (!audioElRef.current) {
      const audio = new Audio(targetUrl);
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
  }, [audioUrl, audioElRef, previewPlaying]);

  // 1명 이상 ✅ → passed
  useEffect(() => {
    if (phase !== "waiting") return;
    const okCount = responses.filter((r) => r.result === "ok").length;
    if (okCount >= 1) {
      setPhase("passed");
      onPassed();
    }
  }, [phase, responses, onPassed]);

  // 재시도
  const retry = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setUploadedUrl(null);
    setPreviewPlaying(false);
    audioElRef.current?.pause();
    audioElRef.current = null;
    setDuration(0);
    setErrorMsg(null);
    setPhase("ready");
  }, [audioUrl, audioElRef]);

  // close 처리
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
    audioElRef.current?.pause();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    onClose();
  }, [audioUrl, audioElRef, mediaRecorderRef, streamRef, timerRef, onClose]);

  // unmount cleanup (uploadedUrl 변수 사용 보장)
  useEffect(() => {
    return () => {
      audioElRef.current?.pause();
    };
  }, [audioElRef]);
  // uploadedUrl은 broadcast 후 보관 (재시도 시점에 새 URL 받음). 별도 cleanup 불필요.
  void uploadedUrl;

  return (
    <>
      {/* 헤더 */}
      <Header onClose={handleClose} title="마이크 자가 진단" />

      {/* 멤버 status 패널 */}
      {memberStatuses && memberStatuses.length > 0 && (
        <MemberStatusPanel statuses={memberStatuses} />
      )}

      {/* 본문 */}
      <div style={{ padding: 20 }}>
        {phase === "ready" && (
          <ReadyPanel onStart={startRecording} />
        )}

        {phase === "recording" && (
          <RecordingPanel
            duration={duration}
            max={MAX_RECORD_SECONDS}
            onStop={stopRecording}
          />
        )}

        {phase === "uploading" && <UploadingPanel />}

        {phase === "waiting" && (
          <WaitingPanel
            previewPlaying={previewPlaying}
            onTogglePreview={togglePreview}
            responses={responses}
            onRetry={retry}
          />
        )}

        {phase === "passed" && (
          <PassedPanel onClose={handleClose} />
        )}

        {phase === "failed" && (
          <FailedPanel message={errorMsg} onRetry={retry} />
        )}
      </div>
    </>
  );
}

/* ─── Listener 모드 ─── */

function ListenerBody({ onClose, testerName, audioUrl, onSubmitResponse }: ListenerProps) {
  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(false);
  const [responded, setResponded] = useState(false);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioElRef.current = audio;
    audio.onplay = () => setPlaying(true);
    audio.onended = () => {
      setPlaying(false);
      setPlayed(true);
    };
    audio.onerror = () => setPlaying(false);
    audio.play().catch(() => setPlaying(false));
    return () => {
      audio.pause();
      audioElRef.current = null;
    };
  }, [audioUrl]);

  const togglePlay = useCallback(() => {
    if (!audioElRef.current) return;
    if (playing) {
      audioElRef.current.pause();
      setPlaying(false);
    } else {
      audioElRef.current.currentTime = 0;
      audioElRef.current.play().catch(() => setPlaying(false));
    }
  }, [playing]);

  const respond = useCallback(
    (result: "ok" | "fail") => {
      setResponded(true);
      onSubmitResponse(result);
      setTimeout(() => onClose(), 500);
    },
    [onSubmitResponse, onClose]
  );

  return (
    <>
      <Header onClose={onClose} title={`${testerName}님 마이크 테스트`} />
      <div style={{ padding: 20 }}>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--bp-ink-2, #4a4a4a)", lineHeight: 1.6 }}>
          <strong>{testerName}</strong>님의 마이크 녹음이 잘 들리는지 확인해 주세요.
        </p>
        <button
          onClick={togglePlay}
          style={{
            width: "100%",
            padding: "12px 16px",
            background: playing ? "var(--bp-tc, #c96442)" : "var(--bp-surface-2, #f3f2ef)",
            color: playing ? "#fff" : "var(--bp-ink, #1A1A2E)",
            border: `1px solid ${playing ? "var(--bp-tc, #c96442)" : "var(--bp-line, #E8E6E1)"}`,
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginBottom: 16,
          }}
        >
          {playing ? (
            <>
              <Square size={16} fill="currentColor" />
              재생 중...
            </>
          ) : played ? (
            <>
              <Play size={16} />
              다시 듣기
            </>
          ) : (
            <>
              <Play size={16} />
              재생
            </>
          )}
        </button>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => respond("ok")}
            disabled={responded}
            style={{
              flex: 1,
              padding: "12px 16px",
              background: responded ? "var(--bp-surface-2, #f3f2ef)" : "#4a8e60",
              color: "#fff",
              border: 0,
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 800,
              cursor: responded ? "default" : "pointer",
              opacity: responded ? 0.6 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <CheckCircle2 size={16} />
            잘 들려요
          </button>
          <button
            onClick={() => respond("fail")}
            disabled={responded}
            style={{
              flex: 1,
              padding: "12px 16px",
              background: responded ? "var(--bp-surface-2, #f3f2ef)" : "rgb(220, 38, 38)",
              color: "#fff",
              border: 0,
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 800,
              cursor: responded ? "default" : "pointer",
              opacity: responded ? 0.6 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <MicOff size={16} />
            안 들려요
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── 공용 헤더 ─── */

function Header({ onClose, title }: { onClose: () => void; title: string }) {
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
        {title}
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
          margin: "0 0 12px",
          fontSize: 13,
          color: "var(--bp-ink-2, #4a4a4a)",
          lineHeight: 1.6,
        }}
      >
        실제 답변과 동일한 흐름으로 진행돼요.
        <br />
        <strong>녹음 시작</strong>을 누르고 평소 말투로 자유롭게 말씀해 주세요.
        <br />
        녹음이 끝나면 본인이 들어보고, 다른 멤버들도 자동으로 받아 확인할 수 있어요.
      </p>
      <div
        style={{
          padding: "10px 12px",
          background: "var(--bp-surface-2, #f3f2ef)",
          borderRadius: 8,
          fontSize: 11,
          color: "var(--bp-ink-3, #7a6f63)",
          marginBottom: 16,
          lineHeight: 1.5,
        }}
      >
        💡 예시 — &ldquo;안녕하세요, 마이크 테스트입니다. 잘 들리시나요?&rdquo;
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
              animation: "pulse 1s ease-in-out infinite",
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
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </>
  );
}

function UploadingPanel() {
  return (
    <div style={{ textAlign: "center", padding: "24px 0" }}>
      <Loader2
        size={32}
        className="animate-spin"
        style={{ color: "var(--bp-tc, #c96442)", margin: "0 auto" }}
      />
      <p
        style={{
          margin: "12px 0 0",
          fontSize: 13,
          color: "var(--bp-ink-2, #4a4a4a)",
        }}
      >
        업로드 중...
      </p>
    </div>
  );
}

function WaitingPanel({
  previewPlaying,
  onTogglePreview,
  responses,
  onRetry,
}: {
  previewPlaying: boolean;
  onTogglePreview: () => void;
  responses: MicTestResponse[];
  onRetry: () => void;
}) {
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
        📡 다른 멤버들에게 전송됐어요. 본인 녹음도 확인해 보세요.
      </p>
      <button
        onClick={onTogglePreview}
        style={{
          width: "100%",
          padding: "10px 12px",
          background: previewPlaying ? "var(--bp-tc, #c96442)" : "var(--bp-surface-2, #f3f2ef)",
          color: previewPlaying ? "#fff" : "var(--bp-ink, #1A1A2E)",
          border: `1px solid ${previewPlaying ? "var(--bp-tc, #c96442)" : "var(--bp-line, #E8E6E1)"}`,
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          marginBottom: 14,
        }}
      >
        {previewPlaying ? <Square size={13} fill="currentColor" /> : <Play size={13} />}
        {previewPlaying ? "정지" : "내 녹음 들어보기"}
      </button>

      <div
        style={{
          padding: 12,
          background: "var(--bp-surface-2, #f3f2ef)",
          borderRadius: 8,
          marginBottom: 14,
        }}
      >
        <p
          style={{
            margin: "0 0 8px",
            fontSize: 11,
            fontWeight: 800,
            color: "var(--bp-ink-3, #7a6f63)",
            letterSpacing: 0.5,
            textTransform: "uppercase",
          }}
        >
          멤버 응답 ({responses.length})
        </p>
        {responses.length === 0 ? (
          <p style={{ margin: 0, fontSize: 12, color: "var(--bp-ink-3, #7a6f63)" }}>
            ⏳ 아직 응답 없음
          </p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
            {responses.map((r, i) => (
              <li
                key={`${r.fromUserId}-${i}`}
                style={{ fontSize: 12, color: "var(--bp-ink-2, #4a4a4a)" }}
              >
                {r.result === "ok" ? "✅" : "❌"} <strong>{r.fromName}</strong> · {r.result === "ok" ? "잘 들려요" : "안 들려요"}
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={onRetry}
        style={{
          width: "100%",
          padding: "8px 12px",
          background: "transparent",
          color: "var(--bp-ink-3, #7a6f63)",
          border: "1px solid var(--bp-line, #E8E6E1)",
          borderRadius: 8,
          fontSize: 11,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        다시 녹음
      </button>
    </>
  );
}

function PassedPanel({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "12px 0" }}>
      <CheckCircle2 size={48} color="#4a8e60" style={{ margin: "0 auto" }} />
      <h3
        style={{
          margin: "12px 0 6px",
          fontSize: 16,
          fontWeight: 800,
          color: "var(--bp-ink, #1A1A2E)",
        }}
      >
        마이크 정상
      </h3>
      <p
        style={{
          margin: 0,
          fontSize: 13,
          color: "var(--bp-ink-2, #4a4a4a)",
        }}
      >
        답변할 준비가 됐어요!
      </p>
      <button
        onClick={onClose}
        style={{
          marginTop: 16,
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
        닫기
      </button>
    </div>
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
      <AlertCircle size={48} color="rgb(220, 38, 38)" style={{ margin: "0 auto" }} />
      <h3
        style={{
          margin: "12px 0 6px",
          fontSize: 16,
          fontWeight: 800,
          color: "var(--bp-ink, #1A1A2E)",
        }}
      >
        마이크 문제가 감지됐어요
      </h3>
      <p
        style={{
          margin: "0 0 12px",
          fontSize: 13,
          color: "var(--bp-ink-2, #4a4a4a)",
          lineHeight: 1.6,
        }}
      >
        {message ?? "녹음에 문제가 있었어요"}
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
        ✓ 다른 앱(Discord, 카톡 통화 등)이 마이크를 사용 중인가요?
        <br />
        ✓ 시스템 마이크 권한이 켜져 있나요?
        <br />
        <span style={{ paddingLeft: 14, color: "var(--bp-ink-3, #7a6f63)", fontSize: 11 }}>
          Windows: 설정 → 개인 정보 보호 → 마이크
          <br />
          Mac: 시스템 환경설정 → 보안 및 개인정보 보호 → 마이크
        </span>
        <br />
        ✓ 헤드셋을 사용 중이라면 연결 상태를 확인해 주세요
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

/* ─── 멤버 status 패널 ─── */

const MEMBER_COLOR_BG: Record<"a" | "b" | "c" | "d", string> = {
  a: "var(--bp-mb-a, #c96442)",
  b: "var(--bp-mb-b, #5a8f9c)",
  c: "var(--bp-mb-c, #a48121)",
  d: "var(--bp-mb-d, #6b6390)",
};

function MemberStatusPanel({ statuses }: { statuses: MemberMicStatus[] }) {
  const okCount = statuses.filter((s) => s.status === "ok").length;
  const total = statuses.length;
  const allOk = okCount === total;

  return (
    <div
      style={{
        padding: "10px 20px",
        background: allOk
          ? "rgba(45, 122, 61, 0.06)"
          : "var(--bp-surface-2, #f3f2ef)",
        borderBottom: "1px solid var(--bp-line, #E8E6E1)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 0.5,
            color: "var(--bp-ink-3, #7a6f63)",
            textTransform: "uppercase",
          }}
        >
          멤버 마이크 상태
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: allOk ? "#2d7a3d" : "var(--bp-ink-2, #4a4a4a)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {okCount}/{total} 통과
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {statuses.map((m) => {
          const icon =
            m.status === "ok" ? "✓" : m.status === "failed" ? "⚠" : "⏳";
          const tint =
            m.status === "ok"
              ? "rgba(74, 142, 96, 0.12)"
              : m.status === "failed"
                ? "rgba(220, 38, 38, 0.10)"
                : "var(--bp-surface, #ffffff)";
          const border =
            m.status === "ok"
              ? "rgba(74, 142, 96, 0.35)"
              : m.status === "failed"
                ? "rgba(220, 38, 38, 0.30)"
                : "var(--bp-line, #E8E6E1)";
          const textColor =
            m.status === "ok"
              ? "#2d7a3d"
              : m.status === "failed"
                ? "rgb(185, 28, 28)"
                : "var(--bp-ink-2, #4a4a4a)";
          return (
            <span
              key={m.userId}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 8px",
                background: tint,
                border: `1px solid ${border}`,
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                color: textColor,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 16,
                  height: 16,
                  borderRadius: 999,
                  background: MEMBER_COLOR_BG[m.colorKey],
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {m.initial}
              </span>
              <span>{m.name}</span>
              {m.isMe && (
                <span style={{ fontSize: 9, opacity: 0.7, fontWeight: 600 }}>
                  (나)
                </span>
              )}
              <span style={{ fontSize: 10, fontWeight: 800 }}>{icon}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
