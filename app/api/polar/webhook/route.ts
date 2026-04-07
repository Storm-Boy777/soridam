import { NextRequest, NextResponse } from "next/server";
import { T } from "@/lib/constants/tables";
import {
  validateEvent,
  WebhookVerificationError,
} from "@polar-sh/sdk/webhooks";
import { createClient } from "@supabase/supabase-js";
import { POLAR_PRODUCT_BY_ID } from "@/lib/constants/pricing";

// Supabase service client (RLS 우회)
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const secret = process.env.POLAR_WEBHOOK_SECRET;

  if (!secret) {
    console.error("[polar-webhook] POLAR_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  // 1. 서명 검증 + 이벤트 파싱
  let event: ReturnType<typeof validateEvent>;
  try {
    event = validateEvent(
      body,
      Object.fromEntries(request.headers),
      secret
    );
  } catch (e) {
    if (e instanceof WebhookVerificationError) {
      console.error("[polar-webhook] Invalid signature:", e.message);
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    throw e;
  }

  const supabase = getServiceClient();

  // 2. 이벤트 타입별 처리
  switch (event.type) {
    // ─── 결제 완료 ───
    case "checkout.updated": {
      const checkout = event.data;

      // 결제 성공한 경우만 처리
      if (checkout.status !== "succeeded") {
        return NextResponse.json({ received: true });
      }

      const metadata = checkout.metadata as Record<string, string> | null;
      const userId = metadata?.userId;
      const productType = metadata?.productType;
      const creditAmount = Number(metadata?.creditAmount || "0");

      if (!userId || !productType) {
        console.error("[polar-webhook] Missing metadata:", { metadata });
        return NextResponse.json(
          { error: "Missing userId or productType in metadata" },
          { status: 400 }
        );
      }

      // 원자적 결제 처리: 주문 기록 + 크레딧 충전
      const { data, error } = await supabase.rpc("process_polar_payment", {
        p_user_id: userId,
        p_polar_checkout_id: checkout.id,
        p_polar_product_id: checkout.productId || null,
        p_product_type: productType,
        p_amount: checkout.totalAmount || 0,
        p_credit_amount: creditAmount,
      });

      if (error) {
        console.error("[polar-webhook] process_polar_payment error:", error);
        return NextResponse.json(
          { error: "Payment processing failed" },
          { status: 500 }
        );
      }

      console.log("[polar-webhook] Payment processed:", {
        userId,
        productType,
        creditAmount,
        duplicate: data?.duplicate,
      });

      return NextResponse.json({ received: true, ...data });
    }

    // ─── 환불 ───
    case "order.refunded": {
      const order = event.data;
      const metadata = order.metadata as Record<string, string> | null;
      const userId = metadata?.userId;
      const creditAmount = Number(metadata?.creditAmount || "0");

      if (!userId) {
        console.error("[polar-webhook] Refund: missing userId");
        return NextResponse.json({ received: true });
      }

      // 주문 상태 업데이트
      await supabase
        .from(T.polar_orders)
        .update({ status: "refunded" })
        .eq("polar_checkout_id", order.checkoutId || "");

      // 크레딧 차감 (충전분 회수)
      if (creditAmount > 0) {
        await supabase.rpc("polar_deduct_balance", {
          p_user_id: userId,
          p_cost_krw: creditAmount,
          p_description: "결제 환불에 따른 크레딧 회수",
          p_ref_id: order.id,
        });
      }

      console.log("[polar-webhook] Refund processed:", { userId, creditAmount });
      return NextResponse.json({ received: true });
    }

    default:
      // 처리하지 않는 이벤트는 무시
      return NextResponse.json({ received: true });
  }
}
