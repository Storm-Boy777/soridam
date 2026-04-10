"use client";

// 관리자 — 베타 관리 페이지 (초대 발급 방식)

import { useState, useTransition } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Users, Search, UserCheck, RotateCcw, ShieldOff } from "lucide-react";
import {
  getBetaStats,
  getBetaUsers,
  searchUserForBeta,
  grantBeta,
  revokeBeta,
  bulkRevokeBeta,
} from "@/lib/actions/admin/beta";
import type { BetaStats, BetaUser, UserSearchResult } from "@/lib/types/admin";

/* ── 기본 발급 설정 ── */
const DEFAULT_BALANCE_CENTS = 1000; // $10
const DEFAULT_EXPIRES_DAYS = 30;

function defaultExpiresAt() {
  const d = new Date();
  d.setDate(d.getDate() + DEFAULT_EXPIRES_DAYS);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

/* ── 메인 페이지 ── */

export default function AdminBetaPage() {
  const queryClient = useQueryClient();

  // 검색 상태
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResult, setSearchResult] = useState<UserSearchResult | null>(null);
  const [searchError, setSearchError] = useState("");
  const [isSearching, startSearch] = useTransition();

  // 발급 폼 상태
  const [balanceCents, setBalanceCents] = useState(DEFAULT_BALANCE_CENTS);
  const [expiresAt, setExpiresAt] = useState(defaultExpiresAt);
  const [memo, setMemo] = useState("");

  // 체크박스 선택 상태
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 통계
  const { data: stats } = useQuery<BetaStats>({
    queryKey: ["admin-beta-stats"],
    queryFn: getBetaStats,
    staleTime: 10_000,
  });

  // 활성 베타 사용자 목록
  const { data: betaUsers = [], isLoading } = useQuery<BetaUser[]>({
    queryKey: ["admin-beta-users"],
    queryFn: getBetaUsers,
    staleTime: 10_000,
  });

  // 발급 뮤테이션
  const grantMutation = useMutation({
    mutationFn: grantBeta,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["admin-beta"] });
        setSearchResult(null);
        setSearchEmail("");
        setMemo("");
        setBalanceCents(DEFAULT_BALANCE_CENTS);
        setExpiresAt(defaultExpiresAt());
      } else {
        alert(result.error);
      }
    },
  });

  // 단건 회수 뮤테이션
  const revokeMutation = useMutation({
    mutationFn: (userId: string) => revokeBeta(userId),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["admin-beta"] });
        setSelectedIds(new Set());
      } else {
        alert(result.error);
      }
    },
  });

  // 일괄 회수 뮤테이션
  const bulkRevokeMutation = useMutation({
    mutationFn: (userIds: string[]) => bulkRevokeBeta(userIds),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-beta"] });
      setSelectedIds(new Set());
      if (result.failed > 0) {
        alert(`회수 완료: ${result.revoked}명 성공, ${result.failed}명 실패`);
      }
    },
  });

  const isMutating = revokeMutation.isPending || bulkRevokeMutation.isPending;

  /* ── 체크박스 핸들러 ── */

  const allIds = betaUsers.map((u) => u.user_id);
  const isAllSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const isIndeterminate = selectedIds.size > 0 && !isAllSelected;

  const toggleAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const toggleOne = (userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  /* ── 이메일 검색 ── */

  const handleSearch = () => {
    setSearchError("");
    setSearchResult(null);
    startSearch(async () => {
      const res = await searchUserForBeta(searchEmail);
      if (res.error) {
        setSearchError(res.error);
      } else {
        setSearchResult(res.user);
      }
    });
  };

  /* ── 베타 발급 ── */

  const handleGrant = () => {
    if (!searchResult) return;
    if (!confirm(`${searchResult.email}에게 베타 크레딧 $${(balanceCents / 100).toFixed(2)}을 발급하시겠습니까?`)) return;
    grantMutation.mutate({
      userId: searchResult.user_id,
      balanceCents,
      expiresAt: new Date(expiresAt).toISOString(),
      memo: memo || undefined,
    });
  };

  /* ── 단건 회수 ── */

  const handleRevoke = (user: BetaUser) => {
    if (!confirm(`${user.email}의 베타 접근을 회수하시겠습니까?`)) return;
    revokeMutation.mutate(user.user_id);
  };

  /* ── 일괄 회수 ── */

  const handleBulkRevoke = () => {
    const ids = Array.from(selectedIds);
    const emails = betaUsers
      .filter((u) => selectedIds.has(u.user_id))
      .map((u) => u.email)
      .join(", ");
    if (!confirm(`선택한 ${ids.length}명의 베타 접근을 회수하시겠습니까?\n\n${emails}`)) return;
    bulkRevokeMutation.mutate(ids);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-foreground">베타 관리</h1>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard icon={Sparkles} label="활성 베타" value={stats?.active ?? 0} color="text-primary-500" />
        <StatCard icon={Users} label="총 발급" value={stats?.total ?? 0} />
        <StatCard icon={RotateCcw} label="회수됨" value={stats?.revoked ?? 0} color="text-foreground-muted" />
      </div>

      {/* 발급 섹션 */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-5 space-y-5">
        <h2 className="font-semibold text-foreground">베타 발급</h2>

        {/* 이메일 검색 */}
        <div>
          <label className="block text-sm font-medium text-foreground-secondary mb-1.5">
            사용자 이메일
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="user@example.com"
              className="flex-1 rounded-[var(--radius-md)] border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching || !searchEmail.trim()}
              className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-foreground px-4 py-2 text-sm font-medium text-white hover:bg-foreground/90 disabled:opacity-50"
            >
              <Search size={15} />
              {isSearching ? "검색 중…" : "검색"}
            </button>
          </div>
          {searchError && (
            <p className="mt-1.5 text-xs text-accent-500">{searchError}</p>
          )}
        </div>

        {/* 검색 결과 + 발급 폼 */}
        {searchResult && (
          <div className="rounded-[var(--radius-lg)] border border-border bg-surface-secondary p-4 space-y-4">
            <div className="flex items-center gap-3">
              <UserCheck size={18} className="text-primary-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">{searchResult.email}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {searchResult.display_name && (
                    <span className="text-xs text-foreground-secondary">{searchResult.display_name}</span>
                  )}
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                    searchResult.is_beta_active
                      ? "bg-primary-50 text-primary-600"
                      : "bg-surface text-foreground-muted"
                  }`}>
                    {searchResult.is_beta_active ? "베타 활성" : searchResult.current_plan}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-foreground-secondary mb-1">
                  크레딧 금액 (센트)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={balanceCents}
                    onChange={(e) => setBalanceCents(Number(e.target.value))}
                    className="w-full rounded-[var(--radius-md)] border border-border bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  <span className="shrink-0 text-sm text-foreground-secondary">
                    = ${(balanceCents / 100).toFixed(2)}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-secondary mb-1">
                  만료일
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full rounded-[var(--radius-md)] border border-border bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-secondary mb-1">
                메모 (선택)
              </label>
              <input
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="발급 사유 또는 메모"
                className="w-full rounded-[var(--radius-md)] border border-border bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <button
              onClick={handleGrant}
              disabled={grantMutation.isPending || balanceCents <= 0}
              className="w-full rounded-[var(--radius-md)] bg-primary-500 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
            >
              {grantMutation.isPending
                ? "발급 중…"
                : searchResult.is_beta_active
                  ? "재발급 (크레딧 추가 + 기간 갱신)"
                  : "베타 발급"}
            </button>
          </div>
        )}
      </div>

      {/* 활성 베타 사용자 목록 */}
      <div>
        {/* 헤더: 제목 + 일괄 회수 버튼 */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">
            활성 베타 사용자
            {betaUsers.length > 0 && (
              <span className="ml-2 text-sm font-normal text-foreground-muted">
                ({betaUsers.length}명)
              </span>
            )}
          </h2>

          {/* 일괄 회수 버튼 — 선택 시 나타남 */}
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkRevoke}
              disabled={isMutating}
              className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-accent-500 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-50"
            >
              <ShieldOff size={15} />
              {bulkRevokeMutation.isPending
                ? "회수 중…"
                : `선택 ${selectedIds.size}명 회수`}
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-[var(--radius-xl)] border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-secondary">
                {/* 전체 선택 체크박스 */}
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isIndeterminate;
                    }}
                    onChange={toggleAll}
                    disabled={betaUsers.length === 0}
                    className="h-4 w-4 cursor-pointer rounded border-border accent-primary-500"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-foreground-secondary">이메일</th>
                <th className="px-4 py-3 text-left font-medium text-foreground-secondary">이름</th>
                <th className="px-4 py-3 text-left font-medium text-foreground-secondary">발급</th>
                <th className="px-4 py-3 text-left font-medium text-foreground-secondary">잔액</th>
                <th className="px-4 py-3 text-left font-medium text-foreground-secondary">만료일</th>
                <th className="px-4 py-3 text-left font-medium text-foreground-secondary">발급일</th>
                <th className="px-4 py-3 text-left font-medium text-foreground-secondary">메모</th>
                <th className="px-4 py-3 text-left font-medium text-foreground-secondary">액션</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-foreground-muted">
                    로딩 중…
                  </td>
                </tr>
              ) : betaUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-foreground-muted">
                    활성 베타 사용자가 없습니다
                  </td>
                </tr>
              ) : (
                betaUsers.map((user) => {
                  const isSelected = selectedIds.has(user.user_id);
                  return (
                    <tr
                      key={user.application_id}
                      onClick={() => toggleOne(user.user_id)}
                      className={`cursor-pointer border-b border-border last:border-0 transition-colors ${
                        isSelected
                          ? "bg-primary-50/60"
                          : "hover:bg-surface-secondary/50"
                      }`}
                    >
                      {/* 행 체크박스 */}
                      <td className="w-10 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(user.user_id)}
                          className="h-4 w-4 cursor-pointer rounded border-border accent-primary-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-foreground">{user.email}</td>
                      <td className="px-4 py-3 text-foreground-secondary">{user.display_name ?? "—"}</td>
                      <td className="px-4 py-3 text-foreground">
                        ${(user.granted_cents / 100).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${user.balance_cents > 0 ? "text-foreground" : "text-foreground-muted"}`}>
                          ${(user.balance_cents / 100).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground-secondary">
                        {user.plan_expires_at
                          ? new Date(user.plan_expires_at).toLocaleDateString("ko-KR")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-foreground-secondary">
                        {new Date(user.granted_at).toLocaleDateString("ko-KR")}
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground-secondary">
                        {user.memo ?? "—"}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleRevoke(user)}
                          disabled={isMutating}
                          className="rounded-md border border-border px-3 py-1 text-xs font-medium text-foreground-secondary hover:bg-surface-secondary hover:text-accent-500 disabled:opacity-50"
                        >
                          회수
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 선택 카운터 */}
        {selectedIds.size > 0 && (
          <p className="mt-2 text-xs text-foreground-secondary">
            {selectedIds.size}명 선택됨 —
            <button
              onClick={() => setSelectedIds(new Set())}
              className="ml-1 text-primary-500 hover:underline"
            >
              선택 해제
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

/* ── 통계 카드 ── */

function StatCard({
  icon: Icon,
  label,
  value,
  color = "text-foreground",
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-foreground-muted" />
        <span className="text-xs text-foreground-secondary">{label}</span>
      </div>
      <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
