"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2,
  CreditCard,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { getOrders, getRevenueStats, refundOrder } from "@/lib/actions/admin/payments";
import type { AdminOrder, RevenueStats } from "@/lib/types/admin";

// ── 상수 ──

const STATUS_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "paid", label: "결제 완료" },
  { value: "cancelled", label: "취소" },
  { value: "failed", label: "실패" },
];

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  paid: { label: "완료", bg: "bg-green-50", text: "text-green-700" },
  cancelled: { label: "취소", bg: "bg-red-50", text: "text-red-600" },
  failed: { label: "실패", bg: "bg-gray-100", text: "text-gray-600" },
  pending: { label: "대기", bg: "bg-amber-50", text: "text-amber-600" },
  refunded: { label: "환불", bg: "bg-orange-50", text: "text-orange-600" },
};

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  credit: "AI 사용량 충전",
  credit_sponsor: "충전 + 후원",
  sponsor: "월간 후원",
};

const PROVIDER_LABELS: Record<string, string> = {
  creem: "Creem",
  polar: "Polar",
};

// ── 유틸 ──

function formatAmount(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── 상태 뱃지 ──

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] || { label: status, bg: "bg-gray-100", text: "text-gray-600" };
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

// ── 매출 통계 섹션 ──

function RevenueStatsSection({ stats }: { stats: RevenueStats }) {
  const isPositiveGrowth = stats.monthGrowth >= 0;

  return (
    <div className="space-y-4">
      {/* 4칸 그리드 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* 전체 매출 */}
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-foreground-muted">전체 매출</p>
          <p className="mt-1 text-lg font-bold text-foreground">{formatAmount(stats.totalRevenue)}</p>
        </div>
        {/* 이번 달 */}
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-foreground-muted">이번 달</p>
          <p className="mt-1 text-lg font-bold text-foreground">{formatAmount(stats.thisMonthRevenue)}</p>
        </div>
        {/* 지난 달 */}
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-foreground-muted">지난 달</p>
          <p className="mt-1 text-lg font-bold text-foreground">{formatAmount(stats.lastMonthRevenue)}</p>
        </div>
        {/* 전월 대비 */}
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-foreground-muted">전월 대비</p>
          <div className="mt-1 flex items-center gap-1">
            {isPositiveGrowth ? (
              <TrendingUp size={16} className="text-green-600" />
            ) : (
              <TrendingDown size={16} className="text-red-500" />
            )}
            <span className={`text-lg font-bold ${isPositiveGrowth ? "text-green-600" : "text-red-500"}`}>
              {isPositiveGrowth ? "+" : ""}{stats.monthGrowth.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* 상품별 매출 테이블 */}
      {stats.productDistribution.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="border-b border-border/50 px-4 py-2.5">
            <p className="text-xs font-medium text-foreground-secondary">상품별 매출</p>
          </div>
          <div className="divide-y divide-border/30">
            {stats.productDistribution.slice(0, 4).map((p) => (
              <div key={p.productId} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{p.productName}</span>
                  <span className="text-xs text-foreground-muted">{p.count}건</span>
                </div>
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {formatAmount(p.revenue)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 메인 페이지 ──

export default function AdminPaymentsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showRefundFor, setShowRefundFor] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refunding, setRefunding] = useState(false);

  // 매출 통계
  const { data: revenueStats } = useQuery({
    queryKey: ["admin-revenue-stats"],
    queryFn: () => getRevenueStats(),
    staleTime: 5 * 60 * 1000,
  });

  // 주문 목록
  const { data: ordersResult, isLoading } = useQuery({
    queryKey: ["admin-orders", page, status],
    queryFn: () => getOrders({ page, pageSize: 20, status }),
    staleTime: 30_000,
  });

  const orders = ordersResult?.data || [];
  const total = ordersResult?.total || 0;
  const totalPages = Math.ceil(total / 20);

  // 아코디언 토글
  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
    // 다른 항목으로 전환하거나 닫을 때 환불 폼 초기화
    setShowRefundFor(null);
    setRefundReason("");
  };

  // 환불 처리
  const handleRefund = async (orderId: string) => {
    if (!refundReason.trim()) return;
    setRefunding(true);
    try {
      const result = await refundOrder({ orderId, reason: refundReason.trim() });
      if (result.success) {
        toast.success("환불이 완료되었습니다");
        setShowRefundFor(null);
        setRefundReason("");
        // 목록 + 통계 갱신
        queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
        queryClient.invalidateQueries({ queryKey: ["admin-revenue-stats"] });
      } else {
        toast.error(result.error || "환불 처리에 실패했습니다");
      }
    } finally {
      setRefunding(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground">결제 관리</h1>
          <button
            onClick={async () => {
              const { toCSV, downloadCSV } = await import("@/lib/utils/csv-export");
              const csv = toCSV(orders as unknown as Record<string, unknown>[], [
                { key: "user_email", label: "이메일" },
                { key: "product_name", label: "상품" },
                { key: "amount", label: "금액" },
                { key: "status", label: "상태" },
                { key: "pay_method", label: "결제수단" },
                { key: "paid_at", label: "결제일" },
              ]);
              downloadCSV(csv, `payments_${new Date().toISOString().split("T")[0]}.csv`);
            }}
            className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground-secondary hover:bg-surface-secondary"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            CSV
          </button>
        </div>
        {total > 0 && (
          <span className="text-sm text-foreground-muted">
            총 <span className="font-semibold text-foreground">{total}</span>건
          </span>
        )}
      </div>

      {/* 매출 통계 */}
      {revenueStats && <RevenueStatsSection stats={revenueStats} />}

      {/* 상태 필터 */}
      <div className="flex gap-1">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              setStatus(opt.value);
              setPage(1);
              setExpandedId(null);
              setShowRefundFor(null);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              status === opt.value
                ? "bg-primary-500 text-white"
                : "bg-surface-secondary text-foreground-secondary hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 주문 목록 */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-primary-400" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16">
            <CreditCard size={32} className="text-foreground-muted/50" />
            <span className="text-sm text-foreground-muted">결제 내역이 없습니다.</span>
          </div>
        ) : (
          orders.map((order, idx) => {
            const isExpanded = expandedId === order.id;
            const isRefundTarget = showRefundFor === order.id;

            return (
              <div
                key={order.id}
                className={idx < orders.length - 1 ? "border-b border-border/50" : ""}
              >
                {/* 요약 행 */}
                <button
                  onClick={() => toggleExpand(order.id)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-secondary"
                >
                  {/* 날짜 + 사용자 */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {order.user_name || order.user_email}
                      </span>
                      {order.user_name && (
                        <span className="hidden truncate text-xs text-foreground-muted sm:inline">
                          {order.user_email}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-foreground-muted">
                      <span>{formatDate(order.created_at)}</span>
                      <span className="text-border">|</span>
                      <span>{PRODUCT_TYPE_LABELS[order.product_name] || order.product_name}</span>
                    </div>
                  </div>

                  {/* 금액 + 상태 */}
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {formatAmount(order.amount)}
                    </span>
                    <StatusBadge status={order.status} />
                    {isExpanded ? (
                      <ChevronUp size={14} className="text-foreground-muted" />
                    ) : (
                      <ChevronDown size={14} className="text-foreground-muted" />
                    )}
                  </div>
                </button>

                {/* 상세 확장 영역 */}
                {isExpanded && (
                  <div className="border-t border-border/30 bg-surface-secondary/50 px-4 py-3.5">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                      <div>
                        <span className="text-xs text-foreground-muted">결제 ID</span>
                        <p className="mt-0.5 truncate font-mono text-xs text-foreground-secondary">
                          {order.payment_id || "-"}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-foreground-muted">결제 Provider</span>
                        <p className="mt-0.5 text-xs text-foreground-secondary">
                          {PROVIDER_LABELS[order.pg_provider] || order.pg_provider || "-"}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-foreground-muted">상품 유형</span>
                        <p className="mt-0.5 text-xs text-foreground-secondary">
                          {PRODUCT_TYPE_LABELS[order.product_name] || order.product_name || "-"}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-foreground-muted">충전 크레딧</span>
                        <p className="mt-0.5 text-xs text-foreground-secondary">
                          {(order as unknown as { credit_amount?: number }).credit_amount
                            ? formatAmount((order as unknown as { credit_amount: number }).credit_amount)
                            : "-"}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-foreground-muted">결제일시</span>
                        <p className="mt-0.5 text-xs text-foreground-secondary">
                          {order.paid_at ? formatDate(order.paid_at) : "-"}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-foreground-muted">영수증</span>
                        <p className="mt-0.5">
                          {order.receipt_url ? (
                            <a
                              href={order.receipt_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline"
                            >
                              보기 <ExternalLink size={10} />
                            </a>
                          ) : (
                            <span className="text-xs text-foreground-muted">-</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* 환불 버튼 (paid 상태만) */}
                    {order.status === "paid" && !isRefundTarget && (
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowRefundFor(order.id);
                            setRefundReason("");
                          }}
                          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                        >
                          <RefreshCw size={12} />
                          환불
                        </button>
                      </div>
                    )}

                    {/* 환불 모달 (인라인) */}
                    {isRefundTarget && (
                      <div className="mt-3 rounded-lg border border-red-200 bg-red-50/50 p-3">
                        <p className="text-xs font-medium text-red-700">환불 사유를 입력해주세요</p>
                        <textarea
                          value={refundReason}
                          onChange={(e) => setRefundReason(e.target.value)}
                          placeholder="환불 사유 입력..."
                          className="mt-2 w-full resize-none rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-red-400 focus:outline-none"
                          rows={2}
                        />
                        <p className="mt-1.5 text-[11px] text-red-500">
                          환불 시 해당 이용권이 자동 회수됩니다
                        </p>
                        <div className="mt-2 flex justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowRefundFor(null);
                              setRefundReason("");
                            }}
                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary"
                          >
                            취소
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRefund(order.id);
                            }}
                            disabled={!refundReason.trim() || refunding}
                            className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                          >
                            {refunding && <Loader2 size={12} className="animate-spin" />}
                            환불 확인
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary disabled:opacity-40"
          >
            이전
          </button>
          <span className="text-xs tabular-nums text-foreground-muted">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary disabled:opacity-40"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
