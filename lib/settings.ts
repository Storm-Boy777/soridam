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
