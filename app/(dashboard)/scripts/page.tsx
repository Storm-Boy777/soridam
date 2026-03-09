import { Suspense } from "react";
import { ScriptsContent } from "@/components/scripts/scripts-content";
import {
  getMyScripts,
  getShadowingHistory,
  getShadowableScripts,
} from "@/lib/actions/scripts";

export const metadata = {
  title: "스크립트 | 오픽톡닥",
};

// 서버에서 초기 데이터 병렬 조회 (3개 쿼리)
async function ScriptsLoader() {
  const [scriptsResult, shadowingResult, shadowableResult] = await Promise.all([
    getMyScripts(),
    getShadowingHistory(),
    getShadowableScripts(),
  ]);

  return (
    <ScriptsContent
      initialScripts={scriptsResult.data ?? []}
      initialShadowingHistory={shadowingResult.data ?? []}
      initialShadowableScripts={shadowableResult.data ?? []}
    />
  );
}

export default function ScriptsPage() {
  return (
    <div className="pb-6 pt-1 sm:pb-8 sm:pt-2 lg:pt-0">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">스크립트</h1>
        <p className="mt-0.5 text-sm text-foreground-secondary sm:mt-1 sm:text-base">
          내 경험으로 만드는 맞춤 영어 답변으로 OPIc을 준비하세요.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        }
      >
        <ScriptsLoader />
      </Suspense>
    </div>
  );
}
