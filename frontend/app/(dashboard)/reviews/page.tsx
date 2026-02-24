import { Suspense } from "react";
import { ReviewsContent } from "@/components/reviews/reviews-content";
import { getStatsAndFrequency, getMySubmissions, getPublicReviews, getSubmissionWithQuestions } from "@/lib/actions/reviews";
import type { SubmissionWithQuestions } from "@/lib/types/reviews";

export const metadata = {
  title: "시험후기 | 오픽톡닥",
};

// 비동기 서버 컴포넌트: 통계 + 내 제출 이력 + 완료 후기 상세를 병렬 조회하여 전달
async function ReviewsDataLoader() {
  // 1단계: 목록 데이터 병렬 조회
  const [{ stats, frequency }, submissionsResult, publicReviewsResult] = await Promise.all([
    getStatsAndFrequency(),
    getMySubmissions(),
    getPublicReviews({ page: 1, limit: 10 }),
  ]);

  const submissions = submissionsResult.data || [];

  // 2단계: 완료된 후기 상세를 서버에서 직접 병렬 조회 (클라이언트 RTT 제거)
  const completeIds = submissions.filter(s => s.status === "complete").map(s => s.id);
  const detailResults = completeIds.length > 0
    ? await Promise.all(completeIds.map(id => getSubmissionWithQuestions(id)))
    : [];

  const submissionDetails: Record<number, SubmissionWithQuestions> = {};
  completeIds.forEach((id, i) => {
    if (detailResults[i].data) {
      submissionDetails[id] = detailResults[i].data!;
    }
  });

  return (
    <ReviewsContent
      initialStats={stats}
      initialFrequency={frequency}
      initialSubmissions={submissions}
      initialPublicReviews={publicReviewsResult.data || { reviews: [], total: 0 }}
      initialSubmissionDetails={submissionDetails}
    />
  );
}

// Suspense Fallback: 탭 구조 플레이스홀더
function ReviewsPlaceholder() {
  return (
    <div>
      {/* 탭 바 플레이스홀더 */}
      <div className="mb-6 border-b border-border">
        <div className="flex gap-2">
          {["빈도 분석", "후기 제출", "시험 후기"].map((label) => (
            <div
              key={label}
              className="border-b-2 border-transparent px-3 py-3 text-sm font-medium text-foreground-muted sm:px-4"
            >
              {label}
            </div>
          ))}
        </div>
      </div>
      {/* 콘텐츠 영역 플레이스홀더 */}
      <div className="space-y-4">
        <div className="h-[60px] rounded-[var(--radius-xl)] border border-border bg-surface" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[80px] rounded-[var(--radius-xl)] border border-border bg-surface"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ReviewsPage() {
  return (
    <div className="pb-8 pt-2 lg:pt-0">
      {/* 페이지 헤더 — 즉시 렌더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">시험후기</h1>
        <p className="mt-1 text-foreground-secondary">
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
