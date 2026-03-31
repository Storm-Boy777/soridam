"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  CreditCard,
  X,
} from "lucide-react";

/* ── 상품 정의 ── */

type ProductId =
  | "standard_plan"
  | "allinone_plan"
  | "mock_exam_credit"
  | "script_credit"
  | "tutoring_credit";

const PRODUCT_MAP: Record<ProductId, { name: string; price: number }> = {
  standard_plan: { name: "실전 플랜 (3회권)", price: 19900 },
  allinone_plan: { name: "올인원 플랜 (10회권)", price: 49900 },
  mock_exam_credit: { name: "모의고사 횟수권 (1회)", price: 7900 },
  script_credit: { name: "스크립트 패키지 횟수권 (5회)", price: 3900 },
  tutoring_credit: { name: "튜터링 횟수권 (1회)", price: 5900 },
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
    plan_tutoring_credits: number;
    tutoring_credits: number;
    plan_expires_at: string | null;
  };
}

/* ── 플랜 데이터 ── */

type FeatureGroup = {
  title: string;
  details: string[];
  enabled?: boolean; // false면 흐리게 표시
};

const plans: {
  name: string;
  productId: ProductId | null;
  price: string;
  period: string;
  description: string;
  sub: string;
  features: FeatureGroup[];
  highlight: boolean;
}[] = [
  {
    name: "체험",
    productId: null,
    price: "₩0",
    period: "",
    description: "무료로 하루오픽의 핵심 기능을 경험해 보세요",
    sub: "무제한 이용",
    features: [
      { title: "기출 빈도 분석", details: ["어드밴스 카테고리만 제공"] },
      { title: "내 경험 기반 맞춤 스크립트", details: ["체험판 + 후기 제출 시 크레딧 지급", "1회 생성 = 7가지 학습콘텐츠", "핵심표현 · 만능패턴 · 연결어 하이라이팅"] },
      { title: "내 스크립트로 원어민 발음 체화", details: ["내 스크립트가 원어민 음성으로 변환", "듣기 → 따라읽기 → 혼자말하기 → 실전 녹음", "쉐도잉 훈련 무제한"] },
      { title: "기출 기반 실전 모의고사", details: ["모의고사 체험판", "기출 질문에서 실전과 동일하게 출제"] },
      { title: "문항별 개별 평가 + 종합 리포트", details: ["10가지 유형별 맞춤 체크리스트", "과제충족 진단 + 최우선 처방 + 교정문", "영역별 실력 분석 + 성장 리포트"], enabled: false },
      { title: "약점 자동 처방 튜터링", details: ["튜터링 미포함", "모의고사 결과 기반 약점 진단 + 맞춤 처방", "병목별 3단계 드릴 + 미니 재평가"], enabled: false },
    ],
    highlight: false,
  },
  {
    name: "실전",
    productId: "standard_plan",
    price: "19,900",
    period: " / 3회권",
    description: "본격적인 실전 감각을 키우세요",
    sub: "1개월 이용",
    features: [
      { title: "기출 빈도 분석", details: ["전체 카테고리 제공"] },
      { title: "내 경험 기반 맞춤 스크립트", details: ["스크립트 패키지 생성 15회", "1회 생성 = 7가지 학습콘텐츠", "핵심표현 · 만능패턴 · 연결어 하이라이팅"] },
      { title: "내 스크립트로 원어민 발음 체화", details: ["내 스크립트가 원어민 음성으로 변환", "듣기 → 따라읽기 → 혼자말하기 → 실전 녹음", "발음 평가 + 무제한 반복 훈련"] },
      { title: "기출 기반 실전 모의고사", details: ["모의고사 3회", "기출 질문에서 실전과 동일하게 출제"] },
      { title: "문항별 개별 평가 + 종합 리포트", details: ["10가지 유형별 맞춤 체크리스트", "과제충족 진단 + 최우선 처방 + 교정문", "영역별 실력 분석 + 성장 리포트"] },
      { title: "약점 자동 처방 튜터링", details: ["튜터링 미포함", "모의고사 결과 기반 약점 진단 + 맞춤 처방", "병목별 3단계 드릴 + 미니 재평가"], enabled: false },
    ],
    highlight: false,
  },
  {
    name: "올인원",
    productId: "allinone_plan",
    price: "49,900",
    period: " / 10회권",
    description: "빈도 분석부터 약점 튜터링까지, 한 번에",
    sub: "2개월 이용",
    features: [
      { title: "기출 빈도 분석", details: ["전체 카테고리 제공"] },
      { title: "내 경험 기반 맞춤 스크립트", details: ["스크립트 패키지 생성 50회", "1회 생성 = 7가지 학습콘텐츠", "핵심표현 · 만능패턴 · 연결어 하이라이팅"] },
      { title: "내 스크립트로 원어민 발음 체화", details: ["내 스크립트가 원어민 음성으로 변환", "듣기 → 따라읽기 → 혼자말하기 → 실전 녹음", "발음 평가 + 무제한 반복 훈련"] },
      { title: "기출 기반 실전 모의고사", details: ["모의고사 10회", "기출 질문에서 실전과 동일하게 출제"] },
      { title: "문항별 개별 평가 + 종합 리포트", details: ["10가지 유형별 맞춤 체크리스트", "과제충족 진단 + 최우선 처방 + 교정문", "영역별 실력 분석 + 성장 리포트"] },
      { title: "약점 자동 처방 튜터링", details: ["튜터링 3회 포함", "모의고사 결과 기반 약점 진단 + 맞춤 처방", "병목별 3단계 드릴 + 미니 재평가"] },
    ],
    highlight: true,
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
    icon: FileText,
    iconBg: "bg-primary-50 text-primary-500",
    name: "스크립트 패키지 횟수권",
    description: "스크립트 패키지 생성 5회 단위로 구매",
    price: "3,900",
    unit: "5회",
    productId: "script_credit",
  },
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
    icon: Zap,
    iconBg: "bg-accent-50 text-accent-600",
    name: "튜터링 횟수권",
    description: "약점 진단 기반 1:1 튜터링 세션",
    price: "5,900",
    unit: "1회",
    productId: "tutoring_credit",
  },
];

/* ── 결제 수단 ── */

type PayMethodId = "card" | "kakaopay";

/* ── 플랜 이름 맵 ── */

const PLAN_LABELS: Record<string, string> = {
  free: "체험",
  beta: "Beta",
  standard: "실전",
  allinone: "올인원",
};

/* ── 결제 수단 선택 모달 ── */

function PaymentMethodModal({
  open,
  productName,
  price,
  loading,
  loadingMethod,
  onSelect,
  onCancel,
}: {
  open: boolean;
  productName: string;
  price: string;
  loading: boolean;
  loadingMethod: PayMethodId | null;
  onSelect: (method: PayMethodId) => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
    >
      <div className="relative w-full max-w-sm rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-xl">
        {/* 닫기 버튼 */}
        <button
          onClick={onCancel}
          disabled={loading}
          className="absolute right-3 top-3 rounded-full p-1 text-foreground-muted transition-colors hover:bg-surface-secondary hover:text-foreground disabled:opacity-50"
        >
          <X size={18} />
        </button>

        {/* 상품 정보 */}
        <div className="mb-5 text-center">
          <p className="text-sm text-foreground-secondary">결제 상품</p>
          <p className="mt-1 font-semibold text-foreground">{productName}</p>
          <p className="mt-0.5 text-lg font-bold text-foreground">
            <span className="text-sm font-normal text-foreground-secondary">₩</span>
            {price}
          </p>
        </div>

        {/* 결제 수단 선택 */}
        <p className="mb-2 text-xs font-medium text-foreground-secondary">결제 수단 선택</p>
        <div className="flex flex-col gap-2">
          {/* 신용카드 (심사 중) */}
          <div
            className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-surface-secondary px-4 py-3 text-sm font-medium text-foreground-muted opacity-60 cursor-not-allowed"
          >
            <CreditCard size={20} className="text-foreground-muted" />
            <span>신용카드</span>
            <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">심사 중</span>
          </div>

          {/* 카카오페이 */}
          <button
            onClick={() => onSelect("kakaopay")}
            disabled={loading}
            className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-border px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-[#FEE500] hover:bg-[#FEE500]/10 disabled:opacity-50"
          >
            {loading && loadingMethod === "kakaopay" ? (
              <Loader2 size={20} className="animate-spin text-[#3C1E1E]" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
                <rect width="20" height="20" rx="4" fill="#FEE500" />
                <path
                  d="M10 4.5C6.41 4.5 3.5 6.78 3.5 9.6c0 1.82 1.21 3.42 3.03 4.32l-.77 2.86c-.07.25.22.45.44.31l3.42-2.28c.12.01.25.01.38.01 3.59 0 6.5-2.28 6.5-5.1S13.59 4.5 10 4.5z"
                  fill="#3C1E1E"
                />
              </svg>
            )}
            카카오페이
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [pendingProduct, setPendingProduct] = useState<ProductId | null>(null);
  const [loadingMethod, setLoadingMethod] = useState<PayMethodId | null>(null);
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
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
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

  // 결제 수단 선택 후 실제 결제 처리
  const handleConfirmPayment = async (method: PayMethodId) => {
    if (!pendingProduct) return;
    const productId = pendingProduct;
    const product = PRODUCT_MAP[productId];
    if (!product) return;

    setLoadingProduct(productId);
    setLoadingMethod(method);
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

      // 결제 수단별 채널키 + payMethod 분기
      const isKakaoPay = method === "kakaopay";
      const channelKey = isKakaoPay
        ? process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY_KAKAOPAY!
        : process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!;

      // 포트원 SDK 동적 로드 (결제 시점에만 ~40KB 로드)
      const PortOne = await import("@portone/browser-sdk/v2");
      const response = await PortOne.requestPayment({
        storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
        channelKey,
        paymentId,
        orderName: product.name,
        totalAmount: product.price,
        currency: "CURRENCY_KRW",
        payMethod: isKakaoPay ? "EASY_PAY" : "CARD",
        redirectUrl,
        customer: {
          fullName: buyerName,
          email: user.email ?? "buyer@opictalkdoc.com",
          phoneNumber: "01000000000",
        },
        // customData는 포트원 대시보드 조회용 (서버는 세션에서 userId 추출, customData를 신뢰하지 않음)
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
      setLoadingMethod(null);
      setPendingProduct(null);
    }
  };

  // 현재 플랜 이름
  const currentPlanName = credits
    ? PLAN_LABELS[credits.current_plan] || "체험"
    : "체험";
  const isCurrent = (productId: ProductId | null) => {
    if (!productId) return credits?.current_plan === "free" || !credits;
    if (productId === "standard_plan") return credits?.current_plan === "standard";
    if (productId === "allinone_plan")
      return credits?.current_plan === "allinone";
    return false;
  };

  return (
    <div>
      {/* 메시지 토스트 */}
      {message && (
        <div
          className={`mb-4 rounded-[var(--radius-lg)] border p-3 text-sm font-medium sm:mb-6 sm:p-4 ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 현재 플랜 + 크레딧 정보 */}
      {/* 모바일: 세로 가운데 / PC: 가로 좌우 균형 */}
      <div className="mb-6 rounded-[var(--radius-xl)] border border-primary-200 bg-primary-50/50 px-4 py-3 sm:mb-8 sm:px-6">
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <Crown size={18} className="text-primary-600" />
            <span className="text-sm font-semibold text-foreground">{currentPlanName}</span>
            {credits?.current_plan === "free" && (
              <span className="text-xs text-foreground-muted">무료</span>
            )}
          </div>
          {credits && (
            <div className="flex flex-wrap justify-center gap-3 text-sm sm:gap-5">
              <span className="text-foreground-secondary">
                모의고사 <span className="font-bold text-foreground">{credits.plan_mock_exam_credits + credits.mock_exam_credits}회</span>
              </span>
              <span className="text-foreground-secondary">
                스크립트 <span className="font-bold text-foreground">{credits.plan_script_credits + credits.script_credits}회</span>
              </span>
              <span className="text-foreground-secondary">
                튜터링 <span className="font-bold text-foreground">{(credits.plan_tutoring_credits ?? 0) + (credits.tutoring_credits ?? 0)}회</span>
              </span>
              {credits.plan_expires_at && (
                <span className="text-foreground-secondary">
                  만료 <span className="font-bold text-foreground">{new Date(credits.plan_expires_at).toLocaleDateString("ko-KR")}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 결제 수단 선택 모달 */}
      <PaymentMethodModal
        open={!!pendingProduct}
        productName={pendingProduct ? PRODUCT_MAP[pendingProduct].name : ""}
        price={
          pendingProduct
            ? PRODUCT_MAP[pendingProduct].price.toLocaleString("ko-KR")
            : ""
        }
        loading={!!loadingProduct}
        loadingMethod={loadingMethod}
        onSelect={handleConfirmPayment}
        onCancel={() => {
          if (!loadingProduct) setPendingProduct(null);
        }}
      />

      {/* 플랜 카드 */}
      <div className="mb-8 sm:mb-12">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-foreground sm:mb-5 sm:text-lg">
          <Package size={20} className="text-primary-500" />
          플랜
        </h2>
        <div className="grid gap-4 md:grid-cols-3 sm:gap-5">
          {plans.map((plan) => {
            const current = isCurrent(plan.productId);
            return (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-[var(--radius-xl)] border p-4 transition-shadow hover:shadow-lg sm:p-5 ${
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
                {current && !plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-[var(--radius-full)] bg-primary-100 px-3 py-0.5 text-xs font-semibold text-primary-600">
                    이용 중
                  </span>
                )}

                <div className="flex flex-col items-center text-center">
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-foreground-secondary">
                    {plan.description}
                  </p>
                  {plan.sub && (
                    <span className="mt-2 inline-flex rounded-full bg-surface-secondary px-2.5 py-0.5 text-xs font-medium text-foreground-secondary">
                      {plan.sub}
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-baseline justify-center gap-1">
                  <span className="text-sm text-foreground-secondary">₩</span>
                  <span className="text-3xl font-bold">{plan.price.replace(/₩/g, "")}</span>
                  {plan.period && (
                    <span className="text-sm text-foreground-secondary">
                      {plan.period}
                    </span>
                  )}
                </div>

                <div className="my-4 h-px bg-border" />

                <div className="flex-1 space-y-3 pl-2 sm:pl-4">
                  {plan.features.map((group) => {
                    const disabled = group.enabled === false;
                    return (
                      <div key={group.title} className={disabled ? "opacity-35" : ""}>
                        <div className="flex items-start gap-2">
                          <Check
                            size={16}
                            className={`mt-0.5 shrink-0 ${disabled ? "text-foreground-muted" : "text-primary-500"}`}
                            strokeWidth={2.5}
                          />
                          <span className={`text-sm font-semibold ${disabled ? "text-foreground-muted line-through" : "text-foreground"}`}>{group.title}</span>
                        </div>
                        {group.details.length > 0 && (
                          <div className="ml-6 mt-0.5 space-y-0.5">
                            {group.details.map((d, i) => (
                              <p key={d} className={disabled ? "text-xs text-foreground-muted" : i === 0 ? "text-xs font-medium text-primary-600" : "text-xs text-foreground-secondary"}>{d}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {current ? (
                  <span className="mt-5 inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] border border-primary-200 text-sm font-medium text-primary-600">
                    현재 이용 중
                  </span>
                ) : plan.productId ? (
                  <button
                    onClick={() => setPendingProduct(plan.productId!)}
                    onMouseEnter={() => import("@portone/browser-sdk/v2")}
                    className="mt-5 inline-flex h-10 items-center justify-center gap-1.5 rounded-[var(--radius-lg)] bg-primary-500 text-sm font-medium text-white transition-colors hover:bg-primary-600"
                  >
                    <ShoppingCart size={15} />
                    구매하기
                  </button>
                ) : (
                  <span className="mt-5 inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] border border-border text-sm font-medium text-foreground-muted">
                    무료 플랜
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 횟수권 스토어 */}
      <div className="mb-8 sm:mb-12">
        <h2 className="mb-1.5 flex items-center gap-2 text-base font-bold text-foreground sm:mb-2 sm:text-lg">
          <Zap size={20} className="text-secondary-600" />
          횟수권
        </h2>
        <p className="mb-4 text-xs text-foreground-secondary sm:mb-5 sm:text-sm">
          플랜과 별도로 필요한 만큼만 개별 구매할 수 있습니다.
        </p>
        <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
          {addons.map((addon) => {
            return (
              <div
                key={addon.name}
                className="flex flex-col rounded-[var(--radius-xl)] border border-border bg-surface p-4 sm:p-5"
              >
                <div className="flex flex-col items-center gap-2 text-center">
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
                <div className="mt-4 flex items-baseline justify-center gap-1">
                  <span className="text-sm text-foreground-secondary">₩</span>
                  <span className="text-2xl font-bold">{addon.price}</span>
                  <span className="text-sm text-foreground-secondary">
                    {" "}
                    / {addon.unit}
                  </span>
                </div>
                <button
                  onClick={() => setPendingProduct(addon.productId)}
                  onMouseEnter={() => import("@portone/browser-sdk/v2")}
                  className="mt-4 w-full inline-flex h-10 items-center justify-center gap-1.5 rounded-[var(--radius-lg)] border border-border text-sm font-medium text-foreground transition-colors hover:bg-surface-secondary"
                >
                  <ShoppingCart size={15} />
                  구매하기
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 하단 안내 */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface-secondary p-4 text-center text-xs text-foreground-secondary sm:p-5 sm:text-sm">
        <p>
          모든 결제는 안전하게 처리됩니다. 플랜 상세 비교는{" "}
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
