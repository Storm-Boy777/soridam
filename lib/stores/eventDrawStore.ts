import { create } from "zustand";
import { persist } from "zustand/middleware";

// 타입 정의
export interface EventMember {
  id: string;
  name: string;
  department: string | null;
  email: string | null;
  phone: string | null;
  memo: string | null;
  is_active: boolean;
  is_attended?: boolean;
  attended_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type DrawPoolType = "attended" | "all" | "parts";

export interface EventRound {
  label: string;
  prize: string;
  count: number;
  mode: "batch" | "single";
  animation: AnimationType;
  pool: DrawPoolType;
  selectedParts?: string[];
}

export interface EventData {
  id: string;
  title: string;
  description: string | null;
  rounds: EventRound[];
  allow_duplicate: boolean;
  status: "draft" | "in_progress" | "completed";
  created_at: string;
  completed_at: string | null;
}

export interface EventResult {
  id: string;
  event_id: string;
  round_index: number;
  round_label: string | null;
  member_id: string;
  member_name: string;
  prize_name: string | null;
  drawn_at: string;
}

export type AnimationType =
  | "slot"
  | "roulette"
  | "card-flip"
  | "vs-battle"
  | "list-shuffle";

export type TabType = "setup" | "live" | "history" | "members";

export const ANIMATIONS: { key: AnimationType; label: string; icon: string; desc: string; multi: boolean; maxCount: number }[] = [
  { key: "vs-battle", label: "VS배틀", icon: "⚔️", desc: "1:1 대결", multi: false, maxCount: 1 },
  { key: "slot", label: "슬롯머신", icon: "🎰", desc: "최대 8명", multi: true, maxCount: 8 },
  { key: "card-flip", label: "카드뒤집기", icon: "🃏", desc: "최대 10명", multi: true, maxCount: 10 },
  { key: "list-shuffle", label: "리스트셔플", icon: "📜", desc: "최대 20명", multi: true, maxCount: 20 },
];

interface EventDrawState {
  // 인증
  isAuthenticated: boolean;
  password: string | null;
  authenticate: (password: string) => boolean;
  logout: () => void;

  // 탭
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;

  // 멤버
  members: EventMember[];
  setMembers: (members: EventMember[]) => void;

  // 추첨
  isDrawing: boolean;
  setIsDrawing: (v: boolean) => void;
  isPresentationMode: boolean;
  setIsPresentationMode: (v: boolean) => void;

  // 이벤트
  events: EventData[];
  setEvents: (events: EventData[]) => void;

  // 라이브 추첨용 설정 데이터
  liveConfig: {
    eventTitle: string;
    rounds: EventRound[];
    allowDuplicate: boolean;
    eventId: string | null;
  } | null;
  setLiveConfig: (config: EventDrawState["liveConfig"]) => void;

  // 라이브 세션 (진행 중 상태 보존)
  liveSession: {
    roundResults: Record<number, { names: string[]; prize: string }>;
    excludeIds: string[];
    quickResults: { prize: string; names: string[] }[];
  };
  setLiveSession: (session: EventDrawState["liveSession"]) => void;
  clearLiveSession: () => void;

  // 결과
  results: EventResult[];
  setResults: (results: EventResult[]) => void;
}

const CORRECT_PASSWORD = "2026";

export const useEventDrawStore = create<EventDrawState>()(
  persist(
    (set, get) => ({
      // 인증
      isAuthenticated: false,
      password: null,
      authenticate: (password: string) => {
        if (password === CORRECT_PASSWORD) {
          set({ isAuthenticated: true, password });
          return true;
        }
        return false;
      },
      logout: () => set({ isAuthenticated: false, password: null }),

      // 탭
      activeTab: "setup",
      setActiveTab: (tab) => set({ activeTab: tab }),

      // 멤버
      members: [],
      setMembers: (members) => set({ members }),

      // 추첨
      isDrawing: false,
      setIsDrawing: (v) => set({ isDrawing: v }),
      isPresentationMode: false,
      setIsPresentationMode: (v) => set({ isPresentationMode: v }),

      // 이벤트
      events: [],
      setEvents: (events) => set({ events }),

      // 라이브 추첨용 설정 데이터
      liveConfig: null,
      setLiveConfig: (config) => set({ liveConfig: config }),

      // 라이브 세션
      liveSession: { roundResults: {}, excludeIds: [], quickResults: [] },
      setLiveSession: (session) => set({ liveSession: session }),
      clearLiveSession: () => set({ liveSession: { roundResults: {}, excludeIds: [], quickResults: [] } }),

      // 결과
      results: [],
      setResults: (results) => set({ results }),
    }),
    {
      name: "event-draw-auth",
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        password: state.password,
        activeTab: state.activeTab,
        liveConfig: state.liveConfig,
        liveSession: state.liveSession,
      }),
    }
  )
);
