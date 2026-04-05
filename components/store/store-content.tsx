"use client";

import { useTransition, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { createPolarCheckout } from "@/lib/actions/checkout";
import { POLAR_PRODUCTS } from "@/lib/constants/pricing";
import {
  Wallet,
  Loader2,
  CheckCircle2,
  Coins,
  Heart,
  Sparkles,
} from "lucide-react";

/* ── 잔액 조회 ── */
async function fetchBalance(userId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("polar_balances")
    .select("balance_krw, total_charged, total_used")
    .eq("user_id", userId)
    .single();
  return data ?? { balance_krw: 0, total_charged: 0, total_used: 0 };
}

/* ── 상품 카드 데이터 ── */
const PRODUCT_CARDS = [
  {
    key: "credit" as const,
    icon: Coins,
    accent: "emerald",
    borderClass: "border-emerald-200",
    bgClass: "bg-emerald-50",
    iconBgClass: "bg-emerald-100 text-emerald-600",
    buttonClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
    features: ["크레딧 10,000원분", "사용량에 따라 차감", "모의고사 · 스크립트 · 튜터링"],
  },
  {
    key: "credit_sponsor" as const,
    icon: Sparkles,
    accent: "blue",
    borderClass: "border-blue-200",
    bgClass: "bg-blue-50",
    iconBgClass: "bg-blue-100 text-blue-600",
    buttonClass: "bg-blue-600 hover:bg-blue-700 text-white",
    badge: "추천",
    features: ["크레딧 10,000원분", "서버 후원 5,000원 포함", "소리담을 지속가능하게"],
  },
  {
    key: "sponsor" as const,
    icon: Heart,
    accent: "amber",
    borderClass: "border-amber-200",
    bgClass: "bg-amber-50",
    iconBgClass: "bg-amber-100 text-amber-600",
    buttonClass: "bg-amber-600 hover:bg-amber-700 text-white",
    features: ["크레딧 미포함", "서버운영비 후원", "☕ 커피 한 잔의 응원"],
  },
] as const;

/* ── 메인 컴포넌트 ── */
export function StoreContent({ userId }: { userId: string }) {
  const searchParams = useSearchParams();
  const isSuccess = searchParams.get("success") === "true";
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [loadingProduct, setLoadingProduct] = useState<string | null>(null);

  const { data: balance } = useQuery({
    queryKey: ["polar-balance", userId],
    queryFn: () => fetchBalance(userId),
    staleTime: 30 * 1000,
    refetchInterval: isSuccess ? 3000 : false, // 결제 성공 시 폴링
  });

  const handleCheckout = (productKey: keyof typeof POLAR_PRODUCTS) => {
    setLoadingProduct(productKey);
    startTransition(async () => {
      try {
        await createPolarCheckout(productKey);
      } catch {
        setLoadingProduct(null);
      }
    });
  };

  const balanceKrw = balance?.balance_krw ?? 0;

  return (
    <div className="space-y-8">
      {/* ── 결제 성공 메시지 ── */}
      {isSuccess && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-bold text-emerald-800">결제가 완료되었습니다!</p>
            <p className="text-xs text-emerald-600">잔액이 곧 반영됩니다.</p>
          </div>
        </div>
      )}

      {/* ── 잔액 표시 ── */}
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50">
          <Wallet className="h-6 w-6 text-primary-500" />
        </div>
        <div>
          <p className="text-xs font-medium text-foreground-secondary">크레딧 잔액</p>
          <p className="text-2xl font-extrabold text-foreground">
            ₩{balanceKrw.toLocaleString()}
          </p>
        </div>
      </div>

      {/* ── 충전 카드 3종 ── */}
      <div className="grid gap-5 sm:grid-cols-3">
        {PRODUCT_CARDS.map((card) => {
          const product = POLAR_PRODUCTS[card.key];
          const Icon = card.icon;
          const isLoading = loadingProduct === card.key && isPending;

          return (
            <div
              key={card.key}
              className={`relative flex flex-col rounded-2xl border-2 ${card.borderClass} ${card.bgClass} p-6 transition-shadow hover:shadow-md`}
            >
              {card.badge && (
                <span className="absolute -top-2.5 right-4 rounded-full bg-blue-600 px-3 py-0.5 text-[11px] font-bold text-white">
                  {card.badge}
                </span>
              )}

              <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${card.iconBgClass}`}>
                <Icon className="h-5 w-5" />
              </div>

              <p className="text-sm font-bold text-foreground">{product.name}</p>
              <div className="mt-2">
                <span className="text-3xl font-extrabold text-foreground">
                  {product.price.toLocaleString()}
                </span>
                <span className="ml-1 text-sm text-foreground-secondary">원</span>
              </div>

              <ul className="mt-4 space-y-1.5 text-xs text-foreground-secondary">
                {card.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5">
                    <span className="mt-0.5 text-emerald-500">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout(card.key)}
                disabled={isLoading}
                className={`mt-5 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-colors ${card.buttonClass} disabled:opacity-60`}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {product.creditAmount > 0 ? "충전하기" : "후원하기"}
              </button>
            </div>
          );
        })}
      </div>

      {/* ── 안내 문구 ── */}
      <div className="text-center text-sm text-foreground-muted">
        <p>
          크레딧은 AI 서비스 호출 비용에 사용됩니다.
          <br />
          <strong className="text-foreground">소리담은 이 과정에서 수익을 취하지 않습니다.</strong>
        </p>
        <p className="mt-2 text-xs">
          서버 유지비는 후원과 개발자 자비로 운영됩니다.
        </p>
      </div>
    </div>
  );
}
