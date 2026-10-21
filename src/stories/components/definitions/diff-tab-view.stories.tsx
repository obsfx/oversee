import type { Meta, StoryObj } from '@storybook/react-vite'
import { DiffTabView } from '@/src/components/definitions/diff-tab-view.tsx'
import { createLiveStoryServices } from '@/src/stories/support/fixtures.ts'
import { definitionTabs } from '@/src/stories/support/definition-fixture.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'
import { useComparisonStore } from '@/src/store/comparison-store.ts'

const services = createLiveStoryServices()

const meta = {
  title: 'Components/Definitions/DiffTabView',
  component: DiffTabView,
  args: { tab: definitionTabs.diff },
  parameters: { layout: 'fullscreen' },
  beforeEach: () => {
    useComparisonStore.setState({ selected: null, notice: null })
  },
  decorators: [
    (Story) => {
      return (
        <StoryFrame services={services}>
          <div className={'-m-3 h-screen'}>
            <Story />
          </div>
        </StoryFrame>
      )
    },
  ],
} satisfies Meta<typeof DiffTabView>

export default meta

export const RevealsDefinitionLine: StoryObj<typeof meta> = {}
