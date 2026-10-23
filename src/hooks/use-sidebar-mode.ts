import { useLayoutStore } from '@/src/store/layout-store.ts'

export const useSidebarMode = () => {
  const mode = useLayoutStore((layout) => {
    return layout.sidebarMode
  })
  const setMode = useLayoutStore((layout) => {
    return layout.setSidebarMode
  })

  return { mode, setMode }
}
