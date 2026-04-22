"use server";

import { requireAdmin } from "@/lib/auth";
import { T } from "@/lib/constants/tables";

// 설정 키 타입
export type SettingKey =
  | "maintenance_mode"
  | "payment_provider"
  | "welcome_credit_cents"
  | "signup_enabled"
  | "signup_google_enabled"
  | "signup_kakao_enabled"
  | "signup_email_enabled"
  | "signup_email_whitelist"
  | "signup_invited_emails"
  | "site_notice"
  | "site_name"
  | "site_description"
  | "og_image_url"
  | "attendance_event_title"
  | "attendance_event_subtitle";

export type SettingsMap = Record<SettingKey, unknown>;

// 가입 채널 설정 조회 (비인증 접근 가능 — 가입/로그인 페이지용)
export interface SignupSettings {
  googleEnabled: boolean;
  kakaoEnabled: boolean;
  emailEnabled: boolean;
  emailWhitelist: string[]; // 허용 도메인 배열
  invitedEmails: string[]; // 초대 이메일 (도메인 제한 우회)
}

export async function getSignupSettings(): Promise<SignupSettings> {
  const { createServerSupabaseClient } = await import("@/lib/supabase-server");
  const supabase = await createServerSupabaseClient();

  const keys = ["signup_google_enabled", "signup_kakao_enabled", "signup_email_enabled", "signup_email_whitelist", "signup_invited_emails"];
  const { data } = await supabase
    .from(T.system_settings)
    .select("key, value")
    .in("key", keys);

  const map: Record<string, unknown> = {};
  for (const row of data || []) map[row.key] = row.value;

  const whitelist = String(map.signup_email_whitelist ?? "").trim();
  const invited = String(map.signup_invited_emails ?? "").trim();

  return {
    googleEnabled: map.signup_google_enabled === true,
    kakaoEnabled: map.signup_kakao_enabled === true,
    emailEnabled: map.signup_email_enabled !== false,
    emailWhitelist: whitelist ? whitelist.split(",").map((d) => d.trim().toLowerCase()).filter(Boolean) : [],
    invitedEmails: invited ? invited.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean) : [],
  };
}

// 전체 설정 조회
export async function getSettings(): Promise<SettingsMap> {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from(T.system_settings)
    .select("key, value");

  const settings: Record<string, unknown> = {};
  for (const row of data || []) {
    settings[row.key] = row.value;
  }
  return settings as SettingsMap;
}

// 개별 설정 업데이트
export async function updateSetting(
  key: SettingKey,
  value: unknown
): Promise<{ success: boolean; error?: string }> {
  const { supabase, userId, userEmail } = await requireAdmin();

  const { error } = await supabase
    .from(T.system_settings)
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });

  if (error) {
    return { success: false, error: error.message };
  }

  // 감사 로그
  await supabase.from(T.admin_audit_log).insert({
    admin_id: userId,
    admin_email: userEmail,
    action: "setting_update",
    target_type: "system_settings",
    target_id: key,
    details: { key, value },
  });

  return { success: true };
}
