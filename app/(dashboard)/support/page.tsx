import { Suspense } from "react";
import { SupportContent } from "@/components/support/support-content";
import { getAllAnnouncements, getFeedbackPosts, getMyInquiries } from "@/lib/actions/support";
import { getUser } from "@/lib/auth";

export const metadata = {
  title: "소통함",
};

async function SupportDataLoader() {
  const user = await getUser();

  // 공지사항 + 피드백 목록 병렬 조회 (문의는 로그인 시만)
  const [announcementsResult, feedbackResult, inquiriesResult] =
    await Promise.all([
      getAllAnnouncements(),
      getFeedbackPosts({ sort: "latest", page: 1, limit: 5 }),
      user ? getMyInquiries() : Promise.resolve({ data: [] }),
    ]);

  return (
    <SupportContent
      initialAnnouncements={announcementsResult.data || []}
      initialFeedback={feedbackResult.data || { posts: [], total: 0 }}
      initialInquiries={inquiriesResult.data || []}
      isLoggedIn={!!user}
      userId={user?.id || null}
    />
  );
}

function SupportPlaceholder() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-surface-secondary" />
      <div className="h-5 w-80 animate-pulse rounded-lg bg-surface-secondary/60" />
      <div className="flex gap-2 pt-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 w-24 animate-pulse rounded-full bg-surface-secondary/50" />
        ))}
      </div>
      <div className="space-y-3 pt-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface-secondary/30" />
        ))}
      </div>
    </div>
  );
}

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-16 pt-6 sm:px-6 sm:pt-10 md:px-8">
      {/* 따뜻한 인사 헤더 — "부담 없는 온기" 철학 */}
      <header className="mb-6 sm:mb-8">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">
          소리담 소통함
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-foreground-secondary sm:text-base">
          사용하시며 느낀 작은 불편함도, 소소한 성장의 기쁨도 모두 좋습니다.
          <br className="hidden sm:block" />
          소리담은 여러분의 이야기로 자라납니다.
        </p>
      </header>

      <Suspense fallback={<SupportPlaceholder />}>
        <SupportDataLoader />
      </Suspense>
    </div>
  );
}
