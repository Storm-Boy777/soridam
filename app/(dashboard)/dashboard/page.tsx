import Link from "next/link";
import { Play, ArrowRight, Compass, Coins } from "lucide-react";
import { T } from "@/lib/constants/tables";
import { getAuthClaims, getUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { formatUsd } from "@/lib/constants/pricing";
import { getDashboardLearningStats } from "@/lib/actions/dashboard";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { DashboardKpis } from "@/components/dashboard/dashboard-kpis";
import { DashboardResume } from "@/components/dashboard/dashboard-resume";
import { DashboardRoadmap } from "@/components/dashboard/dashboard-roadmap";
import { BetaSection } from "@/components/beta/beta-section";

export const metadata = {
  title: "대시보드",
};

export default async function DashboardPage() {
  const claims = await getAuthClaims();
  const userId = claims?.sub as string | undefined;
  const isAdmin = (claims?.app_metadata as { role?: string } | undefined)?.role === "admin";

  const supabase = await createServerSupabaseClient();

  const [user, learning, balanceRow, creditRow] = await Promise.all([
    getUser(),
    getDashboardLearningStats(),
    userId
      ? supabase.from(T.polar_balances).select("balance_cents").eq("user_id", userId).single()
      : Promise.resolve({ data: null }),
    userId
      ? supabase.from(T.user_credits).select("current_plan, plan_expires_at").eq("user_id", userId).single()
      : Promise.resolve({ data: null }),
  ]);

  const meta = (user?.user_metadata ?? {}) as Record<string, string>;
  const userName = meta.display_name || meta.full_name || meta.name || "";
  const balanceCents = (balanceRow?.data as { balance_cents?: number } | null)?.balance_cents ?? 0;
  const credit = creditRow?.data as { current_plan?: string; plan_expires_at?: string } | null;
  const isBeta = credit?.current_plan === "beta";

  return (
    <div className="space-y-6 pb-6 pt-1 sm:space-y-7 sm:pb-8 sm:pt-2 lg:pt-0">
      {/* A. 다크 히어로 */}
      <DashboardHero
        userName={userName}
        currentGrade={meta.current_grade || ""}
        targetGrade={meta.target_grade || ""}
        examDate={meta.exam_date || ""}
      />

      {/* 베타 배너 (조건부) */}
      {isBeta && (
        <BetaSection planExpiresAt={credit?.plan_expires_at ?? null} balanceCents={balanceCents} />
      )}

      {/* B. 학습 KPI */}
      <DashboardKpis data={learning} />

      {/* C. 이어하기 */}
      <DashboardResume data={learning} />

      {/* D. 로드맵 + E. 보조 2열 */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <DashboardRoadmap data={learning} isAdmin={isAdmin} />
        </div>

        <div className="space-y-4 lg:col-span-2 lg:sticky lg:top-20 lg:self-start">
          {/* 나의 스크립트 플레이어 — 플레이어다운 비주얼(인디고 그라데 + 재생 버튼 + 이퀄라이저) */}
          <Link
            href="/listen"
            className="group relative flex flex-col overflow-hidden rounded-[var(--radius-xl)] bg-gradient-to-br from-primary-500 to-primary-700 p-5 text-white shadow-[var(--shadow-card)] transition-all hover:shadow-[var(--shadow-card-hover)]"
          >
            {/* 이퀄라이저 장식 */}
            <div className="pointer-events-none absolute right-4 top-4 flex items-end gap-1 opacity-60">
              <span className="block h-2 w-1 rounded-full bg-white/70" />
              <span className="block h-5 w-1 rounded-full bg-white/70" />
              <span className="block h-3 w-1 rounded-full bg-white/70" />
              <span className="block h-4 w-1 rounded-full bg-white/70" />
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/30 transition-transform group-hover:scale-105">
                <Play size={16} className="ml-0.5" fill="currentColor" />
              </div>
              <span className="text-sm font-semibold">나의 스크립트 플레이어</span>
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-white/75">
              나의 스크립트를 음악처럼 들으며 익혀 보세요.
            </p>
            <span className="mt-3 flex w-full items-center justify-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary-700 transition-colors group-hover:bg-white/90">
              바로 듣기
              <ArrowRight size={14} />
            </span>
          </Link>

          {/* 전략 가이드 (다크) */}
          <div className="rounded-[var(--radius-xl)] border border-foreground/10 bg-foreground p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] bg-white/10">
                <Compass size={18} className="text-accent-300" />
              </div>
              <span className="text-sm font-semibold text-white">OPIc 전략 가이드</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-white/60">
              데이터로 증명된 서베이·난이도 전략을 확인하세요.
            </p>
            <Link
              href="/strategy"
              className="mt-3 flex w-full items-center justify-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-white/90"
            >
              전략 가이드
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* 크레딧 (흰 카드 + 앰버 포인트, 가독성 우선) */}
          <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] bg-amber-100 text-amber-600">
                  <Coins size={18} />
                </div>
                <span className="text-sm font-semibold text-foreground">크레딧</span>
              </div>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                {formatUsd(balanceCents)}
              </span>
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-foreground-secondary">
              모의고사·스크립트·튜터링 이용에 사용돼요
            </p>
            <Link
              href="/store"
              className="mt-3 flex items-center justify-center gap-1 rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
            >
              충전하기
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
