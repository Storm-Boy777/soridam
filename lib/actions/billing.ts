"use server";

import { getUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { T } from "@/lib/constants/tables";

// Creem Customer Portal URL 생성 (정기 후원 관리용)
export async function getCustomerPortalUrl(): Promise<{ url?: string; error?: string }> {
  const user = await getUser();
  if (!user) return { error: "Login required" };

  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from(T.polar_balances)
    .select("creem_customer_id")
    .eq("user_id", user.id)
    .single();

  const customerId = data?.creem_customer_id;
  if (!customerId) {
    return { error: "No billing history" };
  }

  const apiKey = process.env.CREEM_API_KEY;
  if (!apiKey) return { error: "Payment not configured" };

  const res = await fetch("https://api.creem.io/v1/customers/billing", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ customer_id: customerId }),
  });

  if (!res.ok) {
    console.error("[billing] Portal URL failed:", res.status, await res.text());
    return { error: "Failed to load billing portal" };
  }

  const result = await res.json();
  return { url: result.customer_portal_link };
}
