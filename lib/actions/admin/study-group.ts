"use server";

import { requireAdmin } from "@/lib/auth";
import { T } from "@/lib/constants/tables";
import type { PodcastRow, FreetalkRow, GameCardRow, GameCardGameType } from "@/lib/types/study-group";

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
