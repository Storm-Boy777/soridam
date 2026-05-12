"use client";

// 기출 보관함 — 페이지네이션 (PC 10개 / 모바일 5개 그룹 윈도우)

import { useEffect, useState } from "react";

interface Props {
  currentPage: number;
  totalPages: number;
  onChangePage: (page: number) => void;
}

export function ExamPagination({ currentPage, totalPages, onChangePage }: Props) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const groupSize = isMobile ? 5 : 10;
  const groupStart = Math.floor((currentPage - 1) / groupSize) * groupSize + 1;
  const groupEnd = Math.min(groupStart + groupSize - 1, totalPages);

  const pageNumbers: number[] = [];
  for (let i = groupStart; i <= groupEnd; i++) pageNumbers.push(i);

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const hasPrevGroup = groupStart > 1;
  const hasNextGroup = groupEnd < totalPages;

  const prevGroupStart = Math.max(1, groupStart - groupSize);
  const nextGroupStart = Math.min(totalPages, groupEnd + 1);
  const jumpLabel = isMobile ? "5페이지" : "10페이지";

  const btnBase =
    "inline-flex shrink-0 items-center justify-center rounded-md border text-sm font-bold tabular-nums transition-colors";
  const btnSize = isMobile ? "h-8 min-w-8 px-2 text-xs" : "h-9 min-w-9 px-2.5 text-[13px]";

  return (
    <div className="flex flex-wrap items-center justify-center gap-1 border-t border-border pt-4 sm:gap-1.5">
      <NavBtn
        onClick={() => onChangePage(prevGroupStart)}
        disabled={!hasPrevGroup}
        ariaLabel={`${jumpLabel} 이전`}
        title={`${jumpLabel} 이전`}
        sizeClass={btnSize}
      >
        «
      </NavBtn>
      <NavBtn
        onClick={() => onChangePage(currentPage - 1)}
        disabled={!hasPrev}
        ariaLabel="이전 기출"
        title="이전 기출"
        sizeClass={btnSize}
      >
        ‹
      </NavBtn>

      {pageNumbers.map((p) => {
        const isCurrent = p === currentPage;
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChangePage(p)}
            disabled={isCurrent}
            aria-current={isCurrent ? "page" : undefined}
            className={`${btnBase} ${btnSize} ${
              isCurrent
                ? "cursor-default border-primary-500 bg-primary-500 text-white"
                : "border-border bg-surface text-foreground hover:bg-surface-secondary"
            }`}
          >
            {p}
          </button>
        );
      })}

      <NavBtn
        onClick={() => onChangePage(currentPage + 1)}
        disabled={!hasNext}
        ariaLabel="다음 기출"
        title="다음 기출"
        sizeClass={btnSize}
      >
        ›
      </NavBtn>
      <NavBtn
        onClick={() => onChangePage(nextGroupStart)}
        disabled={!hasNextGroup}
        ariaLabel={`${jumpLabel} 다음`}
        title={`${jumpLabel} 다음`}
        sizeClass={btnSize}
      >
        »
      </NavBtn>
    </div>
  );
}

function NavBtn({
  onClick,
  disabled,
  ariaLabel,
  title,
  sizeClass,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  ariaLabel: string;
  title: string;
  sizeClass: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title}
      className={`inline-flex shrink-0 items-center justify-center rounded-md border border-border text-base font-bold transition-colors ${sizeClass} ${
        disabled
          ? "cursor-not-allowed bg-surface-secondary text-foreground-muted"
          : "bg-surface text-foreground-secondary hover:bg-surface-secondary"
      }`}
    >
      {children}
    </button>
  );
}
