/**
 * 발음 비교 점수 계산기 v2
 *
 * 4축 평가: 발음(MFCC) + 억양(피치) + 타이밍(DTW) + 강세(에너지)
 */

import type { PitchFrame } from "./pitch-extractor";
import type { DTWResult } from "./dtw";
import type { MFCCFrame } from "./mfcc";
import { mfccCosineSimilarity } from "./mfcc";

export interface PronunciationScore {
  pronunciationScore: number; // 0-100 — MFCC 기반 발음 유사도 (NEW)
  pitchScore: number;         // 0-100 — 피치(억양) 곡선 유사도
  timingScore: number;        // 0-100 — 발화 속도/타이밍 유사도
  energyScore: number;        // 0-100 — 에너지(강세) 패턴 유사도
  overallScore: number;       // 0-100 — 가중 평균
  feedback: string;           // 한국어 피드백 메시지
}

/**
 * 피어슨 상관계수 (유성음 쌍만 비교)
 */
function pearsonCorrelation(a: number[], b: number[]): number | null {
  const pairs: [number, number][] = [];
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] > 0 && b[i] > 0) {
      pairs.push([a[i], b[i]]);
    }
  }

  if (pairs.length < 5) return null;

  const n = pairs.length;
  let sumA = 0, sumB = 0, sumAB = 0, sumA2 = 0, sumB2 = 0;
  for (const [va, vb] of pairs) {
    sumA += va;
    sumB += vb;
    sumAB += va * vb;
    sumA2 += va * va;
    sumB2 += vb * vb;
  }

  const varA = n * sumA2 - sumA * sumA;
  const varB = n * sumB2 - sumB * sumB;
  if (varA < 0.001 || varB < 0.001) return null;

  const denom = Math.sqrt(varA * varB);
  if (denom === 0) return null;
  return (n * sumAB - sumA * sumB) / denom;
}

/**
 * MAE 기반 피치 유사도 (상관계수 대안)
 */
function pitchMAEScore(alignedA: number[], alignedB: number[]): number {
  const pairs: [number, number][] = [];
  for (let i = 0; i < Math.min(alignedA.length, alignedB.length); i++) {
    if (alignedA[i] > 0 && alignedB[i] > 0) {
      pairs.push([alignedA[i], alignedB[i]]);
    }
  }
  if (pairs.length < 3) return 0;

  let totalCents = 0;
  for (const [va, vb] of pairs) {
    totalCents += Math.abs(1200 * Math.log2(Math.max(va, 1) / Math.max(vb, 1)));
  }
  const mae = totalCents / pairs.length;
  return Math.max(0, Math.min(100, Math.round((1 - mae / 200) * 100)));
}

/**
 * 에너지 코사인 유사도
 */
function energySimilarity(nativeEnergy: number[], userEnergy: number[]): number {
  if (nativeEnergy.length === 0 || userEnergy.length === 0) return 0;

  let dot = 0, normA = 0, normB = 0;
  const len = Math.min(nativeEnergy.length, userEnergy.length);
  for (let i = 0; i < len; i++) {
    dot += nativeEnergy[i] * userEnergy[i];
    normA += nativeEnergy[i] * nativeEnergy[i];
    normB += userEnergy[i] * userEnergy[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom < 0.0001) return 0;
  return Math.max(0, Math.min(100, Math.round((dot / denom) * 100)));
}

/**
 * 피드백 메시지 생성 (4축)
 */
function generateFeedback(
  pronunciationScore: number,
  pitchScore: number,
  timingScore: number,
  energyScore: number,
): string {
  if (pronunciationScore >= 85 && pitchScore >= 80 && timingScore >= 80) {
    return "원어민과 매우 유사한 발음이에요!";
  }

  const scores = [
    { score: pronunciationScore, low: "발음이 원어민과 많이 달라요. 각 단어의 발음을 하나씩 연습해보세요", mid: "발음이 비슷하지만 일부 소리가 달라요. 조금만 더 연습하면 좋아질 거예요" },
    { score: pitchScore, low: "억양 패턴이 많이 달라요. 원어민의 높낮이 변화에 집중해보세요", mid: "억양이 비슷하지만 일부 구간에서 차이가 있어요" },
    { score: timingScore, low: "말하는 속도가 많이 달라요. 원어민의 리듬을 따라해보세요", mid: "속도는 비슷하지만 일부 단어에서 길이가 달라요" },
    { score: energyScore, low: "강세 패턴이 달라요. 어디를 강하게 말하는지 주의해보세요", mid: "강세가 비슷하지만 좀 더 강약을 살려보세요" },
  ];

  const worst = scores.reduce((min, s) => s.score < min.score ? s : min);
  if (worst.score < 50) return worst.low;
  if (worst.score < 75) return worst.mid;
  return "전반적으로 잘하고 있어요. 계속 연습하면 더 좋아질 거예요";
}

/**
 * 종합 발음 점수 계산 (v2 — MFCC 포함)
 */
export function scorePronunciation(
  nativePitch: PitchFrame[],
  userPitch: PitchFrame[],
  dtwResult: DTWResult,
  nativeMFCC?: MFCCFrame[],
  userMFCC?: MFCCFrame[],
): PronunciationScore {
  // === 1. 발음 유사도 (MFCC 코사인 유사도) ===
  let pronunciationScore = 0;
  if (nativeMFCC && userMFCC && nativeMFCC.length > 0 && userMFCC.length > 0) {
    const similarity = mfccCosineSimilarity(nativeMFCC, userMFCC, dtwResult.path);
    // 코사인 유사도 0.5 이하 → 0점, 0.95 이상 → 100점
    pronunciationScore = Math.max(0, Math.min(100, Math.round(((similarity - 0.5) / 0.45) * 100)));
  }

  // === 2. 억양 유사도 (피치) ===
  const pitchCorr = pearsonCorrelation(dtwResult.alignedA, dtwResult.alignedB);
  let pitchScore: number;
  if (pitchCorr !== null) {
    pitchScore = Math.max(0, Math.min(100, Math.round(((pitchCorr - 0.3) / 0.6) * 100)));
  } else {
    pitchScore = pitchMAEScore(dtwResult.alignedA, dtwResult.alignedB);
  }

  // === 3. 타이밍 유사도 ===
  const timingScore = dtwResult.timingScore;

  // === 4. 강세 유사도 (에너지) ===
  const alignedNativeEnergy = dtwResult.path.map(([i]) => nativePitch[i]?.energy ?? 0);
  const alignedUserEnergy = dtwResult.path.map(([, j]) => userPitch[j]?.energy ?? 0);
  const energyScore = energySimilarity(alignedNativeEnergy, alignedUserEnergy);

  // === 종합 점수 ===
  // MFCC가 있으면: 발음 35% + 억양 25% + 타이밍 25% + 강세 15%
  // MFCC가 없으면: 억양 45% + 타이밍 35% + 강세 20% (기존 방식)
  let overallScore: number;
  if (nativeMFCC && userMFCC && nativeMFCC.length > 0) {
    overallScore = Math.round(
      pronunciationScore * 0.35 + pitchScore * 0.25 + timingScore * 0.25 + energyScore * 0.15,
    );
  } else {
    overallScore = Math.round(
      pitchScore * 0.45 + timingScore * 0.35 + energyScore * 0.20,
    );
  }

  const feedback = generateFeedback(pronunciationScore, pitchScore, timingScore, energyScore);

  return {
    pronunciationScore,
    pitchScore,
    timingScore,
    energyScore,
    overallScore,
    feedback,
  };
}
