"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { T } from "@/lib/constants/tables";
import type {
  SupportPost,
  SupportComment,
  SupportCategory,
  SupportStatus,
  FeedbackSort,
} from "@/lib/types/support";

type ActionResult<T = null> = {
  error?: string;
  data?: T;
};

// ── 헬퍼 ──

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다");
  return { supabase, userId: user.id };
}

async function getOptionalUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id || null };
}

// ── 공지사항 ──

export interface ActiveAnnouncement {
  id: string;
  title: string;
  content: string;
  type: string;
  target_audience: string;
  created_at: string;
}

export async function getAllAnnouncements(): Promise<
  ActionResult<ActiveAnnouncement[]>
> {
  const { supabase } = await getOptionalUser();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from(T.announcements)
    .select("id, title, content, type, target_audience, created_at")
    .eq("is_active", true)
    .or(`end_at.is.null,end_at.gt.${now}`)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { data: (data || []) as ActiveAnnouncement[] };
}

// ── 피드백 보드 (공개 글) ──

export async function getFeedbackPosts(params: {
  category?: SupportCategory;
  sort?: FeedbackSort;
  page?: number;
  limit?: number;
}): Promise<ActionResult<{ posts: SupportPost[]; total: number }>> {
  const { supabase } = await getOptionalUser();
  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from(T.support_posts)
    .select("*, profiles(display_name)", { count: "exact" })
    .eq("visibility", "public");

  if (params.category) {
    query = query.eq("category", params.category);
  }

  // 고정글 우선, 그 다음 정렬
  if (params.sort === "votes") {
    query = query
      .order("is_pinned", { ascending: false })
      .order("vote_count", { ascending: false })
      .order("created_at", { ascending: false });
  } else {
    query = query
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1);

  if (error) return { error: error.message };
  return {
    data: { posts: (data || []) as SupportPost[], total: count || 0 },
  };
}

// ── 상세 조회 ──

export async function getPostDetail(
  postId: number
): Promise<ActionResult<SupportPost & { comments: SupportComment[] }>> {
  const { supabase } = await getOptionalUser();

  // 글 조회
  const { data: post, error: postError } = await supabase
    .from(T.support_posts)
    .select("*, profiles(display_name)")
    .eq("id", postId)
    .single();

  if (postError || !post) return { error: "글을 찾을 수 없습니다" };

  // 댓글 조회
  const { data: comments } = await supabase
    .from(T.support_comments)
    .select("*, profiles(display_name)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  return {
    data: {
      ...(post as SupportPost),
      comments: (comments || []) as SupportComment[],
    },
  };
}

// ── 글 작성 ──

export async function createPost(params: {
  category: SupportCategory;
  title: string;
  content: string;
}): Promise<ActionResult<{ id: number }>> {
  const { supabase, userId } = await requireUser();

  const visibility =
    ["bug", "suggestion", "question"].includes(params.category)
      ? "public"
      : "private";

  const { data, error } = await supabase
    .from(T.support_posts)
    .insert({
      user_id: userId,
      category: params.category,
      visibility,
      title: params.title,
      content: params.content,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { data: { id: data.id } };
}

// ── 글 수정 (본인만) ──

export async function updatePost(
  postId: number,
  params: { title?: string; content?: string }
): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();

  const { error } = await supabase
    .from(T.support_posts)
    .update(params)
    .eq("id", postId)
    .eq("user_id", userId);

  if (error) return { error: error.message };
  return {};
}

// ── 댓글 작성 ──

export async function createComment(params: {
  post_id: number;
  content: string;
}): Promise<ActionResult<{ id: number }>> {
  const { supabase, userId } = await requireUser();

  const { data, error } = await supabase
    .from(T.support_comments)
    .insert({
      post_id: params.post_id,
      user_id: userId,
      content: params.content,
      is_admin_reply: false,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { data: { id: data.id } };
}

// ── 공감 토글 ──

export async function toggleVote(
  postId: number
): Promise<ActionResult<{ voted: boolean }>> {
  const { supabase, userId } = await requireUser();

  // 기존 투표 확인
  const { data: existing } = await supabase
    .from(T.support_votes)
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    // 이미 투표 → 취소
    const { error } = await supabase
      .from(T.support_votes)
      .delete()
      .eq("id", existing.id);
    if (error) return { error: error.message };
    return { data: { voted: false } };
  } else {
    // 새 투표
    const { error } = await supabase
      .from(T.support_votes)
      .insert({ post_id: postId, user_id: userId });
    if (error) return { error: error.message };
    return { data: { voted: true } };
  }
}

// ── 내 투표 상태 조회 ──

export async function getMyVotes(
  postIds: number[]
): Promise<ActionResult<number[]>> {
  if (postIds.length === 0) return { data: [] };

  const { supabase, userId } = await requireUser();

  const { data, error } = await supabase
    .from(T.support_votes)
    .select("post_id")
    .eq("user_id", userId)
    .in("post_id", postIds);

  if (error) return { error: error.message };
  return { data: (data || []).map((v) => v.post_id) };
}

// ── 내 1:1 문의 목록 ──

export async function getMyInquiries(): Promise<ActionResult<SupportPost[]>> {
  const { supabase, userId } = await requireUser();

  const { data, error } = await supabase
    .from(T.support_posts)
    .select("*, profiles(display_name)")
    .eq("user_id", userId)
    .eq("visibility", "private")
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { data: (data || []) as SupportPost[] };
}
