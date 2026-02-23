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
    desc: "실전 모의고사 응시 · AI 평가 리포트 · 나의 이력",
    href: "/mock-exam",
  },
  {
    icon: MessageCircle,
    iconBg: "bg-primary-50 text-primary-500",
    title: "튜터링",
    desc: "AI 진단 · 맞춤 처방 · 레벨별 훈련",
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
    desc: "실제 시험 환경에서 15문제를 풀고 AI가 평가합니다",
    module: "모의고사",
  },
  {
    step: 5,
    title: "AI 튜터링",
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
    <div className="space-y-4 md:col-span-2">
      {/* 목표 등급 요약 */}
      {(targetGrade || currentGrade) ? (
        <div className="rounded-[var(--radius-xl)] border border-primary-200 bg-primary-50/50 p-5">
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
          className="block rounded-[var(--radius-xl)] border border-border bg-surface p-5 transition-all hover:border-border-hover hover:shadow-[var(--shadow-card)]"
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
      <div className="rounded-[var(--radius-xl)] border border-foreground/10 bg-foreground p-5">
        <p className="text-sm font-semibold text-white">
          OPIc 전략, 정확히 알고 계신가요?
        </p>
        <p className="mt-1 text-xs text-white/60">
          데이터로 증명된 서베이 전략과 난이도 전략을 확인하세요.
        </p>
        <Link
          href="/strategy"
          className="mt-3 inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/90"
        >
          전략 가이드
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* Store CTA */}
      <div className="rounded-[var(--radius-xl)] border border-primary-200 bg-gradient-to-br from-primary-50 to-primary-100/50 p-5">
        <p className="text-sm font-semibold text-primary-700">
          더 많은 학습이 필요하신가요?
        </p>
        <p className="mt-1 text-xs text-primary-600/80">
          베이직 플랜으로 업그레이드하면 실전 모의고사 3회 + 스크립트 30회를
          이용할 수 있어요.
        </p>
        <Link
          href="/store"
          className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
        >
          Store
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

/* ── 페이지 ── */

export default async function DashboardPage() {
  const claims = await getAuthClaims();
  const userId = claims?.sub as string | undefined;

  return (
    <div className="space-y-8 pb-8 pt-2 lg:pt-0">
      {/* 헤더 — 즉시 렌더 */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">대시보드</h1>
        <p className="mt-1 text-foreground-secondary">
          오픽톡닥과 함께 OPIc 목표 등급을 달성해 보세요.
        </p>
      </div>

      {/* 통계 카드 — 클라이언트 캐시 (useQuery, staleTime: 5분) */}
      {userId ? (
        <DashboardStats userId={userId} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-[118px] rounded-[var(--radius-xl)] border border-border bg-surface p-5"
            />
          ))}
        </div>
      )}

      {/* 모듈 바로가기 — 즉시 렌더 */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-foreground">
          학습 모듈
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {modules.map((m) => (
            <Link
              key={m.title}
              href={m.href}
              className="group relative flex items-start gap-4 rounded-[var(--radius-xl)] border border-border bg-surface p-5 transition-all hover:border-border-hover hover:shadow-[var(--shadow-card)]"
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-lg)] ${m.iconBg}`}
              >
                <m.icon size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-foreground">{m.title}</h3>
                <p className="mt-1 text-sm text-foreground-secondary">
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
      <div className="grid gap-6 md:grid-cols-5">
        {/* 학습 로드맵 — 즉시 렌더 */}
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6 md:col-span-3">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <TrendingUp size={20} className="text-primary-500" />
            학습 로드맵
          </h2>
          <p className="mt-1 text-sm text-foreground-secondary">
            5단계를 거쳐 OPIc 목표 등급을 달성합니다
          </p>
          <div className="mt-5 space-y-3">
            {learningSteps.map((ls, i) => (
              <div key={ls.step} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-border bg-surface-secondary text-sm font-bold text-foreground-muted">
                    {ls.step}
                  </div>
                  {i < learningSteps.length - 1 && (
                    <div className="mt-1 h-6 w-px bg-border" />
                  )}
                </div>
                <div className="pb-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">{ls.title}</p>
                    <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-[10px] font-medium text-foreground-muted">
                      {ls.module}
                    </span>
                  </div>
                  <p className="text-sm text-foreground-secondary">{ls.desc}</p>
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
