import type { ReactNode } from 'react'
import { AppearanceRoot } from '@/src/components/appearance-root.tsx'
import { ServicesProvider } from '@/src/context/services/services-provider.tsx'
import { TooltipProvider } from '@/src/context/tooltip/tooltip-provider.tsx'
import type { Services } from '@/src/lib/services.ts'

interface StoryFrameProps {
  services: Services
  children: ReactNode
}

export function StoryFrame({ services, children }: StoryFrameProps) {
  return (
    <ServicesProvider services={services}>
      <AppearanceRoot>
        <TooltipProvider>
          <div className={'p-3 text-xs text-fg'}>{children}</div>
        </TooltipProvider>
      </AppearanceRoot>
    </ServicesProvider>
  )
}
