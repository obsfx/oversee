import { useState } from 'react'
import { FlowPanel } from '@/src/components/sidebar/flow-panel.tsx'
import type { Services } from '@/src/lib/services.ts'
import { SidebarShell } from '@/src/primitives/sidebar-shell.tsx'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'

export function StoryFlowPanel({ createServices }: { createServices: () => Services }) {
  const [services] = useState(createServices)

  return (
    <StoryFrame services={services}>
      <div className={'-m-3 h-screen w-80'}>
        <SidebarShell>
          <FlowPanel />
        </SidebarShell>
      </div>
    </StoryFrame>
  )
}
