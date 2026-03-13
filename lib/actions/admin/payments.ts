"use server";

import { requireAdmin } from "@/lib/auth";
import type { AdminOrder, RevenueStats, PaginatedResult } from "@/lib/types/admin";

// ── 주문 목록 조회 ──

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
    .from("orders")
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

  // 사용자 정보 조인 (병렬)
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
    product_name: o.order_name || o.product_name || "-",
    product_id: o.product_id || "-",
    amount: o.amount || 0,
    status: o.status || "unknown",
    payment_id: o.payment_id || null,
    pg_provider: o.pg_provider || null,
    pg_tx_id: o.pg_tx_id || null,
    pay_method: o.pay_method || null,
    paid_at: o.paid_at || null,
    receipt_url: o.receipt_url || null,
    created_at: o.created_at,
  }));

  return { data: orders, total: count || 0, page, pageSize };
}

// ── 매출 통계 ──

export async function getRevenueStats(): Promise<RevenueStats> {
  const { supabase } = await requireAdmin();

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).toISOString();

  // 4개 병렬 쿼리
  const [allPaidRes, thisMonthRes, lastMonthRes, allPaidForDist] = await Promise.all([
    // 1. 전체 매출
    supabase
      .from("orders")
      .select("amount")
      .eq("status", "paid"),
    // 2. 이번 달 매출
    supabase
      .from("orders")
      .select("amount")
      .eq("status", "paid")
      .gte("created_at", thisMonthStart),
    // 3. 지난 달 매출
    supabase
      .from("orders")
      .select("amount")
      .eq("status", "paid")
      .gte("created_at", lastMonthStart)
      .lte("created_at", lastMonthEnd),
    // 4. 전체 paid 주문 (상품별 집계용)
    supabase
      .from("orders")
      .select("product_id, order_name, amount")
      .eq("status", "paid"),
  ]);

  const totalRevenue = (allPaidRes.data || []).reduce((sum, o) => sum + (o.amount || 0), 0);
  const thisMonth = (thisMonthRes.data || []).reduce((sum, o) => sum + (o.amount || 0), 0);
  const lastMonth = (lastMonthRes.data || []).reduce((sum, o) => sum + (o.amount || 0), 0);
  const monthGrowth = lastMonth > 0
    ? ((thisMonth - lastMonth) / lastMonth) * 100
    : 0;

  // 상품별 분포 집계
  const distMap = new Map<string, { productName: string; count: number; revenue: number }>();
  for (const o of allPaidForDist.data || []) {
    const pid = o.product_id || "unknown";
    const existing = distMap.get(pid);
    if (existing) {
      existing.count += 1;
      existing.revenue += o.amount || 0;
    } else {
      distMap.set(pid, {
        productName: o.order_name || pid,
        count: 1,
        revenue: o.amount || 0,
      });
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

  return {
    totalRevenue,
    thisMonthRevenue: thisMonth,
    lastMonthRevenue: lastMonth,
    monthGrowth,
    productDistribution,
  };
}

// ── 주문 환불 ──

export async function refundOrder(params: {
  orderId: string;
  reason: string;
}): Promise<{ success: boolean; error?: string }> {
  const { supabase, userId, userEmail } = await requireAdmin();

  // 주문 조회
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("*")
    .eq("id", params.orderId)
    .single();

  if (orderErr || !order) {
    return { success: false, error: "주문을 찾을 수 없습니다" };
  }

  if (order.status !== "paid") {
    return { success: false, error: "결제 완료 상태의 주문만 환불할 수 있습니다" };
  }

  if (!order.payment_id) {
    return { success: false, error: "결제 ID가 없어 환불할 수 없습니다" };
  }

  // 포트원 V2 API 취소 호출
  try {
    const portoneRes = await fetch(
      `https://api.portone.io/payments/${encodeURIComponent(order.payment_id)}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `PortOne ${process.env.PORTONE_API_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: params.reason }),
      }
    );

    if (!portoneRes.ok) {
      const errBody = await portoneRes.text();
      console.error("[refundOrder] 포트원 취소 실패:", portoneRes.status, errBody);
      return { success: false, error: `포트원 취소 실패 (${portoneRes.status})` };
    }
  } catch (err) {
    console.error("[refundOrder] 포트원 API 호출 에러:", err);
    return { success: false, error: "포트원 API 호출 중 오류가 발생했습니다" };
  }

  // orders.status 업데이트
  const { error: updateErr } = await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", params.orderId);

  if (updateErr) {
    console.error("[refundOrder] orders 상태 업데이트 실패:", updateErr);
    // 포트원 취소는 성공했으나 DB 상태 반영 실패 — 심각한 불일치
    // 감사 로그에 실패 기록 후 에러 반환
    await supabase.from("admin_audit_log").insert({
      admin_id: userId,
      admin_email: userEmail,
      action: "refund_db_sync_fail",
      target_type: "order",
      target_id: params.orderId,
      details: {
        payment_id: order.payment_id,
        amount: order.amount,
        reason: params.reason,
        db_error: updateErr.message,
      },
    });
    return {
      success: false,
      error: "포트원 환불은 완료되었으나 DB 상태 업데이트에 실패했습니다. 웹훅으로 자동 복구되거나 수동 확인이 필요합니다.",
    };
  }

  // 감사 로그 기록
  await supabase.from("admin_audit_log").insert({
    admin_id: userId,
    admin_email: userEmail,
    action: "refund",
    target_type: "order",
    target_id: params.orderId,
    details: {
      payment_id: order.payment_id,
      amount: order.amount,
      product_id: order.product_id,
      reason: params.reason,
    },
  });

  return { success: true };
}
