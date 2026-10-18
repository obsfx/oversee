import { VscFold, VscUnfold } from 'react-icons/vsc'
import { IconButton } from '../../primitives/icon-button.tsx'
import { useDiffViewStore } from '../../store/diff-view-store.ts'

export function UnchangedToggle() {
  const expanded = useDiffViewStore((diffView) => {
    return diffView.unchangedExpanded
  })
  const toggle = useDiffViewStore((diffView) => {
    return diffView.toggleUnchanged
  })
  const label = expanded ? 'Collapse unchanged sections' : 'Expand unchanged sections'

  return (
    <IconButton title={label} aria-label={label} aria-pressed={expanded} onClick={toggle}>
      {expanded ? <VscFold /> : <VscUnfold />}
    </IconButton>
  )
}
