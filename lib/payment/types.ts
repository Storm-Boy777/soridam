// 결제 Provider 공통 인터페이스
export interface CheckoutResult {
  url: string;
  checkoutId: string;
}

export interface PaymentProvider {
  createCheckout(
    productKey: string,
    user: { id: string; email: string },
    successUrl: string
  ): Promise<CheckoutResult>;
}
