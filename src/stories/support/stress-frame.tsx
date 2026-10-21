import type { ReactNode } from 'react'
import { DataToggle } from '@/src/stories/support/data-toggle.tsx'
import {
  type StressData,
  stressDataLabels,
  stressDataOptions,
  stressServices,
} from '@/src/stories/support/definition-stress-fixture.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'

interface StressFrameProps {
  data: StressData
  onData: (data: StressData) => void
  children: ReactNode
}

export function StressFrame({ data, onData, children }: StressFrameProps) {
  return (
    <>
      <StoryFrame key={data} services={stressServices(data)}>
        {children}
      </StoryFrame>
      <DataToggle
        options={stressDataOptions}
        labels={stressDataLabels}
        value={data}
        onChange={onData}
      />
    </>
  )
}
