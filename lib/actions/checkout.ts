"use server";

import { Polar } from "@polar-sh/sdk";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { POLAR_PRODUCTS } from "@/lib/constants/pricing";

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
});

type ProductKey = keyof typeof POLAR_PRODUCTS;

export async function createPolarCheckout(productKey: ProductKey) {
  const user = await getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const product = POLAR_PRODUCTS[productKey];
  if (!product) throw new Error("유효하지 않은 상품입니다.");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://soridamhub.com";

  const checkout = await polar.checkouts.create({
    products: [product.id],
    successUrl: `${siteUrl}/store?success=true&type=${product.type}`,
    customerEmail: user.email || undefined,
    metadata: {
      userId: user.id,
      productType: product.type,
      creditAmount: String(product.creditAmount),
    },
  });

  redirect(checkout.url);
}
