import { Headphones } from "lucide-react";
import { ListenContent } from "@/components/listen/listen-content";
import { getListenTracks } from "@/lib/actions/scripts";

export const metadata = {
  title: "듣기",
};

export default async function ListenPage() {
  const result = await getListenTracks();
  const tracks = result.data ?? [];

  return (
    <div className="pb-8 pt-1 sm:pt-2 lg:pt-0">
      <div className="mb-4 sm:mb-6">
        <h1 className="flex items-center gap-2 text-xl font-bold text-foreground sm:text-2xl">
          <Headphones size={22} className="text-primary-500" />
          듣기
        </h1>
        <p className="mt-0.5 text-sm text-foreground-secondary sm:mt-1 sm:text-base">
          내 스토리로 만든 스크립트를 플레이리스트처럼 들으며 평소에도 체화하세요.
        </p>
      </div>

      <ListenContent tracks={tracks} />
    </div>
  );
}
