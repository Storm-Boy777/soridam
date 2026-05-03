"use client";

/**
 * 관리자 — 오픽 스터디 기본 일정 카드 + 편집 모달
 *
 * 위치: /admin/study-groups 페이지 상단
 * 저장: system_settings.opic_study_schedule (글로벌 1건)
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Clock, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { updateOpicStudySchedule } from "@/lib/actions/opic-study-schedule";
import type { OpicStudySchedule } from "@/lib/opic-study/schedule";

interface Props {
  schedule: OpicStudySchedule;
}

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export function ScheduleCard({ schedule }: Props) {
  const [editing, setEditing] = useState(false);

  const dayLabel = schedule.days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DAY_LABELS[d])
    .join(" · ");

  return (
    <>
      <div className="mb-6 rounded-xl border border-border bg-surface p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50">
              <Calendar size={18} className="text-primary-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-foreground">
                신규 그룹 기본값
              </h3>
              <p className="mt-0.5 text-xs text-foreground-secondary">
                새 그룹 만들 때 이 값이 자동 입력됩니다. 그룹별로 변경 가능해요.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Field
                  icon={<Calendar size={14} />}
                  label="운영 요일"
                  value={dayLabel}
                />
                <Field
                  icon={<Clock size={14} />}
                  label="시간 (KST)"
                  value={`${schedule.start_time} ~ ${schedule.end_time}`}
                />
                <Field
                  icon={<Calendar size={14} />}
                  label="첫 시작일"
                  value={schedule.first_session_date}
                />
              </div>
            </div>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface-hover"
          >
            <Pencil size={14} /> 수정
          </button>
        </div>
      </div>

      {editing && (
        <ScheduleEditModal
          initial={schedule}
          onClose={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      )}
    </>
  );
}

function Field({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-secondary px-3 py-2">
      <div className="flex items-center gap-1.5 text-[11px] text-foreground-secondary">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-foreground tabular-nums">
        {value}
      </div>
    </div>
  );
}

// ============================================================
// 편집 모달
// ============================================================

function ScheduleEditModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: OpicStudySchedule;
  onClose: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [days, setDays] = useState<number[]>(initial.days);
  const [startTime, setStartTime] = useState(initial.start_time);
  const [endTime, setEndTime] = useState(initial.end_time);
  const [firstDate, setFirstDate] = useState(initial.first_session_date);

  const toggleDay = (d: number) => {
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)
    );
  };

  const handleSave = () => {
    if (days.length === 0) {
      toast.error("운영 요일을 1개 이상 선택해주세요.");
      return;
    }
    if (startTime >= endTime) {
      toast.error("종료 시간이 시작 시간보다 늦어야 합니다.");
      return;
    }

    startTransition(async () => {
      const res = await updateOpicStudySchedule({
        days,
        start_time: startTime,
        end_time: endTime,
        first_session_date: firstDate,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("일정이 저장되었습니다.");
      onSaved();
      router.refresh();
    });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">기본 일정 수정</h3>
          <button onClick={onClose} className="text-foreground-muted hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          {/* 운영 요일 */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              운영 요일 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-1.5">
              {DAY_LABELS.map((label, i) => {
                const active = days.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`h-9 w-9 rounded-lg text-sm font-semibold transition-colors ${
                      active
                        ? "bg-primary-500 text-white"
                        : "border border-border bg-surface text-foreground-secondary hover:bg-surface-secondary"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 시간 */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              시간 (KST) <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                required
              />
              <span className="text-foreground-muted">~</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* 첫 시작일 */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              첫 시작일 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={firstDate}
              onChange={(e) => setFirstDate(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              required
            />
            <p className="mt-1 text-xs text-foreground-secondary">
              이 날짜 이전에는 멤버 홈에 &quot;첫 스터디까지 D-N&quot;으로 표시됩니다.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
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
            onClick={handleSave}
            disabled={pending}
            className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {pending ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
