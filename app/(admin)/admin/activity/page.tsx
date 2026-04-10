"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  LogIn,
  UserPlus,
  CreditCard,
  GraduationCap,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getAllActivityLogs } from "@/lib/actions/admin/stats";

const ACTION_CONFIG: Record<
  string,
  { label: string; icon: typeof Activity; color: string }
> = {
  login: {
    label: "로그인",
    icon: LogIn,
    color: "bg-slate-100 text-slate-600",
  },
  signup: {
    label: "가입",
    icon: UserPlus,
    color: "bg-green-100 text-green-700",
  },
  order: {
    label: "결제",
    icon: CreditCard,
    color: "bg-blue-100 text-blue-700",
  },
  mock_exam: {
    label: "모의고사",
    icon: GraduationCap,
    color: "bg-purple-100 text-purple-700",
  },
  review: {
    label: "후기",
    icon: FileText,
    color: "bg-amber-100 text-amber-700",
  },
};

const FILTER_OPTIONS = [
  { id: "", label: "전체" },
  { id: "login", label: "로그인" },
  { id: "signup", label: "가입" },
  { id: "order", label: "결제" },
  { id: "mock_exam", label: "모의고사" },
  { id: "review", label: "후기" },
];

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelative(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return null; // 절대 시간 사용
}

export default function AdminActivityPage() {
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-activity", action, page],
    queryFn: () =>
      getAllActivityLogs({ action: action || undefined, page, limit: pageSize }),
    staleTime: 15_000,
  });

  const logs = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">활동 로그</h1>
        <p className="mt-0.5 text-sm text-foreground-secondary">
          사용자의 로그인, 결제, 모의고사 등 활동 기록을 확인합니다.
        </p>
      </div>

      {/* 필터 — 하단 인디케이터 */}
      <div className="flex border-b border-border">
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f.id}
            onClick={() => {
              setAction(f.id);
              setPage(1);
            }}
            className={`relative px-4 py-3 text-xs font-medium transition-colors sm:px-6 sm:text-sm ${
              action === f.id
                ? "text-foreground"
                : "text-foreground-muted hover:text-foreground-secondary"
            }`}
          >
            {f.label}
            {action === f.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-foreground" />
            )}
          </button>
        ))}
      </div>

      {/* 통계 */}
      <p className="text-xs text-foreground-muted">
        총 {total.toLocaleString()}건
      </p>

      {/* 로그 테이블 */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-lg bg-surface-secondary"
            />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <p className="py-12 text-center text-sm text-foreground-muted">
          활동 기록이 없습니다
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          {/* 헤더 */}
          <div className="hidden border-b border-border bg-surface-secondary/50 px-4 py-2.5 sm:flex">
            <span className="w-24 text-[11px] font-semibold text-foreground-muted">
              유형
            </span>
            <span className="flex-1 text-[11px] font-semibold text-foreground-muted">
              사용자
            </span>
            <span className="w-48 text-[11px] font-semibold text-foreground-muted">
              상세
            </span>
            <span className="w-36 text-right text-[11px] font-semibold text-foreground-muted">
              시간
            </span>
          </div>

          {/* 행 */}
          {logs.map((log, idx) => {
            const config = ACTION_CONFIG[log.action] || {
              label: log.action,
              icon: Activity,
              color: "bg-gray-100 text-gray-600",
            };
            const Icon = config.icon;
            const relative = formatRelative(log.created_at);

            return (
              <div
                key={log.id}
                className={`flex items-center px-4 py-3 ${
                  idx > 0 ? "border-t border-border" : ""
                }`}
              >
                {/* 유형 */}
                <div className="w-24 shrink-0">
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${config.color}`}
                  >
                    <Icon size={11} />
                    {config.label}
                  </span>
                </div>

                {/* 사용자 */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">
                    <span className="font-medium">{log.display_name || log.email || "사용자"}</span>
                    {log.display_name && log.email && (
                      <span className="ml-2 text-[11px] text-foreground-muted">{log.email}</span>
                    )}
                  </p>
                </div>

                {/* 상세 */}
                <div className="hidden w-48 sm:block">
                  {log.metadata &&
                  Object.keys(log.metadata).length > 0 ? (
                    <p className="truncate text-xs text-foreground-muted">
                      {Object.entries(log.metadata)
                        .slice(0, 2)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(", ")}
                    </p>
                  ) : (
                    <span className="text-xs text-foreground-muted/40">
                      —
                    </span>
                  )}
                </div>

                {/* 시간 */}
                <div className="w-36 shrink-0 text-right">
                  {relative ? (
                    <span className="text-xs text-foreground-secondary">
                      {relative}
                    </span>
                  ) : (
                    <span className="text-xs text-foreground-muted">
                      {formatTime(log.created_at)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-foreground-muted">
            {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, total)} / {total}건
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md p-1.5 hover:bg-surface-secondary disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-2 text-xs text-foreground-secondary">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-md p-1.5 hover:bg-surface-secondary disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
