"use client";

import { useState, useCallback, useRef, useEffect } from "react";

// ── 녹음 상태 ──

export type RecordingState =
  | "idle"       // 대기
  | "recording"  // 녹음 중
  | "stopped";   // 녹음 완료 (업로드 전)

// ── 녹음 품질 피드백 (UX 2-3) ──

export type VolumeWarning = "none" | "silent" | "too_quiet" | "time_warning";

// ── 마이크 에러 코드 (UI에서 가이드 분기) ──
//   mic_denied      : 권한 거부
//   mic_silent      : 녹음 시작 후 1.5초간 거의 무음 (디바이스/점유 의심)
//   mic_taken       : 도중 mute 발생 (다른 앱이 마이크 빼앗아감)
//   empty_recording : onstop 시 webm 크기/볼륨이 무용 (Whisper 환각 사전 차단)
//   mic_unavailable : track readyState != live 또는 트랙 없음
export type MicErrorCode =
  | "mic_denied"
  | "mic_silent"
  | "mic_taken"
  | "empty_recording"
  | "mic_unavailable"
  | null;

interface UseRecorderOptions {
  maxDuration?: number;      // 최대 녹음 시간 (초, 기본 240 = 4분)
  minDuration?: number;      // 최소 녹음 시간 (초, 기본 1)
  silenceThreshold?: number; // 무음 감지 임계값 (0~1, 기본 0.02)
  silenceTimeout?: number;   // 무음 경고까지 시간 (초, 기본 3)
  lowVolumeThreshold?: number; // 낮은 볼륨 임계값 (0~1, 기본 0.08)
  timeWarningAt?: number;    // 종료 경고 시점 (남은 초, 기본 30)
  /** onstop 시 빈 녹음 차단 (마이크 테스트 모달은 false로 두고 직접 검사) */
  validateOnStop?: boolean;
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
  /** 구체 에러 코드 — UI에서 가이드 분기용 */
  errorCode: MicErrorCode;
  /** 녹음 중 누적 평균 볼륨 (onstop 후 결과 페이지에서 참고용) */
  avgVolume: number;
}

// WebM → WAV 변환 (Azure Pronunciation Assessment 호환)
// Web Audio API decodeAudioData로 디코딩 → 16kHz mono PCM → WAV 헤더 래핑
async function convertWebmToWav(webmBlob: Blob): Promise<Blob> {
  const arrayBuffer = await webmBlob.arrayBuffer();
  const audioCtx = new AudioContext({ sampleRate: 16000 });

  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    // mono 채널 추출 (첫 번째 채널)
    const channelData = audioBuffer.getChannelData(0);

    // 16kHz 리샘플링 (decodeAudioData가 AudioContext sampleRate로 자동 리샘플링)
    const pcmData = new Int16Array(channelData.length);
    for (let i = 0; i < channelData.length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }

    // WAV 헤더 생성
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);
    const dataLength = pcmData.byteLength;

    view.setUint32(0, 0x52494646, false);  // "RIFF"
    view.setUint32(4, 36 + dataLength, true);
    view.setUint32(8, 0x57415645, false);  // "WAVE"
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true);          // PCM subchunk size
    view.setUint16(20, 1, true);           // PCM format
    view.setUint16(22, 1, true);           // mono
    view.setUint32(24, 16000, true);       // 16kHz
    view.setUint32(28, 32000, true);       // byteRate (16000 * 1 * 2)
    view.setUint16(32, 2, true);           // blockAlign (1 * 2)
    view.setUint16(34, 16, true);          // 16-bit
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, dataLength, true);

    return new Blob([wavHeader, pcmData.buffer], { type: "audio/wav" });
  } finally {
    await audioCtx.close();
  }
}

export function useRecorder(options: UseRecorderOptions = {}): UseRecorderReturn {
  const {
    maxDuration = 240,
    minDuration = 1,
    silenceThreshold = 0.05,     // 4x 증폭 기준: 무음
    silenceTimeout = 3,
    lowVolumeThreshold = 0.15,   // 4x 증폭 기준: 너무 조용
    timeWarningAt = 30,
    validateOnStop = true,
  } = options;

  const [state, setState] = useState<RecordingState>("idle");
  const [volume, setVolume] = useState(0);
  const [duration, setDuration] = useState(0);
  const [warning, setWarning] = useState<VolumeWarning>("none");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<MicErrorCode>(null);
  const [avgVolume, setAvgVolume] = useState(0);

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

  // 누적 볼륨 샘플 (onstop 시 무음 webm 차단용)
  const volumeSamplesRef = useRef<number[]>([]);
  // 1.5초 자가진단 timer
  const selfCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // track mute 이벤트 핸들러 (cleanup용)
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const trackMuteHandlerRef = useRef<(() => void) | null>(null);
  const trackEndedHandlerRef = useRef<(() => void) | null>(null);

  // ── 볼륨 분석 (소리담 검증 패턴: getByteFrequencyData + 증폭) ──
  const updateVolume = useCallback(() => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    // 소리담 패턴: 평균 → 0~1 정규화 + 4배 증폭
    const avg = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
    const normalizedVolume = Math.min(1, (avg / 255) * 4);
    setVolume(normalizedVolume);

    // 누적 샘플 저장 — onstop 시 무음 webm 차단에 사용
    volumeSamplesRef.current.push(normalizedVolume);

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
      setErrorCode(null);
      setAudioBlob(null);
      setAvgVolume(0);
      setWarning("none");
      silenceStartRef.current = null;
      volumeSamplesRef.current = [];

      // M1: autoGainControl 추가 — 작은 음성 자동 증폭
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

      // M5: getUserMedia 결과 트랙 검증
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        setErrorCode("mic_unavailable");
        setError("마이크를 찾을 수 없어요. 시스템 마이크 연결을 확인해 주세요.");
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      const track = audioTracks[0];
      if (track.readyState !== "live") {
        setErrorCode("mic_unavailable");
        setError("마이크가 사용 불가능한 상태예요. 다른 앱이 마이크를 사용 중인지 확인해 주세요.");
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      if (track.muted) {
        setErrorCode("mic_taken");
        setError("마이크가 음소거 상태예요. 다른 앱이 마이크를 사용 중인지 확인해 주세요.");
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      // M3: 도중 mute / ended 이벤트 모니터링
      const onTrackMute = () => {
        setErrorCode("mic_taken");
        setError("녹음 중 마이크가 끊겼어요. 다른 앱이 마이크를 점유했을 수 있어요.");
        try {
          mediaRecorderRef.current?.stop();
        } catch {
          /* noop */
        }
      };
      const onTrackEnded = () => {
        setErrorCode("mic_unavailable");
        setError("녹음 중 마이크 연결이 끊겼어요. 디바이스 연결을 확인해 주세요.");
        try {
          mediaRecorderRef.current?.stop();
        } catch {
          /* noop */
        }
      };
      track.addEventListener("mute", onTrackMute);
      track.addEventListener("ended", onTrackEnded);
      trackRef.current = track;
      trackMuteHandlerRef.current = onTrackMute;
      trackEndedHandlerRef.current = onTrackEnded;

      // Web Audio API 볼륨 분석
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;

      // AudioContext가 suspended 상태면 resume (브라우저 autoplay 정책)
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

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

      // M6: 녹음 도중 에러 핸들러
      recorder.onerror = (e) => {
        const err = e as Event & { error?: { name?: string } };
        setErrorCode("mic_unavailable");
        setError(
          `녹음 중 오류가 발생했어요${err.error?.name ? ` (${err.error.name})` : ""}`
        );
      };

      recorder.onstop = async () => {
        // reset()에서 stop한 경우 무시 (비동기 레이스 컨디션 방지)
        if (cancelledRef.current) return;
        const webmBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

        // 누적 평균 볼륨 계산
        const samples = volumeSamplesRef.current;
        const meanVol =
          samples.length > 0
            ? samples.reduce((s, v) => s + v, 0) / samples.length
            : 0;
        const silentRatio =
          samples.length > 0
            ? samples.filter((v) => v < 0.02).length / samples.length
            : 1;
        setAvgVolume(meanVol);

        // M2: 빈 녹음 차단 — 셋 중 둘 이상 만족 시 무음 webm 판정
        // (false positive 방지 위해 단일 조건은 통과)
        const isEmptyBlob = webmBlob.size < 5000;       // 5KB 미만 = 사실상 빈 webm
        const isSilentVolume = meanVol < 0.01;          // 평균 볼륨 거의 0
        const isMostlySilent = silentRatio > 0.95;      // 95% 이상 무음
        const failures =
          (isEmptyBlob ? 1 : 0) +
          (isSilentVolume ? 1 : 0) +
          (isMostlySilent ? 1 : 0);

        if (validateOnStop && failures >= 2) {
          // 무음 webm 차단 — setAudioBlob 호출 안 함 → 자동 업로드 차단
          setErrorCode("empty_recording");
          setError(
            "녹음에 음성이 거의 들리지 않아요. 마이크 상태를 확인하고 다시 녹음해 주세요."
          );
          setState("idle");
          return;
        }

        // WebM → WAV 변환 (Azure Pronunciation Assessment는 WAV/PCM만 지원)
        try {
          const wavBlob = await convertWebmToWav(webmBlob);
          setAudioBlob(wavBlob);
        } catch {
          // 변환 실패 시 WebM 그대로 사용 (Whisper는 WebM 지원)
          setAudioBlob(webmBlob);
        }
        setState("stopped");
      };

      mediaRecorderRef.current = recorder;
      startTimeRef.current = Date.now();
      recorder.start();
      setState("recording");

      // M4: 녹음 시작 1.5초 자가진단 — 모든 샘플이 거의 무음이면 즉시 중단
      // (사용자가 답변 중인 경우는 무음 비율이 일부라도 떨어지므로 false positive 최소)
      selfCheckTimerRef.current = setTimeout(() => {
        const samples = volumeSamplesRef.current;
        if (samples.length < 10) return; // 샘플이 충분치 않으면 패스
        const maxVol = Math.max(...samples);
        // 1.5초 동안 한 번도 0.015 이상 안 올라간 경우 = 마이크 무반응
        if (maxVol < 0.015) {
          setErrorCode("mic_silent");
          setError(
            "마이크에서 소리가 들어오지 않아요. 다른 앱이 마이크를 사용 중이거나, 시스템 마이크 권한을 확인해 주세요."
          );
          try {
            cancelledRef.current = true; // onstop 차단
            mediaRecorderRef.current?.stop();
          } catch {
            /* noop */
          }
          cleanup();
          setState("idle");
        }
      }, 1500);

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
    } catch (err) {
      // getUserMedia 실패 — 권한 거부 / NotFoundError 등
      const name = (err as { name?: string })?.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        setErrorCode("mic_denied");
        setError("마이크 권한을 허용해 주세요. 브라우저 주소창 좌측 자물쇠 아이콘에서 변경할 수 있어요.");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setErrorCode("mic_unavailable");
        setError("마이크 디바이스를 찾을 수 없어요. 시스템 설정에서 마이크 연결을 확인해 주세요.");
      } else if (name === "NotReadableError" || name === "TrackStartError") {
        setErrorCode("mic_taken");
        setError("마이크가 다른 앱에 의해 사용 중이에요. 해당 앱을 종료하고 다시 시도해 주세요.");
      } else {
        setErrorCode("mic_unavailable");
        setError("마이크를 사용할 수 없어요. 디바이스 연결을 확인해 주세요.");
      }
    }
  }, [maxDuration, timeWarningAt, updateVolume, validateOnStop]);

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
    if (selfCheckTimerRef.current) {
      clearTimeout(selfCheckTimerRef.current);
      selfCheckTimerRef.current = null;
    }
    // 트랙 이벤트 리스너 해제
    if (trackRef.current && trackMuteHandlerRef.current) {
      trackRef.current.removeEventListener("mute", trackMuteHandlerRef.current);
    }
    if (trackRef.current && trackEndedHandlerRef.current) {
      trackRef.current.removeEventListener("ended", trackEndedHandlerRef.current);
    }
    trackRef.current = null;
    trackMuteHandlerRef.current = null;
    trackEndedHandlerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
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
    setErrorCode(null);
    setAvgVolume(0);
    volumeSamplesRef.current = [];
  }, [state, cleanup]);

  // 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close();
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
    errorCode,
    avgVolume,
  };
}
