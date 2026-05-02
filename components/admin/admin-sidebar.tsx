"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getUnansweredInquiryCount } from "@/lib/actions/admin/support";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Heart,
  FileText,
  FileCheck,
  FileCode,
  ClipboardList,
  GraduationCap,
  Stethoscope,
  Megaphone,
  MessageCircle,
  Activity,
  Sparkles,
  ScrollText,
  ArrowLeft,
  Settings,
} from "lucide-react";

type MenuItem = { label: string; href: string; icon: React.ComponentType<{ size?: number }> };
type MenuGroup = { label?: string; items: MenuItem[] };

const menuGroups: MenuGroup[] = [
  {
    items: [
      { label: "대시보드", href: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    label: "사용자",
    items: [
      { label: "사용자 관리", href: "/admin/users", icon: Users },
      { label: "베타 관리", href: "/admin/beta", icon: Sparkles },
    ],
  },
  {
    label: "결제 & 후원",
    items: [
      { label: "AI 크레딧", href: "/admin/payments", icon: CreditCard },
      { label: "후원 관리", href: "/admin/sponsorships", icon: Heart },
    ],
  },
  {
    label: "학습 모듈",
    items: [
      { label: "모의고사", href: "/admin/mock-exam", icon: GraduationCap },
      { label: "스크립트", href: "/admin/scripts", icon: FileCode },
      { label: "튜터링", href: "/admin/tutoring", icon: Stethoscope },
      { label: "스터디", href: "/admin/study-group", icon: Users },
      { label: "오픽 스터디", href: "/admin/study-groups", icon: Users },
    ],
  },
  {
    label: "콘텐츠",
    items: [
      { label: "콘텐츠 관리", href: "/admin/content", icon: FileText },
      { label: "기출 입력", href: "/admin/import", icon: ClipboardList },
      { label: "기출 승인", href: "/admin/exam-approval", icon: FileCheck },
    ],
  },
  {
    label: "커뮤니티",
    items: [
      { label: "공지사항", href: "/admin/announcements", icon: Megaphone },
      { label: "소통함", href: "/admin/support", icon: MessageCircle },
    ],
  },
  {
    label: "시스템",
    items: [
      { label: "활동 로그", href: "/admin/activity", icon: Activity },
      { label: "감사 로그", href: "/admin/logs", icon: ScrollText },
      { label: "설정", href: "/admin/settings", icon: Settings },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  // 미답변 1:1 문의 건수
  const { data: unansweredCount } = useQuery({
    queryKey: ["admin-unanswered-inquiry"],
    queryFn: () => getUnansweredInquiryCount(),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  return (
    <aside className="hidden w-56 shrink-0 border-r border-white/10 bg-[#12121F] md:flex md:flex-col">
      <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
        <span className="font-display text-lg text-white">관리자</span>
        <Link
          href="/dashboard"
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-white/50 transition-colors hover:bg-white/10 hover:text-white/80"
        >
          <ArrowLeft size={12} />
          나가기
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {menuGroups.map((group, gi) => (
          <div key={gi}>
            {/* 구분선 (첫 그룹 제외) */}
            {gi > 0 && <div className="mx-2 my-1.5 border-t border-white/8" />}

            {/* 그룹 라벨 */}
            {group.label && (
              <p className="mb-0.5 px-3 pt-1 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                {group.label}
              </p>
            )}

            {/* 메뉴 항목 */}
            {group.items.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-white/15 text-white"
                      : "text-white/60 hover:bg-white/10 hover:text-white/90"
                  }`}
                >
                  <item.icon size={16} />
                  {item.label}
                  {item.href === "/admin/support" && unansweredCount ? (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                      {unansweredCount}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
