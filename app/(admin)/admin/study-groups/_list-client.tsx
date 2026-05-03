"use client";

/**
 * 관리자 — 오픽 스터디 그룹 목록 (클라이언트)
 *
 * 기능:
 * - 검색 (이름)
 * - 필터 (전체/활성/종료)
 * - 카드 액션 (수정/삭제/재활성화) — 위험 액션은 BpConfirmDialog
 */

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Users,
  Calendar,
  Activity,
  Search,
  Pencil,
  Trash2,
  Power,
} from "lucide-react";
import { toast } from "sonner";
import {
  deleteStudyGroup,
  reopenStudyGroup,
} from "@/lib/actions/admin/study-groups";
import { BpConfirmDialog } from "@/app/opic-study/_components/bp";
import { EditGroupModal } from "./_edit-modal";
import type { StudyGroupWithStats, StudyGroupStatus } from "@/lib/types/opic-study";

interface Props {
  initialGroups: StudyGroupWithStats[];
  /** true면 외부에서 wrapper(p-6, max-w-6xl)를 제공 — 내부 wrapper 생략 */
  embedded?: boolean;
}

type FilterValue = "all" | StudyGroupStatus;

type ConfirmState =
  | { kind: "delete"; group: StudyGroupWithStats }
  | { kind: "reopen"; group: StudyGroupWithStats }
  | null;

export function GroupsListClient({ initialGroups, embedded = false }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [filter, setFilter] = useState<FilterValue>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<StudyGroupWithStats | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const activeCount = initialGroups.filter((g) => g.status === "active").length;
  const closedCount = initialGroups.filter((g) => g.status === "closed").length;
  const totalMembers = initialGroups.reduce((sum, g) => sum + g.member_count, 0);

  // 클라이언트 필터/검색
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialGroups.filter((g) => {
      if (filter !== "all" && g.status !== filter) return false;
      if (q && !g.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [initialGroups, filter, search]);

  const handleDelete = (g: StudyGroupWithStats) => {
    startTransition(async () => {
      const res = await deleteStudyGroup(g.id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`"${g.name}" 그룹이 삭제되었습니다.`);
      setConfirm(null);
      router.refresh();
    });
  };

  const handleReopen = (g: StudyGroupWithStats) => {
    startTransition(async () => {
      const res = await reopenStudyGroup(g.id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`"${g.name}" 그룹이 재활성화되었습니다.`);
      setConfirm(null);
      router.refresh();
    });
  };

  const Wrapper = embedded
    ? ({ children }: { children: React.ReactNode }) => <>{children}</>
    : ({ children }: { children: React.ReactNode }) => (
        <div className="p-6 max-w-6xl mx-auto">{children}</div>
      );

  return (
    <Wrapper>
      {/* 헤더 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">오픽 스터디 그룹</h1>
          <p className="mt-1 text-sm text-foreground-secondary">
            월별 그룹 운영 · 멤버 직접 등록
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
        <StatCard label="활성 그룹" value={activeCount} icon={<Activity size={18} />} />
        <StatCard label="종료 그룹" value={closedCount} icon={<Calendar size={18} />} />
        <StatCard label="총 멤버" value={totalMembers} icon={<Users size={18} />} />
      </div>

      {/* 검색 + 필터 */}
      {initialGroups.length > 0 && (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="그룹 이름 검색"
              className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none"
            />
          </div>

          <div className="inline-flex rounded-lg border border-border bg-surface p-0.5 text-sm">
            {(
              [
                { v: "all", label: "전체", count: initialGroups.length },
                { v: "active", label: "활성", count: activeCount },
                { v: "closed", label: "종료", count: closedCount },
              ] as const
            ).map((opt) => {
              const active = filter === opt.v;
              return (
                <button
                  key={opt.v}
                  onClick={() => setFilter(opt.v)}
                  className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                    active
                      ? "bg-primary-500 text-white"
                      : "text-foreground-secondary hover:bg-surface-secondary"
                  }`}
                >
                  {opt.label} <span className="opacity-70">{opt.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 그룹 목록 */}
      {initialGroups.length === 0 ? (
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
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-foreground-secondary">
          조건에 맞는 그룹이 없습니다.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              disabled={pending}
              onEdit={() => setEditing(g)}
              onDelete={() => setConfirm({ kind: "delete", group: g })}
              onReopen={() => setConfirm({ kind: "reopen", group: g })}
            />
          ))}
        </div>
      )}

      {/* 수정 모달 */}
      {editing && (
        <EditGroupModal
          group={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}

      {/* 확인 다이얼로그 */}
      <BpConfirmDialog
        open={confirm?.kind === "delete"}
        title="그룹을 삭제하시겠어요?"
        description={
          confirm?.kind === "delete" ? (
            <div>
              <strong>&quot;{confirm.group.name}&quot;</strong> 그룹을 영구 삭제합니다.
              <div className="mt-2 text-sm">
                · 멤버 {confirm.group.member_count}명
                <br />
                · 세션{" "}
                {confirm.group.completed_session_count + confirm.group.active_session_count}개
                (답변 포함)
              </div>
              <div className="mt-2 text-sm">함께 삭제되며 되돌릴 수 없습니다.</div>
            </div>
          ) : null
        }
        confirmLabel="영구 삭제"
        variant="danger"
        icon="🗑️"
        isLoading={pending}
        onConfirm={() => confirm?.kind === "delete" && handleDelete(confirm.group)}
        onCancel={() => setConfirm(null)}
      />

      <BpConfirmDialog
        open={confirm?.kind === "reopen"}
        title="그룹을 재활성화하시겠어요?"
        description={
          confirm?.kind === "reopen" ? (
            <div>
              <strong>&quot;{confirm.group.name}&quot;</strong> 그룹을 다시 활성 상태로 전환합니다.
            </div>
          ) : null
        }
        confirmLabel="재활성화"
        variant="neutral"
        icon="🔁"
        isLoading={pending}
        onConfirm={() => confirm?.kind === "reopen" && handleReopen(confirm.group)}
        onCancel={() => setConfirm(null)}
      />
    </Wrapper>
  );
}

// ============================================================
// 그룹 카드
// ============================================================
function GroupCard({
  group,
  disabled,
  onEdit,
  onDelete,
  onReopen,
}: {
  group: StudyGroupWithStats;
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onReopen: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface transition-colors hover:bg-surface-hover">
      <div className="flex items-center gap-2 p-4">
        {/* 정보 영역 — Link */}
        <Link href={`/admin/study-groups/${group.id}`} className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground truncate">{group.name}</h3>
            <StatusBadge status={group.status} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground-secondary">
            <span>
              {group.start_date.replace(/-/g, "/").slice(2)} ~{" "}
              {group.end_date.replace(/-/g, "/").slice(2)}
            </span>
            <span>·</span>
            <span>멤버 {group.member_count}명</span>
            <span>·</span>
            <span>
              세션 {group.completed_session_count}회 완료
              {group.active_session_count > 0 && ` (진행 중 ${group.active_session_count})`}
            </span>
          </div>
        </Link>

        {/* 액션 영역 */}
        <div className="flex shrink-0 items-center gap-1">
          <IconButton
            label="수정"
            onClick={onEdit}
            disabled={disabled}
            tone="default"
          >
            <Pencil size={14} />
          </IconButton>
          {group.status === "closed" && (
            <IconButton
              label="재활성화"
              onClick={onReopen}
              disabled={disabled}
              tone="primary"
            >
              <Power size={14} />
            </IconButton>
          )}
          <IconButton
            label="삭제"
            onClick={onDelete}
            disabled={disabled}
            tone="danger"
          >
            <Trash2 size={14} />
          </IconButton>
        </div>
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  tone,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone: "default" | "primary" | "danger";
  children: React.ReactNode;
}) {
  const toneCls =
    tone === "danger"
      ? "text-foreground-muted hover:bg-red-50 hover:text-red-600"
      : tone === "primary"
        ? "text-foreground-muted hover:bg-primary-50 hover:text-primary-600"
        : "text-foreground-muted hover:bg-surface-secondary hover:text-foreground";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`rounded-md p-2 transition-colors disabled:opacity-50 ${toneCls}`}
    >
      {children}
    </button>
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

function StatusBadge({ status }: { status: StudyGroupStatus }) {
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
