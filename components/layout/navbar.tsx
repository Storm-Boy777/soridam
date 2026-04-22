"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { UserMenu } from "./user-menu";
import { MobileNav } from "./mobile-nav";

// Supabase 브라우저 클라이언트 — 모듈 레벨 싱글턴 (useEffect 내 재생성 방지)
const supabase = createClient();

/* ── 네비게이션 항목 ── */

type NavItem = { label: string; href: string; soon?: boolean };

const publicNav: NavItem[] = [
  { label: "학습 기능", href: "/#pipeline" },
  { label: "전략 가이드", href: "/strategy" },
];

const appNav: NavItem[] = [
  { label: "대시보드", href: "/dashboard" },
  { label: "시험후기", href: "/reviews" },
  { label: "스크립트", href: "/scripts" },
  { label: "모의고사", href: "/mock-exam" },
  { label: "튜터링", href: "/tutoring" },
  { label: "만능패턴", href: "/patterns" },
  { label: "AI 스토어", href: "/store" },
  { label: "소통함", href: "/support" },
];

// 관리자 전용 메뉴
const adminOnlyNav: NavItem[] = [
  { label: "스터디", href: "/study-group" },
];

/** 서버에서 전달하는 인증 정보 (선택적). 전달 시 클라이언트 getSession() 스킵 → 깜빡임 제거 */
export interface NavbarServerAuth {
  isLoggedIn: boolean;
  userName: string;
  isAdmin: boolean;
}

export function Navbar({ serverAuth }: { serverAuth?: NavbarServerAuth } = {}) {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(serverAuth?.isLoggedIn ?? null);
  const [userName, setUserName] = useState(serverAuth?.userName ?? "");
  const [isAdmin, setIsAdmin] = useState(serverAuth?.isAdmin ?? false);

  const handleLogoClick = useCallback((e: React.MouseEvent) => {
    if (pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [pathname]);

  const handleNavClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("/#") && pathname === "/") {
      e.preventDefault();
      const id = href.replace("/#", "");
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
  }, [pathname]);

  useEffect(() => {
    const extractSession = (session: import("@supabase/supabase-js").Session | null) => {
      setIsLoggedIn(!!session);
      setUserName(session?.user?.user_metadata?.display_name || session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || "");
      setIsAdmin(session?.user?.app_metadata?.role === "admin");
    };

    // 서버에서 인증 정보를 받지 않은 경우에만 클라이언트에서 세션 확인
    if (!serverAuth) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        extractSession(session);
      }).catch(() => {
        setIsLoggedIn(false);
      });
    }

    // 인증 상태 변경 구독 (로그인/로그아웃 시 즉시 반영)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        extractSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, [serverAuth]);

  // 초기 상태 확인 전: 최소한의 레이아웃 유지 (깜빡임 방지)
  const navItems = isLoggedIn ? (isAdmin ? [...appNav, ...adminOnlyNav] : appNav) : publicNav;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#12121F]">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* 로고 */}
        <Link
          href="/"
          onClick={handleLogoClick}
          className="flex items-baseline gap-1.5"
        >
          <span className="text-[22px] font-extrabold tracking-tight text-white">
            소리<span className="text-primary-400">담</span>
          </span>
          <span className="text-[11px] font-bold tracking-wide text-white/70">
            OPIc
          </span>
        </Link>

        {/* 데스크톱 네비게이션 */}
        <div className="hidden items-center gap-1 md:flex">
          {navItems.map((item, idx) => {
            const isActive = item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
            return (
              <div key={item.label} className="flex items-center">
                {["/reviews", "/patterns", "/support"].includes(item.href) && (
                  <div className="mx-1 h-4 w-px bg-white/20" />
                )}
                <Link
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                  className={`relative rounded-[var(--radius-md)] px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "font-bold text-primary-300"
                      : "font-medium text-white/70 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  {item.label}
                  {item.soon && (
                    <span className="absolute -right-1 -top-1 rounded-full bg-primary-100 px-1 text-[8px] font-semibold text-primary-600">
                      곧
                    </span>
                  )}
                </Link>
              </div>
            );
          })}
        </div>

        {/* 우측: 인증 버튼 + 모바일 메뉴 */}
        <div className="flex items-center gap-2">
          {isLoggedIn === null ? (
            // 세션 확인 전: 빈 공간 (깜빡임 최소화)
            <div className="h-8 w-8" />
          ) : isLoggedIn ? (
            <UserMenu name={userName} isAdmin={isAdmin} />
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="inline-flex h-8 items-center justify-center rounded-[var(--radius-md)] px-3 text-sm font-medium transition-colors text-gray-300 hover:bg-white/10"
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="inline-flex h-8 items-center justify-center rounded-[var(--radius-md)] bg-primary-500 px-3 text-sm font-medium text-white transition-colors hover:bg-primary-600"
              >
                무료 시작
              </Link>
            </div>
          )}

          {/* 모바일 햄버거 */}
          {isLoggedIn !== null && (
            <MobileNav isLoggedIn={isLoggedIn} items={navItems} userName={userName} isAdmin={isAdmin} />
          )}
        </div>
      </nav>
    </header>
  );
}
