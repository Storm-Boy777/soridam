"use client";

/**
 * 그룹 수정 모달 — 목록/상세 페이지 공용
 *
 * 기능:
 * - 그룹 메타 (이름/기간/설명/일정)
 * - 멤버 관리 (현재 멤버 list + 제거 + 추가)
 */

import { useState, useTransition, useEffect } from "react";
import {
  X,
  UserMinus,
  Search,
  Plus,
  Loader2,
  Check,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import {
  updateStudyGroup,
  listGroupMembers,
  searchMemberCandidates,
  addGroupMembers,
  removeGroupMember,
} from "@/lib/actions/admin/study-groups";
import type {
  GroupSchedule,
  StudyGroup,
  GroupMemberWithProfile,
  ProfileLite,
} from "@/lib/types/opic-study";
import { ScheduleFields } from "./_schedule-fields";
import { BpConfirmDialog } from "@/app/opic-study/_components/bp";

const FALLBACK_SCHEDULE: GroupSchedule = {
  days: [1, 2, 3, 4, 5],
  start_time: "07:40",
  end_time: "08:30",
  first_session_date: "2026-05-06",
  default_mode: "online",
};

interface Props {
  group: Pick<
    StudyGroup,
    "id" | "name" | "start_date" | "end_date" | "description" | "schedule"
  >;
  onClose: () => void;
  onSaved: () => void;
}

export function EditGroupModal({ group, onClose, onSaved }: Props) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(group.name);
  const [startDate, setStartDate] = useState(group.start_date);
  const [endDate, setEndDate] = useState(group.end_date);
  const [description, setDescription] = useState(group.description ?? "");
  const [schedule, setSchedule] = useState<GroupSchedule>(
    group.schedule ?? FALLBACK_SCHEDULE
  );

  // 멤버 관리 state
  const [members, setMembers] = useState<GroupMemberWithProfile[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<{
    userId: string;
    name: string;
  } | null>(null);

  // 마운트 시 멤버 list fetch
  useEffect(() => {
    let cancelled = false;
    setMembersLoading(true);
    listGroupMembers(group.id)
      .then((res) => {
        if (cancelled) return;
        if (res.data) setMembers(res.data);
      })
      .finally(() => {
        if (!cancelled) setMembersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [group.id]);

  const refetchMembers = async () => {
    const res = await listGroupMembers(group.id);
    if (res.data) setMembers(res.data);
  };

  const handleRemoveMember = (userId: string) => {
    startTransition(async () => {
      const res = await removeGroupMember(group.id, userId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("멤버가 제거되었습니다.");
      setConfirmRemove(null);
      await refetchMembers();
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("그룹 이름을 입력해주세요.");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("운영 기간을 입력해주세요.");
      return;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      toast.error("종료일이 시작일보다 늦어야 합니다.");
      return;
    }
    if (schedule.days.length === 0) {
      toast.error("운영 요일을 1개 이상 선택해주세요.");
      return;
    }
    if (schedule.start_time >= schedule.end_time) {
      toast.error("종료 시간이 시작 시간보다 늦어야 합니다.");
      return;
    }

    startTransition(async () => {
      const res = await updateStudyGroup(group.id, {
        name: name.trim(),
        start_date: startDate,
        end_date: endDate,
        description: description.trim() || null,
        schedule,
      });

      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("그룹이 수정되었습니다.");
      onSaved();
    });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-surface shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-lg font-semibold text-foreground">그룹 수정</h3>
          <button
            onClick={onClose}
            className="text-foreground-muted hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 space-y-5 overflow-auto px-6 py-5"
        >
          {/* 이름 */}
          <Field label="그룹 이름" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              required
            />
          </Field>

          {/* 운영 기간 */}
          <Field label="운영 기간" required>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                required
              />
              <span className="text-foreground-muted">~</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                required
              />
            </div>
          </Field>

          {/* 설명 */}
          <Field label="설명 (선택)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            />
          </Field>

          {/* 일정 */}
          <div className="rounded-lg border border-border bg-surface-secondary/40 p-4">
            <h4 className="mb-3 text-sm font-semibold text-foreground">
              운영 일정
            </h4>
            <ScheduleFields value={schedule} onChange={setSchedule} />
          </div>

          {/* 멤버 관리 */}
          <div className="rounded-lg border border-border bg-surface-secondary/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">
                멤버{" "}
                <span className="ml-1 text-foreground-secondary">
                  ({members.length}명)
                </span>
              </h4>
              <button
                type="button"
                onClick={() => setShowAddMember(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-surface-hover"
              >
                <UserPlus size={13} />
                멤버 추가
              </button>
            </div>

            {membersLoading ? (
              <div className="flex items-center justify-center py-6 text-sm text-foreground-secondary">
                <Loader2 size={14} className="mr-2 animate-spin" />
                멤버 불러오는 중…
              </div>
            ) : members.length === 0 ? (
              <p className="py-4 text-center text-sm text-foreground-secondary">
                아직 등록된 멤버가 없어요. <br />
                위의 &lsquo;멤버 추가&rsquo; 버튼으로 멤버를 등록하세요.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
                {members.map((m) => {
                  const displayName =
                    m.display_name ?? m.user_display_name ?? "(이름 없음)";
                  return (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-3 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-foreground">
                          {displayName}
                        </div>
                        <div className="truncate text-xs text-foreground-secondary">
                          {m.email ?? "(이메일 없음)"}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmRemove({
                            userId: m.user_id,
                            name: displayName,
                          })
                        }
                        disabled={pending}
                        className="inline-flex flex-shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-foreground-secondary hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        aria-label={`${displayName} 제거`}
                      >
                        <UserMinus size={13} />
                        제거
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </form>

        {/* 액션 footer */}
        <div className="flex justify-end gap-2 border-t border-border bg-surface px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-hover disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={pending}
            className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {pending ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>

      {/* 멤버 제거 확인 */}
      <BpConfirmDialog
        open={!!confirmRemove}
        title="멤버를 제거하시겠어요?"
        description={
          confirmRemove
            ? `"${confirmRemove.name}" 님을 그룹에서 제거합니다. 답변 이력은 보존돼요.`
            : ""
        }
        confirmLabel="제거"
        variant="danger"
        onConfirm={() =>
          confirmRemove && handleRemoveMember(confirmRemove.userId)
        }
        onCancel={() => setConfirmRemove(null)}
      />

      {/* 멤버 추가 모달 */}
      {showAddMember && (
        <AddMemberInlineModal
          groupId={group.id}
          existingUserIds={new Set(members.map((m) => m.user_id))}
          onClose={() => setShowAddMember(false)}
          onAdded={async () => {
            setShowAddMember(false);
            await refetchMembers();
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// 멤버 추가 inline 모달
// ============================================================

function AddMemberInlineModal({
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
      // 이미 선택된 멤버는 화면에서 빼고 (위 chip에 이미 보임)
      // 이미 그룹 멤버는 그대로 둬서 disabled 라벨로 보여줌 (오해 방지)
      setCandidates(
        res.data.filter(
          (c) => !selected.find((s) => s.user_id === c.user_id)
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
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-xl bg-surface p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">멤버 추가</h3>
          <button
            onClick={onClose}
            className="text-foreground-muted hover:text-foreground"
          >
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
            {searching ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              "검색"
            )}
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
                  type="button"
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

        {/* 검색 결과 — 이미 멤버는 disabled + "이미 멤버" 라벨 */}
        {candidates.length > 0 ? (
          <div className="max-h-60 overflow-auto rounded-lg border border-border bg-surface">
            {candidates.map((c) => {
              const alreadyMember = existingUserIds.has(c.user_id);
              return (
                <button
                  key={c.user_id}
                  type="button"
                  disabled={alreadyMember}
                  onClick={
                    alreadyMember
                      ? undefined
                      : () => {
                          setSelected((prev) => [...prev, c]);
                          setCandidates((prev) =>
                            prev.filter((x) => x.user_id !== c.user_id)
                          );
                        }
                  }
                  className={`flex w-full items-center justify-between border-b border-border px-3 py-2 text-left text-sm last:border-b-0 ${
                    alreadyMember
                      ? "cursor-not-allowed opacity-55"
                      : "hover:bg-surface-hover"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">
                      {c.display_name ?? "(이름 없음)"}
                    </div>
                    <div className="truncate text-xs text-foreground-secondary">
                      {c.email}
                    </div>
                  </div>
                  {alreadyMember ? (
                    <span className="ml-2 flex-shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                      이미 멤버
                    </span>
                  ) : (
                    <Check
                      size={14}
                      className="ml-2 flex-shrink-0 text-primary-500"
                    />
                  )}
                </button>
              );
            })}
          </div>
        ) : query.trim() && !searching ? (
          <p className="py-4 text-center text-sm text-foreground-secondary">
            &ldquo;{query}&rdquo;에 일치하는 회원을 찾을 수 없어요.
          </p>
        ) : null}

        {/* 액션 */}
        <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-hover"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={pending || selected.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {pending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}
            {selected.length > 0
              ? `${selected.length}명 추가`
              : "멤버를 선택해주세요"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
