import { useEffect } from 'react'
import { useArgs } from 'storybook/preview-api'
import { DefinitionTabStrip } from '@/src/components/definitions/definition-tab-strip.tsx'
import { TabPanel } from '@/src/components/definitions/tab-panel.tsx'
import { type StressData, stressDataset } from '@/src/stories/support/definition-stress-fixture.ts'
import { StressFrame } from '@/src/stories/support/stress-frame.tsx'
import { useComparisonStore } from '@/src/store/comparison-store.ts'
import { useNavigationStore } from '@/src/store/navigation-store.ts'
import { useTabStore } from '@/src/store/tab-store.ts'

export function StressTabsStory({ data }: { data: StressData }) {
  const [, updateArgs] = useArgs<{ data: StressData }>()

  useEffect(() => {
    const dataset = stressDataset(data)
    useComparisonStore.setState({ selected: null, notice: null })
    useNavigationStore.setState({ selectedPath: 'scripts/expire_password.ts' })
    useTabStore.setState({ tabs: dataset.tabs, activeId: dataset.activeId })
  }, [data])

  return (
    <StressFrame
      data={data}
      onData={(next) => {
        updateArgs({ data: next })
      }}
    >
      <div className={'-m-3 flex h-screen flex-col'}>
        <DefinitionTabStrip />
        <TabPanel />
      </div>
    </StressFrame>
  )
}
