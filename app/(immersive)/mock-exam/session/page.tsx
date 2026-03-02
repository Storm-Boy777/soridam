import { ImmersiveHeader } from "@/components/layout/immersive-header";
import { MockExamSessionWrapper } from "@/components/mock-exam/session/mock-exam-session-wrapper";

export const metadata = {
  title: "모의고사 세션 | 오픽톡닥",
};

interface Props {
  searchParams: Promise<{ id?: string }>;
}

export default async function MockExamSessionPage({ searchParams }: Props) {
  const params = await searchParams;
  const sessionId = params.id;

  return (
    <>
      <ImmersiveHeader title="모의고사" backHref="/mock-exam" />
      <main className="flex flex-1 flex-col">
        {sessionId ? (
          <MockExamSessionWrapper sessionId={sessionId} />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <p className="text-foreground-secondary">
                잘못된 접근입니다
              </p>
              <a
                href="/mock-exam"
                className="mt-2 inline-block text-sm text-primary-500 hover:underline"
              >
                모의고사 페이지로 돌아가기
              </a>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
