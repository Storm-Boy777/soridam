"use server";

import { requireAdmin } from "@/lib/auth";
import { T } from "@/lib/constants/tables";

// 설정 키 타입
export type SettingKey =
  | "maintenance_mode"
  | "payment_provider"
  | "welcome_credit_cents"
  | "signup_enabled"
  | "site_notice"
  | "site_name"
  | "site_description"
  | "og_image_url";

export type SettingsMap = Record<SettingKey, unknown>;

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
    .update({ value, updated_at: new Date().toISOString() })
    .eq("key", key);

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
