// 상품 정의 (USD 센트 기준)
export const PRODUCTS = {
  credit: {
    name: "크레딧 충전",
    priceUsd: 1000,     // $10.00
    creditCents: 1000,  // $10.00 충전
    type: "credit" as const,
  },
  credit_sponsor: {
    name: "충전 + 후원",
    priceUsd: 1500,     // $15.00
    creditCents: 1000,  // $10.00 충전 (+ $5 후원)
    type: "credit_sponsor" as const,
  },
  sponsor: {
    name: "후원",
    priceUsd: 500,      // $5.00
    creditCents: 0,     // 충전 없음
    type: "sponsor" as const,
  },
} as const;

export type ProductKey = keyof typeof PRODUCTS;

// Polar 상품 ID (Polar 승인 후 업데이트)
export const POLAR_PRODUCT_IDS: Record<ProductKey, string> = {
  credit: "bfcbd460-f193-49bf-94b7-88d67207c708",
  credit_sponsor: "d1ed07dc-fb26-45ed-b7f4-cc2240d36229",
  sponsor: "51f2e725-c212-4d37-8828-1641ca23aeee",
};

// Creem 상품 ID (Creem 대시보드에서 생성 후 입력)
export const CREEM_PRODUCT_IDS: Record<ProductKey, string> = {
  credit: "prod_6LdgDmmfhBFbE5HpJQi5Ll",
  credit_sponsor: "prod_7fn2850tZh2jX06vMud5Zz",
  sponsor: "prod_2wkBwgDh8hJDSmVU5IQFrI",
};

// 상품 ID → 상품 키 역매핑 (웹훅에서 사용)
export const PRODUCT_BY_POLAR_ID = Object.fromEntries(
  (Object.entries(POLAR_PRODUCT_IDS) as [ProductKey, string][]).map(([key, id]) => [id, { ...PRODUCTS[key], key }])
);

export const PRODUCT_BY_CREEM_ID = Object.fromEntries(
  (Object.entries(CREEM_PRODUCT_IDS) as [ProductKey, string][]).map(([key, id]) => [id, { ...PRODUCTS[key], key }])
);

// 센트 → 달러 표시 유틸
export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
