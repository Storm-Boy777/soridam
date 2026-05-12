/**
 * 발화 정량 분석 유틸
 *
 * transcript(영문) + 녹음 길이(초) → 단어 수, WPM, 어휘 다양성, 필러 비율 등
 */

// 영어 필러 단어/구 (소문자 매칭) — OPIc 평가에서 가장 흔히 감점되는 항목
const FILLERS = [
  "um",
  "uh",
  "uhm",
  "hmm",
  "well",
  "you know",
  "like",
  "kind of",
  "sort of",
  "i mean",
  "actually",
  "basically",
  "literally",
];

// 단어 분리 시 무시할 구두점
const TOKEN_RE = /[^a-zA-Z']+/;

export interface SpeechMetricsResult {
  /** 녹음 시간 (초) — null이면 audio metadata 미로드 */
  duration_sec: number | null;
  /** 총 단어 수 (필러 포함) */
  word_count: number;
  /** 고유 단어 수 (대소문자 무시) */
  unique_word_count: number;
  /** 어휘 다양성 TTR = unique / total (0~1) */
  ttr: number;
  /** 문장 수 ('.', '?', '!' 기준) */
  sentence_count: number;
  /** 평균 문장 길이 (단어/문장) */
  avg_sentence_length: number;
  /** 분당 단어 수 (WPM) — duration_sec 있을 때만 */
  wpm: number | null;
  /** 필러 단어/구 출현 횟수 합 */
  filler_count: number;
  /** 필러 비율 (% — filler/total*100) */
  filler_ratio: number;
  /** 자주 쓴 단어 top N — 필러 제외, 3글자 이상 */
  top_words: Array<{ word: string; count: number }>;
}

/** 텍스트를 소문자 토큰 배열로 분리 (구두점 제거) */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(TOKEN_RE)
    .filter((w) => w.length > 0);
}

/** 필러 단어/구 출현 횟수 (구 단위 매칭은 단순 indexOf로) */
function countFillers(text: string): number {
  const lower = text.toLowerCase();
  let total = 0;
  for (const filler of FILLERS) {
    // 구는 띄어쓰기 포함이라 단순 includes 카운트
    if (filler.includes(" ")) {
      let from = 0;
      while (true) {
        const idx = lower.indexOf(filler, from);
        if (idx === -1) break;
        total += 1;
        from = idx + filler.length;
      }
    } else {
      // 단어는 경계 매칭
      const re = new RegExp(`\\b${filler}\\b`, "gi");
      const m = text.match(re);
      total += m?.length ?? 0;
    }
  }
  return total;
}

/** 자주 쓴 단어 top N (필러 + stop word 제외, 3글자 이상) */
const STOP_WORDS = new Set([
  "the", "and", "but", "for", "are", "you", "she", "her", "him", "his",
  "with", "this", "that", "they", "them", "have", "has", "had", "was",
  "were", "been", "from", "what", "when", "where", "which", "who", "why",
  "how", "all", "any", "can", "could", "would", "should", "will", "just",
  "very", "much", "many", "some", "more", "most", "such", "than", "then",
  "there", "their", "these", "those", "into", "about", "after", "again",
  "also", "because", "before", "between", "during", "each", "every",
  "from", "here", "off", "out", "over", "same", "still", "while",
  "isn't", "wasn't", "don't", "didn't", "won't", "can't", "doesn't",
]);

function topWords(
  tokens: string[],
  fillerSet: Set<string>,
  n = 5
): Array<{ word: string; count: number }> {
  const counts = new Map<string, number>();
  for (const t of tokens) {
    if (t.length < 3) continue;
    if (fillerSet.has(t)) continue;
    if (STOP_WORDS.has(t)) continue;
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([word, count]) => ({ word, count }));
}

export function analyzeSpeech(
  transcript: string | null,
  durationSec: number | null
): SpeechMetricsResult {
  if (!transcript || !transcript.trim()) {
    return {
      duration_sec: durationSec,
      word_count: 0,
      unique_word_count: 0,
      ttr: 0,
      sentence_count: 0,
      avg_sentence_length: 0,
      wpm: null,
      filler_count: 0,
      filler_ratio: 0,
      top_words: [],
    };
  }

  const tokens = tokenize(transcript);
  const wordCount = tokens.length;
  const uniqueCount = new Set(tokens).size;
  const ttr = wordCount > 0 ? uniqueCount / wordCount : 0;

  // 문장 분리 — 영문 .?! 기준
  const sentences = transcript
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const sentenceCount = sentences.length;
  const avgSentenceLength = sentenceCount > 0 ? wordCount / sentenceCount : 0;

  const fillerCount = countFillers(transcript);
  const fillerRatio = wordCount > 0 ? (fillerCount / wordCount) * 100 : 0;

  const wpm =
    durationSec && durationSec > 0 ? (wordCount / durationSec) * 60 : null;

  const fillerSet = new Set(
    FILLERS.filter((f) => !f.includes(" ")).map((f) => f.toLowerCase())
  );
  const tops = topWords(tokens, fillerSet, 5);

  return {
    duration_sec: durationSec,
    word_count: wordCount,
    unique_word_count: uniqueCount,
    ttr,
    sentence_count: sentenceCount,
    avg_sentence_length: avgSentenceLength,
    wpm,
    filler_count: fillerCount,
    filler_ratio: fillerRatio,
    top_words: tops,
  };
}

/** WPM 등급 (참고용) */
export function classifyWpm(wpm: number | null): {
  label: string;
  color: string;
} {
  if (wpm === null) return { label: "─", color: "var(--bp-ink-4)" };
  if (wpm >= 150) return { label: "원어민급", color: "#4a8e60" };
  if (wpm >= 130) return { label: "AL 수준", color: "#4a8e60" };
  if (wpm >= 100) return { label: "IH 수준", color: "var(--bp-tc)" };
  if (wpm >= 80) return { label: "IM 수준", color: "var(--bp-tc)" };
  return { label: "느림", color: "#b58634" };
}

/** TTR 등급 */
export function classifyTtr(ttr: number): { label: string; color: string } {
  if (ttr >= 0.55) return { label: "다양", color: "#4a8e60" };
  if (ttr >= 0.4) return { label: "적정", color: "var(--bp-tc)" };
  return { label: "단조", color: "#b58634" };
}

/** 필러 비율 등급 */
export function classifyFiller(ratio: number): {
  label: string;
  color: string;
} {
  if (ratio < 3) return { label: "깔끔", color: "#4a8e60" };
  if (ratio < 7) return { label: "보통", color: "var(--bp-tc)" };
  return { label: "잦음", color: "#b58634" };
}
