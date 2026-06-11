import { ImmersiveHeader } from "@/components/layout/immersive-header";
import { ResultPage } from "@/components/mock-exam/result/result-page";
import type { ResultPageData } from "@/components/mock-exam/result/result-page";
import { TranscriptResult } from "@/components/mock-exam/result/transcript-result";
import { getTranscriptResult } from "@/lib/actions/mock-exam";
import {
  getOverviewData,
  getDiagnosisData,
  getQuestionsData,
  getGrowthData,
  getSessionSubmissionId,
} from "@/lib/actions/mock-exam-result";
import type { MockExamMode } from "@/lib/types/mock-exam";

export const metadata = {
  title: "나의 모의고사",
};

interface Props {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

const VALID_TABS = ["overview", "diagnosis", "questions", "growth"] as const;

export default async function MockExamResultPage({ params, searchParams }: Props) {
  const { sessionId } = await params;

  // 실전 감각 훈련(transcript) 모드 분기 — 평가 리포트 없이 트랜스크립트 뷰
  const transcriptRes = await getTranscriptResult(sessionId).catch(() => null);
  if (transcriptRes?.data?.mode === "transcript") {
    return (
      <>
        <ImmersiveHeader title="실전 감각 훈련" backHref="/mock-exam?tab=start" />
        <main className="flex h-0 min-h-0 flex-grow flex-col md:h-auto md:flex-1">
          <TranscriptResult sessionId={sessionId} initialData={transcriptRes.data} />
        </main>
      </>
    );
  }

  const { tab } = await searchParams;
  const initialTab = VALID_TABS.includes(tab as (typeof VALID_TABS)[number])
    ? (tab as (typeof VALID_TABS)[number])
    : "overview";

  // 4탭 데이터 + 재응시용 submission_id 병렬 조회
  const [overviewRes, diagnosisRes, questionsRes, growthRes, submissionRes] =
    await Promise.all([
      getOverviewData(sessionId).catch(() => ({ data: undefined, error: "조회 실패" })),
      getDiagnosisData(sessionId).catch(() => ({ data: undefined, error: "조회 실패" })),
      getQuestionsData(sessionId).catch(() => ({ data: undefined, error: "조회 실패" })),
      getGrowthData(sessionId).catch(() => ({ data: undefined, error: "조회 실패" })),
      getSessionSubmissionId(sessionId).catch(() => ({ data: undefined })),
    ]);

  const data: ResultPageData = {
    overview: overviewRes.data ?? null,
    diagnosis: diagnosisRes.data ?? null,
    questions: questionsRes.data ?? null,
    growth: growthRes.data ?? null,
  };

  const submissionId = submissionRes.data?.submission_id ?? null;
  const currentMode = (submissionRes.data?.mode as MockExamMode | undefined) ?? null;

  return (
    <>
      <ImmersiveHeader title="나의 모의고사" backHref="/mock-exam?tab=history" />
      <main className="flex h-0 min-h-0 flex-grow flex-col md:h-auto md:flex-1">
        <ResultPage
          sessionId={sessionId}
          data={data}
          initialTab={initialTab}
          submissionId={submissionId}
          currentMode={currentMode}
        />
      </main>
    </>
  );
}
