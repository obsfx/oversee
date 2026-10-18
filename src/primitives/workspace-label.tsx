import type { ComponentProps } from 'react'
import { VscRepo } from 'react-icons/vsc'
import { c } from '@/src/c.ts'

interface WorkspaceLabelProps extends ComponentProps<'span'> {
  name: string
  repoName?: string
}

export function WorkspaceLabel({ name, repoName, className, ...props }: WorkspaceLabelProps) {
  return (
    <span
      className={c(
        'flex max-w-64 min-w-0 shrink items-center gap-1.5 rounded px-1 outline-none',
        'focus-visible:ring-1 focus-visible:ring-fg-faint',
        className,
      )}
      {...props}
    >
      <VscRepo className={'shrink-0 text-fg-muted'} />
      {repoName && (
        <>
          <span className={'max-w-32 shrink-[2] truncate text-fg-muted'}>{repoName}</span>
          <span className={'shrink-0 text-fg-faint'}>/</span>
        </>
      )}
      <span className={'truncate font-medium'}>{name}</span>
    </span>
  )
}
