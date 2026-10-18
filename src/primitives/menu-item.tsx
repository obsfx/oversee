import type { ComponentProps } from 'react'

export function MenuItem(props: ComponentProps<'button'>) {
  return (
    <button
      type={'button'}
      role={'menuitem'}
      className={
        'flex w-full cursor-pointer items-center gap-1.5 rounded-sm px-2 py-1 text-left outline-none hover:bg-surface-hover focus-visible:bg-surface-hover'
      }
      {...props}
    />
  )
}
