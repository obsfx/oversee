import type { Meta, StoryObj } from '@storybook/react-vite'
import { TreeFilter } from '../../../components/sidebar/tree-filter.tsx'
import { createStoryTree } from '../../support/story-tree.ts'

const meta = {
  title: 'Components/Sidebar/TreeFilter',
  component: TreeFilter,
  args: { model: createStoryTree() },
  argTypes: { model: { table: { disable: true } } },
  decorators: [
    (Story) => {
      return (
        <div className={'flex w-72 bg-sidebar text-xs'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof TreeFilter>

export default meta

export const Default: StoryObj<typeof meta> = {}
