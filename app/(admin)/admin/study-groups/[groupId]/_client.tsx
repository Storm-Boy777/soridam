"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  searchMemberCandidates,
  addGroupMembers,
  removeGroupMember,
  closeStudyGroup,
  reopenStudyGroup,
  deleteStudyGroup,
} from "@/lib/actions/admin/study-groups";
import {
  Users,
  Activity,
  MessageSquare,
  DollarSign,
  Plus,
  X,
  Search,
  Loader2,
  Check,
  ArrowRight,
  Pencil,
  Trash2,
  Power,
  PowerOff,
} from "lucide-react";
import { BpConfirmDialog } from "@/app/opic-study/_components/bp";
import { EditGroupModal } from "../_edit-modal";
import type {
  AdminGroupDetail,
  ProfileLite,
} from "@/lib/types/opic-study";

interface Props {
  detail: AdminGroupDetail;
}

type ConfirmState =
  | { kind: "close" }
  | { kind: "reopen" }
  | { kind: "delete" }
  | { kind: "remove-member"; userId: string; name: string }
  | null;

export function GroupDetailClient({ detail }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const { group, members, sessions, stats } = detail;

  const handleClose = () => {
    startTransition(async () => {
      const res = await closeStudyGroup(group.id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("그룹이 종료되었습니다.");
      setConfirm(null);
      router.refresh();
    });
  };

  const handleReopen = () => {
    startTransition(async () => {
      const res = await reopenStudyGroup(group.id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("그룹이 재활성화되었습니다.");
      setConfirm(null);
      router.refresh();
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const res = await deleteStudyGroup(group.id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("그룹이 삭제되었습니다.");
      router.replace("/admin/study-groups");
    });
  };

  const handleRemove = (userId: string) => {
    startTransition(async () => {
      const res = await removeGroupMember(group.id, userId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("멤버가 제거되었습니다.");
      setConfirm(null);
      router.refresh();
    });
  };

  return (
    <>
      {/* 헤더 */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground truncate">{group.name}</h1>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                group.status === "active"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {group.status === "active" ? "활성" : "종료"}
            </span>
          </div>
          <p className="mt-1 text-sm text-foreground-secondary">
            {group.start_date} ~ {group.end_date}
          </p>
          {group.description && (
            <p className="mt-2 text-sm text-foreground-secondary whitespace-pre-wrap">
              {group.description}
            </p>
          )}
        </div>

        {/* 헤더 액션 */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setShowEditModal(true)}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface-hover disabled:opacity-50"
          >
            <Pencil size={14} /> 수정
          </button>

          {group.status === "active" ? (
            <button
              onClick={() => setConfirm({ kind: "close" })}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground-secondary hover:bg-surface-hover disabled:opacity-50"
            >
              <PowerOff size={14} /> 종료
            </button>
          ) : (
            <button
              onClick={() => setConfirm({ kind: "reopen" })}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-100 disabled:opacity-50"
            >
              <Power size={14} /> 재활성화
            </button>
          )}

          <button
            onClick={() => setConfirm({ kind: "delete" })}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            <Trash2 size={14} /> 삭제
          </button>
        </div>
      </div>

      {/* 통계 */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="멤버" value={stats.member_count} icon={<Users size={16} />} />
        <StatCard
          label="진행 세션"
          value={stats.active_session_count}
          icon={<Activity size={16} />}
        />
        <StatCard
          label="완료 세션"
          value={stats.completed_session_count}
          icon={<MessageSquare size={16} />}
        />
        <StatCard
          label="AI 비용"
          value={`$${(stats.ai_cost_usd_cents / 100).toFixed(2)}`}
          icon={<DollarSign size={16} />}
        />
      </div>

      {/* 멤버 */}
      <section className="mb-8 rounded-xl border border-border bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            멤버 ({members.length})
          </h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-600"
          >
            <Plus size={14} /> 멤버 추가
          </button>
        </div>

        {members.length === 0 ? (
          <p className="py-6 text-center text-sm text-foreground-secondary">
            등록된 멤버가 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {members.map((m) => {
              const displayName =
                m.user_display_name ?? m.display_name ?? "(이름 없음)";
              return (
                <li
                  key={m.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {displayName}
                    </div>
                    <div className="text-xs text-foreground-secondary">
                      {m.email ?? "(이메일 없음)"} ·{" "}
                      {new Date(m.joined_at).toLocaleDateString("ko-KR")}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setConfirm({
                        kind: "remove-member",
                        userId: m.user_id,
                        name: displayName,
                      })
                    }
                    disabled={pending}
                    className="text-xs text-red-600 hover:underline disabled:opacity-50"
                  >
                    제거
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 세션 이력 */}
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          세션 이력 ({sessions.length})
        </h2>

        {sessions.length === 0 ? (
          <p className="py-6 text-center text-sm text-foreground-secondary">
            아직 진행한 세션이 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {sessions.map((s) => {
              const dateStr = s.ended_at ?? s.started_at;
              const d = new Date(dateStr);
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-foreground-secondary tabular-nums w-12">
                      {d.getMonth() + 1}/{d.getDate()}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {s.selected_topic ?? "(미선택)"}
                        {s.selected_category && (
                          <span className="ml-2 text-xs text-foreground-secondary">
                            {s.selected_category}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-foreground-secondary">
                        답변 {s.total_answers}개 · 멤버 {s.member_count}명
                      </div>
                    </div>
                  </div>
                  <SessionStatusBadge status={s.status} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 멤버 추가 모달 */}
      {showAddModal && (
        <AddMemberModal
          groupId={group.id}
          existingUserIds={new Set(members.map((m) => m.user_id))}
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            router.refresh();
          }}
        />
      )}

      {/* 그룹 수정 모달 */}
      {showEditModal && (
        <EditGroupModal
          group={group}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            setShowEditModal(false);
            router.refresh();
          }}
        />
      )}

      {/* 확인 다이얼로그 — 종료 */}
      <BpConfirmDialog
        open={confirm?.kind === "close"}
        title="그룹을 종료하시겠어요?"
        description={
          <div>
            <strong>&quot;{group.name}&quot;</strong> 그룹을 종료 상태로 전환합니다.
            <div className="mt-2 text-sm">
              종료 후에도 데이터는 유지되며 언제든 재활성화할 수 있습니다.
            </div>
          </div>
        }
        confirmLabel="그룹 종료"
        variant="warning"
        icon="⏸️"
        isLoading={pending}
        onConfirm={handleClose}
        onCancel={() => setConfirm(null)}
      />

      {/* 확인 다이얼로그 — 재활성화 */}
      <BpConfirmDialog
        open={confirm?.kind === "reopen"}
        title="그룹을 재활성화하시겠어요?"
        description={
          <div>
            <strong>&quot;{group.name}&quot;</strong> 그룹을 다시 활성 상태로 전환합니다.
          </div>
        }
        confirmLabel="재활성화"
        variant="neutral"
        icon="🔁"
        isLoading={pending}
        onConfirm={handleReopen}
        onCancel={() => setConfirm(null)}
      />

      {/* 확인 다이얼로그 — 삭제 */}
      <BpConfirmDialog
        open={confirm?.kind === "delete"}
        title="그룹을 삭제하시겠어요?"
        description={
          <div>
            <strong>&quot;{group.name}&quot;</strong> 그룹을 영구 삭제합니다.
            <div className="mt-2 text-sm">
              · 멤버 {stats.member_count}명
              <br />· 세션{" "}
              {stats.active_session_count + stats.completed_session_count}개 (답변
              포함)
            </div>
            <div className="mt-2 text-sm">함께 삭제되며 되돌릴 수 없습니다.</div>
          </div>
        }
        confirmLabel="영구 삭제"
        variant="danger"
        icon="🗑️"
        isLoading={pending}
        onConfirm={handleDelete}
        onCancel={() => setConfirm(null)}
      />

      {/* 확인 다이얼로그 — 멤버 제거 */}
      <BpConfirmDialog
        open={confirm?.kind === "remove-member"}
        title="멤버를 제거하시겠어요?"
        description={
          confirm?.kind === "remove-member" ? (
            <div>
              <strong>{confirm.name}</strong>님을 그룹에서 제거합니다.
              <div className="mt-2 text-sm">
                해당 멤버의 이전 답변 기록은 그대로 유지됩니다.
              </div>
            </div>
          ) : null
        }
        confirmLabel="멤버 제거"
        variant="danger"
        icon="👤"
        isLoading={pending}
        onConfirm={() =>
          confirm?.kind === "remove-member" && handleRemove(confirm.userId)
        }
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-secondary p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-foreground-secondary">
        {icon}
        {label}
      </div>
      <div className="text-lg font-bold text-foreground">{value}</div>
    </div>
  );
}

function SessionStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active: {
      label: "진행 중",
      cls: "bg-emerald-50 text-emerald-700",
    },
    completed: { label: "완료", cls: "bg-gray-100 text-gray-600" },
    abandoned: { label: "중단", cls: "bg-amber-50 text-amber-700" },
  };
  const m = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${m.cls}`}
    >
      {m.label}
    </span>
  );
}

// ============================================================
// 멤버 추가 모달
// ============================================================
function AddMemberModal({
  groupId,
  existingUserIds,
  onClose,
  onAdded,
}: {
  groupId: string;
  existingUserIds: Set<string>;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<ProfileLite[]>([]);
  const [selected, setSelected] = useState<ProfileLite[]>([]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    const res = await searchMemberCandidates(query);
    setSearching(false);
    if (res.data) {
      setCandidates(
        res.data.filter(
          (c) =>
            !existingUserIds.has(c.user_id) &&
            !selected.find((s) => s.user_id === c.user_id)
        )
      );
    }
  };

  const handleAdd = () => {
    if (selected.length === 0) return;
    startTransition(async () => {
      const res = await addGroupMembers(
        groupId,
        selected.map((m) => m.user_id)
      );
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`${selected.length}명이 추가되었습니다.`);
      onAdded();
    });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-xl bg-surface p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">멤버 추가</h3>
          <button onClick={onClose} className="text-foreground-muted">
            <X size={18} />
          </button>
        </div>

        {/* 검색 */}
        <div className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              placeholder="이메일 또는 이름 검색"
              className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-hover disabled:opacity-50"
          >
            {searching ? <Loader2 size={14} className="animate-spin" /> : "검색"}
          </button>
        </div>

        {/* 선택된 */}
        {selected.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2 rounded-lg border border-border bg-surface-secondary p-3">
            {selected.map((m) => (
              <span
                key={m.user_id}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs text-primary-700"
              >
                {m.display_name ?? m.email}
                <button
                  onClick={() =>
                    setSelected((prev) =>
                      prev.filter((s) => s.user_id !== m.user_id)
                    )
                  }
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* 검색 결과 */}
        {candidates.length > 0 && (
          <div className="max-h-60 overflow-auto rounded-lg border border-border bg-surface">
            {candidates.map((c) => (
              <button
                key={c.user_id}
                onClick={() => {
                  setSelected((prev) => [...prev, c]);
                  setCandidates((prev) =>
                    prev.filter((x) => x.user_id !== c.user_id)
                  );
                }}
                className="flex w-full items-center justify-between border-b border-border px-3 py-2 text-left text-sm last:border-b-0 hover:bg-surface-hover"
              >
                <div>
                  <div className="font-medium">
                    {c.display_name ?? "(이름 없음)"}
                  </div>
                  <div className="text-xs text-foreground-secondary">
                    {c.email}
                  </div>
                </div>
                <Check size={14} className="text-primary-500" />
              </button>
            ))}
          </div>
        )}

        {/* 액션 */}
        <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-hover"
          >
            취소
          </button>
          <button
            onClick={handleAdd}
            disabled={pending || selected.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {pending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ArrowRight size={14} />
            )}
            {selected.length}명 추가
          </button>
        </div>
      </div>
    </div>
  );
}
