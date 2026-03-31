"use client";

// 관리자 — 베타 관리 페이지

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Users, Clock, CheckCircle2, XCircle } from "lucide-react";
import { getBetaStats, getBetaApplications, approveBeta, rejectBeta } from "@/lib/actions/admin/beta";
import type { BetaApplication, BetaStats } from "@/lib/types/admin";

const STATUS_FILTERS = [
  { value: "all", label: "전체" },
  { value: "pending", label: "대기" },
  { value: "approved", label: "승인" },
  { value: "rejected", label: "거절" },
];

const statusBadge: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
};

const statusLabel: Record<string, string> = {
  pending: "대기",
  approved: "승인",
  rejected: "거절",
};

export default function AdminBetaPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);

  // 통계
  const { data: stats } = useQuery<BetaStats>({
    queryKey: ["admin-beta-stats"],
    queryFn: getBetaStats,
    staleTime: 10_000,
  });

  // 신청 목록
  const { data: appData, isLoading } = useQuery({
    queryKey: ["admin-beta-apps", page, filter],
    queryFn: () => getBetaApplications({ page, pageSize: 20, status: filter }),
    staleTime: 10_000,
  });

  // 승인 뮤테이션
  const approveMutation = useMutation({
    mutationFn: (id: string) => approveBeta(id),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["admin-beta"] });
        queryClient.invalidateQueries({ queryKey: ["admin-beta-stats"] });
        queryClient.invalidateQueries({ queryKey: ["admin-beta-apps"] });
      } else {
        alert(result.error);
      }
    },
  });

  // 거절 뮤테이션
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectBeta(id, reason),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["admin-beta"] });
        queryClient.invalidateQueries({ queryKey: ["admin-beta-stats"] });
        queryClient.invalidateQueries({ queryKey: ["admin-beta-apps"] });
      } else {
        alert(result.error);
      }
    },
  });

  const handleApprove = (app: BetaApplication) => {
    if (!confirm(`${app.user_email} (카카오: ${app.kakao_nickname})을 승인하시겠습니까?`)) return;
    approveMutation.mutate(app.id);
  };

  const handleReject = (app: BetaApplication) => {
    const reason = prompt(`${app.user_email} 거절 사유를 입력하세요:`);
    if (!reason) return;
    rejectMutation.mutate({ id: app.id, reason });
  };

  const totalPages = Math.ceil((appData?.total ?? 0) / 20);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-foreground">베타 관리</h1>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label="총 신청" value={stats?.total ?? 0} />
        <StatCard icon={Clock} label="승인 대기" value={stats?.pending ?? 0} color="text-yellow-600" />
        <StatCard icon={CheckCircle2} label="승인됨" value={stats?.approved ?? 0} color="text-green-600" />
        <StatCard
          icon={Sparkles}
          label="잔여 자리"
          value={stats?.remaining ?? 100}
          color="text-primary-500"
          sub={`/ 100명`}
        />
      </div>

      {/* 필터 */}
      <div className="flex gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setFilter(f.value); setPage(1); }}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === f.value
                ? "bg-foreground text-white"
                : "bg-surface-secondary text-foreground-secondary hover:bg-border"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto rounded-[var(--radius-xl)] border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-secondary">
              <th className="px-4 py-3 text-left font-medium text-foreground-secondary">이메일</th>
              <th className="px-4 py-3 text-left font-medium text-foreground-secondary">이름</th>
              <th className="px-4 py-3 text-left font-medium text-foreground-secondary">카카오 닉네임</th>
              <th className="px-4 py-3 text-left font-medium text-foreground-secondary">신청일</th>
              <th className="px-4 py-3 text-left font-medium text-foreground-secondary">상태</th>
              <th className="px-4 py-3 text-left font-medium text-foreground-secondary">액션</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-foreground-muted">로딩 중...</td></tr>
            ) : !appData?.data.length ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-foreground-muted">신청 내역이 없습니다</td></tr>
            ) : (
              appData.data.map((app) => (
                <tr key={app.id} className="border-b border-border last:border-0 hover:bg-surface-secondary/50">
                  <td className="px-4 py-3 text-foreground">{app.user_email}</td>
                  <td className="px-4 py-3 text-foreground-secondary">{app.user_name ?? "—"}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{app.kakao_nickname}</td>
                  <td className="px-4 py-3 text-foreground-secondary">
                    {new Date(app.created_at).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[app.status]}`}>
                      {statusLabel[app.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {app.status === "pending" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(app)}
                          disabled={approveMutation.isPending}
                          className="rounded-md bg-green-500 px-3 py-1 text-xs font-medium text-white hover:bg-green-600 disabled:opacity-50"
                        >
                          승인
                        </button>
                        <button
                          onClick={() => handleReject(app)}
                          disabled={rejectMutation.isPending}
                          className="rounded-md bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
                        >
                          거절
                        </button>
                      </div>
                    )}
                    {app.status === "rejected" && app.rejected_reason && (
                      <span className="text-xs text-foreground-muted" title={app.rejected_reason}>
                        {app.rejected_reason.length > 20 ? app.rejected_reason.slice(0, 20) + "…" : app.rejected_reason}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-40"
          >
            이전
          </button>
          <span className="text-sm text-foreground-secondary">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-40"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}

// 통계 카드 컴포넌트
function StatCard({
  icon: Icon,
  label,
  value,
  color = "text-foreground",
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-foreground-muted" />
        <span className="text-xs text-foreground-secondary">{label}</span>
      </div>
      <p className={`mt-2 text-2xl font-bold ${color}`}>
        {value}
        {sub && <span className="text-sm font-normal text-foreground-muted"> {sub}</span>}
      </p>
    </div>
  );
}
