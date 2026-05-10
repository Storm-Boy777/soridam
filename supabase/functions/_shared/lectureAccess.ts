// 강의 접근 권한 헬퍼 (Edge Function 공통)
// 관리자 또는 lecture_access 보유자만 접근 허용

import type { SupabaseClient, User } from "https://esm.sh/@supabase/supabase-js@2";

export async function checkLectureAccess(
  supabase: SupabaseClient,
  user: User
): Promise<boolean> {
  // 관리자 자동 통과
  if (user.app_metadata?.role === "admin") return true;

  const { data } = await supabase
    .from("lecture_access")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return !!data;
}
