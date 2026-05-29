"use server";

import { requireAdmin } from "@/lib/auth";
import { T } from "@/lib/constants/tables";
import { RPC } from "@/lib/constants/tables";
import type { PodcastRow, FreetalkRow, GameCardRow, GameCardGameType, PanelMember, PanelMemberWithProfile, PanelUserSearchResult, YoutubeChannelRow } from "@/lib/types/study-group";

/* ══════════════════════════════════════════
   팟캐스트 CRUD
   ══════════════════════════════════════════ */

export async function getAdminPodcasts(): Promise<PodcastRow[]> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from(T.study_podcasts)
    .select("*")
    .order("sort_order");
  if (error) return [];
  return data as PodcastRow[];
}

export async function createPodcast(input: Omit<PodcastRow, "id" | "created_by" | "created_at" | "updated_at">) {
  const { supabase, userId, userEmail } = await requireAdmin();
  const { data, error } = await supabase
    .from(T.study_podcasts)
    .insert({ ...input, created_by: userId })
    .select()
    .single();
  if (error) return { success: false, error: error.message };
  await supabase.from(T.admin_audit_log).insert({
    admin_id: userId, admin_email: userEmail,
    action: "create_study_podcast", target_type: "study_podcast", target_id: data.id,
    details: { title: input.title },
  });
  return { success: true, data };
}

export async function updatePodcast(id: string, input: Partial<Omit<PodcastRow, "id" | "created_by" | "created_at" | "updated_at">>) {
  const { supabase, userId, userEmail } = await requireAdmin();
  const { error } = await supabase
    .from(T.study_podcasts)
    .update(input)
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  await supabase.from(T.admin_audit_log).insert({
    admin_id: userId, admin_email: userEmail,
    action: "update_study_podcast", target_type: "study_podcast", target_id: id,
    details: { fields: Object.keys(input) },
  });
  return { success: true };
}

export async function deletePodcast(id: string) {
  const { supabase, userId, userEmail } = await requireAdmin();
  const { error } = await supabase
    .from(T.study_podcasts)
    .delete()
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  await supabase.from(T.admin_audit_log).insert({
    admin_id: userId, admin_email: userEmail,
    action: "delete_study_podcast", target_type: "study_podcast", target_id: id,
    details: {},
  });
  return { success: true };
}

/* ══════════════════════════════════════════
   월요일 유튜버 채널 바로가기 CRUD (096)
   ══════════════════════════════════════════ */

export async function getAdminYoutubeChannels(): Promise<YoutubeChannelRow[]> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from(T.talklish_youtube_channels)
    .select("*")
    .order("sort_order");
  if (error) return [];
  return data as YoutubeChannelRow[];
}

export async function createYoutubeChannel(input: { name: string; channel_url: string; sort_order?: number; is_active?: boolean }) {
  const { supabase, userId } = await requireAdmin();
  const { data, error } = await supabase
    .from(T.talklish_youtube_channels)
    .insert({
      name: input.name,
      channel_url: input.channel_url,
      sort_order: input.sort_order ?? 0,
      is_active: input.is_active ?? true,
      created_by: userId,
    })
    .select()
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function updateYoutubeChannel(
  id: string,
  input: Partial<{ name: string; channel_url: string; sort_order: number; is_active: boolean }>
) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from(T.talklish_youtube_channels)
    .update(input)
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteYoutubeChannel(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from(T.talklish_youtube_channels)
    .delete()
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/* ══════════════════════════════════════════
   프리토킹 CRUD
   ══════════════════════════════════════════ */

export async function getAdminFreetalk(): Promise<FreetalkRow[]> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from(T.study_freetalk)
    .select("*")
    .order("sort_order");
  if (error) return [];
  return data as FreetalkRow[];
}

export async function createFreetalk(input: Omit<FreetalkRow, "id" | "created_by" | "created_at" | "updated_at">) {
  const { supabase, userId, userEmail } = await requireAdmin();
  const { data, error } = await supabase
    .from(T.study_freetalk)
    .insert({ ...input, created_by: userId })
    .select()
    .single();
  if (error) return { success: false, error: error.message };
  await supabase.from(T.admin_audit_log).insert({
    admin_id: userId, admin_email: userEmail,
    action: "create_study_freetalk", target_type: "study_freetalk", target_id: data.id,
    details: { english: input.english.substring(0, 50) },
  });
  return { success: true, data };
}

export async function updateFreetalk(id: string, input: Partial<Omit<FreetalkRow, "id" | "created_by" | "created_at" | "updated_at">>) {
  const { supabase, userId, userEmail } = await requireAdmin();
  const { error } = await supabase
    .from(T.study_freetalk)
    .update(input)
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  await supabase.from(T.admin_audit_log).insert({
    admin_id: userId, admin_email: userEmail,
    action: "update_study_freetalk", target_type: "study_freetalk", target_id: id,
    details: { fields: Object.keys(input) },
  });
  return { success: true };
}

export async function deleteFreetalk(id: string) {
  const { supabase, userId, userEmail } = await requireAdmin();
  const { error } = await supabase
    .from(T.study_freetalk)
    .delete()
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  await supabase.from(T.admin_audit_log).insert({
    admin_id: userId, admin_email: userEmail,
    action: "delete_study_freetalk", target_type: "study_freetalk", target_id: id,
    details: {},
  });
  return { success: true };
}

/* ══════════════════════════════════════════
   게임 카드 CRUD
   ══════════════════════════════════════════ */

export async function getAdminGameCards(gameType?: GameCardGameType): Promise<GameCardRow[]> {
  const { supabase } = await requireAdmin();
  let query = supabase
    .from(T.study_game_cards)
    .select("*")
    .order("sort_order");
  if (gameType) {
    query = query.eq("game_type", gameType);
  }
  const { data, error } = await query;
  if (error) return [];
  return data as GameCardRow[];
}

export async function createGameCard(input: Omit<GameCardRow, "id" | "created_by" | "created_at" | "updated_at">) {
  const { supabase, userId, userEmail } = await requireAdmin();
  const { data, error } = await supabase
    .from(T.study_game_cards)
    .insert({ ...input, created_by: userId })
    .select()
    .single();
  if (error) return { success: false, error: error.message };
  await supabase.from(T.admin_audit_log).insert({
    admin_id: userId, admin_email: userEmail,
    action: "create_study_game_card", target_type: "study_game_card", target_id: data.id,
    details: { game_type: input.game_type },
  });
  return { success: true, data };
}

export async function updateGameCard(id: string, input: Partial<Omit<GameCardRow, "id" | "created_by" | "created_at" | "updated_at">>) {
  const { supabase, userId, userEmail } = await requireAdmin();
  const { error } = await supabase
    .from(T.study_game_cards)
    .update(input)
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  await supabase.from(T.admin_audit_log).insert({
    admin_id: userId, admin_email: userEmail,
    action: "update_study_game_card", target_type: "study_game_card", target_id: id,
    details: { fields: Object.keys(input) },
  });
  return { success: true };
}

export async function deleteGameCard(id: string) {
  const { supabase, userId, userEmail } = await requireAdmin();
  const { error } = await supabase
    .from(T.study_game_cards)
    .delete()
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  await supabase.from(T.admin_audit_log).insert({
    admin_id: userId, admin_email: userEmail,
    action: "delete_study_game_card", target_type: "study_game_card", target_id: id,
    details: {},
  });
  return { success: true };
}

/* ══════════════════════════════════════════
   패널 멤버 CRUD (Talklish 화면 표시용)
   ══════════════════════════════════════════ */

export async function getAdminPanelMembers(): Promise<PanelMemberWithProfile[]> {
  const { supabase } = await requireAdmin();
  const { data: rows, error } = await supabase
    .from(T.study_panel_members)
    .select("*")
    .order("sort_order");
  if (error || !rows) return [];

  // 분리 쿼리로 profiles join (RLS 재귀 방지 패턴)
  const userIds = (rows as PanelMember[])
    .map((r) => r.user_id)
    .filter((id): id is string => !!id);

  let profileMap = new Map<string, { email: string | null; display_name: string | null }>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from(T.profiles)
      .select("id, email, display_name")
      .in("id", userIds);
    profileMap = new Map(
      (profiles || []).map((p) => [
        p.id,
        { email: p.email ?? null, display_name: p.display_name ?? null },
      ])
    );
  }

  return (rows as PanelMember[]).map((r) => {
    const p = r.user_id ? profileMap.get(r.user_id) : null;
    return {
      ...r,
      email: p?.email ?? null,
      display_name: p?.display_name ?? null,
    };
  });
}

/** 이메일로 사용자 검색 — 패널 등록용 */
export async function searchUserForPanel(
  email: string
): Promise<{ user: PanelUserSearchResult | null; error?: string }> {
  if (!email.trim()) return { user: null, error: "이메일을 입력해주세요" };
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase.rpc(RPC.find_user_by_email, {
    p_email: email.trim().toLowerCase(),
  });
  if (error) return { user: null, error: "검색 중 오류가 발생했습니다" };
  if (!data || data.length === 0)
    return { user: null, error: "해당 이메일로 가입된 사용자가 없습니다" };

  const found = data[0] as { user_id: string; email: string; display_name: string | null };

  // 이미 등록된 멤버인지 확인
  const { data: existing } = await supabase
    .from(T.study_panel_members)
    .select("id")
    .eq("user_id", found.user_id)
    .maybeSingle();

  return {
    user: {
      user_id: found.user_id,
      email: found.email,
      display_name: found.display_name,
      is_already_member: !!existing,
    },
  };
}

export async function createPanelMember(
  input: Omit<PanelMember, "id" | "created_at" | "updated_at">
) {
  const { supabase, userId, userEmail } = await requireAdmin();
  const { data, error } = await supabase
    .from(T.study_panel_members)
    .insert(input)
    .select()
    .single();
  if (error) return { success: false, error: error.message };
  await supabase.from(T.admin_audit_log).insert({
    admin_id: userId, admin_email: userEmail,
    action: "create_panel_member", target_type: "study_panel_member", target_id: data.id,
    details: { name: input.name, user_id: input.user_id },
  });
  return { success: true, data };
}

export async function updatePanelMember(
  id: string,
  input: Partial<Omit<PanelMember, "id" | "created_at" | "updated_at">>
) {
  const { supabase, userId, userEmail } = await requireAdmin();
  const { error } = await supabase
    .from(T.study_panel_members)
    .update(input)
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  await supabase.from(T.admin_audit_log).insert({
    admin_id: userId, admin_email: userEmail,
    action: "update_panel_member", target_type: "study_panel_member", target_id: id,
    details: { fields: Object.keys(input) },
  });
  return { success: true };
}

export async function deletePanelMember(id: string) {
  const { supabase, userId, userEmail } = await requireAdmin();
  const { error } = await supabase
    .from(T.study_panel_members)
    .delete()
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  await supabase.from(T.admin_audit_log).insert({
    admin_id: userId, admin_email: userEmail,
    action: "delete_panel_member", target_type: "study_panel_member", target_id: id,
    details: {},
  });
  return { success: true };
}
