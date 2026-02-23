import { getAuthClaims } from "@/lib/auth";
import { StoreContent } from "@/components/store/store-content";

export const metadata = {
  title: "Store | 오픽톡닥",
  description: "오픽톡닥 플랜 구매 및 횟수권 스토어",
};

export default async function StorePage() {
  const claims = await getAuthClaims();
  const userId = (claims?.sub as string) || "";

  return (
    <div className="pb-8 pt-2 lg:pt-0">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Store</h1>
        <p className="mt-1 text-foreground-secondary">
          플랜을 업그레이드하거나 필요한 만큼 횟수권을 구매하세요.
        </p>
      </div>
      <StoreContent userId={userId} />
    </div>
  );
}
