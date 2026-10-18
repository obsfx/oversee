import { VscFold, VscUnfold } from 'react-icons/vsc'
import { IconButton } from '@/src/primitives/icon-button.tsx'
import { Tooltip } from '@/src/primitives/tooltip.tsx'
import { useDiffViewStore } from '@/src/store/diff-view-store.ts'

export function UnchangedToggle() {
  const expanded = useDiffViewStore((diffView) => {
    return diffView.unchangedExpanded
  })
  const toggle = useDiffViewStore((diffView) => {
    return diffView.toggleUnchanged
  })
  const label = expanded ? 'Collapse unchanged sections' : 'Expand unchanged sections'

  return (
    <Tooltip label={label}>
      <IconButton aria-label={label} aria-pressed={expanded} onClick={toggle}>
        {expanded ? <VscFold /> : <VscUnfold />}
      </IconButton>
    </Tooltip>
  )
}
