"use client";

import { useEffect } from "react";
import { useEventDrawStore } from "@/lib/stores/eventDrawStore";

export default function PresentationMode() {
  const setIsPresentationMode = useEventDrawStore((s) => s.setIsPresentationMode);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        document.exitFullscreen?.().catch(() => {});
        setIsPresentationMode(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    document.documentElement.requestFullscreen?.().catch(() => {});

    return () => {
      document.removeEventListener("keydown", handleKey);
    };
  }, [setIsPresentationMode]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-800 to-slate-900 z-50 flex flex-col">
      <button
        onClick={() => {
          document.exitFullscreen?.().catch(() => {});
          setIsPresentationMode(false);
        }}
        className="absolute top-6 right-6 w-12 h-12 rounded-xl bg-white/10 text-white/50 hover:text-white hover:bg-white/20 flex items-center justify-center text-lg transition-all z-50"
      >
        ✕
      </button>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-white/40">
          <div className="text-6xl mb-4">🎰</div>
          <p className="text-xl font-bold">프레젠테이션 모드</p>
          <p className="text-sm mt-2 text-white/30">ESC 또는 X 버튼으로 나가기</p>
        </div>
      </div>
    </div>
  );
}
