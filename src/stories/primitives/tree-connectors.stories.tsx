import type { Meta, StoryObj } from '@storybook/react-vite'
import { TreeConnectors } from '@/src/primitives/tree-connectors.tsx'
import { TreeRow } from '@/src/primitives/tree-row.tsx'

const meta = {
  title: 'Primitives/TreeConnectors',
  component: TreeConnectors,
  args: { depth: 2, last: false, continues: [true] },
  decorators: [
    (Story, context) => {
      return (
        <div role={'tree'} className={'w-72 bg-sidebar py-1'}>
          <TreeRow depth={context.args.depth} selected={false}>
            <Story />
            {'DiffLineReveal.isInHunk'}
          </TreeRow>
        </div>
      )
    },
  ],
} satisfies Meta<typeof TreeConnectors>

export default meta

type Story = StoryObj<typeof meta>

export const Middle: Story = {}

export const Last: Story = { args: { last: true } }

export const LastUnderLast: Story = { args: { last: true, continues: [false] } }

export const Root: Story = { args: { depth: 0, continues: [] } }
