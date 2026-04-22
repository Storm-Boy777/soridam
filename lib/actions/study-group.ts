"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { T } from "@/lib/constants/tables";
import type { PodcastRow, FreetalkRow, GameCardRow, GameCardGameType } from "@/lib/types/study-group";

// 팟캐스트 목록 (활성만, sort_order 순)
export async function fetchPodcasts(): Promise<PodcastRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from(T.study_podcasts)
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (error) return [];
  return data as PodcastRow[];
}

// 프리토킹 주제 (활성만, 카테고리 필터 선택적)
export async function fetchFreetalkTopics(category?: string): Promise<FreetalkRow[]> {
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from(T.study_freetalk)
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (category) {
    query = query.eq("category", category);
  }
  const { data, error } = await query;
  if (error) return [];
  return data as FreetalkRow[];
}

// 게임 카드 (활성만, game_type 필터)
export async function fetchGameCards(gameType: GameCardGameType): Promise<GameCardRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from(T.study_game_cards)
    .select("*")
    .eq("is_active", true)
    .eq("game_type", gameType)
    .order("sort_order");
  if (error) return [];
  return data as GameCardRow[];
}
