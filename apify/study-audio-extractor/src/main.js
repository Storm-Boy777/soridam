// 소리담 월요일 스터디 — YouTube 대화 구간 오디오 추출 Actor
//
// 입력  : { youtubeUrl, startSec, endSec }
// 처리  : yt-dlp --download-sections 로 해당 구간만 WAV(44.1kHz mono) 추출
// 출력  : Key-Value Store 'OUTPUT' (audio/wav) — 호출 측(EF)이 받아 Supabase Storage 업로드
//
// 코랩 코드(yt-dlp + ffmpeg -ss/-to)를 그대로 옮긴 것. 차이: 전체 다운로드 없이
// --download-sections 로 처음부터 구간만 받아 더 빠르고 가볍다.

import { Actor } from "apify";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const execFileAsync = promisify(execFile);

await Actor.main(async () => {
  const input = await Actor.getInput();
  const youtubeUrl = input?.youtubeUrl;
  const startSec = input?.startSec;
  const endSec = input?.endSec;

  // 입력 검증
  if (!youtubeUrl || !/(youtube\.com|youtu\.be)/.test(youtubeUrl)) {
    throw new Error("유효한 YouTube URL이 필요합니다");
  }
  if (!Number.isFinite(startSec) || !Number.isFinite(endSec) || endSec <= startSec) {
    throw new Error(`startSec/endSec가 올바르지 않습니다 (start=${startSec}, end=${endSec})`);
  }

  console.log(`[추출] ${youtubeUrl} · ${startSec}s–${endSec}s`);

  // Apify Residential Proxy — YouTube 봇 차단 우회
  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: ["RESIDENTIAL"],
  });

  // 임시 출력 디렉토리 (yt-dlp 출력 확장자가 후처리로 .wav가 되므로 디렉토리 스캔으로 찾는다)
  const outDir = await mkdtemp(join(tmpdir(), "ytclip-"));
  const outTemplate = join(outDir, "audio.%(ext)s");
  const section = `*${Math.floor(startSec)}-${Math.ceil(endSec)}`;

  // residential proxy도 IP마다 봇 차단될 수 있어, 매 시도 새 IP로 최대 3회 재시도.
  // player_client(android/ios)는 web보다 봇 감지가 약한 경로.
  const MAX_ATTEMPTS = 3;
  let success = false;
  let lastDetail = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS && !success; attempt++) {
    const proxyUrl = proxyConfiguration ? await proxyConfiguration.newUrl() : undefined;
    console.log(`[추출] 시도 ${attempt}/${MAX_ATTEMPTS}${proxyUrl ? " · residential" : ""}`);
    const args = [
      "--download-sections", section,
      ...(proxyUrl ? ["--proxy", proxyUrl] : []),
      "--extractor-args", "youtube:player_client=default,android,ios",
      "--force-keyframes-at-cuts",
      "-f", "bestaudio/best",
      "-x", "--audio-format", "wav",
      "--postprocessor-args", "ffmpeg:-ar 44100 -ac 1", // 44.1kHz mono (코랩과 동일)
      "--no-playlist",
      "--no-warnings",
      "-o", outTemplate,
      youtubeUrl,
    ];
    try {
      const { stdout, stderr } = await execFileAsync("yt-dlp", args, {
        maxBuffer: 1024 * 1024 * 128,
      });
      if (stdout) console.log(stdout);
      if (stderr) console.warn(stderr);
      success = true;
    } catch (e) {
      lastDetail = e?.stderr || e?.message || String(e);
      console.warn(`[추출] 시도 ${attempt} 실패: ${lastDetail.slice(0, 200)}`);
    }
  }
  if (!success) {
    throw new Error(`yt-dlp 추출 실패 (${MAX_ATTEMPTS}회 재시도): ${lastDetail}`);
  }

  // 생성된 WAV 찾기
  const files = await readdir(outDir);
  const wavName = files.find((f) => f.toLowerCase().endsWith(".wav"));
  if (!wavName) {
    throw new Error(`WAV가 생성되지 않았습니다 (디렉토리: ${files.join(", ") || "비어있음"})`);
  }

  const wav = await readFile(join(outDir, wavName));
  console.log(`[완료] WAV ${(wav.length / 1024 / 1024).toFixed(2)} MB`);

  // OUTPUT으로 반환 (B 방식 — Supabase 키를 Apify에 두지 않음)
  await Actor.setValue("OUTPUT", wav, { contentType: "audio/wav" });

  // 메타는 dataset에 (run 결과 조회용)
  await Actor.pushData({
    youtubeUrl,
    startSec,
    endSec,
    durationSec: endSec - startSec,
    bytes: wav.length,
    outputKey: "OUTPUT",
  });

  await rm(outDir, { recursive: true, force: true });
});
