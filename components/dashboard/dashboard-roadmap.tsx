import Link from "next/link";
import { Check } from "lucide-react";
import type { DashboardLearning } from "@/lib/actions/dashboard";

export function DashboardRoadmap({
  data,
  isAdmin,
}: {
  data: DashboardLearning;
  isAdmin: boolean;
}) {
  const steps = [
    {
      title: "시험 후기 확인",
      detail: "기출 빈도로 출제 주제 파악",
      done: data.totalScripts >= 1,
      href: "/reviews",
    },
    {
      title: "맞춤 스크립트 작성",
      detail: data.totalScripts > 0 ? `${data.totalScripts}개 작성 · ${data.confirmedScripts}개 확정` : "내 경험으로 답변 만들기",
      done: data.confirmedScripts >= 1,
      href: "/scripts",
    },
    {
      title: "쉐도잉으로 체화",
      detail: data.totalShadowings > 0 ? `${data.totalShadowings}회 훈련` : "원어민 발화 따라 말하기",
      done: data.totalShadowings >= 1,
      href: "/scripts?tab=shadowing",
    },
    {
      title: "실전 모의고사",
      detail: data.mockExamCount > 0 ? `${data.mockExamCount}회 응시` : "실전처럼 응시하고 평가받기",
      done: data.mockExamCount >= 1,
      href: "/mock-exam",
    },
    ...(isAdmin
      ? [{ title: "튜터링", detail: "약점 집중 훈련", done: false, href: "/tutoring" }]
      : []),
  ];

  // 첫 미완료 단계 = 현재 단계
  const currentIdx = steps.findIndex((s) => !s.done);

  return (
    <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
      <h2 className="text-base font-bold text-foreground sm:text-lg">학습 로드맵</h2>
      <p className="mt-0.5 text-xs text-foreground-secondary sm:text-sm">
        내 진척에 맞춰 다음 단계를 따라가 보세요
      </p>

      <div className="mt-4 space-y-1 sm:mt-5">
        {steps.map((s, i) => {
          const isCurrent = i === currentIdx;
          return (
            <Link
              key={s.title}
              href={s.href}
              className="group flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-surface-secondary/60 sm:gap-4"
            >
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                    s.done
                      ? "bg-primary-500 text-white"
                      : isCurrent
                        ? "border-2 border-accent-500 bg-accent-50 text-accent-600"
                        : "border-2 border-border bg-surface-secondary text-foreground-muted"
                  }`}
                >
                  {s.done ? <Check size={15} strokeWidth={3} /> : i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div className={`mt-1 h-6 w-px ${s.done ? "bg-primary-300" : "bg-border"}`} />
                )}
              </div>

              <div className="min-w-0 flex-1 pb-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className={`text-sm font-semibold sm:text-base ${s.done ? "text-foreground" : isCurrent ? "text-accent-600" : "text-foreground-secondary"}`}>
                    {s.title}
                  </p>
                  {isCurrent && (
                    <span className="rounded-full bg-accent-500 px-2 py-0.5 text-[10px] font-bold text-white">지금 여기</span>
                  )}
                </div>
                <p className="text-xs text-foreground-muted sm:text-sm">{s.detail}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
