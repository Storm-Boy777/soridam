import { ImmersiveHeader } from "@/components/layout/immersive-header";
import { DrillSessionWrapper } from "@/components/tutoring/drill/drill-session-wrapper";

export const metadata = {
  title: "튜터링 드릴 | 오픽톡닥",
};

interface Props {
  searchParams: Promise<{ focusId?: string }>;
}

export default async function TutoringDrillPage({ searchParams }: Props) {
  const params = await searchParams;
  const focusId = params.focusId;

  return (
    <>
      <ImmersiveHeader title="튜터링 드릴" backHref="/tutoring?tab=training" />
      <main className="flex h-0 min-h-0 flex-grow flex-col md:h-auto md:flex-1">
        {focusId ? (
          <DrillSessionWrapper focusId={focusId} />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <p className="text-foreground-secondary">잘못된 접근입니다</p>
              <a
                href="/tutoring?tab=training"
                className="mt-3 inline-block text-sm text-primary-500 hover:underline"
              >
                튜터링으로 돌아가기
              </a>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
