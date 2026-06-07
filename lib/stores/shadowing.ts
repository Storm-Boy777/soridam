import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TimestampItem, ShadowingStep, ShadowingEvaluation, StructureSummaryItem, KeySentence } from "@/lib/types/scripts";

// Step 2 녹음 상태 (녹음 → 내 녹음 듣기 흐름)
export type ShadowComparisonState = "idle" | "ready_to_record" | "recording" | "showing_result";

// 표시 모드 (Step 1 듣기 + Step 2 따라읽기 공용)
export type DisplayMode = "both" | "english" | "korean";

// 하위 호환용 타입 alias
export type TextHintLevel = DisplayMode;

// Step 3 자기평가 (체화 정도 자기 인식)
export type ReciteSelfRating = "easy" | "recalled" | "hard";

export interface ShadowingState {
  // === 데이터 (패키지에서 로드) ===
  packageId: string | null;
  scriptId: string | null;
  sentences: TimestampItem[];
  audioUrl: string | null;
  questionText: string | null;
  questionKorean: string | null;
  questionAudioUrl: string | null;
  keyExpressions: string[];
  structureSummary: StructureSummaryItem[] | null;
  keySentences: KeySentence[] | null;

  // === 현재 단계 ===
  currentStep: ShadowingStep;

  // === Step 1: 듣기 ===
  isPlaying: boolean;
  currentTime: number;
  playbackRate: number;
  displayMode: DisplayMode;
  seekRequest: { time: number; id: number } | null; // 문장 클릭 → 재생 요청
  repeatTargetIndex: number | null; // null=OFF, 숫자=해당 문장 반복
  listenedSentences: number[]; // 청취 완료 문장 인덱스

  // === Step 2: 따라읽기 ===
  shadowIndex: number;
  shadowHintLevel: TextHintLevel;
  shadowCompleted: number[];
  shadowPlayCounts: Record<number, number>; // 문장별 재생 횟수 (persist)
  shadowComparisonState: ShadowComparisonState;

  // === Step 3: 혼자 말하기 ===
  reciteTimer: number;
  recitePeekCount: number;
  reciteShowPeek: boolean;
  reciteHintLevel: 0 | 1 | 2; // 0=숨김, 1=구조만, 2=전체
  reciteRecordingDone: boolean; // 녹음 완료 플래그
  reciteSelfRating: ReciteSelfRating | null; // 녹음 후 자기평가 (체화 체감)

  // === Step 4: 실전 ===
  speakTimer: number;
  speakResult: ShadowingEvaluation | null;

  // === 공통 녹음 ===
  isRecording: boolean;
  recordingDuration: number;

  // === 진행 상태 ===
  stepCompletions: Record<ShadowingStep, boolean>;

  // === Actions ===
  init: (data: {
    packageId: string;
    scriptId: string;
    sentences: TimestampItem[];
    audioUrl: string;
    questionText: string | null;
    questionKorean: string | null;
    questionAudioUrl: string | null;
    keyExpressions: string[];
    structureSummary: StructureSummaryItem[] | null;
    keySentences: KeySentence[] | null;
  }) => void;
  setStep: (step: ShadowingStep) => void;
  setPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setPlaybackRate: (rate: number) => void;
  setDisplayMode: (mode: DisplayMode) => void;
  seekTo: (time: number) => void;
  toggleRepeat: () => void;
  setRepeatTarget: (index: number) => void;

  // Step 1: 듣기
  markSentenceListened: (index: number) => void;

  // Step 2: 따라읽기
  setShadowIndex: (index: number) => void;
  setShadowHintLevel: (level: TextHintLevel) => void;
  markShadowCompleted: (index: number) => void;
  incrementShadowPlayCount: (index: number) => void;
  setShadowComparisonState: (state: ShadowComparisonState) => void;

  // Step 3: 혼자 말하기
  setReciteTimer: (time: number) => void;
  incrementPeekCount: () => void;
  togglePeek: () => void;
  setReciteHintLevel: (level: 0 | 1 | 2) => void;
  setReciteRecordingDone: (done: boolean) => void;
  setReciteSelfRating: (rating: ReciteSelfRating | null) => void;

  // Step 4: 실전
  setSpeakTimer: (time: number) => void;
  setSpeakResult: (result: ShadowingEvaluation | null) => void;

  // 진행 상태
  markStepComplete: (step: ShadowingStep) => void;

  // 공통
  setRecording: (recording: boolean) => void;
  setRecordingDuration: (duration: number) => void;
  reset: () => void;
}

const initialStepCompletions: Record<ShadowingStep, boolean> = {
  listen: false,
  shadow: false,
  recite: false,
};

const initialState = {
  packageId: null,
  scriptId: null,
  sentences: [],
  audioUrl: null,
  questionText: null,
  questionKorean: null,
  questionAudioUrl: null,
  keyExpressions: [],
  structureSummary: null,
  keySentences: null,
  currentStep: "listen" as ShadowingStep,
  isPlaying: false,
  currentTime: 0,
  playbackRate: 1.0,
  displayMode: "both" as DisplayMode,
  seekRequest: null,
  repeatTargetIndex: null,
  listenedSentences: [] as number[],
  shadowIndex: 0,
  shadowHintLevel: "both" as TextHintLevel,
  shadowCompleted: [],
  shadowPlayCounts: {} as Record<number, number>,
  shadowComparisonState: "idle" as ShadowComparisonState,
  reciteTimer: 0,
  recitePeekCount: 0,
  reciteShowPeek: false,
  reciteHintLevel: 2 as 0 | 1 | 2,
  reciteRecordingDone: false,
  reciteSelfRating: null as ReciteSelfRating | null,
  speakTimer: 0,
  speakResult: null,
  isRecording: false,
  recordingDuration: 0,
  stepCompletions: { ...initialStepCompletions },
};

export const useShadowingStore = create<ShadowingState>()(
  persist(
    (set) => ({
      ...initialState,

      init: (data) =>
        set({
          ...initialState,
          packageId: data.packageId,
          scriptId: data.scriptId,
          sentences: data.sentences,
          audioUrl: data.audioUrl,
          questionText: data.questionText,
          questionKorean: data.questionKorean,
          questionAudioUrl: data.questionAudioUrl,
          keyExpressions: data.keyExpressions,
          structureSummary: data.structureSummary,
          keySentences: data.keySentences,
        }),

      setStep: (step) =>
        set({
          currentStep: step,
          isPlaying: false,
          isRecording: false,
          recordingDuration: 0,
          repeatTargetIndex: null,
          seekRequest: null,
        }),

      setPlaying: (playing) => set({ isPlaying: playing }),
      setCurrentTime: (time) => set({ currentTime: time }),
      setPlaybackRate: (rate) => set({ playbackRate: rate }),
      setDisplayMode: (mode) => set({ displayMode: mode }),
      seekTo: (time) => set({ seekRequest: { time, id: Date.now() } }),
      toggleRepeat: () =>
        set((state) => {
          if (state.repeatTargetIndex != null) {
            // OFF: 반복 해제
            return { repeatTargetIndex: null };
          }
          // ON: 현재 재생 중인 문장을 찾아서 고정
          const idx = state.sentences.findIndex(
            (s) => state.currentTime >= s.start && state.currentTime < s.end
          );
          return { repeatTargetIndex: idx >= 0 ? idx : 0 };
        }),
      setRepeatTarget: (index) => set({ repeatTargetIndex: index }),

      // Step 1: 듣기
      markSentenceListened: (index) =>
        set((state) => ({
          listenedSentences: state.listenedSentences.includes(index)
            ? state.listenedSentences
            : [...state.listenedSentences, index],
        })),

      // Step 2: 따라읽기
      setShadowIndex: (index) => set({ shadowIndex: index }),
      setShadowHintLevel: (level) => set({ shadowHintLevel: level }),
      markShadowCompleted: (index) =>
        set((state) => ({
          shadowCompleted: state.shadowCompleted.includes(index)
            ? state.shadowCompleted
            : [...state.shadowCompleted, index],
        })),
      incrementShadowPlayCount: (index) =>
        set((state) => ({
          shadowPlayCounts: {
            ...state.shadowPlayCounts,
            [index]: (state.shadowPlayCounts[index] ?? 0) + 1,
          },
        })),
      setShadowComparisonState: (comparisonState) => set({ shadowComparisonState: comparisonState }),

      // Step 3: 혼자 말하기
      setReciteTimer: (time) => set({ reciteTimer: time }),
      incrementPeekCount: () =>
        set((state) => ({ recitePeekCount: state.recitePeekCount + 1 })),
      togglePeek: () =>
        set((state) => ({ reciteShowPeek: !state.reciteShowPeek })),
      setReciteHintLevel: (level) => set({ reciteHintLevel: level }),
      setReciteRecordingDone: (done) => set({ reciteRecordingDone: done }),
      setReciteSelfRating: (rating) => set({ reciteSelfRating: rating }),

      // Step 4: 실전
      setSpeakTimer: (time) => set({ speakTimer: time }),
      setSpeakResult: (result) => set({ speakResult: result }),

      // 진행 상태
      markStepComplete: (step) =>
        set((state) => ({
          stepCompletions: { ...state.stepCompletions, [step]: true },
        })),

      // 공통
      setRecording: (recording) => set({ isRecording: recording }),
      setRecordingDuration: (duration) => set({ recordingDuration: duration }),
      reset: () => set(initialState),
    }),
    {
      name: "shadowing-progress",
      skipHydration: true, // 렌더 중 rehydration 방지 (ShadowingContent에서 수동 호출)
      // 진도 관련 데이터만 persist
      partialize: (state) => ({
        packageId: state.packageId,
        scriptId: state.scriptId,
        currentStep: state.currentStep,
        shadowCompleted: state.shadowCompleted,
        shadowHintLevel: state.shadowHintLevel,
        listenedSentences: state.listenedSentences,
        shadowPlayCounts: state.shadowPlayCounts,
        reciteHintLevel: state.reciteHintLevel,
        reciteRecordingDone: state.reciteRecordingDone,
        reciteSelfRating: state.reciteSelfRating,
        // stepCompletions는 persist하지 않음 — 실시간 데이터로 재계산
      }),
    }
  )
);
