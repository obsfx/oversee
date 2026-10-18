import type { Meta, StoryObj } from '@storybook/react-vite'
import { FileTreeView } from '../../../components/sidebar/file-tree-view.tsx'
import { createStoryServices } from '../../support/fixtures.ts'
import { StoryFrame } from '../../support/story-frame.tsx'
import { createStoryTree } from '../../support/story-tree.ts'

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
