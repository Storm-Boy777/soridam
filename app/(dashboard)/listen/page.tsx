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
      <div className="mx-auto mb-4 flex max-w-2xl items-center gap-3 sm:mb-6">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-gradient-to-br from-primary-400 to-primary-600 text-white shadow-[var(--shadow-card)]">
          <Headphones size={20} />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">듣기</h1>
          <p className="mt-0.5 truncate text-sm text-foreground-secondary">
            내 스토리로 만든 스크립트를 플레이리스트처럼 들으며 평소에도 체화하세요.
          </p>
        </div>
      </div>

      <ListenContent tracks={tracks} />
    </div>
  );
}
