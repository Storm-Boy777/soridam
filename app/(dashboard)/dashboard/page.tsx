import { Suspense } from "react";
import Link from "next/link";
import {
  BarChart3,
  FileText,
  ClipboardList,
  MessageCircle,
  ArrowRight,
  TrendingUp,
  Target,
} from "lucide-react";
import { getAuthClaims } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";

export const metadata = {
  title: "대시보드 | 오픽톡닥",
};

/* ── 유틸 ── */

function getDday(dateStr: string | null) {
  if (!dateStr) return null;
  const diff = Math.ceil(
    (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (diff > 0) return `D-${diff}`;
  if (diff === 0) return "D-Day";
  return `D+${Math.abs(diff)}`;
}

/* ── 정적 데이터 ── */

const modules = [
  {
    icon: BarChart3,
    iconBg: "bg-primary-50 text-primary-500",
    title: "시험후기",
    desc: "출제 빈도 분석 · 후기 제출 · 시험 후기 열람",
    href: "/reviews",
  },
  {
    icon: FileText,
    iconBg: "bg-secondary-50 text-secondary-600",
    title: "스크립트",
    desc: "맞춤 스크립트 생성 · 내 스크립트 관리 · 쉐도잉 훈련",
    href: "/scripts",
  },
  {
    icon: ClipboardList,
    iconBg: "bg-accent-50 text-accent-500",
    title: "모의고사",
    desc: "실전 모의고사 응시 · 평가 리포트 · 나의 이력",
    href: "/mock-exam",
  },
  {
    icon: MessageCircle,
    iconBg: "bg-primary-50 text-primary-500",
    title: "튜터링",
    desc: "자동 진단 · 맞춤 처방 · 레벨별 훈련",
    href: "/tutoring",
  },
];

const learningSteps = [
  {
    step: 1,
    title: "시험 후기 확인",
    desc: "어떤 주제가 자주 나오는지 빈도 분석을 확인합니다",
    module: "시험후기",
  },
  {
    step: 2,
    title: "맞춤 스크립트 생성",
    desc: "빈출 주제로 내 경험 기반 영어 답변을 만듭니다",
    module: "스크립트",
  },
  {
    step: 3,
    title: "쉐도잉으로 체화",
    desc: "생성한 스크립트를 원어민 발화로 따라하며 입에 붙입니다",
    module: "스크립트",
  },
  {
    step: 4,
    title: "실전 모의고사",
    desc: "실제 시험 환경에서 15문제를 풀고 FACT 영역별 평가를 받습니다",
    module: "모의고사",
  },
  {
    step: 5,
    title: "튜터링",
    desc: "모의고사 결과를 진단하고 약점을 집중 훈련합니다",
    module: "튜터링",
  },
];

/* ── 사이드 패널 (JWT claims만 읽음, DB 쿼리 없음) ── */

interface ClaimsMetadata {
  target_grade?: string;
  current_grade?: string;
  exam_date?: string;
}

function SidePanel({ claims }: { claims: { user_metadata?: ClaimsMetadata } | null }) {
  const targetGrade = claims?.user_metadata?.target_grade || "";
  const currentGrade = claims?.user_metadata?.current_grade || "";
  const examDate = claims?.user_metadata?.exam_date || "";
  const dDay = getDday(examDate || null);

  return (
    <div className="space-y-3 sm:space-y-4 md:col-span-2">
      {/* 목표 등급 요약 */}
      {(targetGrade || currentGrade) ? (
        <div className="rounded-[var(--radius-xl)] border border-primary-200 bg-primary-50/50 p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Target size={18} className="text-primary-500" />
            <p className="font-semibold text-foreground">나의 목표</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {currentGrade && (
              <div className="rounded-[var(--radius-lg)] bg-white p-3 text-center">
                <p className="text-xs text-foreground-muted">현재</p>
                <p className="mt-0.5 text-lg font-bold text-foreground">
                  {currentGrade}
                </p>
              </div>
            )}
            {targetGrade && (
              <div className="rounded-[var(--radius-lg)] bg-white p-3 text-center">
                <p className="text-xs text-foreground-muted">목표</p>
                <p className="mt-0.5 text-lg font-bold text-primary-600">
                  {targetGrade}
                </p>
              </div>
            )}
          </div>
          {dDay && (
            <p className="mt-3 text-center text-sm font-semibold text-primary-600">
              시험까지 {dDay}
            </p>
          )}
        </div>
      ) : (
        <Link
          href="/mypage"
          className="block rounded-[var(--radius-xl)] border border-border bg-surface p-4 transition-all hover:border-border-hover hover:shadow-[var(--shadow-card)] sm:p-5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-secondary-50 text-secondary-600">
              <Target size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                목표 등급 설정하기
              </p>
              <p className="text-xs text-foreground-secondary">
                마이페이지에서 목표를 설정하세요
              </p>
            </div>
            <ArrowRight
              size={14}
              className="ml-auto text-foreground-muted"
            />
          </div>
        </Link>
      )}

      {/* 전략 가이드 */}
      <div className="rounded-[var(--radius-xl)] border border-foreground/10 bg-foreground p-4 sm:p-5">
        <p className="text-sm font-semibold text-white">
          OPIc 전략, 정확히 알고 계신가요?
        </p>
        <p className="mt-0.5 text-xs text-white/60 sm:mt-1">
          데이터로 증명된 서베이 전략과 난이도 전략을 확인하세요.
        </p>
        <div className="mt-3 flex gap-3">
          <Link
            href="/strategy"
            className="flex flex-1 items-center justify-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/90"
          >
            전략 가이드
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Store CTA */}
      <div className="rounded-[var(--radius-xl)] border border-primary-200 bg-gradient-to-br from-primary-50 to-primary-100/50 p-4 sm:p-5">
        <p className="text-sm font-semibold text-primary-700">
          더 많은 학습이 필요하신가요?
        </p>
        <p className="mt-0.5 text-xs text-primary-600/80 sm:mt-1">
          베이직 플랜으로 업그레이드하면 실전 모의고사 3회 + 스크립트 15회를
          이용할 수 있어요.
        </p>
        <div className="mt-3 flex gap-3">
          <Link
            href="/store"
            className="flex flex-1 items-center justify-center gap-1 rounded-full bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
          >
            Store
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── 서버 사전 조회 ── */

async function DashboardStatsLoader({ userId }: { userId: string }) {
  const supabase = await createServerSupabaseClient();
  const { data: credits } = await supabase
    .from("user_credits")
    .select("*")
    .eq("user_id", userId)
    .single();

  return <DashboardStats userId={userId} initialCredits={credits ?? undefined} />;
}

/* ── 페이지 ── */

export default async function DashboardPage() {
  const claims = await getAuthClaims();
  const userId = claims?.sub as string | undefined;

  return (
    <div className="space-y-6 pb-6 pt-1 sm:space-y-8 sm:pb-8 sm:pt-2 lg:pt-0">
      {/* 헤더 — 즉시 렌더 */}
      <div>
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">대시보드</h1>
        <p className="mt-0.5 text-sm text-foreground-secondary sm:mt-1 sm:text-base">
          오픽톡닥과 함께 OPIc 목표 등급을 달성해 보세요.
        </p>
      </div>

      {/* 통계 카드 — 서버 사전 조회 + Suspense */}
      {userId ? (
        <Suspense
          fallback={
            <div className="grid gap-3 grid-cols-2 sm:gap-4 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-[100px] animate-pulse rounded-[var(--radius-xl)] border border-border bg-surface p-3.5 sm:h-[118px] sm:p-5"
                />
              ))}
            </div>
          }
        >
          <DashboardStatsLoader userId={userId} />
        </Suspense>
      ) : (
        <div className="grid gap-3 grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-[100px] rounded-[var(--radius-xl)] border border-border bg-surface p-3.5 sm:h-[118px] sm:p-5"
            />
          ))}
        </div>
      )}

      {/* 모듈 바로가기 — 즉시 렌더 */}
      <div>
        <h2 className="mb-3 text-base font-bold text-foreground sm:mb-4 sm:text-lg">
          학습 모듈
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          {modules.map((m) => (
            <Link
              key={m.title}
              href={m.href}
              className="group relative flex items-start gap-3 rounded-[var(--radius-xl)] border border-border bg-surface p-4 transition-all hover:border-border-hover hover:shadow-[var(--shadow-card)] sm:gap-4 sm:p-5"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-lg)] sm:h-11 sm:w-11 ${m.iconBg}`}
              >
                <m.icon size={20} className="sm:hidden" />
                <m.icon size={22} className="hidden sm:block" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-foreground sm:text-base">{m.title}</h3>
                <p className="mt-0.5 text-xs text-foreground-secondary sm:mt-1 sm:text-sm">
                  {m.desc}
                </p>
              </div>
              <ArrowRight
                size={16}
                className="mt-1 shrink-0 text-foreground-muted transition-transform group-hover:translate-x-1 group-hover:text-primary-500"
              />
            </Link>
          ))}
        </div>
      </div>

      {/* 학습 로드맵 + 사이드 패널 */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-5">
        {/* 학습 로드맵 — 즉시 렌더 */}
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 sm:p-6 md:col-span-3">
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground sm:text-lg">
            <TrendingUp size={20} className="text-primary-500" />
            학습 로드맵
          </h2>
          <p className="mt-0.5 text-xs text-foreground-secondary sm:mt-1 sm:text-sm">
            5단계를 거쳐 OPIc 목표 등급을 달성합니다
          </p>
          <div className="mt-4 space-y-2.5 sm:mt-5 sm:space-y-3">
            {learningSteps.map((ls, i) => (
              <div key={ls.step} className="flex items-start gap-3 sm:gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-border bg-surface-secondary text-xs font-bold text-foreground-muted sm:h-8 sm:w-8 sm:text-sm">
                    {ls.step}
                  </div>
                  {i < learningSteps.length - 1 && (
                    <div className="mt-1 h-6 w-px bg-border" />
                  )}
                </div>
                <div className="pb-1">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <p className="text-sm font-semibold text-foreground sm:text-base">{ls.title}</p>
                    <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-[10px] font-medium text-foreground-muted">
                      {ls.module}
                    </span>
                  </div>
                  <p className="text-xs text-foreground-secondary sm:text-sm">{ls.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 사이드 패널 — JWT claims만 사용 (DB 쿼리 없음, 즉시 렌더) */}
        <SidePanel claims={claims} />
      </div>
    </div>
  );
}
