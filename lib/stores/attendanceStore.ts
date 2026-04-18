import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AttendanceTabType = "status" | "members" | "qr";

interface AttendanceState {
  // 인증 (관리자용)
  isAuthenticated: boolean;
  authenticate: (password: string) => boolean;
  logout: () => void;

  // 탭
  activeTab: AttendanceTabType;
  setActiveTab: (tab: AttendanceTabType) => void;
}

const CORRECT_PASSWORD = "2026";

export const useAttendanceStore = create<AttendanceState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      authenticate: (password: string) => {
        if (password === CORRECT_PASSWORD) {
          set({ isAuthenticated: true });
          return true;
        }
        return false;
      },
      logout: () => set({ isAuthenticated: false }),

      activeTab: "status",
      setActiveTab: (tab) => set({ activeTab: tab }),
    }),
    {
      name: "attendance-auth",
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        activeTab: state.activeTab,
      }),
    }
  )
);
