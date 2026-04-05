// Polar 상품 ID 매핑
export const POLAR_PRODUCTS = {
  credit: {
    id: "bfcbd460-f193-49bf-94b7-88d67207c708",
    name: "크레딧 충전",
    price: 10000,
    creditAmount: 10000,
    type: "credit" as const,
  },
  credit_sponsor: {
    id: "d1ed07dc-fb26-45ed-b7f4-cc2240d36229",
    name: "충전 + 후원",
    price: 15000,
    creditAmount: 10000,
    type: "credit_sponsor" as const,
  },
  sponsor: {
    id: "51f2e725-c212-4d37-8828-1641ca23aeee",
    name: "후원",
    price: 5000,
    creditAmount: 0,
    type: "sponsor" as const,
  },
} as const;

// Polar Product ID → 상품 정보 역매핑 (webhook에서 사용)
export const POLAR_PRODUCT_BY_ID = Object.fromEntries(
  Object.values(POLAR_PRODUCTS).map((p) => [p.id, p])
) as Record<string, (typeof POLAR_PRODUCTS)[keyof typeof POLAR_PRODUCTS]>;

// USD → KRW 환율 (system_settings 테이블에서 동적으로 가져올 수도 있음)
export const USD_TO_KRW = 1400;
