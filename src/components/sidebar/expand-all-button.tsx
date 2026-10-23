import { LuChevronsDownUp, LuChevronsUpDown } from 'react-icons/lu'
import { TreeLabels } from '@/src/lib/tree-labels.ts'
import { SidebarIconButton } from '@/src/primitives/sidebar-icon-button.tsx'
import { Tooltip } from '@/src/primitives/tooltip.tsx'

interface ExpandAllButtonProps {
  expanded: boolean
  disabled?: boolean
  onToggle: () => void
}

export function ExpandAllButton({ expanded, disabled, onToggle }: ExpandAllButtonProps) {
  const label = TreeLabels.expansion(expanded)

  return (
    <Tooltip label={label}>
      <SidebarIconButton aria-label={label} disabled={disabled} onClick={onToggle}>
        {expanded ? <LuChevronsDownUp /> : <LuChevronsUpDown />}
      </SidebarIconButton>
    </Tooltip>
  )
}
