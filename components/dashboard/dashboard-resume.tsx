import Link from "next/link";
import { Play, ArrowRight, Mic, FileText, Headphones } from "lucide-react";
import type { DashboardLearning } from "@/lib/actions/dashboard";

// 사용자 상태에 따라 '다음 한 걸음'을 1개만 제시
function pickNext(d: DashboardLearning): {
  title: string;
  sub: string;
  cta: string;
  href: string;
  icon: React.ElementType;
} {
  if (d.activeMock) {
    return {
      title: "진행 중인 모의고사가 있어요",
      sub: `${d.activeMock.current_question}번 문항까지 진행 · 이어서 응시하세요`,
      cta: "이어풀기",
      href: "/mock-exam",
      icon: Mic,
    };
  }
  if (d.totalScripts === 0) {
    return {
      title: "첫 스크립트를 만들어보세요",
      sub: "내 경험으로 만드는 맞춤 영어 답변이 학습의 시작이에요",
      cta: "시작하기",
      href: "/scripts",
      icon: FileText,
    };
  }
  if (d.mockExamCount === 0) {
    return {
      title: "첫 모의고사에 도전해보세요",
      sub: "실전 환경에서 응시하고 예상 등급과 피드백을 받아보세요",
      cta: "응시하기",
      href: "/mock-exam",
      icon: Mic,
    };
  }
  return {
    title: "오늘의 쉐도잉으로 체화하기",
    sub: "만든 스크립트를 원어민 발화로 따라하며 입에 붙이세요",
    cta: "훈련하기",
    href: "/scripts?tab=shadowing",
    icon: Headphones,
  };
}

export function DashboardResume({ data }: { data: DashboardLearning }) {
  const next = pickNext(data);
  return (
    <Link
      href={next.href}
      className="group flex items-center gap-4 overflow-hidden rounded-[var(--radius-xl)] border border-border border-l-4 border-l-accent-500 bg-surface p-4 shadow-[var(--shadow-card)] transition-all hover:shadow-[var(--shadow-card-hover)] sm:p-5"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-500">
        <next.icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-accent-500">지금 이어서</p>
        <p className="mt-0.5 truncate text-sm font-bold text-foreground sm:text-base">{next.title}</p>
        <p className="truncate text-xs text-foreground-secondary">{next.sub}</p>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition-colors group-hover:bg-primary-600">
        <Play size={14} />
        <span className="hidden sm:inline">{next.cta}</span>
        <ArrowRight size={15} />
      </span>
    </Link>
  );
}
