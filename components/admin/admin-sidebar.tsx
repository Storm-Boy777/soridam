"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  FileText,
  FileCheck,
  FileCode,
  ClipboardList,
  GraduationCap,
  Stethoscope,
  Megaphone,
  MessageCircle,
  Sparkles,
  ScrollText,
  ArrowLeft,
  Settings,
} from "lucide-react";

const menuItems = [
  { label: "대시보드", href: "/admin", icon: LayoutDashboard },
  { label: "베타 관리", href: "/admin/beta", icon: Sparkles },
  { label: "사용자 관리", href: "/admin/users", icon: Users },
  { label: "결제 관리", href: "/admin/payments", icon: CreditCard },
  { label: "콘텐츠 관리", href: "/admin/content", icon: FileText },
  { label: "기출 입력", href: "/admin/import", icon: ClipboardList },
  { label: "기출 승인", href: "/admin/exam-approval", icon: FileCheck },
  { label: "스크립트", href: "/admin/scripts", icon: FileCode },
  { label: "모의고사", href: "/admin/mock-exam", icon: GraduationCap },
  { label: "튜터링", href: "/admin/tutoring", icon: Stethoscope },
  { label: "공지사항", href: "/admin/announcements", icon: Megaphone },
  { label: "소통함", href: "/admin/support", icon: MessageCircle },
  { label: "감사 로그", href: "/admin/logs", icon: ScrollText },
  { label: "설정", href: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 border-r border-white/10 bg-foreground md:flex md:flex-col">
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
      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {menuItems.map((item) => {
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
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
