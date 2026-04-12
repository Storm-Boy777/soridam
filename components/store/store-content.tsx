"use client";

import { useTransition, useState } from "react";
import { T } from "@/lib/constants/tables";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { createCheckout } from "@/lib/actions/checkout";
import { PRODUCTS, formatUsd } from "@/lib/constants/pricing";
import {
  Wallet,
  Loader2,
  CheckCircle2,
  ChevronDown,
  Coins,
  Heart,
  Sparkles,
} from "lucide-react";

/* ── 잔액 조회 ── */
async function fetchBalance(userId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from(T.polar_balances)
    .select("balance_cents, total_charged, total_used")
    .eq("user_id", userId)
    .single();
  return data ?? { balance_cents: 0, total_charged: 0, total_used: 0 };
}

/* ── 상품 카드 데이터 ── */
const PRODUCT_CARDS = [
  {
    key: "credit" as const,
    icon: Coins,
    borderClass: "border-border",
    bgClass: "bg-surface",
    iconBgClass: "bg-primary-50 text-primary-500",
    buttonClass: "bg-primary-500 hover:bg-primary-700 text-white",
    labelClass: "text-primary-600",
    checkClass: "text-primary-500",
    features: ["크레딧 충전", "사용량에 따라 차감", "모의고사 · 스크립트 · 튜터링"],
    showFeeNote: true,
  },
  {
    key: "credit_sponsor" as const,
    icon: Sparkles,
    borderClass: "border-border",
    bgClass: "bg-surface",
    iconBgClass: "bg-secondary-50 text-secondary-500",
    buttonClass: "bg-secondary-500 hover:bg-secondary-600 text-white",
    labelClass: "text-secondary-600",
    checkClass: "text-secondary-500",
    features: ["크레딧 충전", "서버 후원 포함", "소리담을 지속가능하게"],
    showFeeNote: true,
  },
  {
    key: "sponsor" as const,
    icon: Heart,
    borderClass: "border-border",
    bgClass: "bg-surface",
    iconBgClass: "bg-accent-50 text-accent-500",
    buttonClass: "bg-accent-500 hover:bg-accent-600 text-white",
    labelClass: "text-accent-600",
    checkClass: "text-accent-500",
    features: ["크레딧 미포함", "언제든 해지 가능", "서버운영비 후원"],
  },
] as const;

/* ── 메인 컴포넌트 ── */
export function StoreContent({ userId }: { userId: string }) {
  const searchParams = useSearchParams();
  const isSuccess = searchParams.get("success") === "true";
  const queryClient = useQueryClient();
  const [showDetail, setShowDetail] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [loadingProduct, setLoadingProduct] = useState<string | null>(null);

  const { data: balance } = useQuery({
    queryKey: ["polar-balance", userId],
    queryFn: () => fetchBalance(userId),
    staleTime: 30 * 1000,
    refetchInterval: isSuccess ? 3000 : false,
  });

  // 활성 구독 확인 (중복 후원 방지)
  const { data: activeSponsor } = useQuery({
    queryKey: ["active-sponsorship", userId],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("sponsorships")
        .select("status, current_period_end")
        .eq("user_id", userId)
        .in("status", ["active", "scheduled_cancel"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data) return null;
      // active → 비활성화
      if (data.status === "active") return data;
      // scheduled_cancel → period_end까지만 비활성화
      if (data.status === "scheduled_cancel" && data.current_period_end) {
        return new Date(data.current_period_end) > new Date() ? data : null;
      }
      return null;
    },
    staleTime: 60 * 1000,
  });

  const handleCheckout = (productKey: keyof typeof PRODUCTS) => {
    setLoadingProduct(productKey);
    startTransition(async () => {
      const result = await createCheckout(productKey);
      if ("error" in result) {
        toast.error(result.error);
        setLoadingProduct(null);
      } else {
        window.location.href = result.url;
      }
    });
  };

  const balanceCents = balance?.balance_cents ?? 0;

  return (
    <div className="space-y-8">
      {/* ── 결제 성공 메시지 ── */}
      {isSuccess && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-bold text-emerald-800">결제가 완료되었습니다!</p>
            <p className="text-sm text-emerald-600">잔액이 곧 반영됩니다.</p>
          </div>
        </div>
      )}

      {/* ── 잔액 표시 ── */}
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50">
          <Wallet className="h-6 w-6 text-primary-500" />
        </div>
        <div>
          <p className="text-xs font-medium text-foreground-secondary sm:text-sm">크레딧 잔액</p>
          <p className="text-2xl font-extrabold text-foreground">
            {formatUsd(balanceCents)}
          </p>
        </div>
      </div>

      {/* ── 충전 카드 3종 ── */}
      <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
        {PRODUCT_CARDS.map((card) => {
          const product = PRODUCTS[card.key];
          const Icon = card.icon;
          const isLoading = loadingProduct === card.key && isPending;

          return (
            <div
              key={card.key}
              className={`relative flex flex-col items-center rounded-2xl border ${card.borderClass} ${card.bgClass} p-6 text-center transition-shadow hover:shadow-md`}
            >
              <div className={`mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl ${card.iconBgClass}`}>
                <Icon className="h-5 w-5" />
              </div>

              <p className={`text-sm font-bold ${card.labelClass}`}>{product.name}</p>
              <div className="mt-2">
                <span className="text-3xl font-extrabold text-foreground">
                  {formatUsd(product.priceUsd)}
                </span>
                {card.key === "sponsor" && (
                  <span className="ml-1 text-sm text-foreground-muted">/월</span>
                )}
              </div>

              <ul className="mt-4 w-full space-y-1.5 text-xs text-foreground/80 sm:text-sm">
                {card.features.map((f) => (
                  <li key={f} className="flex items-center justify-center gap-1.5">
                    <span className={`${card.checkClass}`}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>


              {card.key === "sponsor" && activeSponsor ? (
                <div className="mt-5 w-full rounded-xl bg-foreground-muted/10 py-2.5 text-center text-sm font-bold text-foreground-muted">
                  이미 후원 중입니다 💛
                </div>
              ) : (
                <button
                  onClick={() => handleCheckout(card.key)}
                  disabled={isLoading}
                  className={`mt-5 w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-colors ${card.buttonClass} disabled:opacity-60`}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  {product.creditCents > 0 ? "충전하기" : "후원하기"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── 수수료 안내 ── */}
      <div className="rounded-xl border border-border bg-surface-secondary/50 px-4 py-3 sm:px-5 sm:py-4">
        <p className="text-xs leading-relaxed text-foreground-muted sm:text-sm">
          충전 금액에는 결제 대행 수수료(3.9% + $0.40)가 포함됩니다.
          수수료 차감 후 실수령액이 크레딧으로 충전됩니다.
          <span className="ml-1 font-medium text-foreground-secondary">
            예) $10 충전 → 실제 충전액 {formatUsd(PRODUCTS.credit.creditCents)}
          </span>
        </p>
      </div>

      {/* ── 크레딧이란? ── */}
      <div className="rounded-2xl bg-[#1A1A2E] px-5 py-10 sm:px-8 sm:py-14">
        <h3 className="text-center text-lg font-bold leading-snug text-white sm:text-xl">
          <span className="text-primary-300">크레딧</span>이란?
        </h3>
        <p className="mt-2 text-center text-sm text-white/40">소리담은 무료 플랫폼입니다. 크레딧은 AI 사용료입니다.</p>

        <div className="mx-auto mt-8 max-w-xl space-y-6">
          {/* 핵심 설명 */}
          <div className="space-y-5 text-sm leading-[1.9] text-white/55">
            <div className="flex gap-3">
              <span className="mt-0.5 shrink-0 text-primary-300">①</span>
              <div>
                <p className="font-medium text-white/90">AI 기능을 쓸 때마다 실비용이 발생합니다</p>
                <p className="mt-1">
                  스크립트 생성, 모의고사 평가, 튜터링 진단 등 소리담의 핵심 기능은{" "}
                  <span className="text-primary-300">OpenAI(GPT·Whisper)</span>,{" "}
                  <span className="text-primary-300">Google(Gemini TTS)</span>,{" "}
                  <span className="text-primary-300">Azure(발음 평가)</span> 등
                  외부 AI 서비스를 호출합니다.
                  이 서비스들은 호출할 때마다 과금되며, 소리담이 아닌{" "}
                  <span className="font-medium text-white/80">AI 회사에 지불되는 비용</span>입니다.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="mt-0.5 shrink-0 text-primary-300">②</span>
              <div>
                <p className="font-medium text-white/90">크레딧으로 이 비용을 간편하게 처리합니다</p>
                <p className="mt-1">
                  크레딧을 충전하면, AI 기능을 사용할 때{" "}
                  <span className="font-medium text-white/80">실제 발생한 비용만큼만 자동 차감</span>됩니다.
                  별도로 OpenAI나 Google에 가입하거나 API 키를 등록할 필요 없이,
                  충전 한 번이면 모든 AI 기능을 바로 사용할 수 있습니다.
                  유효기간도 없으며, 남은 크레딧은 언제든 사용 가능합니다.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="mt-0.5 shrink-0 text-primary-300">③</span>
              <div>
                <p className="font-medium text-white/90">소리담은 이 과정에서 수익을 취하지 않습니다</p>
                <p className="mt-1">
                  크레딧은 소리담 이용료가 아닙니다.
                  충전된 금액은{" "}
                  <span className="font-medium text-white/80">전액 AI API 비용으로만 사용</span>됩니다.
                  소리담의 서버 유지비는 후원과 개발자 자비로 운영되며,
                  크레딧에서 마진을 붙이지 않습니다.
                </p>
              </div>
            </div>
          </div>

          {/* 플로우 다이어그램 */}
          <div className="flex items-center justify-center gap-2 text-xs text-white/40 sm:gap-3 sm:text-sm">
            <span className="rounded-lg bg-white/10 px-3 py-1.5 font-medium text-white/70">크레딧 충전</span>
            <span>→</span>
            <span className="rounded-lg bg-white/10 px-3 py-1.5 font-medium text-white/70">AI 기능 사용</span>
            <span>→</span>
            <span className="rounded-lg bg-white/10 px-3 py-1.5 font-medium text-white/70">실비용 차감</span>
          </div>
        </div>

        {/* AI 상세 토글 */}
        <div className="mx-auto mt-4 flex max-w-xl justify-end">
          <button
            onClick={() => setShowDetail(!showDetail)}
            className="flex items-center gap-1.5 rounded-md border border-primary-400/30 bg-primary-500/10 px-3 py-1.5 text-xs font-semibold text-primary-300 transition-colors hover:bg-primary-500/20 sm:text-sm"
          >
            사용하는 AI 상세 보기
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showDetail ? "rotate-180" : ""}`} />
          </button>
        </div>

        {showDetail && (
          <div className="mx-auto mt-4 max-w-xl space-y-3 sm:space-y-4">
            {/* 단가표 */}
            <div className="overflow-hidden rounded-xl border border-white/10">
              <div className="border-b border-white/10 bg-white/5 px-3 py-2 sm:px-4 sm:py-2.5">
                <p className="text-xs font-bold text-white/50 sm:text-sm">AI 사용 모델 및 서비스 원가</p>
              </div>
              <div className="divide-y divide-white/10 text-xs sm:text-sm">
                {[
                  { service: "GPT-4.1", cost: "$2.00 / $8.00 per 1M tokens" },
                  { service: "GPT-4.1 Mini", cost: "$0.40 / $1.60 per 1M tokens" },
                  { service: "Whisper", cost: "$0.006 / 분" },
                  { service: "Gemini TTS", cost: "$1.00 / $20.00 per 1M tokens" },
                  { service: "Azure Speech", cost: "$1.32 / 시간" },
                ].map((item) => (
                  <div key={item.service} className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5">
                    <span className="font-medium text-white/80">{item.service}</span>
                    <span className="font-mono text-[10px] text-white/35 sm:text-xs">{item.cost}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 호출 수 */}
            <div className="overflow-hidden rounded-xl border border-white/10">
              <div className="border-b border-white/10 bg-white/5 px-3 py-2 sm:px-4 sm:py-2.5">
                <p className="text-xs font-bold text-white/50 sm:text-sm">기능별 API 호출 수</p>
              </div>
              <div className="overflow-x-auto max-sm:[scrollbar-width:none] max-sm:[&::-webkit-scrollbar]:hidden">
                <div className="min-w-[420px]">
                  <div className="grid grid-cols-[minmax(110px,1.5fr)_repeat(4,1fr)_50px] border-b border-white/10 text-[10px] text-white/35 sm:grid-cols-[minmax(120px,1.5fr)_repeat(4,1fr)_60px] sm:text-xs">
                    <div className="px-3 py-1.5 sm:px-4 sm:py-2" />
                    <div className="px-1 py-1.5 text-center sm:px-2 sm:py-2">GPT</div>
                    <div className="px-1 py-1.5 text-center sm:px-2 sm:py-2">Whisper</div>
                    <div className="px-1 py-1.5 text-center sm:px-2 sm:py-2">TTS</div>
                    <div className="px-1 py-1.5 text-center sm:px-2 sm:py-2">Azure</div>
                    <div className="px-1 py-1.5 text-center sm:px-2 sm:py-2">합계</div>
                  </div>
                  {[
                    { feature: "스크립트 생성", gpt: "2회", whisper: "-", tts: "-", azure: "-", total: "2" },
                    { feature: "스크립트 교정", gpt: "2회", whisper: "-", tts: "-", azure: "-", total: "2" },
                    { feature: "TTS 패키지", gpt: "-", whisper: "1회", tts: "1회", azure: "-", total: "2" },
                    { feature: "쉐도잉 평가", gpt: "1회", whisper: "1회", tts: "-", azure: "-", total: "2" },
                    { feature: "모의고사 (15문항)", gpt: "~19회", whisper: "15회", tts: "-", azure: "15회", total: "~49" },
                    { feature: "튜터링 진단", gpt: "2회", whisper: "-", tts: "-", azure: "-", total: "2" },
                    { feature: "튜터링 드릴", gpt: "1~2회", whisper: "1회", tts: "-", azure: "-", total: "2~3" },
                  ].map((item, i) => (
                    <div key={item.feature} className={`grid grid-cols-[minmax(110px,1.5fr)_repeat(4,1fr)_50px] text-xs sm:grid-cols-[minmax(120px,1.5fr)_repeat(4,1fr)_60px] sm:text-sm ${i > 0 ? "border-t border-white/10" : ""}`}>
                      <div className="px-3 py-2 font-medium text-white/80 sm:px-4 sm:py-2.5">{item.feature}</div>
                      <div className="px-1 py-2 text-center text-white/35 sm:px-2 sm:py-2.5">{item.gpt}</div>
                      <div className="px-1 py-2 text-center text-white/35 sm:px-2 sm:py-2.5">{item.whisper}</div>
                      <div className="px-1 py-2 text-center text-white/35 sm:px-2 sm:py-2.5">{item.tts}</div>
                      <div className="px-1 py-2 text-center text-white/35 sm:px-2 sm:py-2.5">{item.azure}</div>
                      <div className="px-1 py-2 text-center font-mono font-bold text-primary-300 sm:px-2 sm:py-2.5">{item.total}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 안내 문구 ── */}
      <div className="text-center text-xs text-foreground/60 sm:text-sm">
        <p>
          <span className="font-bold text-foreground">서버 유지비는 <span className="text-accent-500">후원</span>과 <span className="text-amber-500">개발자 자비</span>로 운영됩니다.</span>
          <br />
          <span className="mt-1 inline-block text-foreground/50">☕ 커피 한 잔의 후원이 소리담을 유지하는 데 큰 힘이 됩니다.</span>
        </p>
      </div>
    </div>
  );
}
