"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { RefreshCw, ArrowLeft, Loader2, GraduationCap } from "lucide-react";
import {
  getMockExamStats,
  getMockExamSessions,
  retriggerEvaluation,
  getAdminSessionDetail,
} from "@/lib/actions/admin/mock-exam";
import { EvalPipelineView } from "@/components/admin/eval-pipeline-view";
import { ResultPageContent } from "@/components/mock-exam/result-page/result-page-content";
import type { AdminMockSession, MockExamStats } from "@/lib/types/admin";

const STATUS_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "in_progress", label: "진행 중" },
  { value: "completed", label: "완료" },
  { value: "expired", label: "만료" },
];

// ── 상태 뱃지 ──

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; bg: string; text: string }> = {
    completed: { label: "완료", bg: "bg-green-50", text: "text-green-700" },
    in_progress: { label: "진행 중", bg: "bg-blue-50", text: "text-blue-700" },
    active: { label: "진행 중", bg: "bg-blue-50", text: "text-blue-700" },
    expired: { label: "만료", bg: "bg-gray-100", text: "text-gray-500" },
    abandoned: { label: "중단", bg: "bg-red-50", text: "text-red-600" },
  };
  const c = config[status] || { label: status, bg: "bg-gray-100", text: "text-gray-500" };

  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

// ── 등급 뱃지 ──

function GradeBadge({ level }: { level: string | null }) {
  if (!level) return <span className="text-xs text-foreground-muted">-</span>;

  // 등급별 컬러
  const gradeColor: Record<string, string> = {
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
  const color = gradeColor[level] || "bg-gray-100 text-gray-700";

  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 text-xs font-bold ${color}`}>
      {level}
    </span>
  );
}

// ── 세션 상세 뷰 (사용자 화면 재사용) ──

function SessionDetailView({
  sessionId,
  userEmail,
  onBack,
}: {
  sessionId: string;
  userEmail: string;
  onBack: () => void;
}) {
  const { data: result, isLoading } = useQuery({
    queryKey: ["admin-mock-detail", sessionId],
    queryFn: () => getAdminSessionDetail(sessionId),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-primary-400" />
      </div>
    );
  }

  if (!result?.data || result?.error) {
    return (
      <div className="py-10 text-center text-sm text-foreground-secondary">
        세션 데이터를 불러올 수 없습니다.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-foreground-secondary transition-colors hover:bg-surface-secondary hover:text-foreground"
        >
          <ArrowLeft size={14} />
          목록
        </button>
        <div className="flex items-center gap-2 text-sm text-foreground-muted">
          <span>{userEmail}</span>
          <span className="text-border">·</span>
          <span className="font-mono text-xs">{sessionId.slice(0, 12)}…</span>
        </div>
      </div>

      {/* 사용자 결과 화면 그대로 렌더링 */}
      <div className="flex flex-col overflow-hidden rounded-xl border border-border" style={{ height: "calc(100vh - 220px)" }}>
        <ResultPageContent
          sessionId={sessionId}
          initialData={result.data}
        />
      </div>
    </div>
  );
}

export default function AdminMockExamPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [retriggering, setRetriggering] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<{ id: string; email: string } | null>(null);

  const { data: stats } = useQuery({
    queryKey: ["admin-mock-stats"],
    queryFn: () => getMockExamStats(),
    staleTime: 60_000,
  });

  const { data: sessionsResult, isLoading, refetch } = useQuery({
    queryKey: ["admin-mock-sessions", page, status],
    queryFn: () => getMockExamSessions({ page, pageSize: 20, status }),
    staleTime: 30_000,
  });

  const sessions = sessionsResult?.data || [];
  const total = sessionsResult?.total || 0;
  const totalPages = Math.ceil(total / 20);

  const handleRetrigger = async (sessionId: string) => {
    if (!confirm("이 세션의 평가를 재실행하시겠습니까?")) return;
    setRetriggering(sessionId);
    try {
      const result = await retriggerEvaluation(sessionId);
      if (!result.success) {
        toast.error(result.error || "재실행 실패");
      } else {
        toast.success("평가 재실행이 시작되었습니다");
        refetch();
      }
    } finally {
      setRetriggering(null);
    }
  };

  // 상세 뷰 모드
  if (selectedSession) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-foreground">모의고사 모니터링</h1>
        <SessionDetailView
          sessionId={selectedSession.id}
          userEmail={selectedSession.email}
          onBack={() => setSelectedSession(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">모의고사 모니터링</h1>
        {stats && (
          <span className="text-sm text-foreground-muted">
            총 <span className="font-semibold text-foreground">{stats.totalSessions}</span>건
          </span>
        )}
      </div>

      {/* 파이프라인 통계 */}
      {stats && <EvalPipelineView stats={stats} />}

      {/* 필터 */}
      <div className="flex gap-1">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              setStatus(opt.value);
              setPage(1);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              status === opt.value
                ? "bg-primary-500 text-white"
                : "bg-surface-secondary text-foreground-secondary hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 세션 목록 */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-primary-400" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16">
            <GraduationCap size={32} className="text-foreground-muted/50" />
            <span className="text-sm text-foreground-muted">모의고사 세션이 없습니다.</span>
          </div>
        ) : (
          sessions.map((row, idx) => (
            <div
              key={row.id}
              className={`group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-secondary ${
                idx < sessions.length - 1 ? "border-b border-border/50" : ""
              }`}
            >
              {/* 왼쪽: 사용자+시간 */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-foreground">
                    {row.user_email}
                  </span>
                  <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                    row.mode === "test" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"
                  }`}>
                    {row.mode === "test" ? "실전" : "훈련"}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-foreground-muted">
                  {new Date(row.started_at).toLocaleString("ko-KR", {
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>

              {/* 중앙: 상태+등급 */}
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge status={row.status} />
                <GradeBadge level={row.final_level} />
              </div>

              {/* 오른쪽: 액션 */}
              <div className="flex shrink-0 items-center gap-1">
                {row.status === "completed" && (
                  <button
                    onClick={() => setSelectedSession({ id: row.id, email: row.user_email })}
                    className="whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium text-primary-600 transition-colors hover:bg-primary-50"
                  >
                    결과 보기
                  </button>
                )}
                {row.status === "completed" && (
                  <button
                    onClick={() => handleRetrigger(row.id)}
                    disabled={retriggering === row.id}
                    title="평가 재실행"
                    className="rounded-md p-1.5 text-foreground-muted transition-colors hover:bg-surface-secondary hover:text-primary-600 disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={retriggering === row.id ? "animate-spin" : ""} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary disabled:opacity-40"
          >
            이전
          </button>
          <span className="text-xs tabular-nums text-foreground-muted">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary disabled:opacity-40"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
