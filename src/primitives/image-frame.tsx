import type { ReactNode } from 'react'

export function ImageFrame({ children }: { children: ReactNode }) {
  return (
    <div
      className={
        'flex min-h-32 items-center justify-center overflow-hidden rounded-md border border-line checkerboard p-4'
      }
    >
      {children}
    </div>
  )
}
