"use client";

/**
 * 일정 입력 필드 — 생성 폼 / 수정 모달 공용
 *
 * 운영 요일 + 시간 + 첫 시작일 + 모임 방식 (default + 옵션: 요일별 override).
 */

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Globe, Building2 } from "lucide-react";
import type { GroupSchedule, MeetingMode } from "@/lib/types/opic-study";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

interface Props {
  value: GroupSchedule;
  onChange: (next: GroupSchedule) => void;
  /** 도움말/가이드 노출 여부 */
  showHint?: boolean;
}

export function ScheduleFields({ value, onChange, showHint = false }: Props) {
  const [advanced, setAdvanced] = useState(
    !!value.day_modes && Object.keys(value.day_modes).length > 0
  );

  // advanced 토글 끌 때 day_modes 비우기 (UI 의도와 데이터 일치)
  useEffect(() => {
    if (!advanced && value.day_modes && Object.keys(value.day_modes).length > 0) {
      onChange({ ...value, day_modes: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advanced]);

  const toggleDay = (d: number) => {
    const has = value.days.includes(d);
    const days = has
      ? value.days.filter((x) => x !== d)
      : [...value.days, d].sort((a, b) => a - b);
    onChange({ ...value, days });
  };

  const setDayMode = (d: number, mode: MeetingMode) => {
    const next = { ...(value.day_modes ?? {}) };
    if (mode === value.default_mode) {
      // default와 같으면 override 제거 (간결)
      delete next[String(d)];
    } else {
      next[String(d)] = mode;
    }
    onChange({
      ...value,
      day_modes: Object.keys(next).length > 0 ? next : undefined,
    });
  };

  const getDayMode = (d: number): MeetingMode =>
    value.day_modes?.[String(d)] ?? value.default_mode;

  const sortedDays = value.days.slice().sort((a, b) => a - b);

  return (
    <div className="space-y-5">
      {/* 운영 요일 */}
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
          운영 요일 <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-1.5">
          {DAY_LABELS.map((label, i) => {
            const active = value.days.includes(i);
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
            value={value.start_time}
            onChange={(e) => onChange({ ...value, start_time: e.target.value })}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            required
          />
          <span className="text-foreground-muted">~</span>
          <input
            type="time"
            value={value.end_time}
            onChange={(e) => onChange({ ...value, end_time: e.target.value })}
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
          value={value.first_session_date}
          onChange={(e) => onChange({ ...value, first_session_date: e.target.value })}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
          required
        />
        {showHint && (
          <p className="mt-1 text-xs text-foreground-secondary">
            이 날짜 이전엔 멤버 홈에 &quot;첫 스터디까지 D-N&quot;으로 표시됩니다.
          </p>
        )}
      </div>

      {/* 모임 방식 */}
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
          모임 방식 <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <ModeRadio
            active={value.default_mode === "online"}
            mode="online"
            onClick={() => onChange({ ...value, default_mode: "online" })}
          />
          <ModeRadio
            active={value.default_mode === "offline"}
            mode="offline"
            onClick={() => onChange({ ...value, default_mode: "offline" })}
          />
        </div>

        {/* 고급 — 요일별 다르게 */}
        {sortedDays.length > 0 && (
          <button
            type="button"
            onClick={() => setAdvanced((v) => !v)}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-foreground-secondary hover:text-foreground"
          >
            {advanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            요일별 다르게 설정
          </button>
        )}

        {advanced && sortedDays.length > 0 && (
          <div className="mt-3 rounded-lg border border-border bg-surface-secondary/40 p-3">
            <div className="mb-2 text-xs text-foreground-secondary">
              운영 요일별로 모드를 다르게 설정할 수 있어요. 기본값과 같으면
              자동으로 단순화됩니다.
            </div>
            <div className="space-y-2">
              {sortedDays.map((d) => {
                const mode = getDayMode(d);
                return (
                  <div
                    key={d}
                    className="flex items-center gap-3 rounded-md bg-surface px-3 py-2"
                  >
                    <span className="w-8 text-sm font-semibold text-foreground">
                      {DAY_LABELS[d]}
                    </span>
                    <div className="flex flex-1 gap-1.5">
                      <DaySegment
                        active={mode === "online"}
                        mode="online"
                        onClick={() => setDayMode(d, "online")}
                      />
                      <DaySegment
                        active={mode === "offline"}
                        mode="offline"
                        onClick={() => setDayMode(d, "offline")}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ModeRadio({
  active,
  mode,
  onClick,
}: {
  active: boolean;
  mode: MeetingMode;
  onClick: () => void;
}) {
  const Icon = mode === "online" ? Globe : Building2;
  const label = mode === "online" ? "온라인" : "오프라인";
  const desc = mode === "online" ? "디스코드 + 소리담" : "실제 모임";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
        active
          ? "border-primary-500 bg-primary-50/50"
          : "border-border bg-surface hover:bg-surface-secondary"
      }`}
    >
      <div
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          active ? "bg-primary-500 text-white" : "bg-surface-secondary text-foreground-secondary"
        }`}
      >
        <Icon size={16} strokeWidth={1.6} />
      </div>
      <div className="min-w-0 flex-1">
        <div
          className={`text-sm font-semibold ${
            active ? "text-primary-700" : "text-foreground"
          }`}
        >
          {label}
        </div>
        <div className="text-xs text-foreground-secondary">{desc}</div>
      </div>
    </button>
  );
}

function DaySegment({
  active,
  mode,
  onClick,
}: {
  active: boolean;
  mode: MeetingMode;
  onClick: () => void;
}) {
  const Icon = mode === "online" ? Globe : Building2;
  const label = mode === "online" ? "온라인" : "오프라인";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-primary-500 text-white"
          : "bg-surface-secondary text-foreground-secondary hover:bg-surface-hover"
      }`}
    >
      <Icon size={12} strokeWidth={1.8} />
      {label}
    </button>
  );
}
