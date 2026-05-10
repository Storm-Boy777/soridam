import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "./supabase-server";

// ── getUser(): Supabase 서버 검증 (34-43ms) ──
// 최신 데이터가 필요한 곳에 사용: 마이페이지 프로필, Server Actions
// React cache()로 동일 요청 내 1회만 호출
export const getUser = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

// ── getAuthClaims(): 로컬 JWT 검증 (JWKS 캐시 후 0ms) ──
// 표시용 컴포넌트에 사용: 대시보드 통계, 배너, 사이드 패널
// Asymmetric JWT (ES256) → WebCrypto로 로컬 서명 검증, 서버 왕복 없음
// Supabase 공식 API (supabase-js 2.49.4+, 정식 2.51.0+)
export const getAuthClaims = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) return null;
  return data.claims;
});

// ── getAdminUser(): 레이아웃용 관리자 확인 ──
// getUser() 후 app_metadata.role === 'admin' 확인
export const getAdminUser = cache(async () => {
  const user = await getUser();
  if (!user) return null;
  if (user.app_metadata?.role !== "admin") return null;
  return user;
});

// ── requireAdmin(): Server Actions용 관리자 인증 ──
// admin 아니면 에러 throw. 반환: { supabase (service client), userId }
export async function requireAdmin() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }
  if (user.app_metadata?.role !== "admin") {
    throw new Error("관리자 권한이 필요합니다");
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  return { supabase, userId: user.id, userEmail: user.email || "" };
}

// ── hasLectureAccess(): 네비게이션 노출 판단용 (조용한 boolean) ──
// 관리자 또는 lecture_access 보유자면 true. 비로그인은 false.
export const hasLectureAccess = cache(async () => {
  const user = await getUser();
  if (!user) return false;
  if (user.app_metadata?.role === "admin") return true;
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("lecture_access")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  return !!data;
});

// ── requireLectureAccess(): 강의 페이지 진입 게이트 ──
// 비로그인 → /login, 권한 없음 → /. 관리자는 자동 통과.
export async function requireLectureAccess() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }
  if (user.app_metadata?.role === "admin") return user;
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("lecture_access")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) {
    redirect("/");
  }
  return user;
}
