import { redirect } from "next/navigation";
import Link from "next/link";
import { Calendar, Clock, RefreshCw } from "lucide-react";
import { ImmersiveHeader } from "@/components/layout/immersive-header";
import { EvaluationResult } from "@/components/shadowing/evaluation-result";
import { getShadowingSessionDetail } from "@/lib/actions/scripts";

export const metadata = {
  title: "쉐도잉 결과 | 하루오픽",
};

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function ShadowingDetailPage({ params }: PageProps) {
  const { sessionId } = await params;

  const result = await getShadowingSessionDetail(sessionId);

  if (result.error || !result.data) {
    redirect("/scripts");
  }

  const session = result.data;
  const title = session.topic
    ? `${session.topic} · 쉐도잉 결과`
    : "쉐도잉 결과";

  const dateStr = new Date(session.started_at).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const durationStr = session.audio_duration
    ? `${Math.floor(session.audio_duration / 60)}분 ${session.audio_duration % 60}초`
    : null;

  return (
    <>
      <ImmersiveHeader title={title} backHref="/scripts?tab=shadowing" />
      <main className="flex flex-1 flex-col">
        <div className="relative h-0 flex-grow">
          <div className="absolute inset-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="mx-auto w-full max-w-xl px-4 py-6 sm:px-6 sm:py-8">
              {/* 세션 정보 */}
              <div className="mb-6 rounded-[var(--radius-xl)] border border-border bg-surface p-4">
                {session.question_korean && (
                  <p className="text-sm font-medium text-foreground">
                    {session.question_korean}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1 text-xs text-foreground-muted">
                    <Calendar size={12} />
                    {dateStr}
                  </span>
                  {durationStr && (
                    <span className="flex items-center gap-1 text-xs text-foreground-muted">
                      <Clock size={12} />
                      {durationStr}
                    </span>
                  )}
                </div>
              </div>

              {/* 평가 결과 */}
              {session.evaluation ? (
                <EvaluationResult evaluation={session.evaluation} />
              ) : (
                <div className="flex flex-col items-center py-12 text-center">
                  <p className="text-sm font-medium text-foreground-secondary">
                    아직 평가 결과가 없습니다
                  </p>
                  <p className="mt-1 text-xs text-foreground-muted">
                    훈련을 완료하면 평가 결과가 표시됩니다
                  </p>
                </div>
              )}

              {/* 다시 훈련하기 */}
              {session.package_id && (
                <div className="mt-8">
                  <Link
                    href={`/scripts/shadowing?packageId=${session.package_id}`}
                    className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-xl)] bg-primary-500 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
                  >
                    <RefreshCw size={16} />
                    다시 훈련하기
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
