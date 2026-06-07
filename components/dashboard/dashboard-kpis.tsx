import Link from "next/link";
import { FileText, Headphones, ClipboardCheck, Award } from "lucide-react";
import type { DashboardLearning } from "@/lib/actions/dashboard";

export function DashboardKpis({ data }: { data: DashboardLearning }) {
  const cards = [
    {
      label: "확정 스크립트",
      value: String(data.confirmedScripts),
      sub: `총 ${data.totalScripts}개`,
      icon: FileText,
      accent: false,
      href: "/scripts",
    },
    {
      label: "쉐도잉 훈련",
      value: String(data.totalShadowings),
      sub: "누적 횟수",
      icon: Headphones,
      accent: false,
      href: "/scripts?tab=shadowing",
    },
    {
      label: "모의고사 응시",
      value: String(data.mockExamCount),
      sub: "완료 회차",
      icon: ClipboardCheck,
      accent: false,
      href: "/mock-exam",
    },
    {
      label: "최근 모의고사 등급",
      value: data.latestMockLevel || "—",
      sub: data.latestMockLevel ? "예상 등급" : "응시 전",
      icon: Award,
      accent: true,
      href: "/mock-exam",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {cards.map((c) => (
        <Link
          key={c.label}
          href={c.href}
          className="group flex flex-col items-center rounded-[var(--radius-xl)] border border-border bg-surface px-3 py-5 text-center shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]"
        >
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
              c.accent
                ? "bg-accent-50 text-accent-500 group-hover:bg-accent-100"
                : "bg-primary-50 text-primary-500 group-hover:bg-primary-100"
            }`}
          >
            <c.icon size={19} strokeWidth={1.75} />
          </div>
          <p
            className={`mt-3 text-3xl font-bold leading-none ${
              c.accent ? "text-accent-500" : "text-foreground"
            }`}
          >
            {c.value}
          </p>
          <p className="mt-2 text-xs font-medium text-foreground-secondary">{c.label}</p>
          <p className="mt-0.5 text-[11px] text-foreground-muted">{c.sub}</p>
        </Link>
      ))}
    </div>
  );
}
