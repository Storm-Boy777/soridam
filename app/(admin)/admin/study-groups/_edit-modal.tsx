"use client";

/**
 * 그룹 수정 모달 — 목록/상세 페이지 공용
 */

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { updateStudyGroup } from "@/lib/actions/admin/study-groups";
import type { GroupSchedule, StudyGroup } from "@/lib/types/opic-study";
import { ScheduleFields } from "./_schedule-fields";

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
        className="w-full max-w-lg rounded-xl bg-surface p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">그룹 수정</h3>
          <button onClick={onClose} className="text-foreground-muted hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <h4 className="mb-3 text-sm font-semibold text-foreground">운영 일정</h4>
            <ScheduleFields value={schedule} onChange={setSchedule} />
          </div>

          {/* 액션 */}
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-hover disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
            >
              {pending ? "저장 중…" : "저장"}
            </button>
          </div>
        </form>
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
