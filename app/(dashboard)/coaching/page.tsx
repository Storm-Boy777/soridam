// 스피킹 코치 — 메인 허브
// 이어하기 배너 + 학습 진행 과정 안내 + 2탭(유형별/주제별)
// MVP: 묘사 유형만 활성, 나머지는 disabled

import { Suspense } from "react";
import { getTypeCards, getResumableSessions } from "@/lib/actions/coaching";
import { CoachingContent } from "@/components/coaching/coaching-content";

export const metadata = {
  title: "스피킹 코치 | 소리담",
  description: "일타강사 페르소나로 1:1 코칭",
};

async function CoachingLoader() {
  const [cardsResult, resumableResult] = await Promise.all([
    getTypeCards(),
    getResumableSessions(),
  ]);
  return (
    <CoachingContent
      initialTypeCards={cardsResult.data ?? []}
      initialResumable={resumableResult.data ?? []}
      initialError={cardsResult.error}
    />
  );
}

export default function CoachingPage() {
  return (
    <div className="pb-8 pt-1 sm:pt-2 lg:pt-0">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">스피킹 코치</h1>
        <p className="mt-0.5 text-sm text-foreground-secondary sm:mt-1 sm:text-base">
          답변 → 1:1 밀착 코칭 → 습관 교정. 어떤 유형부터 시작할지 선택하세요.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        }
      >
        <CoachingLoader />
      </Suspense>
    </div>
  );
}
