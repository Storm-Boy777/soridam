"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Stethoscope,
  Users,
  Activity,
  CheckCircle2,
  Brain,
  Coins,
  ChevronDown,
  ChevronUp,
  Search,
  Target,
  Loader2,
} from "lucide-react";
import { getTutoringStats, getTutoringSessions, getTutoringSessionDetail } from "@/lib/actions/admin/tutoring";
import type { AdminTutoringSession, AdminTutoringDetail, TutoringStats } from "@/lib/types/admin";

/* ── 상태 뱃지 ── */

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  diagnosing: { label: "진단 중", className: "bg-yellow-100 text-yellow-700" },
  diagnosed: { label: "진단 완료", className: "bg-blue-100 text-blue-700" },
  active: { label: "진행 중", className: "bg-green-100 text-green-700" },
  completed: { label: "완료", className: "bg-surface-secondary text-foreground-secondary" },
};

const FOCUS_STATUS_BADGES: Record<string, { label: string; className: string }> = {
  pending: { label: "대기", className: "bg-surface-secondary text-foreground-muted" },
  active: { label: "진행 중", className: "bg-blue-100 text-blue-700" },
  improving: { label: "개선 중", className: "bg-yellow-100 text-yellow-700" },
  graduated: { label: "졸업", className: "bg-green-100 text-green-700" },
  hold: { label: "보류", className: "bg-red-100 text-red-700" },
};

const RETEST_BADGES: Record<string, { label: string; className: string }> = {
  graduated: { label: "졸업", className: "bg-green-100 text-green-700" },
  improving: { label: "개선 중", className: "bg-yellow-100 text-yellow-700" },
  hold: { label: "보류", className: "bg-red-100 text-red-700" },
};

/* ── 페이지 ── */

export default function AdminTutoringPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  // 통계
  const { data: stats } = useQuery({
    queryKey: ["admin-tutoring-stats"],
    queryFn: getTutoringStats,
    staleTime: 30_000,
  });

  // 세션 목록
  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ["admin-tutoring-sessions", statusFilter, search, page],
    queryFn: () => getTutoringSessions({ page, pageSize: 20, status: statusFilter, search }),
    staleTime: 10_000,
  });

  const sessions = sessionsData?.data || [];
  const totalPages = Math.ceil((sessionsData?.total || 0) / 20);

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <Stethoscope className="h-5 w-5 text-primary-500" />
        <h1 className="text-lg font-bold">튜터링 모니터링</h1>
      </div>

      {/* 통계 카드 */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-6">
          <StatCard icon={Users} label="총 세션" value={stats.totalSessions} />
          <StatCard icon={Activity} label="진행 중" value={stats.activeSessions} color="text-green-600" />
          <StatCard icon={CheckCircle2} label="완료" value={stats.completedSessions} />
          <StatCard icon={Brain} label="진단 중" value={stats.diagnosingSessions} color="text-yellow-600" />
          <StatCard icon={Target} label="포커스 졸업률" value={`${stats.focusGraduationRate}%`} color="text-primary-600" />
          <StatCard icon={Coins} label="평균 토큰" value={stats.avgTokensUsed.toLocaleString()} />
        </div>
      )}

      {/* 필터 바 */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
        >
          <option value="all">전체 상태</option>
          <option value="diagnosing">진단 중</option>
          <option value="diagnosed">진단 완료</option>
          <option value="active">진행 중</option>
          <option value="completed">완료</option>
        </select>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
          <input
            type="text"
            placeholder="이메일 검색..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-border bg-surface py-1.5 pl-9 pr-3 text-sm"
          />
        </div>
      </div>

      {/* 세션 목록 */}
      <div className="rounded-xl border border-border bg-surface">
        {/* 헤더 */}
        <div className="grid grid-cols-[1fr_120px_80px_80px_80px_60px_60px] gap-2 border-b border-border px-4 py-2.5 text-xs font-semibold text-foreground-secondary">
          <span>사용자</span>
          <span>날짜</span>
          <span>상태</span>
          <span>안정 레벨</span>
          <span>목표 레벨</span>
          <span className="text-center">포커스</span>
          <span className="text-center">토큰</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="py-12 text-center text-sm text-foreground-muted">데이터가 없습니다</p>
        ) : (
          sessions.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              isExpanded={expandedSession === session.id}
              onToggle={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
            />
          ))
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="rounded-lg border border-border px-3 py-1 text-sm disabled:opacity-30"
          >
            이전
          </button>
          <span className="text-sm text-foreground-secondary">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-border px-3 py-1 text-sm disabled:opacity-30"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}

/* ── 통계 카드 ── */

function StatCard({ icon: Icon, label, value, color }: {
  icon: typeof Users;
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color || "text-foreground-muted"}`} />
        <span className="text-xs text-foreground-secondary">{label}</span>
      </div>
      <p className={`mt-1 text-lg font-bold ${color || "text-foreground"}`}>{value}</p>
    </div>
  );
}

/* ── 세션 행 ── */

function SessionRow({ session, isExpanded, onToggle }: {
  session: AdminTutoringSession;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const badge = STATUS_BADGES[session.status] || STATUS_BADGES.active;

  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={onToggle}
        className="grid w-full grid-cols-[1fr_120px_80px_80px_80px_60px_60px] items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-surface-secondary"
      >
        <span className="truncate text-foreground">{session.user_email}</span>
        <span className="text-foreground-secondary">
          {new Date(session.created_at).toLocaleDateString("ko-KR")}
        </span>
        <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
          {badge.label}
        </span>
        <span className="text-foreground">{session.current_stable_level || "-"}</span>
        <span className="text-foreground">{session.final_target_level || "-"}</span>
        <span className="text-center text-foreground">
          {session.graduated_count}/{session.focus_count}
        </span>
        <span className="text-center text-foreground-secondary text-xs">
          {session.tokens_used > 0 ? `${(session.tokens_used / 1000).toFixed(1)}k` : "-"}
        </span>
      </button>

      {isExpanded && <SessionDetail sessionId={session.id} />}
    </div>
  );
}

/* ── 세션 상세 ── */

function SessionDetail({ sessionId }: { sessionId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-tutoring-detail", sessionId],
    queryFn: () => getTutoringSessionDetail(sessionId),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
      </div>
    );
  }

  const detail = data?.data;
  if (!detail) return <p className="py-4 text-center text-sm text-foreground-muted">상세 정보를 불러올 수 없습니다</p>;

  return (
    <div className="border-t border-border bg-surface-secondary/50 px-4 py-4">
      {/* 포커스 목록 */}
      <h4 className="mb-3 text-xs font-semibold text-foreground-secondary">포커스 ({detail.focuses.length}개)</h4>
      <div className="space-y-2">
        {detail.focuses.map((focus) => {
          const focusBadge = FOCUS_STATUS_BADGES[focus.status] || FOCUS_STATUS_BADGES.pending;
          const focusDrills = detail.drills.filter((d) => d.focus_id === focus.id);
          const focusRetest = detail.retests.find((r) => r.focus_id === focus.id);

          return (
            <div key={focus.id} className="rounded-lg border border-border bg-surface p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary-600">#{focus.priority_rank}</span>
                  <span className="text-sm font-medium text-foreground">{focus.label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${focusBadge.className}`}>
                    {focusBadge.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-foreground-secondary">
                  <span>드릴 {focus.drill_pass_count}/3</span>
                  {focusRetest && (
                    <span className={`rounded-full px-2 py-0.5 font-medium ${RETEST_BADGES[focusRetest.overall_result || ""]?.className || "bg-surface-secondary text-foreground-muted"}`}>
                      재평가: {RETEST_BADGES[focusRetest.overall_result || ""]?.label || "대기"}
                    </span>
                  )}
                </div>
              </div>

              {/* 드릴 상세 */}
              {focusDrills.length > 0 && (
                <div className="mt-2 flex gap-2">
                  {focusDrills.map((drill) => (
                    <div
                      key={drill.id}
                      className={`flex-1 rounded-md p-2 text-xs ${
                        drill.status === "passed"
                          ? "bg-green-50 text-green-700"
                          : drill.status === "active"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-surface-secondary text-foreground-muted"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Q{drill.question_number}</span>
                        <span>{drill.attempt_count}회 시도</span>
                      </div>
                      <p className="mt-0.5 truncate">{drill.question_english}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
