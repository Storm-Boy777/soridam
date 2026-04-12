"use server";

import { getUser } from "@/lib/auth";
import { paymentProvider } from "@/lib/payment";
import { PRODUCTS, type ProductKey } from "@/lib/constants/pricing";

export async function createCheckout(productKey: ProductKey): Promise<string> {
  const user = await getUser();
  if (!user) throw new Error("로그인이 필요합니다");

  const product = PRODUCTS[productKey];
  if (!product) throw new Error("잘못된 상품입니다");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://soridamhub.com";
  const successUrl = `${siteUrl}/store?success=true&type=${product.type}`;

  const { url } = await paymentProvider.createCheckout(
    productKey,
    { id: user.id, email: user.email || "" },
    successUrl
  );

  return url;
}
