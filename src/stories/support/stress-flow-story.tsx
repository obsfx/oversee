import { useEffect, useMemo } from 'react'
import { useArgs } from 'storybook/preview-api'
import { Sidebar } from '@/src/components/sidebar/sidebar.tsx'
import { ComparisonRules } from '@/src/lib/comparison-rules.ts'
import { ChangeFlowFixtures } from '@/src/stories/support/change-flow-fixture.ts'
import type { StressData } from '@/src/stories/support/definition-stress-fixture.ts'
import { flowStressServices } from '@/src/stories/support/flow-stress-fixture.ts'
import { StressFrame } from '@/src/stories/support/stress-frame.tsx'
import { seedReviewedMarks } from '@/src/stories/support/story-review-state.ts'
import { useComparisonStore } from '@/src/store/comparison-store.ts'
import { useLayoutStore } from '@/src/store/layout-store.ts'
import { useNavigationStore } from '@/src/store/navigation-store.ts'

const LONG_BRANCH = 'feature/very-long-branch-name-for-the-review-of-the-new-change-flow-sidebar'

export function StressFlowStory({ data }: { data: StressData }) {
  const [, updateArgs] = useArgs<{ data: StressData }>()
  const services = useMemo(() => {
    return flowStressServices(data)
  }, [data])

  useEffect(() => {
    seedReviewedMarks([], ChangeFlowFixtures.changesOf(ChangeFlowFixtures.oversee))
    useLayoutStore.setState({ sidebarMode: 'flow' })
    useComparisonStore.setState({
      selected: { source: ComparisonRules.branch(LONG_BRANCH), target: 'main' },
      notice: null,
    })
    useNavigationStore.setState({ selectedPath: null, reveal: null, focus: null })
  }, [data])

  return (
    <StressFrame
      data={data}
      services={services}
      onData={(next) => {
        updateArgs({ data: next })
      }}
    >
      <div className={'-m-3 h-screen w-80'}>
        <Sidebar />
      </div>
    </StressFrame>
  )
}
