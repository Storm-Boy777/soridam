"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as PortOne from "@portone/browser-sdk/v2";
import { createClient } from "@/lib/supabase";
import {
  Check,
  Crown,
  Zap,
  ClipboardList,
  FileText,
  ShoppingCart,
  Package,
  Loader2,
} from "lucide-react";

/* ── 상품 정의 ── */

type ProductId =
  | "basic_plan"
  | "premium_plan"
  | "mock_exam_credit"
  | "script_credit";

const PRODUCT_MAP: Record<ProductId, { name: string; price: number }> = {
  basic_plan: { name: "베이직 플랜 (3회권)", price: 19900 },
  premium_plan: { name: "프리미엄 플랜 (10회권)", price: 49900 },
  mock_exam_credit: { name: "모의고사 횟수권 (1회)", price: 7900 },
  script_credit: { name: "스크립트 패키지 횟수권 (10회)", price: 3900 },
};

/* ── 크레딧 fetch 함수 ── */

async function fetchUserCredits(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_credits")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) throw error;
  return data as {
    current_plan: string;
    mock_exam_credits: number;
    script_credits: number;
    plan_mock_exam_credits: number;
    plan_script_credits: number;
    plan_expires_at: string | null;
  };
}

/* ── 플랜 데이터 ── */

const plans: {
  name: string;
  productId: ProductId | null;
  price: string;
  period: string;
  description: string;
  sub: string;
  features: string[];
  highlight: boolean;
}[] = [
  {
    name: "체험",
    productId: null,
    price: "0",
    period: "",
    description: "OPIc이 어떤 시험인지 경험해 보세요",
    sub: "",
    features: [
      "샘플 모의고사 1회 (고정문제)",
      "AI 진단 · 튜터링 무료",
      "체화 · 쉐도잉 훈련 무제한",
    ],
    highlight: false,
  },
  {
    name: "베이직",
    productId: "basic_plan",
    price: "19,900",
    period: " / 3회권",
    description: "본격적인 실전 감각을 키우세요",
    sub: "1개월 이용",
    features: [
      "실전 모의고사 3회",
      "스크립트 패키지 생성 30회",
      "AI 진단 · 튜터링 무료",
      "체화 · 쉐도잉 훈련 무제한",
      "성적 진단 리포트",
    ],
    highlight: true,
  },
  {
    name: "프리미엄",
    productId: "premium_plan",
    price: "49,900",
    period: " / 10회권",
    description: "목표 등급 달성을 위한 완벽 준비",
    sub: "2개월 이용",
    features: [
      "실전 모의고사 10회",
      "스크립트 패키지 생성 100회",
      "AI 진단 · 튜터링 무료",
      "체화 · 쉐도잉 훈련 무제한",
      "성장 데이터 리포트",
    ],
    highlight: false,
  },
];

const addons: {
  icon: typeof ClipboardList;
  iconBg: string;
  name: string;
  description: string;
  price: string;
  unit: string;
  productId: ProductId;
}[] = [
  {
    icon: ClipboardList,
    iconBg: "bg-secondary-50 text-secondary-600",
    name: "모의고사 횟수권",
    description: "실전 모의고사 1회 단위로 구매",
    price: "7,900",
    unit: "1회",
    productId: "mock_exam_credit",
  },
  {
    icon: FileText,
    iconBg: "bg-primary-50 text-primary-500",
    name: "스크립트 패키지 횟수권",
    description: "스크립트 패키지 생성 10회 단위로 구매",
    price: "3,900",
    unit: "10회",
    productId: "script_credit",
  },
];

/* ── 플랜 이름 맵 ── */

const PLAN_LABELS: Record<string, string> = {
  free: "체험",
  basic: "베이직",
  premium: "프리미엄",
};

/* ── 메인 컴포넌트 ── */

export function StoreContent({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  const { data: credits } = useQuery({
    queryKey: ["user-credits", userId],
    queryFn: () => fetchUserCredits(userId),
    staleTime: 5 * 60 * 1000, // 5분
    enabled: !!userId,
  });

  const [loadingProduct, setLoadingProduct] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // 메시지 5초 후 자동 사라짐
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [message]);

  // 모바일 결제 후 리다이렉트 처리
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get("paymentId");
    const productId = params.get("productId") as ProductId | null;
    const code = params.get("code");
    const errorMessage = params.get("message");

    if (!paymentId) return;

    // URL 정리 (쿼리 파라미터 제거)
    window.history.replaceState({}, "", "/store");

    // 에러 코드가 있으면 실패
    if (code) {
      setMessage({
        type: "error",
        text: errorMessage || "결제가 취소되었습니다.",
      });
      return;
    }

    // 결제 검증
    if (productId && PRODUCT_MAP[productId]) {
      setLoadingProduct(productId);
      fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, productId }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setMessage({ type: "success", text: "결제가 완료되었습니다!" });
            queryClient.invalidateQueries({ queryKey: ["user-credits"] });
          } else {
            setMessage({
              type: "error",
              text: data.error || "결제 검증에 실패했습니다.",
            });
          }
        })
        .catch(() => {
          setMessage({
            type: "error",
            text: "결제 검증 중 오류가 발생했습니다.",
          });
        })
        .finally(() => setLoadingProduct(null));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 결제 처리
  const handlePayment = async (productId: ProductId) => {
    const product = PRODUCT_MAP[productId];
    if (!product) return;

    setLoadingProduct(productId);
    setMessage(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setMessage({ type: "error", text: "로그인이 필요합니다." });
        return;
      }

      const paymentId = `order_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
      const buyerName =
        user.user_metadata?.display_name || user.email?.split("@")[0] || "구매자";

      // 모바일 결제 후 돌아올 URL (PortOne이 paymentId 등을 쿼리로 추가)
      const redirectUrl = `${window.location.origin}/store?productId=${productId}`;

      // 포트원 결제창 호출
      const response = await PortOne.requestPayment({
        storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
        channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!,
        paymentId,
        orderName: product.name,
        totalAmount: product.price,
        currency: "CURRENCY_KRW",
        payMethod: "CARD",
        redirectUrl,
        customer: {
          fullName: buyerName,
          email: user.email ?? "buyer@opictalkdoc.com",
          phoneNumber: "01000000000",
        },
        customData: { userId: user.id, productId },
      });

      // 사용자 취소 또는 에러
      if (response?.code) {
        if (response.code === "FAILURE_TYPE_PG") {
          setMessage({ type: "error", text: "결제가 취소되었습니다." });
        } else {
          setMessage({
            type: "error",
            text: response.message || "결제 중 오류가 발생했습니다.",
          });
        }
        return;
      }

      // 서버에서 결제 검증
      const verifyRes = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, productId }),
      });

      const verifyData = await verifyRes.json();

      if (verifyRes.ok && verifyData.success) {
        setMessage({ type: "success", text: "결제가 완료되었습니다!" });
        queryClient.invalidateQueries({ queryKey: ["user-credits"] });
      } else {
        setMessage({
          type: "error",
          text: verifyData.error || "결제 검증에 실패했습니다.",
        });
      }
    } catch (err) {
      console.error("결제 오류:", err);
      setMessage({
        type: "error",
        text: "결제 처리 중 오류가 발생했습니다.",
      });
    } finally {
      setLoadingProduct(null);
    }
  };

  // 현재 플랜 이름
  const currentPlanName = credits
    ? PLAN_LABELS[credits.current_plan] || "체험"
    : "체험";
  const isCurrent = (productId: ProductId | null) => {
    if (!productId) return credits?.current_plan === "free" || !credits;
    if (productId === "basic_plan") return credits?.current_plan === "basic";
    if (productId === "premium_plan")
      return credits?.current_plan === "premium";
    return false;
  };

  return (
    <div>
      {/* 메시지 토스트 */}
      {message && (
        <div
          className={`mb-6 rounded-[var(--radius-lg)] border p-4 text-sm font-medium ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 현재 플랜 + 크레딧 정보 */}
      <div className="mb-8 rounded-[var(--radius-xl)] border border-primary-200 bg-primary-50/50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-primary-100">
            <Crown size={20} className="text-primary-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-foreground-secondary">현재 플랜</p>
            <p className="font-semibold text-foreground">
              {currentPlanName}{" "}
              {credits?.current_plan === "free" && (
                <span className="text-sm font-normal text-foreground-muted">
                  무료
                </span>
              )}
            </p>
          </div>
        </div>
        {credits && (
          <div className="mt-3 flex flex-wrap gap-4 border-t border-primary-200/50 pt-3 text-sm">
            <span className="text-foreground-secondary">
              모의고사{" "}
              <span className="font-semibold text-foreground">
                {credits.plan_mock_exam_credits + credits.mock_exam_credits}회
              </span>
              {credits.plan_mock_exam_credits > 0 && credits.mock_exam_credits > 0 && (
                <span className="text-xs text-foreground-muted ml-1">
                  (플랜 {credits.plan_mock_exam_credits} + 횟수권 {credits.mock_exam_credits})
                </span>
              )}
            </span>
            <span className="text-foreground-secondary">
              스크립트{" "}
              <span className="font-semibold text-foreground">
                {credits.plan_script_credits + credits.script_credits}회
              </span>
              {credits.plan_script_credits > 0 && credits.script_credits > 0 && (
                <span className="text-xs text-foreground-muted ml-1">
                  (플랜 {credits.plan_script_credits} + 횟수권 {credits.script_credits})
                </span>
              )}
            </span>
            {credits.plan_expires_at && (
              <span className="text-foreground-secondary">
                만료{" "}
                <span className="font-semibold text-foreground">
                  {new Date(credits.plan_expires_at).toLocaleDateString(
                    "ko-KR"
                  )}
                </span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* 플랜 카드 */}
      <div className="mb-12">
        <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-foreground">
          <Package size={20} className="text-primary-500" />
          플랜
        </h2>
        <div className="grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => {
            const current = isCurrent(plan.productId);
            const loading = loadingProduct === plan.productId;
            return (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-[var(--radius-xl)] border p-5 transition-shadow hover:shadow-lg ${
                  plan.highlight
                    ? "border-primary-500 shadow-md"
                    : current
                      ? "border-primary-200 bg-primary-50/30"
                      : "border-border bg-surface"
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-[var(--radius-full)] bg-primary-500 px-3 py-0.5 text-xs font-semibold text-white">
                    인기
                  </span>
                )}

                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                  {current && (
                    <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-600">
                      이용 중
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-foreground-secondary">
                  {plan.description}
                </p>
                {plan.sub && (
                  <span className="mt-2 inline-flex w-fit rounded-full bg-surface-secondary px-2.5 py-0.5 text-xs font-medium text-foreground-secondary">
                    {plan.sub}
                  </span>
                )}

                <div className="mt-4 flex items-baseline gap-1">
                  {plan.price === "0" ? (
                    <span className="text-3xl font-bold">무료</span>
                  ) : (
                    <>
                      <span className="text-sm text-foreground-secondary">
                        ₩
                      </span>
                      <span className="text-3xl font-bold">{plan.price}</span>
                      <span className="text-sm text-foreground-secondary">
                        {plan.period}
                      </span>
                    </>
                  )}
                </div>

                <ul className="mt-4 flex-1 space-y-2">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-foreground-secondary"
                    >
                      <Check
                        size={16}
                        className="mt-0.5 shrink-0 text-primary-500"
                        strokeWidth={2.5}
                      />
                      {f}
                    </li>
                  ))}
                </ul>

                {current ? (
                  <span className="mt-5 inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] border border-primary-200 text-sm font-medium text-primary-600">
                    현재 이용 중
                  </span>
                ) : plan.productId ? (
                  <button
                    onClick={() => handlePayment(plan.productId!)}
                    disabled={loading}
                    className="mt-5 inline-flex h-10 items-center justify-center gap-1.5 rounded-[var(--radius-lg)] bg-primary-500 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <ShoppingCart size={15} />
                    )}
                    {loading ? "결제 진행 중..." : "구매하기"}
                  </button>
                ) : (
                  <span className="mt-5 inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] border border-primary-200 text-sm font-medium text-primary-600">
                    현재 이용 중
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 횟수권 스토어 */}
      <div className="mb-12">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-foreground">
          <Zap size={20} className="text-secondary-600" />
          횟수권
        </h2>
        <p className="mb-5 text-sm text-foreground-secondary">
          플랜과 별도로 필요한 만큼만 개별 구매할 수 있습니다.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          {addons.map((addon) => {
            const loading = loadingProduct === addon.productId;
            return (
              <div
                key={addon.name}
                className="flex flex-col rounded-[var(--radius-xl)] border border-border bg-surface p-5"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] ${addon.iconBg}`}
                  >
                    <addon.icon size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{addon.name}</p>
                    <p className="text-sm text-foreground-secondary">
                      {addon.description}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-sm text-foreground-secondary">₩</span>
                  <span className="text-2xl font-bold">{addon.price}</span>
                  <span className="text-sm text-foreground-secondary">
                    {" "}
                    / {addon.unit}
                  </span>
                </div>
                <button
                  onClick={() => handlePayment(addon.productId)}
                  disabled={loading}
                  className="mt-4 inline-flex h-10 items-center justify-center gap-1.5 rounded-[var(--radius-lg)] border border-border text-sm font-medium text-foreground transition-colors hover:bg-surface-secondary disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <ShoppingCart size={15} />
                  )}
                  {loading ? "결제 진행 중..." : "구매하기"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 하단 안내 */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface-secondary p-5 text-center text-sm text-foreground-secondary">
        <p>
          결제는 KG이니시스 신용카드를 통해 안전하게 처리됩니다. 플랜 상세 비교는{" "}
          <Link
            href="/pricing"
            className="font-medium text-primary-500 hover:underline"
          >
            요금제 안내
          </Link>
          에서 확인하세요.
        </p>
        <p className="mt-1">
          <Link href="/refund" className="text-primary-500 hover:underline">
            환불 규정
          </Link>
          {" · "}
          <Link href="/terms" className="text-primary-500 hover:underline">
            이용약관
          </Link>
        </p>
      </div>
    </div>
  );
}
