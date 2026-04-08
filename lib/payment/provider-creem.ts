import { CREEM_PRODUCT_IDS, PRODUCTS, type ProductKey } from "@/lib/constants/pricing";
import type { PaymentProvider, CheckoutResult } from "./types";

const CREEM_API_URL = "https://api.creem.io/v1/checkouts";

export const creemProvider: PaymentProvider = {
  async createCheckout(productKey, user, successUrl): Promise<CheckoutResult> {
    const product = PRODUCTS[productKey as ProductKey];
    const creemProductId = CREEM_PRODUCT_IDS[productKey as ProductKey];
    if (!product || !creemProductId) throw new Error("Invalid product key");

    const apiKey = process.env.CREEM_API_KEY;
    if (!apiKey) throw new Error("CREEM_API_KEY not configured");

    const res = await fetch(CREEM_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_id: creemProductId,
        success_url: successUrl,
        metadata: {
          user_id: user.id,
          product_type: product.type,
          credit_amount: String(product.creditCents),
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Creem checkout failed: ${res.status} ${err}`);
    }

    const data = await res.json();
    return { url: data.checkout_url, checkoutId: data.id };
  },
};
