import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Page } from '../types';

interface AppState {
  // Navigation
  currentPage: Page;
  sidebarOpen: boolean;
  setPage: (page: Page) => void;
  toggleSidebar: () => void;

  // Local UI preferences (theme is now in profile, but we cache it here for instant apply)
  cachedTheme: 'dark' | 'light' | 'system';
  setCachedTheme: (theme: 'dark' | 'light' | 'system') => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      currentPage: 'dashboard',
      sidebarOpen: true,
      setPage: (page) => set({ currentPage: page }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      cachedTheme: 'dark',
      setCachedTheme: (theme) => set({ cachedTheme: theme }),
    }),
    {
      name: 'roadto660-v3',
      version: 3,
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        cachedTheme: state.cachedTheme,
      }),
    }
  )
);
