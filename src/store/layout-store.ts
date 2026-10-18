import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface LayoutState {
  sidebarExpanded: boolean
  toggleSidebar: () => void
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => {
      return {
        sidebarExpanded: true,
        toggleSidebar: () => {
          set((state) => {
            return { sidebarExpanded: !state.sidebarExpanded }
          })
        },
      }
    },
    {
      name: 'oversee.layout',
      partialize: (state) => {
        return { sidebarExpanded: state.sidebarExpanded }
      },
      merge: (persisted, current) => {
        const sidebarExpanded = (persisted as Partial<LayoutState> | undefined)?.sidebarExpanded
        return { ...current, sidebarExpanded: sidebarExpanded !== false }
      },
    },
  ),
)
