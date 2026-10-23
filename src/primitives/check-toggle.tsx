import type { ComponentProps } from 'react'
import { VscCheck } from 'react-icons/vsc'
import { c } from '@/src/c.ts'

interface CheckToggleProps extends Omit<ComponentProps<'button'>, 'role'> {
  checked: boolean
}

export function CheckToggle({ checked, className, children, ...props }: CheckToggleProps) {
  return (
    <button
      type={'button'}
      role={'checkbox'}
      aria-checked={checked}
      className={c(
        'flex h-6 shrink-0 cursor-pointer items-center gap-1.5 rounded px-2 text-xs outline-none',
        'focus-visible:ring-1 focus-visible:ring-fg-faint',
        checked && 'bg-reviewed/10 text-reviewed hover:bg-reviewed/15',
        !checked && 'text-fg-muted hover:bg-surface-hover hover:text-fg',
        className,
      )}
      {...props}
    >
      <span
        className={c(
          'flex size-3 items-center justify-center rounded-[3px] border',
          checked ? 'border-reviewed bg-reviewed text-white' : 'border-fg-faint',
        )}
      >
        {checked && <VscCheck className={'size-2.5'} />}
      </span>
      {children}
    </button>
  )
}
