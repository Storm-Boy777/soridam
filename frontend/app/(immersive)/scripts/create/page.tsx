import { Suspense } from "react";
import { ImmersiveHeader } from "@/components/layout/immersive-header";
import { ScriptWizard } from "@/components/scripts/create/script-wizard";
import { getAuthClaims } from "@/lib/auth";

export const metadata = {
  title: "스크립트 생성 | 오픽톡닥",
};

export default async function ScriptCreatePage() {
  const claims = await getAuthClaims();
  const targetGrade = (claims?.user_metadata?.target_grade as string) || "";
  const currentGrade = (claims?.user_metadata?.current_grade as string) || "";

  return (
    <>
      <ImmersiveHeader title="스크립트 생성" backHref="/scripts" />

      <main className="flex flex-1 flex-col">
        <Suspense
          fallback={
            <div className="flex flex-1 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            </div>
          }
        >
          <ScriptWizard currentGrade={currentGrade} targetGrade={targetGrade} />
        </Suspense>
      </main>
    </>
  );
}
