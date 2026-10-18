import { VscLayoutSidebarLeft, VscLayoutSidebarLeftOff } from 'react-icons/vsc'
import { IconButton } from '@/src/primitives/icon-button.tsx'
import { Tooltip } from '@/src/primitives/tooltip.tsx'
import { useLayoutStore } from '@/src/store/layout-store.ts'

export function SidebarToggle() {
  const expanded = useLayoutStore((state) => {
    return state.sidebarExpanded
  })
  const toggle = useLayoutStore((state) => {
    return state.toggleSidebar
  })
  const Icon = expanded ? VscLayoutSidebarLeft : VscLayoutSidebarLeftOff
  const label = expanded ? 'Collapse sidebar' : 'Expand sidebar'

  return (
    <Tooltip label={label}>
      <IconButton aria-label={label} aria-expanded={expanded} onClick={toggle}>
        <Icon />
      </IconButton>
    </Tooltip>
  )
}
