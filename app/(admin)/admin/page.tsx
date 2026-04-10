import { Suspense } from "react";
import Link from "next/link";
import { Users, CreditCard, GraduationCap, Clock, TrendingUp, BarChart3, ClipboardList, FileText, Cpu, AlertTriangle, Coins, HardDrive, UserX, UserPlus, ChevronRight } from "lucide-react";
import { getAdminDashboardStats, getRecentActivity, getConversionMetrics, getAICostStats, getSystemHealthStats, getUserEngagementStats, getRecentSignups } from "@/lib/actions/admin/stats";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { AdminTrendCharts } from "@/components/admin/admin-trend-charts";

async function DashboardStats() {
  const stats = await getAdminDashboardStats();

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <AdminStatCard
        icon={Users}
        label="총 회원"
        value={stats.totalUsers.toLocaleString()}
      />
      <AdminStatCard
        icon={Clock}
        label="오늘 DAU"
        value={stats.dauToday.toLocaleString()}
      />
      <AdminStatCard
        icon={CreditCard}
        label="총 매출"
        value={`${(stats.totalRevenue / 10000).toFixed(1)}만원`}
      />
      <AdminStatCard
        icon={GraduationCap}
        label="평가 대기"
        value={stats.pendingEvals}
      />
    </div>
  );
}

async function RecentActivityList() {
  const activities = await getRecentActivity();

  if (activities.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-foreground-muted">
        최근 활동이 없습니다
      </p>
    );
  }

  const typeLabel: Record<string, string> = {
    signup: "가입",
    order: "결제",
    mock_exam: "모의고사",
    review: "후기",
  };

  const typeColor: Record<string, string> = {
    signup: "bg-green-100 text-green-700",
    order: "bg-blue-100 text-blue-700",
    mock_exam: "bg-purple-100 text-purple-700",
    review: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="space-y-2">
      {activities.map((a) => (
        <div
          key={`${a.type}-${a.id}`}
          className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3"
        >
          <span
            className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${typeColor[a.type] || "bg-gray-100 text-gray-700"}`}
          >
            {typeLabel[a.type] || a.type}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm text-foreground">
            {a.description}
          </span>
          <span className="shrink-0 text-xs text-foreground-muted">
            {new Date(a.created_at).toLocaleString("ko-KR", {
              timeZone: "Asia/Seoul",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      ))}
    </div>
  );
}

async function ConversionStats() {
  const m = await getConversionMetrics();

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground-secondary">전환율 & 활성도</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          icon={<TrendingUp size={16} className="text-primary-500" />}
          label="가입→결제"
          value={`${m.conversionRate}%`}
          sub={`${m.paidUsers}명`}
        />
        <MetricCard
          icon={<CreditCard size={16} className="text-purple-500" />}
          label="유료 플랜"
          value={`${m.planRate}%`}
          sub={`${m.planUsers}명`}
        />
        <MetricCard
          icon={<BarChart3 size={16} className="text-teal-500" />}
          label="평균 주문액"
          value={`$${(m.avgOrderValue / 100).toFixed(2)}`}
        />
        <MetricCard
          icon={<Users size={16} className="text-blue-500" />}
          label="결제 회원"
          value={`${m.paidUsers}명`}
          sub={`/ ${m.totalUsers}명`}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          icon={<ClipboardList size={16} className="text-sky-500" />}
          label="모의고사"
          value={`${m.mockExamRate}%`}
          sub={`${m.mockExamUsers}명`}
        />
        <MetricCard
          icon={<FileText size={16} className="text-emerald-500" />}
          label="스크립트"
          value={`${m.scriptRate}%`}
          sub={`${m.scriptUsers}명`}
        />
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3.5 py-2.5">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[11px] text-foreground-muted">{label}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-lg font-bold tabular-nums text-foreground">{value}</span>
        {sub && <span className="text-xs text-foreground-muted">{sub}</span>}
      </div>
    </div>
  );
}

async function AICostSection() {
  const cost = await getAICostStats();

  const fmtTokens = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground-secondary">
        <Coins size={16} className="text-amber-500" />
        AI 비용
      </h2>
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-2xl font-bold tabular-nums text-foreground">${cost.totalCostUsd.toFixed(2)}</p>
        <p className="text-xs text-foreground-muted">총 누적 비용 · {fmtTokens(cost.totalTokens)} 토큰</p>
        <div className="mt-3 space-y-2">
          {cost.moduleBreakdown.map((m) => (
            <div key={m.module} className="flex items-center justify-between text-sm">
              <span className="text-foreground-secondary">{m.module}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-foreground-muted">{m.calls}건</span>
                <span className="font-medium tabular-nums text-foreground">
                  ${m.costUsd.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

async function SystemHealthSection() {
  const health = await getSystemHealthStats();

  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground-secondary">
        <Cpu size={16} className="text-green-500" />
        시스템 헬스
      </h2>
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-2xl font-bold tabular-nums text-foreground">{health.pendingEvals}</p>
            <p className="text-xs text-foreground-muted">평가 대기</p>
          </div>
          <div>
            <p className={`text-2xl font-bold tabular-nums ${health.failedEvals > 0 ? "text-red-600" : "text-foreground"}`}>
              {health.failedEvals}
            </p>
            <p className="text-xs text-foreground-muted">실패</p>
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums text-foreground">{health.avgWaitMinutes}분</p>
            <p className="text-xs text-foreground-muted">평균 대기</p>
          </div>
        </div>

        {/* 파이프라인 */}
        <div className="mt-4 space-y-1.5">
          {health.pipelineStatus.map((p) => (
            <div key={p.stage} className="flex items-center justify-between text-xs">
              <span className="text-foreground-secondary">{p.stage}</span>
              <div className="flex items-center gap-2">
                {p.pending > 0 && <span className="text-amber-600">{p.pending} 대기</span>}
                {p.failed > 0 && <span className="text-red-600">{p.failed} 실패</span>}
                <span className="text-foreground-muted">{p.completed} 완료</span>
              </div>
            </div>
          ))}
        </div>

        {/* Storage */}
        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-foreground-secondary">
            <HardDrive size={12} />
            Storage
          </p>
          <div className="grid grid-cols-2 gap-2">
            {health.storageUsage.map((s) => (
              <div key={s.bucket} className="flex items-center justify-between text-xs">
                <span className="text-foreground-muted">{s.bucket}</span>
                <span className="font-medium text-foreground">{s.fileCount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  kakao: "Kakao",
  email: "이메일",
};

async function RecentSignupsSection() {
  const signups = await getRecentSignups(5);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground-secondary">
          <UserPlus size={16} className="text-green-500" />
          최근 가입자
        </h2>
        <Link
          href="/admin/users"
          className="flex items-center gap-0.5 text-xs text-primary-600 hover:text-primary-700"
        >
          전체 보기
          <ChevronRight size={12} />
        </Link>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {signups.length === 0 ? (
          <p className="py-8 text-center text-xs text-foreground-muted">
            최근 가입자가 없습니다
          </p>
        ) : (
          <>
            <div className="flex border-b border-border bg-surface-secondary/50 px-4 py-2">
              <span className="flex-1 text-[11px] font-semibold text-foreground-muted">사용자</span>
              <span className="w-16 text-center text-[11px] font-semibold text-foreground-muted">가입 방법</span>
              <span className="w-20 text-right text-[11px] font-semibold text-foreground-muted">가입일</span>
            </div>
            {signups.map((u, idx) => (
              <div
                key={u.id}
                className={`flex items-center px-4 py-2.5 ${idx > 0 ? "border-t border-border" : ""}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">
                    <span className="font-medium">{u.display_name || u.email}</span>
                    {u.display_name && (
                      <span className="ml-2 text-[11px] text-foreground-muted">{u.email}</span>
                    )}
                  </p>
                </div>
                <span className="w-16 text-center">
                  <span className="rounded-md bg-surface-secondary px-1.5 py-0.5 text-[10px] font-medium text-foreground-muted">
                    {PROVIDER_LABELS[u.provider] || u.provider}
                  </span>
                </span>
                <span className="w-20 text-right text-xs text-foreground-muted">
                  {new Date(u.created_at).toLocaleDateString("ko-KR", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

async function UserEngagementSection() {
  const stats = await getUserEngagementStats();

  const weekRate = stats.totalUsers > 0
    ? ((stats.activeWeek / stats.totalUsers) * 100).toFixed(1)
    : "0";
  const monthRate = stats.totalUsers > 0
    ? ((stats.activeMonth / stats.totalUsers) * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground-secondary">
          <Users size={16} className="text-blue-500" />
          사용자 활동
        </h2>
        <Link
          href="/admin/activity"
          className="flex items-center gap-0.5 text-xs text-primary-600 hover:text-primary-700"
        >
          활동 로그 <ChevronRight size={12} />
        </Link>
      </div>

      {/* 활성 사용자 지표 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-surface px-3.5 py-2.5">
          <p className="text-[11px] text-foreground-muted">오늘 활성</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
            {stats.activeToday}
            <span className="ml-1 text-xs font-normal text-foreground-muted">명</span>
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface px-3.5 py-2.5">
          <p className="text-[11px] text-foreground-muted">주간 활성 (7일)</p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-lg font-bold tabular-nums text-foreground">{stats.activeWeek}</span>
            <span className="text-xs text-foreground-muted">명</span>
            <span className="text-xs font-medium text-primary-600">{weekRate}%</span>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface px-3.5 py-2.5">
          <p className="text-[11px] text-foreground-muted">월간 활성 (30일)</p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-lg font-bold tabular-nums text-foreground">{stats.activeMonth}</span>
            <span className="text-xs text-foreground-muted">명</span>
            <span className="text-xs font-medium text-primary-600">{monthRate}%</span>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface px-3.5 py-2.5">
          <p className="text-[11px] text-foreground-muted">미접속 (가입만)</p>
          <p className={`mt-1 text-lg font-bold tabular-nums ${stats.neverLoggedIn > 0 ? "text-red-600" : "text-foreground"}`}>
            {stats.neverLoggedIn}
            <span className="ml-1 text-xs font-normal text-foreground-muted">명</span>
          </p>
        </div>
      </div>

      {/* 최근 로그인 (고유 사용자) */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-medium text-foreground-secondary">최근 접속 사용자</p>
          <Link href="/admin/activity" className="flex items-center gap-0.5 text-[10px] text-primary-600 hover:text-primary-700">
            전체 보기 <ChevronRight size={10} />
          </Link>
        </div>
        {stats.recentLogins.length === 0 ? (
          <p className="py-4 text-center text-xs text-foreground-muted">로그인 기록이 없습니다</p>
        ) : (
          <div className="space-y-2">
            {stats.recentLogins.map((l, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-foreground">
                    {l.display_name || l.email}
                  </span>
                  {l.display_name && (
                    <span className="ml-2 text-foreground-muted">{l.email}</span>
                  )}
                </div>
                <span className="shrink-0 text-foreground-muted">
                  {new Date(l.last_login).toLocaleString("ko-KR", {
                    timeZone: "Asia/Seoul",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-5 w-32 animate-pulse rounded bg-surface-secondary" />
      <div className="h-48 animate-pulse rounded-xl border border-border bg-surface-secondary" />
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-xl border border-border bg-surface-secondary" />
      ))}
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold text-foreground">관리자 대시보드</h1>

      <Suspense fallback={<StatsSkeleton />}>
        <DashboardStats />
      </Suspense>

      {/* 전환율 & 활성도 */}
      <Suspense
        fallback={
          <div className="space-y-3">
            <div className="h-5 w-32 animate-pulse rounded bg-surface-secondary" />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg border border-border bg-surface-secondary" />
              ))}
            </div>
          </div>
        }
      >
        <ConversionStats />
      </Suspense>

      {/* 추이 차트 */}
      <AdminTrendCharts />

      {/* AI 비용 + 시스템 헬스 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<SectionSkeleton />}>
          <AICostSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <SystemHealthSection />
        </Suspense>
      </div>

      {/* 최근 가입자 */}
      <Suspense fallback={<SectionSkeleton />}>
        <RecentSignupsSection />
      </Suspense>

      {/* 사용자 활동 (활성률 + 최근 접속) */}
      <Suspense fallback={<SectionSkeleton />}>
        <UserEngagementSection />
      </Suspense>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground-secondary">최근 활동</h2>
          <Link href="/admin/activity" className="flex items-center gap-0.5 text-xs text-primary-600 hover:text-primary-700">
            전체 활동 보기 <ChevronRight size={12} />
          </Link>
        </div>
        <Suspense
          fallback={
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg border border-border bg-surface-secondary" />
              ))}
            </div>
          }
        >
          <RecentActivityList />
        </Suspense>
      </div>
    </div>
  );
}
