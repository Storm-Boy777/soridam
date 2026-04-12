"use server";

import { getUser } from "@/lib/auth";
import { paymentProvider } from "@/lib/payment";
import { PRODUCTS, type ProductKey } from "@/lib/constants/pricing";

type CheckoutResult = { url: string; error?: never } | { url?: never; error: string };

export async function createCheckout(productKey: ProductKey): Promise<CheckoutResult> {
  try {
    const user = await getUser();
    if (!user) return { error: "로그인이 필요합니다" };

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
    console.error("[createCheckout]", err);
    return { error: "결제 페이지를 준비할 수 없습니다. 잠시 후 다시 시도해주세요." };
  }
}
