import { create } from "zustand";
import { persist } from "zustand/middleware";

// 무엇을 들을지 (필터 모드)
export type ListenFilterMode = "all" | "type" | "topic";
// 한 곡에 무엇이 담기나 (재생 내용)
export type ListenContentMode = "answer" | "qa" | "question";
// 반복 정책
export type ListenRepeat = "off" | "one" | "all";
// 자막 언어
export type ListenLang = "en" | "ko";

export interface ListenSettingsState {
  // 무엇을 (필터)
  filterMode: ListenFilterMode;
  selectedType: string | null;       // filterMode === "type"
  selectedCategory: string | null;   // filterMode === "topic"
  selectedTopic: string | null;      // filterMode === "topic"

  // 내용
  contentMode: ListenContentMode;
  thinkGap: boolean;                 // qa 모드: 질문↔답변 사이 생각 간격
  thinkGapSec: number;               // 생각 간격 길이(초)

  // 재생
  speed: number;                     // 0.8 | 1.0 | 1.25
  repeat: ListenRepeat;
  shuffle: boolean;

  // 자막
  subtitleOn: boolean;
  subtitleLang: ListenLang;

  update: (partial: Partial<ListenSettingsState>) => void;
}

export const useListenSettings = create<ListenSettingsState>()(
  persist(
    (set) => ({
      filterMode: "all",
      selectedType: null,
      selectedCategory: null,
      selectedTopic: null,

      contentMode: "answer",
      thinkGap: false,
      thinkGapSec: 4,

      speed: 1.0,
      repeat: "all",
      shuffle: false,

      subtitleOn: false,
      subtitleLang: "en",

      update: (partial) => set(partial),
    }),
    {
      name: "listen-settings",
      skipHydration: true, // 렌더 중 rehydration 방지 (ListenContent에서 수동 호출)
      partialize: (s) => ({
        filterMode: s.filterMode,
        selectedType: s.selectedType,
        selectedCategory: s.selectedCategory,
        selectedTopic: s.selectedTopic,
        contentMode: s.contentMode,
        thinkGap: s.thinkGap,
        thinkGapSec: s.thinkGapSec,
        speed: s.speed,
        repeat: s.repeat,
        shuffle: s.shuffle,
        subtitleOn: s.subtitleOn,
        subtitleLang: s.subtitleLang,
      }),
    },
  ),
);
