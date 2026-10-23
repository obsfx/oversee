import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { TreeRow } from '@/src/primitives/tree-row.tsx'

const meta = {
  title: 'Primitives/TreeRow',
  component: TreeRow,
  args: {
    depth: 1,
    selected: false,
    marked: false,
    children: 'useFileDiff',
    onClick: fn(),
  },
  decorators: [
    (Story) => {
      return (
        <div role={'tree'} className={'w-72 bg-sidebar py-1'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof TreeRow>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Selected: Story = { args: { selected: true } }

export const Marked: Story = { args: { marked: true } }

export const Deep: Story = { args: { depth: 6 } }
