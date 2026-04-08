"use client";

import { useTransition, useState } from "react";
import { T } from "@/lib/constants/tables";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
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
    features: ["크레딧 $10.00 충전", "사용량에 따라 차감", "모의고사 · 스크립트 · 튜터링"],
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
    features: ["크레딧 $10.00 충전", "서버 후원 $5.00 포함", "소리담을 지속가능하게"],
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
    features: ["크레딧 미포함", "서버운영비 후원", "☕ 커피 한 잔의 응원"],
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
        .in("status", ["active", "cancelled"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      // cancelled도 기간 내이면 활성으로 간주
      if (data?.status === "cancelled" && data.current_period_end) {
        return new Date(data.current_period_end) > new Date() ? data : null;
      }
      return data?.status === "active" ? data : null;
    },
    staleTime: 60 * 1000,
  });

  const handleCheckout = (productKey: keyof typeof PRODUCTS) => {
    setLoadingProduct(productKey);
    startTransition(async () => {
      try {
        await createCheckout(productKey);
      } catch {
        setLoadingProduct(null);
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

      {/* ── 왜 크레딧인가요? ── */}
      <div className="rounded-2xl border border-border bg-surface p-4 sm:p-6">
        <h3 className="text-xs font-bold text-foreground sm:text-sm">왜 크레딧인가요?</h3>
        <p className="mt-2 text-xs leading-relaxed text-foreground/70 sm:text-sm">
          소리담은 <span className="font-semibold text-primary-500">GPT, Gemini, Azure 등 외부 AI를 활용하여 분석·평가·생성을 수행</span>합니다.
          보통 이런 AI 서비스를 직접 사용하려면 API 키 발급, 결제 설정 등 복잡한 과정이 필요하지만,
          소리담에서는{" "}
          <span className="font-semibold text-foreground">별도의 설정 없이 동일한 비용으로 바로 이용</span>할 수 있도록
          크레딧 시스템을 개발 및 적용하였습니다.
          AI를 활용할 때마다 실제 비용이 발생하기 때문에,{" "}
          <span className="font-semibold text-foreground">사용한 만큼만 크레딧에서 차감</span>되는
          종량제 방식으로 운영됩니다. 월정액이 아니므로 사용하지 않으면 비용이 들지 않습니다.
        </p>

        {/* AI 상세 토글 */}
        <button
          onClick={() => setShowDetail(!showDetail)}
          className="mt-3 ml-auto flex items-center gap-1.5 rounded-md border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-600 transition-colors hover:bg-primary-100 sm:mt-4 sm:text-sm"
        >
          사용하는 AI 상세 보기
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showDetail ? "rotate-180" : ""}`} />
        </button>

        {showDetail && (
          <div className="mt-3 space-y-3 sm:mt-4 sm:space-y-4">
            {/* 단가표 */}
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="border-b border-border bg-surface-secondary px-3 py-2 sm:px-4 sm:py-2.5">
                <p className="text-xs font-bold text-foreground/60 sm:text-sm">AI 사용 모델 및 서비스 원가</p>
              </div>
              <div className="divide-y divide-border text-xs sm:text-sm">
                {[
                  { service: "GPT-4.1", cost: "$2.00 / $8.00 per 1M tokens" },
                  { service: "GPT-4.1 Mini", cost: "$0.40 / $1.60 per 1M tokens" },
                  { service: "Whisper", cost: "$0.006 / 분" },
                  { service: "Gemini TTS", cost: "$1.00 / $20.00 per 1M tokens" },
                  { service: "Azure Speech", cost: "$1.32 / 시간" },
                ].map((item) => (
                  <div key={item.service} className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5">
                    <span className="font-medium text-foreground">{item.service}</span>
                    <span className="font-mono text-[10px] text-foreground/50 sm:text-xs">{item.cost}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 호출 수 */}
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="border-b border-border bg-surface-secondary px-3 py-2 sm:px-4 sm:py-2.5">
                <p className="text-xs font-bold text-foreground/60 sm:text-sm">기능별 API 호출 수</p>
              </div>
              <div className="overflow-x-auto max-sm:[scrollbar-width:none] max-sm:[&::-webkit-scrollbar]:hidden">
                <div className="min-w-[420px]">
                  <div className="grid grid-cols-[minmax(110px,1.5fr)_repeat(4,1fr)_50px] border-b border-border text-[10px] text-foreground/50 sm:grid-cols-[minmax(120px,1.5fr)_repeat(4,1fr)_60px] sm:text-xs">
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
                    <div key={item.feature} className={`grid grid-cols-[minmax(110px,1.5fr)_repeat(4,1fr)_50px] text-xs sm:grid-cols-[minmax(120px,1.5fr)_repeat(4,1fr)_60px] sm:text-sm ${i > 0 ? "border-t border-border" : ""}`}>
                      <div className="px-3 py-2 font-medium text-foreground sm:px-4 sm:py-2.5">{item.feature}</div>
                      <div className="px-1 py-2 text-center text-foreground/50 sm:px-2 sm:py-2.5">{item.gpt}</div>
                      <div className="px-1 py-2 text-center text-foreground/50 sm:px-2 sm:py-2.5">{item.whisper}</div>
                      <div className="px-1 py-2 text-center text-foreground/50 sm:px-2 sm:py-2.5">{item.tts}</div>
                      <div className="px-1 py-2 text-center text-foreground/50 sm:px-2 sm:py-2.5">{item.azure}</div>
                      <div className="px-1 py-2 text-center font-mono font-bold text-primary-500 sm:px-2 sm:py-2.5">{item.total}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 비교표 ── */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="border-b border-border px-3 py-2.5 sm:px-5 sm:py-3">
          <p className="text-center text-xs font-bold text-foreground/70 sm:text-sm">기존 방식 (~2026.04) vs 크레딧 방식</p>
        </div>
        <div className="overflow-x-auto max-sm:[scrollbar-width:none] max-sm:[&::-webkit-scrollbar]:hidden">
          <div className="min-w-[420px]">
            <div className="grid grid-cols-4 text-[11px] sm:text-sm">
              <div className="border-b border-r border-border px-3 py-3" />
              <div className="border-b border-r border-border px-3 py-3 text-center font-bold text-foreground/50">기존</div>
              <div className="border-b border-r border-border px-3 py-3 text-center font-bold text-primary-500">크레딧</div>
              <div className="border-b border-border px-3 py-3 text-center font-bold text-secondary-500">비고</div>

              <div className="flex items-center justify-center border-b border-r border-border px-3 py-2.5 text-center font-medium text-foreground"><span>API 키 등록<br /><span className="text-xs text-foreground/50">OpenAI · Gemini · Azure</span></span></div>
              <div className="flex items-center justify-center border-b border-r border-border px-3 py-2.5 text-center text-foreground/50">3개 직접 등록</div>
              <div className="flex items-center justify-center border-b border-r border-border px-3 py-2.5 text-center text-primary-500">소리담에서 제공</div>
              <div className="flex items-center justify-center border-b border-border px-3 py-2.5 text-center text-secondary-500">복잡한 설정 불필요</div>

              <div className="flex items-center justify-center border-b border-r border-border px-3 py-2.5 text-center font-medium text-foreground">충전</div>
              <div className="flex items-center justify-center border-b border-r border-border px-3 py-2.5 text-center text-foreground/50">API별 개별 충전</div>
              <div className="flex items-center justify-center border-b border-r border-border px-3 py-2.5 text-center text-primary-500">1회 통합 충전</div>
              <div className="flex items-center justify-center border-b border-border px-3 py-2.5 text-center text-secondary-500">동일비용, 편의성 up ↑</div>

              <div className="flex items-center justify-center border-b border-r border-border px-3 py-2.5 text-center font-medium text-foreground">실사용률</div>
              <div className="flex items-center justify-center border-b border-r border-border px-3 py-2.5 text-center text-red-400">5% 미만</div>
              <div className="flex items-center justify-center border-b border-r border-border px-3 py-2.5 text-center text-primary-500">누구나</div>
              <div className="flex items-center justify-center border-b border-border px-3 py-2.5 text-center text-secondary-500">진입장벽 제거</div>

              <div className="flex items-center justify-center border-b border-r border-border px-3 py-2.5 text-center font-medium text-foreground">기간만료</div>
              <div className="flex items-center justify-center border-b border-r border-border px-3 py-2.5 text-center text-foreground/50">없음</div>
              <div className="flex items-center justify-center border-b border-r border-border px-3 py-2.5 text-center text-primary-500">← 동일</div>
              <div className="flex items-center justify-center border-b border-border px-3 py-2.5 text-center text-secondary-500">만료 없이 사용</div>

              <div className="flex items-center justify-center border-r border-border px-3 py-2.5 text-center font-medium text-foreground">소리담 수익</div>
              <div className="flex items-center justify-center border-r border-border px-3 py-2.5 text-center text-foreground/50">없음</div>
              <div className="flex items-center justify-center border-r border-border px-3 py-2.5 text-center text-primary-500">← 동일</div>
              <div className="flex items-center justify-center px-3 py-2.5 text-center text-secondary-500">비영리 운영</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 안내 문구 ── */}
      <div className="text-center text-xs text-foreground/60 sm:text-sm">
        <p>
          크레딧은 복잡한 API 설정을 소리담이 대신 처리하여,
          누구나 쉽게 AI 서비스를 이용할 수 있도록 개선하였습니다.
          <br />
          <strong className="text-foreground">소리담은 이 과정에서 수익을 취하지 않습니다.</strong>
        </p>
        <p className="mt-3">
          <span className="text-foreground">서버 유지비는 <span className="text-accent-500">후원</span>과 <span className="text-amber-500">개발자 자비</span>로 운영됩니다.</span>
          <br />
          <span className="mt-1 inline-block text-foreground/50">☕ 커피 한 잔의 후원이 소리담을 유지하는 데 큰 힘이 됩니다.</span>
        </p>
      </div>
    </div>
  );
}
