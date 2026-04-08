import { Polar } from "@polar-sh/sdk";
import { POLAR_PRODUCT_IDS, PRODUCTS, type ProductKey } from "@/lib/constants/pricing";
import type { PaymentProvider, CheckoutResult } from "./types";

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
});

export const polarProvider: PaymentProvider = {
  async createCheckout(productKey, user, successUrl): Promise<CheckoutResult> {
    const product = PRODUCTS[productKey as ProductKey];
    const polarProductId = POLAR_PRODUCT_IDS[productKey as ProductKey];
    if (!product || !polarProductId) throw new Error("Invalid product key");

    const checkout = await polar.checkouts.create({
      products: [polarProductId],
      successUrl,
      customerEmail: user.email || undefined,
      metadata: {
        userId: user.id,
        productType: product.type,
        creditAmount: String(product.creditCents),
      },
    });

    return { url: checkout.url, checkoutId: checkout.id };
  },
};
