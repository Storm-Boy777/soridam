"use server";

import { requireAdmin } from "@/lib/auth";
import type { PaginatedResult } from "@/lib/types/admin";

// ── 질문 DB 목록 ──

export async function getAdminQuestions(params: {
  page?: number;
  pageSize?: number;
  topic?: string;
  category?: string;
}) {
  const { supabase } = await requireAdmin();
  const page = params.page || 1;
  const pageSize = params.pageSize || 30;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("questions")
    .select("id, topic, category, question_short, question_type_kor, survey_type", { count: "exact" });

  if (params.topic) query = query.eq("topic", params.topic);
  if (params.category) query = query.eq("category", params.category);

  const { data, count } = await query
    .order("topic")
    .order("id")
    .range(offset, offset + pageSize - 1);

  return { data: data || [], total: count || 0, page, pageSize };
}

// ── 프롬프트 템플릿 CRUD ──

export async function getPromptTemplates() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("ai_prompt_templates")
    .select("id, template_id, prompt_name, system_prompt, user_template, model, temperature, max_tokens, is_active")
    .order("id");
  // PromptEditor에 맞게 변환: system_prompt + user_template를 각각 편집 가능하게
  return (data || []).flatMap((row) => [
    ...(row.system_prompt
      ? [{ id: `${row.id}_system`, name: `${row.prompt_name} — System`, content: row.system_prompt }]
      : []),
    ...(row.user_template
      ? [{ id: `${row.id}_user`, name: `${row.prompt_name} — User Template`, content: row.user_template }]
      : []),
  ]);
}

export async function updatePromptTemplate(id: string, content: string) {
  const { supabase, userId, userEmail } = await requireAdmin();

  // id 형식: "{실제id}_{system|user}" — 검증
  const match = id.match(/^(\d+)_(system|user)$/);
  if (!match) {
    return { success: false, error: "유효하지 않은 프롬프트 ID 형식입니다" };
  }
  const [, realId, type] = match;
  const column = type === "system" ? "system_prompt" : "user_template";

  // 변경 전 값 저장
  const { data: before } = await supabase
    .from("ai_prompt_templates")
    .select(column)
    .eq("id", realId)
    .single();

  const { error } = await supabase
    .from("ai_prompt_templates")
    .update({ [column]: content, updated_at: new Date().toISOString() })
    .eq("id", realId);

  if (error) return { success: false, error: error.message };

  // 감사 로그
  await supabase.from("admin_audit_log").insert({
    admin_id: userId,
    admin_email: userEmail,
    action: "prompt_update",
    target_type: "prompt_template",
    target_id: id,
    details: {
      column,
      content_length_before: (before as Record<string, string>)?.[column]?.length || 0,
      content_length_after: content.length,
    },
  });

  return { success: true };
}

// ── 학습 팁 CRUD ──

export async function getOpicTips(params: {
  page?: number;
  pageSize?: number;
}) {
  const { supabase } = await requireAdmin();
  const page = params.page || 1;
  const pageSize = params.pageSize || 30;
  const offset = (page - 1) * pageSize;

  const { data, count } = await supabase
    .from("opic_tips")
    .select("*", { count: "exact" })
    .order("category")
    .order("question_type")
    .range(offset, offset + pageSize - 1);

  return { data: data || [], total: count || 0, page, pageSize };
}

export async function updateOpicTip(id: string, updates: { title?: string; content?: string }) {
  const { supabase, userId, userEmail } = await requireAdmin();

  const { error } = await supabase
    .from("opic_tips")
    .update(updates)
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  await supabase.from("admin_audit_log").insert({
    admin_id: userId,
    admin_email: userEmail,
    action: "tip_update",
    target_type: "opic_tip",
    target_id: id,
    details: updates,
  });

  return { success: true };
}

// ── 평가 프롬프트 ──

export async function getEvalPrompts() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("evaluation_prompts")
    .select("id, key, content, description, is_active")
    .order("key");
  // PromptEditor 형식으로 변환
  return (data || []).map((row) => ({
    id: row.id,
    name: row.description || row.key,
    content: row.content || "",
  }));
}

export async function updateEvalPrompt(id: string, content: string) {
  const { supabase, userId, userEmail } = await requireAdmin();

  const { error } = await supabase
    .from("evaluation_prompts")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  await supabase.from("admin_audit_log").insert({
    admin_id: userId,
    admin_email: userEmail,
    action: "eval_prompt_update",
    target_type: "evaluation_prompt",
    target_id: id,
    details: { content_length: content.length },
  });

  return { success: true };
}

// ── 스크립트 규격서 ──

export async function getScriptSpecs(params: {
  page?: number;
  pageSize?: number;
}) {
  const { supabase } = await requireAdmin();
  const page = params.page || 1;
  const pageSize = params.pageSize || 30;
  const offset = (page - 1) * pageSize;

  const { data, count } = await supabase
    .from("script_specs")
    .select("*", { count: "exact" })
    .order("target_level")
    .order("question_type")
    .range(offset, offset + pageSize - 1);

  return { data: data || [], total: count || 0, page, pageSize };
}

// ── 모의고사 평가 설정 ──

export async function getEvalSettings() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("mock_test_eval_settings")
    .select("*")
    .limit(1)
    .single();
  return data;
}

// ── 프롬프트 변경 이력 ──

export async function getPromptHistory(promptId: string): Promise<Array<{
  id: number;
  admin_email: string;
  changed_at: string;
  details: Record<string, unknown>;
}>> {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("admin_audit_log")
    .select("id, admin_id, details, created_at")
    .eq("action", "prompt_update")
    .eq("target_id", promptId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!data || data.length === 0) return [];

  // admin 이메일 조회
  const adminIds = [...new Set(data.map((d) => d.admin_id))];
  const emailMap = new Map<string, string>();
  for (const id of adminIds) {
    const { data: u } = await supabase.auth.admin.getUserById(id);
    if (u?.user?.email) emailMap.set(id, u.user.email);
  }

  return data.map((d) => ({
    id: d.id,
    admin_email: emailMap.get(d.admin_id) || d.admin_id.slice(0, 8),
    changed_at: d.created_at,
    details: d.details || {},
  }));
}

export async function updateEvalSettings(updates: Record<string, unknown>) {
  const { supabase, userId, userEmail } = await requireAdmin();

  const { data: current } = await supabase
    .from("mock_test_eval_settings")
    .select("*")
    .limit(1)
    .single();

  if (!current) return { success: false, error: "설정 레코드 없음" };

  const { error } = await supabase
    .from("mock_test_eval_settings")
    .update(updates)
    .eq("id", current.id);

  if (error) return { success: false, error: error.message };

  await supabase.from("admin_audit_log").insert({
    admin_id: userId,
    admin_email: userEmail,
    action: "eval_settings_update",
    target_type: "eval_settings",
    target_id: current.id,
    details: updates,
  });

  return { success: true };
}
