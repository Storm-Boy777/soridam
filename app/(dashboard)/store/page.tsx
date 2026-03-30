import { getAuthClaims } from "@/lib/auth";
import { StoreContent } from "@/components/store/store-content";

export const metadata = {
  title: "스토어 | 하루오픽",
  description: "하루오픽 플랜 구매 및 횟수권 스토어",
};

export default async function StorePage() {
  const claims = await getAuthClaims();
  const userId = (claims?.sub as string) || "";

  return (
    <div className="pb-6 pt-1 sm:pb-8 sm:pt-2 lg:pt-0">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">스토어</h1>
        <p className="mt-0.5 text-sm text-foreground-secondary sm:mt-1 sm:text-base">
          플랜을 업그레이드하거나 필요한 만큼 횟수권을 구매하세요.
        </p>
      </div>
      <StoreContent userId={userId} />
    </div>
  );
}
