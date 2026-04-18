import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PhotoContestStore {
  // 인증 (비밀번호: "2026")
  isAuthenticated: boolean
  authenticate: (password: string) => boolean
  logout: () => void
}

export const usePhotoContestStore = create<PhotoContestStore>()(
  persist(
    (set) => ({
      isAuthenticated: false,

      authenticate: (password: string) => {
        if (password === '2026') {
          set({ isAuthenticated: true })
          return true
        }
        return false
      },

      logout: () => set({ isAuthenticated: false }),
    }),
    {
      name: 'photo-contest-auth',
      partialize: (state) => ({ isAuthenticated: state.isAuthenticated }),
    }
  )
)
