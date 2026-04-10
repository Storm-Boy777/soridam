"use server";

import { requireAdmin } from "@/lib/auth";
import { T } from "@/lib/constants/tables";
import type { SupportPost, SupportStatus } from "@/lib/types/support";

// ── 전체 게시물 조회 (관리자) ──

export async function getAdminPosts(params: {
  visibility?: "public" | "private";
  status?: SupportStatus;
  page?: number;
  limit?: number;
}): Promise<{
  data: SupportPost[];
  total: number;
}> {
  const { supabase } = await requireAdmin();
  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from(T.support_posts)
    .select("*, profiles(display_name)", { count: "exact" });

  if (params.visibility) {
    query = query.eq("visibility", params.visibility);
  }
  if (params.status) {
    query = query.eq("status", params.status);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[getAdminPosts]", error);
    return { data: [], total: 0 };
  }

  return { data: (data || []) as SupportPost[], total: count || 0 };
}

// ── 상태 변경 ──

export async function updatePostStatus(
  postId: number,
  status: SupportStatus
): Promise<{ success: boolean; error?: string }> {
  const { supabase, userId, userEmail } = await requireAdmin();

  const { error } = await supabase
    .from(T.support_posts)
    .update({ status })
    .eq("id", postId);

  if (error) return { success: false, error: error.message };

  await supabase.from(T.admin_audit_log).insert({
    admin_id: userId,
    admin_email: userEmail,
    action: "support_status_change",
    target_type: "support_post",
    target_id: String(postId),
    details: { new_status: status },
  });

  return { success: true };
}

// ── 고정/해제 ──

export async function togglePinPost(
  postId: number,
  pinned: boolean
): Promise<{ success: boolean; error?: string }> {
  const { supabase, userId, userEmail } = await requireAdmin();

  const { error } = await supabase
    .from(T.support_posts)
    .update({ is_pinned: pinned })
    .eq("id", postId);

  if (error) return { success: false, error: error.message };

  await supabase.from(T.admin_audit_log).insert({
    admin_id: userId,
    admin_email: userEmail,
    action: pinned ? "support_pin" : "support_unpin",
    target_type: "support_post",
    target_id: String(postId),
  });

  return { success: true };
}

// ── 삭제 ──

export async function deletePost(
  postId: number
): Promise<{ success: boolean; error?: string }> {
  const { supabase, userId, userEmail } = await requireAdmin();

  // 글 정보 먼저 조회 (로그용)
  const { data: post } = await supabase
    .from(T.support_posts)
    .select("title, category, user_id")
    .eq("id", postId)
    .single();

  const { error } = await supabase
    .from(T.support_posts)
    .delete()
    .eq("id", postId);

  if (error) return { success: false, error: error.message };

  await supabase.from(T.admin_audit_log).insert({
    admin_id: userId,
    admin_email: userEmail,
    action: "support_delete",
    target_type: "support_post",
    target_id: String(postId),
    details: post ? { title: post.title, category: post.category } : {},
  });

  return { success: true };
}

// ── 관리자 답변 ──

export async function createAdminReply(params: {
  post_id: number;
  content: string;
}): Promise<{ success: boolean; error?: string }> {
  const { supabase, userId } = await requireAdmin();

  const { error } = await supabase.from(T.support_comments).insert({
    post_id: params.post_id,
    user_id: userId,
    content: params.content,
    is_admin_reply: true,
  });

  if (error) return { success: false, error: error.message };

  // 상태가 open이면 자동으로 in_progress로 변경
  await supabase
    .from(T.support_posts)
    .update({ status: "in_progress" })
    .eq("id", params.post_id)
    .eq("status", "open");

  return { success: true };
}

// ── 댓글 삭제 ──

export async function deleteComment(
  commentId: number
): Promise<{ success: boolean; error?: string }> {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from(T.support_comments)
    .delete()
    .eq("id", commentId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
