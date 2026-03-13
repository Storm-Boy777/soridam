"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface AdminDataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function AdminDataTable<T extends Record<string, any>>({
  columns,
  data,
  total,
  page,
  pageSize,
  onPageChange,
  onRowClick,
  emptyMessage = "데이터가 없습니다",
}: AdminDataTableProps<T>) {
  const totalPages = Math.ceil(total / pageSize);

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface py-12 text-center text-sm text-foreground-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-secondary">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-2.5 text-left text-xs font-semibold text-foreground-secondary ${col.className || ""}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={i}
                onClick={() => onRowClick?.(row)}
                onKeyDown={onRowClick ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onRowClick(row);
                  }
                } : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? "button" : undefined}
                className={`border-b border-border last:border-0 ${
                  onRowClick ? "cursor-pointer hover:bg-surface-secondary focus:bg-surface-secondary focus:outline-none" : ""
                }`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 ${col.className || ""}`}>
                    {col.render
                      ? col.render(row)
                      : String(row[col.key] ?? "-")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
          <span className="text-xs text-foreground-muted">
            총 {total}건 중 {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="rounded-md p-1 text-foreground-secondary hover:bg-surface-secondary disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-2 text-xs text-foreground-secondary">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="rounded-md p-1 text-foreground-secondary hover:bg-surface-secondary disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
