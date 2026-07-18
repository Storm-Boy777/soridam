"use server";

import { getUser } from "@/lib/auth";
import { paymentProvider } from "@/lib/payment";
import { isPaymentEnabled } from "@/lib/settings";
import { PRODUCTS, type ProductKey } from "@/lib/constants/pricing";

type CheckoutResult = { url: string; error?: never } | { url?: never; error: string };

export async function createCheckout(productKey: ProductKey): Promise<CheckoutResult> {
  try {
    const user = await getUser();
    if (!user) return { error: "로그인이 필요합니다" };

    // 결제 비활성화 시 차단 — UI만 막으면 Server Action 직접 호출로 우회되므로
    // 여기가 실질 차단선이다. createCheckout이 결제 개시의 유일한 진입점.
    if (!(await isPaymentEnabled())) {
      return { error: "현재 크레딧 충전을 일시 중단하고 있어요. 잠시 후 다시 확인해주세요." };
    }

    const product = PRODUCTS[productKey];
    if (!product) return { error: "잘못된 상품입니다" };

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://soridamhub.com";
    const successUrl = `${siteUrl}/store?success=true&type=${product.type}`;

    const { url } = await paymentProvider.createCheckout(
      productKey,
      { id: user.id, email: user.email || "" },
      successUrl
    );

    return { url };
  } catch (err) {
    console.error("[createCheckout]", err instanceof Error ? err.message : err);
    return { error: "결제 페이지를 준비할 수 없습니다. 잠시 후 다시 시도해주세요." };
  }
}
