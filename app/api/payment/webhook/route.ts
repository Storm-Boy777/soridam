import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "crypto";

// 상품 정의 (크레딧 차감 계산용)
const PRODUCTS: Record<
  string,
  { mockExam: number; script: number; tutoring: number; months: number; plan: string }
> = {
  basic_plan: { mockExam: 3, script: 15, tutoring: 0, months: 1, plan: "basic" },
  premium_plan: { mockExam: 10, script: 50, tutoring: 3, months: 2, plan: "premium" },
  mock_exam_credit: { mockExam: 1, script: 0, tutoring: 0, months: 0, plan: "free" },
  script_credit: { mockExam: 0, script: 10, tutoring: 0, months: 0, plan: "free" },
  tutoring_credit: { mockExam: 0, script: 0, tutoring: 1, months: 0, plan: "free" },
};

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/* ── PortOne V2 웹훅 서명 검증 (M-5) ── */

function verifyWebhookSignature(
  rawBody: string,
  headers: {
    webhookId: string | null;
    webhookTimestamp: string | null;
    webhookSignature: string | null;
  },
  secret: string
): boolean {
  const { webhookId, webhookTimestamp, webhookSignature } = headers;
  if (!webhookId || !webhookTimestamp || !webhookSignature) return false;

  // 타임스탬프 유효성 검증 (5분 이내 — replay attack 방지)
  const ts = parseInt(webhookTimestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (isNaN(ts) || Math.abs(now - ts) > 300) return false;

  // 시크릿 디코딩 (whsec_ prefix 제거 후 base64 디코드)
  const secretBytes = Buffer.from(
    secret.startsWith("whsec_") ? secret.slice(6) : secret,
    "base64"
  );

  // 서명 생성
  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;
  const expectedSig = createHmac("sha256", secretBytes)
    .update(signedContent)
    .digest("base64");

  // 서명 비교 (v1,<base64> 형식, 여러 개 가능 — timing-safe 비교)
  return webhookSignature.split(" ").some((sig) => {
    const parts = sig.split(",");
    if (parts.length !== 2 || parts[0] !== "v1") return false;
    try {
      return timingSafeEqual(
        Buffer.from(parts[1], "base64"),
        Buffer.from(expectedSig, "base64")
      );
    } catch {
      return false;
    }
  });
}

/* ── 포트원 웹훅 — 결제 상태 변경 시 자동 호출 ── */

export async function POST(request: NextRequest) {
  try {
    // 1. 웹훅 서명 검증 (M-5)
    const rawBody = await request.text();
    const webhookSecret = process.env.PORTONE_WEBHOOK_SECRET;

    if (webhookSecret) {
      const isValid = verifyWebhookSignature(
        rawBody,
        {
          webhookId: request.headers.get("webhook-id"),
          webhookTimestamp: request.headers.get("webhook-timestamp"),
          webhookSignature: request.headers.get("webhook-signature"),
        },
        webhookSecret
      );

      if (!isValid) {
        console.error("웹훅: 서명 검증 실패");
        return NextResponse.json(
          { error: "웹훅 서명 검증에 실패했습니다." },
          { status: 401 }
        );
      }
    } else {
      // 시크릿 미설정 시 경고 로그 (포트원 API 직접 검증으로 보완)
      console.warn("웹훅: PORTONE_WEBHOOK_SECRET 미설정 — 서명 검증 건너뜀");
    }

    // 2. 이벤트 파싱
    const body = JSON.parse(rawBody);
    const { type, data } = body;

    // 취소 이벤트만 처리 (나머지는 무시하고 200 리턴)
    if (
      type !== "Transaction.Cancelled" &&
      type !== "Transaction.PartialCancelled"
    ) {
      return NextResponse.json({ success: true });
    }

    const paymentId = data?.paymentId;
    if (!paymentId) {
      return NextResponse.json(
        { error: "paymentId가 없습니다." },
        { status: 400 }
      );
    }

    // 3. 포트원 API로 실제 결제 상태 확인 (웹훅 payload를 신뢰하지 않고 직접 검증)
    const portoneRes = await fetch(
      `https://api.portone.io/payments/${encodeURIComponent(paymentId)}`,
      {
        headers: {
          Authorization: `PortOne ${process.env.PORTONE_API_SECRET}`,
        },
      }
    );

    if (!portoneRes.ok) {
      console.error("웹훅: 포트원 API 조회 실패", portoneRes.status);
      return NextResponse.json(
        { error: "결제 조회 실패" },
        { status: 502 }
      );
    }

    const payment = await portoneRes.json();

    // CANCELLED 상태가 아니면 무시
    if (payment.status !== "CANCELLED") {
      return NextResponse.json({
        success: true,
        message: "상태 불일치 — 무시",
      });
    }

    const supabase = getServiceClient();

    // 4. orders에서 해당 결제 조회
    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("payment_id", paymentId)
      .single();

    if (!order) {
      console.error("웹훅: 주문을 찾을 수 없음", paymentId);
      return NextResponse.json({ success: true, message: "주문 없음" });
    }

    // 이미 취소된 주문이면 중복 처리 방지 (멱등성)
    if (order.status === "cancelled" || order.status === "refunded") {
      return NextResponse.json({ success: true, message: "이미 취소됨" });
    }

    // 5. 주문 상태 업데이트
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("payment_id", paymentId)
      .eq("status", "paid"); // 낙관적 잠금: paid 상태일 때만 취소

    if (updateError) {
      console.error("웹훅: 주문 상태 업데이트 실패", updateError);
      return NextResponse.json(
        { error: "주문 상태 업데이트 실패" },
        { status: 500 }
      );
    }

    // 6. 크레딧 차감
    const product = PRODUCTS[order.product_id];
    if (!product) {
      console.error("웹훅: 알 수 없는 상품", order.product_id);
      return NextResponse.json({ success: true });
    }

    const { data: credits } = await supabase
      .from("user_credits")
      .select("*")
      .eq("user_id", order.user_id)
      .single();

    if (credits) {
      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (product.months > 0) {
        // 플랜 취소 → 플랜 크레딧 초기화
        updates.current_plan = "free";
        updates.plan_mock_exam_credits = 0;
        updates.plan_script_credits = 0;
        updates.plan_tutoring_credits = 0;
        updates.plan_expires_at = null;
      } else {
        // 횟수권 취소 → 영구 크레딧 차감 (음수 방지)
        updates.mock_exam_credits = Math.max(
          0,
          credits.mock_exam_credits - product.mockExam
        );
        updates.script_credits = Math.max(
          0,
          credits.script_credits - product.script
        );
        updates.tutoring_credits = Math.max(
          0,
          (credits.tutoring_credits ?? 0) - product.tutoring
        );
      }

      const { error: creditError } = await supabase
        .from("user_credits")
        .update(updates)
        .eq("user_id", order.user_id);

      if (creditError) {
        console.error("웹훅: 크레딧 차감 실패", creditError);
      }
    }

    console.log("웹훅: 결제 취소 처리 완료", paymentId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("웹훅 처리 오류:", err);
    return NextResponse.json(
      { error: "웹훅 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
