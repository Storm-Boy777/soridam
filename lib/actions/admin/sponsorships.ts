"use server";

import { requireAdmin } from "@/lib/auth";
import { T } from "@/lib/constants/tables";
import type { AdminSponsorship, SponsorshipStats, OneTimeSponsor } from "@/lib/types/admin";

// ── 후원 통계 ──

export async function getSponsorshipStats(): Promise<SponsorshipStats> {
  const { supabase } = await requireAdmin();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [activeRes, totalRes, monthRes] = await Promise.all([
    supabase
      .from(T.sponsorships)
      .select("amount_cents", { count: "exact" })
      .eq("status", "active"),
    supabase
      .from(T.polar_orders)
      .select("amount, product_type")
      .eq("status", "paid")
      .in("product_type", ["sponsor", "credit_sponsor"]),
    supabase
      .from(T.polar_orders)
      .select("amount, product_type")
      .eq("status", "paid")
      .in("product_type", ["sponsor", "credit_sponsor"])
      .gte("created_at", monthStart),
  ]);

  // 후원분 net 계산: 후원분 $5(500¢) - 수수료(3.9%+$0.40) = 440¢
  const SPONSOR_NET_CENTS = 500 - Math.round(500 * 0.039 + 40); // 440¢
  const sponsorPortion = () => SPONSOR_NET_CENTS;

  const activeSponsorCount = activeRes.count || 0;
  const totalRevenueCents = (totalRes.data || []).reduce((s, o) => s + sponsorPortion(o), 0);
  const monthlyRevenueCents = (monthRes.data || []).reduce((s, o) => s + sponsorPortion(o), 0);

  return { activeSponsorCount, monthlyRevenueCents, totalRevenueCents, avgAmountCents: 0 };
}

// ── 후원자 목록 ──

export async function getSponsorships(params: {
  page?: number;
  pageSize?: number;
  status?: string;
}): Promise<{ data: AdminSponsorship[]; total: number }> {
  const { supabase } = await requireAdmin();

  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from(T.sponsorships)
    .select(
      "id, user_id, creem_subscription_id, amount_cents, status, started_at, cancelled_at, current_period_end, profiles!inner(email, display_name)",
      { count: "exact" }
    )
    .order("started_at", { ascending: false })
    .range(from, to);

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  const { data, count } = await query;

  const sponsorships: AdminSponsorship[] = (data || []).map((r: Record<string, unknown>) => {
    const profile = r.profiles as { email: string; display_name: string | null } | null;
    return {
      id: r.id as string,
      user_id: r.user_id as string,
      email: profile?.email || "",
      display_name: profile?.display_name || null,
      creem_subscription_id: r.creem_subscription_id as string,
      amount_cents: r.amount_cents as number,
      status: r.status as string,
      started_at: r.started_at as string,
      cancelled_at: (r.cancelled_at as string) || null,
      current_period_end: (r.current_period_end as string) || null,
    };
  });

  return { data: sponsorships, total: count || 0 };
}

// ── 일회성 후원 (충전+후원) 목록 ──

export async function getOneTimeSponsors(params: {
  page?: number;
  pageSize?: number;
}): Promise<{ data: OneTimeSponsor[]; total: number }> {
  const { supabase } = await requireAdmin();

  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count } = await supabase
    .from(T.polar_orders)
    .select("id, user_id, amount, status, created_at, profiles!inner(email, display_name)", {
      count: "exact",
    })
    .eq("product_type", "credit_sponsor")
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .range(from, to);

  const sponsors: OneTimeSponsor[] = (data || []).map((r: Record<string, unknown>) => {
    const profile = r.profiles as { email: string; display_name: string | null } | null;
    return {
      id: r.id as string,
      user_id: r.user_id as string,
      email: profile?.email || "",
      display_name: profile?.display_name || null,
      amount_cents: 500 - Math.round(500 * 0.039 + 40), // net $4.40 (수수료 차감)
      paid_at: r.created_at as string,
    };
  });

  return { data: sponsors, total: count || 0 };
}
