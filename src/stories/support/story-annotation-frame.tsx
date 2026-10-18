import type { ReactNode } from 'react'
import type { Services } from '@/src/lib/services.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'

interface StoryAnnotationFrameProps {
  services: Services
  children: ReactNode
}

export function StoryAnnotationFrame({ services, children }: StoryAnnotationFrameProps) {
  return (
    <StoryFrame services={services}>
      <div className={'w-[48rem] rounded border border-dashed border-line py-1'}>{children}</div>
    </StoryFrame>
  )
}
