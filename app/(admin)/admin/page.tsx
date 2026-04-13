import { Suspense } from "react";
import Link from "next/link";
import { Users, CreditCard, GraduationCap, BookOpen, Mic, Stethoscope, FileText, Cpu, Coins, HardDrive, UserPlus, ChevronRight, ChevronDown, Wallet, DollarSign, Heart, Activity } from "lucide-react";
import { getAdminDashboardStats, getRecentActivity, getLearningActivity, getAICostStats, getSystemHealthStats, getUserEngagementStats, getRecentSignups, getSponsorshipOverview } from "@/lib/actions/admin/stats";
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
        icon={BookOpen}
        label="오늘 학습자"
        value={`${stats.todayLearners}명`}
      />
      <AdminStatCard
        icon={Coins}
        label="이번 달 AI 비용"
        value={`$${stats.monthlyAICostUsd.toFixed(2)}`}
      />
      <AdminStatCard
        icon={Wallet}
        label="크레딧 균형"
        value={`$${((stats.totalChargedCents - stats.totalUsedCents) / 100).toFixed(2)}`}
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
              hour12: false, hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      ))}
    </div>
  );
}

async function LearningActivitySection() {
  const activity = await getLearningActivity();

  const modules = [
    { icon: <GraduationCap size={16} className="text-purple-500" />, label: "모의고사", data: activity.mockExam },
    { icon: <FileText size={16} className="text-emerald-500" />, label: "스크립트", data: activity.script },
    { icon: <Mic size={16} className="text-sky-500" />, label: "쉐도잉", data: activity.shadowing },
    { icon: <Stethoscope size={16} className="text-amber-500" />, label: "튜터링", data: activity.tutoring },
  ];

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground-secondary">학습 활동</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {modules.map((m) => (
          <MetricCard
            key={m.label}
            icon={m.icon}
            label={m.label}
            value={`${m.data.totalUsers}명`}
            sub={`이번 달 ${m.data.thisMonth}건`}
          />
        ))}
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
    <div className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-center">
      <div className="flex items-center justify-center gap-1.5">
        {icon}
        <span className="text-[11px] text-foreground-muted">{label}</span>
      </div>
      <div className="mt-1 flex items-baseline justify-center gap-1">
        <span className="text-lg font-bold tabular-nums text-foreground">{value}</span>
        {sub && <span className="text-xs text-foreground-muted">{sub}</span>}
      </div>
    </div>
  );
}

async function AICostSection() {
  const cost = await getAICostStats();
  // 충전/사용 총액도 함께 가져오기
  const stats = await getAdminDashboardStats();

  const totalCharged = stats.totalChargedCents / 100;
  const balance = (stats.totalChargedCents - stats.totalUsedCents) / 100;
  const maxBar = Math.max(totalCharged, cost.totalCostUsd, 1);

  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground-secondary">
        <Coins size={16} className="text-amber-500" />
        AI 비용 & 지속가능성
      </h2>
      <div className="rounded-xl border border-border bg-surface p-4">
        {/* 충전 vs 비용 비교 */}
        <div className="space-y-2.5">
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-foreground-secondary">
                <DollarSign size={12} className="text-green-500" />
                크레딧 충전 총액
              </span>
              <span className="font-bold tabular-nums text-green-600">${totalCharged.toFixed(2)}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-secondary">
              <div
                className="h-full rounded-full bg-green-500"
                style={{ width: `${(totalCharged / maxBar) * 100}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-foreground-secondary">
                <Coins size={12} className="text-amber-500" />
                AI 비용 총액
              </span>
              <span className="font-bold tabular-nums text-amber-600">${cost.totalCostUsd.toFixed(2)}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-secondary">
              <div
                className="h-full rounded-full bg-amber-500"
                style={{ width: `${(cost.totalCostUsd / maxBar) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* 잔여 균형 */}
        <div className="mt-3 flex items-center justify-between rounded-lg bg-surface-secondary px-3 py-2">
          <span className="text-xs text-foreground-secondary">잔여 균형</span>
          <span className={`text-sm font-bold tabular-nums ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
            ${balance.toFixed(2)}
          </span>
        </div>

        {/* 모듈별 비용 */}
        <div className="mt-3 space-y-1.5 border-t border-border pt-3">
          <p className="text-[11px] font-medium text-foreground-muted">모듈별 비용</p>
          {cost.moduleBreakdown.map((m) => (
            <div key={m.module} className="flex items-center justify-between text-xs">
              <span className="text-foreground-secondary">{m.module}</span>
              <div className="flex items-center gap-3">
                <span className="text-foreground-muted">{m.calls}건</span>
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

      {/* 상단 요약 카드 3개 */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard
          icon={<Activity size={16} className="text-amber-500" />}
          label="평가 대기"
          value={`${health.pendingEvals}`}
        />
        <MetricCard
          icon={<FileText size={16} className="text-red-500" />}
          label="실패"
          value={`${health.failedEvals}`}
        />
        <MetricCard
          icon={<Cpu size={16} className="text-green-500" />}
          label="평균 대기"
          value={`${health.avgWaitMinutes}분`}
        />
      </div>

      {/* 파이프라인 + Storage */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="mb-2 text-[11px] font-semibold text-foreground-muted">평가 파이프라인</p>
        <div className="space-y-1.5">
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

        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-2 text-[11px] font-semibold text-foreground-muted">
            <HardDrive size={11} className="mr-1 inline" />
            Storage
          </p>
          <div className="grid grid-cols-2 gap-2">
            {health.storageUsage.map((s) => (
              <div key={s.bucket} className="flex items-center justify-between text-xs">
                <span className="text-foreground-muted">{s.bucket}</span>
                <span className="font-medium tabular-nums text-foreground">{s.fileCount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "활성", color: "bg-green-100 text-green-700" },
  scheduled_cancel: { label: "취소 예정", color: "bg-amber-100 text-amber-700" },
  cancelled: { label: "취소", color: "bg-red-100 text-red-700" },
  expired: { label: "만료", color: "bg-gray-100 text-gray-600" },
  paused: { label: "일시정지", color: "bg-blue-100 text-blue-700" },
};

async function SponsorshipSection() {
  const overview = await getSponsorshipOverview();

  const avgCents =
    overview.activeSponsorCount > 0
      ? Math.round(overview.monthlyRevenueCents / overview.activeSponsorCount)
      : 0;

  return (
    <details className="group space-y-3">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-foreground-secondary [&::-webkit-details-marker]:hidden">
        <Heart size={16} className="text-pink-500" />
        후원금 현황
        <ChevronDown size={14} className="ml-auto text-foreground-muted transition-transform group-open:rotate-180" />
      </summary>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          icon={<Heart size={16} className="text-pink-500" />}
          label="정기 후원"
          value={`${overview.activeSponsorCount}명`}
          sub={`$${(overview.monthlyRecurringCents / 100).toFixed(2)}/월`}
        />
        <MetricCard
          icon={<CreditCard size={16} className="text-blue-500" />}
          label="단기 후원"
          value={`${overview.onetimeCount}건`}
          sub={`$${(overview.monthlyOnetimeCents / 100).toFixed(2)}`}
        />
        <MetricCard
          icon={<DollarSign size={16} className="text-green-500" />}
          label="이번 달 후원"
          value={`$${(overview.monthlyRevenueCents / 100).toFixed(2)}`}
        />
        <MetricCard
          icon={<Coins size={16} className="text-amber-500" />}
          label="누적 후원"
          value={`$${(overview.totalRevenueCents / 100).toFixed(2)}`}
        />
      </div>

      {overview.recentSponsors.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-semibold text-foreground-muted">최근 후원자</p>
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="flex bg-surface-secondary/50 px-3 py-2 text-[11px] font-semibold text-foreground-muted">
              <span className="flex-[2] text-center">사용자</span>
              <span className="flex-[2] text-center">이메일</span>
              <span className="flex-[1] text-center">유형</span>
              <span className="flex-[1] text-center">금액</span>
              <span className="flex-[1] text-center">날짜</span>
            </div>
            {overview.recentSponsors.map((s, i) => (
                <div
                  key={`sponsor-${i}`}
                  className={`flex items-center px-3 py-2 text-xs ${i > 0 ? "border-t border-border" : ""}`}
                >
                  <span className="flex-[2] truncate text-center font-medium text-foreground">
                    {s.display_name || s.email}
                  </span>
                  <span className="flex-[2] truncate text-center text-foreground-muted">
                    {s.email}
                  </span>
                  <span className="flex-[1] text-center">
                    <span className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                      s.type === "정기" ? "bg-pink-50 text-pink-700" : "bg-blue-50 text-blue-700"
                    }`}>
                      {s.type}
                    </span>
                  </span>
                  <span className="flex-[1] text-center font-medium tabular-nums text-foreground">
                    ${(s.amount_cents / 100).toFixed(2)}
                  </span>
                  <span className="flex-[1] text-center text-foreground-muted">
                    {new Date(s.started_at).toLocaleDateString("ko-KR", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </details>
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
            <div className="flex bg-surface-secondary/50 px-3 py-2 text-[11px] font-semibold text-foreground-muted">
              <span className="flex-[2] text-center">사용자</span>
              <span className="flex-[3] text-center">이메일</span>
              <span className="flex-[3] text-center">가입 방법</span>
              <span className="flex-[2] text-center">가입일</span>
            </div>
            {signups.map((u, idx) => (
              <div
                key={u.id}
                className={`flex items-center px-3 py-2 text-xs ${idx > 0 ? "border-t border-border" : ""}`}
              >
                <span className="flex-[2] truncate text-center font-medium text-foreground">
                  {u.display_name || u.email}
                </span>
                <span className="flex-[3] truncate text-center text-foreground-muted">
                  {u.email}
                </span>
                <span className="flex-[3] text-center text-foreground-muted">
                  {PROVIDER_LABELS[u.provider] || u.provider}
                </span>
                <span className="flex-[2] text-center text-foreground-muted">
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
  const activities = await getRecentActivity();

  const weekRate = stats.totalUsers > 0
    ? ((stats.activeWeek / stats.totalUsers) * 100).toFixed(1)
    : "0";

  const typeLabel: Record<string, string> = {
    signup: "가입", order: "결제", mock_exam: "모의고사", review: "후기",
  };
  const typeColor: Record<string, string> = {
    signup: "bg-green-100 text-green-700", order: "bg-blue-100 text-blue-700",
    mock_exam: "bg-purple-100 text-purple-700", review: "bg-amber-100 text-amber-700",
  };

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

      {/* 활성 지표 — 카드 그리드 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          icon={<Users size={16} className="text-blue-500" />}
          label="오늘 활성"
          value={`${stats.activeToday}명`}
        />
        <MetricCard
          icon={<Users size={16} className="text-indigo-500" />}
          label="주간 활성"
          value={`${stats.activeWeek}명`}
          sub={`${weekRate}%`}
        />
        <MetricCard
          icon={<Users size={16} className="text-violet-500" />}
          label="월간 활성"
          value={`${stats.activeMonth}명`}
        />
        <MetricCard
          icon={<Users size={16} className="text-green-500" />}
          label="리텐션"
          value={`${stats.activeMonth > 0 ? Math.round((stats.activeWeek / stats.activeMonth) * 100) : 0}%`}
          sub="주간/월간"
        />
      </div>

      {/* 최근 로그인 */}
      {stats.recentLogins.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-semibold text-foreground-muted">최근 로그인</p>
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="flex bg-surface-secondary/50 px-3 py-2 text-[11px] font-semibold text-foreground-muted">
              <span className="flex-[2] text-center">사용자</span>
              <span className="flex-[3] text-center">이메일</span>
              <span className="flex-[3] text-center">-</span>
              <span className="flex-[2] text-center">시간</span>
            </div>
            {stats.recentLogins.slice(0, 10).map((l, i) => (
              <div key={`login-${i}`} className="flex items-center border-t border-border px-3 py-2 text-xs">
                <span className="flex-[2] truncate text-center font-medium text-foreground">
                  {l.display_name || l.email}
                </span>
                <span className="flex-[3] truncate text-center text-foreground-muted">
                  {l.email}
                </span>
                <span className="flex-[3] text-center text-foreground-muted">
                  -
                </span>
                <span className="flex-[2] text-center text-foreground-muted">
                  {new Date(l.last_login).toLocaleString("ko-KR", {
                    timeZone: "Asia/Seoul", month: "short", day: "numeric", hour12: false, hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 최근 활동 */}
      {activities.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-semibold text-foreground-muted">최근 활동</p>
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="flex bg-surface-secondary/50 px-3 py-2 text-[11px] font-semibold text-foreground-muted">
              <span className="flex-[2] text-center">사용자</span>
              <span className="flex-[3] text-center">이메일</span>
              <span className="flex-[3] text-center">내용</span>
              <span className="flex-[2] text-center">시간</span>
            </div>
            {activities.slice(0, 10).map((a) => {
              const name = a.userName.split(" (")[0];
              const email = a.userName.includes("(") ? a.userName.split("(")[1]?.replace(")", "") : "";
              return (
                <div key={`${a.type}-${a.id}`} className="flex items-center border-t border-border px-3 py-2 text-xs">
                  <span className="flex-[2] truncate text-center font-medium text-foreground">
                    {name}
                  </span>
                  <span className="flex-[3] truncate text-center text-foreground-muted">
                    {email}
                  </span>
                  <span className="flex-[3] truncate text-center text-foreground-secondary">
                    {a.description}
                  </span>
                  <span className="flex-[2] text-center text-foreground-muted">
                    {new Date(a.created_at).toLocaleString("ko-KR", {
                      timeZone: "Asia/Seoul", month: "short", day: "numeric", hour12: false, hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
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

      {/* 학습 활동 */}
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
        <LearningActivitySection />
      </Suspense>

      {/* 추이 차트 */}
      <AdminTrendCharts />

      {/* AI 비용 + 시스템 헬스 */}
      <Suspense fallback={<SectionSkeleton />}>
        <AICostSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <SystemHealthSection />
      </Suspense>

      {/* 후원금 현황 */}
      <Suspense fallback={<SectionSkeleton />}>
        <SponsorshipSection />
      </Suspense>

      {/* 최근 가입자 */}
      <Suspense fallback={<SectionSkeleton />}>
        <RecentSignupsSection />
      </Suspense>

      {/* 사용자 활동 (활성률 + 최근 활동 피드 통합) */}
      <Suspense fallback={<SectionSkeleton />}>
        <UserEngagementSection />
      </Suspense>
    </div>
  );
}
