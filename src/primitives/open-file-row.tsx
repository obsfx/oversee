import type { ComponentProps } from 'react'
import { VscCheck } from 'react-icons/vsc'
import { c } from '@/src/c.ts'
import { StartTruncate } from '@/src/primitives/start-truncate.tsx'

interface OpenFileRowProps extends ComponentProps<'button'> {
  name: string
  directory: string
  path: string
  current: boolean
}

export function OpenFileRow({
  name,
  directory,
  path,
  current,
  className,
  ...props
}: OpenFileRowProps) {
  return (
    <button
      type={'button'}
      title={path}
      className={c(
        'flex h-6 w-full cursor-pointer items-center gap-1.5 rounded px-1.5 text-left outline-none',
        'hover:bg-surface-hover focus-visible:bg-surface-hover',
        current && 'bg-surface-hover',
        className,
      )}
      {...props}
    >
      <span className={'shrink-0 font-medium'}>{name}</span>
      <StartTruncate className={'flex-1 text-mini text-fg-faint'}>{directory}</StartTruncate>
      {current && <VscCheck className={'shrink-0'} />}
    </button>
  )
}
