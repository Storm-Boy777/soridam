/**
 * MFCC (Mel-Frequency Cepstral Coefficients) 추출기
 *
 * 발음 유사도 비교의 핵심 특징 벡터.
 * 파이프라인: PCM → 프레임 분할 → 해밍 윈도우 → FFT → Mel 필터 뱅크 → Log → DCT → MFCC
 *
 * 서버 없이 클라이언트에서 실행 가능.
 */

// MFCC 설정
const NUM_MEL_FILTERS = 26;    // Mel 필터 수
const NUM_MFCC_COEFFS = 13;    // 출력 MFCC 계수 수 (1-13, 0번은 에너지)
const FRAME_MS = 25;           // 프레임 크기 (ms)
const HOP_MS = 10;             // 홉 크기 (ms)
const PRE_EMPHASIS = 0.97;     // 프리엠퍼시스 계수

export interface MFCCFrame {
  time: number;       // 초 단위
  coeffs: number[];   // MFCC 계수 (NUM_MFCC_COEFFS개)
  energy: number;     // 프레임 에너지
}

/**
 * Hz → Mel 변환
 */
function hzToMel(hz: number): number {
  return 2595 * Math.log10(1 + hz / 700);
}

/**
 * Mel → Hz 변환
 */
function melToHz(mel: number): number {
  return 700 * (Math.pow(10, mel / 2595) - 1);
}

/**
 * 해밍 윈도우 생성
 */
function hammingWindow(size: number): Float32Array {
  const window = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    window[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (size - 1));
  }
  return window;
}

/**
 * 실수 FFT (크기 스펙트럼 반환) — Cooley-Tukey 기반
 */
function fftMagnitude(signal: Float32Array): Float32Array {
  const n = signal.length;
  // 2의 거듭제곱으로 패딩
  let fftSize = 1;
  while (fftSize < n) fftSize *= 2;

  const real = new Float32Array(fftSize);
  const imag = new Float32Array(fftSize);
  real.set(signal);

  // 비트 반전 순열
  for (let i = 1, j = 0; i < fftSize; i++) {
    let bit = fftSize >> 1;
    while (j & bit) {
      j ^= bit;
      bit >>= 1;
    }
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }

  // 버터플라이 연산
  for (let len = 2; len <= fftSize; len *= 2) {
    const halfLen = len / 2;
    const angle = -2 * Math.PI / len;
    const wReal = Math.cos(angle);
    const wImag = Math.sin(angle);

    for (let i = 0; i < fftSize; i += len) {
      let curReal = 1, curImag = 0;
      for (let j = 0; j < halfLen; j++) {
        const tReal = curReal * real[i + j + halfLen] - curImag * imag[i + j + halfLen];
        const tImag = curReal * imag[i + j + halfLen] + curImag * real[i + j + halfLen];
        real[i + j + halfLen] = real[i + j] - tReal;
        imag[i + j + halfLen] = imag[i + j] - tImag;
        real[i + j] += tReal;
        imag[i + j] += tImag;
        const newReal = curReal * wReal - curImag * wImag;
        curImag = curReal * wImag + curImag * wReal;
        curReal = newReal;
      }
    }
  }

  // 크기 스펙트럼 (양의 주파수만)
  const halfSpectrum = fftSize / 2 + 1;
  const magnitude = new Float32Array(halfSpectrum);
  for (let i = 0; i < halfSpectrum; i++) {
    magnitude[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
  }
  return magnitude;
}

/**
 * Mel 필터 뱅크 생성
 */
function createMelFilterBank(
  numFilters: number,
  fftSize: number,
  sampleRate: number,
): Float32Array[] {
  const nyquist = sampleRate / 2;
  const melMin = hzToMel(0);
  const melMax = hzToMel(nyquist);
  const halfSpectrum = fftSize / 2 + 1;

  // Mel 축에서 균등 분할
  const melPoints = new Float32Array(numFilters + 2);
  for (let i = 0; i < numFilters + 2; i++) {
    melPoints[i] = melMin + (i * (melMax - melMin)) / (numFilters + 1);
  }

  // Mel → Hz → FFT bin 인덱스
  const binIndices = new Float32Array(numFilters + 2);
  for (let i = 0; i < numFilters + 2; i++) {
    binIndices[i] = Math.floor(((melToHz(melPoints[i]) / nyquist) * (halfSpectrum - 1)));
  }

  // 삼각형 필터 생성
  const filters: Float32Array[] = [];
  for (let m = 0; m < numFilters; m++) {
    const filter = new Float32Array(halfSpectrum);
    const start = binIndices[m];
    const center = binIndices[m + 1];
    const end = binIndices[m + 2];

    for (let k = Math.floor(start); k <= Math.floor(center); k++) {
      if (k >= 0 && k < halfSpectrum && center > start) {
        filter[k] = (k - start) / (center - start);
      }
    }
    for (let k = Math.floor(center); k <= Math.floor(end); k++) {
      if (k >= 0 && k < halfSpectrum && end > center) {
        filter[k] = (end - k) / (end - center);
      }
    }
    filters.push(filter);
  }

  return filters;
}

/**
 * DCT-II (이산 코사인 변환)
 */
function dctII(input: Float32Array, numCoeffs: number): number[] {
  const n = input.length;
  const output: number[] = [];
  for (let k = 0; k < numCoeffs; k++) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += input[i] * Math.cos((Math.PI * k * (2 * i + 1)) / (2 * n));
    }
    output.push(sum);
  }
  return output;
}

/**
 * PCM 데이터에서 MFCC 프레임 배열을 추출
 */
export function extractMFCC(
  pcm: Float32Array,
  sampleRate: number,
): MFCCFrame[] {
  const frameSamples = Math.round((FRAME_MS / 1000) * sampleRate);
  const hopSamples = Math.round((HOP_MS / 1000) * sampleRate);

  // FFT 크기 (2의 거듭제곱)
  let fftSize = 1;
  while (fftSize < frameSamples) fftSize *= 2;

  // 사전 계산
  const window = hammingWindow(frameSamples);
  const melFilters = createMelFilterBank(NUM_MEL_FILTERS, fftSize, sampleRate);

  // 프리엠퍼시스
  const emphasized = new Float32Array(pcm.length);
  emphasized[0] = pcm[0];
  for (let i = 1; i < pcm.length; i++) {
    emphasized[i] = pcm[i] - PRE_EMPHASIS * pcm[i - 1];
  }

  const frames: MFCCFrame[] = [];

  for (let start = 0; start + frameSamples <= emphasized.length; start += hopSamples) {
    const time = start / sampleRate;

    // 윈도우 적용
    const windowed = new Float32Array(frameSamples);
    let frameEnergy = 0;
    for (let i = 0; i < frameSamples; i++) {
      windowed[i] = emphasized[start + i] * window[i];
      frameEnergy += windowed[i] * windowed[i];
    }
    frameEnergy = Math.sqrt(frameEnergy / frameSamples);

    // FFT → 크기 스펙트럼
    const magnitude = fftMagnitude(windowed);

    // 파워 스펙트럼
    const power = new Float32Array(magnitude.length);
    for (let i = 0; i < magnitude.length; i++) {
      power[i] = (magnitude[i] * magnitude[i]) / fftSize;
    }

    // Mel 필터 뱅크 적용
    const melEnergies = new Float32Array(NUM_MEL_FILTERS);
    for (let m = 0; m < NUM_MEL_FILTERS; m++) {
      let sum = 0;
      for (let k = 0; k < power.length; k++) {
        sum += power[k] * melFilters[m][k];
      }
      melEnergies[m] = Math.max(sum, 1e-10); // log(0) 방지
    }

    // Log Mel 에너지
    const logMel = new Float32Array(NUM_MEL_FILTERS);
    for (let m = 0; m < NUM_MEL_FILTERS; m++) {
      logMel[m] = Math.log(melEnergies[m]);
    }

    // DCT → MFCC
    const coeffs = dctII(logMel, NUM_MFCC_COEFFS);

    frames.push({ time, coeffs, energy: frameEnergy });
  }

  return frames;
}

/**
 * 두 MFCC 프레임 간 유클리드 거리
 */
export function mfccDistance(a: number[], b: number[]): number {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/**
 * 두 MFCC 시퀀스 간 평균 코사인 유사도
 */
export function mfccCosineSimilarity(
  a: MFCCFrame[],
  b: MFCCFrame[],
  alignmentPath?: [number, number][],
): number {
  const pairs: [number[], number[]][] = [];

  if (alignmentPath) {
    // DTW 경로 기반 정렬
    for (const [i, j] of alignmentPath) {
      if (a[i] && b[j] && a[i].energy > 0.001 && b[j].energy > 0.001) {
        pairs.push([a[i].coeffs, b[j].coeffs]);
      }
    }
  } else {
    // 단순 인덱스 매칭
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      if (a[i].energy > 0.001 && b[i].energy > 0.001) {
        pairs.push([a[i].coeffs, b[i].coeffs]);
      }
    }
  }

  if (pairs.length < 3) return 0;

  let totalCosine = 0;
  for (const [va, vb] of pairs) {
    let dot = 0, normA = 0, normB = 0;
    for (let k = 0; k < va.length; k++) {
      dot += va[k] * vb[k];
      normA += va[k] * va[k];
      normB += vb[k] * vb[k];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    totalCosine += denom > 0 ? dot / denom : 0;
  }

  return totalCosine / pairs.length; // 0-1
}
