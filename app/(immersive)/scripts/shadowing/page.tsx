import { redirect } from "next/navigation";
import { ImmersiveHeader } from "@/components/layout/immersive-header";
import { ShadowingContent } from "@/components/shadowing/shadowing-content";
import { getShadowingData } from "@/lib/actions/scripts";
import type { ShadowingData } from "@/lib/actions/scripts";
import {
  TRIAL_QUESTION,
  TRIAL_PACKAGE_WAV_URL,
  TRIAL_TIMESTAMPS,
} from "@/components/trial/trial-data/script-trial-data";

export const metadata = {
  title: "쉐도잉 훈련 | 하루오픽",
};

interface PageProps {
  searchParams: Promise<{ packageId?: string; scriptId?: string; mode?: string }>;
}

export default async function ShadowingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { packageId } = params;
  const isTrialMode = params.mode === "trial";

  // 체험판 모드: 하드코딩 데이터로 진입
  if (isTrialMode) {
    const trialData: ShadowingData = {
      packageId: "trial-package-001",
      scriptId: "trial-script-001",
      wavUrl: TRIAL_PACKAGE_WAV_URL,
      jsonUrl: null,
      sentences: TRIAL_TIMESTAMPS,
      questionText: TRIAL_QUESTION.question_english,
      questionKorean: TRIAL_QUESTION.question_korean,
      topic: TRIAL_QUESTION.topic,
      keyExpressions: [
        "got interested in",
        "sing along to",
        "collect albums",
        "my taste changed",
        "helped me focus",
        "share our playlists",
        "makes me kind of nostalgic",
      ],
      targetLevel: "IH",
      ttsVoice: "Zephyr",
      packageStatus: "completed",
      structureSummary: null,
      keySentences: null,
    };

    return (
      <>
        <ImmersiveHeader title="음악 · 쉐도잉 체험판" backHref="/scripts?tab=shadowing" />
        <main className="flex h-0 min-h-0 flex-grow flex-col md:h-auto md:flex-1">
          <ShadowingContent data={trialData} isTrialMode />
        </main>
      </>
    );
  }

  if (!packageId) {
    redirect("/scripts");
  }

  // 서버에서 패키지 데이터 사전 조회
  const result = await getShadowingData(packageId);

  if (result.error || !result.data) {
    return (
      <>
        <ImmersiveHeader title="쉐도잉 훈련" backHref="/scripts?tab=shadowing" />
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
          <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-8 text-center">
            <p className="text-lg font-semibold text-foreground">
              패키지를 불러올 수 없습니다
            </p>
            <p className="mt-2 text-sm text-foreground-secondary">
              {result.error || "패키지가 존재하지 않거나 접근 권한이 없습니다."}
            </p>
          </div>
        </main>
      </>
    );
  }

  const topicLabel = result.data.topic
    ? `${result.data.topic} · 쉐도잉`
    : "쉐도잉 훈련";

  return (
    <>
      <ImmersiveHeader title={topicLabel} backHref="/scripts?tab=shadowing" />
      <main className="flex h-0 min-h-0 flex-grow flex-col md:h-auto md:flex-1">
        <ShadowingContent data={result.data} />
      </main>
    </>
  );
}
