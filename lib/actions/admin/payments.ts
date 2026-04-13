"use server";

import { requireAdmin } from "@/lib/auth";
import { T } from "@/lib/constants/tables";
import type { AdminOrder, RevenueStats, PaginatedResult, ApiUsageLog } from "@/lib/types/admin";

// ── 주문 목록 조회 (polar_orders) ──

export async function getOrders(params: {
  page?: number;
  pageSize?: number;
  status?: string;
}): Promise<PaginatedResult<AdminOrder>> {
  const { supabase } = await requireAdmin();
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from(T.polar_orders)
    .select("*", { count: "exact" })
    .in("product_type", ["credit", "credit_sponsor"]);

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error || !data) {
    return { data: [], total: 0, page, pageSize };
  }

  // 사용자 정보 조인
  const userIds = [...new Set(data.map((o) => o.user_id))];
  const userMap = new Map<string, { email: string; name: string | null }>();

  if (userIds.length > 0) {
    const userResults = await Promise.all(
      userIds.map((uid) => supabase.auth.admin.getUserById(uid))
    );
    userResults.forEach((res, i) => {
      if (res.data?.user) {
        userMap.set(userIds[i], {
          email: res.data.user.email || "",
          name: res.data.user.user_metadata?.display_name || null,
        });
      }
    });
  }

  const orders: AdminOrder[] = data.map((o) => ({
    id: o.id,
    user_id: o.user_id,
    user_email: userMap.get(o.user_id)?.email || "-",
    user_name: userMap.get(o.user_id)?.name || null,
    product_name: o.product_type || "-",  // UI에서 PRODUCT_TYPE_LABELS로 매핑
    product_id: o.polar_product_id || "-",
    amount: o.amount || 0,
    status: o.status || "unknown",
    payment_id: o.polar_checkout_id || null,
    payment_provider: (o.polar_checkout_id || "").startsWith("creem_") ? "creem" : "polar",
    pg_tx_id: null,
    pay_method: null,
    paid_at: o.paid_at || null,
    receipt_url: null,
    created_at: o.created_at,
  }));

  return { data: orders, total: count || 0, page, pageSize };
}

// ── 매출 통계 (polar_orders) ──

export async function getRevenueStats(): Promise<RevenueStats> {
  const { supabase } = await requireAdmin();

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).toISOString();

  // 크레딧 충전 주문만 (sponsor 제외, credit + credit_sponsor의 크레딧분)
  const creditTypes = ["credit", "credit_sponsor"];

  const [allPaidRes, thisMonthRes, lastMonthRes, allPaidForDist] = await Promise.all([
    supabase.from(T.polar_orders).select("amount, product_type").eq("status", "paid").in("product_type", creditTypes),
    supabase.from(T.polar_orders).select("amount, product_type").eq("status", "paid").in("product_type", creditTypes).gte("created_at", thisMonthStart),
    supabase.from(T.polar_orders).select("amount, product_type").eq("status", "paid").in("product_type", creditTypes).gte("created_at", lastMonthStart).lte("created_at", lastMonthEnd),
    supabase.from(T.polar_orders).select("product_type, amount").eq("status", "paid").in("product_type", creditTypes),
  ]);

  // net 금액 계산: 결제액에서 수수료(3.9%+$0.40) 차감
  // credit_sponsor는 크레딧분($10=1000¢)만 기준
  const calcNetCredit = (o: { amount?: number; product_type?: string }) => {
    const creditPortion = o.product_type === "credit_sponsor" ? 1000 : (o.amount || 0);
    return creditPortion - Math.round(creditPortion * 0.039 + 40);
  };

  const totalRevenue = (allPaidRes.data || []).reduce((sum, o) => sum + calcNetCredit(o), 0);
  const thisMonth = (thisMonthRes.data || []).reduce((sum, o) => sum + calcNetCredit(o), 0);
  const lastMonth = (lastMonthRes.data || []).reduce((sum, o) => sum + calcNetCredit(o), 0);
  const monthGrowth = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;

  const distMap = new Map<string, { productName: string; count: number; revenue: number }>();
  for (const o of allPaidForDist.data || []) {
    const pid = o.product_type || "unknown";
    const existing = distMap.get(pid);
    const net = calcNetCredit(o);
    if (existing) {
      existing.count += 1;
      existing.revenue += net;
    } else {
      distMap.set(pid, { productName: pid, count: 1, revenue: net });
    }
  }

  const productDistribution = Array.from(distMap.entries())
    .map(([productId, v]) => ({
      productId,
      productName: v.productName,
      count: v.count,
      revenue: v.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return { totalRevenue, thisMonthRevenue: thisMonth, lastMonthRevenue: lastMonth, monthGrowth, productDistribution };
}

// ── 주문 환불 (Polar 대시보드에서 수동 환불 후 웹훅으로 처리) ──

export async function refundOrder(params: {
  orderId: string;
  reason: string;
}): Promise<{ success: boolean; error?: string }> {
  const { supabase, userId, userEmail } = await requireAdmin();

  const { data: order, error: orderErr } = await supabase
    .from(T.polar_orders)
    .select("*")
    .eq("id", params.orderId)
    .single();

  if (orderErr || !order) {
    return { success: false, error: "주문을 찾을 수 없습니다" };
  }

  if (order.status !== "paid") {
    return { success: false, error: "결제 완료 상태의 주문만 환불할 수 있습니다" };
  }

  // Polar는 대시보드에서 수동 환불 → 웹훅으로 자동 처리
  // 여기서는 DB 상태만 변경하고 감사 로그 기록
  const { error: updateErr } = await supabase
    .from(T.polar_orders)
    .update({ status: "refunded" })
    .eq("id", params.orderId);

  if (updateErr) {
    return { success: false, error: "주문 상태 업데이트 실패" };
  }

  // 크레딧 회수
  if (order.credit_amount > 0) {
    await supabase.rpc("polar_reverse_charge", {
      p_user_id: order.user_id,
      p_amount_cents: order.credit_amount,
      p_description: `관리자 환불: ${params.reason}`,
      p_ref_id: order.id,
    });
  }

  // 감사 로그
  await supabase.from(T.admin_audit_log).insert({
    admin_id: userId,
    admin_email: userEmail,
    action: "refund",
    target_type: "polar_order",
    target_id: params.orderId,
    details: {
      polar_checkout_id: order.polar_checkout_id,
      amount: order.amount,
      credit_amount: order.credit_amount,
      reason: params.reason,
    },
  });

  return { success: true };
}

// ── API 사용 이력 조회 ──

const ADMIN_USER_ID = "251b0655-6fd0-4566-bef2-57c07bb5dcd0";

export async function getApiUsageLogs(params: {
  page?: number;
  pageSize?: number;
  sessionType?: string;
}): Promise<PaginatedResult<ApiUsageLog>> {
  const { supabase } = await requireAdmin();
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from(T.api_usage_logs)
    .select("id, user_id, session_type, feature, service, model, tokens_in, tokens_out, cost_usd, created_at, profiles(email, display_name)", { count: "exact" })
    .neq("user_id", ADMIN_USER_ID);

  if (params.sessionType && params.sessionType !== "all") {
    query = query.eq("session_type", params.sessionType);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error || !data) {
    return { data: [], total: 0, page, pageSize };
  }

  const logs: ApiUsageLog[] = data.map((r: Record<string, unknown>) => {
    const profile = r.profiles as { email: string; display_name: string | null } | null;
    return {
      id: r.id as number,
      user_id: r.user_id as string,
      user_email: profile?.email || "",
      user_name: profile?.display_name || null,
      session_type: r.session_type as string,
      feature: (r.feature as string) || null,
      service: r.service as string,
      model: (r.model as string) || null,
      tokens_in: (r.tokens_in as number) || 0,
      tokens_out: (r.tokens_out as number) || 0,
      cost_usd: (r.cost_usd as number) || 0,
      created_at: r.created_at as string,
    };
  });

  return { data: logs, total: count || 0, page, pageSize };
}
