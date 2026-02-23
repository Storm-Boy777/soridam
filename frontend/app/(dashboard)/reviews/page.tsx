import { Suspense } from "react";
import { ReviewsContent } from "@/components/reviews/reviews-content";
import { getStatsAndFrequency } from "@/lib/actions/reviews";

export const metadata = {
  title: "시험후기 | 오픽톡닥",
};

// 비동기 서버 컴포넌트: 통계 데이터를 가져와 콘텐츠에 전달
async function ReviewsDataLoader() {
  const { stats, frequency } = await getStatsAndFrequency();
  return <ReviewsContent initialStats={stats} initialFrequency={frequency} />;
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
