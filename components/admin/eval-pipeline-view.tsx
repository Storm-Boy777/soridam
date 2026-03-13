"use client";

// 모의고사 평가 파이프라인 시각화 + 분포 통계

import type { MockExamStats } from "@/lib/types/admin";

const STAGES = [
  { key: "pending", label: "대기" },
  { key: "processing", label: "STT" },
  { key: "stt_done", label: "STT완료" },
  { key: "judging", label: "채점" },
  { key: "judge_done", label: "채점완료" },
  { key: "coaching", label: "코칭" },
  { key: "complete", label: "완료" },
];

const stageColor: Record<string, string> = {
  pending: "bg-gray-200 text-gray-600",
  processing: "bg-blue-100 text-blue-700",
  stt_done: "bg-blue-200 text-blue-800",
  judging: "bg-amber-100 text-amber-700",
  judge_done: "bg-amber-200 text-amber-800",
  coaching: "bg-purple-100 text-purple-700",
  complete: "bg-green-100 text-green-700",
  error: "bg-red-100 text-red-700",
  skipped: "bg-gray-100 text-gray-500",
};

export function EvalPipelineBadge({ status }: { status: string }) {
  const color = stageColor[status] || stageColor.pending;
  const stage = STAGES.find((s) => s.key === status);

  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${color}`}>
      {stage?.label || status}
    </span>
  );
}

// ── 등급별 컬러 ──

const LEVEL_ORDER = ["AL", "IH", "IM3", "IM2", "IM1", "IL", "NH", "NM", "NL"];
const LEVEL_COLORS: Record<string, string> = {
  AL: "bg-purple-100 text-purple-800",
  IH: "bg-blue-100 text-blue-800",
  IM3: "bg-sky-100 text-sky-800",
  IM2: "bg-teal-100 text-teal-700",
  IM1: "bg-emerald-100 text-emerald-700",
  IL: "bg-amber-100 text-amber-800",
  NH: "bg-orange-100 text-orange-700",
  NM: "bg-red-100 text-red-700",
  NL: "bg-red-100 text-red-700",
};

// ── 통계 뷰 ──

export function EvalPipelineView({ stats }: { stats: MockExamStats }) {
  const completionRate = stats.totalSessions > 0
    ? Math.round((stats.completedSessions / stats.totalSessions) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* 메인 통계 카드 */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <StatBox label="전체 세션" value={stats.totalSessions} />
        <StatBox label="완료" value={stats.completedSessions} sub={`${completionRate}%`} />
        <StatBox label="평가 대기" value={stats.pendingEvals} warn={stats.pendingEvals > 0} />
        <StatBox label="에러" value={stats.failedEvals} warn={stats.failedEvals > 0} />
        <StatBox label="최다 등급" value={stats.avgGrade || "-"} />
      </div>

      {/* 분포 카드 */}
      <div className="grid gap-3 md:grid-cols-3">
        {/* 등급 분포 */}
        {Object.keys(stats.levelDistribution).length > 0 && (
          <div className="rounded-lg border border-border bg-surface px-3.5 py-2.5">
            <div className="mb-2 text-[11px] font-medium text-foreground-muted">등급별 분포</div>
            <div className="flex flex-wrap gap-1.5">
              {LEVEL_ORDER
                .filter((lv) => stats.levelDistribution[lv])
                .map((lv) => (
                  <span key={lv} className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold ${LEVEL_COLORS[lv] || "bg-gray-100 text-gray-700"}`}>
                    {lv}
                    <span className="font-normal opacity-70">{stats.levelDistribution[lv]}</span>
                  </span>
                ))}
            </div>
          </div>
        )}

        {/* 모드 분포 */}
        {Object.keys(stats.modeDistribution).length > 0 && (
          <div className="rounded-lg border border-border bg-surface px-3.5 py-2.5">
            <div className="mb-2 text-[11px] font-medium text-foreground-muted">모드별 분포</div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(stats.modeDistribution)
                .sort((a, b) => b[1] - a[1])
                .map(([mode, count]) => (
                  <span
                    key={mode}
                    className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${
                      mode === "test" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    {mode === "test" ? "실전" : "훈련"}
                    <span className="font-normal opacity-70">{count}</span>
                  </span>
                ))}
            </div>
          </div>
        )}

        {/* 상태 분포 */}
        {Object.keys(stats.statusDistribution).length > 0 && (
          <div className="rounded-lg border border-border bg-surface px-3.5 py-2.5">
            <div className="mb-2 text-[11px] font-medium text-foreground-muted">상태별 분포</div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(stats.statusDistribution)
                .sort((a, b) => b[1] - a[1])
                .map(([status, count]) => {
                  const statusLabels: Record<string, string> = {
                    completed: "완료",
                    in_progress: "진행 중",
                    active: "진행 중",
                    expired: "만료",
                    abandoned: "중단",
                  };
                  const statusColors: Record<string, string> = {
                    completed: "bg-green-50 text-green-700",
                    in_progress: "bg-blue-50 text-blue-700",
                    active: "bg-blue-50 text-blue-700",
                    expired: "bg-gray-100 text-gray-500",
                    abandoned: "bg-red-50 text-red-600",
                  };
                  return (
                    <span
                      key={status}
                      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${statusColors[status] || "bg-gray-100 text-gray-600"}`}
                    >
                      {statusLabels[status] || status}
                      <span className="font-normal opacity-70">{count}</span>
                    </span>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  sub,
  warn,
}: {
  label: string;
  value: string | number;
  sub?: string;
  warn?: boolean;
}) {
  return (
    <div className={`rounded-lg border px-3.5 py-2.5 ${warn ? "border-red-200 bg-red-50" : "border-border bg-surface"}`}>
      <div className="text-[11px] text-foreground-muted">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className={`text-lg font-bold tabular-nums ${warn ? "text-red-600" : "text-foreground"}`}>
          {value}
        </span>
        {sub && <span className="text-xs text-foreground-muted">{sub}</span>}
      </div>
    </div>
  );
}
