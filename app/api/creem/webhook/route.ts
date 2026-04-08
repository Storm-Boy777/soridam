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
  return computed === signature;
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

  if (!verifySignature(rawBody, signature, secret)) {
    console.error("[creem-webhook] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody);
  const eventType = body.event_type || body.type;
  const eventData = body.object || body.data;

  if (!eventData) {
    return NextResponse.json({ error: "No event data" }, { status: 400 });
  }

  const supabase = getServiceClient();

  switch (eventType) {
    // 결제 완료 (1회성)
    case "checkout.completed": {
      const metadata = eventData.metadata as Record<string, string> | null;
      const userId = metadata?.user_id;
      const productType = metadata?.product_type;
      const creditAmount = Number(metadata?.credit_amount || "0");
      const checkoutId = eventData.id || eventData.checkout_id;

      if (!userId || !productType) {
        console.error("[creem-webhook] Missing metadata:", { metadata });
        return NextResponse.json(
          { error: "Missing user_id or product_type in metadata" },
          { status: 400 }
        );
      }

      // 동일한 process_polar_payment RPC 사용 (DB 경로 통일)
      const { data, error } = await supabase.rpc("process_polar_payment", {
        p_user_id: userId,
        p_polar_checkout_id: `creem_${checkoutId}`,
        p_polar_product_id: eventData.product_id || null,
        p_product_type: productType,
        p_amount: eventData.amount || 0,
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

    default:
      return NextResponse.json({ received: true });
  }
}
