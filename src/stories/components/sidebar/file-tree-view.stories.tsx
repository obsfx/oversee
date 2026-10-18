import type { Meta, StoryObj } from '@storybook/react-vite'
import { FileTreeView } from '@/src/components/sidebar/file-tree-view.tsx'
import { createStoryServices } from '@/src/stories/support/fixtures.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'
import { createStoryTree } from '@/src/stories/support/story-tree.ts'

const services = createStoryServices()

const meta = {
  title: 'Components/Sidebar/FileTreeView',
  component: FileTreeView,
  args: { model: createStoryTree() },
  argTypes: { model: { table: { disable: true } } },
  decorators: [
    (Story) => {
      return (
        <StoryFrame services={services}>
          <div className={'h-[32rem] w-72 bg-sidebar'}>
            <Story />
          </div>
        </StoryFrame>
      )
    },
  ],
} satisfies Meta<typeof FileTreeView>

export default meta

export const Default: StoryObj<typeof meta> = {}
