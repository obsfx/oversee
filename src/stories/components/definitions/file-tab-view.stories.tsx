import type { Meta, StoryObj } from '@storybook/react-vite'
import { FileTabView } from '@/src/components/definitions/file-tab-view.tsx'
import { createLiveStoryServices } from '@/src/stories/support/fixtures.ts'
import { definitionTabs } from '@/src/stories/support/definition-fixture.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'

const services = createLiveStoryServices()

const meta = {
  title: 'Components/Definitions/FileTabView',
  component: FileTabView,
  args: { tab: definitionTabs.file },
  parameters: { layout: 'fullscreen' },
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
} satisfies Meta<typeof FileTabView>

export default meta

type Story = StoryObj<typeof meta>

export const InRepository: Story = {}

export const External: Story = { args: { tab: definitionTabs.external } }

export const LargeFile: Story = { args: { tab: definitionTabs.large } }

export const Missing: Story = {
  args: { tab: { ...definitionTabs.file, id: 'repo::missing.ts', path: 'missing.ts' } },
}
