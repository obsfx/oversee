import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type SidebarMode, SidebarModes } from '@/src/lib/sidebar-modes.ts'

interface LayoutState {
  sidebarExpanded: boolean
  sidebarMode: SidebarMode
  toggleSidebar: () => void
  setSidebarMode: (mode: SidebarMode) => void
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => {
      return {
        sidebarExpanded: true,
        sidebarMode: SidebarModes.fallback,
        toggleSidebar: () => {
          set((state) => {
            return { sidebarExpanded: !state.sidebarExpanded }
          })
        },
        setSidebarMode: (sidebarMode) => {
          set({ sidebarMode })
        },
      }
    },
    {
      name: 'oversee.layout',
      partialize: (state) => {
        return { sidebarExpanded: state.sidebarExpanded, sidebarMode: state.sidebarMode }
      },
      merge: (persisted, current) => {
        const stored = persisted as Partial<LayoutState> | undefined
        return {
          ...current,
          sidebarExpanded: stored?.sidebarExpanded !== false,
          sidebarMode: SidebarModes.parse(stored?.sidebarMode),
        }
      },
    },
  ),
)
