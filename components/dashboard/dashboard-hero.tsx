import Link from "next/link";
import { Target, ArrowRight, CalendarDays } from "lucide-react";

// OPIc 등급 순서 (진척 바 위치 계산용)
const GRADE_ORDER = ["NH", "IL", "IM1", "IM2", "IM3", "IH", "AL"];

function getDday(dateStr: string): { label: string; tone: "near" | "far" | "over" } | null {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff > 0) return { label: `D-${diff}`, tone: diff <= 14 ? "near" : "far" };
  if (diff === 0) return { label: "D-Day", tone: "near" };
  return { label: `D+${Math.abs(diff)}`, tone: "over" };
}

export function DashboardHero({
  userName,
  currentGrade,
  targetGrade,
  examDate,
}: {
  userName: string;
  currentGrade: string;
  targetGrade: string;
  examDate: string;
}) {
  const hasGoal = !!targetGrade;
  const dday = getDday(examDate);

  const curIdx = GRADE_ORDER.indexOf(currentGrade);
  const tgtIdx = GRADE_ORDER.indexOf(targetGrade);
  // 현재→목표 진척률 (현재가 등급 외/미응시면 0)
  const pct =
    hasGoal && tgtIdx > 0
      ? Math.max(0, Math.min(100, (Math.max(curIdx, 0) / tgtIdx) * 100))
      : 0;

  return (
    <section className="overflow-hidden rounded-[var(--radius-xl)] bg-gradient-to-br from-[#12121F] via-[#15152A] to-[#1A1A2E] p-6 text-white shadow-[0_8px_30px_rgba(18,18,31,0.25)] sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-white/50 sm:text-sm">대시보드</p>
          <h1 className="mt-1 text-2xl font-bold leading-tight sm:text-3xl">
            {userName ? `${userName}님, ` : ""}오늘도 한 걸음 나아가요
          </h1>
          <p className="mt-1.5 text-sm text-white/60">
            {hasGoal
              ? "목표 등급까지의 거리를 확인하고 오늘의 훈련을 시작하세요."
              : "목표 등급을 설정하면 진척도를 한눈에 볼 수 있어요."}
          </p>
        </div>

        {dday && (
          <div
            className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-bold ${
              dday.tone === "near"
                ? "bg-accent-500/20 text-accent-200"
                : dday.tone === "over"
                  ? "bg-white/10 text-white/60"
                  : "bg-white/10 text-white"
            }`}
          >
            <CalendarDays size={15} />
            시험까지 {dday.label}
          </div>
        )}
      </div>

      {hasGoal ? (
        <div className="mt-6">
          <div className="mb-2 flex items-end justify-between">
            <span className="text-xs text-white/60">
              현재 <span className="text-base font-bold text-white">{currentGrade || "—"}</span>
            </span>
            <span className="text-xs text-white/60">
              목표 <span className="text-base font-bold text-accent-300">{targetGrade}</span>
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-400 to-accent-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      ) : (
        <Link
          href="/mypage?tab=goal"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-600"
        >
          <Target size={16} />
          목표 등급 설정하기
          <ArrowRight size={15} />
        </Link>
      )}
    </section>
  );
}
