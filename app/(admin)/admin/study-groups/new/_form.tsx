"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createStudyGroup,
  searchMemberCandidates,
} from "@/lib/actions/admin/study-groups";
import { Search, X, Check, Loader2 } from "lucide-react";
import type { GroupSchedule, ProfileLite } from "@/lib/types/opic-study";
import { ScheduleFields } from "../_schedule-fields";

interface Props {
  initialSchedule: GroupSchedule;
}

export function NewStudyGroupForm({ initialSchedule }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // 폼 상태 (그룹 등급 X — 멤버 개인의 target_grade 사용)
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [schedule, setSchedule] = useState<GroupSchedule>(initialSchedule);

  // 멤버 검색
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<ProfileLite[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<ProfileLite[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) {
      setCandidates([]);
      return;
    }
    setSearching(true);
    const res = await searchMemberCandidates(query);
    setSearching(false);
    if (res.data) {
      // 이미 선택된 멤버 제외
      const selectedIds = new Set(selectedMembers.map((m) => m.user_id));
      setCandidates(res.data.filter((c) => !selectedIds.has(c.user_id)));
    }
  };

  const addMember = (m: ProfileLite) => {
    setSelectedMembers((prev) => [...prev, m]);
    setCandidates((prev) => prev.filter((c) => c.user_id !== m.user_id));
  };

  const removeMember = (userId: string) => {
    setSelectedMembers((prev) => prev.filter((m) => m.user_id !== userId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("그룹 이름을 입력해주세요.");
      return;
    }
    if (!startDate || !endDate) {
      setError("운영 기간을 입력해주세요.");
      return;
    }

    if (schedule.days.length === 0) {
      setError("운영 요일을 1개 이상 선택해주세요.");
      return;
    }
    if (schedule.start_time >= schedule.end_time) {
      setError("종료 시간이 시작 시간보다 늦어야 합니다.");
      return;
    }

    startTransition(async () => {
      const res = await createStudyGroup({
        name: name.trim(),
        start_date: startDate,
        end_date: endDate,
        description: description.trim() || undefined,
        schedule,
        member_user_ids: selectedMembers.map((m) => m.user_id),
      });

      if (res.error) {
        setError(res.error);
        return;
      }

      if (res.data?.groupId) {
        router.push(`/admin/study-groups/${res.data.groupId}`);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 이름 */}
      <Field label="그룹 이름" required>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 5월 오픽 AL 스터디"
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
          placeholder="이 스터디의 운영 방향이나 특이사항을 적어주세요."
          rows={3}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
        />
      </Field>

      {/* 일정 */}
      <div className="rounded-lg border border-border bg-surface-secondary/40 p-4">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-foreground">운영 일정</h3>
          <p className="mt-0.5 text-xs text-foreground-secondary">
            매주 어떤 요일·시간에 모일지 정합니다.
          </p>
        </div>
        <ScheduleFields value={schedule} onChange={setSchedule} showHint />
      </div>

      {/* 멤버 등록 */}
      <Field label={`초기 멤버 (${selectedMembers.length}명)`}>
        {/* 선택된 멤버 */}
        {selectedMembers.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2 rounded-lg border border-border bg-surface-secondary p-3">
            {selectedMembers.map((m) => (
              <span
                key={m.user_id}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs text-primary-700"
              >
                {m.display_name ?? m.email}
                <button
                  type="button"
                  onClick={() => removeMember(m.user_id)}
                  className="hover:text-primary-900"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* 검색 */}
        <div className="flex gap-2">
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
            type="button"
            onClick={handleSearch}
            disabled={searching}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-hover disabled:opacity-50"
          >
            {searching ? <Loader2 size={14} className="animate-spin" /> : "검색"}
          </button>
        </div>

        {/* 검색 결과 */}
        {candidates.length > 0 && (
          <div className="mt-3 max-h-60 overflow-auto rounded-lg border border-border bg-surface">
            {candidates.map((c) => (
              <button
                type="button"
                key={c.user_id}
                onClick={() => addMember(c)}
                className="flex w-full items-center justify-between border-b border-border px-3 py-2 text-left text-sm last:border-b-0 hover:bg-surface-hover"
              >
                <div>
                  <div className="font-medium">{c.display_name ?? "(이름 없음)"}</div>
                  <div className="text-xs text-foreground-secondary">{c.email}</div>
                </div>
                <Check size={14} className="text-primary-500" />
              </button>
            ))}
          </div>
        )}
      </Field>

      {/* 에러 */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 액션 */}
      <div className="flex justify-end gap-3 border-t border-border pt-6">
        <button
          type="button"
          onClick={() => router.push("/admin/study-groups")}
          className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-hover"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
        >
          {pending ? "생성 중…" : "그룹 만들기"}
        </button>
      </div>
    </form>
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
      <label className="mb-2 block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
