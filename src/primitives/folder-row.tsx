import type { ComponentProps } from 'react'
import { c } from '@/src/c.ts'
import { FolderIcon } from '@/src/primitives/folder-icon.tsx'
import { TreeGuides } from '@/src/primitives/tree-guides.tsx'
import { TreeRow } from '@/src/primitives/tree-row.tsx'
import { TreeTwisty } from '@/src/primitives/tree-twisty.tsx'

interface FolderRowProps extends Omit<ComponentProps<'div'>, 'children'> {
  depth: number
  focused: boolean
  expanded: boolean
  name: string
  onToggle: () => void
}

export function FolderRow({
  depth,
  focused,
  expanded,
  name,
  onToggle,
  className,
  ...props
}: FolderRowProps) {
  return (
    <TreeRow
      depth={depth}
      selected={false}
      expanded={expanded}
      className={c(focused && 'bg-sidebar-hover', className)}
      {...props}
    >
      <TreeGuides depth={depth} />
      <TreeTwisty expandable={true} expanded={expanded} onToggle={onToggle} />
      <FolderIcon open={expanded} />
      <span className={'min-w-0 truncate'}>{name}</span>
    </TreeRow>
  )
}
