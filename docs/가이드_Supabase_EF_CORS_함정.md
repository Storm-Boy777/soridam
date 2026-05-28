# 가이드: Supabase Edge Function CORS 함정 — OPTIONS status 204 절대 금지

> **사건**: 2026-05-27 회사 스터디에서 Talklish 수요일 모듈로 14명이 모두 코치노트를 받지 못함. 모바일에서 `Failed to send a request to the edge function` 에러. 5/28에도 모바일 시도 모두 실패. PC는 멀쩡히 작동.
> **원인**: EF의 OPTIONS preflight 응답이 `status: 204`였음 — 일부 모바일 브라우저(특히 삼성 인터넷·구버전 모바일 Chrome)는 OPTIONS에 `200 OK` + body가 있어야 정상으로 인정. `204`를 받으면 preflight 실패로 처리해서 본 POST를 발사하지 않음 → 클라이언트 `fetch` reject.
> **교훈**: Supabase EF의 OPTIONS preflight 응답은 **반드시 `status: 200` + body**. `204`는 RFC 상 valid이지만 모바일 호환성 때문에 금지.

## 📌 핵심 규칙 (이거 하나만 기억)

```ts
// ❌ 금지 — 일부 모바일 브라우저가 거부함
if (req.method === "OPTIONS") {
  return new Response(null, { status: 204, headers: corsHeaders });
}

// ✅ 권장 — 모든 브라우저 호환
if (req.method === "OPTIONS") {
  return new Response("ok", { status: 200, headers: corsHeaders });
}
```

## 🎯 권장 패턴 — `_shared/cors.ts` 표준 사용

새 EF 만들 때는 자체 CORS 함수 만들지 말고 표준 import:

```ts
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });  // status default 200
  }
  // ... handler ...
  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
```

`_shared/cors.ts` 내용:

```ts
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-query-params",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};
```

`Allow-Origin: "*"`이 보안상 걱정될 수 있지만 — **EF는 어차피 service_role_key·user JWT로 인증되므로 origin 제한이 추가 보안을 거의 주지 않음**. 자체 origin allow-list로 가는 건 false sense of security.

## ⚠️ 자체 CORS를 꼭 써야 한다면 — 체크리스트

`_shared/cors.ts`로 충분하지만 특수한 사유로 자체 CORS를 쓴다면 4가지 모두 만족해야 함:

| # | 항목 | 이유 |
|---|------|------|
| 1 | **`status: 200` + body `"ok"`** | 모바일 브라우저 호환 (204 금지) |
| 2 | **`Access-Control-Allow-Methods` 명시** (`POST, OPTIONS` 등) | 일부 모바일은 누락 시 preflight 거부 |
| 3 | **`Access-Control-Allow-Origin` echo + `"*"` fallback** | PWA·www variant·인앱 브라우저 origin mismatch 회피 |
| 4 | **`Access-Control-Allow-Headers`에 `authorization, content-type, x-client-info, apikey` 최소 포함** | supabase-js가 보내는 헤더 |

권장 헬퍼:

```ts
function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}
```

## 🧪 배포 후 즉시 검증

**PC 정상 작동 = 모바일 정상 작동 아님**. EF 배포 후엔 반드시 모바일에서 한 번 호출 확인. 특히:

- 삼성 인터넷 (한국 사용자 다수)
- 모바일 Chrome / Edge
- iOS Safari (별도 제약 추가)

검증 방법:
1. `curl -X OPTIONS https://{ref}.supabase.co/functions/v1/{name} -H "Origin: https://soridamhub.com" -D -` — 응답 status가 200인지 확인
2. 실제 모바일 디바이스에서 한 번 호출
3. Dashboard EF Logs에서 OPTIONS + POST 페어가 정상으로 도착하는지 확인 (OPTIONS만 있고 POST 없으면 모바일에서 preflight 거부)

## 📝 진단 과정 (회고 — 가설 진화)

이 사건은 **틀린 가설**을 여러 번 거쳐 진짜 원인에 도달했음. 향후 같은 함정 만났을 때 빠르게 진단하기 위한 기록:

| # | 가설 | 결과 |
|---|------|------|
| 1 | OpenAI Whisper API 측 일시 hang | 폐기 (PC는 정상 작동) |
| 2 | 모바일 webm 파일 손상 | 폐기 (Storage 파일 직접 들어서 정상 확인) |
| 3 | 사내망 SSL inspection으로 데이터 변조 | 폐기 (집 모바일도 동일 증상) |
| 4 | `Access-Control-Allow-Methods` 누락 단독 | 부분 원인 (보조 필요) |
| 5 | **OPTIONS status 204를 모바일이 preflight 실패로 처리** | ✅ **진짜 원인** |

**결정타 단서들**:
- Dashboard "Function Invocations"에 `talklish-coach`가 **OPTIONS 1건만 + POST 0건** (다른 EF는 OPTIONS+POST 페어) → preflight 단계에서 본 요청이 차단됐다는 명백한 증거
- 잘 작동하는 다른 EF와 CORS 코드 비교 → 자체 함수는 `status: 204`, 표준은 `status: 200`
- EF preflight 응답을 `curl -X OPTIONS`로 직접 호출해서 헤더 자체는 정상임 확인 → 클라이언트 측 거부

## 🛠 패치 내역 (2026-05-28)

같은 함정에 빠져 있던 4개 EF 일괄 수정:

| EF | 변경 | 영향 |
|------|------|------|
| `talklish-coach` | status 204→200 + Allow-Methods 추가 + origin echo | Talklish 수요일 모듈 모바일 |
| `opic-study-feedback` | status 204→200 | 오픽 스터디 답변 코칭 모바일 |
| `opic-study-guide` | status 204→200 | 오픽 스터디 가이드 모바일 |
| `talklish-guide` | status 204→200 | Talklish 콤보 가이드 모바일 |

## 🔗 관련

- 표준 CORS: [supabase/functions/_shared/cors.ts](../supabase/functions/_shared/cors.ts)
- Supabase 공식 EF CORS 예시: https://supabase.com/docs/guides/functions/cors

---
*작성: 2026-05-28 / 사건 해결 commit [`08239dd`](https://github.com/Storm-Boy777/soridam/commit/08239dd)*
