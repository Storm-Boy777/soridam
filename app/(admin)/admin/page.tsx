import { Suspense } from "react";
import { Users, CreditCard, GraduationCap, Clock, TrendingUp, BarChart3, ClipboardList, FileText, BookOpen } from "lucide-react";
import { getAdminDashboardStats, getRecentActivity, getConversionMetrics } from "@/lib/actions/admin/stats";
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
          value={`₩${m.avgOrderValue.toLocaleString()}`}
        />
        <MetricCard
          icon={<Users size={16} className="text-blue-500" />}
          label="결제 회원"
          value={`${m.paidUsers}명`}
          sub={`/ ${m.totalUsers}명`}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
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
        <MetricCard
          icon={<BookOpen size={16} className="text-violet-500" />}
          label="튜터링"
          value={`${m.tutoringRate}%`}
          sub={`${m.tutoringUsers}명`}
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
