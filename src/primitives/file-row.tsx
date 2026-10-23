import type { ComponentProps } from 'react'
import { c } from '@/src/c.ts'
import type { ChangeStatus } from '@/src/lib/change-set.ts'
import type { FileKind } from '@/src/lib/file-kinds.ts'
import { FileKindIcon } from '@/src/primitives/file-kind-icon.tsx'
import { LineCounts } from '@/src/primitives/line-counts.tsx'
import { ReviewedMark } from '@/src/primitives/reviewed-mark.tsx'
import { TreeGuides } from '@/src/primitives/tree-guides.tsx'
import { TreeRow } from '@/src/primitives/tree-row.tsx'

const NAME_TONES: Record<ChangeStatus, string> = {
  added: 'text-status-added',
  modified: 'text-status-modified',
  deleted: 'text-status-deleted line-through decoration-1',
  renamed: 'text-status-renamed',
  untracked: 'text-status-untracked italic pr-0.5',
}

interface FileRowProps extends Omit<ComponentProps<'div'>, 'children'> {
  depth: number
  selected: boolean
  focused: boolean
  reviewed: boolean
  kind: FileKind
  status: ChangeStatus
  name: string
  additions: number
  deletions: number
  countsTitle: string
}

export function FileRow({
  depth,
  selected,
  focused,
  reviewed,
  kind,
  status,
  name,
  additions,
  deletions,
  countsTitle,
  className,
  ...props
}: FileRowProps) {
  return (
    <TreeRow
      depth={depth}
      selected={selected}
      className={c(focused && !selected && 'bg-sidebar-hover', className)}
      {...props}
    >
      <TreeGuides depth={depth} />
      <ReviewedMark reviewed={reviewed} />
      <FileKindIcon kind={kind} />
      <span className={c('min-w-0 truncate', NAME_TONES[status], reviewed && 'opacity-60')}>
        {name}
      </span>
      <LineCounts additions={additions} deletions={deletions} title={countsTitle} />
    </TreeRow>
  )
}
