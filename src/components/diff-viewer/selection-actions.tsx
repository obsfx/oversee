import { VscComment } from 'react-icons/vsc'
import { useSelectionActions } from '@/src/hooks/use-selection-actions.ts'
import type { LineRange } from '@/src/lib/line-range.ts'
import { AnnotationRow } from '@/src/primitives/annotation-row.tsx'
import { Button } from '@/src/primitives/button.tsx'

interface SelectionActionsProps {
  path: string
  range: LineRange
}

export function SelectionActions({ path, range }: SelectionActionsProps) {
  const { label, comment, clear } = useSelectionActions(path, range)

  return (
    <AnnotationRow>
      <Button variant={'accent-subtle'} onClick={comment}>
        <VscComment />
        {label}
      </Button>
      <Button variant={'ghost'} onClick={clear}>
        Clear
      </Button>
    </AnnotationRow>
  )
}
