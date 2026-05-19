"use client";

// 관리자 — 스터디 모임 관리 권한 페이지
// 이메일로 사용자 검색 → 권한 부여/회수 → 보유자 목록
// (lectures 패턴 복제, 라벨·SA만 교체)

import { useState, useTransition } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Coffee, Search, UserCheck, ShieldOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  getStudyAdminAccessStats,
  getStudyAdminAccessUsers,
  searchUserForStudyAdmin,
  grantStudyAdminAccess,
  revokeStudyAdminAccess,
  bulkRevokeStudyAdminAccess,
} from "@/lib/actions/admin/study-admin-access";
import type {
  StudyAdminAccessStats,
  StudyAdminAccessUser,
  StudyAdminUserSearchResult,
} from "@/lib/types/admin";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type ConfirmState =
  | { kind: "grant"; user: StudyAdminUserSearchResult }
  | { kind: "revoke"; user: StudyAdminAccessUser }
  | { kind: "bulk-revoke"; ids: string[]; emails: string }
  | null;

export default function AdminStudyAdminAccessPage() {
  const queryClient = useQueryClient();

  const [searchEmail, setSearchEmail] = useState("");
  const [searchResults, setSearchResults] = useState<StudyAdminUserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<StudyAdminUserSearchResult | null>(null);
  const [searchError, setSearchError] = useState("");
  const [isSearching, startSearch] = useTransition();
  const [note, setNote] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  const { data: stats } = useQuery<StudyAdminAccessStats>({
    queryKey: ["admin-study-admin-access-stats"],
    queryFn: getStudyAdminAccessStats,
    staleTime: 10_000,
  });

  const { data: users = [], isLoading } = useQuery<StudyAdminAccessUser[]>({
    queryKey: ["admin-study-admin-access-users"],
    queryFn: getStudyAdminAccessUsers,
    staleTime: 10_000,
  });

  const grantMutation = useMutation({
    mutationFn: grantStudyAdminAccess,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["admin-study-admin-access-stats"] });
        queryClient.invalidateQueries({ queryKey: ["admin-study-admin-access-users"] });
        setSelectedUser(null);
        setSearchResults([]);
        setSearchEmail("");
        setNote("");
        setConfirmState(null);
        toast.success("권한이 부여되었습니다");
      } else {
        setConfirmState(null);
        toast.error(result.error || "권한 부여 실패");
      }
    },
    onError: () => {
      setConfirmState(null);
      toast.error("권한 부여 중 오류가 발생했습니다");
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (userId: string) => revokeStudyAdminAccess(userId),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["admin-study-admin-access-stats"] });
        queryClient.invalidateQueries({ queryKey: ["admin-study-admin-access-users"] });
        setSelectedIds(new Set());
        setConfirmState(null);
        toast.success("권한이 회수되었습니다");
      } else {
        setConfirmState(null);
        toast.error(result.error || "회수 실패");
      }
    },
    onError: () => {
      setConfirmState(null);
      toast.error("회수 중 오류가 발생했습니다");
    },
  });

  const bulkRevokeMutation = useMutation({
    mutationFn: (userIds: string[]) => bulkRevokeStudyAdminAccess(userIds),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-study-admin-access-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin-study-admin-access-users"] });
      setSelectedIds(new Set());
      setConfirmState(null);
      if (result.failed > 0) {
        toast.warning(`회수 완료: ${result.revoked}명 성공, ${result.failed}명 실패`);
      } else {
        toast.success(`${result.revoked}명 회수 완료`);
      }
    },
    onError: () => {
      setConfirmState(null);
      toast.error("일괄 회수 중 오류가 발생했습니다");
    },
  });

  const isMutating = revokeMutation.isPending || bulkRevokeMutation.isPending;

  const allIds = users.map((u) => u.user_id);
  const isAllSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const isIndeterminate = selectedIds.size > 0 && !isAllSelected;

  const toggleAll = () =>
    isAllSelected ? setSelectedIds(new Set()) : setSelectedIds(new Set(allIds));

  const toggleOne = (userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  const handleSearch = () => {
    setSearchError("");
    setSearchResults([]);
    setSelectedUser(null);
    startSearch(async () => {
      const res = await searchUserForStudyAdmin(searchEmail);
      if (res.error) {
        setSearchError(res.error);
      } else {
        setSearchResults(res.users);
        if (res.users.length === 1) {
          setSelectedUser(res.users[0]);
        }
      }
    });
  };

  const handleGrant = () => {
    if (!selectedUser) return;
    setConfirmState({ kind: "grant", user: selectedUser });
  };

  const handleRevoke = (user: StudyAdminAccessUser) => {
    setConfirmState({ kind: "revoke", user });
  };

  const handleBulkRevoke = () => {
    const ids = Array.from(selectedIds);
    const emails = users
      .filter((u) => selectedIds.has(u.user_id))
      .map((u) => u.email)
      .join(", ");
    setConfirmState({ kind: "bulk-revoke", ids, emails });
  };

  const handleConfirm = () => {
    if (!confirmState) return;
    if (confirmState.kind === "grant") {
      grantMutation.mutate({
        userId: confirmState.user.user_id,
        note: note || undefined,
      });
    } else if (confirmState.kind === "revoke") {
      revokeMutation.mutate(confirmState.user.user_id);
    } else if (confirmState.kind === "bulk-revoke") {
      bulkRevokeMutation.mutate(confirmState.ids);
    }
  };

  const isConfirmLoading =
    confirmState?.kind === "grant"
      ? grantMutation.isPending
      : confirmState?.kind === "revoke"
        ? revokeMutation.isPending
        : confirmState?.kind === "bulk-revoke"
          ? bulkRevokeMutation.isPending
          : false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">스터디 모임 관리 권한</h1>
        <p className="mt-1 text-sm text-foreground-secondary">
          이 권한이 있는 사용자에게만 사이드바 "스터디 모임" 메뉴 + /admin/study-group 페이지가 노출됩니다.
          관리자는 자동 통과합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={Coffee}
          label="권한 보유자"
          value={stats?.active ?? 0}
          color="text-primary-500"
        />
      </div>

      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-5 space-y-5">
        <h2 className="font-semibold text-foreground">권한 부여</h2>

        <div>
          <label className="block text-sm font-medium text-foreground-secondary mb-1.5">
            사용자 이메일 또는 닉네임
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="user@example.com 또는 닉네임"
              className="flex-1 rounded-[var(--radius-md)] border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <button
              type="button"
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

        {/* 다중 매치 — 사용자 선택 리스트 */}
        {searchResults.length > 1 && !selectedUser && (
          <div className="rounded-[var(--radius-lg)] border border-border bg-surface-secondary p-3">
            <p className="mb-2 text-xs font-medium text-foreground-secondary">
              {searchResults.length}명 매치 — 선택해 주세요
            </p>
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {searchResults.map((u) => (
                <button
                  key={u.user_id}
                  type="button"
                  onClick={() => setSelectedUser(u)}
                  className="flex w-full items-center justify-between gap-3 rounded-md border border-transparent bg-surface px-3 py-2 text-left hover:border-primary-500 hover:bg-primary-50/40 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {u.display_name ?? "(닉네임 없음)"}
                    </p>
                    <p className="truncate text-xs text-foreground-secondary">
                      {u.email}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      u.has_study_admin_access
                        ? "bg-primary-50 text-primary-600"
                        : "bg-surface-secondary text-foreground-muted"
                    }`}
                  >
                    {u.has_study_admin_access ? "권한 보유" : "권한 없음"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedUser && (
          <div className="rounded-[var(--radius-lg)] border border-border bg-surface-secondary p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <UserCheck size={18} className="text-primary-500 shrink-0" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {selectedUser.display_name ?? selectedUser.email}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="truncate text-xs text-foreground-secondary">
                      {selectedUser.email}
                    </span>
                    <span
                      className={`shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-full ${
                        selectedUser.has_study_admin_access
                          ? "bg-primary-50 text-primary-600"
                          : "bg-surface text-foreground-muted"
                      }`}
                    >
                      {selectedUser.has_study_admin_access ? "권한 보유" : "권한 없음"}
                    </span>
                  </div>
                </div>
              </div>
              {searchResults.length > 1 && (
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="shrink-0 text-xs text-foreground-muted hover:text-foreground underline"
                >
                  목록으로
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground-secondary mb-1">
                메모 (선택)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="부여 사유 또는 메모"
                className="w-full rounded-[var(--radius-md)] border border-border bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <button
              type="button"
              onClick={handleGrant}
              disabled={grantMutation.isPending}
              className="w-full rounded-[var(--radius-md)] bg-primary-500 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
            >
              {grantMutation.isPending
                ? "처리 중…"
                : selectedUser.has_study_admin_access
                  ? "메모 갱신 (재부여)"
                  : "권한 부여"}
            </button>
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">
            권한 보유자
            {users.length > 0 && (
              <span className="ml-2 text-sm font-normal text-foreground-muted">
                ({users.length}명)
              </span>
            )}
          </h2>

          {selectedIds.size > 0 && (
            <button
              type="button"
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
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="전체 선택"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isIndeterminate;
                    }}
                    onChange={toggleAll}
                    disabled={users.length === 0}
                    className="h-4 w-4 cursor-pointer rounded border-border accent-primary-500"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-foreground-secondary">이메일</th>
                <th className="px-4 py-3 text-left font-medium text-foreground-secondary">이름</th>
                <th className="px-4 py-3 text-left font-medium text-foreground-secondary">부여자</th>
                <th className="px-4 py-3 text-left font-medium text-foreground-secondary">부여일</th>
                <th className="px-4 py-3 text-left font-medium text-foreground-secondary">메모</th>
                <th className="px-4 py-3 text-left font-medium text-foreground-secondary">액션</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-foreground-muted">
                    로딩 중…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-foreground-muted">
                    권한 보유자가 없습니다
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelected = selectedIds.has(u.user_id);
                  return (
                    <tr
                      key={u.user_id}
                      onClick={() => toggleOne(u.user_id)}
                      className={`cursor-pointer border-b border-border last:border-0 transition-colors ${
                        isSelected
                          ? "bg-primary-50/60"
                          : "hover:bg-surface-secondary/50"
                      }`}
                    >
                      <td className="w-10 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`${u.email} 선택`}
                          checked={isSelected}
                          onChange={() => toggleOne(u.user_id)}
                          className="h-4 w-4 cursor-pointer rounded border-border accent-primary-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-foreground">{u.email}</td>
                      <td className="px-4 py-3 text-foreground-secondary">
                        {u.display_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-foreground-secondary">
                        {u.granted_by_email ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-foreground-secondary">
                        {new Date(u.granted_at).toLocaleDateString("ko-KR")}
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground-secondary">
                        {u.note ?? "—"}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleRevoke(u)}
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

        {selectedIds.size > 0 && (
          <p className="mt-2 text-xs text-foreground-secondary">
            {selectedIds.size}명 선택됨 —
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="ml-1 text-primary-500 hover:underline"
            >
              선택 해제
            </button>
          </p>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmState}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmState(null)}
        isLoading={isConfirmLoading}
        variant={confirmState?.kind === "grant" ? "warning" : "danger"}
        icon={confirmState?.kind === "grant" ? ShieldCheck : ShieldOff}
        title={
          confirmState?.kind === "grant"
            ? confirmState.user.has_study_admin_access
              ? "스터디 모임 관리 권한을 재부여하시겠습니까?"
              : "스터디 모임 관리 권한을 부여하시겠습니까?"
            : confirmState?.kind === "revoke"
              ? "스터디 모임 관리 권한을 회수하시겠습니까?"
              : confirmState?.kind === "bulk-revoke"
                ? `선택한 ${confirmState.ids.length}명의 권한을 회수하시겠습니까?`
                : ""
        }
        description={
          confirmState?.kind === "grant"
            ? confirmState.user.email
            : confirmState?.kind === "revoke"
              ? confirmState.user.email
              : confirmState?.kind === "bulk-revoke"
                ? confirmState.emails
                : undefined
        }
        confirmLabel={
          confirmState?.kind === "grant"
            ? confirmState.user.has_study_admin_access
              ? "재부여"
              : "부여"
            : "회수"
        }
      />
    </div>
  );
}

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
