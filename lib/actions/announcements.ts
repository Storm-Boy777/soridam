"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { T } from "@/lib/constants/tables";
import { getUser } from "@/lib/auth";

export interface ActiveAnnouncement {
  id: string;
  title: string;
  content: string;
  type: "notice" | "maintenance" | "event" | "update";
  target_audience: string;
}

export async function getActiveAnnouncements(): Promise<ActiveAnnouncement[]> {
  const supabase = await createServerSupabaseClient();

  const now = new Date().toISOString();
  const { data } = await supabase
    .from(T.announcements)
    .select("id, title, content, type, target_audience")
    .eq("is_active", true)
    .or(`end_at.is.null,end_at.gt.${now}`)
    .order("created_at", { ascending: false });

  if (!data || data.length === 0) return [];

  // 대상자 필터링
  const user = await getUser();
  let userPlan = "free";

  if (user) {
    const { data: credits } = await supabase
      .from(T.user_credits)
      .select("current_plan")
      .eq("user_id", user.id)
      .single();
    userPlan = credits?.current_plan || "free";
  }

  return (data as ActiveAnnouncement[]).filter((a) => {
    if (a.target_audience === "all") return true;
    if (!user) return false;
    if (a.target_audience === "free" && userPlan === "free") return true;
    if (a.target_audience === "paid" && userPlan !== "free") return true;
    return false;
  });
}
