import { Webhook } from "@creem_io/nextjs";
import { T } from "@/lib/constants/tables";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const POST = Webhook({
  webhookSecret: process.env.CREEM_WEBHOOK_SECRET!,

  // ── 결제 완료 (1회성 + 구독 최초) ──
  onCheckoutCompleted: async (data) => {
    const supabase = getServiceClient();
    const metadata = data.metadata as Record<string, string> | null;
    const userId = metadata?.user_id;
    const productType = metadata?.product_type;
    const creditAmount = Number(metadata?.credit_amount || "0");
    const checkoutId = data.id;
    const order = data.order;
    const customerId = typeof data.customer === "object" ? data.customer?.id : data.customer;

    console.log("[creem-webhook] checkout.completed:", { userId, productType, creditAmount, checkoutId });

    if (!userId || !productType) {
      console.error("[creem-webhook] Missing metadata:", { metadata });
      return;
    }

    // creem_customer_id 저장
    if (customerId && userId) {
      await supabase
        .from(T.polar_balances)
        .update({ creem_customer_id: customerId })
        .eq("user_id", userId);
    }

    // 주문 기록 + 크레딧 충전
    const { data: result, error } = await supabase.rpc("process_polar_payment", {
      p_user_id: userId,
      p_polar_checkout_id: `creem_${checkoutId}`,
      p_polar_product_id: order?.product || null,
      p_product_type: productType,
      p_amount: order?.amount || 0,
      p_credit_amount: creditAmount,
    });

    if (error) {
      console.error("[creem-webhook] process_polar_payment error:", error);
    } else {
      console.log("[creem-webhook] Payment processed:", { userId, creditAmount, duplicate: result?.duplicate });
    }
  },

  // ── 구독 활성화 (정기 후원) ──
  onSubscriptionActive: async (data) => {
    const supabase = getServiceClient();
    const metadata = data.metadata as Record<string, string> | null;
    const userId = metadata?.user_id;
    const subscriptionId = data.id;
    const customerId = typeof data.customer === "object" ? data.customer?.id : data.customer;

    console.log("[creem-webhook] subscription.active:", { userId, subscriptionId });

    if (!userId) return;

    if (customerId) {
      await supabase
        .from(T.polar_balances)
        .update({ creem_customer_id: customerId })
        .eq("user_id", userId);
    }

    await supabase
      .from(T.sponsorships)
      .upsert({
        user_id: userId,
        creem_subscription_id: subscriptionId,
        creem_customer_id: customerId,
        status: "active",
        amount_cents: 500,
        started_at: new Date().toISOString(),
        cancelled_at: null,
        current_period_end: data.current_period_end_date || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "creem_subscription_id" });

    console.log("[creem-webhook] Sponsorship activated:", { userId, subscriptionId });
  },

  // ── 구독 결제 (갱신) ──
  onSubscriptionPaid: async (data) => {
    const supabase = getServiceClient();
    const subscriptionId = data.id;

    console.log("[creem-webhook] subscription.paid:", { subscriptionId });

    if (subscriptionId) {
      await supabase
        .from(T.sponsorships)
        .update({
          status: "active",
          current_period_end: data.current_period_end_date || null,
          updated_at: new Date().toISOString(),
        })
        .eq("creem_subscription_id", subscriptionId);
    }
  },

  // ── 구독 업데이트 ──
  onSubscriptionUpdate: async (data) => {
    const supabase = getServiceClient();
    const subscriptionId = data.id;

    console.log("[creem-webhook] subscription.update:", { subscriptionId, status: data.status });

    if (subscriptionId) {
      await supabase
        .from(T.sponsorships)
        .update({
          status: data.status === "canceled" ? "cancelled" : data.status === "active" ? "active" : data.status,
          current_period_end: data.current_period_end_date || null,
          updated_at: new Date().toISOString(),
        })
        .eq("creem_subscription_id", subscriptionId);
    }
  },

  // ── 구독 취소 (즉시) ──
  onSubscriptionCanceled: async (data) => {
    const supabase = getServiceClient();
    const subscriptionId = data.id;

    console.log("[creem-webhook] subscription.canceled:", { subscriptionId, canceledAt: data.canceled_at });

    if (subscriptionId) {
      await supabase
        .from(T.sponsorships)
        .update({
          status: "cancelled",
          cancelled_at: data.canceled_at || new Date().toISOString(),
          current_period_end: null,
          updated_at: new Date().toISOString(),
        })
        .eq("creem_subscription_id", subscriptionId);
    }
  },

  // ── 구독 만료 ──
  onSubscriptionExpired: async (data) => {
    const supabase = getServiceClient();
    const subscriptionId = data.id;

    if (subscriptionId) {
      await supabase
        .from(T.sponsorships)
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("creem_subscription_id", subscriptionId);
    }
  },

  // ── 구독 일시정지 ──
  onSubscriptionPaused: async (data) => {
    const supabase = getServiceClient();
    const subscriptionId = data.id;

    if (subscriptionId) {
      await supabase
        .from(T.sponsorships)
        .update({ status: "paused", updated_at: new Date().toISOString() })
        .eq("creem_subscription_id", subscriptionId);
    }
  },

  // ── 환불 ──
  onRefundCreated: async (data) => {
    const supabase = getServiceClient();
    const checkout = typeof data.checkout === "object" ? data.checkout : null;
    const metadata = checkout?.metadata as Record<string, string> | null;
    const userId = metadata?.user_id;
    const creditAmount = Number(metadata?.credit_amount || "0");
    const checkoutId = checkout?.id;

    console.log("[creem-webhook] refund.created:", { userId, creditAmount, checkoutId });

    if (userId && creditAmount > 0) {
      if (checkoutId) {
        await supabase
          .from(T.polar_orders)
          .update({ status: "refunded" })
          .eq("polar_checkout_id", `creem_${checkoutId}`);
      }

      await supabase.rpc("polar_reverse_charge", {
        p_user_id: userId,
        p_amount_cents: creditAmount,
        p_description: "Creem refund",
        p_ref_id: data.id,
      });

      console.log("[creem-webhook] Refund processed:", { userId, creditAmount });
    }
  },
});
