"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, Loader2 } from "lucide-react";
import {
  getAdminTutoringStats,
  getAdminTutoringSessions,
  getAdminTutoringDetail,
} from "@/lib/actions/admin/tutoring";
import type { AdminTutoringStats, AdminTutoringDetail } from "@/lib/types/admin";

// ── 상수 ──

const STATUS_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "active", label: "진행 중" },
  { value: "completed", label: "완료" },
  { value: "paused", label: "일시정지" },
];

// 등급 색상 (모의고사와 동일)
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

// 질문 타입 한글 매핑
const QUESTION_TYPE_LABELS: Record<string, string> = {
  description: "묘사",
  routine: "루틴",
  comparison: "비교",
  past_experience_memorable: "경험(기억)",
  past_experience_change: "경험(변화)",
  past_experience_childhood: "경험(어린시절)",
  comparison_change: "비교변화",
  social_issue: "사회적이슈",
  ask_questions: "질문하기",
  suggest_alternative: "대안제시",
};

// 질문 타입 색상
const QUESTION_TYPE_COLORS: Record<string, string> = {
  description: "bg-blue-50 text-blue-700",
  routine: "bg-green-50 text-green-700",
  comparison: "bg-purple-50 text-purple-700",
  past_experience_memorable: "bg-amber-50 text-amber-700",
  past_experience_change: "bg-orange-50 text-orange-700",
  past_experience_childhood: "bg-rose-50 text-rose-700",
  comparison_change: "bg-indigo-50 text-indigo-700",
  social_issue: "bg-red-50 text-red-700",
  ask_questions: "bg-cyan-50 text-cyan-700",
  suggest_alternative: "bg-teal-50 text-teal-700",
};

// 세션 타입 한글
const SESSION_TYPE_LABELS: Record<string, string> = {
  guided: "가이드",
  free: "자유",
  simulation: "시뮬레이션",
};

// ── 상태 뱃지 ──

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; bg: string; text: string }> = {
    active: { label: "진행 중", bg: "bg-blue-50", text: "text-blue-700" },
    completed: { label: "완료", bg: "bg-green-50", text: "text-green-700" },
    paused: { label: "일시정지", bg: "bg-amber-50", text: "text-amber-700" },
    pending: { label: "대기", bg: "bg-gray-50", text: "text-gray-600" },
    in_progress: { label: "진행 중", bg: "bg-blue-50", text: "text-blue-700" },
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
  const color = LEVEL_COLORS[level] || "bg-gray-100 text-gray-700";

  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 text-xs font-bold ${color}`}>
      {level}
    </span>
  );
}

// ── 통계 뷰 ──

function TutoringStatsView({ stats }: { stats: AdminTutoringStats }) {
  return (
    <div className="space-y-4">
      {/* 상단 5칸 요약 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: "전체 세션", value: stats.totalSessions },
          { label: "진행 중", value: stats.activeSessions },
          { label: "완료", value: stats.completedSessions },
          { label: "총 처방", value: stats.totalPrescriptions },
          { label: "총 훈련", value: stats.totalTrainings },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-border bg-surface px-4 py-3"
          >
            <div className="text-xs text-foreground-muted">{item.label}</div>
            <div className="mt-1 text-xl font-bold text-foreground">{item.value}</div>
          </div>
        ))}
      </div>

      {/* 하단 3칸 분포 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* 등급별 분포 */}
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-2 text-xs font-medium text-foreground-secondary">목표 등급 분포</div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(stats.levelDistribution)
              .sort((a, b) => b[1] - a[1])
              .map(([level, count]) => (
                <span
                  key={level}
                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${
                    LEVEL_COLORS[level] || "bg-gray-100 text-gray-700"
                  }`}
                >
                  {level}
                  <span className="font-bold">{count}</span>
                </span>
              ))}
            {Object.keys(stats.levelDistribution).length === 0 && (
              <span className="text-xs text-foreground-muted">데이터 없음</span>
            )}
          </div>
        </div>

        {/* 상태별 분포 */}
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-2 text-xs font-medium text-foreground-secondary">상태별 분포</div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(stats.statusDistribution)
              .sort((a, b) => b[1] - a[1])
              .map(([st, count]) => {
                const labels: Record<string, string> = {
                  active: "진행 중",
                  completed: "완료",
                  paused: "일시정지",
                };
                return (
                  <span
                    key={st}
                    className="inline-flex items-center gap-1 rounded bg-surface-secondary px-1.5 py-0.5 text-xs text-foreground-secondary"
                  >
                    {labels[st] || st}
                    <span className="font-bold text-foreground">{count}</span>
                  </span>
                );
              })}
            {Object.keys(stats.statusDistribution).length === 0 && (
              <span className="text-xs text-foreground-muted">데이터 없음</span>
            )}
          </div>
        </div>

        {/* 질문 타입별 분포 */}
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-2 text-xs font-medium text-foreground-secondary">질문 타입 분포</div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(stats.questionTypeDistribution)
              .sort((a, b) => b[1] - a[1])
              .map(([qt, count]) => (
                <span
                  key={qt}
                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${
                    QUESTION_TYPE_COLORS[qt] || "bg-gray-100 text-gray-700"
                  }`}
                >
                  {QUESTION_TYPE_LABELS[qt] || qt}
                  <span className="font-bold">{count}</span>
                </span>
              ))}
            {Object.keys(stats.questionTypeDistribution).length === 0 && (
              <span className="text-xs text-foreground-muted">데이터 없음</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 상세 뷰 ──

function TutoringDetailView({
  sessionId,
  userEmail,
  onBack,
}: {
  sessionId: string;
  userEmail: string;
  onBack: () => void;
}) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ["admin-tutoring-detail", sessionId],
    queryFn: () => getAdminTutoringDetail(sessionId),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-primary-400" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="py-10 text-center text-sm text-foreground-secondary">
        세션 데이터를 불러올 수 없습니다.
      </div>
    );
  }

  // 처방 진행률 계산
  const prescProgress =
    detail.session.total_prescriptions > 0
      ? Math.round((detail.session.completed_prescriptions / detail.session.total_prescriptions) * 100)
      : 0;

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
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
          <GradeBadge level={detail.session.target_level} />
          <span className="text-border">·</span>
          <StatusBadge status={detail.session.status} />
          <span className="text-border">·</span>
          <span className="text-xs">진행률 {prescProgress}%</span>
        </div>
      </div>

      {/* 처방 목록 */}
      <div className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-2.5">
          <span className="text-sm font-medium text-foreground">
            처방 목록 ({detail.prescriptions.length}건)
          </span>
        </div>
        {detail.prescriptions.length === 0 ? (
          <div className="py-8 text-center text-sm text-foreground-muted">
            처방이 없습니다.
          </div>
        ) : (
          detail.prescriptions.map((p, idx) => (
            <div
              key={p.id}
              className={`flex items-center gap-3 px-4 py-3 ${
                idx < detail.prescriptions.length - 1 ? "border-b border-border/50" : ""
              }`}
            >
              {/* 우선순위 */}
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-xs font-bold text-foreground-secondary">
                {p.priority}
              </span>

              {/* 질문 타입 */}
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                  QUESTION_TYPE_COLORS[p.question_type] || "bg-gray-100 text-gray-700"
                }`}
              >
                {QUESTION_TYPE_LABELS[p.question_type] || p.question_type}
              </span>

              {/* 약점 태그 */}
              <div className="flex min-w-0 flex-1 flex-wrap gap-1">
                {p.weakness_tags.slice(0, 3).map((tag, i) => (
                  <span
                    key={i}
                    className="rounded bg-red-50 px-1 py-0.5 text-[10px] text-red-600"
                  >
                    {String(tag)}
                  </span>
                ))}
              </div>

              {/* 훈련 횟수 + 최고 점수 */}
              <div className="flex shrink-0 items-center gap-2 text-xs text-foreground-muted">
                <span>훈련 {p.training_count}회</span>
                {p.best_score !== null && (
                  <span className="font-medium text-foreground-secondary">
                    최고 {typeof p.best_score === "object" ? JSON.stringify(p.best_score) : p.best_score}
                  </span>
                )}
              </div>

              {/* 상태 */}
              <StatusBadge status={p.status} />
            </div>
          ))
        )}
      </div>

      {/* 최근 훈련 기록 */}
      <div className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-2.5">
          <span className="text-sm font-medium text-foreground">
            최근 훈련 기록 ({detail.recentTrainings.length}건)
          </span>
        </div>
        {detail.recentTrainings.length === 0 ? (
          <div className="py-8 text-center text-sm text-foreground-muted">
            훈련 기록이 없습니다.
          </div>
        ) : (
          detail.recentTrainings.map((t, idx) => {
            // 소요 시간 포맷
            const durationMin = t.duration_seconds
              ? Math.round(t.duration_seconds / 60)
              : null;

            return (
              <div
                key={t.id}
                className={`flex items-center gap-3 px-4 py-3 ${
                  idx < detail.recentTrainings.length - 1 ? "border-b border-border/50" : ""
                }`}
              >
                {/* 날짜 */}
                <div className="shrink-0 text-xs text-foreground-muted">
                  {new Date(t.started_at).toLocaleString("ko-KR", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>

                {/* 질문 타입 */}
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                    QUESTION_TYPE_COLORS[t.question_type] || "bg-gray-100 text-gray-700"
                  }`}
                >
                  {QUESTION_TYPE_LABELS[t.question_type] || t.question_type}
                </span>

                {/* 세션 타입 */}
                <span className="shrink-0 rounded bg-surface-secondary px-1.5 py-0.5 text-xs text-foreground-secondary">
                  {SESSION_TYPE_LABELS[t.session_type] || t.session_type}
                </span>

                {/* 진행도 */}
                <span className="text-xs text-foreground-muted">
                  {t.screens_completed}/6 화면
                </span>

                {/* 점수 */}
                <div className="min-w-0 flex-1 text-right text-xs">
                  {t.overall_score !== null ? (
                    <span className="font-medium text-foreground">
                      {typeof t.overall_score === "object"
                        ? JSON.stringify(t.overall_score)
                        : t.overall_score}
                    </span>
                  ) : (
                    <span className="text-foreground-muted">-</span>
                  )}
                </div>

                {/* 소요 시간 */}
                {durationMin !== null && (
                  <span className="shrink-0 text-xs text-foreground-muted">
                    {durationMin}분
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── 메인 페이지 ──

export default function AdminTutoringPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [selectedSession, setSelectedSession] = useState<{
    id: string;
    email: string;
  } | null>(null);

  const { data: stats } = useQuery({
    queryKey: ["admin-tutoring-stats"],
    queryFn: () => getAdminTutoringStats(),
    staleTime: 60_000,
  });

  const { data: sessionsResult, isLoading } = useQuery({
    queryKey: ["admin-tutoring-sessions", page, status],
    queryFn: () => getAdminTutoringSessions({ page, pageSize: 20, status }),
    staleTime: 30_000,
  });

  const sessions = sessionsResult?.data || [];
  const total = sessionsResult?.total || 0;
  const totalPages = Math.ceil(total / 20);

  // 상세 뷰
  if (selectedSession) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-foreground">튜터링 모니터링</h1>
        <TutoringDetailView
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
        <h1 className="text-xl font-bold text-foreground">튜터링 모니터링</h1>
        {stats && (
          <span className="text-sm text-foreground-muted">
            총 <span className="font-semibold text-foreground">{stats.totalSessions}</span>건
          </span>
        )}
      </div>

      {/* 통계 */}
      {stats && <TutoringStatsView stats={stats} />}

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
            <BookOpen size={32} className="text-foreground-muted/50" />
            <span className="text-sm text-foreground-muted">튜터링 세션이 없습니다.</span>
          </div>
        ) : (
          sessions.map((row, idx) => {
            // 처방 진행률
            const progress =
              row.total_prescriptions > 0
                ? `${row.completed_prescriptions}/${row.total_prescriptions}`
                : "-";

            return (
              <div
                key={row.id}
                className={`group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-secondary ${
                  idx < sessions.length - 1 ? "border-b border-border/50" : ""
                }`}
              >
                {/* 왼쪽: 사용자+시간 */}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">
                    {row.user_email}
                  </div>
                  <div className="mt-0.5 text-xs text-foreground-muted">
                    {new Date(row.created_at).toLocaleString("ko-KR", {
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>

                {/* 중앙: 등급+상태+진행률 */}
                <div className="flex shrink-0 items-center gap-2">
                  <GradeBadge level={row.target_level} />
                  <StatusBadge status={row.status} />
                  <span className="rounded bg-surface-secondary px-1.5 py-0.5 text-xs tabular-nums text-foreground-secondary">
                    {progress}
                  </span>
                </div>

                {/* 오른쪽: 상세 보기 */}
                <button
                  onClick={() =>
                    setSelectedSession({ id: row.id, email: row.user_email })
                  }
                  className="shrink-0 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium text-primary-600 transition-colors hover:bg-primary-50"
                >
                  상세 보기
                </button>
              </div>
            );
          })
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
