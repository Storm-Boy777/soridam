import { Suspense } from "react";
import { ImmersiveHeader } from "@/components/layout/immersive-header";
import { ReviewWizard } from "@/components/reviews/submit/review-wizard";

export const metadata = {
  title: "후기 제출 | 오픽톡닥",
};

export default function ReviewSubmitPage() {
  return (
    <>
      <ImmersiveHeader title="후기 제출" backHref="/reviews" />

      <main className="flex h-0 min-h-0 flex-grow flex-col md:h-auto md:flex-1">
        <Suspense
          fallback={
            <div className="flex flex-1 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            </div>
          }
        >
          <ReviewWizard />
        </Suspense>
      </main>
    </>
  );
}
