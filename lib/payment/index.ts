import type { PaymentProvider } from "./types";
import { polarProvider } from "./provider-polar";
import { creemProvider } from "./provider-creem";

export type { PaymentProvider, CheckoutResult } from "./types";

const providerName = process.env.PAYMENT_PROVIDER || "creem";

export const paymentProvider: PaymentProvider =
  providerName === "polar" ? polarProvider : creemProvider;

export const currentProvider = providerName as "polar" | "creem";
