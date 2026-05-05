"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ReactNode } from "react";

interface ImmersiveHeaderProps {
  title: string;
  /** 부제 — 단계별 정보 (예: "Q1 · 답변 중") */
  subtitle?: ReactNode;
  backHref: string;
  rightContent?: ReactNode;
  /** 뒤로 버튼 동작 override — 미전달 시 backHref Link */
  onBack?: () => void;
}

export function ImmersiveHeader({
  title,
  subtitle,
  backHref,
  rightContent,
  onBack,
}: ImmersiveHeaderProps) {
  const backNode = onBack ? (
    <button
      type="button"
      onClick={onBack}
      className="flex items-center gap-1.5 text-sm font-medium text-foreground-secondary transition-colors hover:text-foreground"
      aria-label="뒤로"
    >
      <ArrowLeft size={18} />
      <span className="hidden sm:inline">돌아가기</span>
    </button>
  ) : (
    <Link
      href={backHref}
      className="flex items-center gap-1.5 text-sm font-medium text-foreground-secondary transition-colors hover:text-foreground"
    >
      <ArrowLeft size={18} />
      <span className="hidden sm:inline">돌아가기</span>
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center border-b border-border bg-surface/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* 왼쪽: 뒤로가기 */}
        {backNode}

        {/* 중앙: 제목 + 부제 */}
        <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2 text-foreground">
          <h1 className="text-sm font-semibold">{title}</h1>
          {subtitle && (
            <>
              <span className="hidden text-foreground-muted sm:inline">·</span>
              <span className="hidden text-sm text-foreground-secondary sm:inline">
                {subtitle}
              </span>
            </>
          )}
        </div>

        {/* 오른쪽: 슬롯 */}
        <div className="flex items-center">{rightContent}</div>
      </div>
    </header>
  );
}
