import type { IconType } from 'react-icons'
import { VscFiles, VscTypeHierarchySub } from 'react-icons/vsc'
import type { SidebarMode } from '@/src/lib/sidebar-modes.ts'

const ICONS: Record<SidebarMode, IconType> = {
  files: VscFiles,
  flow: VscTypeHierarchySub,
}

export function SidebarModeIcon({ mode }: { mode: SidebarMode }) {
  const Icon = ICONS[mode]
  return <Icon aria-hidden={true} className={'size-3.5 shrink-0'} />
}
