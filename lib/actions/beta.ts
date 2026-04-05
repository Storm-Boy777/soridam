"use server";

// 오픈 베타 신청/상태 조회 (사용자 측)

import { createClient } from "@supabase/supabase-js";
import { getUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase-server";

// ── 베타 신청 ──

export async function applyBeta(kakaoNickname: string) {
  const user = await getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  const trimmed = kakaoNickname.trim();
  if (!trimmed || trimmed.length < 1 || trimmed.length > 50) {
    return { error: "카카오톡 닉네임을 입력해주세요 (1~50자)" };
  }

  const supabase = await createServerSupabaseClient();

  // 현재 플랜 확인 — free만 신청 가능
  const { data: credits } = await supabase
    .from("user_credits")
    .select("current_plan")
    .eq("user_id", user.id)
    .single();

  if (!credits || credits.current_plan !== "free") {
    return { error: "무료 플랜 사용자만 베타에 신청할 수 있습니다" };
  }

  // 잔여 자리 확인
  const { data: stats } = await supabase.rpc("get_beta_stats");
  if (stats && stats.remaining <= 0) {
    return { error: "베타 정원(100명)이 마감되었습니다" };
  }

  // 신청 INSERT (UNIQUE 제약으로 중복 방지)
  const { error: insertErr } = await supabase
    .from("beta_applications")
    .insert({ user_id: user.id, kakao_nickname: trimmed });

  if (insertErr) {
    if (insertErr.code === "23505") {
      return { error: "이미 베타를 신청하셨습니다" };
    }
    return { error: "신청 중 오류가 발생했습니다" };
  }

  // 소리담 닉네임 통일 (오픈채팅 = 네비바 = profiles = 관리자 표시)
  await supabase
    .from("profiles")
    .update({ display_name: trimmed })
    .eq("id", user.id);

  // user_metadata.display_name도 업데이트 (네비바 표시용, service role 필요)
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  await adminClient.auth.admin.updateUserById(user.id, {
    user_metadata: { display_name: trimmed },
  });

  return { success: true };
}

// ── 본인 베타 신청 상태 조회 ──

export async function getBetaStatus() {
  const user = await getUser();
  if (!user) return { status: null as string | null };

  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("beta_applications")
    .select("status, rejected_reason")
    .eq("user_id", user.id)
    .single();

  if (!data) return { status: null };
  return { status: data.status, rejectedReason: data.rejected_reason };
}

// ── 잔여 자리 수 ──

export async function getBetaRemainingSlots(): Promise<number> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.rpc("get_beta_stats");
  return data?.remaining ?? 0;
}
