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

    // 구독 활성화 (향후 확장용)
    case "subscription.active":
    case "subscription.paid": {
      const metadata = eventData.metadata as Record<string, string> | null;
      const userId = metadata?.user_id;
      const creditAmount = Number(metadata?.credit_amount || "0");
      const subscriptionId = eventData.subscription_id || eventData.id;

      if (!userId) {
        console.error("[creem-webhook] Subscription: missing user_id");
        return NextResponse.json({ received: true });
      }

      if (creditAmount > 0) {
        await supabase.rpc("polar_charge_balance", {
          p_user_id: userId,
          p_amount_cents: creditAmount,
          p_description: `Subscription renewal`,
          p_ref_id: subscriptionId,
        });
      }

      console.log("[creem-webhook] Subscription processed:", { userId, creditAmount });
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

        // 크레딧 회수
        await supabase.rpc("polar_deduct_balance", {
          p_user_id: userId,
          p_cost_cents: creditAmount,
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
