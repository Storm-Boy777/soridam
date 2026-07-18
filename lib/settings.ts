import { createClient } from "@supabase/supabase-js";

// 서버 사이드 전용 — system_settings 조회 (캐시 포함)
let cachedSettings: Record<string, unknown> | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 1분 캐시

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function getSiteSettings(): Promise<Record<string, unknown>> {
  const now = Date.now();
  if (cachedSettings && now - cacheTime < CACHE_TTL) {
    return cachedSettings;
  }

  const supabase = getServiceClient();
  const { data } = await supabase.from("system_settings").select("key, value");

  const settings: Record<string, unknown> = {};
  for (const row of data || []) {
    settings[row.key] = row.value;
  }

  cachedSettings = settings;
  cacheTime = now;
  return settings;
}

// 개별 설정값 편의 함수
export async function getSetting(key: string, fallback: unknown = null): Promise<unknown> {
  const settings = await getSiteSettings();
  return settings[key] ?? fallback;
}

// ── isPaymentEnabled(): 결제(크레딧 충전·후원) 활성화 여부 ──
//
// ⚠️ 위의 getSiteSettings()/getSetting()을 쓰면 안 된다.
//    60초 모듈 캐시에 무효화 훅이 없어서, 관리자가 토글을 꺼도
//    서버리스 인스턴스마다 최대 1분간 결제가 열린 채로 남는다.
//    결제 개시는 저빈도 이벤트라 매번 직접 조회해도 부담이 없다.
//
// 키가 없으면 true를 반환한다 — 마이그 108 미적용 상태로 배포됐을 때
// 결제가 조용히 죽는 사고를 막기 위한 폴백.
export async function isPaymentEnabled(): Promise<boolean> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "payment_enabled")
    .maybeSingle();

  // value는 jsonb — 'false'만 차단, 그 외(true/키 부재/조회 실패)는 허용
  return data?.value !== false;
}
