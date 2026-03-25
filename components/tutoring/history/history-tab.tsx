"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { getTutoringHistory } from "@/lib/actions/tutoring";
import { TUTORING_STATUS_LABELS } from "@/lib/types/tutoring";
import type { TutoringHistoryItem } from "@/lib/types/tutoring";

export function HistoryTab() {
  const { data: history, isLoading } = useQuery({
    queryKey: ["tutoring-history"],
    queryFn: async () => {
      const res = await getTutoringHistory();
      return res.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        <ClipboardList className="mx-auto mb-3 h-10 w-10 text-foreground-muted" />
        <h3 className="text-lg font-semibold text-foreground">아직 이력이 없어요</h3>
        <p className="mt-1 text-sm text-foreground-secondary">
          첫 튜터링을 시작하면 이력이 여기에 표시됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 성장 요약 (2회 이상일 때) */}
      {history.length >= 2 && (
        <GrowthSummary current={history[0]} previous={history[1]} />
      )}

      {/* 세션 목록 */}
      <div className="space-y-3">
        {history.map((item, idx) => (
          <SessionCard key={item.session_id} item={item} isLatest={idx === 0} />
        ))}
      </div>
    </div>
  );
}

/* ── 성장 요약 ── */

function GrowthSummary({
  current,
  previous,
}: {
  current: TutoringHistoryItem;
  previous: TutoringHistoryItem;
}) {
  const levelChanged = current.current_stable_level !== previous.current_stable_level;
  const moreGraduated = current.graduated_count > previous.graduated_count;

  return (
    <div className="rounded-xl border border-primary-200 bg-primary-50/50 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <TrendingUp className="h-4 w-4 text-primary-500" />
        성장 비교
      </div>
      <div className="mt-2 space-y-1 text-xs text-foreground-secondary">
        {levelChanged ? (
          <p>
            안정권이{" "}
            <span className="font-semibold text-primary-600">{previous.current_stable_level}</span>
            에서{" "}
            <span className="font-semibold text-primary-600">{current.current_stable_level}</span>
            으로 변화했습니다.
          </p>
        ) : (
          <p>안정권은 {current.current_stable_level}으로 유지 중입니다.</p>
        )}
        {moreGraduated && (
          <p>병목 졸업 수가 늘었습니다. ({previous.graduated_count} → {current.graduated_count})</p>
        )}
      </div>
    </div>
  );
}

/* ── 세션 카드 ── */

function SessionCard({
  item,
  isLatest,
}: {
  item: TutoringHistoryItem;
  isLatest: boolean;
}) {
  const date = new Date(item.created_at);
  const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;

  return (
    <div
      className={`rounded-xl border p-4 ${
        isLatest ? "border-primary-200 bg-surface" : "border-border bg-surface"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-foreground-muted" />
          <span className="text-sm font-medium text-foreground">{dateStr}</span>
          {isLatest && (
            <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-medium text-primary-700">
              최신
            </span>
          )}
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
            item.status === "completed"
              ? "bg-green-100 text-green-700"
              : item.status === "active"
                ? "bg-primary-100 text-primary-700"
                : "bg-gray-100 text-gray-600"
          }`}
        >
          {TUTORING_STATUS_LABELS[item.status]}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-surface-secondary p-2">
          <p className="text-[10px] text-foreground-muted">안정권</p>
          <p className="text-sm font-bold text-foreground">{item.current_stable_level}</p>
        </div>
        <div className="rounded-lg bg-surface-secondary p-2">
          <p className="text-[10px] text-foreground-muted">다음 단계</p>
          <p className="text-sm font-bold text-primary-600">{item.next_step_level}</p>
        </div>
        <div className="rounded-lg bg-surface-secondary p-2">
          <p className="text-[10px] text-foreground-muted">목표</p>
          <p className="text-sm font-bold text-foreground">{item.final_target_level}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-foreground-secondary">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-green-500" />
          졸업 {item.graduated_count}/{item.focus_count}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-foreground-muted" />
          Focus {item.focus_count}개
        </span>
      </div>
    </div>
  );
}
