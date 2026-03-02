// 스킵 판정 (3단계)
// 1차: audio_duration ≤ 15초 → 전체 생략
// 2차: transcript ≤ 15자 → Azure/GPT 생략
// 3차: Whisper 환청 → Azure/GPT 생략

const EMOJI_ONLY_REGEX = /^[\p{Emoji}\s]+$/u;

// Whisper 환청 탐지 (보수적: 이모지만 검사)
export function isWhisperHallucination(transcript: string): boolean {
  const cleaned = transcript.toLowerCase().trim();
  if (!cleaned) return true;
  // 이모지만 있는 경우
  if (EMOJI_ONLY_REGEX.test(cleaned)) return true;
  return false;
}

export type SkipReason = "short_audio" | "short_transcript" | "hallucination" | null;

export interface SkipResult {
  shouldSkip: boolean;
  reason: SkipReason;
  skipStage: "all" | "azure_gpt" | null; // all: STT도 생략, azure_gpt: STT 후 나머지 생략
}

// 1차 스킵: 오디오 길이 기반 (STT 전)
export function checkAudioSkip(audioDuration: number): SkipResult {
  if (audioDuration <= 15) {
    return { shouldSkip: true, reason: "short_audio", skipStage: "all" };
  }
  return { shouldSkip: false, reason: null, skipStage: null };
}

// 2~3차 스킵: 트랜스크립트 기반 (STT 후)
export function checkTranscriptSkip(transcript: string): SkipResult {
  const cleaned = (transcript || "").trim();
  if (cleaned.length <= 15) {
    return { shouldSkip: true, reason: "short_transcript", skipStage: "azure_gpt" };
  }
  if (isWhisperHallucination(cleaned)) {
    return { shouldSkip: true, reason: "hallucination", skipStage: "azure_gpt" };
  }
  return { shouldSkip: false, reason: null, skipStage: null };
}
