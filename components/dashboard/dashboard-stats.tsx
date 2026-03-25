"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase";
import { Crown, ClipboardList, BookOpen, Calendar } from "lucide-react";

/* ── 유틸 ── */

function getPlanLabel(plan: string) {
  if (plan === "standard") return "실전";
  if (plan === "allinone") return "올인원";
  return "체험";
}

function getPlanSub(plan: string) {
  if (plan === "standard") return "3회권";
  if (plan === "allinone") return "10회권";
  return "무료";
}

/* ── 크레딧 fetch 함수 ── */

async function fetchUserCredits(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_credits")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) throw error;
  return data;
}

/* ── 플레이스홀더 ── */

function StatsPlaceholder() {
  return (
    <div className="grid gap-3 grid-cols-2 sm:gap-4 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-[100px] rounded-[var(--radius-xl)] border border-border bg-surface p-3.5 sm:h-[118px] sm:p-5"
        />
      ))}
    </div>
  );
}

/* ── 메인 컴포넌트 ── */

export function DashboardStats({
  userId,
  initialCredits,
}: {
  userId: string;
  initialCredits?: Record<string, unknown>;
}) {
  const { data: credits, isLoading, isError } = useQuery({
    queryKey: ["user-credits", userId],
    queryFn: () => fetchUserCredits(userId),
    initialData: initialCredits,
    staleTime: 5 * 60 * 1000, // 5분
    retry: 2,
  });

  if (isLoading && !credits) return <StatsPlaceholder />;
  if (isError && !credits) return <StatsPlaceholder />;

  const plan = credits?.current_plan || "free";
  const totalMockExam =
    Number(credits?.plan_mock_exam_credits || 0) +
    Number(credits?.mock_exam_credits || 0);
  const totalScript =
    Number(credits?.plan_script_credits || 0) + Number(credits?.script_credits || 0);

  const stats = [
    {
      label: "현재 플랜",
      value: getPlanLabel(plan),
      sub: getPlanSub(plan),
      icon: Crown,
      color: "bg-primary-50 text-primary-500",
      href: "/store",
    },
    {
      label: "남은 모의고사",
      value: `${totalMockExam}회`,
      sub:
        totalMockExam === 0
          ? "크레딧 없음"
          : plan === "free"
            ? "샘플"
            : "사용 가능",
      icon: ClipboardList,
      color: "bg-secondary-50 text-secondary-600",
      href: null,
    },
    {
      label: "스크립트 생성",
      value: totalScript === 0 ? "0회" : `${totalScript}회`,
      sub: plan === "free" ? "크레딧 구매 필요" : "사용 가능",
      icon: BookOpen,
      color: "bg-accent-50 text-accent-500",
      href: null,
    },
    {
      label: "남은 튜터링",
      value: `${Number(credits?.plan_tutoring_credits || 0) + Number(credits?.tutoring_credits || 0)}회`,
      sub:
        Number(credits?.plan_tutoring_credits || 0) + Number(credits?.tutoring_credits || 0) === 0
          ? "크레딧 없음"
          : "사용 가능",
      icon: Calendar,
      color: "bg-primary-50 text-primary-500",
      href: "/tutoring",
    },
  ];

  return (
    <div className="grid gap-3 grid-cols-2 sm:gap-4 lg:grid-cols-4">
      {stats.map((s) => {
        const inner = (
          <div className="flex flex-col items-center text-center">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] sm:h-10 sm:w-10 ${s.color}`}
            >
              <s.icon size={18} className="sm:hidden" />
              <s.icon size={20} className="hidden sm:block" />
            </div>
            <p className="mt-2 text-xs text-foreground-secondary sm:mt-2.5 sm:text-sm">{s.label}</p>
            <p className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
              {s.value}
            </p>
            <p className="mt-0.5 text-xs text-foreground-muted">{s.sub}</p>
          </div>
        );

        return s.href ? (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-[var(--radius-xl)] border border-border bg-surface p-3.5 transition-all hover:border-border-hover hover:shadow-[var(--shadow-card)] sm:p-5"
          >
            {inner}
          </Link>
        ) : (
          <div
            key={s.label}
            className="rounded-[var(--radius-xl)] border border-border bg-surface p-3.5 sm:p-5"
          >
            {inner}
          </div>
        );
      })}
    </div>
  );
}
