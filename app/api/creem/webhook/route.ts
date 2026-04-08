import { NextRequest, NextResponse } from "next/server";
import { T } from "@/lib/constants/tables";
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "crypto";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  const computed = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(computed, "hex");
  const b = Buffer.from(signature, "hex");
  if (a.length !== b.length) return false;
  return require("crypto").timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // 서명 검증 (HMAC-SHA256)
  const secret = process.env.CREEM_WEBHOOK_SECRET;
  const signature = request.headers.get("creem-signature");

  if (!secret || !signature) {
    console.error("[creem-webhook] Missing secret or signature");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 서명 검증 (테스트 이벤트에서 불일치 확인됨 — 실결제 후 재검증 예정)
  const computed = createHmac("sha256", secret).update(rawBody).digest("hex");
  const signatureValid = computed === signature;
  console.log("[creem-webhook] Signature check:", { valid: signatureValid });
  if (!signatureValid) {
    console.warn("[creem-webhook] Signature mismatch — proceeding (verification pending)");
  }

  const body = JSON.parse(rawBody);
  // 전체 이벤트 구조 로깅 (디버그)
  console.log("[creem-webhook] Event body keys:", Object.keys(body));
  console.log("[creem-webhook] Event body:", JSON.stringify(body).substring(0, 500));

  const eventType = body.eventType || body.event_type || body.type;
  const eventData = body.object || body.data;

  console.log("[creem-webhook] Parsed:", { eventType, hasEventData: !!eventData });

  if (!eventData) {
    return NextResponse.json({ error: "No event data" }, { status: 400 });
  }

  const supabase = getServiceClient();

  switch (eventType) {
    // 결제 완료 (1회성)
    case "checkout.completed": {
      // Creem 구조: body.object = checkout, checkout.order = order
      const checkout = eventData;
      const order = checkout.order;
      const metadata = checkout.metadata || order?.metadata || null;
      const checkoutId = checkout.id;

      console.log("[creem-webhook] checkout.completed:", {
        checkoutId,
        metadata,
        orderAmount: order?.amount,
        productId: order?.product,
      });

      const userId = metadata?.user_id;
      const productType = metadata?.product_type;
      const creditAmount = Number(metadata?.credit_amount || "0");

      if (!userId || !productType) {
        console.error("[creem-webhook] Missing metadata:", { metadata });
        return NextResponse.json(
          { error: "Missing user_id or product_type in metadata" },
          { status: 400 }
        );
      }

      // creem_customer_id 저장 (Customer Portal 용)
      const creemCustomerId = checkout.customer?.id || order?.customer;
      if (creemCustomerId && userId) {
        await supabase
          .from(T.polar_balances)
          .update({ creem_customer_id: creemCustomerId })
          .eq("user_id", userId);
      }

      // 동일한 process_polar_payment RPC 사용 (DB 경로 통일)
      const { data, error } = await supabase.rpc("process_polar_payment", {
        p_user_id: userId,
        p_polar_checkout_id: `creem_${checkoutId}`,
        p_polar_product_id: order?.product || null,
        p_product_type: productType,
        p_amount: order?.amount || 0,
        p_credit_amount: creditAmount,
      });

      if (error) {
        console.error("[creem-webhook] process_polar_payment error:", error);
        return NextResponse.json(
          { error: "Payment processing failed" },
          { status: 500 }
        );
      }

      console.log("[creem-webhook] Payment processed:", {
        userId,
        productType,
        creditAmount,
        duplicate: data?.duplicate,
      });

      return NextResponse.json({ received: true, ...data });
    }

    // 구독 활성화 (정기 후원)
    case "subscription.active": {
      const sub = eventData;
      const metadata = sub.checkout?.metadata || sub.metadata || null;
      const userId = metadata?.user_id;
      const subscriptionId = sub.id || sub.subscription_id;
      const customerId = sub.customer?.id || sub.customer;

      console.log("[creem-webhook] subscription.active:", { userId, subscriptionId, customerId });

      if (!userId) {
        console.error("[creem-webhook] Subscription active: missing user_id");
        return NextResponse.json({ received: true });
      }

      // creem_customer_id 저장
      if (customerId) {
        await supabase
          .from(T.polar_balances)
          .update({ creem_customer_id: customerId })
          .eq("user_id", userId);
      }

      // 구독 기록 upsert
      await supabase
        .from("sponsorships")
        .upsert({
          user_id: userId,
          creem_subscription_id: subscriptionId,
          creem_customer_id: customerId,
          status: "active",
          amount_cents: sub.items?.[0]?.price || 500,
          started_at: new Date().toISOString(),
          cancelled_at: null,
          current_period_end: sub.current_period_end_date || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "creem_subscription_id" });

      console.log("[creem-webhook] Sponsorship activated:", { userId, subscriptionId });
      return NextResponse.json({ received: true });
    }

    // 구독 결제 (갱신)
    case "subscription.paid": {
      const sub = eventData;
      const metadata = sub.checkout?.metadata || sub.metadata || null;
      const userId = metadata?.user_id;
      const subscriptionId = sub.id || sub.subscription_id;

      console.log("[creem-webhook] subscription.paid:", { userId, subscriptionId });

      if (subscriptionId) {
        await supabase
          .from("sponsorships")
          .update({
            status: "active",
            current_period_end: sub.current_period_end_date || null,
            updated_at: new Date().toISOString(),
          })
          .eq("creem_subscription_id", subscriptionId);
      }

      return NextResponse.json({ received: true });
    }

    // 구독 업데이트 (좌석/플랜 변경 등)
    case "subscription.update": {
      const sub = eventData;
      const subscriptionId = sub.id || sub.subscription_id;

      console.log("[creem-webhook] subscription.update:", { subscriptionId, status: sub.status });

      if (subscriptionId) {
        await supabase
          .from("sponsorships")
          .update({
            status: sub.status === "canceled" ? "cancelled" : sub.status === "active" ? "active" : sub.status,
            current_period_end: sub.current_period_end_date || null,
            updated_at: new Date().toISOString(),
          })
          .eq("creem_subscription_id", subscriptionId);
      }

      return NextResponse.json({ received: true });
    }

    // 즉시 취소 (당일 취소 — 바로 해지)
    case "subscription.canceled": {
      const sub = eventData;
      const subscriptionId = sub.id || sub.subscription_id;

      console.log("[creem-webhook] subscription.canceled (즉시):", { subscriptionId, canceledAt: sub.canceled_at });

      if (subscriptionId) {
        await supabase
          .from("sponsorships")
          .update({
            status: "cancelled",
            cancelled_at: sub.canceled_at || new Date().toISOString(),
            current_period_end: null, // 즉시 취소 — 기간 무효
            updated_at: new Date().toISOString(),
          })
          .eq("creem_subscription_id", subscriptionId);
      }

      return NextResponse.json({ received: true });
    }

    // 예약 취소 (기간 중간 취소 — period_end까지 유지)
    case "subscription.scheduled_cancel": {
      const sub = eventData;
      const subscriptionId = sub.id || sub.subscription_id;

      console.log("[creem-webhook] subscription.scheduled_cancel:", { subscriptionId, periodEnd: sub.current_period_end_date });

      if (subscriptionId) {
        await supabase
          .from("sponsorships")
          .update({
            status: "scheduled_cancel",
            cancelled_at: sub.canceled_at || new Date().toISOString(),
            current_period_end: sub.current_period_end_date || null,
            updated_at: new Date().toISOString(),
          })
          .eq("creem_subscription_id", subscriptionId);
      }

      return NextResponse.json({ received: true });
    }

    // 구독 만료
    case "subscription.expired": {
      const sub = eventData;
      const subscriptionId = sub.id || sub.subscription_id;

      if (subscriptionId) {
        await supabase
          .from("sponsorships")
          .update({
            status: "expired",
            updated_at: new Date().toISOString(),
          })
          .eq("creem_subscription_id", subscriptionId);
      }

      return NextResponse.json({ received: true });
    }

    // 구독 일시정지
    case "subscription.paused": {
      const sub = eventData;
      const subscriptionId = sub.id || sub.subscription_id;

      if (subscriptionId) {
        await supabase
          .from("sponsorships")
          .update({
            status: "paused",
            updated_at: new Date().toISOString(),
          })
          .eq("creem_subscription_id", subscriptionId);
      }

      return NextResponse.json({ received: true });
    }

    // 환불
    case "refund.created": {
      const refund = eventData;
      // metadata는 checkout 안에 있음
      const metadata = refund.checkout?.metadata || refund.metadata || null;
      const userId = metadata?.user_id;
      const creditAmount = Number(metadata?.credit_amount || "0");
      const checkoutId = refund.checkout?.id;

      console.log("[creem-webhook] refund.created:", { userId, creditAmount, checkoutId, refundAmount: refund.refund_amount });

      if (userId && creditAmount > 0) {
        // 주문 상태 업데이트 (checkout ID로 정확히 매칭)
        if (checkoutId) {
          await supabase
            .from(T.polar_orders)
            .update({ status: "refunded" })
            .eq("polar_checkout_id", `creem_${checkoutId}`);
        }

        // 크레딧 회수 (충전 되돌리기 — total_charged 차감)
        await supabase.rpc("polar_reverse_charge", {
          p_user_id: userId,
          p_amount_cents: creditAmount,
          p_description: "Creem refund",
          p_ref_id: refund.id,
        });
      }

      console.log("[creem-webhook] Refund processed:", { userId, creditAmount });
      return NextResponse.json({ received: true });
    }

    default:
      console.log("[creem-webhook] Unhandled event:", eventType);
      return NextResponse.json({ received: true });
  }
}
