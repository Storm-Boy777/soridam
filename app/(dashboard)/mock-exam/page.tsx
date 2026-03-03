import { Suspense } from "react";
import { MockExamContent } from "@/components/mock-exam/mock-exam-content";
import { getHistory } from "@/lib/actions/mock-exam";

export const metadata = {
  title: "모의고사 | 오픽톡닥",
};

// 서버에서 이력 데이터 사전 조회
async function MockExamLoader() {
  const historyResult = await getHistory().catch(() => ({ data: undefined }));

  return (
    <MockExamContent
      initialHistory={historyResult?.data ?? undefined}
    />
  );
}

// 인증은 미들웨어에서 처리
export default function MockExamPage() {
  return (
    <div className="pb-8 pt-1 sm:pt-2 lg:pt-0">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">모의고사</h1>
        <p className="mt-0.5 text-sm text-foreground-secondary sm:mt-1 sm:text-base">
          실전과 동일한 환경에서 모의고사를 응시하고 상세 평가를 받으세요.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        }
      >
        <MockExamLoader />
      </Suspense>
    </div>
  );
}
