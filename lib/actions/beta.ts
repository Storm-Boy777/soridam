"use server";

// 베타 상태 조회 (사용자 측) — 관리자 초대 베타 전용

import { getUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { T } from "@/lib/constants/tables";

// 본인 베타 활성 여부 조회
export async function getBetaStatus(): Promise<{ isActive: boolean }> {
  const user = await getUser();
  if (!user) return { isActive: false };

  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from(T.beta_applications)
    .select("status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  return { isActive: !!data };
}
