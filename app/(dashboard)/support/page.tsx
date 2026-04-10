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
      getFeedbackPosts({ sort: "latest", page: 1, limit: 20 }),
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
    <div>
      {/* 탭 스켈레톤 */}
      <div className="mb-4 flex gap-1 rounded-xl bg-surface-secondary p-1 sm:mb-6">
        {["공지사항", "피드백 보드", "1:1 문의"].map((label) => (
          <div
            key={label}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs font-medium text-foreground-muted sm:gap-2 sm:px-3 sm:text-sm"
          >
            <div className="h-4 w-4 rounded bg-foreground-muted/20" />
            <span>{label}</span>
          </div>
        ))}
      </div>
      {/* 콘텐츠 스켈레톤 */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl border border-border bg-surface"
          />
        ))}
      </div>
    </div>
  );
}

export default function SupportPage() {
  return (
    <div className="pb-6 pt-1 sm:pb-8 sm:pt-2 lg:pt-0">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">
          소통함
        </h1>
        <p className="mt-0.5 text-sm text-foreground-secondary sm:mt-1 sm:text-base">
          소리담과 소통하는 공간입니다. 피드백, 건의, 문의를 남겨주세요.
        </p>
      </div>
      <Suspense fallback={<SupportPlaceholder />}>
        <SupportDataLoader />
      </Suspense>
    </div>
  );
}
