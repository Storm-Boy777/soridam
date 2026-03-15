import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { MyPageContent } from "@/components/mypage/mypage-content";

export const metadata = {
  title: "마이페이지 | 오픽톡닥",
};

// 비동기 서버 컴포넌트: 유저 데이터를 가져와 콘텐츠에 전달
async function MyPageDataLoader() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const userData = {
    id: user.id,
    email: user.email || "",
    name: user.user_metadata?.display_name || user.user_metadata?.full_name || user.user_metadata?.name || "",
    avatarUrl: user.user_metadata?.avatar_url || "",
    provider: user.app_metadata?.provider || "email",
    createdAt: user.created_at,
    currentGrade: user.user_metadata?.current_grade || "",
    targetGrade: user.user_metadata?.target_grade || "",
    examDate: user.user_metadata?.exam_date || "",
  };

  return <MyPageContent user={userData} />;
}

export default function MyPage() {
  return (
    <div className="pb-8 pt-2 lg:pt-0">
      {/* 페이지 헤더 — 즉시 렌더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">마이페이지</h1>
        <p className="mt-1 text-foreground-secondary">
          계정과 플랜을 관리하세요.
        </p>
      </div>
      {/* 콘텐츠 — 데이터 로드 후 스트리밍 */}
      <Suspense fallback={
        <div className="space-y-4">
          <div className="h-[200px] rounded-[var(--radius-xl)] border border-border bg-surface" />
          <div className="h-[300px] rounded-[var(--radius-xl)] border border-border bg-surface" />
        </div>
      }>
        <MyPageDataLoader />
      </Suspense>
    </div>
  );
}
