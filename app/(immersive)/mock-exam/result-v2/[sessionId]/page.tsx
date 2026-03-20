import { ImmersiveHeader } from "@/components/layout/immersive-header";
import { ResultPageV2 } from "@/components/mock-exam/result-v2/result-page-v2";

export const metadata = {
  title: "모의고사 결과 v2 | 오픽톡닥",
};

interface Props {
  params: Promise<{ sessionId: string }>;
}

export default async function MockExamResultV2Page({ params }: Props) {
  const { sessionId } = await params;

  return (
    <>
      <ImmersiveHeader title="나의 모의고사" backHref="/mock-exam?tab=history" />
      <main className="flex h-0 min-h-0 flex-grow flex-col md:h-auto md:flex-1">
        <ResultPageV2 sessionId={sessionId} />
      </main>
    </>
  );
}
