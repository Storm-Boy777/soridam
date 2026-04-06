"use client";

import Link from "next/link";
import { T } from "@/lib/constants/tables";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase";
import { Wallet, TrendingDown, TrendingUp } from "lucide-react";

/* ── 잔액 fetch ── */

async function fetchBalance(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(T.polar_balances)
    .select("balance_krw, total_charged, total_used")
    .eq("user_id", userId)
    .single();

  if (error) return { balance_krw: 0, total_charged: 0, total_used: 0 };
  return data;
}

/* ── 플레이스홀더 ── */

function StatsPlaceholder() {
  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 sm:gap-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-[100px] rounded-[var(--radius-xl)] border border-border bg-surface p-3.5 sm:h-[118px] sm:p-5"
        />
      ))}
    </div>
  );
}

/* ── 메인 컴포넌트 ── */

export function DashboardStats({
  userId,
  initialCredits,
}: {
  userId: string;
  initialCredits?: Record<string, unknown>;
}) {
  const { data: balance, isLoading } = useQuery({
    queryKey: ["polar-balance", userId],
    queryFn: () => fetchBalance(userId),
    staleTime: 60 * 1000,
    retry: 2,
  });

  if (isLoading && !balance) return <StatsPlaceholder />;

  const balanceKrw = balance?.balance_krw ?? 0;
  const totalCharged = balance?.total_charged ?? 0;
  const totalUsed = balance?.total_used ?? 0;

  const stats = [
    {
      label: "크레딧 잔액",
      value: `₩${balanceKrw.toLocaleString()}`,
      icon: Wallet,
      color: "bg-primary-50 text-primary-500",
      href: "/store",
    },
    {
      label: "누적 충전",
      value: `₩${totalCharged.toLocaleString()}`,
      icon: TrendingUp,
      color: "bg-emerald-50 text-emerald-500",
      href: null,
    },
    {
      label: "누적 사용",
      value: `₩${totalUsed.toLocaleString()}`,
      icon: TrendingDown,
      color: "bg-secondary-50 text-secondary-600",
      href: null,
    },
  ];

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 sm:gap-4">
      {stats.map((s) => {
        const inner = (
          <div className="flex items-center gap-3 sm:flex-col sm:items-center sm:text-center">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-lg)] sm:h-10 sm:w-10 ${s.color}`}
            >
              <s.icon size={18} className="sm:hidden" />
              <s.icon size={20} className="hidden sm:block" />
            </div>
            <div className="sm:mt-2">
              <p className="text-xs text-foreground-secondary sm:text-sm">{s.label}</p>
              <p className="text-xl font-bold text-foreground sm:mt-1 sm:text-2xl">
                {s.value}
              </p>
            </div>
          </div>
        );

        return s.href ? (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-[var(--radius-xl)] border border-border bg-surface p-3.5 transition-all hover:border-border-hover hover:shadow-[var(--shadow-card)] sm:p-5"
          >
            {inner}
          </Link>
        ) : (
          <div
            key={s.label}
            className="rounded-[var(--radius-xl)] border border-border bg-surface p-3.5 sm:p-5"
          >
            {inner}
          </div>
        );
      })}
    </div>
  );
}
