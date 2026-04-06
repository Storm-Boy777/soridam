import { Suspense } from "react";
import { T } from "@/lib/constants/tables";
import { ReviewsContent } from "@/components/reviews/reviews-content";
import { getStatsAndFrequency, getMySubmissions, getPublicReviews, getSubmissionsWithQuestionsBatch } from "@/lib/actions/reviews";
import { getUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const metadata = {
  title: "시험후기",
};

// 비동기 서버 컴포넌트: 통계 + 내 제출 이력 + 완료 후기 상세를 병렬 조회하여 전달
async function ReviewsDataLoader() {
  // 1단계: 목록 데이터 + 유료 여부 병렬 조회
  const [{ stats, frequency }, submissionsResult, publicReviewsResult, isPaidUser] = await Promise.all([
    getStatsAndFrequency(),
    getMySubmissions(),
    getPublicReviews({ page: 1, limit: 10 }),
    // 유료 플랜 또는 admin 여부 확인 (빈도 분석 서브탭 잠금용)
    (async () => {
      try {
        const user = await getUser();
        if (!user) return false;
        // admin은 무조건 전체 접근
        if (user.app_metadata?.role === "admin") return true;
        const supabase = await createServerSupabaseClient();
        const { data } = await supabase
          .from(T.user_credits)
          .select("current_plan, plan_expires_at")
          .eq("user_id", user.id)
          .single();
        if (!data || !data.plan_expires_at) return false;
        return data.current_plan !== "free" && new Date(data.plan_expires_at) > new Date();
      } catch {
        return false;
      }
    })(),
  ]);

  const submissions = submissionsResult.data || [];

  // 2단계: 완료된 후기 상세를 단일 쿼리로 일괄 조회 (N+1 → 1 쿼리)
  const completeIds = submissions.filter(s => s.status === "complete").map(s => s.id);
  const submissionDetails = await getSubmissionsWithQuestionsBatch(completeIds);

  return (
    <ReviewsContent
      initialStats={stats}
      initialFrequency={frequency}
      initialSubmissions={submissions}
      initialPublicReviews={publicReviewsResult.data || { reviews: [], total: 0 }}
      initialSubmissionDetails={submissionDetails}
      isPaidUser={isPaidUser}
    />
  );
}

// Suspense Fallback: 카드형 세그먼트 탭 스켈레톤 (실제 레이아웃과 동일)
function ReviewsPlaceholder() {
  return (
    <div>
      {/* 탭 세그먼트 스켈레톤 */}
      <div className="mb-4 flex gap-1 rounded-xl bg-surface-secondary p-1 sm:mb-6">
        {["빈도 분석", "후기 제출", "시험 후기"].map((label) => (
          <div
            key={label}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs font-medium text-foreground-muted sm:gap-2 sm:px-3 sm:text-sm"
          >
            <div className="h-4 w-4 rounded bg-foreground-muted/20" />
            <span>{label}</span>
          </div>
        ))}
      </div>
      {/* 콘텐츠 영역 스켈레톤 */}
      <div className="space-y-4">
        <div className="h-[60px] animate-pulse rounded-[var(--radius-xl)] border border-border bg-surface" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[80px] animate-pulse rounded-[var(--radius-xl)] border border-border bg-surface"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ReviewsPage() {
  return (
    <div className="pb-6 pt-1 sm:pb-8 sm:pt-2 lg:pt-0">
      {/* 페이지 헤더 — 즉시 렌더 */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">시험후기</h1>
        <p className="mt-0.5 text-sm text-foreground-secondary sm:mt-1 sm:text-base">
          실제 시험 후기를 분석하여 출제 빈도를 파악하세요.
        </p>
      </div>
      {/* 탭 콘텐츠 — 데이터 로드 후 스트리밍 */}
      <Suspense fallback={<ReviewsPlaceholder />}>
        <ReviewsDataLoader />
      </Suspense>
    </div>
  );
}
