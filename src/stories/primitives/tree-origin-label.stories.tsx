import type { Meta, StoryObj } from '@storybook/react-vite'
import { TreeOriginLabel } from '@/src/primitives/tree-origin-label.tsx'
import { TreeRow } from '@/src/primitives/tree-row.tsx'

const meta = {
  title: 'Primitives/TreeOriginLabel',
  component: TreeOriginLabel,
  args: {
    text: 'from ReviewMain +2',
    title:
      'ReviewMain src/layouts/review-main.tsx\nStressTabsStory src/stories/support/stress-tabs-story.tsx',
  },
  decorators: [
    (Story) => {
      return (
        <div role={'tree'} className={'w-72 bg-sidebar py-1'}>
          <TreeRow depth={1} selected={false}>
            <Story />
          </TreeRow>
        </div>
      )
    },
  ],
} satisfies Meta<typeof TreeOriginLabel>

export default meta

type Story = StoryObj<typeof meta>

export const Caller: Story = {}

export const EngineCallback: Story = {
  args: {
    text: 'engine calls it every physics frame',
    title: 'engine calls it every physics frame',
  },
}
