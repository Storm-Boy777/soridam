import { Suspense } from "react";
import { Users, CreditCard, GraduationCap, Clock, TrendingUp, BarChart3, ClipboardList, FileText, Cpu, AlertTriangle, Coins, HardDrive, UserX } from "lucide-react";
import { getAdminDashboardStats, getRecentActivity, getConversionMetrics, getAICostStats, getSystemHealthStats, getInactiveUsersStats } from "@/lib/actions/admin/stats";
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
  const totalM = (cost.totalTokens / 1_000_000).toFixed(2);

  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground-secondary">
        <Coins size={16} className="text-amber-500" />
        AI 비용 (토큰)
      </h2>
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-2xl font-bold tabular-nums text-foreground">{totalM}M</p>
        <p className="text-xs text-foreground-muted">총 누적 토큰</p>
        <div className="mt-3 space-y-2">
          {cost.moduleBreakdown.map((m) => (
            <div key={m.module} className="flex items-center justify-between text-sm">
              <span className="text-foreground-secondary">{m.module}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-foreground-muted">{m.sessions}건</span>
                <span className="font-medium tabular-nums text-foreground">
                  {(m.tokens / 1_000_000).toFixed(2)}M
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

async function InactiveUsersSection() {
  const stats = await getInactiveUsersStats();

  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground-secondary">
        <UserX size={16} className="text-red-500" />
        사용자 활동
      </h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {/* 비활성 사용자 */}
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="mb-3 text-xs font-medium text-foreground-secondary">비활성 사용자</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className={`text-xl font-bold tabular-nums ${stats.inactive7days > 0 ? "text-amber-600" : "text-foreground"}`}>
                {stats.inactive7days}
              </p>
              <p className="text-xs text-foreground-muted">7일 미접속</p>
            </div>
            <div>
              <p className={`text-xl font-bold tabular-nums ${stats.inactive14days > 0 ? "text-orange-600" : "text-foreground"}`}>
                {stats.inactive14days}
              </p>
              <p className="text-xs text-foreground-muted">14일 미접속</p>
            </div>
            <div>
              <p className={`text-xl font-bold tabular-nums ${stats.inactive30days > 0 ? "text-red-600" : "text-foreground"}`}>
                {stats.inactive30days}
              </p>
              <p className="text-xs text-foreground-muted">30일+ 미접속</p>
            </div>
          </div>
        </div>

        {/* 최근 로그인 */}
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="mb-3 text-xs font-medium text-foreground-secondary">최근 로그인</p>
          {stats.recentLogins.length === 0 ? (
            <p className="py-4 text-center text-xs text-foreground-muted">로그인 기록이 없습니다</p>
          ) : (
            <div className="space-y-1.5">
              {stats.recentLogins.slice(0, 5).map((l, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="truncate text-foreground">{l.email}</span>
                  <span className="shrink-0 text-foreground-muted">
                    {new Date(l.last_login).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
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

      {/* 비활성 사용자 + 최근 로그인 */}
      <Suspense fallback={<SectionSkeleton />}>
        <InactiveUsersSection />
      </Suspense>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground-secondary">최근 활동</h2>
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
