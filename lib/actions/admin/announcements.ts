"use server";

import { requireAdmin } from "@/lib/auth";

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  target_audience: string;
  is_active: boolean;
  start_at: string;
  end_at: string | null;
  created_at: string;
  updated_at: string;
}

// 공지사항 목록
export async function getAnnouncements(): Promise<Announcement[]> {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });
  return (data || []) as Announcement[];
}

// 공지사항 생성
export async function createAnnouncement(params: {
  title: string;
  content: string;
  type: string;
  target_audience: string;
  end_at?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { supabase, userId } = await requireAdmin();

  const { error } = await supabase.from("announcements").insert({
    title: params.title,
    content: params.content,
    type: params.type,
    target_audience: params.target_audience,
    end_at: params.end_at || null,
    created_by: userId,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// 공지사항 수정
export async function updateAnnouncement(
  id: string,
  params: Partial<{ title: string; content: string; type: string; target_audience: string; is_active: boolean; end_at: string | null }>
): Promise<{ success: boolean; error?: string }> {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("announcements")
    .update({ ...params, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// 공지사항 삭제
export async function deleteAnnouncement(id: string): Promise<{ success: boolean; error?: string }> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
