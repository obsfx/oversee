import type { ComponentProps } from 'react'
import { c } from '@/src/c.ts'

interface CommentEntryProps extends ComponentProps<'article'> {
  highlighted?: boolean
}

export function CommentEntry({ highlighted = false, className, ...props }: CommentEntryProps) {
  return (
    <article
      className={c(
        'group/note relative px-3 py-2 first:rounded-t-lg last:rounded-b-lg',
        highlighted &&
          'after:pointer-events-none after:absolute after:inset-0 after:animate-highlight-ring after:rounded-[inherit] after:shadow-[inset_0_0_0_1.5px_var(--color-accent)]',
        className,
      )}
      data-highlighted={highlighted || undefined}
      {...props}
    />
  )
}
