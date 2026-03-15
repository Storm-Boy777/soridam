import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { z } from "zod";

// Zod 입력 검증 — 허용된 상품 ID만 수신
const VerifySchema = z.object({
  paymentId: z.string().min(1).max(200),
  productId: z.enum([
    "basic_plan",
    "premium_plan",
    "mock_exam_credit",
    "script_credit",
    "tutoring_credit",
  ]),
});

// 상품 가격 맵 (서버 전용, 위변조 방지)
const PRODUCTS: Record<
  string,
  {
    name: string;
    price: number;
    mockExam: number;
    script: number;
    tutoring: number;
    months: number;
    plan: "basic" | "premium" | "free";
  }
> = {
  basic_plan: {
    name: "베이직 플랜 (3회권)",
    price: 19900,
    mockExam: 3,
    script: 15,
    tutoring: 0,
    months: 1,
    plan: "basic",
  },
  premium_plan: {
    name: "프리미엄 플랜 (10회권)",
    price: 49900,
    mockExam: 10,
    script: 50,
    tutoring: 3,
    months: 2,
    plan: "premium",
  },
  mock_exam_credit: {
    name: "모의고사 횟수권 (1회)",
    price: 7900,
    mockExam: 1,
    script: 0,
    tutoring: 0,
    months: 0,
    plan: "free",
  },
  script_credit: {
    name: "스크립트 패키지 횟수권 (10회)",
    price: 3900,
    mockExam: 0,
    script: 10,
    tutoring: 0,
    months: 0,
    plan: "free",
  },
  tutoring_credit: {
    name: "튜터링 횟수권 (1회)",
    price: 5900,
    mockExam: 0,
    script: 0,
    tutoring: 1,
    months: 0,
    plan: "free",
  },
};

// Supabase service role 클라이언트 (RLS 바이패스)
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    // 1. 입력 검증 (Zod)
    const rawBody = await request.json();
    const parseResult = VerifySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "잘못된 요청 형식입니다." },
        { status: 400 }
      );
    }
    const { paymentId, productId } = parseResult.data;

    // 2. 서버 세션에서 userId 추출 (M-4: customData 대신 서버 인증)
    const userSupabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await userSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }
    const userId = user.id;

    // 3. 상품 존재 확인
    const product = PRODUCTS[productId];
    if (!product) {
      return NextResponse.json(
        { error: "유효하지 않은 상품입니다." },
        { status: 400 }
      );
    }

    // 4. 포트원 API로 결제 검증
    const portoneRes = await fetch(
      `https://api.portone.io/payments/${encodeURIComponent(paymentId)}`,
      {
        headers: {
          Authorization: `PortOne ${process.env.PORTONE_API_SECRET}`,
        },
      }
    );

    if (!portoneRes.ok) {
      const errText = await portoneRes.text();
      console.error("포트원 API 오류:", portoneRes.status, errText);
      return NextResponse.json(
        { error: "결제 정보를 확인할 수 없습니다." },
        { status: 502 }
      );
    }

    const payment = await portoneRes.json();

    // 5. 결제 상태 확인
    if (payment.status !== "PAID") {
      return NextResponse.json(
        { error: `결제가 완료되지 않았습니다. (상태: ${payment.status})` },
        { status: 400 }
      );
    }

    // 6. 금액 위변조 검증
    if (payment.amount.total !== product.price) {
      console.error(
        "금액 불일치:",
        payment.amount.total,
        "vs",
        product.price
      );
      return NextResponse.json(
        { error: "결제 금액이 일치하지 않습니다." },
        { status: 400 }
      );
    }

    // 7. customData.userId와 세션 userId 교차 검증 (방어적 로깅)
    if (payment.customData) {
      const custom =
        typeof payment.customData === "string"
          ? JSON.parse(payment.customData)
          : payment.customData;
      if (custom.userId && custom.userId !== userId) {
        console.error(
          "보안 경고: customData.userId와 세션 userId 불일치",
          { customData: custom.userId, session: userId, paymentId }
        );
      }
    }

    // 8. 원자적 결제 처리 (process_payment RPC — 주문 기록 + 크레딧 지급 단일 트랜잭션)
    const supabase = getServiceClient();

    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "process_payment",
      {
        p_user_id: userId,
        p_payment_id: paymentId,
        p_product_id: productId,
        p_order_name: product.name,
        p_amount: product.price,
        p_pg_provider: payment.channel?.pgProvider ?? null,
        p_pg_tx_id: payment.pgTxId ?? null,
        p_pay_method: payment.method?.type ?? null,
        p_paid_at: payment.paidAt ?? new Date().toISOString(),
        p_receipt_url: payment.receiptUrl ?? null,
        p_is_plan: product.months > 0,
        p_plan: product.plan,
        p_plan_months: product.months,
        p_mock_exam_credits: product.mockExam,
        p_script_credits: product.script,
        p_tutoring_credits: product.tutoring,
      }
    );

    if (rpcError) {
      console.error("결제 처리 RPC 오류:", rpcError);
      return NextResponse.json(
        { error: "결제 처리에 실패했습니다." },
        { status: 500 }
      );
    }

    // 중복 결제도 success 리턴 (멱등성)
    if (rpcResult?.duplicate) {
      return NextResponse.json({
        success: true,
        message: "이미 처리된 결제입니다.",
        orderId: paymentId,
      });
    }

    return NextResponse.json({
      success: true,
      message: "결제가 완료되었습니다.",
      orderId: paymentId,
    });
  } catch (err) {
    console.error("결제 검증 에러:", err);
    return NextResponse.json(
      { error: "결제 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
