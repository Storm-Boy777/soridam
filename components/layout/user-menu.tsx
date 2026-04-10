"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Settings, LogOut, Shield } from "lucide-react";
import { serverSignOut } from "@/lib/supabase";

export function UserMenu({ name, isAdmin }: { name: string; isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initial = name ? name[0].toUpperCase() : "U";

  return (
    <div ref={ref} className="relative hidden md:block">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500/80 text-sm font-bold text-white transition-colors hover:bg-primary-500"
        aria-label="사용자 메뉴"
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-48 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-lg">
          <div className="border-b border-border px-3 py-2.5">
            <p className="text-sm font-medium text-foreground">
              {name || "사용자"}
            </p>
          </div>
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-primary-600 transition-colors hover:bg-primary-50"
            >
              <Shield size={16} />
              관리자
            </Link>
          )}
          <Link
            href="/mypage"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 text-sm text-foreground-secondary transition-colors hover:bg-surface-secondary"
          >
            <Settings size={16} />
            마이페이지
          </Link>
          <button
            onClick={() => {
              setOpen(false);
              setIsLoggingOut(true);
              serverSignOut();
            }}
            disabled={isLoggingOut}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-foreground-secondary transition-colors hover:bg-surface-secondary disabled:opacity-50"
          >
            <LogOut size={16} />
            {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
          </button>
        </div>
      )}
    </div>
  );
}
