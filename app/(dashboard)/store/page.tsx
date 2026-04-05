import { getAuthClaims } from "@/lib/auth";
import { StoreContent } from "@/components/store/store-content";

export const metadata = {
  title: "스토어",
  description: "소리담 크레딧 충전 및 후원",
};

export default async function StorePage() {
  const claims = await getAuthClaims();
  const userId = (claims?.sub as string) || "";

  return (
    <div className="pb-6 pt-1 sm:pb-8 sm:pt-2 lg:pt-0">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">스토어</h1>
        <p className="mt-0.5 text-sm text-foreground-secondary sm:mt-1 sm:text-base">
          사용한 만큼만, 원가 그대로.
        </p>
      </div>
      <StoreContent userId={userId} />
    </div>
  );
}
