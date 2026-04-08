"use server";

import { requireAdmin } from "@/lib/auth";
import { T } from "@/lib/constants/tables";
import type { AdminOrder, RevenueStats, PaginatedResult } from "@/lib/types/admin";

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
    .select("*", { count: "exact" });

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

  const [allPaidRes, thisMonthRes, lastMonthRes, allPaidForDist] = await Promise.all([
    supabase.from(T.polar_orders).select("amount").eq("status", "paid"),
    supabase.from(T.polar_orders).select("amount").eq("status", "paid").gte("created_at", thisMonthStart),
    supabase.from(T.polar_orders).select("amount").eq("status", "paid").gte("created_at", lastMonthStart).lte("created_at", lastMonthEnd),
    supabase.from(T.polar_orders).select("product_type, amount").eq("status", "paid"),
  ]);

  const totalRevenue = (allPaidRes.data || []).reduce((sum, o) => sum + (o.amount || 0), 0);
  const thisMonth = (thisMonthRes.data || []).reduce((sum, o) => sum + (o.amount || 0), 0);
  const lastMonth = (lastMonthRes.data || []).reduce((sum, o) => sum + (o.amount || 0), 0);
  const monthGrowth = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;

  const distMap = new Map<string, { productName: string; count: number; revenue: number }>();
  for (const o of allPaidForDist.data || []) {
    const pid = o.product_type || "unknown";
    const existing = distMap.get(pid);
    if (existing) {
      existing.count += 1;
      existing.revenue += o.amount || 0;
    } else {
      distMap.set(pid, { productName: pid, count: 1, revenue: o.amount || 0 });
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
