"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  searchMemberCandidates,
  addGroupMembers,
  removeGroupMember,
  closeStudyGroup,
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
} from "lucide-react";
import type {
  AdminGroupDetail,
  ProfileLite,
} from "@/lib/types/opic-study";

interface Props {
  detail: AdminGroupDetail;
}

export function GroupDetailClient({ detail }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showAddModal, setShowAddModal] = useState(false);

  const { group, members, sessions, stats } = detail;

  const handleClose = () => {
    if (!confirm(`"${group.name}" 그룹을 종료하시겠습니까?`)) return;
    startTransition(async () => {
      const res = await closeStudyGroup(group.id);
      if (res.error) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  };

  const handleRemove = (userId: string, name: string) => {
    if (!confirm(`${name}님을 그룹에서 제거하시겠습니까?`)) return;
    startTransition(async () => {
      const res = await removeGroupMember(group.id, userId);
      if (res.error) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <>
      {/* 헤더 */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{group.name}</h1>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                group.status === "active"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {group.status === "active" ? "활성" : "종료"}
            </span>
            <span className="inline-flex items-center rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-semibold text-primary-700">
              {group.target_level}
            </span>
          </div>
          <p className="mt-1 text-sm text-foreground-secondary">
            {group.start_date} ~ {group.end_date}
          </p>
          {group.description && (
            <p className="mt-2 text-sm text-foreground-secondary">
              {group.description}
            </p>
          )}
        </div>

        {group.status === "active" && (
          <button
            onClick={handleClose}
            disabled={pending}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground-secondary hover:bg-surface-hover disabled:opacity-50"
          >
            그룹 종료
          </button>
        )}
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
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {m.user_display_name ?? m.display_name ?? "(이름 없음)"}
                  </div>
                  <div className="text-xs text-foreground-secondary">
                    {m.email ?? "(이메일 없음)"} ·{" "}
                    {new Date(m.joined_at).toLocaleDateString("ko-KR")}
                  </div>
                </div>
                <button
                  onClick={() =>
                    handleRemove(
                      m.user_id,
                      m.user_display_name ?? m.email ?? "멤버"
                    )
                  }
                  disabled={pending}
                  className="text-xs text-red-600 hover:underline disabled:opacity-50"
                >
                  제거
                </button>
              </li>
            ))}
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
        alert(res.error);
        return;
      }
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
