import { getAuthClaims } from "@/lib/auth";
import { StoreContent } from "@/components/store/store-content";

export const metadata = {
  title: "AI 스토어",
  description: "소리담 크레딧 충전 및 후원",
};

export default async function StorePage() {
  const claims = await getAuthClaims();
  const userId = (claims?.sub as string) || "";

  return (
    <div className="pb-6 pt-1 sm:pb-8 sm:pt-2 lg:pt-0">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">AI 스토어</h1>
        <p className="mt-0.5 text-sm text-foreground-secondary sm:mt-1 sm:text-base">
          크레딧을 충전하고, AI 학습 기능을 바로 이용하세요.
        </p>
      </div>
      <StoreContent userId={userId} />
    </div>
  );
}
