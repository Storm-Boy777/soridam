import { Suspense } from "react";
import { ScriptsContent } from "@/components/scripts/scripts-content";
import { getMyScripts, getShadowingHistory } from "@/lib/actions/scripts";

export const metadata = {
  title: "스크립트 | 오픽톡닥",
};

// 서버에서 초기 데이터 병렬 조회
async function ScriptsLoader() {
  const [scriptsResult, shadowingResult] = await Promise.all([
    getMyScripts(),
    getShadowingHistory(),
  ]);

  return (
    <ScriptsContent
      initialScripts={scriptsResult.data ?? []}
      initialShadowingHistory={shadowingResult.data ?? []}
    />
  );
}

export default function ScriptsPage() {
  return (
    <div className="pb-8 pt-2 lg:pt-0">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">스크립트</h1>
        <p className="mt-1 text-foreground-secondary">
          AI가 만드는 맞춤 영어 답변으로 OPIc을 준비하세요.
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
