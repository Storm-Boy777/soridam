"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAuditLogs } from "@/lib/actions/admin/logs";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AuditLogDetail } from "@/components/admin/audit-log-detail";
import type { AuditLogEntry } from "@/lib/types/admin";

// 액션 → 한글 라벨 + 카테고리 색상
const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  // 사용자
  balance_adjust: { label: "크레딧 조정", color: "bg-green-100 text-green-700" },
  plan_change: { label: "플랜 변경", color: "bg-green-100 text-green-700" },
  user_delete: { label: "계정 삭제", color: "bg-red-100 text-red-600" },
  beta_approve: { label: "베타 승인", color: "bg-purple-100 text-purple-700" },
  beta_revoke: { label: "베타 해제", color: "bg-purple-100 text-purple-700" },
  beta_reject: { label: "베타 거절", color: "bg-purple-100 text-purple-700" },
  // 결제
  refund: { label: "환불", color: "bg-orange-100 text-orange-700" },
  // 콘텐츠
  import_review: { label: "기출 입력", color: "bg-blue-100 text-blue-700" },
  exam_approve: { label: "기출 승인", color: "bg-blue-100 text-blue-700" },
  exam_reject: { label: "기출 거절", color: "bg-blue-100 text-blue-700" },
  prompt_update: { label: "프롬프트 수정", color: "bg-indigo-100 text-indigo-700" },
  eval_prompt_update: { label: "평가 프롬프트 수정", color: "bg-indigo-100 text-indigo-700" },
  tip_update: { label: "팁 수정", color: "bg-indigo-100 text-indigo-700" },
  // 학습 모듈
  eval_retrigger: { label: "평가 재실행", color: "bg-amber-100 text-amber-700" },
  eval_settings_update: { label: "평가 설정 변경", color: "bg-amber-100 text-amber-700" },
  delete_mock_session: { label: "모의고사 삭제", color: "bg-amber-100 text-amber-700" },
  checklist_update: { label: "체크리스트 수정", color: "bg-amber-100 text-amber-700" },
  delete_script: { label: "스크립트 삭제", color: "bg-amber-100 text-amber-700" },
  // 시스템
  setting_update: { label: "설정 변경", color: "bg-slate-100 text-slate-700" },
  maintenance_on: { label: "점검 모드 ON", color: "bg-slate-100 text-slate-700" },
  maintenance_off: { label: "점검 모드 OFF", color: "bg-slate-100 text-slate-700" },
  // 커뮤니티
  support_status_change: { label: "소통함 상태변경", color: "bg-sky-100 text-sky-700" },
  support_delete: { label: "소통함 삭제", color: "bg-sky-100 text-sky-700" },
};

// 필터 그룹 — 관련 action들을 묶어서 필터링
const ACTION_FILTER_OPTIONS: { value: string; label: string; actions: string[] }[] = [
  { value: "all", label: "전체", actions: [] },
  { value: "balance_adjust", label: "크레딧 조정", actions: ["balance_adjust"] },
  { value: "refund", label: "환불", actions: ["refund"] },
  { value: "import_review", label: "기출 입력", actions: ["import_review"] },
  { value: "exam", label: "기출 승인", actions: ["exam_approve", "exam_reject"] },
  { value: "prompt", label: "프롬프트", actions: ["prompt_update", "eval_prompt_update"] },
  { value: "eval", label: "평가", actions: ["eval_retrigger", "eval_settings_update", "checklist_update"] },
  { value: "mock", label: "모의고사", actions: ["delete_mock_session"] },
  { value: "script", label: "스크립트", actions: ["delete_script"] },
  { value: "setting", label: "설정", actions: ["setting_update", "maintenance_on", "maintenance_off"] },
  { value: "user", label: "사용자", actions: ["user_delete", "plan_change", "beta_approve", "beta_revoke", "beta_reject"] },
  { value: "support", label: "소통함", actions: ["support_status_change", "support_delete"] },
];

export default function AdminLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const activeFilter = ACTION_FILTER_OPTIONS.find((f) => f.value === action);
  const filterActions = activeFilter?.actions || [];

  const { data: logsData, isLoading } = useQuery({
    queryKey: ["admin-logs", page, action, dateFrom, dateTo],
    queryFn: () =>
      getAuditLogs({
        page,
        pageSize: 30,
        actions: filterActions.length > 0 ? filterActions : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    staleTime: 30 * 1000,
  });
  const logs = logsData?.data || [];
  const total = logsData?.total || 0;

  const columns = [
    {
      key: "created_at",
      label: "일시",
      render: (row: AuditLogEntry) =>
        new Date(row.created_at).toLocaleString("ko-KR", {
          timeZone: "Asia/Seoul",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
    },
    {
      key: "action",
      label: "액션",
      render: (row: AuditLogEntry) => {
        const info = ACTION_LABELS[row.action] || { label: row.action, color: "bg-gray-100 text-gray-600" };
        return (
          <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${info.color}`}>
            {info.label}
          </span>
        );
      },
    },
    {
      key: "admin_email",
      label: "관리자",
      render: (row: AuditLogEntry) => {
        const email = row.admin_email;
        return (
          <span className="text-foreground-secondary">
            {email ? email.split("@")[0] : row.admin_id.slice(0, 8)}
          </span>
        );
      },
    },
    {
      key: "target",
      label: "대상",
      render: (row: AuditLogEntry) => {
        if (!row.target_type) return <span className="text-foreground-muted">-</span>;
        const id = row.target_id?.slice(0, 8) || "-";
        return (
          <span className="text-foreground-secondary">
            <span className="text-foreground-muted">{row.target_type}:</span>{id}
          </span>
        );
      },
    },
    {
      key: "details",
      label: "상세",
      render: (row: AuditLogEntry) => <AuditLogDetail details={row.details} />,
    },
  ];

  return (
    <div className="space-y-4">
      {/* 헤더 + 총 건수 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">감사 로그</h1>
        {total > 0 && (
          <span className="text-xs text-foreground-muted">
            총 <span className="font-semibold text-foreground">{total}</span>건
          </span>
        )}
      </div>

      {/* 필터 영역 */}
      <div className="space-y-2">
        {/* 액션 필터 — 하단 인디케이터 */}
        <div className="flex border-b border-border">
          {ACTION_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setAction(opt.value); setPage(1); }}
              className={`relative px-3 py-2.5 text-[11px] font-medium transition-colors sm:px-4 sm:text-xs ${
                action === opt.value
                  ? "text-foreground"
                  : "text-foreground-muted hover:text-foreground-secondary"
              }`}
            >
              {opt.label}
              {action === opt.value && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-foreground" />
              )}
            </button>
          ))}
        </div>

        {/* 날짜 범위 */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="rounded-lg border border-border bg-surface px-2.5 py-1 text-[11px] text-foreground"
          />
          <span className="text-[11px] text-foreground-muted">~</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="rounded-lg border border-border bg-surface px-2.5 py-1 text-[11px] text-foreground"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(""); setDateTo(""); setPage(1); }}
              className="text-[11px] text-foreground-muted hover:text-foreground"
            >
              초기화
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg border border-border bg-surface-secondary" />
          ))}
        </div>
      ) : (
        <AdminDataTable
          columns={columns}
          data={logs}
          total={total}
          page={page}
          pageSize={30}
          onPageChange={setPage}
          emptyMessage="감사 로그가 없습니다"
        />
      )}
    </div>
  );
}
