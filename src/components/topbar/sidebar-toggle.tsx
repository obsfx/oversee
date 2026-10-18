import { VscLayoutSidebarLeft, VscLayoutSidebarLeftOff } from 'react-icons/vsc'
import { IconButton } from '../../primitives/icon-button.tsx'
import { useLayoutStore } from '../../store/layout-store.ts'

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
    <IconButton title={label} aria-label={label} aria-expanded={expanded} onClick={toggle}>
      <Icon />
    </IconButton>
  )
}
