"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Settings, LogOut, Shield } from "lucide-react";
import { serverSignOut } from "@/lib/supabase";

type NavItem = { label: string; href: string; soon?: boolean };

export function MobileNav({
  isLoggedIn,
  items,
  userName,
  isAdmin,
}: {
  isLoggedIn: boolean;
  items: NavItem[];
  userName?: string;
  isAdmin?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        aria-label="메뉴"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <>
          {/* 오버레이 */}
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setOpen(false)}
          />

          {/* 드롭다운 메뉴 */}
          <div className="absolute left-0 right-0 top-16 z-50 border-b border-border bg-surface px-4 py-3 shadow-lg">
            <div className="space-y-1">
              {items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={(e) => {
                      if (item.href.startsWith("/#") && pathname === "/") {
                        e.preventDefault();
                        const id = item.href.replace("/#", "");
                        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
                      }
                      setOpen(false);
                    }}
                    className={`flex items-center justify-between rounded-[var(--radius-lg)] px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-primary-50 text-primary-600"
                        : "text-foreground-secondary hover:bg-surface-secondary hover:text-foreground"
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.soon && (
                      <span className="rounded-full bg-surface-secondary px-1.5 py-0.5 text-[10px] text-foreground-muted">
                        준비 중
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* 로그인 시: 관리자 + 마이페이지 + 로그아웃 */}
            {isLoggedIn && (
              <div className="mt-3 space-y-1 border-t border-border pt-3">
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2 rounded-[var(--radius-lg)] px-3 py-2.5 text-sm font-medium transition-colors ${
                      pathname.startsWith("/admin")
                        ? "bg-primary-50 text-primary-600"
                        : "text-primary-600 hover:bg-primary-50"
                    }`}
                  >
                    <Shield size={16} />
                    관리자
                  </Link>
                )}
                <Link
                  href="/mypage"
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2 rounded-[var(--radius-lg)] px-3 py-2.5 text-sm font-medium transition-colors ${
                    pathname === "/mypage"
                      ? "bg-primary-50 text-primary-600"
                      : "text-foreground-secondary hover:bg-surface-secondary hover:text-foreground"
                  }`}
                >
                  <Settings size={16} />
                  마이페이지
                  {userName && (
                    <span className="ml-auto text-xs text-foreground-muted">
                      {userName}
                    </span>
                  )}
                </Link>
                <button
                  onClick={() => {
                    setOpen(false);
                    setIsLoggingOut(true);
                    serverSignOut();
                  }}
                  disabled={isLoggingOut}
                  className="flex w-full items-center gap-2 rounded-[var(--radius-lg)] px-3 py-2.5 text-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary hover:text-foreground disabled:opacity-50"
                >
                  <LogOut size={16} />
                  {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
                </button>
              </div>
            )}

          </div>
        </>
      )}
    </div>
  );
}
