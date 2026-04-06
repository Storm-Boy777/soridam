"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { T } from "@/lib/constants/tables";

// 사용자 활동 기록 (로그인/로그아웃/모듈 사용)
export async function logUserActivity(action: string, metadata?: Record<string, unknown>) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // SA에서 쿠키 설정 불필요
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from(T.user_activity_log).insert({
    user_id: user.id,
    action,
    metadata: metadata || {},
  });
}
