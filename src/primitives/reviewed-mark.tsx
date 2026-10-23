import { VscCheck } from 'react-icons/vsc'
import { FileTreeLabels } from '@/src/lib/file-tree-labels.ts'

export function ReviewedMark({ reviewed }: { reviewed: boolean }) {
  return (
    <span className={'flex size-3.5 shrink-0 items-center justify-center'}>
      {reviewed && (
        <VscCheck
          role={'img'}
          aria-label={FileTreeLabels.reviewed}
          className={'size-3.5 text-reviewed'}
        />
      )}
    </span>
  )
}
