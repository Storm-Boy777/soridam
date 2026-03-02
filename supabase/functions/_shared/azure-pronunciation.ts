// Azure Speech SDK — 발음 평가 (WebSocket 기반)
// 소리담 azurePronunciation.ts 이관
// 5영역: pronunciation, accuracy, fluency, prosody, completeness

export interface PronunciationWord {
  word: string;
  accuracyScore: number;
  errorType: string; // None, Mispronunciation, Omission, Insertion
}

export interface Mispronunciation {
  word: string;
  accuracyScore: number;
  errorType: string;
}

export interface PronunciationResult {
  pronunciation_score: number;
  accuracy_score: number;
  fluency_score: number;
  prosody_score: number;
  completeness_score: number;
  words: PronunciationWord[];
  mispronunciations: Mispronunciation[];
  processing_time_ms: number;
}

// WebSocket 기반 Azure Pronunciation Assessment
export async function assessPronunciation(
  audioBuffer: ArrayBuffer,
  referenceText: string,
  apiKey: string,
  region: string,
): Promise<PronunciationResult> {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const wsUrl = `wss://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed&Ocp-Apim-Subscription-Key=${apiKey}`;

    const ws = new WebSocket(wsUrl);
    const requestId = crypto.randomUUID().replace(/-/g, "");

    let resolved = false;

    // 타임아웃 (60초)
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        ws.close();
        reject(new Error("Azure 발음 평가 타임아웃 (60초)"));
      }
    }, 60000);

    ws.onopen = () => {
      // Step 1: Speech Config
      const speechConfig = {
        context: {
          system: { version: "1.0.00000" },
          os: { platform: "Deno", name: "Edge Function" },
        },
      };
      ws.send(
        `Path: speech.config\r\nX-RequestId: ${requestId}\r\nX-Timestamp: ${new Date().toISOString()}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(speechConfig)}`,
      );

      // Step 2: Speech Context (발음 평가 설정)
      const speechContext = {
        phraseDetection: {
          mode: "Conversation",
          enrichment: {
            pronunciationAssessment: {
              referenceText,
              gradingSystem: "HundredMark",
              granularity: "Word",
              dimension: "Comprehensive",
              enableMiscue: true,
              enableProsodyAssessment: true,
            },
          },
        },
        phraseOutput: {
          detailed: {
            options: ["PronunciationAssessment", "SNR", "WordTimings"],
          },
        },
      };
      ws.send(
        `Path: speech.context\r\nX-RequestId: ${requestId}\r\nX-Timestamp: ${new Date().toISOString()}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(speechContext)}`,
      );

      // Step 3: Audio 전송 (32KB 청크)
      const audioData = new Uint8Array(audioBuffer);
      const chunkSize = 32768;

      for (let offset = 0; offset < audioData.length; offset += chunkSize) {
        const chunk = audioData.slice(
          offset,
          Math.min(offset + chunkSize, audioData.length),
        );

        // 바이너리 헤더 구성
        const headerStr = `Path: audio\r\nX-RequestId: ${requestId}\r\nX-Timestamp: ${new Date().toISOString()}\r\nContent-Type: audio/wav\r\n`;
        const headerBytes = new TextEncoder().encode(headerStr);

        // 헤더 길이(2바이트 BE) + 헤더 + 오디오 청크
        const message = new Uint8Array(2 + headerBytes.length + chunk.length);
        message[0] = (headerBytes.length >> 8) & 0xff;
        message[1] = headerBytes.length & 0xff;
        message.set(headerBytes, 2);
        message.set(chunk, 2 + headerBytes.length);

        ws.send(message.buffer);
      }

      // 오디오 종료 시그널 (빈 오디오)
      const endHeaderStr = `Path: audio\r\nX-RequestId: ${requestId}\r\nX-Timestamp: ${new Date().toISOString()}\r\nContent-Type: audio/wav\r\n`;
      const endHeaderBytes = new TextEncoder().encode(endHeaderStr);
      const endMessage = new Uint8Array(2 + endHeaderBytes.length);
      endMessage[0] = (endHeaderBytes.length >> 8) & 0xff;
      endMessage[1] = endHeaderBytes.length & 0xff;
      endMessage.set(endHeaderBytes, 2);
      ws.send(endMessage.buffer);
    };

    ws.onmessage = (event: MessageEvent) => {
      if (typeof event.data !== "string") return;

      const parts = event.data.split("\r\n\r\n");
      if (parts.length < 2) return;

      const headerSection = parts[0];
      const body = parts.slice(1).join("\r\n\r\n");

      // Path 추출
      const pathMatch = headerSection.match(/Path:\s*(\S+)/i);
      if (!pathMatch) return;
      const path = pathMatch[1];

      if (path === "speech.phrase") {
        try {
          const json = JSON.parse(body);
          if (json.RecognitionStatus === "Success") {
            const nbest = json.NBest?.[0];
            const pronAssessment = nbest?.PronunciationAssessment;

            const words: PronunciationWord[] = (nbest?.Words || []).map(
              (w: Record<string, unknown>) => ({
                word: w.Word as string,
                accuracyScore:
                  (w.PronunciationAssessment as Record<string, number>)
                    ?.AccuracyScore ?? 0,
                errorType:
                  (w.PronunciationAssessment as Record<string, string>)
                    ?.ErrorType ?? "None",
              }),
            );

            const mispronunciations: Mispronunciation[] = words.filter(
              (w) => w.accuracyScore < 60 || w.errorType !== "None",
            );

            resolved = true;
            clearTimeout(timeout);
            ws.close();

            resolve({
              pronunciation_score: pronAssessment?.PronScore ?? 0,
              accuracy_score: pronAssessment?.AccuracyScore ?? 0,
              fluency_score: pronAssessment?.FluencyScore ?? 0,
              prosody_score: pronAssessment?.ProsodyScore ?? 0,
              completeness_score: pronAssessment?.CompletenessScore ?? 0,
              words,
              mispronunciations,
              processing_time_ms: Date.now() - startTime,
            });
          } else if (json.RecognitionStatus === "EndOfDictation") {
            // 무음 오디오 등
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              ws.close();
              resolve({
                pronunciation_score: 0,
                accuracy_score: 0,
                fluency_score: 0,
                prosody_score: 0,
                completeness_score: 0,
                words: [],
                mispronunciations: [],
                processing_time_ms: Date.now() - startTime,
              });
            }
          }
        } catch {
          // JSON 파싱 실패 시 무시
        }
      }

      if (path === "turn.end") {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          ws.close();
          resolve({
            pronunciation_score: 0,
            accuracy_score: 0,
            fluency_score: 0,
            prosody_score: 0,
            completeness_score: 0,
            words: [],
            mispronunciations: [],
            processing_time_ms: Date.now() - startTime,
          });
        }
      }
    };

    ws.onerror = (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(new Error(`Azure WebSocket 에러: ${err}`));
      }
    };

    ws.onclose = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(new Error("Azure WebSocket 연결 종료"));
      }
    };
  });
}

// WebM → WAV 변환 (Azure는 WAV만 지원)
// 간단한 PCM 16kHz mono WAV 헤더 래핑
// 주의: 이것은 raw PCM 데이터를 WAV로 래핑하는 것이 아니라,
// WebM 디코딩이 필요한 경우를 위한 placeholder
// 실제로는 ffmpeg 또는 Web Audio API로 변환해야 함
// Deno에서는 오디오를 그대로 Azure에 전달하고, Azure가 처리하도록 함
export function createWavHeader(
  dataLength: number,
  sampleRate: number = 16000,
  channels: number = 1,
  bitsPerSample: number = 16,
): Uint8Array {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);

  // RIFF header
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataLength, true); // file size - 8
  view.setUint32(8, 0x57415645, false); // "WAVE"

  // fmt subchunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // subchunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data subchunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataLength, true);

  return new Uint8Array(header);
}
