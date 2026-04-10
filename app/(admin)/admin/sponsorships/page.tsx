"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Heart, Loader2, DollarSign, Coins, Wallet } from "lucide-react";
import {
  getSponsorships,
  getSponsorshipStats,
  getOneTimeSponsors,
} from "@/lib/actions/admin/sponsorships";

// ── 상수 ──

const STATUS_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "active", label: "활성" },
  { value: "scheduled_cancel", label: "취소 예정" },
  { value: "cancelled", label: "취소" },
  { value: "expired", label: "만료" },
];

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: "활성", bg: "bg-green-50", text: "text-green-700" },
  scheduled_cancel: { label: "취소 예정", bg: "bg-amber-50", text: "text-amber-600" },
  cancelled: { label: "취소", bg: "bg-red-50", text: "text-red-600" },
  expired: { label: "만료", bg: "bg-gray-100", text: "text-gray-600" },
  paused: { label: "일시정지", bg: "bg-blue-50", text: "text-blue-600" },
};

const TABS = [
  { key: "recurring", label: "정기 후원" },
  { key: "onetime", label: "일회성 후원" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ── 유틸 ──

function formatAmount(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] || { label: status, bg: "bg-gray-100", text: "text-gray-600" };
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

// ── 통계 카드 ──

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-center">
      <div className="flex items-center justify-center gap-1.5">
        {icon}
        <span className="text-[11px] text-foreground-muted">{label}</span>
      </div>
      <div className="mt-1 flex items-baseline justify-center">
        <span className="text-lg font-bold tabular-nums text-foreground">{value}</span>
      </div>
    </div>
  );
}

// ── 정기 후원 탭 ──

function RecurringTab() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");

  const { data: result, isLoading } = useQuery({
    queryKey: ["admin-sponsorships", page, status],
    queryFn: () => getSponsorships({ page, pageSize: 20, status }),
    staleTime: 30_000,
  });

  const sponsorships = result?.data || [];
  const total = result?.total || 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      {/* 상태 필터 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setStatus(opt.value); setPage(1); }}
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
        {total > 0 && (
          <span className="text-xs text-foreground-muted">
            총 <span className="font-semibold text-foreground">{total}</span>명
          </span>
        )}
      </div>

      {/* 테이블 */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex bg-surface-secondary/50 px-4 py-2.5 text-[11px] font-semibold text-foreground-muted">
          <span className="flex-[2]">사용자</span>
          <span className="flex-[2] text-center">이메일</span>
          <span className="flex-[1] text-center">금액</span>
          <span className="flex-[1] text-center">상태</span>
          <span className="flex-[1] text-center">시작일</span>
          <span className="flex-[1] text-center">만료/취소</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-primary-400" />
          </div>
        ) : sponsorships.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16">
            <Heart size={32} className="text-foreground-muted/50" />
            <span className="text-sm text-foreground-muted">정기 후원 내역이 없습니다.</span>
          </div>
        ) : (
          sponsorships.map((s, idx) => (
            <div
              key={s.id}
              className={`flex items-center px-4 py-3 text-xs ${idx > 0 ? "border-t border-border/50" : ""}`}
            >
              <span className="flex-[2] truncate font-medium text-foreground">
                {s.display_name || s.email}
              </span>
              <span className="flex-[2] truncate text-center text-foreground-muted">{s.email}</span>
              <span className="flex-[1] text-center font-medium tabular-nums text-foreground">
                {formatAmount(s.amount_cents)}
              </span>
              <span className="flex-[1] text-center">
                <StatusBadge status={s.status} />
              </span>
              <span className="flex-[1] text-center text-foreground-muted">{formatDate(s.started_at)}</span>
              <span className="flex-[1] text-center text-foreground-muted">
                {s.cancelled_at ? formatDate(s.cancelled_at) : s.current_period_end ? formatDate(s.current_period_end) : "-"}
              </span>
            </div>
          ))
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
          <span className="text-xs tabular-nums text-foreground-muted">{page} / {totalPages}</span>
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

// ── 일회성 후원 탭 ──

function OneTimeTab() {
  const [page, setPage] = useState(1);

  const { data: result, isLoading } = useQuery({
    queryKey: ["admin-onetime-sponsors", page],
    queryFn: () => getOneTimeSponsors({ page, pageSize: 20 }),
    staleTime: 30_000,
  });

  const sponsors = result?.data || [];
  const total = result?.total || 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      {total > 0 && (
        <div className="flex justify-end">
          <span className="text-xs text-foreground-muted">
            총 <span className="font-semibold text-foreground">{total}</span>건
          </span>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex bg-surface-secondary/50 px-4 py-2.5 text-[11px] font-semibold text-foreground-muted">
          <span className="flex-[2]">사용자</span>
          <span className="flex-[3] text-center">이메일</span>
          <span className="flex-[1] text-center">금액</span>
          <span className="flex-[2] text-center">결제일</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-primary-400" />
          </div>
        ) : sponsors.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16">
            <Heart size={32} className="text-foreground-muted/50" />
            <span className="text-sm text-foreground-muted">일회성 후원 내역이 없습니다.</span>
          </div>
        ) : (
          sponsors.map((s, idx) => (
            <div
              key={s.id}
              className={`flex items-center px-4 py-3 text-xs ${idx > 0 ? "border-t border-border/50" : ""}`}
            >
              <span className="flex-[2] truncate font-medium text-foreground">
                {s.display_name || s.email}
              </span>
              <span className="flex-[3] truncate text-center text-foreground-muted">{s.email}</span>
              <span className="flex-[1] text-center font-medium tabular-nums text-foreground">
                {formatAmount(s.amount_cents)}
              </span>
              <span className="flex-[2] text-center text-foreground-muted">{formatDate(s.paid_at)}</span>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary disabled:opacity-40"
          >
            이전
          </button>
          <span className="text-xs tabular-nums text-foreground-muted">{page} / {totalPages}</span>
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

// ── 메인 페이지 ──

export default function AdminSponsorshipsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("recurring");

  // 통계
  const { data: stats } = useQuery({
    queryKey: ["admin-sponsorship-stats"],
    queryFn: () => getSponsorshipStats(),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <h1 className="text-xl font-bold text-foreground">후원 관리</h1>

      {/* 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            icon={<Heart size={16} className="text-pink-500" />}
            label="활성 후원자"
            value={`${stats.activeSponsorCount}명`}
          />
          <StatCard
            icon={<DollarSign size={16} className="text-green-500" />}
            label="이번 달 후원"
            value={formatAmount(stats.monthlyRevenueCents)}
          />
          <StatCard
            icon={<Coins size={16} className="text-amber-500" />}
            label="누적 후원"
            value={formatAmount(stats.totalRevenueCents)}
          />
          <StatCard
            icon={<Wallet size={16} className="text-indigo-500" />}
            label="평균 후원액"
            value={formatAmount(stats.avgAmountCents)}
          />
        </div>
      )}

      {/* 탭 */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "text-primary-600"
                : "text-foreground-muted hover:text-foreground-secondary"
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary-500" />
            )}
          </button>
        ))}
      </div>

      {/* 탭 컨텐츠 */}
      {activeTab === "recurring" ? <RecurringTab /> : <OneTimeTab />}
    </div>
  );
}
