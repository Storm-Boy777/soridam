import { ImmersiveHeader } from "@/components/layout/immersive-header";
import { ResultPage } from "@/components/mock-exam/result-v2/result-page";
import type { ResultPageData } from "@/components/mock-exam/result-v2/result-page";
import {
  getOverviewData,
  getDiagnosisData,
  getQuestionsData,
  getGrowthData,
} from "@/lib/actions/mock-exam-v2";

export const metadata = {
  title: "나의 모의고사 | 오픽톡닥",
};

interface Props {
  params: Promise<{ sessionId: string }>;
}

export default async function MockExamResultPage({ params }: Props) {
  const { sessionId } = await params;

  // 4탭 데이터 병렬 조회
  const [overviewRes, diagnosisRes, questionsRes, growthRes] = await Promise.all([
    getOverviewData(sessionId).catch(() => ({ data: undefined, error: "조회 실패" })),
    getDiagnosisData(sessionId).catch(() => ({ data: undefined, error: "조회 실패" })),
    getQuestionsData(sessionId).catch(() => ({ data: undefined, error: "조회 실패" })),
    getGrowthData(sessionId).catch(() => ({ data: undefined, error: "조회 실패" })),
  ]);

  const data: ResultPageData = {
    overview: overviewRes.data ?? null,
    diagnosis: diagnosisRes.data ?? null,
    questions: questionsRes.data ?? null,
    growth: growthRes.data ?? null,
  };

  return (
    <>
      <ImmersiveHeader title="나의 모의고사" backHref="/mock-exam?tab=history" />
      <main className="flex h-0 min-h-0 flex-grow flex-col md:h-auto md:flex-1">
        <ResultPage sessionId={sessionId} data={data} />
      </main>
    </>
  );
}
