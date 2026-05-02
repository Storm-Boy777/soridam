/**
 * 관리자 — 오픽 스터디 그룹 목록
 *
 * 설계: docs/설계/오픽스터디.md (관리자 페이지 섹션)
 */

import Link from "next/link";
import { listStudyGroups } from "@/lib/actions/admin/study-groups";
import { Plus, Users, Calendar, Activity } from "lucide-react";

export default async function AdminStudyGroupsPage() {
  const result = await listStudyGroups();
  const groups = result.data ?? [];

  const activeCount = groups.filter((g) => g.status === "active").length;
  const closedCount = groups.filter((g) => g.status === "closed").length;
  const totalMembers = groups.reduce((sum, g) => sum + g.member_count, 0);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* 헤더 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">오픽 스터디 그룹</h1>
          <p className="mt-1 text-sm text-foreground-secondary">
            월별 등급별 그룹 운영 · 멤버 직접 등록
          </p>
        </div>
        <Link
          href="/admin/study-groups/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
        >
          <Plus size={16} />새 그룹
        </Link>
      </div>

      {/* 통계 */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="활성 그룹"
          value={activeCount}
          icon={<Activity size={18} />}
        />
        <StatCard
          label="종료 그룹"
          value={closedCount}
          icon={<Calendar size={18} />}
        />
        <StatCard
          label="총 멤버"
          value={totalMembers}
          icon={<Users size={18} />}
        />
      </div>

      {/* 그룹 목록 */}
      {groups.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <Users size={32} className="mx-auto mb-3 text-foreground-muted" />
          <p className="text-sm text-foreground-secondary">
            아직 등록된 스터디 그룹이 없습니다.
          </p>
          <Link
            href="/admin/study-groups/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
          >
            <Plus size={16} /> 첫 그룹 만들기
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((g) => (
            <Link
              key={g.id}
              href={`/admin/study-groups/${g.id}`}
              className="block rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-surface-hover"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-foreground truncate">
                      {g.name}
                    </h3>
                    <StatusBadge status={g.status} />
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-foreground-secondary">
                    <span>
                      {g.start_date.replace(/-/g, "/").slice(2)} ~{" "}
                      {g.end_date.replace(/-/g, "/").slice(2)}
                    </span>
                    <span>·</span>
                    <span>멤버 {g.member_count}명</span>
                    <span>·</span>
                    <span>
                      세션 {g.completed_session_count}회 완료
                      {g.active_session_count > 0 &&
                        ` (진행 중 ${g.active_session_count})`}
                    </span>
                  </div>
                </div>
                <span className="text-foreground-muted">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-2 flex items-center gap-2 text-foreground-secondary">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
        활성
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
      종료
    </span>
  );
}

