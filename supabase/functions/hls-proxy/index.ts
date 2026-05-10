// hls-proxy
// R2(soridam-lectures 버킷)에서 HLS 매니페스트(.m3u8)와 세그먼트(.ts) 프록시
// 인증 없이 동작 (get-lecture-playlist에서 권한 검증 후 URL 발급)

import { S3Client, GetObjectCommand } from "npm:@aws-sdk/client-s3@^3.529.1";
import { generateRequestId, captureAndRespond } from "../_shared/errorLogger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, range",
  "Access-Control-Expose-Headers": "content-length, content-type, content-range",
};

function initializeR2Client() {
  const accountId = Deno.env.get("R2_ACCOUNT_ID");
  const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
  const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");

  if (!accountId || !accessKeyId || !secretAccessKey) return null;

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = req.headers.get("x-request-id") || generateRequestId();

  try {
    const url = new URL(req.url);
    const filePath = url.searchParams.get("path");

    if (!filePath) {
      return new Response(
        JSON.stringify({ error: "파일 경로가 필요합니다" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const s3Client = initializeR2Client();
    if (!s3Client) {
      console.error("R2 클라이언트 초기화 실패 — 환경변수 확인 필요");
      return new Response(JSON.stringify({ error: "R2 설정 오류" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const command = new GetObjectCommand({
      Bucket: "soridam-lectures",
      Key: filePath,
    });

    const response = await s3Client.send(command);

    let contentType = "application/octet-stream";
    if (filePath.endsWith(".m3u8")) {
      contentType = "application/vnd.apple.mpegurl";
    } else if (filePath.endsWith(".ts")) {
      contentType = "video/mp2t";
    } else if (filePath.endsWith(".mp4")) {
      contentType = "video/mp4";
    } else if (filePath.endsWith(".webm")) {
      contentType = "video/webm";
    }

    // 스트림을 Uint8Array로 결합
    const chunks: Uint8Array[] = [];
    const reader = (response.Body as any).transformToWebStream().getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    // m3u8 매니페스트는 세그먼트 경로를 프록시 URL로 재작성
    if (filePath.endsWith(".m3u8")) {
      const text = new TextDecoder().decode(result);
      const baseUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/hls-proxy?path=`;
      const dir = filePath.substring(0, filePath.lastIndexOf("/"));

      const modifiedText = text.replace(/^([^#][^\r\n]+)$/gm, (match) => {
        if (match.startsWith("http")) return match;
        let cleanMatch = match.replace(/\\/g, "/");
        if (cleanMatch.startsWith("./")) cleanMatch = cleanMatch.substring(2);
        if (cleanMatch.startsWith("/")) cleanMatch = cleanMatch.substring(1);
        const fullPath = `${dir}/${cleanMatch}`;
        return `${baseUrl}${encodeURIComponent(fullPath)}`;
      });

      return new Response(modifiedText, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/vnd.apple.mpegurl",
          "Content-Length": new TextEncoder().encode(modifiedText).length.toString(),
          "Cache-Control": "no-cache",
        },
      });
    }

    return new Response(result, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Content-Length": result.length.toString(),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[hls-proxy] Error:", error);
    return captureAndRespond(error, requestId, "hls-proxy", corsHeaders);
  }
});
