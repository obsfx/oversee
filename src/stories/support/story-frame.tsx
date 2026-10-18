import type { ReactNode } from 'react'
import { AppearanceRoot } from '@/src/components/appearance-root.tsx'
import { ServicesProvider } from '@/src/context/services/services-provider.tsx'
import type { Services } from '@/src/lib/services.ts'

interface StoryFrameProps {
  services: Services
  children: ReactNode
}

export function StoryFrame({ services, children }: StoryFrameProps) {
  return (
    <ServicesProvider services={services}>
      <AppearanceRoot>
        <div className={'p-3 text-xs text-fg'}>{children}</div>
      </AppearanceRoot>
    </ServicesProvider>
  )
}
