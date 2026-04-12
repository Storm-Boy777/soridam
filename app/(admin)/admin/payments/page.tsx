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
  DollarSign,
  Coins,
  Wallet,
  Activity,
} from "lucide-react";
import { getOrders, getRevenueStats, refundOrder, getApiUsageLogs } from "@/lib/actions/admin/payments";
import { getAICostStats, getAdminDashboardStats } from "@/lib/actions/admin/stats";
import type { AICostStats } from "@/lib/actions/admin/stats";
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

const SESSION_TYPE_LABELS: Record<string, string> = {
  mock_exam: "모의고사",
  script: "스크립트",
  tutoring: "튜터링",
  shadowing: "쉐도잉",
};

const SESSION_TYPE_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "mock_exam", label: "모의고사" },
  { value: "script", label: "스크립트" },
  { value: "tutoring", label: "튜터링" },
  { value: "shadowing", label: "쉐도잉" },
];

// ── 유틸 ──

function formatAmount(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatUsd(usd: number) {
  return `$${usd.toFixed(2)}`;
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

// ── 요약 카드 ──

function SummaryCard({ icon, label, value, sub }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xs text-foreground-muted">{label}</span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="text-xl font-bold tabular-nums text-foreground">{value}</span>
        {sub && <span className="text-xs text-foreground-muted">{sub}</span>}
      </div>
    </div>
  );
}

// ── 충전 이력 탭 ──

function ChargeHistoryTab() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showRefundFor, setShowRefundFor] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refunding, setRefunding] = useState(false);

  const { data: ordersResult, isLoading } = useQuery({
    queryKey: ["admin-orders", page, status],
    queryFn: () => getOrders({ page, pageSize: 20, status }),
    staleTime: 30_000,
  });

  const orders = ordersResult?.data || [];
  const total = ordersResult?.total || 0;
  const totalPages = Math.ceil(total / 20);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
    setShowRefundFor(null);
    setRefundReason("");
  };

  const handleRefund = async (orderId: string) => {
    if (!refundReason.trim()) return;
    setRefunding(true);
    try {
      const result = await refundOrder({ orderId, reason: refundReason.trim() });
      if (result.success) {
        toast.success("환불이 완료되었습니다");
        setShowRefundFor(null);
        setRefundReason("");
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
    <div className="space-y-4">
      {/* 상태 필터 */}
      <div className="flex gap-1">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setStatus(opt.value); setPage(1); setExpandedId(null); }}
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
              <div key={order.id} className={idx < orders.length - 1 ? "border-b border-border/50" : ""}>
                <button
                  onClick={() => toggleExpand(order.id)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-secondary"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {order.user_name || order.user_email}
                      </span>
                      {order.user_name && (
                        <span className="hidden truncate text-xs text-foreground-muted sm:inline">{order.user_email}</span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-foreground-muted">
                      <span>{formatDate(order.created_at)}</span>
                      <span className="text-border">|</span>
                      <span>{PRODUCT_TYPE_LABELS[order.product_name] || order.product_name}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-semibold tabular-nums text-foreground">{formatAmount(order.amount)}</span>
                    <StatusBadge status={order.status} />
                    {isExpanded ? <ChevronUp size={14} className="text-foreground-muted" /> : <ChevronDown size={14} className="text-foreground-muted" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border/30 bg-surface-secondary/50 px-4 py-3.5">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                      <div>
                        <span className="text-xs text-foreground-muted">결제 ID</span>
                        <p className="mt-0.5 truncate font-mono text-xs text-foreground-secondary">{order.payment_id || "-"}</p>
                      </div>
                      <div>
                        <span className="text-xs text-foreground-muted">상품 유형</span>
                        <p className="mt-0.5 text-xs text-foreground-secondary">{PRODUCT_TYPE_LABELS[order.product_name] || order.product_name || "-"}</p>
                      </div>
                      <div>
                        <span className="text-xs text-foreground-muted">결제일시</span>
                        <p className="mt-0.5 text-xs text-foreground-secondary">{order.paid_at ? formatDate(order.paid_at) : "-"}</p>
                      </div>
                    </div>

                    {order.status === "paid" && !isRefundTarget && (
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowRefundFor(order.id); setRefundReason(""); }}
                          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                        >
                          <RefreshCw size={12} /> 환불
                        </button>
                      </div>
                    )}

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
                        <div className="mt-2 flex justify-end gap-2">
                          <button onClick={(e) => { e.stopPropagation(); setShowRefundFor(null); }} className="rounded-lg px-3 py-1.5 text-xs font-medium text-foreground-secondary hover:bg-surface-secondary">취소</button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRefund(order.id); }}
                            disabled={!refundReason.trim() || refunding}
                            className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
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
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg px-3 py-1.5 text-xs font-medium text-foreground-secondary hover:bg-surface-secondary disabled:opacity-40">이전</button>
          <span className="text-xs tabular-nums text-foreground-muted">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg px-3 py-1.5 text-xs font-medium text-foreground-secondary hover:bg-surface-secondary disabled:opacity-40">다음</button>
        </div>
      )}
    </div>
  );
}

// ── 사용 이력 탭 ──

function UsageHistoryTab() {
  const [page, setPage] = useState(1);
  const [sessionType, setSessionType] = useState("all");

  const { data: result, isLoading } = useQuery({
    queryKey: ["admin-api-usage", page, sessionType],
    queryFn: () => getApiUsageLogs({ page, pageSize: 20, sessionType }),
    staleTime: 30_000,
  });

  const logs = result?.data || [];
  const total = result?.total || 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      {/* 모듈 필터 */}
      <div className="flex gap-1">
        {SESSION_TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setSessionType(opt.value); setPage(1); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              sessionType === opt.value
                ? "bg-primary-500 text-white"
                : "bg-surface-secondary text-foreground-secondary hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 사용 로그 테이블 */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {/* 헤더 */}
        <div className="flex bg-surface-secondary/50 px-4 py-2.5 text-[11px] font-semibold text-foreground-muted">
          <span className="flex-[2]">사용자</span>
          <span className="flex-[1.5] text-center">기능</span>
          <span className="flex-[1.5] text-center">서비스</span>
          <span className="flex-[1] text-center">토큰</span>
          <span className="flex-[1] text-center">비용</span>
          <span className="flex-[1.5] text-center">시간</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-primary-400" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16">
            <Activity size={32} className="text-foreground-muted/50" />
            <span className="text-sm text-foreground-muted">사용 내역이 없습니다.</span>
          </div>
        ) : (
          logs.map((log, idx) => (
            <div key={log.id} className={`flex items-center px-4 py-2.5 text-xs ${idx > 0 ? "border-t border-border" : ""}`}>
              <span className="flex-[2] truncate font-medium text-foreground">
                {log.user_name || log.user_email}
              </span>
              <span className="flex-[1.5] text-center text-foreground-secondary">
                {SESSION_TYPE_LABELS[log.session_type] || log.session_type}
              </span>
              <span className="flex-[1.5] truncate text-center text-foreground-muted">
                {log.model || log.service}
              </span>
              <span className="flex-[1] text-center font-mono tabular-nums text-foreground-muted">
                {(log.tokens_in + log.tokens_out).toLocaleString()}
              </span>
              <span className="flex-[1] text-center font-mono font-medium tabular-nums text-amber-600">
                ${log.cost_usd.toFixed(4)}
              </span>
              <span className="flex-[1.5] text-center text-foreground-muted">
                {formatDate(log.created_at)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg px-3 py-1.5 text-xs font-medium text-foreground-secondary hover:bg-surface-secondary disabled:opacity-40">이전</button>
          <span className="text-xs tabular-nums text-foreground-muted">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg px-3 py-1.5 text-xs font-medium text-foreground-secondary hover:bg-surface-secondary disabled:opacity-40">다음</button>
        </div>
      )}
    </div>
  );
}

// ── 메인 페이지 ──

const TABS = [
  { key: "charge", label: "충전 이력" },
  { key: "usage", label: "사용 이력" },
] as const;

export default function AdminPaymentsPage() {
  const [activeTab, setActiveTab] = useState<"charge" | "usage">("charge");

  // 상단 요약 데이터
  const { data: dashStats } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: () => getAdminDashboardStats(),
    staleTime: 60_000,
  });

  const { data: costStats } = useQuery({
    queryKey: ["admin-ai-cost-stats"],
    queryFn: () => getAICostStats(),
    staleTime: 60_000,
  });

  const totalCharged = (dashStats?.totalChargedCents || 0) / 100;
  const totalUsed = costStats?.totalCostUsd || 0;
  const balance = ((dashStats?.totalChargedCents || 0) - (dashStats?.totalUsedCents || 0)) / 100;
  const monthlyAiCost = dashStats?.monthlyAICostUsd || 0;
  const maxBar = Math.max(totalCharged, totalUsed, 1);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <h1 className="text-xl font-bold text-foreground">AI 크레딧</h1>

      {/* 상단 요약 4카드 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard
          icon={<DollarSign size={16} className="text-green-500" />}
          label="총 충전액"
          value={formatUsd(totalCharged)}
          sub="net"
        />
        <SummaryCard
          icon={<Coins size={16} className="text-amber-500" />}
          label="총 AI 사용액"
          value={formatUsd(totalUsed)}
        />
        <SummaryCard
          icon={<Wallet size={16} className="text-primary-500" />}
          label="잔여 균형"
          value={formatUsd(balance)}
        />
        <SummaryCard
          icon={<Activity size={16} className="text-rose-500" />}
          label="이번 달 AI 비용"
          value={formatUsd(monthlyAiCost)}
        />
      </div>

      {/* 충전 vs 사용 비주얼 */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="space-y-3">
          {/* 충전 바 */}
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-foreground-secondary">
                <DollarSign size={13} className="text-green-500" />
                크레딧 충전 총액
              </span>
              <span className="font-bold tabular-nums text-green-600">{formatUsd(totalCharged)}</span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-surface-secondary">
              <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${(totalCharged / maxBar) * 100}%` }} />
            </div>
          </div>
          {/* 사용 바 */}
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-foreground-secondary">
                <Coins size={13} className="text-amber-500" />
                AI 비용 총액
              </span>
              <span className="font-bold tabular-nums text-amber-600">{formatUsd(totalUsed)}</span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-surface-secondary">
              <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${(totalUsed / maxBar) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* 잔여 균형 */}
        <div className="mt-4 flex items-center justify-between rounded-lg bg-surface-secondary px-4 py-2.5">
          <span className="text-sm text-foreground-secondary">잔여 균형</span>
          <span className={`text-base font-bold tabular-nums ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatUsd(balance)}
          </span>
        </div>

        {/* 모듈별 비용 */}
        {costStats && costStats.moduleBreakdown.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-border pt-4">
            <p className="text-xs font-medium text-foreground-muted">모듈별 비용</p>
            {costStats.moduleBreakdown.map((m) => (
              <div key={m.module} className="flex items-center justify-between text-xs">
                <span className="text-foreground-secondary">{m.module}</span>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums text-foreground-muted">{m.calls}건</span>
                  <span className="font-medium tabular-nums text-foreground">{formatUsd(m.costUsd)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2탭 */}
      <div className="flex border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-4 py-3 text-xs font-medium transition-colors sm:px-6 sm:text-sm ${
              activeTab === tab.key
                ? "text-foreground"
                : "text-foreground-muted hover:text-foreground-secondary"
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-foreground" />
            )}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === "charge" ? <ChargeHistoryTab /> : <UsageHistoryTab />}
    </div>
  );
}
