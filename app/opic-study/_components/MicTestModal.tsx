"use client";

/**
 * 마이크 자가 진단 모달
 *
 * 두 가지 모드:
 *  - tester   : 본인 마이크 테스트 (5초 녹음 → 업로드 → broadcast → 응답 대기)
 *  - listener : 다른 멤버 음성 자동 재생 → ✅/❌ 응답
 *
 * 단순 볼륨 측정은 거짓 양/음성 가능 → 실제 녹음 + 다른 멤버 청취 = end-to-end 검증.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, X, CheckCircle2, AlertCircle, Loader2, Play, Pause } from "lucide-react";
import { useRecorder } from "@/lib/hooks/use-recorder";

const RECORD_SECONDS = 5;

export interface MicTestResponse {
  fromUserId: string;
  fromName: string;
  result: "ok" | "fail";
}

interface TesterProps {
  mode: "tester";
  open: boolean;
  onClose: () => void;
  /** webm Blob → 업로드 → signed URL 반환 */
  uploadBlob: (blob: Blob) => Promise<string>;
  /** 업로드 완료 후 broadcast 요청 */
  broadcastRequest: (audioUrl: string) => void;
  /** 다른 멤버 응답들 (실시간 누적) */
  responses: MicTestResponse[];
  /** 본인 통과 처리 콜백 (1명 이상 ✅) */
  onPassed: () => void;
}

interface ListenerProps {
  mode: "listener";
  open: boolean;
  onClose: () => void;
  testerName: string;
  audioUrl: string;
  onSubmitResponse: (result: "ok" | "fail") => void;
}

export function MicTestModal(props: TesterProps | ListenerProps) {
  if (!props.open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div
        style={{
          background: "var(--bp-surface)",
          border: "1px solid var(--bp-line)",
          borderRadius: 16,
          width: "100%",
          maxWidth: 460,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {props.mode === "tester" ? <TesterBody {...props} /> : <ListenerBody {...props} />}
      </div>
    </div>
  );
}

/* ─── Tester 모드 ─── */

function TesterBody({
  onClose,
  uploadBlob,
  broadcastRequest,
  responses,
  onPassed,
}: TesterProps) {
  type Phase = "ready" | "recording" | "uploading" | "waiting" | "passed" | "failed";
  const [phase, setPhase] = useState<Phase>("ready");
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const previewRef = useRef<HTMLAudioElement | null>(null);

  const recorder = useRecorder({
    maxDuration: RECORD_SECONDS,
    minDuration: 1,
    validateOnStop: false, // 모달은 직접 검사
  });

  // 녹음 완료 시 자동 업로드
  useEffect(() => {
    if (recorder.state !== "stopped") return;
    if (!recorder.audioBlob) return;
    if (phase !== "recording") return;

    // 무음 webm 사전 차단
    if (recorder.audioBlob.size < 5000 || recorder.avgVolume < 0.01) {
      setPhase("failed");
      return;
    }

    setPhase("uploading");
    uploadBlob(recorder.audioBlob)
      .then((url) => {
        setUploadedUrl(url);
        broadcastRequest(url);
        setPhase("waiting");
      })
      .catch(() => setPhase("failed"));
  }, [recorder.state, recorder.audioBlob, recorder.avgVolume, phase, uploadBlob, broadcastRequest]);

  // 1명 이상 ✅ → 통과
  useEffect(() => {
    if (phase !== "waiting") return;
    const okCount = responses.filter((r) => r.result === "ok").length;
    if (okCount >= 1) {
      setPhase("passed");
      onPassed();
    }
  }, [phase, responses, onPassed]);

  const startRecording = useCallback(async () => {
    setPhase("recording");
    await recorder.startRecording();
  }, [recorder]);

  const stopRecording = useCallback(() => {
    recorder.stopRecording();
  }, [recorder]);

  // recorder.error 처리
  useEffect(() => {
    if (recorder.errorCode && phase === "recording") {
      setPhase("failed");
    }
  }, [recorder.errorCode, phase]);

  const togglePreview = useCallback(() => {
    if (!uploadedUrl) return;
    if (!previewRef.current) {
      const audio = new Audio(uploadedUrl);
      audio.onended = () => setPreviewPlaying(false);
      previewRef.current = audio;
    }
    if (previewPlaying) {
      previewRef.current.pause();
      setPreviewPlaying(false);
    } else {
      previewRef.current.play().catch(() => setPreviewPlaying(false));
      setPreviewPlaying(true);
    }
  }, [uploadedUrl, previewPlaying]);

  // cleanup
  useEffect(() => {
    return () => {
      previewRef.current?.pause();
      previewRef.current = null;
    };
  }, []);

  const handleClose = useCallback(() => {
    recorder.reset();
    previewRef.current?.pause();
    onClose();
  }, [recorder, onClose]);

  const retry = useCallback(() => {
    recorder.reset();
    setUploadedUrl(null);
    setPreviewPlaying(false);
    setPhase("ready");
  }, [recorder]);

  return (
    <>
      {/* 헤더 */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--bp-line)",
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
            color: "var(--bp-ink)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Mic size={18} color="var(--bp-tc)" />
          마이크 자가 진단
        </h2>
        <button
          onClick={handleClose}
          style={{
            background: "transparent",
            border: 0,
            color: "var(--bp-ink-3)",
            cursor: "pointer",
            padding: 4,
            display: "flex",
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* 본문 */}
      <div style={{ padding: 20 }}>
        {phase === "ready" && (
          <>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--bp-ink-2)", lineHeight: 1.6 }}>
              실제 답변과 동일한 흐름으로 진행됩니다.
              <br />
              <strong>5초 동안</strong> 평소 말투로 자유롭게 말씀해 주세요.
              <br />
              녹음이 끝나면 다른 멤버들에게 자동으로 전송되어 들어볼 수 있어요.
            </p>
            <div
              style={{
                padding: "10px 12px",
                background: "var(--bp-surface-2)",
                borderRadius: 8,
                fontSize: 11,
                color: "var(--bp-ink-3)",
                marginBottom: 16,
                lineHeight: 1.5,
              }}
            >
              💡 예시 — &ldquo;안녕하세요, 마이크 테스트입니다. 잘 들리시나요?&rdquo;
            </div>
            <button
              onClick={startRecording}
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "var(--bp-tc)",
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
              }}
            >
              <Mic size={16} />
              녹음 시작
            </button>
          </>
        )}

        {phase === "recording" && (
          <>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--bp-ink-2)", textAlign: "center" }}>
              녹음 중... <strong>{recorder.duration}초 / {RECORD_SECONDS}초</strong>
            </p>
            <VolumeBar volume={recorder.volume} />
            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
              <button
                onClick={stopRecording}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  background: "var(--bp-surface-2)",
                  color: "var(--bp-ink)",
                  border: "1px solid var(--bp-line)",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                녹음 중지
              </button>
            </div>
            {recorder.warning === "silent" && (
              <p
                style={{
                  margin: "12px 0 0",
                  padding: "8px 10px",
                  background: "rgba(220, 38, 38, 0.08)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "rgb(185, 28, 28)",
                  textAlign: "center",
                }}
              >
                ⚠ 마이크에서 소리가 거의 들리지 않아요
              </p>
            )}
          </>
        )}

        {phase === "uploading" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <Loader2 size={28} className="animate-spin" style={{ color: "var(--bp-tc)", margin: "0 auto" }} />
            <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--bp-ink-2)" }}>
              업로드 중...
            </p>
          </div>
        )}

        {phase === "waiting" && (
          <>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--bp-ink-2)", lineHeight: 1.6 }}>
              📡 다른 멤버들에게 전송됐어요. 들으시는 분의 응답을 기다리는 중...
            </p>
            <button
              onClick={togglePreview}
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "var(--bp-surface-2)",
                color: "var(--bp-ink-2)",
                border: "1px solid var(--bp-line)",
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
              {previewPlaying ? <Pause size={13} /> : <Play size={13} />}
              내 녹음 다시 듣기
            </button>

            <div
              style={{
                padding: "12px",
                background: "var(--bp-surface-2)",
                borderRadius: 8,
              }}
            >
              <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 800, color: "var(--bp-ink-3)", letterSpacing: 0.5, textTransform: "uppercase" }}>
                멤버 응답 ({responses.length})
              </p>
              {responses.length === 0 ? (
                <p style={{ margin: 0, fontSize: 12, color: "var(--bp-ink-3)" }}>
                  ⏳ 아직 응답 없음
                </p>
              ) : (
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                  {responses.map((r, i) => (
                    <li key={`${r.fromUserId}-${i}`} style={{ fontSize: 12, color: "var(--bp-ink-2)" }}>
                      {r.result === "ok" ? "✅" : "❌"} <strong>{r.fromName}</strong> · {r.result === "ok" ? "잘 들려요" : "안 들려요"}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p style={{ margin: "12px 0 0", fontSize: 11, color: "var(--bp-ink-3)", textAlign: "center" }}>
              한 명 이상이 ✅ 응답하면 통과 처리돼요
            </p>
          </>
        )}

        {phase === "passed" && (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <CheckCircle2 size={48} color="#4a8e60" style={{ margin: "0 auto" }} />
            <h3 style={{ margin: "12px 0 6px", fontSize: 16, fontWeight: 800, color: "var(--bp-ink)" }}>
              마이크 정상
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--bp-ink-2)" }}>
              답변할 준비가 됐어요!
            </p>
            <button
              onClick={handleClose}
              style={{
                marginTop: 16,
                padding: "10px 24px",
                background: "var(--bp-tc)",
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
        )}

        {phase === "failed" && (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <AlertCircle size={48} color="rgb(220, 38, 38)" style={{ margin: "0 auto" }} />
            <h3 style={{ margin: "12px 0 6px", fontSize: 16, fontWeight: 800, color: "var(--bp-ink)" }}>
              마이크 문제가 감지됐어요
            </h3>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--bp-ink-2)", lineHeight: 1.6 }}>
              {recorder.error ?? "녹음에 음성이 거의 들어오지 않았어요"}
            </p>
            <div
              style={{
                textAlign: "left",
                background: "var(--bp-surface-2)",
                borderRadius: 8,
                padding: "12px 14px",
                fontSize: 12,
                color: "var(--bp-ink-2)",
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
              <span style={{ paddingLeft: 14, color: "var(--bp-ink-3)", fontSize: 11 }}>
                Windows: 설정 → 개인 정보 보호 → 마이크
                <br />
                Mac: 시스템 환경설정 → 보안 및 개인정보 보호 → 마이크
              </span>
              <br />
              ✓ 헤드셋을 사용 중이라면 연결 상태를 확인해 주세요
            </div>
            <button
              onClick={retry}
              style={{
                padding: "10px 24px",
                background: "var(--bp-tc)",
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 모달 열림과 동시에 자동 재생
  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.onplay = () => setPlaying(true);
    audio.onended = () => {
      setPlaying(false);
      setPlayed(true);
    };
    audio.onerror = () => setPlaying(false);
    audio.play().catch(() => {
      // autoplay 차단 — 사용자 클릭으로 재생
      setPlaying(false);
    });
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [audioUrl]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => setPlaying(false));
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
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--bp-line)",
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
            color: "var(--bp-ink)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Mic size={18} color="var(--bp-tc)" />
          {testerName}님 마이크 테스트
        </h2>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: 0,
            color: "var(--bp-ink-3)",
            cursor: "pointer",
            padding: 4,
            display: "flex",
          }}
        >
          <X size={18} />
        </button>
      </div>

      <div style={{ padding: 20 }}>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--bp-ink-2)", lineHeight: 1.6 }}>
          <strong>{testerName}</strong>님의 마이크 녹음이 잘 들리는지 확인해 주세요.
        </p>

        <button
          onClick={togglePlay}
          style={{
            width: "100%",
            padding: "12px 16px",
            background: playing ? "var(--bp-tc)" : "var(--bp-surface-2)",
            color: playing ? "#fff" : "var(--bp-ink)",
            border: `1px solid ${playing ? "var(--bp-tc)" : "var(--bp-line)"}`,
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
              <Pause size={16} />
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
              background: responded ? "var(--bp-surface-2)" : "#4a8e60",
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
              background: responded ? "var(--bp-surface-2)" : "rgb(220, 38, 38)",
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

/* ─── 볼륨 바 ─── */

function VolumeBar({ volume }: { volume: number }) {
  const bars = useMemo(() => {
    const total = 20;
    const filled = Math.round(volume * total);
    return Array.from({ length: total }, (_, i) => i < filled);
  }, [volume]);

  return (
    <div
      style={{
        display: "flex",
        gap: 3,
        alignItems: "flex-end",
        justifyContent: "center",
        height: 60,
        padding: 12,
        background: "var(--bp-surface-2)",
        borderRadius: 10,
      }}
    >
      {bars.map((filled, i) => (
        <div
          key={i}
          style={{
            width: 8,
            height: filled ? `${30 + (i / 20) * 30}px` : "8px",
            background: filled
              ? i < 4
                ? "#4a8e60"
                : i < 14
                  ? "var(--bp-tc)"
                  : "rgb(220, 38, 38)"
              : "var(--bp-line)",
            borderRadius: 2,
            transition: "height 0.1s, background 0.1s",
          }}
        />
      ))}
    </div>
  );
}
