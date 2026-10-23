import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { TreeTwisty } from '@/src/primitives/tree-twisty.tsx'

const meta = {
  title: 'Primitives/TreeTwisty',
  component: TreeTwisty,
  args: { expandable: true, expanded: false, onToggle: fn() },
  decorators: [
    (Story) => {
      return (
        <div className={'inline-flex bg-sidebar p-2 text-xs'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof TreeTwisty>

export default meta

type Story = StoryObj<typeof meta>

export const Collapsed: Story = {}

export const Expanded: Story = { args: { expanded: true } }

export const Leaf: Story = { args: { expandable: false } }
