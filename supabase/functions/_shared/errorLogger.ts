// Edge Functions 에러 로깅 공통 모듈
// error_logs 테이블에 구조화된 에러 로그 저장 (실패 시 무시)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type Severity = "info" | "warning" | "error" | "critical";

export interface ErrorLogEntry {
  request_id: string;
  function_name: string;
  error_code?: string;
  error_message: string;
  error_stack?: string;
  severity: Severity;
  user_id?: string;
  method?: string;
  path?: string;
  request_body?: Record<string, unknown>;
  region?: string;
  execution_id?: string;
}

const SENSITIVE_KEYS = [
  "password",
  "token",
  "api_key",
  "apiKey",
  "secret",
  "authorization",
  "cookie",
  "credit_card",
  "ssn",
  "phone",
];

export function generateRequestId(): string {
  return `req_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
}

export function getRequestId(req: Request): string {
  return req.headers.get("x-request-id") || generateRequestId();
}

export function sanitizeData(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return data.map((item) => sanitizeData(item));
  if (typeof data === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.some((sk) => lowerKey.includes(sk))) {
        sanitized[key] = "[FILTERED]";
      } else {
        sanitized[key] = sanitizeData(value);
      }
    }
    return sanitized;
  }
  return data;
}

export async function logError(entry: ErrorLogEntry): Promise<void> {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const sanitizedBody = entry.request_body
      ? (sanitizeData(entry.request_body) as Record<string, unknown>)
      : undefined;

    const { error } = await supabase.from("error_logs").insert({
      request_id: entry.request_id,
      function_name: entry.function_name,
      error_code: entry.error_code,
      error_message: entry.error_message.slice(0, 10000),
      error_stack: entry.error_stack?.slice(0, 50000),
      severity: entry.severity,
      user_id: entry.user_id,
      method: entry.method,
      path: entry.path,
      request_body: sanitizedBody,
      region: entry.region || Deno.env.get("SB_REGION") || "unknown",
      execution_id:
        entry.execution_id || Deno.env.get("SB_EXECUTION_ID") || "unknown",
    });

    if (error) {
      console.error("[ErrorLogger] DB 저장 실패:", error.message);
    }
  } catch (logErr) {
    console.error("[ErrorLogger] 로그 저장 중 예외:", logErr);
  }
}

export function captureAndRespond(
  error: unknown,
  requestId: string,
  functionName: string,
  corsHeaders: Record<string, string>,
  options?: {
    userId?: string;
    method?: string;
    path?: string;
    requestBody?: Record<string, unknown>;
    errorCode?: string;
    severity?: Severity;
  }
): Response {
  const err = error instanceof Error ? error : new Error(String(error));
  const severity = options?.severity || "error";

  console.error(`[${functionName}] ❌ ${severity.toUpperCase()}: ${err.message}`);

  logError({
    request_id: requestId,
    function_name: functionName,
    error_code: options?.errorCode,
    error_message: err.message,
    error_stack: err.stack,
    severity,
    user_id: options?.userId,
    method: options?.method,
    path: options?.path,
    request_body: options?.requestBody,
  });

  return new Response(
    JSON.stringify({
      error: "Internal Server Error",
      message: err.message,
      requestId,
    }),
    {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}
