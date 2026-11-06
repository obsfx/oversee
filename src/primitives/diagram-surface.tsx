import type { ReactNode, Ref } from 'react'

interface DiagramSurfaceProps {
  ref: Ref<HTMLDivElement>
  fallback?: ReactNode
}

export function DiagramSurface({ ref, fallback }: DiagramSurfaceProps) {
  return (
    <div className={'flex flex-col gap-1'}>
      <div
        ref={ref}
        className={
          'comment-diagram overflow-hidden rounded border border-line bg-surface-subtle p-2'
        }
      />
      {fallback}
    </div>
  )
}
