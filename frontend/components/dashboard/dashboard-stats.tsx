"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase";
import { Crown, ClipboardList, BookOpen, Calendar } from "lucide-react";

/* ── 유틸 ── */

function getPlanLabel(plan: string) {
  if (plan === "basic") return "베이직";
  if (plan === "premium") return "프리미엄";
  return "체험";
}

function getPlanSub(plan: string) {
  if (plan === "basic") return "3회권";
  if (plan === "premium") return "10회권";
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-[118px] rounded-[var(--radius-xl)] border border-border bg-surface p-5"
        />
      ))}
    </div>
  );
}

/* ── 메인 컴포넌트 ── */

export function DashboardStats({ userId }: { userId: string }) {
  const { data: credits, isLoading } = useQuery({
    queryKey: ["user-credits", userId],
    queryFn: () => fetchUserCredits(userId),
    staleTime: 5 * 60 * 1000, // 5분
  });

  if (isLoading && !credits) return <StatsPlaceholder />;

  const plan = credits?.current_plan || "free";
  const totalMockExam =
    (credits?.plan_mock_exam_credits || 0) +
    (credits?.mock_exam_credits || 0);
  const totalScript =
    (credits?.plan_script_credits || 0) + (credits?.script_credits || 0);

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
      label: "연속 학습",
      value: "0일",
      sub: "시작해 보세요!",
      icon: Calendar,
      color: "bg-primary-50 text-primary-500",
      href: null,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => {
        const inner = (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-foreground-secondary">{s.label}</p>
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] ${s.color}`}
              >
                <s.icon size={18} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-foreground">
              {s.value}
            </p>
            <p className="mt-0.5 text-xs text-foreground-muted">{s.sub}</p>
          </>
        );

        return s.href ? (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-[var(--radius-xl)] border border-border bg-surface p-5 transition-all hover:border-border-hover hover:shadow-[var(--shadow-card)]"
          >
            {inner}
          </Link>
        ) : (
          <div
            key={s.label}
            className="rounded-[var(--radius-xl)] border border-border bg-surface p-5"
          >
            {inner}
          </div>
        );
      })}
    </div>
  );
}
