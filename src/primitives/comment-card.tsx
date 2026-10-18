import type { ComponentProps } from 'react'
import { c } from '@/src/c.ts'

type CommentCardVariant = 'note' | 'composer'

interface CommentCardProps extends ComponentProps<'div'> {
  variant: CommentCardVariant
}

const VARIANTS: Record<CommentCardVariant, string> = {
  note: c(
    'relative mx-3 mt-2.5 mb-2 max-w-2xl divide-y divide-line rounded-lg bg-popup shadow-md',
    'before:absolute before:-top-[0.3125rem] before:left-5 before:size-2.5 before:rotate-45',
    'before:border-t before:border-l before:border-line before:bg-popup',
  ),
  composer: 'mx-2 my-1.5 max-w-3xl overflow-hidden rounded-md bg-popup shadow-sm',
}

export function CommentCard({ variant, className, ...props }: CommentCardProps) {
  return (
    <div
      className={c('border border-line font-ui text-xs text-fg', VARIANTS[variant], className)}
      {...props}
    />
  )
}
