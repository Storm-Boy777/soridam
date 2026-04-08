"use server";

import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { paymentProvider } from "@/lib/payment";
import { PRODUCTS, type ProductKey } from "@/lib/constants/pricing";

export async function createCheckout(productKey: ProductKey) {
  const user = await getUser();
  if (!user) throw new Error("Login required");

  const product = PRODUCTS[productKey];
  if (!product) throw new Error("Invalid product");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://soridamhub.com";
  const successUrl = `${siteUrl}/store?success=true&type=${product.type}`;

  const { url } = await paymentProvider.createCheckout(
    productKey,
    { id: user.id, email: user.email || "" },
    successUrl
  );

  redirect(url);
}
