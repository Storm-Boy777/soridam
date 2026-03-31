"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RefreshCw, ArrowLeft, Loader2, GraduationCap, Search, Trash2, X } from "lucide-react";
import {
  getMockExamStats,
  getMockExamSessions,
  retriggerEvaluation,
  getAdminSessionDetail,
  deleteAdminSession,
  getEvalQualityStats,
} from "@/lib/actions/admin/mock-exam";
import { EvalPipelineView } from "@/components/admin/eval-pipeline-view";
import { EvalSettingsTab } from "@/components/admin/eval-settings-tab";
import { ExternalLink, BarChart3, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { AdminMockSession } from "@/lib/types/admin";

type PageTab = "monitoring" | "settings" | "quality";

const PAGE_TABS: { key: PageTab; label: string }[] = [
  { key: "monitoring", label: "모니터링" },
  { key: "quality", label: "평가 품질" },
  { key: "settings", label: "평가 설정" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "in_progress", label: "진행 중" },
  { value: "completed", label: "완료" },
  { value: "expired", label: "만료" },
];

const MODE_OPTIONS = [
  { value: "all", label: "전체 모드" },
  { value: "training", label: "훈련" },
  { value: "test", label: "실전" },
];

const LEVEL_OPTIONS = ["all", "AL", "IH", "IM3", "IM2", "IM1", "IL", "NH", "NM", "NL"];
const LEVEL_LABELS: Record<string, string> = { all: "전체 등급" };

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

// ── 삭제 확인 모달 ──

function ConfirmDialog({
  open,
  title,
  message,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={() => { if (!loading) onCancel(); }}
    >
      <div className="mx-4 w-full max-w-sm rounded-xl bg-surface p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="mt-2 text-sm text-foreground-secondary">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg px-4 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface-secondary"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            삭제
          </button>
        </div>
      </div>
    </div>
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

      {/* 사용자 결과 페이지 링크 */}
      <div className="flex flex-col items-center justify-center rounded-xl border border-border p-8" style={{ height: "calc(100vh - 220px)" }}>
        <p className="text-sm text-foreground-secondary mb-4">세션 상세 결과를 확인하세요</p>
        <a
          href={`/mock-exam/result/${sessionId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-600 transition-colors"
        >
          결과 페이지 열기
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}

export default function AdminMockExamPage() {
  const queryClient = useQueryClient();
  const [pageTab, setPageTab] = useState<PageTab>("monitoring");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [mode, setMode] = useState("all");
  const [level, setLevel] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [retriggering, setRetriggering] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<{ id: string; email: string } | null>(null);

  // 삭제 모달 상태
  const [deleteTarget, setDeleteTarget] = useState<AdminMockSession | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: stats } = useQuery({
    queryKey: ["admin-mock-stats"],
    queryFn: () => getMockExamStats(),
    staleTime: 60_000,
    enabled: pageTab === "monitoring",
  });

  const { data: sessionsResult, isLoading, refetch } = useQuery({
    queryKey: ["admin-mock-sessions", page, status, mode, level, search],
    queryFn: () => getMockExamSessions({ page, pageSize: 20, status, mode, level, search }),
    staleTime: 30_000,
    enabled: pageTab === "monitoring",
  });

  const sessions = sessionsResult?.data || [];
  const total = sessionsResult?.total || 0;
  const totalPages = Math.ceil(total / 20);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setErrorMsg(null);
    const result = await deleteAdminSession(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (result.error) {
      setErrorMsg(result.error);
    } else {
      queryClient.invalidateQueries({ queryKey: ["admin-mock-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-mock-stats"] });
    }
  };

  // 상세 뷰 모드
  if (selectedSession) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-foreground">모의고사 관리</h1>
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
        <h1 className="text-xl font-bold text-foreground">모의고사 관리</h1>
        {/* 검색 바 */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="사용자 이메일 검색"
              className="rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-sm text-foreground placeholder:text-foreground-muted/60"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600"
          >
            검색
          </button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-foreground-secondary hover:bg-surface-secondary"
            >
              <X size={12} />
              초기화
            </button>
          )}
        </form>
      </div>

      {/* 에러 알림 */}
      {errorMsg && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-2 text-red-400 hover:text-red-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* 탭 */}
      <div className="flex gap-1 border-b border-border">
        {PAGE_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setPageTab(t.key)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              pageTab === t.key
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-foreground-secondary hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 평가 설정 탭 */}
      {pageTab === "settings" && <EvalSettingsTab />}

      {/* 평가 품질 탭 */}
      {pageTab === "quality" && <EvalQualityTab />}

      {/* 모니터링 탭 */}
      {pageTab === "monitoring" && (
        <>
          <div className="flex items-center justify-end">
            {stats && (
              <span className="text-sm text-foreground-muted">
                총 <span className="font-semibold text-foreground">{stats.totalSessions}</span>건
              </span>
            )}
          </div>

          {/* 파이프라인 통계 */}
          {stats && <EvalPipelineView stats={stats} />}

          {/* 필터 행 */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 상태 필터 */}
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

            <span className="text-border">|</span>

            {/* 모드 필터 */}
            <select
              value={mode}
              onChange={(e) => { setMode(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
            >
              {MODE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* 등급 필터 */}
            <select
              value={level}
              onChange={(e) => { setLevel(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
            >
              {LEVEL_OPTIONS.map((lv) => (
                <option key={lv} value={lv}>
                  {LEVEL_LABELS[lv] || lv}
                </option>
              ))}
            </select>
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
                    {/* 삭제 버튼 */}
                    <button
                      onClick={() => setDeleteTarget(row)}
                      className="rounded-md p-1 text-foreground-muted/50 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                      title="삭제"
                    >
                      <Trash2 size={14} />
                    </button>
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
        </>
      )}

      {/* 삭제 확인 모달 */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="모의고사 세션 삭제"
        message={`${deleteTarget?.user_email || ""} 사용자의 세션을 삭제하시겠습니까? 답변, 평가, 리포트, 녹음 파일이 모두 삭제됩니다.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

/* ── 평가 품질 탭 ── */

const LEVEL_ORDER = ["AL", "IH", "IM3", "IM2", "IM1", "IL", "NH", "NM", "NL"];

function EvalQualityTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-eval-quality"],
    queryFn: getEvalQualityStats,
    staleTime: 60_000,
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary-500" /></div>;
  if (!data) return <p className="py-12 text-center text-sm text-foreground-muted">데이터를 불러올 수 없습니다</p>;

  const maxCount = Math.max(...LEVEL_ORDER.map((l) => data.levelDistribution[l] || 0), 1);
  const maxCountRecent = Math.max(...LEVEL_ORDER.map((l) => data.recentLevelDistribution[l] || 0), 1);

  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-3">
          <p className="text-xs text-foreground-muted">스킵률</p>
          <p className="text-xl font-bold text-foreground">{data.skipRate}%</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <p className="text-xs text-foreground-muted">실패율</p>
          <p className={`text-xl font-bold ${data.failRate > 5 ? "text-red-600" : "text-foreground"}`}>{data.failRate}%</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <p className="text-xs text-foreground-muted">평균 처리 시간</p>
          <p className="text-xl font-bold text-foreground">{data.avgProcessingMinutes}분</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <p className="text-xs text-foreground-muted">체크박스 이상</p>
          <p className={`text-xl font-bold ${data.checkboxAnomalies.length > 0 ? "text-amber-600" : "text-green-600"}`}>
            {data.checkboxAnomalies.length}개
          </p>
        </div>
      </div>

      {/* 등급 분포 히스토그램 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">전체 등급 분포</h3>
          <div className="space-y-1.5">
            {LEVEL_ORDER.map((level) => {
              const count = data.levelDistribution[level] || 0;
              return (
                <div key={level} className="flex items-center gap-2">
                  <span className="w-8 text-xs font-medium text-foreground">{level}</span>
                  <div className="h-5 flex-1 rounded-md bg-surface-secondary">
                    <div
                      className="h-full rounded-md bg-primary-400"
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs tabular-nums text-foreground-muted">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">최근 30일 등급 분포</h3>
          <div className="space-y-1.5">
            {LEVEL_ORDER.map((level) => {
              const count = data.recentLevelDistribution[level] || 0;
              return (
                <div key={level} className="flex items-center gap-2">
                  <span className="w-8 text-xs font-medium text-foreground">{level}</span>
                  <div className="h-5 flex-1 rounded-md bg-surface-secondary">
                    <div
                      className="h-full rounded-md bg-blue-400"
                      style={{ width: `${(count / maxCountRecent) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs tabular-nums text-foreground-muted">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 체크박스 이상 항목 */}
      {data.checkboxAnomalies.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-800">
            <AlertTriangle size={16} />
            체크박스 이상 감지 ({data.checkboxAnomalies.length}개)
          </h3>
          <p className="mb-3 text-xs text-amber-700">Pass율이 10% 미만 또는 95% 초과인 항목입니다. 평가 기준을 점검해 주세요.</p>
          <div className="space-y-1">
            {data.checkboxAnomalies.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-xs">
                <span className="font-mono text-amber-800">{a.id}</span>
                <span className={`font-bold ${a.passRate < 10 ? "text-red-600" : "text-green-600"}`}>
                  {a.passRate}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
